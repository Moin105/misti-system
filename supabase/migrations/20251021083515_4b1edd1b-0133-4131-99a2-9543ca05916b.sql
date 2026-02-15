-- Fix Security Definer View linter errors
-- PostgreSQL's default for views is SECURITY DEFINER, which means views use the 
-- permissions of the view's creator rather than the querying user, bypassing RLS policies.
-- This is a security risk as it can expose more data than intended.
-- 
-- Fix: Set security_invoker=on to make views respect RLS and run with querying user's permissions

-- Fix admin_user_stats view
ALTER VIEW public.admin_user_stats SET (security_invoker = on);

-- Fix popular_products view  
ALTER VIEW public.popular_products SET (security_invoker = on);

-- Note: These views will now properly respect RLS policies
-- admin_user_stats already has has_role() check in WHERE clause for additional protection
-- popular_products queries the products table which has RLS policies