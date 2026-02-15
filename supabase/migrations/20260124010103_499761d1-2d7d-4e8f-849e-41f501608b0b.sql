-- Drop and recreate the admin_user_stats view with additional fields
DROP VIEW IF EXISTS public.admin_user_stats;

CREATE VIEW public.admin_user_stats AS
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.created_at AS registration_date,
  p.is_banned,
  p.cashback_balance,
  p.total_lifetime_spending,
  p.referral_code,
  p.referred_by,
  p.total_referrals,
  p.referral_earnings,
  -- Total spent (all orders)
  COALESCE(SUM(o.total_amount), 0::numeric) AS total_spent,
  -- Paid amount (completed orders only)
  COALESCE(SUM(CASE WHEN o.status = 'completed'::order_status THEN o.total_amount ELSE 0::numeric END), 0::numeric) AS paid_amount,
  -- Total coupon discounts used
  COALESCE(SUM(o.coupon_discount), 0::numeric) AS total_coupon_discount,
  -- Total cashback used
  COALESCE(SUM(o.cashback_used), 0::numeric) AS total_cashback_used,
  -- Total referral discounts received
  COALESCE(SUM(o.referral_discount), 0::numeric) AS total_referral_discount,
  -- Order count
  COUNT(o.id)::integer AS order_count,
  -- Most recent purchase date
  MAX(o.created_at) AS recent_purchase_date,
  -- Most recent order number (subquery)
  (SELECT orders.order_number FROM orders WHERE orders.user_id = p.id ORDER BY orders.created_at DESC LIMIT 1) AS recent_order_number,
  -- Last sign in from auth.users
  (SELECT au.last_sign_in_at FROM auth.users au WHERE au.id = p.id) AS last_sign_in_at
FROM profiles p
LEFT JOIN orders o ON o.user_id = p.id
WHERE has_role(auth.uid(), 'admin'::app_role)
GROUP BY p.id, p.email, p.full_name, p.created_at, p.is_banned, 
         p.cashback_balance, p.total_lifetime_spending, p.referral_code, 
         p.referred_by, p.total_referrals, p.referral_earnings;

-- Update the function to return all new fields
DROP FUNCTION IF EXISTS get_admin_user_stats();

CREATE OR REPLACE FUNCTION get_admin_user_stats()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  registration_date timestamptz,
  is_banned boolean,
  cashback_balance numeric,
  total_lifetime_spending numeric,
  referral_code text,
  referred_by uuid,
  total_referrals integer,
  referral_earnings numeric,
  total_spent numeric,
  paid_amount numeric,
  total_coupon_discount numeric,
  total_cashback_used numeric,
  total_referral_discount numeric,
  order_count integer,
  recent_purchase_date timestamptz,
  recent_order_number text,
  last_sign_in_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    email,
    full_name,
    registration_date,
    is_banned,
    cashback_balance,
    total_lifetime_spending,
    referral_code,
    referred_by,
    total_referrals,
    referral_earnings,
    total_spent,
    paid_amount,
    total_coupon_discount,
    total_cashback_used,
    total_referral_discount,
    order_count,
    recent_purchase_date,
    recent_order_number,
    last_sign_in_at
  FROM public.admin_user_stats
  WHERE has_role(auth.uid(), 'admin'::app_role);
$$;