import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { adminManageSchema } from "../_shared/validation.ts";
import { securityHeaders, adminRateLimit, logSecurityEvent, getClientInfo } from "../_shared/security.ts";
const corsHeaders = securityHeaders as Record<string, string>;

serve(async (req) => {
  const clientInfo = getClientInfo(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting for admin endpoints
  const rateLimitResult = adminRateLimit(req);
  if (!rateLimitResult.allowed) {
    return new Response(JSON.stringify({
      error: 'rate_limit_exceeded',
      message: 'Too many requests. Please try again later.',
      resetTime: rateLimitResult.resetTime
    }), {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
      },
    });
  }

  try {
const authHeader = req.headers.get('Authorization');
if (!authHeader) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (supabaseUrl && supabaseKey) {
      const logClient = createClient(supabaseUrl, supabaseKey);
      await logSecurityEvent(logClient, {
        type: 'INVALID_AUTH',
        details: { endpoint: 'admin-manage', reason: 'missing_auth_header' },
        ...clientInfo,
      });
    }
  } catch (_) { /* noop */ }
  return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Verify user is super_admin
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      await logSecurityEvent(supabase, {
        type: 'INVALID_AUTH',
        details: { endpoint: 'admin-manage', reason: 'invalid_token' },
        ...clientInfo,
      });
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: adminData, error: roleError } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !adminData || adminData.role !== 'super_admin') {
      console.error('Not super admin:', roleError);
      await logSecurityEvent(supabase, {
        type: 'INVALID_AUTH',
        user_id: user.id,
        details: { endpoint: 'admin-manage', reason: 'not_super_admin' },
        ...clientInfo,
      });
      return new Response(JSON.stringify({ error: 'Forbidden: super_admin required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const validation = adminManageSchema.safeParse(body);
    if (!validation.success) {
      console.error('Validation error:', validation.error);
      return new Response(JSON.stringify({ error: 'Invalid input' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const { action, admin_user_id, email, role } = validation.data;

    await logSecurityEvent(supabase, {
      type: 'ADMIN_ACCESS',
      user_id: user.id,
      details: { endpoint: 'admin-manage', action, admin_role: adminData.role },
      ...clientInfo,
    });

    if (action === 'list') {
      const { data, error } = await supabase
        .from('admin_users')
        .select('id, user_id, role, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Get email addresses from auth.users
      const adminClient = createClient(supabaseUrl, supabaseKey);
      const enrichedData = await Promise.all(
        (data || []).map(async (admin) => {
          const { data: userData } = await adminClient.auth.admin.getUserById(admin.user_id);
          return {
            ...admin,
            email: userData?.user?.email || 'Unknown',
          };
        })
      );

      return new Response(JSON.stringify({ admins: enrichedData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'create') {
      if (!email || !role) {
        return new Response(JSON.stringify({ error: 'Email and role required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create or get user by email
      const adminClient = createClient(supabaseUrl, supabaseKey);
      const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
        email,
        email_confirm: true,
      });

      if (createError && !createError.message.includes('already registered')) {
        throw createError;
      }

      const userId = userData?.user?.id || (await adminClient.auth.admin.getUserById(email))?.data?.user?.id;
      if (!userId) {
        throw new Error('Failed to create or find user');
      }

      // Insert into admin_users
      const { error: insertError } = await supabase
        .from('admin_users')
        .insert({ user_id: userId, role, created_by: user.id });

      if (insertError) {
        throw insertError;
      }

      return new Response(JSON.stringify({ success: true, message: 'Admin created' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'update') {
      if (!admin_user_id || !role) {
        return new Response(JSON.stringify({ error: 'admin_user_id and role required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error: updateError } = await supabase
        .from('admin_users')
        .update({ role })
        .eq('id', admin_user_id);

      if (updateError) {
        throw updateError;
      }

      return new Response(JSON.stringify({ success: true, message: 'Role updated' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'delete') {
      if (!admin_user_id) {
        return new Response(JSON.stringify({ error: 'admin_user_id required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Prevent deleting self
      const { data: targetAdmin } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('id', admin_user_id)
        .single();

      if (targetAdmin?.user_id === user.id) {
        return new Response(JSON.stringify({ error: 'Cannot delete yourself' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error: deleteError } = await supabase
        .from('admin_users')
        .delete()
        .eq('id', admin_user_id);

      if (deleteError) {
        throw deleteError;
      }

      return new Response(JSON.stringify({ success: true, message: 'Admin deleted' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in admin-manage:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});