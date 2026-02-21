-- Fix: Add WITH CHECK clause to orders RLS policies for UPDATE operations
-- PostgreSQL RLS requires WITH CHECK for UPDATE/INSERT operations

-- Drop existing "Admins can manage all orders" policy
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;

-- Recreate with both USING and WITH CHECK clauses
CREATE POLICY "Admins can manage all orders"
ON public.orders
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Also fix "Admins can update orders" policy if it exists separately
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;

-- Verify policies
-- SELECT policyname, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE schemaname = 'public' AND tablename = 'orders';
