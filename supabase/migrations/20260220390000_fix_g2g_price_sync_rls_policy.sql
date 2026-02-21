-- Fix: Add WITH CHECK clause to g2g_price_sync RLS policies for UPDATE/INSERT operations
-- PostgreSQL RLS requires WITH CHECK for UPDATE/INSERT operations

-- Drop existing "Admins can manage g2g price sync" policy
DROP POLICY IF EXISTS "Admins can manage g2g price sync" ON public.g2g_price_sync;

-- Recreate with both USING and WITH CHECK clauses
CREATE POLICY "Admins can manage g2g price sync"
ON public.g2g_price_sync
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
