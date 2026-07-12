-- Fix conversations table RLS policies for proper user authentication and data protection
-- (Made idempotent at scaffold time 2026-07-12: DROP IF EXISTS added before each
-- CREATE POLICY, and is_admin_user(auth.uid()) corrected to the zero-arg
-- is_admin_user() actually defined by the previous migration.)

-- First, drop existing problematic policies
DROP POLICY IF EXISTS "allow_insert_public" ON public.conversations;
DROP POLICY IF EXISTS "deny_select_public" ON public.conversations;

-- Create secure policies that require authentication and proper user ownership
DROP POLICY IF EXISTS "authenticated_users_can_insert_own_conversations" ON public.conversations;
CREATE POLICY "authenticated_users_can_insert_own_conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND
  NOT COALESCE(do_not_log, false)
);

DROP POLICY IF EXISTS "users_can_view_own_conversations" ON public.conversations;
CREATE POLICY "users_can_view_own_conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_can_update_own_conversations" ON public.conversations;
CREATE POLICY "users_can_update_own_conversations"
ON public.conversations
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_can_delete_own_conversations" ON public.conversations;
CREATE POLICY "users_can_delete_own_conversations"
ON public.conversations
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Allow admins to view all conversations for legitimate administrative purposes
DROP POLICY IF EXISTS "admin_users_can_view_all_conversations" ON public.conversations;
CREATE POLICY "admin_users_can_view_all_conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (public.is_admin_user());

-- Block all public access completely
DROP POLICY IF EXISTS "block_all_public_access" ON public.conversations;
CREATE POLICY "block_all_public_access"
ON public.conversations
FOR ALL
TO anon
USING (false);

-- Ensure the user_id column is properly constrained to prevent null values that could bypass RLS
ALTER TABLE public.conversations
ALTER COLUMN user_id SET NOT NULL;
