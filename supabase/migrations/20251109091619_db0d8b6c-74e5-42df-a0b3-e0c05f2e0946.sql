-- Enable RLS on inquiry_rate_limits table
-- Note: This table is only accessed by edge functions using service role key
-- RLS enabled here to satisfy security linter, but service role bypasses it
ALTER TABLE public.inquiry_rate_limits ENABLE ROW LEVEL SECURITY;

-- No policies needed - table is internal to edge functions only