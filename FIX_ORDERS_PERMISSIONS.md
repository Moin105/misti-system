# Fix Orders Table Permissions

## Problem
Getting `403 Forbidden` error with `permission denied for table orders` when trying to UPDATE orders.

## Solution

Run these SQL commands in Supabase Dashboard → SQL Editor (in order):

### Step 1: Grant UPDATE Permissions
```sql
-- Grant UPDATE permission on orders table
-- RLS policies will control who can actually perform these operations (only admins)

-- Grant necessary permissions to authenticated role
GRANT UPDATE ON public.orders TO authenticated;

-- Also grant to anon role (for consistency, though RLS will block non-admins)
GRANT UPDATE ON public.orders TO anon;
```

### Step 2: Fix RLS Policy (Add WITH CHECK clause)
```sql
-- Drop existing "Admins can manage all orders" policy
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;

-- Recreate with both USING and WITH CHECK clauses
CREATE POLICY "Admins can manage all orders"
ON public.orders
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Also fix "Admins can update orders" policy if it exists separately
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
```

## Why This Fix Works

1. **GRANT Permissions**: PostgreSQL requires explicit GRANT permissions for UPDATE operations
2. **RLS Policies**: The existing RLS policy was missing `WITH CHECK` clause, which is required for UPDATE operations
3. **Defense in Depth**: GRANT permissions allow the operation, RLS policies enforce who can do it

## Verify

After running the fix, verify permissions:

```sql
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'orders'
AND grantee IN ('authenticated', 'anon')
ORDER BY grantee, privilege_type;
```

Should return:
- authenticated: INSERT, SELECT, UPDATE
- anon: INSERT, SELECT, UPDATE (optional)

## RLS Policy Check

Verify the RLS policy exists with WITH CHECK:

```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'orders'
AND policyname LIKE '%admin%';
```

Should show "Admins can manage all orders" policy with both `qual` and `with_check` set.
