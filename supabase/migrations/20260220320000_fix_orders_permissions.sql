-- Fix: Grant UPDATE permission on orders table
-- RLS policies will control who can actually perform these operations (only admins)

-- Grant necessary permissions to authenticated role
GRANT UPDATE ON public.orders TO authenticated;

-- Also grant to anon role (for consistency, though RLS will block non-admins)
GRANT UPDATE ON public.orders TO anon;

-- Note: SELECT and INSERT are already granted (from migration 20260125235531)
-- RLS policies will ensure only admins can UPDATE
