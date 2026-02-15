-- Fix payment_methods security issue
-- Step 1: Restrict direct access to payment_methods table to admins only
DROP POLICY IF EXISTS "Anyone can view active payment methods" ON public.payment_methods;

CREATE POLICY "Only admins can view payment methods"
ON public.payment_methods
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Step 2: Create a safe public view that exposes only non-sensitive payment method info
CREATE OR REPLACE VIEW public.payment_methods_public AS
SELECT 
  id,
  name,
  type,
  is_active,
  created_at,
  updated_at
FROM public.payment_methods
WHERE is_active = true;

-- Step 3: Grant access to the public view
GRANT SELECT ON public.payment_methods_public TO authenticated;
GRANT SELECT ON public.payment_methods_public TO anon;