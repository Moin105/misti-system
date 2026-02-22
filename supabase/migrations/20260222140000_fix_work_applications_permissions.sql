-- Ensure work application submissions are allowed for both anonymous and authenticated users,
-- while keeping admin-only read/update/delete access.

-- Table-level privileges (required in addition to RLS policies)
GRANT INSERT ON public.work_applications TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.work_applications TO authenticated;

-- Recreate RLS policies explicitly with role targets
DROP POLICY IF EXISTS "Anyone can submit applications" ON public.work_applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON public.work_applications;
DROP POLICY IF EXISTS "Admins can update applications" ON public.work_applications;
DROP POLICY IF EXISTS "Admins can delete applications" ON public.work_applications;

CREATE POLICY "Anyone can submit applications"
ON public.work_applications
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view all applications"
ON public.work_applications
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update applications"
ON public.work_applications
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete applications"
ON public.work_applications
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
