-- Fix profiles table public exposure
-- Restrict SELECT access so users can only view their own profile
-- Admins can view all profiles for management purposes

DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile or admins can view all"
ON public.profiles
FOR SELECT
USING (
  (auth.uid() = id) OR has_role(auth.uid(), 'admin'::app_role)
);