import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { securityHeaders, adminRateLimit, logSecurityEvent, getClientInfo } from "../_shared/security.ts";

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

serve(async (req) => {
  const clientInfo = getClientInfo(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: securityHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...securityHeaders, "Content-Type": "application/json" },
    });
  }

  // Rate limiting check
  const rateLimitResult = adminRateLimit(req);
  if (!rateLimitResult.allowed) {
    return new Response(JSON.stringify({ 
      error: "rate_limit_exceeded",
      message: "Too many requests. Please try again later.",
      resetTime: rateLimitResult.resetTime
    }), {
      status: 429,
      headers: { 
        ...securityHeaders, 
        "Content-Type": "application/json",
        "Retry-After": Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
      },
    });
  }

  try {
    // Get JWT token from Authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "missing_auth_header" }), {
        status: 401,
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(JSON.stringify({ error: "server_misconfigured" }), {
        status: 500,
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    }

    // Create supabase client with service role for admin operations
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error("Auth error:", authError);
      await logSecurityEvent(supabase, {
        type: 'INVALID_AUTH',
        details: { error: authError?.message, endpoint: 'export' },
        ...clientInfo
      });
      return new Response(JSON.stringify({ error: "invalid_token" }), {
        status: 401,
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin using our new admin system
    const { data: adminUser, error: adminError } = await supabase
      .from("admin_users")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (adminError || !adminUser) {
      console.error("[Internal] Admin verification failed:", { userId: user.id, error: adminError });
      await logSecurityEvent(supabase, {
        type: 'INVALID_AUTH',
        user_id: user.id,
        details: { endpoint: 'export', reason: 'not_admin' },
        ...clientInfo
      });
      return new Response(JSON.stringify({ error: "access_denied" }), {
        status: 403,
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabase
      .from("conversations")
      .select("id,created_at,session_id,lang,user_text,assistant_text")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Internal] Database query failed:", error);
      return new Response(JSON.stringify({ error: "database_error" }), {
        status: 500,
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    }

    const header = [
      "id",
      "created_at",
      "session_id",
      "lang",
      "user_text",
      "assistant_text",
    ];

    const rows = (data ?? []).map((r) => header.map((h) => csvEscape((r as any)[h])).join(","));
    const csv = [header.join(","), ...rows].join("\n");

    // Enhanced security logging for data export
    await logSecurityEvent(supabase, {
      type: 'DATA_EXPORT',
      user_id: user.id,
      details: { 
        exported_rows: data?.length || 0, 
        admin_role: adminUser.role,
        endpoint: 'export'
      },
      ...clientInfo
    });

    // Legacy audit log for compatibility
    await supabase.from("audit_logs").insert({
      table_name: "conversations",
      operation: "EXPORT",
      user_id: user.id,
      metadata: { exported_rows: data?.length || 0, admin_role: adminUser.role }
    });

    return new Response(csv, {
      status: 200,
      headers: {
        ...securityHeaders,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="conversations_export.csv"`,
      },
    });
  } catch (e) {
    console.error("Error in export function:", e);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { ...securityHeaders, "Content-Type": "application/json" },
    });
  }
});