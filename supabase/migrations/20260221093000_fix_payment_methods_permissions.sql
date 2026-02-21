-- Fix: Grant INSERT, UPDATE, DELETE permissions on payment_methods table
-- RLS policies enforce admin-only access for writes.

GRANT INSERT, UPDATE, DELETE ON public.payment_methods TO authenticated;

-- Keep aligned with existing permission-fix strategy in the project.
GRANT INSERT, UPDATE, DELETE ON public.payment_methods TO anon;

