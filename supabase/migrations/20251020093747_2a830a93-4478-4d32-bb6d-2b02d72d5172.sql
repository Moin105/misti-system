-- Create atomic function for processing cashback during checkout
-- This prevents race conditions by using row-level locking (FOR UPDATE)

CREATE OR REPLACE FUNCTION public.process_order_cashback(
  p_user_id UUID,
  p_order_id UUID,
  p_cashback_used NUMERIC,
  p_cashback_earned NUMERIC,
  p_order_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
  v_current_spending NUMERIC;
BEGIN
  -- Atomic read with row lock to prevent concurrent modifications
  SELECT cashback_balance, total_lifetime_spending
  INTO v_current_balance, v_current_spending
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;  -- Critical: locks row until transaction commits
  
  -- Validate sufficient cashback funds
  IF v_current_balance < p_cashback_used THEN
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