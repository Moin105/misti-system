-- Update get_user_tier to accept pending order amount for accurate tier calculation
-- This ensures users get correct cashback percentage when crossing tier thresholds

DROP FUNCTION IF EXISTS public.get_user_tier(uuid);

CREATE OR REPLACE FUNCTION public.get_user_tier(
  p_user_id UUID,
  p_pending_amount NUMERIC DEFAULT 0  -- New parameter for pending order amount
)
RETURNS TABLE(
  tier_id UUID,
  tier_name TEXT,
  tier_percentage NUMERIC,
  min_spending NUMERIC,
  current_spending NUMERIC,
  next_tier_name TEXT,
  next_tier_min_spending NUMERIC,
  spending_to_next_tier NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_spending NUMERIC;
  v_projected_spending NUMERIC;
  v_current_tier RECORD;
  v_next_tier RECORD;
BEGIN
  -- Get user's current total spending
  SELECT total_lifetime_spending INTO v_current_spending
  FROM profiles
  WHERE id = p_user_id;
  
  IF v_current_spending IS NULL THEN
    v_current_spending := 0;
  END IF;
  
  -- Calculate projected spending (current + pending order)
  v_projected_spending := v_current_spending + p_pending_amount;
  
  -- Get tier based on PROJECTED spending (not current)
  -- This ensures users crossing tier thresholds get correct cashback
  SELECT t.* INTO v_current_tier
  FROM cashback_tiers t
  WHERE t.is_active = true AND t.min_spending <= v_projected_spending
  ORDER BY t.min_spending DESC
  LIMIT 1;
  
  -- Get next tier based on projected spending
  SELECT t.* INTO v_next_tier
  FROM cashback_tiers t
  WHERE t.is_active = true AND t.min_spending > v_projected_spending
  ORDER BY t.min_spending ASC
  LIMIT 1;
  
  -- Return result with tier based on projected spending
  RETURN QUERY SELECT
    v_current_tier.id,
    v_current_tier.name,
    v_current_tier.cashback_percentage,
    v_current_tier.min_spending,
    v_current_spending,  -- Still return actual current for UI display
    v_next_tier.name,
    v_next_tier.min_spending,
    CASE 
      WHEN v_next_tier.min_spending IS NOT NULL 
      THEN v_next_tier.min_spending - v_projected_spending  -- Calculate remaining based on projected
      ELSE 0::NUMERIC
    END;
END;
$$;