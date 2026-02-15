-- Fix the cashback_tiers_public view to use security_definer
-- This allows the view to execute with owner privileges, bypassing RLS
DROP VIEW IF EXISTS public.cashback_tiers_public;

CREATE VIEW public.cashback_tiers_public
WITH (security_invoker = off) AS
SELECT 
  id,
  name as tier_name,
  min_spending,
  cashback_percentage,
  sort_order
FROM cashback_tiers
WHERE is_active = true
ORDER BY sort_order;

-- Grant SELECT to anon and authenticated users
GRANT SELECT ON public.cashback_tiers_public TO anon, authenticated;