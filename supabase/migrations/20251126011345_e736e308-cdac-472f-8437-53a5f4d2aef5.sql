-- Restrict blog_images bucket uploads to admin users only
-- This prevents any authenticated user from uploading files

-- Drop existing permissive policy
DROP POLICY IF EXISTS "Authenticated users can upload blog images" ON storage.objects;

-- Create new admin-only upload policy
CREATE POLICY "Admin users can upload blog images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'blog_images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Update bucket configuration to restrict allowed MIME types
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'blog_images';