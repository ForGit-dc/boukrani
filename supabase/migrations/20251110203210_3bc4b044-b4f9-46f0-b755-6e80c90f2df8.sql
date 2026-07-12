-- Create table for tracking OpenAI API usage and costs
CREATE TABLE public.openai_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  model TEXT NOT NULL,
  estimated_cost_usd DECIMAL(10, 6) NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.openai_usage ENABLE ROW LEVEL SECURITY;

-- Only admins can view usage
CREATE POLICY "Admins can view openai usage"
ON public.openai_usage
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Service role can insert
CREATE POLICY "Service role can insert openai usage"
ON public.openai_usage
FOR INSERT
TO service_role
WITH CHECK (true);

-- Create index for efficient querying
CREATE INDEX idx_openai_usage_created_at ON public.openai_usage(created_at DESC);
CREATE INDEX idx_openai_usage_session_id ON public.openai_usage(session_id);

-- Create table for cost alerts configuration
CREATE TABLE public.cost_alert_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  daily_threshold_usd DECIMAL(10, 2) NOT NULL DEFAULT 10.00,
  monthly_threshold_usd DECIMAL(10, 2) NOT NULL DEFAULT 300.00,
  alert_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cost_alert_config ENABLE ROW LEVEL SECURITY;

-- Only admins can manage config
CREATE POLICY "Admins can view cost alert config"
ON public.cost_alert_config
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can update cost alert config"
ON public.cost_alert_config
FOR UPDATE
TO authenticated
USING (public.is_admin());

-- Insert default config
INSERT INTO public.cost_alert_config (daily_threshold_usd, monthly_threshold_usd)
VALUES (10.00, 300.00);

-- Create trigger for updated_at
CREATE TRIGGER update_cost_alert_config_updated_at
BEFORE UPDATE ON public.cost_alert_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();