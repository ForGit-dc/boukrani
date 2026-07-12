import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { sessionIdentitySchema } from "../_shared/validation.ts";
import { sessionRateLimit, securityHeaders, getClientInfo } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { ...corsHeaders, ...securityHeaders } });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" },
    });
  }

  // Rate limiting
  const rateLimitResult = sessionRateLimit(req);
  if (!rateLimitResult.allowed) {
    const clientInfo = getClientInfo(req);
    console.warn("Rate limit hit for session-identity", clientInfo);
    
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
    const validation = sessionIdentitySchema.safeParse(body);
    if (!validation.success) {
      const clientInfo = getClientInfo(req);
      console.warn("Invalid input for session-identity", { error: validation.error, ...clientInfo });
      
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

    const { session_id, name, email, consent } = validation.data;

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

    // Check if visitor exists
    const { data: existingVisitor } = await supabase
      .from("visitors")
      .select("alias")
      .eq("session_id", session_id)
      .single();

    // Generate alias if needed
    const alias = existingVisitor?.alias || makeGuestAlias(session_id);

    // Upsert visitor data (inputs already validated)
    const { error } = await supabase
      .from("visitors")
      .upsert({
        session_id,
        name: name || null,
        email: email || null,
        consent: Boolean(consent),
        alias,
      });

    if (error) {
      console.error("Upsert error:", error);
      return new Response(JSON.stringify({ error: "upsert_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return the alias so frontend can cache it
    return new Response(JSON.stringify({ alias }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (e) {
    console.error("Error in session-identity function:", e);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});