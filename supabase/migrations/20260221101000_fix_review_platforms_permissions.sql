-- Fix: Grant INSERT, UPDATE, DELETE permissions on review_platforms table
-- RLS policies continue to enforce admin-only write access.

GRANT INSERT, UPDATE, DELETE ON public.review_platforms TO authenticated;

-- Keep consistent with permission-fix approach used across the project.
GRANT INSERT, UPDATE, DELETE ON public.review_platforms TO anon;

