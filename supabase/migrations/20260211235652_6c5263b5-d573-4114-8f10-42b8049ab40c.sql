
-- 1. Lock down log_security_event (CRITICAL)
REVOKE EXECUTE ON FUNCTION public.log_security_event(text, uuid, jsonb, text, text, text, text, text, text) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_security_event(text, uuid, jsonb, text, text, text, text, text, text) TO service_role, postgres;

-- 2. Drop coupon_usage INSERT policy (MEDIUM)
DROP POLICY IF EXISTS "System can insert coupon usage" ON coupon_usage;

-- 3. Lock down hook_password_verification_attempt (MEDIUM)
REVOKE EXECUTE ON FUNCTION public.hook_password_verification_attempt(jsonb) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.hook_password_verification_attempt(jsonb) TO service_role, postgres, supabase_auth_admin;

-- 4. Lock down trigger functions (LOW - defense-in-depth)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role, postgres, supabase_auth_admin;

REVOKE EXECUTE ON FUNCTION public.protect_profile_sensitive_columns() FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.protect_profile_sensitive_columns() TO service_role, postgres;
