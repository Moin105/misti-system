
-- Fix validate_referral_code: check referral_transactions instead of profiles.referred_by
-- This prevents abandoned checkouts from permanently blocking referral code usage
CREATE OR REPLACE FUNCTION public.validate_referral_code(p_code text, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_referrer RECORD;
  v_config RECORD;
  v_already_referred BOOLEAN;
BEGIN
  -- Get referral config
  SELECT * INTO v_config FROM referral_config WHERE is_active = true LIMIT 1;
  
  IF v_config.id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Referral program is not active');
  END IF;
  
  -- Check if user already has a COMPLETED referral transaction (not just referred_by flag)
  -- This fixes the bug where abandoned checkouts permanently block referral usage
  SELECT EXISTS(
    SELECT 1 FROM referral_transactions 
    WHERE referee_id = p_user_id AND status = 'completed'
  ) INTO v_already_referred;
  
  IF v_already_referred THEN
    RETURN jsonb_build_object('valid', false, 'error', 'You have already used a referral code');
  END IF;
  
  -- Get referrer by code
  SELECT id, email, full_name, referral_code INTO v_referrer 
  FROM profiles WHERE UPPER(referral_code) = UPPER(p_code);
  
  IF v_referrer.id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid referral code');
  END IF;
  
  -- Cannot refer yourself
  IF v_referrer.id = p_user_id THEN
    RETURN jsonb_build_object('valid', false, 'error', 'You cannot use your own referral code');
  END IF;
  
  RETURN jsonb_build_object(
    'valid', true,
    'referrer_id', v_referrer.id,
    'referrer_name', COALESCE(v_referrer.full_name, split_part(v_referrer.email, '@', 1)),
    'discount_percentage', v_config.referee_discount_percentage,
    'min_order_amount', v_config.min_order_amount
  );
END;
$function$;

-- Clean up stale referred_by values from abandoned checkouts
-- Only clear if there's no completed referral transaction
UPDATE profiles p
SET referred_by = NULL
WHERE referred_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM referral_transactions rt
    WHERE rt.referee_id = p.id AND rt.status = 'completed'
  );
