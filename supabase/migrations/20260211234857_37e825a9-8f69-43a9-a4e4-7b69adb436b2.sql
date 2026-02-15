-- 1. Replace trigger function with categorized column protection
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_role text;
  v_is_admin boolean := false;
BEGIN
  v_role := coalesce(current_setting('role', true), '');

  -- Allow privileged roles to update anything
  IF v_role IN ('service_role', 'postgres', 'supabase_admin', 'supabase_auth_admin') THEN
    RETURN NEW;
  END IF;

  -- Check admin status (graceful fallback if has_role doesn't exist)
  IF v_role = 'authenticated' THEN
    BEGIN
      v_is_admin := has_role(auth.uid(), 'admin'::app_role);
    EXCEPTION WHEN OTHERS THEN
      v_is_admin := false;
    END;
  END IF;

  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  -- === FINANCIAL COLUMNS (system-only) ===
  IF NEW.cashback_balance IS DISTINCT FROM OLD.cashback_balance THEN
    RAISE EXCEPTION 'Cannot modify cashback_balance: financial data is system-managed';
  END IF;

  IF NEW.total_lifetime_spending IS DISTINCT FROM OLD.total_lifetime_spending THEN
    RAISE EXCEPTION 'Cannot modify total_lifetime_spending: financial data is system-managed';
  END IF;

  IF NEW.referral_earnings IS DISTINCT FROM OLD.referral_earnings THEN
    RAISE EXCEPTION 'Cannot modify referral_earnings: financial data is system-managed';
  END IF;

  IF NEW.total_referrals IS DISTINCT FROM OLD.total_referrals THEN
    RAISE EXCEPTION 'Cannot modify total_referrals: financial data is system-managed';
  END IF;

  -- === ADMIN-ONLY COLUMNS ===
  IF NEW.is_banned IS DISTINCT FROM OLD.is_banned THEN
    RAISE EXCEPTION 'Cannot modify is_banned: admin-only';
  END IF;

  -- === SYSTEM-MANAGED COLUMNS ===
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Cannot modify email directly: use the email change feature';
  END IF;

  IF NEW.referral_code IS DISTINCT FROM OLD.referral_code THEN
    RAISE EXCEPTION 'Cannot modify referral_code: system-generated';
  END IF;

  -- === ONE-TIME-SET COLUMNS ===
  IF NEW.referred_by IS DISTINCT FROM OLD.referred_by THEN
    IF OLD.referred_by IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot modify referred_by: referral link is permanent once set';
    END IF;
    -- Allow NULL -> value (first-time set during signup)
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Simplify RLS: let trigger handle column restrictions
DROP POLICY IF EXISTS "Users can update own display name" ON profiles;

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);