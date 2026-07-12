-- Create visitors table
CREATE TABLE public.visitors (
  session_id text PRIMARY KEY,
  name text,
  email text,
  consent boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Add visitor_name column to conversations
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS visitor_name text;

-- Enable RLS on visitors table
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;

-- Create policies for visitors table - only service_role can access
CREATE POLICY "Service role can select visitors" ON public.visitors
FOR SELECT USING (false);

CREATE POLICY "Service role can insert visitors" ON public.visitors
FOR INSERT WITH CHECK (false);

CREATE POLICY "Service role can update visitors" ON public.visitors
FOR UPDATE USING (false);