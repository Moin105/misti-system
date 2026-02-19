-- Fix: Grant INSERT, UPDATE, DELETE permissions on games table to authenticated role
-- RLS policies will control who can actually perform these operations (only admins)

-- Grant necessary permissions to authenticated role
GRANT INSERT, UPDATE, DELETE ON public.games TO authenticated;

-- Also grant to anon role (for consistency, though RLS will block non-admins)
GRANT INSERT, UPDATE, DELETE ON public.games TO anon;

-- Note: SELECT is already granted (verified in check-games-permissions.ts)
-- RLS policies will ensure only admins can INSERT/UPDATE/DELETE
