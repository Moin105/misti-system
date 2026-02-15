-- Fix Payment Gateway Credentials Exposure
-- Restrict access to payment_methods_public view using GRANT/REVOKE
-- Since this is a view, we cannot use RLS policies, so we use database permissions instead

-- Revoke all public access from the view
REVOKE ALL ON public.payment_methods_public FROM anon;
REVOKE ALL ON public.payment_methods_public FROM public;

-- Grant SELECT only to authenticated users
GRANT SELECT ON public.payment_methods_public TO authenticated;

-- Add comment explaining the security model
COMMENT ON VIEW public.payment_methods_public IS 'Public view of payment methods without sensitive configuration data. Only authenticated users can view payment methods to prevent enumeration attacks and unauthorized access.';