
-- 1. Drop the overly permissive UPDATE policy
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- 2. New policy: users can still update their own row (trigger guards sensitive columns)
CREATE POLICY "Users can update own display name"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 3. Create trigger function to protect sensitive columns
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF current_setting('role', true) IN ('service_role', 'postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

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

-- 4. Attach the trigger
CREATE TRIGGER protect_profile_columns
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION protect_profile_sensitive_columns();

-- 5. Drop the overly permissive cashback_transactions INSERT policy
DROP POLICY IF EXISTS "System can create transactions" ON cashback_transactions;
