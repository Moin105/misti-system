-- Create dedicated bucket for work application proofs (public read, restricted upload)
INSERT INTO storage.buckets (id, name, public)
VALUES ('work-application-proofs', 'work-application-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can view work application proofs" ON storage.objects;
DROP POLICY IF EXISTS "Rate limited uploads for work applications" ON storage.objects;

-- Allow public read access for work application proofs
CREATE POLICY "Public can view work application proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'work-application-proofs');

-- Allow uploads only through service role (edge function will handle this)
-- No direct public upload policy - all uploads go through edge function