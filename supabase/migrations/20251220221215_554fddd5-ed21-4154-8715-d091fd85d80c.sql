-- Create audit log table for tracking sensitive operations
CREATE TABLE public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  user_id uuid,
  operation_details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_security_audit_log_user_id ON public.security_audit_log(user_id);
CREATE INDEX idx_security_audit_log_function_name ON public.security_audit_log(function_name);
CREATE INDEX idx_security_audit_log_created_at ON public.security_audit_log(created_at DESC);

-- Enable RLS
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.security_audit_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert audit logs (via SECURITY DEFINER functions)
CREATE POLICY "System can insert audit logs"
ON public.security_audit_log
FOR INSERT
WITH CHECK (true);

-- Create helper function to log security events
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
BEGIN
  INSERT INTO public.security_audit_log (function_name, user_id, operation_details)
  VALUES (p_function_name, p_user_id, p_operation_details);
END;
$$;

-- Create table for password verification attempts (for HIBP hook)
CREATE TABLE public.password_failed_verification_attempts (
  user_id uuid PRIMARY KEY,
  failed_attempts integer DEFAULT 0,
  last_failed_at timestamp with time zone DEFAULT now()
);

-- Grant access to supabase_auth_admin for the hook
GRANT ALL ON TABLE public.password_failed_verification_attempts TO supabase_auth_admin;
REVOKE ALL ON TABLE public.password_failed_verification_attempts FROM authenticated, anon, public;

-- Create password verification hook function for HIBP integration
CREATE OR REPLACE FUNCTION public.hook_password_verification_attempt(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  failed_attempts integer;
  last_failed_at timestamp;
BEGIN
  -- Log the verification attempt
  PERFORM log_security_event(
    'password_verification',
    (event->>'user_id')::uuid,
    jsonb_build_object('valid', event->'valid')
  );

  IF event->'valid' = 'true'::jsonb THEN
    -- Password is valid, reset failed attempts
    DELETE FROM public.password_failed_verification_attempts
    WHERE user_id = (event->>'user_id')::uuid;
    RETURN jsonb_build_object('decision', 'continue');
  END IF;

  -- Get current failed attempts
  SELECT pfa.failed_attempts, pfa.last_failed_at 
  INTO failed_attempts, last_failed_at
  FROM public.password_failed_verification_attempts pfa
  WHERE pfa.user_id = (event->>'user_id')::uuid;

  IF failed_attempts IS NULL THEN
    failed_attempts := 0;
  END IF;

  -- Check if account should be temporarily locked (5+ failed attempts within 15 minutes)
  IF failed_attempts >= 5 AND last_failed_at IS NOT NULL AND now() - last_failed_at < interval '15 minutes' THEN
    PERFORM log_security_event(
      'account_locked',
      (event->>'user_id')::uuid,
      jsonb_build_object('failed_attempts', failed_attempts, 'reason', 'too_many_failed_attempts')
    );
    RETURN jsonb_build_object(
      'decision', 'reject',
      'message', 'Too many failed attempts. Please try again in 15 minutes.'
    );
  END IF;

  -- Update or insert failed attempt record
  INSERT INTO public.password_failed_verification_attempts (user_id, failed_attempts, last_failed_at)
  VALUES ((event->>'user_id')::uuid, 1, now())
  ON CONFLICT (user_id) DO UPDATE
  SET 
    failed_attempts = password_failed_verification_attempts.failed_attempts + 1,
    last_failed_at = now();

  RETURN jsonb_build_object('decision', 'continue');
END;
$$;

-- Grant execute to supabase_auth_admin
GRANT EXECUTE ON FUNCTION public.hook_password_verification_attempt TO supabase_auth_admin;

-- Add audit logging to process_order_cashback function
CREATE OR REPLACE FUNCTION public.process_order_cashback(p_user_id uuid, p_order_id uuid, p_cashback_used numeric, p_cashback_earned numeric, p_order_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
  v_current_spending NUMERIC;
BEGIN
  -- Log the operation
  PERFORM log_security_event(
    'process_order_cashback',
    p_user_id,
    jsonb_build_object(
      'order_id', p_order_id,
      'cashback_used', p_cashback_used,
      'cashback_earned', p_cashback_earned,
      'order_amount', p_order_amount
    )
  );

  -- Atomic read with row lock to prevent concurrent modifications
  SELECT cashback_balance, total_lifetime_spending
  INTO v_current_balance, v_current_spending
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;
  
  -- Validate sufficient cashback funds
  IF v_current_balance < p_cashback_used THEN
    PERFORM log_security_event(
      'cashback_insufficient_balance',
      p_user_id,
      jsonb_build_object('available', v_current_balance, 'requested', p_cashback_used)
    );
    RAISE EXCEPTION 'Insufficient cashback balance. Available: %, Requested: %', 
      v_current_balance, p_cashback_used;
  END IF;
  
  -- Calculate new balance
  v_new_balance := v_current_balance - p_cashback_used + p_cashback_earned;
  
  -- Atomic update of both balance and spending
  UPDATE profiles
  SET 
    cashback_balance = v_new_balance,
    total_lifetime_spending = v_current_spending + p_order_amount,
    updated_at = now()
  WHERE id = p_user_id;
  
  -- Record cashback usage transaction
  IF p_cashback_used > 0 THEN
    INSERT INTO cashback_transactions (user_id, order_id, amount, transaction_type, description)
    VALUES (p_user_id, p_order_id, -p_cashback_used, 'used', 
            'Used cashback for order');
  END IF;
  
  -- Record cashback earned transaction
  IF p_cashback_earned > 0 THEN
    INSERT INTO cashback_transactions (user_id, order_id, amount, transaction_type, description)
    VALUES (p_user_id, p_order_id, p_cashback_earned, 'earned',
            'Earned cashback from order');
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'old_balance', v_current_balance,
    'used', p_cashback_used,
    'earned', p_cashback_earned,
    'new_lifetime_spending', v_current_spending + p_order_amount
  );
END;
$$;

-- Add audit logging to process_referral_reward function
CREATE OR REPLACE FUNCTION public.process_referral_reward(p_order_id uuid, p_referee_id uuid, p_order_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
  v_config RECORD;
  v_reward_amount NUMERIC;
  v_transaction_exists BOOLEAN;
BEGIN
  -- Log the operation
  PERFORM log_security_event(
    'process_referral_reward',
    p_referee_id,
    jsonb_build_object('order_id', p_order_id, 'order_amount', p_order_amount)
  );

  -- Get referrer
  SELECT referred_by INTO v_referrer_id FROM profiles WHERE id = p_referee_id;
  
  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('processed', false, 'reason', 'No referrer found');
  END IF;
  
  -- Get config
  SELECT * INTO v_config FROM referral_config WHERE is_active = true LIMIT 1;
  
  IF v_config.id IS NULL THEN
    RETURN jsonb_build_object('processed', false, 'reason', 'Referral program not active');
  END IF;
  
  -- Check minimum order amount
  IF p_order_amount < v_config.min_order_amount THEN
    RETURN jsonb_build_object('processed', false, 'reason', 'Order below minimum amount');
  END IF;
  
  -- Check if already processed for this referee (first order only)
  SELECT EXISTS(
    SELECT 1 FROM referral_transactions 
    WHERE referee_id = p_referee_id AND status = 'completed'
  ) INTO v_transaction_exists;
  
  IF v_transaction_exists THEN
    RETURN jsonb_build_object('processed', false, 'reason', 'Referral already rewarded');
  END IF;
  
  -- Calculate reward
  v_reward_amount := ROUND(p_order_amount * v_config.referrer_percentage / 100, 2);
  
  -- Log successful reward
  PERFORM log_security_event(
    'referral_reward_granted',
    v_referrer_id,
    jsonb_build_object(
      'referee_id', p_referee_id,
      'order_id', p_order_id,
      'reward_amount', v_reward_amount
    )
  );
  
  -- Create or update transaction
  INSERT INTO referral_transactions (referrer_id, referee_id, order_id, reward_amount, status)
  VALUES (v_referrer_id, p_referee_id, p_order_id, v_reward_amount, 'completed')
  ON CONFLICT (referee_id, referrer_id) DO UPDATE SET
    order_id = EXCLUDED.order_id,
    reward_amount = EXCLUDED.reward_amount,
    status = 'completed',
    updated_at = now();
  
  -- Update referrer's cashback balance and stats
  UPDATE profiles SET
    cashback_balance = cashback_balance + v_reward_amount,
    total_referrals = total_referrals + 1,
    referral_earnings = referral_earnings + v_reward_amount,
    updated_at = now()
  WHERE id = v_referrer_id;
  
  -- Record as cashback transaction
  INSERT INTO cashback_transactions (user_id, order_id, amount, transaction_type, description)
  VALUES (v_referrer_id, p_order_id, v_reward_amount, 'referral', 'Referral reward for new customer');
  
  RETURN jsonb_build_object(
    'processed', true,
    'reward_amount', v_reward_amount,
    'referrer_id', v_referrer_id
  );
END;
$$;

-- Add audit logging to validate_coupon function
CREATE OR REPLACE FUNCTION public.validate_coupon(p_code text, p_user_id uuid, p_cart_items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon RECORD;
  v_applicable_total NUMERIC := 0;
  v_item JSONB;
  v_product RECORD;
  v_is_applicable BOOLEAN := false;
BEGIN
  -- Log the operation
  PERFORM log_security_event(
    'validate_coupon',
    p_user_id,
    jsonb_build_object('code', p_code)
  );

  -- Get coupon details
  SELECT * INTO v_coupon
  FROM coupons
  WHERE code = UPPER(p_code) AND is_active = true;
  
  -- Check if coupon exists
  IF v_coupon.id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid coupon code');
  END IF;
  
  -- Check if expired
  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Coupon has expired');
  END IF;
  
  -- Check usage limit
  IF v_coupon.max_uses IS NOT NULL AND v_coupon.current_uses >= v_coupon.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Coupon usage limit reached');
  END IF;
  
  -- Check cart applicability
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_cart_items)
  LOOP
    SELECT p.*, c.game_id INTO v_product
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE p.id = (v_item->>'product_id')::UUID;
    
    v_is_applicable := false;
    
    -- Check if applies to all or specific games/categories
    IF v_coupon.applicable_games IS NULL AND v_coupon.applicable_categories IS NULL THEN
      v_is_applicable := true;
    ELSIF v_coupon.applicable_games IS NOT NULL AND v_product.game_id = ANY(v_coupon.applicable_games) THEN
      v_is_applicable := true;
    ELSIF v_coupon.applicable_categories IS NOT NULL AND v_product.category_id = ANY(v_coupon.applicable_categories) THEN
      v_is_applicable := true;
    END IF;
    
    IF v_is_applicable THEN
      v_applicable_total := v_applicable_total + (v_item->>'total_price')::NUMERIC;
    END IF;
  END LOOP;
  
  -- Check if any items are applicable
  IF v_applicable_total = 0 THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Coupon not applicable to cart items');
  END IF;
  
  -- Calculate discount
  RETURN jsonb_build_object(
    'valid', true,
    'coupon_id', v_coupon.id,
    'code', v_coupon.code,
    'discount_percentage', v_coupon.discount_percentage,
    'applicable_total', v_applicable_total,
    'discount_amount', ROUND(v_applicable_total * v_coupon.discount_percentage / 100, 2)
  );
END;
$$;