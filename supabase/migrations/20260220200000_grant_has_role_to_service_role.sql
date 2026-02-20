-- Grant EXECUTE permission on has_role function to service_role
-- This is needed for Edge Functions to check admin roles

GRANT EXECUTE ON FUNCTION public.has_role(_user_id uuid, _role app_role) TO service_role;

-- Also ensure authenticated can call it (for frontend checks)
GRANT EXECUTE ON FUNCTION public.has_role(_user_id uuid, _role app_role) TO authenticated;

-- Grant service_role full access to user_roles table (bypasses RLS)
GRANT ALL ON public.user_roles TO service_role;
