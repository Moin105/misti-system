-- Fix Security Definer View linter errors (properly this time)
-- PostgreSQL views default to SECURITY DEFINER mode which runs with creator's 
-- permissions and bypasses RLS. We need to explicitly set SECURITY INVOKER mode.

-- Fix admin_user_stats view to use SECURITY INVOKER
ALTER VIEW public.admin_user_stats SET (security_invoker = on);

-- Fix popular_products view to use SECURITY INVOKER  
ALTER VIEW public.popular_products SET (security_invoker = on);

-- Note: These views will now run with the permissions of the querying user,
-- which is the desired behavior for proper RLS enforcement.