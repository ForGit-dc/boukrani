import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { securityHeaders, adminRateLimit, logSecurityEvent, getClientInfo } from "../_shared/security.ts";
import { adminListSchema } from "../_shared/validation.ts";

serve(async (req) => {
  const clientInfo = getClientInfo(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: securityHeaders });
  }

  if (req.method !== "POST") {
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
        details: { error: authError?.message, endpoint: 'admin-list' },
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
        details: { endpoint: 'admin-list', reason: 'not_admin' },
        ...clientInfo
      });
      return new Response(JSON.stringify({ error: "access_denied" }), {
        status: 403,
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    }

    // Log successful admin access
    await logSecurityEvent(supabase, {
      type: 'ADMIN_ACCESS',
      user_id: user.id,
      details: { endpoint: 'admin-list', admin_role: adminUser.role },
      ...clientInfo
    });

    // Parse and validate request body
    const body = await req.json();
    const validation = adminListSchema.safeParse(body);
    
    if (!validation.success) {
      console.warn("Invalid input for admin-list", { error: validation.error, ...clientInfo });
      
      return new Response(
        JSON.stringify({ 
          error: "validation_error",
          message: "Invalid input parameters"
        }),
        { 
          status: 400, 
          headers: { ...securityHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const { resource = "conversations", from, to, term, lang, page = 1, pageSize = 100 } = validation.data;

    if (resource === "auth_check") {
      return new Response(JSON.stringify({ admin_role: adminUser.role }), {
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    }

    if (resource === "audit_logs") {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, timestamp, table_name, operation, session_id, user_id, metadata")
        .order("timestamp", { ascending: false })
        .limit(pageSize);

      if (error) {
        console.error("[Internal] Audit log query failed:", error);
        return new Response(JSON.stringify({ error: "database_error" }), {
          status: 500,
          headers: { ...securityHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ logs: data ?? [], admin_role: adminUser.role }), {
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    }

    let query = supabase
      .from("conversations")
      .select("id, created_at, session_id, lang, user_text, assistant_text", { count: "exact" })
      .order("created_at", { ascending: false });

    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to);
    if (term) query = query.ilike("user_text", `%${term}%`);
    if (lang) query = query.eq("lang", lang);

    const fromIdx = (page - 1) * pageSize;
    const toIdx = fromIdx + pageSize - 1;
    const { data, error, count } = await query.range(fromIdx, toIdx);

    if (error) {
      console.error("[Internal] Database query failed:", error);
      return new Response(JSON.stringify({ error: "database_error" }), {
        status: 500,
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ 
      rows: data ?? [], 
      count: count ?? 0,
      admin_role: adminUser.role 
    }), {
      headers: { ...securityHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error in admin-list function:", e);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { ...securityHeaders, "Content-Type": "application/json" },
    });
  }
});