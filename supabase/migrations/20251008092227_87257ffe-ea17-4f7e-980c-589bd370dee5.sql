-- Fix Security Definer View issue
-- Remove security_barrier from admin_user_stats view
-- Access to this view is already controlled through the secure function get_admin_user_stats()

-- Reset view options to default (removes security_barrier)
ALTER VIEW public.admin_user_stats RESET (security_barrier);

-- Add comment explaining the security model
COMMENT ON VIEW public.admin_user_stats IS 'Administrative view of user statistics. Direct access is restricted via GRANT/REVOKE. Secure access is provided through the get_admin_user_stats() function which enforces admin role checking.';

-- Ensure payment_methods_public view has proper access control
-- Since this view exposes only non-sensitive data (no config field), it can be publicly readable
GRANT SELECT ON public.payment_methods_public TO authenticated;
GRANT SELECT ON public.payment_methods_public TO anon;