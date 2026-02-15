
-- Fix the security definer view issue by replacing the view with a SECURITY DEFINER function
-- This is the proper pattern for exposing data that bypasses RLS securely

-- 1. Drop the problematic view
DROP VIEW IF EXISTS public.cashback_tiers_public;

-- 2. Create a SECURITY DEFINER function to safely expose cashback tier data
-- This function is explicitly designed for public access and only exposes safe data
CREATE OR REPLACE FUNCTION public.get_public_cashback_tiers()
RETURNS TABLE (
  tier_name text,
  min_spending numeric,
  cashback_percentage numeric,
  sort_order integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    name as tier_name,
    min_spending,
    cashback_percentage,
    sort_order
  FROM cashback_tiers
  WHERE is_active = true
  ORDER BY sort_order;
$$;

-- 3. Grant execute permissions to all roles (this is intentionally public data)
GRANT EXECUTE ON FUNCTION public.get_public_cashback_tiers() TO anon, authenticated;

-- 4. Add RLS policies to password_reset_tokens table (Supabase flagged it as having no policies)
-- These tokens are managed by service_role only through edge functions
CREATE POLICY "Service role can manage password reset tokens"
ON public.password_reset_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Deny all access from anon and authenticated
CREATE POLICY "No public access to password reset tokens"
ON public.password_reset_tokens
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

-- 5. Add RLS policies to password_failed_verification_attempts table
-- This is accessed only by the auth hook function
CREATE POLICY "Service role can manage verification attempts"
ON public.password_failed_verification_attempts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "No public access to verification attempts"
ON public.password_failed_verification_attempts
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);
