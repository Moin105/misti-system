-- Drop and recreate the get_user_tier function with proper column qualification
DROP FUNCTION IF EXISTS public.get_user_tier(UUID);

CREATE OR REPLACE FUNCTION public.get_user_tier(p_user_id UUID)
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
  v_current_tier RECORD;
  v_next_tier RECORD;
BEGIN
  -- Get user's total spending
  SELECT total_lifetime_spending INTO v_current_spending
  FROM profiles
  WHERE id = p_user_id;
  
  IF v_current_spending IS NULL THEN
    v_current_spending := 0;
  END IF;
  
  -- Get current tier (using table alias to avoid ambiguity)
  SELECT t.* INTO v_current_tier
  FROM cashback_tiers t
  WHERE t.is_active = true AND t.min_spending <= v_current_spending
  ORDER BY t.min_spending DESC
  LIMIT 1;
  
  -- Get next tier (using table alias to avoid ambiguity)
  SELECT t.* INTO v_next_tier
  FROM cashback_tiers t
  WHERE t.is_active = true AND t.min_spending > v_current_spending
  ORDER BY t.min_spending ASC
  LIMIT 1;
  
  -- Return result with explicit column references
  RETURN QUERY SELECT
    v_current_tier.id,
    v_current_tier.name,
    v_current_tier.cashback_percentage,
    v_current_tier.min_spending,
    v_current_spending,
    v_next_tier.name,
    v_next_tier.min_spending,
    CASE 
      WHEN v_next_tier.min_spending IS NOT NULL 
      THEN v_next_tier.min_spending - v_current_spending
      ELSE 0::NUMERIC
    END;
END;
$$;