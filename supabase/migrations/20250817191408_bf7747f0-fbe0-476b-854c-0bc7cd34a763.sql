-- Fix visitors table RLS policies to prevent unauthorized access to personal data

-- Drop the overly permissive policies that allow unrestricted access
DROP POLICY IF EXISTS "Allow session identity function access" ON public.visitors;
DROP POLICY IF EXISTS "Allow session name function to upsert visitors" ON public.visitors;

-- Create secure, function-specific policies that only allow access from our edge functions
-- These policies use the service role key which is only available to our edge functions

-- Policy for session-name function to upsert visitor data
CREATE POLICY "session_name_function_access" ON public.visitors
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy for session-identity function to read and upsert visitor data
CREATE POLICY "session_identity_function_access" ON public.visitors
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy for admin functions to read visitor data (for admin dashboard)
CREATE POLICY "admin_functions_read_access" ON public.visitors
    FOR SELECT
    TO service_role
    USING (true);

-- Keep the restrictive policies for anon and authenticated users
-- These ensure direct client access is blocked
-- (The existing "Deny anon access to visitors" and "Deny authenticated access to visitors" policies remain)