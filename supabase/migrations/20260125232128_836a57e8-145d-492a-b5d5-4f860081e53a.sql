-- Fix get_user_tier RPC function to properly handle NULL RECORD access
-- This fixes the bug where users with valid tiers (>= $99 spending) couldn't see their cashback progress

CREATE OR REPLACE FUNCTION public.get_user_tier(p_user_id uuid, p_pending_amount numeric DEFAULT 0)
RETURNS TABLE(
  tier_id uuid, 
  tier_name text, 
  tier_percentage numeric, 
  min_spending numeric, 
  current_spending numeric, 
  next_tier_name text, 
  next_tier_min_spending numeric, 
  spending_to_next_tier numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_current_spending NUMERIC;
  v_projected_spending NUMERIC;
  -- Use explicit variables instead of RECORD to avoid NULL access issues
  v_current_tier_id uuid;
  v_current_tier_name text;
  v_current_tier_percentage numeric;
  v_current_tier_min_spending numeric;
  v_next_tier_name text;
  v_next_tier_min_spending numeric;
BEGIN
  -- SECURITY: Only allow users to query their own tier data (or admins)
  IF p_user_id != auth.uid() AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Cannot access other users tier information';
  END IF;

  -- Log access attempt for audit
  PERFORM log_security_event(
    'get_user_tier_access',
    auth.uid(),
    jsonb_build_object('requested_user_id', p_user_id, 'pending_amount', p_pending_amount)
  );

  -- Get user's current total spending
  SELECT total_lifetime_spending INTO v_current_spending
  FROM profiles
  WHERE id = p_user_id;
  
  IF v_current_spending IS NULL THEN
    v_current_spending := 0;
  END IF;
  
  -- Calculate projected spending (current + pending order)
  v_projected_spending := v_current_spending + p_pending_amount;
  
  -- Get current tier based on PROJECTED spending (using explicit variables)
  SELECT t.id, t.name, t.cashback_percentage, t.min_spending
  INTO v_current_tier_id, v_current_tier_name, v_current_tier_percentage, v_current_tier_min_spending
  FROM cashback_tiers t
  WHERE t.is_active = true AND t.min_spending <= v_projected_spending
  ORDER BY t.min_spending DESC
  LIMIT 1;
  
  -- CRITICAL FIX: Check if current tier was found using explicit variable
  IF v_current_tier_id IS NULL THEN
    -- User hasn't reached any tier yet - return empty result
    RETURN;
  END IF;
  
  -- Get next tier based on projected spending
  SELECT t.name, t.min_spending
  INTO v_next_tier_name, v_next_tier_min_spending
  FROM cashback_tiers t
  WHERE t.is_active = true AND t.min_spending > v_projected_spending
  ORDER BY t.min_spending ASC
  LIMIT 1;
  
  -- Return result with proper NULL handling
  RETURN QUERY SELECT
    v_current_tier_id,
    v_current_tier_name,
    v_current_tier_percentage,
    v_current_tier_min_spending,
    v_current_spending,
    v_next_tier_name,  -- Will be NULL if no next tier exists
    v_next_tier_min_spending,  -- Will be NULL if no next tier exists
    CASE 
      WHEN v_next_tier_min_spending IS NOT NULL 
      THEN v_next_tier_min_spending - v_projected_spending
      ELSE 0::NUMERIC
    END;
END;
$function$;