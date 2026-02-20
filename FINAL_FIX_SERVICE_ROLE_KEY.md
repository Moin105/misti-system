# 🚨 FINAL FIX: Service Role Key Issue

## Problem
Your secrets are showing as **SHA256 hashes** (digests), not raw values. Edge Functions need the **RAW JWT token**, not a hash.

## Root Cause
The secrets in Edge Functions are stored as **hashed/encrypted values**, but the function needs the **actual JWT token** to authenticate.

## Solution (2 Steps)

### Step 1: Get the RAW Service Role Key

1. Go to **Supabase Dashboard** → **Settings** → **API**
2. Find **"service_role"** key (NOT "anon")
3. Click **"Reveal"** or **"Copy"**
4. The key should:
   - Start with `eyJ...`
   - Be VERY long (hundreds of characters)
   - Have 3 parts separated by dots (JWT format)
   - Look like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjbHZqcm5ubmJicHRuaG9ub2tzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI2OTcyMSwiZXhwIjoyMDg2ODQ1NzIxfQ.XXXXX...`

### Step 2: Update Edge Function Secret

**CRITICAL:** You need to set the **RAW key**, not a hash!

1. Go to **Supabase Dashboard** → **Edge Functions** → **Settings** → **Secrets**
2. Find `SERVICE_ROLE_KEY` (or create new if it doesn't exist)
3. Click **Edit** or **Update**
4. **Delete the current value** (the hash/digest)
5. **Paste the RAW key** from Step 1 (the full JWT token starting with `eyJ...`)
6. Click **Save**

**IMPORTANT:** 
- The value should be the **full JWT token**, not a hash
- It should be **hundreds of characters long**
- It should start with `eyJ...`

### Step 3: Grant Database Permissions

Run this SQL in **Supabase Dashboard** → **SQL Editor**:

```sql
-- Grant EXECUTE permission on has_role function to service_role
GRANT EXECUTE ON FUNCTION public.has_role(_user_id uuid, _role app_role) TO service_role;

-- Grant service_role full access to user_roles table
GRANT ALL ON public.user_roles TO service_role;
```

### Step 4: Test Locally First

Before testing the Edge Function, verify your key works:

```bash
npm run test-service-role-key
```

This will:
- ✅ Verify the key format
- ✅ Test database queries
- ✅ Test has_role RPC function
- ✅ Show any permission errors

### Step 5: Test Edge Function

1. Wait 30 seconds after updating the secret
2. Test the function via frontend or:
   ```bash
   npm run test-generate-product-fields
   ```

## Verification Checklist

- [ ] Got RAW service_role key from Dashboard → Settings → API
- [ ] Key starts with `eyJ...` and is very long
- [ ] Updated `SERVICE_ROLE_KEY` secret with RAW value (not hash)
- [ ] Ran database permission SQL
- [ ] Tested locally: `npm run test-service-role-key` ✅
- [ ] Tested Edge Function: Works ✅

## Why This Happens

Supabase Dashboard shows secrets as **SHA256 digests** for security (so you can't see the actual values). However:
- The **actual stored value** should be the raw key
- If you **pasted a hash** instead of the raw key, it won't work
- Edge Functions need the **raw JWT token** to authenticate

## Still Not Working?

1. **Verify key format:**
   ```bash
   npm run test-service-role-key
   ```
   This will show if the key is correct.

2. **Check function logs:**
   - Dashboard → Edge Functions → generate-product-fields → Logs
   - Look for `[CONFIG]` logs showing key details

3. **Double-check secret value:**
   - The secret value should be the **exact same** as in `.env` file
   - Both should be the raw JWT token

4. **Contact Supabase Support:**
   - If you absolutely cannot set raw values
   - They can help reset the secrets
