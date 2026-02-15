-- Fix Security Definer View linter errors
-- Remove security_barrier option from admin_user_stats view
-- This is flagged by Supabase linter as it can bypass RLS and enforce permissions
-- of the view creator rather than the querying user.

-- The view is already protected by:
-- 1. WHERE clause checking admin role with has_role(auth.uid(), 'admin'::app_role)
-- 2. REVOKE statements preventing direct access
-- 3. Access only through get_admin_user_stats() security definer function

ALTER VIEW public.admin_user_stats SET (security_barrier = false);

-- Verify permissions are still restricted
-- (these are already set in previous migrations, but reapplying for safety)
REVOKE ALL ON public.admin_user_stats FROM PUBLIC;
REVOKE ALL ON public.admin_user_stats FROM authenticated;