-- Fix overly permissive RLS policies on visitors table
-- Drop existing permissive policies
DROP POLICY IF EXISTS "admin_functions_read_access" ON public.visitors;
DROP POLICY IF EXISTS "session_identity_function_access" ON public.visitors;
DROP POLICY IF EXISTS "session_name_function_access" ON public.visitors;

-- Create secure, session-scoped policies
-- Allow service role (edge functions) to read visitors by session_id
CREATE POLICY "Service role can read visitors by session"
ON public.visitors
FOR SELECT
USING (
  -- Only service role can access, regular users cannot
  auth.jwt()->>'role' = 'service_role'
);

-- Allow service role to upsert visitors (for session-identity and session-name functions)
CREATE POLICY "Service role can upsert visitors"
ON public.visitors
FOR INSERT
WITH CHECK (
  auth.jwt()->>'role' = 'service_role'
);

CREATE POLICY "Service role can update visitors"
ON public.visitors
FOR UPDATE
USING (
  auth.jwt()->>'role' = 'service_role'
);

-- No delete access needed for visitors table
CREATE POLICY "Service role can delete old visitors"
ON public.visitors
FOR DELETE
USING (
  auth.jwt()->>'role' = 'service_role'
);