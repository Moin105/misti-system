-- Clean up redundant profile RLS policy
-- Remove the combined policy since we have separate user and admin policies
DROP POLICY IF EXISTS "Users can view own profile or admins can view all" ON public.profiles;