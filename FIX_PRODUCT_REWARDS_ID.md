# Fix product_rewards.id Default Value

## Problem
"null value in column \"id\" of relation \"product_rewards\" violates not-null constraint"

## Solution: Run SQL in Supabase Dashboard

### Step 1: Go to SQL Editor
**Supabase Dashboard → SQL Editor → New Query**

### Step 2: Run This SQL

```sql
-- Fix: Set default value for product_rewards.id column to gen_random_uuid()
ALTER TABLE public.product_rewards 
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
```

### Step 3: Verify

Run this to check if default is set:

```sql
SELECT column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'product_rewards' 
AND column_name = 'id';
```

Should return: `gen_random_uuid()`

### Step 4: Test

1. Wait 10 seconds
2. Test `generate-product-rewards` function again
3. Ab kaam karna chahiye ✅
