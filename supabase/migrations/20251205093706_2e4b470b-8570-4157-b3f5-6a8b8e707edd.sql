-- Fix blog_images storage bucket policies - restrict UPDATE and DELETE to admins only

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can update their own blog images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own blog images" ON storage.objects;

-- Create admin-only UPDATE policy for blog_images
CREATE POLICY "Admins can update blog images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'blog_images' AND
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Create admin-only DELETE policy for blog_images
CREATE POLICY "Admins can delete blog images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'blog_images' AND
  public.has_role(auth.uid(), 'admin'::public.app_role)
);