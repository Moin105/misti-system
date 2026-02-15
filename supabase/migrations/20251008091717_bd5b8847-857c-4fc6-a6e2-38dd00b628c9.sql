-- Secure admin_user_stats view
-- This view contains sensitive customer data (emails, purchase history, financial data)
-- and must be restricted to admin users only

-- Enable RLS on the admin_user_stats view
ALTER VIEW public.admin_user_stats SET (security_barrier = true);

-- Note: Views don't use the same RLS as tables, but we can control access through grants
-- First, revoke all existing permissions
REVOKE ALL ON public.admin_user_stats FROM authenticated;
REVOKE ALL ON public.admin_user_stats FROM anon;
REVOKE ALL ON public.admin_user_stats FROM public;

-- Create a security definer function to check if current user is admin and return stats
CREATE OR REPLACE FUNCTION public.get_admin_user_stats()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  registration_date timestamp with time zone,
  total_spent numeric,
  paid_amount numeric,
  recent_purchase_date timestamp with time zone,
  recent_order_number text,
  is_banned boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    email,
    full_name,
    registration_date,
    total_spent,
    paid_amount,
    recent_purchase_date,
    recent_order_number,
    is_banned
  FROM public.admin_user_stats
  WHERE has_role(auth.uid(), 'admin'::app_role);
$$;

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.get_admin_user_stats() TO authenticated;

-- Add comment explaining the security measure
COMMENT ON FUNCTION public.get_admin_user_stats() IS 'Returns admin user statistics only if the current user has admin role. This protects sensitive customer financial and personal data from unauthorized access.';