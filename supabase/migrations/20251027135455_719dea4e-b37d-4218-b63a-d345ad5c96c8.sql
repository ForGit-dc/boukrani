-- Add admin read-only access to audit logs for security monitoring
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Add comment explaining the security model
COMMENT ON POLICY "Admins can view audit logs" ON public.audit_logs IS 
  'Allows admin users to view security audit logs for monitoring and incident response. Write access remains restricted to service role only.';