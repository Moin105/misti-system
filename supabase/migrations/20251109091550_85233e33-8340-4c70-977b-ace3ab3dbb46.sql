-- Create inquiry rate limit tracking table
CREATE TABLE IF NOT EXISTS public.inquiry_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient rate limit queries
CREATE INDEX IF NOT EXISTS idx_inquiry_rate_limits_ip_created 
ON public.inquiry_rate_limits(ip_address, created_at);

-- Add cleanup function to remove old rate limit records
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM public.inquiry_rate_limits
  WHERE created_at < now() - interval '2 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- No RLS needed - this table is accessed by edge function with service role key