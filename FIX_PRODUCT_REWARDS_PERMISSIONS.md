# Fix product_rewards Table Permissions

## Problem
"permission denied for table product_rewards" (Error 42501) when trying to UPDATE/PATCH

## Solution: Run SQL in Supabase Dashboard

### Step 1: Go to SQL Editor
**Supabase Dashboard → SQL Editor → New Query**

### Step 2: Run This SQL

```sql
-- Fix: Grant INSERT, UPDATE, DELETE permissions on product_rewards table
-- RLS policies will control who can actually perform these operations (only admins)

-- Grant necessary permissions to authenticated role
GRANT INSERT, UPDATE, DELETE ON public.product_rewards TO authenticated;

-- Also grant to anon role (for consistency, though RLS will block non-admins)
GRANT INSERT, UPDATE, DELETE ON public.product_rewards TO anon;

-- Fix: Set default value for product_rewards.id column (if not already set)
ALTER TABLE public.product_rewards 
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
```

### Step 3: Verify Permissions

Run this to check if permissions were granted:

```sql
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'product_rewards'
AND grantee IN ('authenticated', 'anon');
```

You should see:
- `SELECT` permission
- `INSERT` permission
- `UPDATE` permission
- `DELETE` permission

### Step 4: Test

1. Wait 10 seconds
2. Try to update a product_rewards record in admin panel
3. Ab kaam karna chahiye ✅

## Why This Works

PostgREST requires explicit GRANT permissions before RLS policies can be evaluated. Even though the RLS policy says "Admins can manage rewards", PostgREST won't allow the operation without the GRANT permission first.
