-- Harden private tables and SECURITY DEFINER helpers for Supabase linter findings.
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can view all admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Super admins can manage all admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can view conversation summaries" ON public.conversation_summaries;
DROP POLICY IF EXISTS "Admins can insert conversation summaries" ON public.conversation_summaries;
DROP POLICY IF EXISTS "Admins can update conversation summaries" ON public.conversation_summaries;
DROP POLICY IF EXISTS "Admins can delete conversation summaries" ON public.conversation_summaries;
DROP POLICY IF EXISTS "Admins can view openai usage" ON public.openai_usage;
DROP POLICY IF EXISTS "Admins can view cost alert config" ON public.cost_alert_config;
DROP POLICY IF EXISTS "Admins can update cost alert config" ON public.cost_alert_config;

DROP FUNCTION IF EXISTS public.is_admin(uuid);
DROP FUNCTION IF EXISTS public.get_admin_role(uuid);

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.get_admin_role()
RETURNS public.admin_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT role
  FROM public.admin_users
  WHERE user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_admin_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_old_visitors() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_visitor_access() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_role() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_visitors() TO service_role;
GRANT EXECUTE ON FUNCTION public.log_visitor_access() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;

REVOKE SELECT ON TABLE
  public.admin_users,
  public.audit_logs,
  public.conversation_summaries,
  public.conversations,
  public.cost_alert_config,
  public.openai_usage,
  public.visitors
FROM anon, authenticated;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE
  public.admin_users,
  public.audit_logs,
  public.conversation_summaries,
  public.conversations,
  public.cost_alert_config,
  public.openai_usage,
  public.visitors
FROM anon, authenticated;

GRANT ALL ON TABLE
  public.admin_users,
  public.audit_logs,
  public.conversation_summaries,
  public.conversations,
  public.cost_alert_config,
  public.openai_usage,
  public.visitors
TO service_role;