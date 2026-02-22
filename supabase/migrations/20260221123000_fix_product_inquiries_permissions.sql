-- Ensure "Contact Support" works for guests/users and inquiry management works for admins.

-- Table-level grants required before RLS policies are evaluated.
GRANT SELECT ON public.contact_info TO anon, authenticated;
GRANT INSERT ON public.product_inquiries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_inquiries TO authenticated;

-- Recreate policies with explicit role targets for clarity and consistency.
DROP POLICY IF EXISTS "Users can create inquiries" ON public.product_inquiries;
DROP POLICY IF EXISTS "Users can view own inquiries" ON public.product_inquiries;
DROP POLICY IF EXISTS "Admins can manage all inquiries" ON public.product_inquiries;

CREATE POLICY "Users can create inquiries"
ON public.product_inquiries
AS PERMISSIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Users can view own inquiries"
ON public.product_inquiries
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all inquiries"
ON public.product_inquiries
AS PERMISSIVE
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
