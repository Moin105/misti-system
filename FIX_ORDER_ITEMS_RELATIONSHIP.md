# Fix Order Items Relationship

## Problem
PostgREST cannot find the relationship between `orders` and `order_items` tables, causing this error:
```
Could not find a relationship between 'orders' and 'order_items' in the schema cache
```

## Solution

Run this SQL in Supabase Dashboard → SQL Editor:

```sql
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
```

## Why This Fix Works

PostgREST caches the database schema. Sometimes it doesn't detect foreign key relationships even though they exist in the database. By explicitly dropping and recreating the constraint, we force PostgREST to refresh its schema cache and detect the relationship.

## Verify

After running the fix, verify the constraint:

```sql
SELECT 
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE conname = 'order_items_order_id_fkey';
```

Should return:
- constraint_name: `order_items_order_id_fkey`
- table_name: `order_items`
- referenced_table: `orders`

## After Fix

After running the SQL, PostgREST should automatically refresh its schema cache within 1-2 minutes. If it doesn't, you can:
1. Wait 1-2 minutes for automatic refresh
2. Or restart the PostgREST service via Supabase Dashboard → Settings → API → Restart PostgREST
3. Or force refresh via SQL: `NOTIFY pgrst, 'reload schema';`
