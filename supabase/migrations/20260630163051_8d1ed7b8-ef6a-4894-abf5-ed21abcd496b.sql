-- Drop policies that depend on the old arbitrary-user SECURITY DEFINER functions.
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

-- Recreate admin policies with the no-argument functions.
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can view all admin users"
ON public.admin_users
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Super admins can manage all admin users"
ON public.admin_users
FOR ALL
TO authenticated
USING (public.get_admin_role() = 'super_admin'::public.admin_role)
WITH CHECK (public.get_admin_role() = 'super_admin'::public.admin_role);

CREATE POLICY "Admins can view conversation summaries"
ON public.conversation_summaries
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can insert conversation summaries"
ON public.conversation_summaries
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update conversation summaries"
ON public.conversation_summaries
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete conversation summaries"
ON public.conversation_summaries
FOR DELETE
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can view openai usage"
ON public.openai_usage
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can view cost alert config"
ON public.cost_alert_config
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can update cost alert config"
ON public.cost_alert_config
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

COMMENT ON POLICY "Admins can view audit logs" ON public.audit_logs IS
  'Allows admin users to view security audit logs through controlled admin paths. Write access remains restricted to service role only.';

-- Keep private tables out of GraphQL schema and direct Data API discovery for anon and signed-in users.
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

-- Restrict SECURITY DEFINER functions from public API callers.
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_admin_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_old_visitors() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_visitor_access() FROM PUBLIC, anon, authenticated;

-- Trigger helper is not SECURITY DEFINER in the current schema, but keep it non-callable by API roles.
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_role() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_visitors() TO service_role;
GRANT EXECUTE ON FUNCTION public.log_visitor_access() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;