-- Drop the 3-parameter version of process_referral_reward that causes conflicts
DROP FUNCTION IF EXISTS public.process_referral_reward(uuid, uuid, numeric);

-- Recreate the 4-parameter version with enhanced logic and better fallbacks
CREATE OR REPLACE FUNCTION public.process_referral_reward(
  p_order_id uuid, 
  p_referee_id uuid, 
  p_order_amount numeric,
  p_referrer_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_referrer_id UUID;
  v_config RECORD;
  v_reward_amount NUMERIC;
  v_transaction_exists BOOLEAN;
  v_order_referrer_id UUID;
BEGIN
  -- Log the operation with all parameters for debugging
  PERFORM log_security_event(
    'process_referral_reward',
    p_referee_id,
    jsonb_build_object(
      'order_id', p_order_id, 
      'order_amount', p_order_amount, 
      'param_referrer_id', p_referrer_id,
      'step', 'start'
    )
  );

  -- Step 1: Try to get referrer from profile first
  SELECT referred_by INTO v_referrer_id 
  FROM profiles WHERE id = p_referee_id;
  
  -- Step 2: If profile has no referred_by, try the parameter
  IF v_referrer_id IS NULL AND p_referrer_id IS NOT NULL THEN
    v_referrer_id := p_referrer_id;
    -- Also update the profile so future lookups work
    UPDATE profiles SET referred_by = p_referrer_id WHERE id = p_referee_id AND referred_by IS NULL;
  END IF;
  
  -- Step 3: If still NULL, try the order's referrer_id as last resort
  IF v_referrer_id IS NULL THEN
    SELECT referrer_id INTO v_order_referrer_id FROM orders WHERE id = p_order_id;
    IF v_order_referrer_id IS NOT NULL THEN
      v_referrer_id := v_order_referrer_id;
      -- Also update the profile
      UPDATE profiles SET referred_by = v_order_referrer_id WHERE id = p_referee_id AND referred_by IS NULL;
    END IF;
  END IF;
  
  -- Log the resolved referrer
  PERFORM log_security_event(
    'process_referral_reward',
    p_referee_id,
    jsonb_build_object(
      'order_id', p_order_id,
      'resolved_referrer_id', v_referrer_id,
      'step', 'referrer_resolved'
    )
  );
  
  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('processed', false, 'reason', 'No referrer found from any source');
  END IF;
  
  -- Prevent self-referral
  IF v_referrer_id = p_referee_id THEN
    RETURN jsonb_build_object('processed', false, 'reason', 'Cannot refer yourself');
  END IF;
  
  -- Get referral program config
  SELECT * INTO v_config FROM referral_config WHERE is_active = true LIMIT 1;
  
  IF v_config.id IS NULL THEN
    RETURN jsonb_build_object('processed', false, 'reason', 'Referral program not active');
  END IF;
  
  -- Check minimum order amount
  IF p_order_amount < v_config.min_order_amount THEN
    RETURN jsonb_build_object(
      'processed', false, 
      'reason', 'Order below minimum amount',
      'order_amount', p_order_amount,
      'min_required', v_config.min_order_amount
    );
  END IF;
  
  -- Check if already processed for this referee (first order only)
  SELECT EXISTS(
    SELECT 1 FROM referral_transactions 
    WHERE referee_id = p_referee_id AND status = 'completed'
  ) INTO v_transaction_exists;
  
  IF v_transaction_exists THEN
    RETURN jsonb_build_object('processed', false, 'reason', 'Referral already rewarded for this user');
  END IF;
  
  -- Calculate reward using config percentage
  v_reward_amount := ROUND(p_order_amount * v_config.referrer_percentage / 100, 2);
  
  -- Log successful reward before processing
  PERFORM log_security_event(
    'referral_reward_granted',
    v_referrer_id,
    jsonb_build_object(
      'referee_id', p_referee_id,
      'order_id', p_order_id,
      'reward_amount', v_reward_amount,
      'order_amount', p_order_amount,
      'percentage', v_config.referrer_percentage
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
    'referrer_id', v_referrer_id,
    'referee_id', p_referee_id,
    'order_id', p_order_id
  );
END;
$function$;