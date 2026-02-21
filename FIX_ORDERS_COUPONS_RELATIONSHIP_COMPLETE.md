# Fix Orders Coupons Relationship - Complete Guide

## Problem
1. PostgREST cannot find the relationship between `orders` and `coupons` tables
2. `orders.coupon_id` column might be TEXT type instead of UUID

## Solution

Run these SQL commands in Supabase Dashboard → SQL Editor (in order):

### Step 1: Check column type
```sql
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'orders' 
  AND column_name = 'coupon_id';
```

### Step 2: If column is TEXT, convert to UUID first
```sql
-- Only run this if coupon_id is TEXT type
ALTER TABLE public.orders 
  ALTER COLUMN coupon_id TYPE UUID 
  USING CASE 
    WHEN coupon_id::text = '' OR coupon_id IS NULL THEN NULL
    ELSE coupon_id::uuid
  END;
```

### Step 3: Clean up orphaned orders
```sql
-- Set coupon_id to NULL if coupon doesn't exist
UPDATE public.orders
SET coupon_id = NULL, coupon_discount = 0
WHERE coupon_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM public.coupons WHERE coupons.id = orders.coupon_id
  );
```

### Step 4: Drop and recreate constraint
```sql
-- Drop existing constraint if it exists
ALTER TABLE public.orders 
  DROP CONSTRAINT IF EXISTS orders_coupon_id_fkey;

-- Recreate the foreign key constraint explicitly
ALTER TABLE public.orders 
  ADD CONSTRAINT orders_coupon_id_fkey 
  FOREIGN KEY (coupon_id) 
  REFERENCES public.coupons(id);
```

## Alternative: Skip cleanup if column is already UUID

If `coupon_id` is already UUID type, you can skip Step 2 and Step 3, and just run Step 4.

## Verify

After running the fix, verify:
1. Column type is UUID:
```sql
SELECT data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'orders' 
  AND column_name = 'coupon_id';
-- Should return: uuid
```

2. Constraint exists:
```sql
SELECT 
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE conname = 'orders_coupon_id_fkey';
```

## After Fix

PostgREST should automatically refresh its schema cache within 1-2 minutes. If it doesn't, restart PostgREST via Supabase Dashboard → Settings → API → Restart PostgREST.
