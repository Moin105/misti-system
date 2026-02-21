-- Fix: Explicitly recreate the foreign key constraint between orders and coupons
-- This ensures PostgREST detects the relationship in its schema cache

-- Step 1: Clean up orphaned orders (if any - orders with coupon_id that doesn't exist)
-- Note: We set coupon_id to NULL instead of deleting orders
-- Cast coupon_id to UUID for comparison
UPDATE public.orders
SET coupon_id = NULL, coupon_discount = 0
WHERE coupon_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM public.coupons WHERE coupons.id = orders.coupon_id::uuid
  );

-- Step 2: Drop existing constraint if it exists
ALTER TABLE public.orders 
  DROP CONSTRAINT IF EXISTS orders_coupon_id_fkey;

-- Step 3: Recreate the foreign key constraint explicitly
ALTER TABLE public.orders 
  ADD CONSTRAINT orders_coupon_id_fkey 
  FOREIGN KEY (coupon_id) 
  REFERENCES public.coupons(id);

-- Verify the constraint exists
-- SELECT 
--   conname AS constraint_name,
--   conrelid::regclass AS table_name,
--   confrelid::regclass AS referenced_table
-- FROM pg_constraint
-- WHERE conname = 'orders_coupon_id_fkey';
