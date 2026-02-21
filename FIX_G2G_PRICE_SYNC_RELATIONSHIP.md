# Fix g2g_price_sync and products Relationship

## Problem
Getting `400 Bad Request` error with `Could not find a relationship between 'g2g_price_sync' and 'products' in the schema cache` when trying to query `g2g_price_sync` with `products` join.

## Solution

Run this SQL in Supabase Dashboard → SQL Editor:

```sql
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
```

## Why This Fix Works

1. **Orphaned Records**: First, we clean up any `g2g_price_sync` records that reference non-existent products
2. **Explicit Constraint**: Dropping and recreating the constraint forces PostgREST to detect the relationship
3. **ON DELETE CASCADE**: Ensures that when a product is deleted, related sync configs are also deleted

## Refresh PostgREST Schema Cache

After running the SQL, you need to refresh PostgREST's schema cache:

### Option 1: Via Supabase Dashboard (Recommended)
1. Go to **Database** → **Replication**
2. Click **Refresh** or wait a few minutes for automatic refresh

### Option 2: Wait
PostgREST automatically refreshes its schema cache every few minutes, so you can just wait.

## Verify

After running the fix and refreshing the cache, test the query:

```sql
-- This should work now
SELECT * FROM g2g_price_sync 
INNER JOIN products ON g2g_price_sync.product_id = products.id;
```

Or via PostgREST:
```
GET /rest/v1/g2g_price_sync?select=*,products(id,name)
```

## Related Constraints

The `g2g_price_sync` table also has a foreign key to `product_options`:
- `g2g_price_sync_product_option_id_fkey` → `product_options(id)`

If you encounter similar issues with `product_options`, use the same approach.

## Migration File

The fix is also available as a migration:
- `supabase/migrations/20260220360000_fix_g2g_price_sync_products_relationship.sql`

Run it with:
```bash
supabase db push
```
