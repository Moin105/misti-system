# Database Permissions Fix for Edge Functions

## Problem
"permission denied for schema public" (Error 42501) - This is a **database permissions issue**, not a secret/key issue.

## Root Cause
The `service_role` database role doesn't have proper permissions to:
1. Execute the `has_role` RPC function
2. Query the `user_roles` table
3. Access the `public` schema

## Solution

### Option 1: Run SQL Directly (FASTEST - 2 minutes)

Go to **Supabase Dashboard → SQL Editor** and run this:

```sql
-- 1. Grant EXECUTE on has_role function to service_role
GRANT EXECUTE ON FUNCTION public.has_role(_user_id uuid, _role app_role) TO service_role;

-- 2. Grant ALL permissions on user_roles table to service_role
GRANT ALL ON public.user_roles TO service_role;

-- 3. Grant USAGE on public schema to service_role
GRANT USAGE ON SCHEMA public TO service_role;

-- 4. Grant SELECT on user_roles to authenticated (for RLS)
GRANT SELECT ON public.user_roles TO authenticated;
```

### Option 2: Run Script (if you have DATABASE_URL)

```bash
npm run fix-db-permissions
```

**Note:** This requires `SUPABASE_DB_URL` or `DATABASE_URL` in your `.env` file.

## Verification

After running the SQL, test:

1. **Test locally:**
   ```bash
   npm run test-service-role-key
   ```
   Should show ✅ for all tests.

2. **Test Edge Function:**
   - Wait 30 seconds
   - Try "AI Content Rewriter" button
   - Should work now!

## Why This Happens

Supabase Edge Functions use the `service_role` database role, which needs explicit permissions to:
- Call RPC functions
- Query tables (even though it bypasses RLS)
- Access schemas

These permissions are **not granted by default** in some Supabase setups.

## Still Getting Errors?

1. **Check function logs:**
   - Dashboard → Edge Functions → generate-product-fields → Logs
   - Look for `[AUTH]` logs

2. **Verify permissions were granted:**
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

3. **If permissions show but still error:**
   - The secret value might still be wrong (hash instead of raw key)
   - Check `SERVICE_ROLE_KEY` secret has RAW JWT token (starts with `eyJ...`)

## Quick Checklist

- [ ] Ran SQL to grant permissions ✅
- [ ] Tested locally: `npm run test-service-role-key` ✅
- [ ] Verified `SERVICE_ROLE_KEY` secret has RAW JWT (not hash) ✅
- [ ] Tested Edge Function: Works ✅
