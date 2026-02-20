# Edge Function Troubleshooting Guide

## Current Issue: "permission denied for schema public" (Error 42501)

This error indicates that `SUPABASE_SERVICE_ROLE_KEY` is either:
1. **Not set** in Edge Function environment variables
2. **Set incorrectly** (wrong value or wrong name)
3. **Missing permissions** in the database

## Step-by-Step Fix

### Step 1: Verify Service Role Key in Local .env

1. Check your `.env` file has:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

2. Get the key from: **Supabase Dashboard → Settings → API → service_role key**

### Step 2: Set Edge Function Secrets

**CRITICAL:** Edge Functions need secrets set in the Dashboard, not just in `.env`!

1. Go to **Supabase Dashboard → Edge Functions → Settings → Secrets**
2. Check if `SUPABASE_SERVICE_ROLE_KEY` exists
3. If not, click **"Add new secret"**:
   - **Name:** `SUPABASE_SERVICE_ROLE_KEY` (try this first)
   - **Value:** Paste your service role key from Step 1
   - Click **"Save"**

4. **If Supabase rejects the name** (says "Name must not start with SUPABASE_"), use:
   - **Name:** `SERVICE_ROLE_KEY`
   - Then we'll need to update the function code to use this name

### Step 3: Verify All Required Secrets

Make sure these secrets are set:
- ✅ `SUPABASE_URL` = `https://sclvjrnnnbbptnhonoks.supabase.co`
- ✅ `SUPABASE_SERVICE_ROLE_KEY` = Your service role key
- ✅ `FIRECRAWL_API_KEY` = Your Firecrawl API key
- ✅ `OPENAI_API_KEY` = Your OpenAI API key

### Step 4: Grant Database Permissions

Run this SQL in **Supabase Dashboard → SQL Editor**:

```sql
-- Grant EXECUTE permission on has_role function to service_role
GRANT EXECUTE ON FUNCTION public.has_role(_user_id uuid, _role app_role) TO service_role;

-- Grant service_role full access to user_roles table
GRANT ALL ON public.user_roles TO service_role;
```

### Step 5: Redeploy Function (if you changed secret names)

If you had to use `SERVICE_ROLE_KEY` instead of `SUPABASE_SERVICE_ROLE_KEY`, update the function:

```typescript
// In supabase/functions/generate-product-fields/index.ts
const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY'); // Changed from SUPABASE_SERVICE_ROLE_KEY
```

Then redeploy:
```bash
supabase functions deploy generate-product-fields
```

### Step 6: Test the Function

1. **Wait 30 seconds** after setting secrets (they need to propagate)
2. **Test via frontend:** Click "AI Content Rewriter" button in admin panel
3. **Or test via script:**
   ```bash
   npm run test-generate-product-fields
   ```

### Step 7: Check Logs

1. Go to **Supabase Dashboard → Edge Functions → generate-product-fields → Logs**
2. Look for:
   - `[CONFIG]` logs showing `hasServiceKey: true`
   - `[AUTH]` logs showing authentication steps
   - Any error messages

## Common Issues

### Issue: "Name must not start with SUPABASE_"
**Solution:** Use `SERVICE_ROLE_KEY` as the secret name, then update function code to match.

### Issue: Still getting permission errors after setting secrets
**Solutions:**
1. Wait 1-2 minutes for secrets to propagate
2. Redeploy the function: `supabase functions deploy generate-product-fields`
3. Verify the key is correct (should start with `eyJ...` and be very long)
4. Check database permissions (Step 4)

### Issue: No logs appearing in Dashboard
**Solutions:**
1. Make sure the function is actually being called (check frontend network tab)
2. Logs may take a few minutes to appear
3. Try invoking the function again

## Verification Checklist

- [ ] Service role key exists in `.env` file
- [ ] Service role key is set in Edge Function secrets
- [ ] All required secrets are set (SUPABASE_URL, FIRECRAWL_API_KEY, OPENAI_API_KEY)
- [ ] Database permissions granted (has_role function)
- [ ] Function redeployed after secret changes
- [ ] Tested function and checked logs

## Still Having Issues?

1. Check function logs in Dashboard
2. Verify service role key format (should be a JWT token)
3. Test with the script: `npm run test-generate-product-fields`
4. Check if user has admin role in `user_roles` table
