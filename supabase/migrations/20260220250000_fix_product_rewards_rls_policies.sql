-- Fix: Add WITH CHECK clause to product_rewards RLS policies for UPDATE operations
-- PostgreSQL RLS requires WITH CHECK for UPDATE/INSERT operations

-- Drop existing policy
DROP POLICY IF EXISTS "Admins can manage rewards" ON public.product_rewards;

-- Recreate with both USING and WITH CHECK clauses
CREATE POLICY "Admins can manage rewards"
ON public.product_rewards
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Verify policies
-- SELECT policyname, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE schemaname = 'public' AND tablename = 'product_rewards';
