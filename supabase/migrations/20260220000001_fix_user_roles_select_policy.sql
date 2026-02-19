-- Fix user_roles SELECT policy to allow users to read their own roles
-- This is critical for admin access checks in the frontend

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

-- Create policy that allows users to view their own roles
-- This is needed for Admin.tsx to check if user has admin role
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Ensure admins can also view all roles (for admin panel)
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Keep the admin management policy (should already exist)
-- CREATE POLICY "Admins can manage roles" already exists

-- Grant SELECT permission to authenticated role (if not already granted)
GRANT SELECT ON public.user_roles TO authenticated;
