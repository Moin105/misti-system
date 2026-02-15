-- Add MIME type restrictions to storage buckets for defense-in-depth

-- Restrict work-application-proofs to only allow safe file types
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
WHERE name = 'work-application-proofs';

-- Restrict sitemap bucket to only allow XML files
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['application/xml', 'text/xml']
WHERE name = 'sitemap';

-- Restrict blog_images to only allow images
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
WHERE name = 'blog_images';

-- Restrict game-images to only allow images
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
WHERE name = 'game-images';