# Fix Orders Coupons Relationship

## Problem
PostgREST cannot find the relationship between `orders` and `coupons` tables, causing this error:
```
Could not find a relationship between 'orders' and 'coupons' in the schema cache
```

## Solution

Run this SQL in Supabase Dashboard → SQL Editor:

```sql
-- Step 1: Clean up orphaned orders (set coupon_id to NULL if coupon doesn't exist)
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
```

## Why This Fix Works

1. **Orphaned Data**: Some orders might reference coupons that have been deleted. We set `coupon_id` to NULL instead of deleting orders.
2. **PostgREST Cache**: By explicitly dropping and recreating the constraint, we force PostgREST to refresh its schema cache and detect the relationship.

## Verify

After running the fix, verify the constraint:

```sql
SELECT 
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE conname = 'orders_coupon_id_fkey';
```

Should return:
- constraint_name: `orders_coupon_id_fkey`
- table_name: `orders`
- referenced_table: `coupons`

## After Fix

After running the SQL, PostgREST should automatically refresh its schema cache within 1-2 minutes. If it doesn't, you can:
1. Wait 1-2 minutes for automatic refresh
2. Or restart the PostgREST service via Supabase Dashboard → Settings → API → Restart PostgREST
3. Or force refresh via SQL: `NOTIFY pgrst, 'reload schema';`
