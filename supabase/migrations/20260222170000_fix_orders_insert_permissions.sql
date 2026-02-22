-- Ensure checkout can create orders for authenticated users.
-- Fixes: permission denied for table orders (42501)

-- Table privileges required before RLS policies are evaluated.
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT SELECT, INSERT ON public.order_items TO authenticated;

-- Optional guest checkout support (RLS still controls final access).
GRANT INSERT ON public.orders TO anon;
GRANT INSERT ON public.order_items TO anon;

-- Recreate key RLS policies with explicit role targets.
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;

CREATE POLICY "Users can create their own orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own orders"
ON public.orders
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Keep admin manage-all policy intact, but ensure it has WITH CHECK for writes.
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
CREATE POLICY "Admins can manage all orders"
ON public.orders
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
