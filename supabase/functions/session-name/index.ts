import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { sessionNameSchema } from "../_shared/validation.ts";
import { sessionRateLimit, securityHeaders, getClientInfo } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    console.warn("Rate limit hit for session-name", clientInfo);
    
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
    const validation = sessionNameSchema.safeParse(body);
    if (!validation.success) {
      const clientInfo = getClientInfo(req);
      console.warn("Invalid input for session-name", { error: validation.error, ...clientInfo });
      
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

    // Upsert visitor data
    const { error } = await supabase
      .from("visitors")
      .upsert({
        session_id,
        name: name || null,
        email: email || null,
        consent: consent || false,
      });

    if (error) {
      console.error("Upsert error:", error);
      return new Response(JSON.stringify({ error: "upsert_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(null, { status: 204, headers: corsHeaders });
  } catch (e) {
    console.error("Error in session-name function:", e);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});