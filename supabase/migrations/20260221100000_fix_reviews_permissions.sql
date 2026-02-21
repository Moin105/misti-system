-- Fix: Grant INSERT, UPDATE, DELETE permissions on reviews table
-- RLS policies still control admin-only writes.

GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;

-- Keep consistent with other permission fix migrations in this project.
GRANT INSERT, UPDATE, DELETE ON public.reviews TO anon;

