# Fix g2g_price_sync Table Permissions

## Problem
Getting `403 Forbidden` error with `permission denied for table g2g_price_sync` when trying to INSERT, UPDATE, or DELETE.

## Solution

Run these SQL commands in Supabase Dashboard → SQL Editor (in order):

### Step 1: Grant INSERT, UPDATE, DELETE Permissions
```sql
-- Grant INSERT, UPDATE, DELETE permission on g2g_price_sync table
-- RLS policies will control who can actually perform these operations (only admins)

-- Grant necessary permissions to authenticated role
GRANT INSERT, UPDATE, DELETE ON public.g2g_price_sync TO authenticated;

-- Also grant to anon role (for consistency, though RLS will block non-admins)
GRANT INSERT, UPDATE, DELETE ON public.g2g_price_sync TO anon;
```

### Step 2: Fix RLS Policy (Add WITH CHECK clause)
```sql
-- Drop existing "Admins can manage g2g price sync" policy
DROP POLICY IF EXISTS "Admins can manage g2g price sync" ON public.g2g_price_sync;

-- Recreate with both USING and WITH CHECK clauses
CREATE POLICY "Admins can manage g2g price sync"
ON public.g2g_price_sync
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
```

## Why This Fix Works

1. **GRANT Permissions**: PostgreSQL requires explicit GRANT permissions for INSERT, UPDATE, DELETE operations
2. **RLS Policies**: The existing RLS policy was missing `WITH CHECK` clause, which is required for UPDATE/INSERT operations
3. **Defense in Depth**: GRANT permissions allow the operation, RLS policies enforce who can do it (only admins)

## Verify

After running the fix, verify permissions:

```sql
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'g2g_price_sync'
AND grantee IN ('authenticated', 'anon')
ORDER BY grantee, privilege_type;
```

Should return:
- authenticated: INSERT, UPDATE, DELETE (SELECT might also be present)
- anon: INSERT, UPDATE, DELETE (optional)

## RLS Policy Check

Verify the RLS policy exists with WITH CHECK:

```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'g2g_price_sync'
AND policyname LIKE '%admin%';
```

Should show "Admins can manage g2g price sync" policy with both `qual` and `with_check` set.

## Migration Files

The fixes are available as migrations:
- `supabase/migrations/20260220380000_fix_g2g_price_sync_permissions.sql`
- `supabase/migrations/20260220390000_fix_g2g_price_sync_rls_policy.sql`

Run them with:
```bash
supabase db push
```
