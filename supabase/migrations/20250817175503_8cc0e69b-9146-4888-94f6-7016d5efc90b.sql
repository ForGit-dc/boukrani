-- Fix function search path security warnings
-- Update all functions to have immutable search_path

-- Fix log_visitor_access function
CREATE OR REPLACE FUNCTION public.log_visitor_access()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

-- Fix is_admin function
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE user_id = _user_id
    );
$$;

-- Fix get_admin_role function
CREATE OR REPLACE FUNCTION public.get_admin_role(_user_id uuid DEFAULT auth.uid())
RETURNS admin_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
    SELECT role FROM public.admin_users 
    WHERE user_id = _user_id;
$$;

-- Fix cleanup_old_visitors function
CREATE OR REPLACE FUNCTION public.cleanup_old_visitors()
RETURNS void
LANGUAGE SQL
SECURITY DEFINER
SET search_path = 'public'
AS $$
    DELETE FROM public.visitors 
    WHERE created_at < now() - interval '1 year'
    AND consent = false;
$$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;