-- Fix: Grant INSERT, UPDATE, DELETE permissions on product_guarantees table
-- RLS policies continue to enforce admin-only writes.

GRANT INSERT, UPDATE, DELETE ON public.product_guarantees TO authenticated;

-- Keep consistent with permission-fix strategy across the project.
GRANT INSERT, UPDATE, DELETE ON public.product_guarantees TO anon;

