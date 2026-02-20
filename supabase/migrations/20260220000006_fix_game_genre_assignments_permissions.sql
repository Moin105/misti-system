-- Fix: Grant INSERT, UPDATE, DELETE permissions on game_genre_assignments table
-- RLS policies will control who can actually perform these operations (only admins)

-- Grant necessary permissions to authenticated role
GRANT INSERT, UPDATE, DELETE ON public.game_genre_assignments TO authenticated;

-- Also grant to anon role (for consistency, though RLS will block non-admins)
GRANT INSERT, UPDATE, DELETE ON public.game_genre_assignments TO anon;

-- Note: SELECT is already granted (from migration 20260125235531)
-- RLS policies will ensure only admins can INSERT/UPDATE/DELETE
