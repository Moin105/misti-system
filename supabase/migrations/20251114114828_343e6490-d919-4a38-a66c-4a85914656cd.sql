-- Add admin SELECT policy to inquiry_rate_limits table
-- This allows admins to monitor rate limiting effectiveness and abuse patterns
CREATE POLICY "Admins can view rate limits"
ON public.inquiry_rate_limits
FOR SELECT
USING (has_role(auth.uid(), 'admin'));