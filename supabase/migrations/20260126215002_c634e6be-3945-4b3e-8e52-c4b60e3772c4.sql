-- Fix process_order_cashback function - correct log_security_event calls
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
DECLARE
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
  v_current_spending NUMERIC;
BEGIN
  -- SECURITY: Defense-in-depth - verify service_role context
  IF current_setting('role', true) NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
    PERFORM public.log_security_event(
      'process_order_cashback',           -- p_function_name: TEXT
      p_user_id,                           -- p_user_id: UUID (FIXED!)
      jsonb_build_object(
        'event', 'unauthorized_access_attempt',
        'attempted_role', current_setting('role', true),
        'order_id', p_order_id
      )
    );
    RAISE EXCEPTION 'Unauthorized: This function is for internal use only';
  END IF;

  -- Atomic read with row lock to prevent concurrent modifications
  SELECT cashback_balance, total_lifetime_spending
  INTO v_current_balance, v_current_spending
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;
  
  -- Validate sufficient cashback funds
  IF v_current_balance < p_cashback_used THEN
    PERFORM public.log_security_event(
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
    VALUES (p_user_id, p_order_id, -p_cashback_used, 'used', 'Used cashback for order');
  END IF;
  
  -- Record cashback earned transaction
  IF p_cashback_earned > 0 THEN
    INSERT INTO cashback_transactions (user_id, order_id, amount, transaction_type, description)
    VALUES (p_user_id, p_order_id, p_cashback_earned, 'earned', 'Earned cashback from order');
  END IF;
  
  -- Log successful execution (FIXED parameter order)
  PERFORM public.log_security_event(
    'cashback_processed',                 -- p_function_name: TEXT
    p_user_id,                             -- p_user_id: UUID (FIXED!)
    jsonb_build_object(
      'order_id', p_order_id,
      'cashback_used', p_cashback_used,
      'cashback_earned', p_cashback_earned,
      'order_amount', p_order_amount,
      'new_balance', v_new_balance
    )
  );
  
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