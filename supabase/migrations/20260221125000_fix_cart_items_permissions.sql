-- Ensure cart CRUD works for authenticated users and admins.

-- Table grants (required before RLS policies are evaluated)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;

-- Recreate cart policies to avoid policy drift/conflicts.
DROP POLICY IF EXISTS "Users can view their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can insert their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can update their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can delete their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can manage own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Admins can manage all cart items" ON public.cart_items;

CREATE POLICY "Users can view their own cart items"
ON public.cart_items
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own cart items"
ON public.cart_items
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update their own cart items"
ON public.cart_items
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete their own cart items"
ON public.cart_items
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
