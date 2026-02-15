-- Fix profile visibility - restrict to owner and admins only

-- Drop the overly permissive policy if it exists
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create restrictive policy for users to view only their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Ensure admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));