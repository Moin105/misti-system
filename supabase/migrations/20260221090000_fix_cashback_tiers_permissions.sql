-- Fix: Grant INSERT, UPDATE, DELETE permissions on cashback_tiers table
-- RLS policies will enforce that only admins can perform these operations.

GRANT INSERT, UPDATE, DELETE ON public.cashback_tiers TO authenticated;

-- Kept consistent with other permission-fix migrations in this project.
GRANT INSERT, UPDATE, DELETE ON public.cashback_tiers TO anon;

