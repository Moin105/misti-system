-- SECURITY REMEDIATION: Fix audit log vulnerability and admin_user_stats permissions
-- This migration addresses multiple security issues identified in the audit

-- ============================================================
-- PHASE 1: Fix security_audit_log RLS vulnerability
-- ============================================================

-- Drop the vulnerable INSERT policy that allowed any authenticated user to insert
DROP POLICY IF EXISTS "System can insert audit logs" ON public.security_audit_log;

-- Create secure policy - only service_role can insert
-- This means only SECURITY DEFINER functions can write logs
CREATE POLICY "Only system can insert audit logs"
ON public.security_audit_log
FOR INSERT
TO service_role
WITH CHECK (true);

-- ============================================================
-- PHASE 2: Revoke direct RPC access from public roles
-- ============================================================

-- Revoke execute on log_security_event from public roles
REVOKE EXECUTE ON FUNCTION public.log_security_event FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_security_event FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.log_security_event FROM PUBLIC;

-- Only postgres and service_role should be able to call it
GRANT EXECUTE ON FUNCTION public.log_security_event TO postgres;
GRANT EXECUTE ON FUNCTION public.log_security_event TO service_role;

-- ============================================================
-- PHASE 3: Clean up malicious log entries
-- ============================================================

-- Remove fake SECURITY_ALERT entries injected by attacker
DELETE FROM public.security_audit_log
WHERE function_name LIKE 'SECURITY_ALERT_%'
  AND operation_details::text = '"CRITICAL_VULNERABILITY_DETECTION_TEST"';

-- Remove fake system events from the attack window
DELETE FROM public.security_audit_log
WHERE function_name IN ('delete_all_users', 'UPDATE_USER_ROLE', 'test_ping')
  AND created_at BETWEEN '2026-01-25 17:00:00+00' AND '2026-01-25 17:20:00+00';

-- ============================================================
-- PHASE 4: Add input validation to log_security_event
-- ============================================================

CREATE OR REPLACE FUNCTION public.log_security_event(
  p_function_name text,
  p_user_id uuid,
  p_operation_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed_functions text[] := ARRAY[
    -- Cashback and financial operations
    'process_order_cashback',
    'process_order_cashback_duplicate',
    'cashback_insufficient_balance',
    -- Referral operations
    'process_referral_reward',
    'process_referral_reward_duplicate',
    'referral_reward_granted',
    -- Coupon validation
    'validate_coupon',
    'validate_coupon_invalid',
    'validate_coupon_expired',
    -- User tier access
    'get_user_tier_access',
    'get_user_tier_unauthorized',
    -- Authentication events
    'password_verification',
    'password_verification_failed',
    'account_locked',
    'account_unlock',
    -- Email change operations
    'change_user_email_attempt',
    'change_user_email_success',
    'change_user_email_failed',
    -- MFA events
    'mfa_enrollment_started',
    'mfa_enrollment_completed',
    'mfa_verification_success',
    'mfa_verification_failed',
    -- Admin operations
    'admin_user_ban',
    'admin_user_unban',
    'admin_role_assigned',
    'admin_role_revoked'
  ];
BEGIN
  -- Validate function_name is in allowed list
  IF NOT p_function_name = ANY(v_allowed_functions) THEN
    -- Log the rejection attempt but don't expose the list
    RAISE WARNING 'Rejected security log attempt with invalid function_name: %', p_function_name;
    RETURN; -- Silently fail to not give attackers information
  END IF;

  INSERT INTO public.security_audit_log (function_name, user_id, operation_details)
  VALUES (p_function_name, p_user_id, p_operation_details);
END;
$$;

-- ============================================================
-- PHASE 5: Fix admin_user_stats view permissions
-- ============================================================

-- Revoke all permissions from admin_user_stats view
REVOKE ALL ON public.admin_user_stats FROM PUBLIC;
REVOKE ALL ON public.admin_user_stats FROM anon;
REVOKE ALL ON public.admin_user_stats FROM authenticated;

-- Set security_invoker to ensure RLS is respected
ALTER VIEW public.admin_user_stats SET (security_invoker = on);

-- ============================================================
-- PHASE 6: Add comment documenting security measures
-- ============================================================

COMMENT ON FUNCTION public.log_security_event IS 
'Security event logger with input validation. Only accepts whitelisted function names to prevent log injection attacks. Must be called from SECURITY DEFINER context only.';