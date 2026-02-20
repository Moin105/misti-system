# Fix Database Permissions for All Edge Functions

## Problem
All Edge Functions (`generate-product-fields`, `generate-product-rewards`, etc.) are getting "permission denied for schema public" errors.

## Solution: Run SQL in Supabase Dashboard

### Step 1: Go to SQL Editor
**Supabase Dashboard → SQL Editor → New Query**

### Step 2: Run This SQL

Copy and paste this complete SQL:

```sql
-- Complete database permissions fix for all Edge Functions
-- This fixes "permission denied for schema public" errors

-- 1. Grant EXECUTE on has_role function to service_role
GRANT EXECUTE ON FUNCTION public.has_role(_user_id uuid, _role app_role) TO service_role;

-- 2. Grant EXECUTE on has_role function to authenticated (for frontend checks)
GRANT EXECUTE ON FUNCTION public.has_role(_user_id uuid, _role app_role) TO authenticated;

-- 3. Grant ALL permissions on user_roles table to service_role (bypasses RLS)
GRANT ALL ON public.user_roles TO service_role;

-- 4. Grant USAGE on public schema to service_role
GRANT USAGE ON SCHEMA public TO service_role;

-- 5. Grant SELECT on user_roles to authenticated (for RLS policies)
GRANT SELECT ON public.user_roles TO authenticated;

-- 6. Ensure service_role can access all necessary tables for Edge Functions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 7. Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO service_role;
```

### Step 3: Click "Run" or Press Ctrl+Enter

### Step 4: Verify Permissions

Run this to check if permissions were granted:

```sql
-- Check has_role function permissions
SELECT grantee, privilege_type 
FROM information_schema.routine_privileges 
WHERE routine_schema = 'public' 
AND routine_name = 'has_role'
AND grantee = 'service_role';

-- Check user_roles table permissions
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'user_roles'
AND grantee = 'service_role';
```

You should see:
- `EXECUTE` permission on `has_role` function
- `SELECT`, `INSERT`, `UPDATE`, `DELETE` permissions on `user_roles` table

### Step 5: Test Edge Functions

1. Wait 10 seconds
2. Test `generate-product-fields` - should work ✅
3. Test `generate-product-rewards` - should work ✅
4. Test any other Edge Functions - should work ✅

## Why This Works

Edge Functions use the `service_role` database role, which needs explicit permissions to:
- Execute RPC functions (like `has_role`)
- Query tables (even though it bypasses RLS)
- Access schemas
- Use sequences (for auto-increment IDs)

These permissions are **not granted by default** in some Supabase setups.

## Quick Checklist

- [ ] Ran SQL in Supabase Dashboard ✅
- [ ] Verified permissions with check query ✅
- [ ] Tested `generate-product-fields` - Works ✅
- [ ] Tested `generate-product-rewards` - Works ✅

## Still Getting Errors?

1. **Check function logs:**
   - Dashboard → Edge Functions → [function-name] → Logs
   - Look for `[AUTH]` logs showing permission errors

2. **Verify SERVICE_ROLE_KEY secret:**
   - Dashboard → Edge Functions → Settings → Secrets
   - Should have `SERVICE_ROLE_KEY` with RAW JWT token (starts with `eyJ...`)

3. **Re-run the SQL:**
   - Sometimes permissions need to be re-applied
   - Run the SQL again
