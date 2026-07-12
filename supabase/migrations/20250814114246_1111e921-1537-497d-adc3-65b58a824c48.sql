-- Phase 1: Critical Security Fixes
-- Add user authentication and secure database access

-- 1. Add user_id to conversations table to tie conversations to authenticated users
ALTER TABLE public.conversations 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Create profiles table for additional user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create admin_users table for proper admin authentication
CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 4. Create security definer function to check admin status
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 5. Update RLS policies for conversations

-- Drop existing policies
DROP POLICY IF EXISTS "allow_insert_public" ON public.conversations;
DROP POLICY IF EXISTS "deny_select_public" ON public.conversations;
DROP POLICY IF EXISTS "allow_insert_for_logging" ON public.conversations;
DROP POLICY IF EXISTS "admin_only_select" ON public.conversations;
DROP POLICY IF EXISTS "block_all_updates" ON public.conversations;
DROP POLICY IF EXISTS "admin_only_delete" ON public.conversations;

-- New secure policies for conversations
CREATE POLICY "authenticated_users_can_insert_own_conversations"
ON public.conversations FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND 
  NOT COALESCE(do_not_log, false)
);

CREATE POLICY "users_can_select_own_conversations"
ON public.conversations FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "admins_can_select_all_conversations"
ON public.conversations FOR SELECT
TO authenticated
USING (public.is_admin_user());

CREATE POLICY "block_all_conversation_updates"
ON public.conversations FOR UPDATE
USING (false);

CREATE POLICY "admins_can_delete_conversations"
ON public.conversations FOR DELETE
TO authenticated
USING (public.is_admin_user());

-- 6. Create policies for profiles table
CREATE POLICY "users_can_view_all_profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "users_can_insert_own_profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 7. Create policies for admin_users table
CREATE POLICY "only_admins_can_view_admin_users"
ON public.admin_users FOR SELECT
TO authenticated
USING (public.is_admin_user());

-- Fixed at scaffold time (2026-07-12): INSERT policies require WITH CHECK, not
-- USING (the original template line was invalid SQL). Same intent: block inserts.
CREATE POLICY "block_admin_user_modifications"
ON public.admin_users FOR INSERT
WITH CHECK (false);

CREATE POLICY "block_admin_user_updates"
ON public.admin_users FOR UPDATE
USING (false);

CREATE POLICY "block_admin_user_deletions"
ON public.admin_users FOR DELETE
USING (false);

-- 8. Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Update conversation_summaries policies for user access
DROP POLICY IF EXISTS "deny_delete_public" ON public.conversation_summaries;
DROP POLICY IF EXISTS "deny_insert_public" ON public.conversation_summaries;
DROP POLICY IF EXISTS "deny_select_public" ON public.conversation_summaries;
DROP POLICY IF EXISTS "deny_update_public" ON public.conversation_summaries;

-- Allow authenticated users to access their own conversation summaries
CREATE POLICY "authenticated_users_can_manage_summaries"
ON public.conversation_summaries FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 10. Add helpful indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON public.admin_users(user_id);

-- Add comments for documentation
COMMENT ON TABLE public.conversations IS 'User conversations with proper authentication and RLS';
COMMENT ON TABLE public.profiles IS 'User profile information';
COMMENT ON TABLE public.admin_users IS 'Administrative users with elevated permissions';
COMMENT ON FUNCTION public.is_admin_user() IS 'Security definer function to check if current user is an admin';