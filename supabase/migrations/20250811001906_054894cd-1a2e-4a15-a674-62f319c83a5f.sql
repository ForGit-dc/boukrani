-- Conversations logging hardening
-- 1) Column addition
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS do_not_log boolean DEFAULT false;

-- 2) Ensure RLS is enabled (idempotent)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- 3) Reset existing policies to avoid overly permissive access
DROP POLICY IF EXISTS "allow_insert_public" ON public.conversations;
DROP POLICY IF EXISTS "allow_select_server" ON public.conversations;
DROP POLICY IF EXISTS "allow_select_public" ON public.conversations;
DROP POLICY IF EXISTS "deny_select_public" ON public.conversations;

-- 4) Recreate minimal, safe policies
-- Allow anonymous inserts but block any attempt where do_not_log is true
CREATE POLICY "allow_insert_public"
ON public.conversations
FOR INSERT
TO anon
WITH CHECK (NOT coalesce(do_not_log, false));

-- Explicitly deny reads for anon (service_role bypasses RLS by design)
CREATE POLICY "deny_select_public"
ON public.conversations
FOR SELECT
TO anon
USING (false);
