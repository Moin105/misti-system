-- Fix: Grant INSERT, UPDATE, DELETE permissions on referral_config table
-- RLS policies still enforce admin-only write access.

GRANT INSERT, UPDATE, DELETE ON public.referral_config TO authenticated;

-- Keep permission pattern consistent with existing project migrations.
GRANT INSERT, UPDATE, DELETE ON public.referral_config TO anon;

