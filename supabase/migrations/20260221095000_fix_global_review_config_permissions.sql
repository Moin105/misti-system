-- Fix: Grant INSERT, UPDATE, DELETE permissions on global_review_config table
-- RLS policies continue to enforce admin-only write access.

GRANT INSERT, UPDATE, DELETE ON public.global_review_config TO authenticated;

-- Keep aligned with existing project permission-fix pattern.
GRANT INSERT, UPDATE, DELETE ON public.global_review_config TO anon;

