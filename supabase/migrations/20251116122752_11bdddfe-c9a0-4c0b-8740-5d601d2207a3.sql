-- Create rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON rate_limits(identifier, endpoint, created_at);

-- Enable RLS
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow edge functions to manage rate limits
CREATE POLICY "Service role can manage rate limits"
  ON rate_limits
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Auto-cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM rate_limits WHERE created_at < now() - interval '24 hours';
END;
$$;

-- Update chat_integration table to store configuration instead of scripts
ALTER TABLE chat_integration DROP COLUMN IF EXISTS script_code;
ALTER TABLE chat_integration ADD COLUMN IF NOT EXISTS widget_id TEXT;
ALTER TABLE chat_integration ADD COLUMN IF NOT EXISTS property_id TEXT;
ALTER TABLE chat_integration ADD COLUMN IF NOT EXISTS sri_hash TEXT;