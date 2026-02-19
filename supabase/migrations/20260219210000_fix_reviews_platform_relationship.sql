-- =====================================================
-- FIX REVIEWS TO REVIEW_PLATFORMS RELATIONSHIP
-- PostgREST needs explicit foreign key relationship
-- =====================================================

-- Drop existing constraint if it exists (to refresh it)
ALTER TABLE public.reviews 
DROP CONSTRAINT IF EXISTS reviews_platform_id_fkey;

-- Recreate the foreign key constraint with explicit naming
-- This ensures PostgREST can detect the relationship
ALTER TABLE public.reviews
ADD CONSTRAINT reviews_platform_id_fkey 
FOREIGN KEY (platform_id) 
REFERENCES public.review_platforms(id) 
ON DELETE CASCADE;

-- Add comment to help PostgREST understand the relationship
COMMENT ON CONSTRAINT reviews_platform_id_fkey ON public.reviews IS 
'Foreign key relationship: reviews.platform_id -> review_platforms.id';

-- Verify the constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'reviews_platform_id_fkey'
    AND conrelid = 'public.reviews'::regclass
  ) THEN
    RAISE EXCEPTION 'Failed to create foreign key constraint';
  END IF;
END $$;

-- Note: After this migration, you may need to refresh PostgREST schema cache
-- via Supabase Dashboard: Settings → API → Reload Schema
-- OR restart PostgREST service
