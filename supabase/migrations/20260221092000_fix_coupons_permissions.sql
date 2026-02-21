-- Fix: Grant INSERT, UPDATE, DELETE permissions on coupons table
-- RLS policies continue to enforce admin-only write access.

GRANT INSERT, UPDATE, DELETE ON public.coupons TO authenticated;

-- Keep consistent with project-wide permission fix pattern.
GRANT INSERT, UPDATE, DELETE ON public.coupons TO anon;

