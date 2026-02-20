-- Fix: Add UNIQUE constraint on deleted_urls.url_path
-- The track_deleted_game() trigger uses ON CONFLICT (url_path) but the constraint was missing

-- First, check if there are any duplicate url_path values and handle them
-- (This will fail if duplicates exist, so we need to clean them first)
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  -- Count duplicates
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT url_path, COUNT(*) as cnt
    FROM public.deleted_urls
    WHERE url_path IS NOT NULL
    GROUP BY url_path
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    -- Delete duplicates, keeping only the first one (by created_at)
    DELETE FROM public.deleted_urls
    WHERE id IN (
      SELECT id
      FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY url_path ORDER BY created_at ASC) as rn
        FROM public.deleted_urls
        WHERE url_path IS NOT NULL
      ) ranked
      WHERE rn > 1
    );
    
    RAISE NOTICE 'Removed % duplicate url_path entries', duplicate_count;
  END IF;
END $$;

-- Add UNIQUE constraint on url_path
-- This will allow ON CONFLICT (url_path) DO NOTHING to work in triggers
ALTER TABLE public.deleted_urls 
  ADD CONSTRAINT deleted_urls_url_path_key UNIQUE (url_path);

-- Also ensure url_path is NOT NULL (as per original migration)
-- But first check if there are NULL values
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count
  FROM public.deleted_urls
  WHERE url_path IS NULL;
  
  IF null_count > 0 THEN
    -- Set NULL values to a unique placeholder (they shouldn't exist, but handle gracefully)
    UPDATE public.deleted_urls
    SET url_path = '/deleted/' || id::text
    WHERE url_path IS NULL;
    
    RAISE NOTICE 'Updated % NULL url_path values', null_count;
  END IF;
END $$;

-- Now make it NOT NULL
ALTER TABLE public.deleted_urls 
  ALTER COLUMN url_path SET NOT NULL;
