-- Fix security view warning: Use security_invoker instead of security_definer
DROP VIEW IF EXISTS public.cashback_tiers_public;

CREATE VIEW public.cashback_tiers_public
WITH (security_invoker = on) AS
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

-- Fix the "Anyone can view active tiers" policy - it was replaced with admin-only, 
-- but we need to restore view access via the safe view only
-- The current policy "Only admins can access cashback_tiers directly" is correct

-- Fix the overly permissive INSERT policies on rate_limits (service role only)
-- These are correct - they're designed for edge functions using service role