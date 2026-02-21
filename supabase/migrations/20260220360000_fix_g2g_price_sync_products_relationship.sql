-- Fix: Explicitly recreate foreign key constraint between g2g_price_sync and products
-- PostgREST needs explicit constraints to detect relationships

-- Step 1: Check for orphaned records (g2g_price_sync with product_id that doesn't exist in products)
-- Delete orphaned records first
DELETE FROM public.g2g_price_sync
WHERE product_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM public.products WHERE products.id = g2g_price_sync.product_id
  );

-- Step 2: Drop existing constraint if it exists
ALTER TABLE public.g2g_price_sync 
  DROP CONSTRAINT IF EXISTS g2g_price_sync_product_id_fkey;

-- Step 3: Recreate the foreign key constraint explicitly
ALTER TABLE public.g2g_price_sync 
  ADD CONSTRAINT g2g_price_sync_product_id_fkey 
  FOREIGN KEY (product_id) 
  REFERENCES public.products(id) 
  ON DELETE CASCADE;

-- Note: After running this migration, refresh PostgREST schema cache via Supabase Dashboard
-- or wait a few minutes for automatic refresh
-- 
-- Also run migration 20260220370000_fix_g2g_price_sync_product_options_relationship.sql
-- to fix the product_options relationship