-- Complete database permissions fix for all Edge Functions
-- This fixes "permission denied for schema public" errors

-- 1. Grant EXECUTE on has_role function to service_role
GRANT EXECUTE ON FUNCTION public.has_role(_user_id uuid, _role app_role) TO service_role;

-- 2. Grant EXECUTE on has_role function to authenticated (for frontend checks)
GRANT EXECUTE ON FUNCTION public.has_role(_user_id uuid, _role app_role) TO authenticated;

-- 3. Grant ALL permissions on user_roles table to service_role (bypasses RLS)
GRANT ALL ON public.user_roles TO service_role;

-- 4. Grant USAGE on public schema to service_role
GRANT USAGE ON SCHEMA public TO service_role;

-- 5. Grant SELECT on user_roles to authenticated (for RLS policies)
GRANT SELECT ON public.user_roles TO authenticated;

-- 6. Ensure service_role can access all necessary tables for Edge Functions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 7. Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO service_role;
