# Fix Product Options Relationship

## Problem
1. PostgREST cannot find the relationship between `products` and `product_options` tables
2. There are orphaned `product_options` records with `product_id` values that don't exist in `products` table

## Solution

Run this SQL in Supabase Dashboard → SQL Editor (in order):

### Step 1: Check for orphaned records (optional - just to see what will be deleted)
```sql
SELECT po.id, po.product_id, po.name, po.label
FROM public.product_options po
WHERE po.product_id NOT IN (
  SELECT id FROM public.products
);
```

### Step 2: Delete orphaned product_options and recreate constraint
```sql
-- Delete orphaned product_options that reference non-existent products
DELETE FROM public.product_options
WHERE product_id NOT IN (
  SELECT id FROM public.products
);

-- Drop existing constraint if it exists
ALTER TABLE public.product_options 
  DROP CONSTRAINT IF EXISTS product_options_product_id_fkey;

-- Recreate the foreign key constraint explicitly
ALTER TABLE public.product_options 
  ADD CONSTRAINT product_options_product_id_fkey 
  FOREIGN KEY (product_id) 
  REFERENCES public.products(id) 
  ON DELETE CASCADE;
```

## Why This Fix Works

1. **Orphaned Data**: Some `product_options` records reference products that have been deleted. These need to be cleaned up first.
2. **PostgREST Cache**: By explicitly dropping and recreating the constraint, we force PostgREST to refresh its schema cache and detect the relationship.

## Verify

After running the fix, verify:
1. No orphaned records:
```sql
SELECT COUNT(*) 
FROM public.product_options po
WHERE po.product_id NOT IN (SELECT id FROM public.products);
-- Should return 0
```

2. Constraint exists:
```sql
SELECT 
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE conname = 'product_options_product_id_fkey';
```

Should return:
- constraint_name: `product_options_product_id_fkey`
- table_name: `product_options`
- referenced_table: `products`

## After Fix

PostgREST should automatically refresh its schema cache within 1-2 minutes. If it doesn't, restart PostgREST via Supabase Dashboard → Settings → API → Restart PostgREST.
