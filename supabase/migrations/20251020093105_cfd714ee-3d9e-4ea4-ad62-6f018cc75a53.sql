-- Add defense-in-depth admin check to admin_user_stats view
-- This adds an additional security layer beyond the function-level check

DROP VIEW IF EXISTS public.admin_user_stats;

CREATE VIEW public.admin_user_stats AS
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.created_at as registration_date,
  p.is_banned,
  COALESCE(SUM(o.total_amount), 0) as total_spent,
  COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.total_amount ELSE 0 END), 0) as paid_amount,
  MAX(o.created_at) as recent_purchase_date,
  (
    SELECT order_number 
    FROM orders 
    WHERE user_id = p.id 
    ORDER BY created_at DESC 
    LIMIT 1
  ) as recent_order_number
FROM profiles p
LEFT JOIN orders o ON o.user_id = p.id
WHERE has_role(auth.uid(), 'admin'::app_role)  -- Defense in depth: admin check in view
GROUP BY p.id, p.email, p.full_name, p.created_at, p.is_banned;

-- Maintain security settings
ALTER VIEW admin_user_stats SET (security_barrier = true);
REVOKE ALL ON admin_user_stats FROM PUBLIC;
REVOKE ALL ON admin_user_stats FROM authenticated;