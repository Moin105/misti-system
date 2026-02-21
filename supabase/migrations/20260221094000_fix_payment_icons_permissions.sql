-- Fix: Grant INSERT, UPDATE, DELETE permissions on payment_icons table
-- RLS policies remain the source of truth for admin-only write access.

GRANT INSERT, UPDATE, DELETE ON public.payment_icons TO authenticated;

-- Kept consistent with existing permission fix migrations.
GRANT INSERT, UPDATE, DELETE ON public.payment_icons TO anon;

