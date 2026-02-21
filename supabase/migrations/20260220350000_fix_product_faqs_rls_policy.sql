-- Fix: Add WITH CHECK clause to product_faqs RLS policies for UPDATE/INSERT operations
-- PostgreSQL RLS requires WITH CHECK for UPDATE/INSERT operations

-- Drop existing "Admins can manage product FAQs" policy
DROP POLICY IF EXISTS "Admins can manage product FAQs" ON public.product_faqs;

-- Recreate with both USING and WITH CHECK clauses
CREATE POLICY "Admins can manage product FAQs"
ON public.product_faqs
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Note: "Anyone can view active product FAQs" policy remains unchanged (SELECT only)
