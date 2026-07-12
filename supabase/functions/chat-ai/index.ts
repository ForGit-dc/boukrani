import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { chatAISchema } from "../_shared/validation.ts";
import { chatAIRateLimit, securityHeaders, getClientInfo } from "../_shared/security.ts";
import { buildSystemMessage } from "../_shared/knowledge.ts";

const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const LOG_HMAC_SECRET = Deno.env.get("LOG_HMAC_SECRET");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

const MODEL = "gpt-4o-mini";
const DEFAULT_TEMPERATURE = 0.1; // factual Q&A: keep it low
const DEFAULT_MAX_TOKENS = 220;
const MAX_HISTORY_TURNS = 12;
const MAX_PROMPT_TOKENS = 12000; // base (~3.5k) + history headroom

// Approx token estimator (~4 chars/token) - only used to trim old history.
function estimateTokens(text: string): number {
  return text ? Math.ceil(text.length / 4) : 0;
}

function totalTokens(msgs: { content: string }[]): number {
  return msgs.reduce((sum, m) => sum + estimateTokens(m.content), 0);
}

// Race a (possibly hanging) DB call against a timeout so the bot still answers
// when the database API layer (PostgREST) is slow or unavailable.
function withTimeout<T>(p: PromiseLike<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function createLogToken(sessionId: string, timestamp: string): Promise<string | null> {
  if (!LOG_HMAC_SECRET) return null;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(LOG_HMAC_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${sessionId}.${timestamp}`));
  return toHex(signature);
}

// fetch with a hard per-attempt timeout (15s) and exponential-backoff retry.
// Retries transient failures (network error, abort/timeout, 429, 5xx) up to
// `attempts` times before giving up. Returns the last response (so the caller's
// !response.ok handling still runs) or throws the last error.
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  { attempts = 3, timeoutMs = 15000 }: { attempts?: number; timeoutMs?: number } = {},
): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      if ((res.status === 429 || res.status >= 500) && i < attempts - 1) {
        console.warn(`OpenAI ${res.status}, retrying (attempt ${i + 1}/${attempts})`);
        await sleep(500 * 2 ** i); // 500ms, 1s, 2s
        continue;
      }
      return res;
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      console.warn(`OpenAI fetch failed (attempt ${i + 1}/${attempts}):`, e);
      if (i < attempts - 1) await sleep(500 * 2 ** i);
    }
  }
  throw lastErr;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { ...corsHeaders, ...securityHeaders } });
  }

  // Rate limiting
  const rateLimitResult = chatAIRateLimit(req);
  if (!rateLimitResult.allowed) {
    console.warn("Rate limit hit for chat-ai", getClientInfo(req));
    return new Response(
      JSON.stringify({
        error: "rate_limit_exceeded",
        message: "Too many requests. Please try again later.",
        retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          ...securityHeaders,
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)),
          "X-RateLimit-Remaining": String(rateLimitResult.remaining),
        },
      },
    );
  }

  // Verify Turnstile CAPTCHA (only if a token is provided)
  const turnstileToken = req.headers.get("X-Turnstile-Token");
  if (turnstileToken) {
    try {
      const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
      if (turnstileSecret) {
        const turnstileResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ secret: turnstileSecret, response: turnstileToken }),
        });
        const turnstileData = await turnstileResponse.json();
        if (!turnstileData.success) {
          console.warn("Turnstile verification failed:", turnstileData);
          return new Response(
            JSON.stringify({ error: "captcha_failed", message: "CAPTCHA verification failed" }),
            { status: 403, headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" } },
          );
        }
      }
    } catch (error) {
      console.error("Turnstile verification error:", error);
    }
  }

  try {
    const body = await req.json();

    // Validate input
    const validation = chatAISchema.safeParse(body);
    if (!validation.success) {
      console.warn("Invalid input for chat-ai", { error: validation.error, ...getClientInfo(req) });
      return new Response(
        JSON.stringify({ error: "validation_error", message: "Invalid input parameters" }),
        { status: 400, headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" } },
      );
    }

    const { message, session_id: sessionIdIn, lang, temperature, maxTokens, debug } = validation.data;

    const sessionId = sessionIdIn || crypto.randomUUID();
    const safeTemperature = temperature ?? DEFAULT_TEMPERATURE;
    const safeMaxTokens = maxTokens ?? DEFAULT_MAX_TOKENS;
    const debugMode = !!debug;

    if (!openAIApiKey) {
      return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY secret" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Missing Supabase service configuration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Check session question limit (20 questions max per demo session)
    const { count: questionCount, error: countError } = await withTimeout(
      admin.from("conversations").select("*", { count: "exact", head: true }).eq("session_id", sessionId),
      2500,
      { count: null, error: null } as any,
    );

    if (countError) {
      console.error("[Internal] Failed to check session limit:", countError);
    }

    if (questionCount && questionCount >= 20) {
      return new Response(
        JSON.stringify({
          error: "session_limit_exceeded",
          message: "You have reached the 20 question limit for this demo session.",
        }),
        { status: 429, headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch recent turns (newest first, then reverse to chronological)
    const { data: rows, error: rowsErr } = await withTimeout(
      admin.from("conversations").select("user_text,assistant_text,created_at").eq("session_id", sessionId).order("created_at", { ascending: false }).limit(MAX_HISTORY_TURNS),
      2500,
      { data: [], error: null } as any,
    );

    if (rowsErr) {
      console.error("Fetch conversations error:", rowsErr);
    }

    const turns = (rows ?? []).slice().reverse();

    // Build messages: server-side system (prompt + full knowledge base), then history, then the new message.
    const systemMessage = buildSystemMessage(lang);
    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemMessage },
    ];

    const history: { role: "user" | "assistant"; content: string }[] = [];
    for (const t of turns) {
      if (t.user_text) history.push({ role: "user", content: t.user_text });
      if (t.assistant_text) history.push({ role: "assistant", content: t.assistant_text });
    }

    // Trim oldest history if the prompt grows too large.
    let composed = [...messages, ...history, { role: "user" as const, content: message }];
    while (history.length > 0 && totalTokens(composed) > MAX_PROMPT_TOKENS) {
      history.shift();
      composed = [...messages, ...history, { role: "user" as const, content: message }];
    }

    // Call OpenAI (15s timeout per attempt, 3 attempts with exponential backoff)
    const response = await fetchWithRetry(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${openAIApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          temperature: safeTemperature,
          max_tokens: safeMaxTokens,
          messages: composed,
        }),
      },
      { attempts: 3, timeoutMs: 15000 },
    );

    if (!response.ok) {
      let errText = "";
      try { errText = await response.text(); } catch (_) { /* ignore */ }
      console.error("OpenAI error:", errText);
      return new Response(JSON.stringify({ error: "openai_failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const generatedText: string = data.choices?.[0]?.message?.content ?? "";

    // Track token usage for cost monitoring
    const usage = data.usage;
    if (usage) {
      try {
        // gpt-4o-mini: input $0.15 / output $0.60 per 1M tokens
        const estimatedCost = (usage.prompt_tokens / 1_000_000) * 0.15 + (usage.completion_tokens / 1_000_000) * 0.6;

        await withTimeout(admin.from("openai_usage").insert({
          session_id: sessionId,
          prompt_tokens: usage.prompt_tokens,
          completion_tokens: usage.completion_tokens,
          total_tokens: usage.total_tokens,
          model: MODEL,
          estimated_cost_usd: estimatedCost,
        }), 2000, null as any);

        const today = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
        const { data: dailyCosts } = await withTimeout(
          admin.from("openai_usage").select("estimated_cost_usd").gte("created_at", today),
          2000,
          { data: [] } as any,
        );
        const dailyTotal = dailyCosts?.reduce((sum, row) => sum + parseFloat(String(row.estimated_cost_usd)), 0) || 0;
        const { data: config } = await withTimeout(admin.from("cost_alert_config").select("*").single(), 2000, { data: null } as any);
        if (config && dailyTotal > config.daily_threshold_usd) {
          console.warn(`Daily cost threshold exceeded: $${dailyTotal.toFixed(2)} > $${config.daily_threshold_usd}`);
        }
      } catch (trackingError) {
        console.error("Error tracking token usage:", trackingError);
        // never fail the request because tracking failed
      }
    }

    const debugPayload = debugMode
      ? { token_count_in: totalTokens(composed), n_turns_included: turns.length, model: MODEL, temperature: safeTemperature }
      : undefined;

    const logTs = new Date().toISOString();
    const logToken = await createLogToken(sessionId, logTs);

    return new Response(JSON.stringify({ generatedText, debug: debugPayload, logToken, logTs }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in chat-ai function:", error);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
