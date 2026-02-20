-- Fix: Clean up orphaned product_options and recreate foreign key constraint
-- This ensures PostgREST detects the relationship in its schema cache

-- Step 1: Find and report orphaned product_options
-- (This is just for information, we'll delete them in the next step)

-- Step 2: Delete orphaned product_options that reference non-existent products
DELETE FROM public.product_options
WHERE product_id NOT IN (
  SELECT id FROM public.products
);

-- Step 3: Drop existing constraint if it exists
ALTER TABLE public.product_options 
  DROP CONSTRAINT IF EXISTS product_options_product_id_fkey;

-- Step 4: Recreate the foreign key constraint explicitly
ALTER TABLE public.product_options 
  ADD CONSTRAINT product_options_product_id_fkey 
  FOREIGN KEY (product_id) 
  REFERENCES public.products(id) 
  ON DELETE CASCADE;

-- Verify the constraint exists
-- SELECT 
--   conname AS constraint_name,
--   conrelid::regclass AS table_name,
--   confrelid::regclass AS referenced_table
-- FROM pg_constraint
-- WHERE conname = 'product_options_product_id_fkey';
