-- Fix: Explicitly recreate the foreign key constraint between order_items and orders
-- This ensures PostgREST detects the relationship in its schema cache

-- Step 1: Clean up orphaned order_items (if any)
DELETE FROM public.order_items
WHERE order_id NOT IN (
  SELECT id FROM public.orders
);

-- Step 2: Drop existing constraint if it exists
ALTER TABLE public.order_items 
  DROP CONSTRAINT IF EXISTS order_items_order_id_fkey;

-- Step 3: Recreate the foreign key constraint explicitly
ALTER TABLE public.order_items 
  ADD CONSTRAINT order_items_order_id_fkey 
  FOREIGN KEY (order_id) 
  REFERENCES public.orders(id) 
  ON DELETE CASCADE;

-- Verify the constraint exists
-- SELECT 
--   conname AS constraint_name,
--   conrelid::regclass AS table_name,
--   confrelid::regclass AS referenced_table
-- FROM pg_constraint
-- WHERE conname = 'order_items_order_id_fkey';
