# Fix Product FAQs Table Permissions

## Problem
Getting `403 Forbidden` error with `permission denied for table product_faqs` when trying to UPDATE or DELETE product FAQs.

## Solution

Run these SQL commands in Supabase Dashboard → SQL Editor (in order):

### Step 1: Grant UPDATE and DELETE Permissions
```sql
-- Grant INSERT, UPDATE, DELETE permission on product_faqs table
-- RLS policies will control who can actually perform these operations (only admins)

-- Grant necessary permissions to authenticated role
GRANT INSERT, UPDATE, DELETE ON public.product_faqs TO authenticated;

-- Also grant to anon role (for consistency, though RLS will block non-admins)
GRANT INSERT, UPDATE, DELETE ON public.product_faqs TO anon;
```

### Step 2: Fix RLS Policy (Add WITH CHECK clause)
```sql
-- Drop existing "Admins can manage product FAQs" policy
DROP POLICY IF EXISTS "Admins can manage product FAQs" ON public.product_faqs;

-- Recreate with both USING and WITH CHECK clauses
CREATE POLICY "Admins can manage product FAQs"
ON public.product_faqs
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
```

## Why This Fix Works

1. **GRANT Permissions**: PostgreSQL requires explicit GRANT permissions for UPDATE and DELETE operations
2. **RLS Policies**: The existing RLS policy was missing `WITH CHECK` clause, which is required for UPDATE/INSERT operations
3. **Defense in Depth**: GRANT permissions allow the operation, RLS policies enforce who can do it

## Verify

After running the fix, verify permissions:

```sql
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'product_faqs'
AND grantee IN ('authenticated', 'anon')
ORDER BY grantee, privilege_type;
```

Should return:
- authenticated: INSERT, SELECT, UPDATE, DELETE
- anon: INSERT, SELECT, UPDATE, DELETE (optional)

## RLS Policy Check

Verify the RLS policy exists with WITH CHECK:

```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'product_faqs'
AND policyname LIKE '%admin%';
```

Should show "Admins can manage product FAQs" policy with both `qual` and `with_check` set.

## Related Fixes

- `product_faqs.id` default value was fixed in migration `20260220240000_fix_product_faqs_id_default.sql`
- This completes the product_faqs table setup for admin operations
