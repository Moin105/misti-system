-- Add banned status to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned boolean DEFAULT false;

-- Create RLS policy for admins to update banned status
CREATE POLICY "Admins can update user banned status"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create a view for admin user management (includes order statistics)
CREATE OR REPLACE VIEW public.admin_user_stats AS
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.created_at as registration_date,
  p.is_banned,
  COALESCE(SUM(CASE WHEN o.status IN ('completed', 'processing') THEN o.total_amount ELSE 0 END), 0) as total_spent,
  COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.total_amount ELSE 0 END), 0) as paid_amount,
  MAX(o.created_at) as recent_purchase_date,
  (SELECT order_number FROM orders WHERE user_id = p.id ORDER BY created_at DESC LIMIT 1) as recent_order_number
FROM public.profiles p
LEFT JOIN public.orders o ON p.id = o.user_id
GROUP BY p.id, p.email, p.full_name, p.created_at, p.is_banned;

-- Grant access to the view for authenticated users with admin role
GRANT SELECT ON public.admin_user_stats TO authenticated;