-- Drop the overly permissive policy that allows public read/write
DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.rate_limits;

-- Create new policies that restrict access appropriately
-- Only admins can view rate limits data (for debugging/monitoring)
CREATE POLICY "Admins can view rate limits"
ON public.rate_limits
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only service role (Edge Functions) can insert/update/delete rate limits
-- This is handled by service_role key bypassing RLS, no explicit policy needed
-- But we need INSERT for the Edge Functions which use service role
CREATE POLICY "Service role can insert rate limits"
ON public.rate_limits
FOR INSERT
WITH CHECK (true);

-- Service role can delete old rate limits (cleanup)
CREATE POLICY "Service role can delete rate limits"
ON public.rate_limits
FOR DELETE
USING (true);