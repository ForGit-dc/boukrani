-- Add user_id column to conversations table for proper user-based access control
-- (IF NOT EXISTS added at scaffold time 2026-07-12: the column is already created
-- by migration 20250814114246; this file re-added it without a guard.)
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "allow_insert_public" ON public.conversations;
DROP POLICY IF EXISTS "deny_select_public" ON public.conversations;

-- Create secure user-based RLS policies
CREATE POLICY "Users can insert their own conversations" 
ON public.conversations 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND NOT COALESCE(do_not_log, false)
);

CREATE POLICY "Users can view their own conversations" 
ON public.conversations 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations" 
ON public.conversations 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations" 
ON public.conversations 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Block all public access completely
CREATE POLICY "Block all public access to conversations" 
ON public.conversations 
FOR ALL 
TO anon
USING (false);

-- Add index for better performance on user_id queries
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);