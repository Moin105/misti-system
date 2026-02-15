-- Fix 1: Secure get_user_tier function - add authorization check
CREATE OR REPLACE FUNCTION public.get_user_tier(p_user_id uuid, p_pending_amount numeric DEFAULT 0)
 RETURNS TABLE(tier_id uuid, tier_name text, tier_percentage numeric, min_spending numeric, current_spending numeric, next_tier_name text, next_tier_min_spending numeric, spending_to_next_tier numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_spending NUMERIC;
  v_projected_spending NUMERIC;
  v_current_tier RECORD;
  v_next_tier RECORD;
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
  
  -- Get tier based on PROJECTED spending (not current)
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
  
  -- Return result - NOTE: tier_id is returned but frontend should not expose it
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
      THEN v_next_tier.min_spending - v_projected_spending
      ELSE 0::NUMERIC
    END;
END;
$function$;

-- Fix 2: Create a safe public view for tier information (hides IDs and exact thresholds)
CREATE OR REPLACE VIEW public.cashback_tiers_public AS
SELECT 
  name as tier_name,
  cashback_percentage,
  sort_order
FROM cashback_tiers
WHERE is_active = true
ORDER BY sort_order;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.cashback_tiers_public TO authenticated;
GRANT SELECT ON public.cashback_tiers_public TO anon;

-- Fix 3: Add RLS policy to restrict direct cashback_tiers access to admins only
DROP POLICY IF EXISTS "Anyone can view active tiers" ON public.cashback_tiers;
DROP POLICY IF EXISTS "Public can view active cashback tiers" ON public.cashback_tiers;

CREATE POLICY "Only admins can access cashback_tiers directly"
ON public.cashback_tiers
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix 4: Secure profiles table - ensure users can only read their own spending data
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;

CREATE POLICY "Users can only view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Ensure admin can view all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix 5: Secure cashback_transactions - users can only see their own
DROP POLICY IF EXISTS "Users can view own cashback transactions" ON public.cashback_transactions;
CREATE POLICY "Users can only view their own cashback transactions"
ON public.cashback_transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));