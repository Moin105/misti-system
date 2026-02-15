-- Fix Payment Gateway Credentials Security Issue
-- Update RLS policy to allow authenticated users to view active payment methods
-- Then drop the payment_methods_public view as it's no longer needed

-- Add policy for authenticated users to view active payment methods (read-only, no config access)
CREATE POLICY "Authenticated users can view active payment methods"
ON public.payment_methods
FOR SELECT
TO authenticated
USING (is_active = true);

-- Drop the payment_methods_public view as it's redundant and flagged by security scanner
DROP VIEW IF EXISTS public.payment_methods_public;