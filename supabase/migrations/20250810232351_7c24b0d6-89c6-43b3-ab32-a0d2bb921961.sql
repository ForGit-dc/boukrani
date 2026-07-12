-- Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  session_id text,
  user_text text,
  assistant_text text,
  lang text
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Policies
-- Allow inserts from anon (write-only)
DROP POLICY IF EXISTS "allow_insert_public" ON public.conversations;
CREATE POLICY "allow_insert_public"
ON public.conversations
FOR INSERT
TO anon
WITH CHECK (true);

-- Deny selects for anon by not creating a SELECT policy for anon
-- Allow selects only for service_role (for admin export)
DROP POLICY IF EXISTS "allow_select_server" ON public.conversations;
CREATE POLICY "allow_select_server"
ON public.conversations
FOR SELECT
TO service_role
USING (true);
