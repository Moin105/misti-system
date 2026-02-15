-- Create storage bucket for game images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'game-images',
  'game-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
);

-- Allow public to view game images
CREATE POLICY "Anyone can view game images"
ON storage.objects FOR SELECT
USING (bucket_id = 'game-images');

-- Allow admins to upload game images
CREATE POLICY "Admins can upload game images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'game-images' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to update game images
CREATE POLICY "Admins can update game images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'game-images' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to delete game images
CREATE POLICY "Admins can delete game images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'game-images' AND
  has_role(auth.uid(), 'admin'::app_role)
);