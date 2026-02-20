-- Fix: Add missing storage policies for game-images bucket
-- The INSERT, UPDATE, and DELETE policies are missing

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Admins can upload game images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update game images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete game images" ON storage.objects;

-- Create INSERT policy for admins
CREATE POLICY "Admins can upload game images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'game-images'::text AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Create UPDATE policy for admins
CREATE POLICY "Admins can update game images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'game-images'::text AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Create DELETE policy for admins
CREATE POLICY "Admins can delete game images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'game-images'::text AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Ensure SELECT policy exists (for public viewing)
DROP POLICY IF EXISTS "Anyone can view game images" ON storage.objects;
CREATE POLICY "Anyone can view game images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'game-images'::text);
