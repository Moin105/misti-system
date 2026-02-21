-- Fix: Grant INSERT, UPDATE, DELETE permissions on g2g_price_sync table
-- RLS policies will control who can actually perform these operations (only admins)

-- Grant necessary permissions to authenticated role
GRANT INSERT, UPDATE, DELETE ON public.g2g_price_sync TO authenticated;

-- Also grant to anon role (for consistency, though RLS will block non-admins)
GRANT INSERT, UPDATE, DELETE ON public.g2g_price_sync TO anon;

-- Note: SELECT permission might need to be granted if not already present
-- RLS policies will ensure only admins can INSERT/UPDATE/DELETE
