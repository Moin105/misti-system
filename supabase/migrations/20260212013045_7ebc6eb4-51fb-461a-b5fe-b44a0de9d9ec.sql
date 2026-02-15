-- Auto-cleanup expired password reset tokens (defense-in-depth)
-- This function purges tokens that are expired or used, reducing exposure window
CREATE OR REPLACE FUNCTION public.cleanup_expired_reset_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.password_reset_tokens
  WHERE expires_at < now() - interval '1 hour'
     OR used_at IS NOT NULL;
END;
$$;

-- Restrict execution to service_role and postgres only
REVOKE ALL ON FUNCTION public.cleanup_expired_reset_tokens() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_expired_reset_tokens() FROM anon;
REVOKE ALL ON FUNCTION public.cleanup_expired_reset_tokens() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_reset_tokens() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_reset_tokens() TO postgres;

-- Run cleanup now to purge any existing expired tokens
SELECT public.cleanup_expired_reset_tokens();