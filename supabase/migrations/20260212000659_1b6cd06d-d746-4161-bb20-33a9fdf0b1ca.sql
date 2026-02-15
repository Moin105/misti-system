
-- Migration 1: Unique partial index for duplicate cashback protection
CREATE UNIQUE INDEX idx_cashback_transactions_order_type
  ON cashback_transactions(order_id, transaction_type)
  WHERE order_id IS NOT NULL;

-- Migration 2: Fix transaction_type CHECK constraint
ALTER TABLE cashback_transactions
  DROP CONSTRAINT IF EXISTS cashback_transactions_transaction_type_check;

ALTER TABLE cashback_transactions
  ADD CONSTRAINT cashback_transactions_transaction_type_check
  CHECK (transaction_type IN ('earned', 'used', 'referral_reward', 'reversal'));

-- Migration 3: Create cashback reversal function and trigger
CREATE OR REPLACE FUNCTION reverse_order_cashback()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cashback_earned NUMERIC;
  v_cashback_used NUMERIC;
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status IN ('processing', 'completed') THEN
    v_cashback_earned := OLD.cashback_earned;
    v_cashback_used := OLD.cashback_used;

    IF v_cashback_earned = 0 AND v_cashback_used = 0 THEN
      RETURN NEW;
    END IF;

    UPDATE profiles
    SET
      cashback_balance = cashback_balance - v_cashback_earned + v_cashback_used,
      total_lifetime_spending = GREATEST(total_lifetime_spending - OLD.total_amount, 0),
      updated_at = now()
    WHERE id = OLD.user_id;

    IF v_cashback_earned > 0 THEN
      INSERT INTO cashback_transactions (user_id, order_id, amount, transaction_type, description)
      VALUES (OLD.user_id, OLD.id, -v_cashback_earned, 'reversal',
              'Cashback reversed due to order cancellation');
    END IF;

    IF v_cashback_used > 0 THEN
      INSERT INTO cashback_transactions (user_id, order_id, amount, transaction_type, description)
      VALUES (OLD.user_id, OLD.id, v_cashback_used, 'reversal',
              'Cashback refunded due to order cancellation');
    END IF;

    PERFORM log_security_event(
      'cashback_reversal',
      OLD.user_id,
      jsonb_build_object(
        'order_id', OLD.id,
        'earned_reversed', v_cashback_earned,
        'used_refunded', v_cashback_used,
        'order_amount', OLD.total_amount
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION reverse_order_cashback() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION reverse_order_cashback() TO service_role, postgres;

CREATE TRIGGER trg_reverse_cashback_on_cancel
  BEFORE UPDATE OF status ON orders
  FOR EACH ROW
  WHEN (NEW.status = 'cancelled' AND OLD.status IN ('processing', 'completed'))
  EXECUTE FUNCTION reverse_order_cashback();
