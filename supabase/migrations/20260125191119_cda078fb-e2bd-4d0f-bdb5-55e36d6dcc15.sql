-- ============================================================
-- CRITICAL SECURITY HARDENING: Close RPC Function Vulnerabilities
-- Addresses: anon/authenticated users able to call sensitive functions
-- ============================================================

-- ============================================================
-- PHASE 1: REVOKE EXECUTE PERMISSIONS ON DANGEROUS FUNCTIONS
-- (Skipping update_product_sales as it's a trigger, not callable RPC)
-- ============================================================

-- Revoke access from apply_coupon_usage (prevents coupon exhaustion attacks)
REVOKE EXECUTE ON FUNCTION public.apply_coupon_usage(uuid) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_coupon_usage(uuid) TO service_role;

-- Revoke access from process_order_cashback (prevents balance manipulation)
-- Note: This function returns jsonb, not void
REVOKE EXECUTE ON FUNCTION public.process_order_cashback(uuid, uuid, numeric, numeric, numeric) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_order_cashback(uuid, uuid, numeric, numeric, numeric) TO service_role;

-- Revoke access from process_referral_reward (prevents referral fraud)
REVOKE EXECUTE ON FUNCTION public.process_referral_reward(uuid, uuid, numeric, uuid) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_referral_reward(uuid, uuid, numeric, uuid) TO service_role;

-- Revoke access from update_exchange_rate (prevents financial tampering)
REVOKE EXECUTE ON FUNCTION public.update_exchange_rate(text, text, numeric) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_exchange_rate(text, text, numeric) TO service_role;

-- Revoke access from cleanup_old_rate_limits (internal maintenance only)
-- Note: This function takes no arguments
REVOKE EXECUTE ON FUNCTION public.cleanup_old_rate_limits() FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_old_rate_limits() TO service_role;

-- ============================================================
-- PHASE 2: FIX OVERLY PERMISSIVE RLS POLICIES
-- ============================================================

-- Fix g2g_price_history - should only be insertable by service_role
DROP POLICY IF EXISTS "System can insert price history" ON public.g2g_price_history;
CREATE POLICY "Only service_role can insert price history"
ON public.g2g_price_history
FOR INSERT
TO service_role
WITH CHECK (true);

-- ============================================================
-- PHASE 3: ADD DEFENSE-IN-DEPTH ROLE CHECKS TO FUNCTIONS
-- ============================================================

-- Update apply_coupon_usage with internal role check
CREATE OR REPLACE FUNCTION public.apply_coupon_usage(p_coupon_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- SECURITY: Defense-in-depth - verify service_role context
  IF current_setting('role', true) NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
    PERFORM public.log_security_event(
      'apply_coupon_usage',
      'unauthorized_access_attempt',
      jsonb_build_object('attempted_role', current_setting('role', true), 'coupon_id', p_coupon_id)
    );
    RAISE EXCEPTION 'Unauthorized: This function is for internal use only';
  END IF;
  
  UPDATE coupons
  SET current_uses = current_uses + 1
  WHERE id = p_coupon_id;
  
  -- Log successful execution
  PERFORM public.log_security_event(
    'apply_coupon_usage',
    'coupon_usage_applied',
    jsonb_build_object('coupon_id', p_coupon_id)
  );
END;
$$;

-- Update update_exchange_rate with internal role check and audit logging
CREATE OR REPLACE FUNCTION public.update_exchange_rate(
  p_base_currency text,
  p_target_currency text,
  p_rate numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_old_rate numeric;
BEGIN
  -- SECURITY: Defense-in-depth - verify service_role context
  IF current_setting('role', true) NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
    PERFORM public.log_security_event(
      'update_exchange_rate',
      'unauthorized_access_attempt',
      jsonb_build_object(
        'attempted_role', current_setting('role', true),
        'base_currency', p_base_currency,
        'target_currency', p_target_currency
      )
    );
    RAISE EXCEPTION 'Unauthorized: This function is for internal use only';
  END IF;

  -- Get old rate for audit logging
  SELECT rate INTO v_old_rate
  FROM exchange_rates
  WHERE base_currency = p_base_currency AND target_currency = p_target_currency;

  -- Upsert the exchange rate
  INSERT INTO exchange_rates (base_currency, target_currency, rate, last_updated)
  VALUES (p_base_currency, p_target_currency, p_rate, now())
  ON CONFLICT (base_currency, target_currency)
  DO UPDATE SET rate = p_rate, last_updated = now();
  
  -- Log the rate change
  PERFORM public.log_security_event(
    'update_exchange_rate',
    'exchange_rate_updated',
    jsonb_build_object(
      'base_currency', p_base_currency,
      'target_currency', p_target_currency,
      'old_rate', v_old_rate,
      'new_rate', p_rate
    )
  );
END;
$$;

-- Update cleanup_old_rate_limits with internal role check
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- SECURITY: Defense-in-depth - verify service_role context
  IF current_setting('role', true) NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'Unauthorized: This function is for internal use only';
  END IF;
  
  DELETE FROM rate_limits
  WHERE created_at < now() - interval '1 hour';
END;
$$;

-- Update process_order_cashback with defense-in-depth role check
-- Returns jsonb to match existing signature
CREATE OR REPLACE FUNCTION public.process_order_cashback(
  p_user_id uuid,
  p_order_id uuid,
  p_cashback_used numeric,
  p_cashback_earned numeric,
  p_order_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- SECURITY: Defense-in-depth - verify service_role context
  IF current_setting('role', true) NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
    PERFORM public.log_security_event(
      'process_order_cashback',
      'unauthorized_access_attempt',
      jsonb_build_object(
        'attempted_role', current_setting('role', true),
        'user_id', p_user_id,
        'order_id', p_order_id
      )
    );
    RAISE EXCEPTION 'Unauthorized: This function is for internal use only';
  END IF;

  -- Deduct used cashback from balance
  IF p_cashback_used > 0 THEN
    UPDATE profiles
    SET cashback_balance = cashback_balance - p_cashback_used
    WHERE id = p_user_id;
    
    INSERT INTO cashback_transactions (user_id, amount, order_id, transaction_type, description)
    VALUES (p_user_id, -p_cashback_used, p_order_id, 'used', 'Cashback used on order');
  END IF;
  
  -- Add earned cashback to balance
  IF p_cashback_earned > 0 THEN
    UPDATE profiles
    SET cashback_balance = cashback_balance + p_cashback_earned
    WHERE id = p_user_id;
    
    INSERT INTO cashback_transactions (user_id, amount, order_id, transaction_type, description)
    VALUES (p_user_id, p_cashback_earned, p_order_id, 'earned', 'Cashback earned from order');
  END IF;
  
  -- Update total lifetime spending
  UPDATE profiles
  SET total_lifetime_spending = total_lifetime_spending + p_order_amount
  WHERE id = p_user_id;
  
  -- Log successful execution
  PERFORM public.log_security_event(
    'process_order_cashback',
    'cashback_processed',
    jsonb_build_object(
      'user_id', p_user_id,
      'order_id', p_order_id,
      'cashback_used', p_cashback_used,
      'cashback_earned', p_cashback_earned,
      'order_amount', p_order_amount
    )
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Update process_referral_reward with defense-in-depth role check
CREATE OR REPLACE FUNCTION public.process_referral_reward(
  p_order_id uuid,
  p_referee_id uuid,
  p_order_amount numeric,
  p_referrer_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_referrer_id uuid;
  v_reward_amount numeric;
  v_referral_percentage numeric := 0.10; -- 10% reward
  v_existing_transaction uuid;
  v_result jsonb;
BEGIN
  -- SECURITY: Defense-in-depth - verify service_role context
  IF current_setting('role', true) NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
    PERFORM public.log_security_event(
      'process_referral_reward',
      'unauthorized_access_attempt',
      jsonb_build_object(
        'attempted_role', current_setting('role', true),
        'referee_id', p_referee_id,
        'order_id', p_order_id
      )
    );
    RAISE EXCEPTION 'Unauthorized: This function is for internal use only';
  END IF;

  -- Check if this order already has a completed referral transaction
  SELECT id INTO v_existing_transaction
  FROM referral_transactions
  WHERE order_id = p_order_id AND status = 'completed';
  
  IF v_existing_transaction IS NOT NULL THEN
    RETURN jsonb_build_object('processed', false, 'reason', 'already_processed');
  END IF;

  -- 3-level fallback for referrer attribution
  -- Level 1: Check profile's referred_by
  SELECT referred_by INTO v_referrer_id
  FROM profiles
  WHERE id = p_referee_id;
  
  -- Level 2: Use parameter if profile lookup failed
  IF v_referrer_id IS NULL AND p_referrer_id IS NOT NULL THEN
    v_referrer_id := p_referrer_id;
  END IF;
  
  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('processed', false, 'reason', 'no_referrer');
  END IF;
  
  -- Calculate reward (10% of order amount)
  v_reward_amount := p_order_amount * v_referral_percentage;
  
  -- Credit referrer's cashback balance
  UPDATE profiles
  SET 
    cashback_balance = cashback_balance + v_reward_amount,
    referral_earnings = COALESCE(referral_earnings, 0) + v_reward_amount,
    total_referrals = COALESCE(total_referrals, 0) + 1
  WHERE id = v_referrer_id;
  
  -- Record cashback transaction for referrer
  INSERT INTO cashback_transactions (user_id, amount, order_id, transaction_type, description)
  VALUES (v_referrer_id, v_reward_amount, p_order_id, 'referral_reward', 'Referral reward from order');
  
  -- Record referral transaction
  INSERT INTO referral_transactions (referrer_id, referee_id, order_id, reward_amount, status)
  VALUES (v_referrer_id, p_referee_id, p_order_id, v_reward_amount, 'completed')
  ON CONFLICT (referee_id, referrer_id) DO UPDATE SET
    order_id = p_order_id,
    reward_amount = v_reward_amount,
    status = 'completed',
    updated_at = now();
  
  v_result := jsonb_build_object(
    'processed', true,
    'referrer_id', v_referrer_id,
    'reward_amount', v_reward_amount
  );
  
  -- Log successful execution
  PERFORM public.log_security_event(
    'process_referral_reward',
    'referral_reward_processed',
    v_result || jsonb_build_object('order_id', p_order_id, 'referee_id', p_referee_id)
  );
  
  RETURN v_result;
END;
$$;