-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

-- Create a new policy that allows users to view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Keep the admin management policy
-- The "Admins can manage roles" policy already exists and is correct