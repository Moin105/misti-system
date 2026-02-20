# Fix Product Options Permissions

## Problem
Getting `403 Forbidden` error with `permission denied for table product_options` when trying to INSERT/UPDATE/DELETE.

## Solution

Run these SQL commands in Supabase Dashboard → SQL Editor (in order):

### Step 1: Grant Permissions
```sql
-- Grant INSERT, UPDATE, DELETE permissions on product_options table
-- RLS policies will control who can actually perform these operations (only admins)

-- Grant necessary permissions to authenticated role
GRANT INSERT, UPDATE, DELETE ON public.product_options TO authenticated;

-- Also grant to anon role (for consistency, though RLS will block non-admins)
GRANT INSERT, UPDATE, DELETE ON public.product_options TO anon;
```

### Step 2: Fix RLS Policy (Add WITH CHECK clause)
```sql
-- Drop existing policy
DROP POLICY IF EXISTS "Admins can manage product options" ON public.product_options;

-- Recreate with both USING and WITH CHECK clauses
CREATE POLICY "Admins can manage product options"
ON public.product_options
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
```

## Why This Fix Works

1. **GRANT Permissions**: PostgreSQL requires explicit GRANT permissions for INSERT/UPDATE/DELETE operations
2. **RLS Policies**: The existing RLS policy "Admins can manage product options" will ensure only admins can actually perform these operations
3. **Defense in Depth**: GRANT permissions allow the operation, RLS policies enforce who can do it

## Verify

After running the fix, verify permissions:

```sql
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'product_options'
AND grantee IN ('authenticated', 'anon')
ORDER BY grantee, privilege_type;
```

Should return:
- authenticated: INSERT, SELECT, UPDATE, DELETE
- anon: INSERT, SELECT, UPDATE, DELETE

## RLS Policy Check

Verify the RLS policy exists:

```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'product_options';
```

Should show "Admins can manage product options" policy with `FOR ALL` command.
