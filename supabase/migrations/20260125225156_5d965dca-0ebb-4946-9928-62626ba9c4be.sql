
-- Enable RLS on password_failed_verification_attempts table
-- The policies already exist, we just need to enable RLS
ALTER TABLE public.password_failed_verification_attempts ENABLE ROW LEVEL SECURITY;
