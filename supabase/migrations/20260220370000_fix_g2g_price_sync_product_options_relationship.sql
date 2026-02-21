-- Fix: Explicitly recreate foreign key constraint between g2g_price_sync and product_options
-- PostgREST needs explicit constraints to detect relationships

-- Step 1: Check column type of product_option_id
-- If it's TEXT, we need to convert it to UUID first
-- Run this to check: SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'g2g_price_sync' AND column_name = 'product_option_id';

-- Step 2: Convert product_option_id from TEXT to UUID if needed
-- This handles empty strings and NULL values during conversion
ALTER TABLE public.g2g_price_sync 
  ALTER COLUMN product_option_id TYPE UUID 
  USING CASE 
    WHEN product_option_id::text = '' OR product_option_id IS NULL THEN NULL
    ELSE product_option_id::uuid
  END;

-- Step 3: Check for orphaned records (g2g_price_sync with product_option_id that doesn't exist in product_options)
-- Delete orphaned records first (only where product_option_id is NOT NULL)
DELETE FROM public.g2g_price_sync
WHERE product_option_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM public.product_options WHERE product_options.id = g2g_price_sync.product_option_id
  );

-- Step 4: Drop existing constraint if it exists
ALTER TABLE public.g2g_price_sync 
  DROP CONSTRAINT IF EXISTS g2g_price_sync_product_option_id_fkey;

-- Step 5: Recreate the foreign key constraint explicitly
ALTER TABLE public.g2g_price_sync 
  ADD CONSTRAINT g2g_price_sync_product_option_id_fkey 
  FOREIGN KEY (product_option_id) 
  REFERENCES public.product_options(id) 
  ON DELETE CASCADE;

-- Note: After running this migration, refresh PostgREST schema cache via Supabase Dashboard
-- or wait a few minutes for automatic refresh
