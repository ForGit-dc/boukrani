-- Fix RLS policies for visitors table to properly secure visitor data
-- Drop existing policies that evaluate to false
DROP POLICY IF EXISTS "Service role can insert visitors" ON public.visitors;
DROP POLICY IF EXISTS "Service role can select visitors" ON public.visitors;  
DROP POLICY IF EXISTS "Service role can update visitors" ON public.visitors;

-- Create proper policies that allow service_role access while blocking all other access
CREATE POLICY "Allow service role full access to visitors" 
ON public.visitors 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Explicitly deny all access to anon and authenticated users
CREATE POLICY "Deny anon access to visitors" 
ON public.visitors 
FOR ALL 
TO anon 
USING (false) 
WITH CHECK (false);

CREATE POLICY "Deny authenticated access to visitors" 
ON public.visitors 
FOR ALL 
TO authenticated 
USING (false) 
WITH CHECK (false);