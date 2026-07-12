-- Phase 1: Critical Data Protection - Granular Service Role Policies for Visitors

-- Drop the overly permissive service role policy
DROP POLICY IF EXISTS "Allow service role full access to visitors" ON public.visitors;

-- Create specific policies for different edge function needs
-- Policy for session-name function (needs to upsert visitor data)
CREATE POLICY "Allow session name function to upsert visitors" 
ON public.visitors 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Policy for session-identity function (needs to select and upsert)
CREATE POLICY "Allow session identity function access" 
ON public.visitors 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Add audit trail for visitor data access
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name text NOT NULL,
    operation text NOT NULL,
    user_id uuid,
    session_id text,
    timestamp timestamp with time zone DEFAULT now(),
    metadata jsonb
);

-- Enable RLS on audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can access audit logs
CREATE POLICY "Service role can manage audit logs" 
ON public.audit_logs 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Create function to log visitor access
CREATE OR REPLACE FUNCTION public.log_visitor_access()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (table_name, operation, session_id, metadata)
    VALUES (
        'visitors',
        TG_OP,
        COALESCE(NEW.session_id, OLD.session_id),
        row_to_json(COALESCE(NEW, OLD))
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add audit trigger to visitors table
DROP TRIGGER IF EXISTS audit_visitors_trigger ON public.visitors;
CREATE TRIGGER audit_visitors_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.visitors
    FOR EACH ROW EXECUTE FUNCTION public.log_visitor_access();

-- Create admin roles system
CREATE TYPE public.admin_role AS ENUM ('super_admin', 'admin', 'moderator');

-- Scaffold fix (2026-07-12): admin_users already exists from 20250814114246 with
-- role TEXT, so the CREATE TABLE below is skipped. Convert the existing column
-- to the enum so get_admin_role() (declared to return admin_role) is valid.
ALTER TABLE public.admin_users ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.admin_users ALTER COLUMN role TYPE public.admin_role USING role::public.admin_role;
ALTER TABLE public.admin_users ALTER COLUMN role SET DEFAULT 'moderator';

-- Create admin users table
CREATE TABLE IF NOT EXISTS public.admin_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role admin_role NOT NULL DEFAULT 'moderator',
    created_by uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id)
);

-- Enable RLS on admin users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check admin role
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE user_id = _user_id
    );
$$;

-- Create function to get admin role
CREATE OR REPLACE FUNCTION public.get_admin_role(_user_id uuid DEFAULT auth.uid())
RETURNS admin_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT role FROM public.admin_users 
    WHERE user_id = _user_id;
$$;

-- Admin users policies
CREATE POLICY "Super admins can manage all admin users" 
ON public.admin_users 
FOR ALL 
TO authenticated
USING (public.get_admin_role() = 'super_admin');

CREATE POLICY "Admins can view all admin users" 
ON public.admin_users 
FOR SELECT 
TO authenticated
USING (public.is_admin());

-- Data retention policy - auto-delete old visitor records after 1 year
CREATE OR REPLACE FUNCTION public.cleanup_old_visitors()
RETURNS void
LANGUAGE SQL
SECURITY DEFINER
AS $$
    DELETE FROM public.visitors 
    WHERE created_at < now() - interval '1 year'
    AND consent = false;
$$;

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger to admin_users
CREATE TRIGGER update_admin_users_updated_at
    BEFORE UPDATE ON public.admin_users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();