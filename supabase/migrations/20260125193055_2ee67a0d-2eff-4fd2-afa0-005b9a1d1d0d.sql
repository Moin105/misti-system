-- Fix misconfigured RLS policies that were missing TO service_role clause
-- These policies were named "Service role can..." but applied to PUBLIC by default

-- 1. Drop misconfigured rate_limits policies
DROP POLICY IF EXISTS "Service role can insert rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Service role can delete rate limits" ON public.rate_limits;

-- 2. Recreate with proper TO service_role restriction
CREATE POLICY "Service role can insert rate limits"
ON public.rate_limits
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can delete rate limits"
ON public.rate_limits
FOR DELETE
TO service_role
USING (true);

-- 3. Fix translations table - drop permissive policy
DROP POLICY IF EXISTS "Service role can manage translations" ON public.translations;

-- 4. Recreate with proper restriction
CREATE POLICY "Service role can manage translations"
ON public.translations
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);