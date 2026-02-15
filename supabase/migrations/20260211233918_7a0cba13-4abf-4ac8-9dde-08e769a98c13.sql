
-- Temporarily disable the trigger
ALTER TABLE profiles DISABLE TRIGGER protect_profile_columns;

-- Revert fraudulent balance
UPDATE profiles SET cashback_balance = 0 WHERE id = 'a6d532e1-cbe4-4862-a70a-f1b7762e3143';

-- Log the remediation
INSERT INTO security_audit_log (function_name, user_id, operation_details, severity, event_category)
VALUES (
  'admin_balance_correction',
  'a6d532e1-cbe4-4862-a70a-f1b7762e3143',
  '{"event": "fraudulent_balance_reverted", "old_balance": 20, "new_balance": 0, "reason": "No orders or transactions found"}'::jsonb,
  'error',
  'financial'
);

-- Re-enable the trigger
ALTER TABLE profiles ENABLE TRIGGER protect_profile_columns;
