
-- Fix trigger to also allow the 'authenticated' role when called by admins
-- and handle the migration/superuser context properly
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := coalesce(current_setting('role', true), '');
  
  -- Allow service_role, postgres, and superuser contexts
  IF v_role IN ('service_role', 'postgres', 'supabase_admin', 'supabase_auth_admin') THEN
    RETURN NEW;
  END IF;

  -- Allow admins to update anything
  IF v_role = 'authenticated' AND has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- For regular users, prevent modification of sensitive columns
  IF NEW.cashback_balance IS DISTINCT FROM OLD.cashback_balance THEN
    RAISE EXCEPTION 'Unauthorized: Cannot modify cashback_balance';
  END IF;

  IF NEW.total_lifetime_spending IS DISTINCT FROM OLD.total_lifetime_spending THEN
    RAISE EXCEPTION 'Unauthorized: Cannot modify total_lifetime_spending';
  END IF;

  IF NEW.referral_earnings IS DISTINCT FROM OLD.referral_earnings THEN
    RAISE EXCEPTION 'Unauthorized: Cannot modify referral_earnings';
  END IF;

  IF NEW.total_referrals IS DISTINCT FROM OLD.total_referrals THEN
    RAISE EXCEPTION 'Unauthorized: Cannot modify total_referrals';
  END IF;

  IF NEW.is_banned IS DISTINCT FROM OLD.is_banned THEN
    RAISE EXCEPTION 'Unauthorized: Cannot modify is_banned';
  END IF;

  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Unauthorized: Cannot modify email directly';
  END IF;

  RETURN NEW;
END;
$$;
