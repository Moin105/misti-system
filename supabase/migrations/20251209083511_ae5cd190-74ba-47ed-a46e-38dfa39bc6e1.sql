-- Create storage bucket for sitemap
INSERT INTO storage.buckets (id, name, public)
VALUES ('sitemap', 'sitemap', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read sitemap files
CREATE POLICY "Anyone can read sitemap files"
ON storage.objects FOR SELECT
USING (bucket_id = 'sitemap');

-- Only admins can upload/update sitemap files
CREATE POLICY "Admins can upload sitemap files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'sitemap' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update sitemap files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'sitemap' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete sitemap files"
ON storage.objects FOR DELETE
USING (bucket_id = 'sitemap' AND has_role(auth.uid(), 'admin'::app_role));