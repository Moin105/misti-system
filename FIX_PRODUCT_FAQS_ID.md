# Fix product_faqs.id Default Value

## Problem
The `product_faqs` table's `id` column is missing a default value, causing INSERT failures with error:
```
null value in column "id" of relation "product_faqs" violates not-null constraint
```

## Solution

Run this SQL in Supabase Dashboard → SQL Editor:

```sql
-- Fix: Set default value for product_faqs.id column to gen_random_uuid()
ALTER TABLE public.product_faqs 
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
```

## Verify

After running the fix, verify the default is set:

```sql
SELECT column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'product_faqs' 
AND column_name = 'id';
```

Should return: `gen_random_uuid()`

## Alternative: Run via Script

If you have `SUPABASE_DB_URL` in your `.env` file:

```bash
npm run fix-product-faqs-id
```
