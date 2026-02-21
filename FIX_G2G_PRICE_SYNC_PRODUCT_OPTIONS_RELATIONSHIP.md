# Fix g2g_price_sync and product_options Relationship

## Problem
Getting `400 Bad Request` error with `Could not find a relationship between 'g2g_price_sync' and 'product_options' in the schema cache` when trying to query `g2g_price_sync` with `product_options` join.

## Solution

Run these SQL commands in Supabase Dashboard → SQL Editor (in order):

### Step 1: Check Column Type
```sql
-- Check if product_option_id is TEXT or UUID
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'g2g_price_sync' 
  AND column_name = 'product_option_id';
```

### Step 2: Convert TEXT to UUID (if needed)
```sql
-- Convert product_option_id from TEXT to UUID (handles empty strings and NULL)
ALTER TABLE public.g2g_price_sync 
  ALTER COLUMN product_option_id TYPE UUID 
  USING CASE 
    WHEN product_option_id::text = '' OR product_option_id IS NULL THEN NULL
    ELSE product_option_id::uuid
  END;
```

**Note:** If Step 1 shows `data_type` is already `uuid`, skip Step 2 and go directly to Step 3.

### Step 3: Clean Up Orphaned Records
```sql
-- Delete orphaned records (g2g_price_sync with product_option_id that doesn't exist)
DELETE FROM public.g2g_price_sync
WHERE product_option_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM public.product_options WHERE product_options.id = g2g_price_sync.product_option_id
  );
```

### Step 4: Recreate Foreign Key Constraint
```sql
-- Drop existing constraint if it exists
ALTER TABLE public.g2g_price_sync 
  DROP CONSTRAINT IF EXISTS g2g_price_sync_product_option_id_fkey;

-- Recreate the foreign key constraint explicitly
ALTER TABLE public.g2g_price_sync 
  ADD CONSTRAINT g2g_price_sync_product_option_id_fkey 
  FOREIGN KEY (product_option_id) 
  REFERENCES public.product_options(id) 
  ON DELETE CASCADE;
```

## Why This Fix Works

1. **Orphaned Records**: First, we clean up any `g2g_price_sync` records that reference non-existent product options
2. **Explicit Constraint**: Dropping and recreating the constraint forces PostgREST to detect the relationship
3. **ON DELETE CASCADE**: Ensures that when a product option is deleted, related sync configs are also deleted

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
LEFT JOIN product_options ON g2g_price_sync.product_option_id = product_options.id
WHERE g2g_price_sync.product_option_id IS NOT NULL;
```

Or via PostgREST:
```
GET /rest/v1/g2g_price_sync?select=*,product_options(id,label)
```

## Complete Fix

To fix both relationships (`products` and `product_options`), run both migrations:

1. **First**: `20260220360000_fix_g2g_price_sync_products_relationship.sql`
2. **Then**: `20260220370000_fix_g2g_price_sync_product_options_relationship.sql`

Or run both SQL scripts in the Supabase Dashboard SQL Editor.

## Migration File

The fix is also available as a migration:
- `supabase/migrations/20260220370000_fix_g2g_price_sync_product_options_relationship.sql`

Run it with:
```bash
supabase db push
```
