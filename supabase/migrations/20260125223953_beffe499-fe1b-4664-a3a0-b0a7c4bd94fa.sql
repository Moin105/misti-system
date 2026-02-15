-- Update the public view to include min_spending for the Cashback page
DROP VIEW IF EXISTS public.cashback_tiers_public;

CREATE VIEW public.cashback_tiers_public
WITH (security_invoker = on) AS
SELECT 
  gen_random_uuid() as id, -- Generate a display ID, not the real one
  name as tier_name,
  min_spending,
  cashback_percentage,
  sort_order
FROM cashback_tiers
WHERE is_active = true
ORDER BY sort_order;

-- Ensure both anon and authenticated roles can access
GRANT SELECT ON public.cashback_tiers_public TO anon;
GRANT SELECT ON public.cashback_tiers_public TO authenticated;