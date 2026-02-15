-- =====================================================
-- PROFILES TABLE SECURITY HARDENING
-- Defense-in-depth: Revoke anon access + Strict RLS
-- =====================================================

-- Phase 1: Revoke ALL privileges from anon role (defense in depth)
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.profiles FROM PUBLIC;

-- Grant necessary privileges only to authenticated role
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- Phase 2: Drop existing policies to recreate with stricter definitions
DROP POLICY IF EXISTS "Users can create own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can only view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update user banned status" ON public.profiles;

-- Phase 3: Create strict RLS policies with explicit role targeting

-- 1. SELECT: Users can only view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- 2. SELECT: Admins can view all profiles (uses security definer function)
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. INSERT: Only allow inserting own profile (for trigger-based creation)
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 4. UPDATE: Users can update their own profile (limited to own record)
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 5. UPDATE: Admins can update any profile (for banning, etc.)
CREATE POLICY "Admins can update any profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 6. DELETE: Block all deletes by users (profiles should never be deleted)
-- Service role can still delete if needed for GDPR compliance
CREATE POLICY "No user can delete profiles"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (false);