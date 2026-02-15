-- Fix 1: Add RLS protection to admin_user_stats view
-- This prevents direct queries and ensures only the security definer function can access it
ALTER VIEW admin_user_stats SET (security_barrier = true);

-- Note: Views in Postgres don't support RLS policies directly like tables do
-- The security_barrier option ensures the view cannot be bypassed
-- Access is already restricted through the get_admin_user_stats() security definer function
-- which validates admin role before returning data

-- Additional safeguard: Revoke direct access to the view
REVOKE ALL ON admin_user_stats FROM PUBLIC;
REVOKE ALL ON admin_user_stats FROM authenticated;

-- Only allow access through the security definer function
GRANT EXECUTE ON FUNCTION get_admin_user_stats() TO authenticated;