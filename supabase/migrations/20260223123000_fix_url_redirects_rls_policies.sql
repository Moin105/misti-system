-- Fix url_redirects RLS inconsistencies causing 403 for admin users.
-- Ensures authenticated admins can fully manage redirects.

ALTER TABLE public.url_redirects ENABLE ROW LEVEL SECURITY;

-- Clean up old policies (names vary across environments).
DROP POLICY IF EXISTS "Admins can manage redirects" ON public.url_redirects;
DROP POLICY IF EXISTS "Anyone can read active redirects" ON public.url_redirects;
DROP POLICY IF EXISTS "Authenticated can manage redirects" ON public.url_redirects;

-- Make sure authenticated users can hit table permissions before RLS checks.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.url_redirects TO authenticated;
GRANT SELECT ON public.url_redirects TO anon;

-- Read policy: public can read active redirects (used by frontend redirect checks).
CREATE POLICY "Anyone can read active redirects"
ON public.url_redirects
FOR SELECT
USING (is_active = true);

-- Admin manage policy: explicit EXISTS instead of helper function to avoid env drift.
CREATE POLICY "Admins can manage redirects"
ON public.url_redirects
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::public.app_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::public.app_role
  )
);
