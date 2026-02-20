-- Fix: Update storage policies to use fully qualified has_role function
-- Storage context might need explicit schema qualification

-- Drop and recreate INSERT policy with explicit schema
DROP POLICY IF EXISTS "Admins can upload game images" ON storage.objects;

CREATE POLICY "Admins can upload game images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'game-images'::text AND
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Drop and recreate UPDATE policy with explicit schema
DROP POLICY IF EXISTS "Admins can update game images" ON storage.objects;

CREATE POLICY "Admins can update game images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'game-images'::text AND
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Drop and recreate DELETE policy with explicit schema
DROP POLICY IF EXISTS "Admins can delete game images" ON storage.objects;

CREATE POLICY "Admins can delete game images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'game-images'::text AND
  public.has_role(auth.uid(), 'admin'::public.app_role)
);
