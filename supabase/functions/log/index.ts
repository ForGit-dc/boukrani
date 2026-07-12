import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { Resend } from "npm:resend@2.0.0";
import { logSchema } from "../_shared/validation.ts";
import { logRateLimit, securityHeaders, getClientInfo } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-log-token, x-log-ts",
};

// Generate a stable guest alias from session_id  
function makeGuestAlias(sessionId: string): string {
  // Create a simple hash and take first 4 chars, uppercase
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    const char = sessionId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  const base36 = Math.abs(hash).toString(36).toUpperCase();
  return `Guest-${base36.slice(0, 4).padStart(4, '0')}`;
}

// --- Email helper & simple per-session throttle (in-memory) ---
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const ALERT_EMAIL = Deno.env.get("ALERT_EMAIL") ?? "";
// Configurable sender: once a domain is verified in Resend, set ALERT_FROM_EMAIL
// (e.g. "Mohamed AI <alerts@your-verified-domain>") to lift the test-domain limits.
const FROM_EMAIL = Deno.env.get("ALERT_FROM_EMAIL") ?? "Mohamed AI <onboarding@resend.dev>";
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

const lastAlertAtBySession = new Map<string, number>();
const ALERT_COOLDOWN_MS = 60_000; // 60 seconds
const LOG_TOKEN_TTL_MS = 5 * 60 * 1000;

function escHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (!/^[a-f0-9]+$/i.test(a) || !/^[a-f0-9]+$/i.test(b) || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function createExpectedLogToken(sessionId: string, timestamp: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${sessionId}.${timestamp}`));
  return toHex(signature);
}

async function verifyLogToken(req: Request, sessionId?: string): Promise<boolean> {
  const secret = Deno.env.get("LOG_HMAC_SECRET");
  if (!secret || !sessionId) return false;

  const token = req.headers.get("X-Log-Token") ?? "";
  const timestamp = req.headers.get("X-Log-Ts") ?? "";
  const timestampMs = Date.parse(timestamp);
  if (!token || !timestamp || Number.isNaN(timestampMs)) return false;
  if (Math.abs(Date.now() - timestampMs) > LOG_TOKEN_TTL_MS) return false;

  const expected = await createExpectedLogToken(sessionId, timestamp, secret);
  return timingSafeEqualHex(token, expected);
}

type SendEmailArgs = {
  to: string | string[]; // one address, an array, or a comma/semicolon-separated list
  subject: string;
  text?: string;
  html?: string;
};

async function sendEmail({ to, subject, text, html }: SendEmailArgs): Promise<string> {
  if (!resend) return "skipped:resend_not_configured";
  // Accept one address, an array, or a comma/semicolon-separated list of recipients.
  const recipients = (Array.isArray(to) ? to : String(to).split(/[,;]/))
    .map((address) => address.trim())
    .filter(Boolean);
  if (!recipients.length) return "skipped:no_recipient";
  try {
    // Resend SDK v2 returns { data, error } and does NOT throw on API rejection
    // (e.g. the onboarding@resend.dev test domain only delivers to the account
    // owner's own address). We must inspect `error` explicitly.
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: recipients,
      subject,
      text,
      html,
    });
    if (error) {
      console.error("Resend API error:", error);
      return "error:" + ((error as { message?: string }).message ?? JSON.stringify(error));
    }
    console.log("Alert email sent:", data?.id ?? "ok", "->", recipients.join(", "), "from", FROM_EMAIL);
    return "sent:" + (data?.id ?? "ok");
  } catch (e) {
    console.error("Resend send threw:", e);
    return "error:" + (e instanceof Error ? e.message : String(e));
  }
}

async function maybeSendAlertEmail(args: {
  session_id?: string | null;
  user_text?: string | null;
  assistant_text?: string | null;
  lang?: string | null;
  visitor_name?: string | null;
  visitor_alias?: string | null;
}): Promise<string> {
  if (!RESEND_API_KEY) return "skipped:resend_key_missing";
  if (!ALERT_EMAIL) return "skipped:alert_email_missing";

  const { session_id, user_text, assistant_text, lang, visitor_name, visitor_alias } = args;

  // Throttle per session_id
  if (session_id) {
    const now = Date.now();
    const last = lastAlertAtBySession.get(session_id);
    if (last && now - last < ALERT_COOLDOWN_MS) return "skipped:cooldown"; // within cooldown
    lastAlertAtBySession.set(session_id, now);
  }

  const iso = new Date().toISOString();
  const displayName = visitor_name || visitor_alias || "Guest";
  const subject = `[Mohamed AI] New question - ${displayName} (${lang || "n/a"})`;
  const text = `${iso} | session=${session_id ?? "n/a"}\nFrom: ${displayName}\n\n${user_text ?? ""}\n\n---\nAssistant: ${assistant_text ?? ""}`;
  const html = `<p><b>${escHtml(iso)}</b> | session=${escHtml(session_id ?? "n/a")} | lang=${escHtml(lang || "n/a")}</p><p><b>From:</b> ${escHtml(displayName)}</p><p><b>User:</b> ${escHtml(user_text ?? "")}</p><hr/><p><b>Assistant:</b> ${escHtml(assistant_text ?? "")}</p>`;

  return await sendEmail({ to: ALERT_EMAIL, subject, text, html });
}

serve(async (req) => {
  // Handle CORS preflight requests. corsHeaders must be spread LAST: securityHeaders
  // also defines Access-Control-Allow-Headers, without x-log-token/x-log-ts, and the
  // browser silently drops the POST if the preflight doesn't allow those headers.
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { ...securityHeaders, ...corsHeaders } });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" },
    });
  }

  // Rate limiting
  const rateLimitResult = logRateLimit(req);
  if (!rateLimitResult.allowed) {
    const clientInfo = getClientInfo(req);
    console.warn("Rate limit hit for log", clientInfo);
    
    return new Response(
      JSON.stringify({ 
        error: "rate_limit_exceeded",
        message: "Too many requests. Please try again later."
      }),
      { 
        status: 429, 
        headers: { 
          ...corsHeaders, 
          ...securityHeaders,
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000))
        } 
      }
    );
  }

  try {
    const body = await req.json();
    
    // Validate input
    const validation = logSchema.safeParse(body);
    if (!validation.success) {
      const clientInfo = getClientInfo(req);
      console.warn("Invalid input for log", { error: validation.error, ...clientInfo });
      
      return new Response(
        JSON.stringify({ 
          error: "validation_error",
          message: "Invalid input parameters"
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const { session_id, user_text, assistant_text, lang, do_not_log } = validation.data;

    if (!(await verifyLogToken(req, session_id))) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" },
      });
    }

    const loggingEnabled = (Deno.env.get("LOGGING_ENABLED") || "").toLowerCase() === "true";
    if (!loggingEnabled || do_not_log === true) {
      return new Response(
        JSON.stringify({ ok: true, logged: false, email: "skipped:logging_disabled_or_optout" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(JSON.stringify({ error: "server_misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Look up visitor identity for this session
    const { data: visitorData } = await supabase
      .from("visitors")
      .select("name, alias")
      .eq("session_id", session_id ?? "")
      .maybeSingle();

    const visitor_name = visitorData?.name || null;
    const visitor_alias = visitorData?.alias || (session_id ? makeGuestAlias(session_id) : null);

    const { error } = await supabase.from("conversations").insert({
      session_id: session_id ?? null,
      user_text: user_text ?? null,
      assistant_text: assistant_text ?? null,
      lang: lang ?? null,
      visitor_name: visitor_name,
      visitor_alias: visitor_alias,
    });

    if (error) {
      console.error("Insert error:", error);
      return new Response(JSON.stringify({ error: "insert_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Attempt to send alert email; the status string tells us exactly what happened.
    const emailStatus = await maybeSendAlertEmail({ session_id, user_text, assistant_text, lang, visitor_name, visitor_alias });
    console.log("Alert email status:", emailStatus);

    return new Response(
      JSON.stringify({ ok: true, logged: true, email: emailStatus }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("Error in log function:", e);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
