# 🚨 URGENT: Fix Edge Function Service Role Key

## Problem
The `SUPABASE_SERVICE_ROLE_KEY` in Edge Functions is set incorrectly - it's either:
- Encrypted/hashed (not the raw key)
- Wrong format
- Missing

## IMMEDIATE FIX (5 Minutes)

### Step 1: Get the CORRECT Service Role Key

1. Go to **Supabase Dashboard** → **Settings** → **API**
2. Find **"service_role"** key (NOT "anon" key)
3. Click **"Reveal"** or **"Copy"** button
4. The key should:
   - Start with `eyJ...` (very long string)
   - Be a JWT token (has 3 parts separated by dots)
   - Look like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjbHZqcm5ubmJicHRuaG9ub2tzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI2OTcyMSwiZXhwIjoyMDg2ODQ1NzIxfQ.XXXXX...`

### Step 2: Delete OLD Secret (if you can't edit it)

1. Go to **Supabase Dashboard** → **Edge Functions** → **Settings** → **Secrets**
2. Find `SUPABASE_SERVICE_ROLE_KEY` (or `SERVICE_ROLE_KEY`)
3. Click **Delete** or **Remove** button
4. If you CAN'T delete it:
   - Try refreshing the page
   - Try a different browser
   - Contact Supabase support if still stuck

### Step 3: Add NEW Secret with CORRECT Value

1. Click **"Add new secret"** or **"Create secret"**
2. **Name:** `SUPABASE_SERVICE_ROLE_KEY`
   - If Supabase rejects this name (says "Name must not start with SUPABASE_"), use: `SERVICE_ROLE_KEY`
3. **Value:** Paste the RAW service_role key from Step 1
   - **CRITICAL:** Paste it EXACTLY as-is
   - Do NOT encrypt it
   - Do NOT hash it
   - Do NOT modify it in any way
   - It should be a very long string starting with `eyJ...`

### Step 4: Update Function Code (if you used SERVICE_ROLE_KEY)

If you had to use `SERVICE_ROLE_KEY` instead of `SUPABASE_SERVICE_ROLE_KEY`:

1. Open `supabase/functions/generate-product-fields/index.ts`
2. Find this line (around line 60):
   ```typescript
   const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
   ```
3. Change it to:
   ```typescript
   const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
   ```
4. Save the file
5. Redeploy:
   ```bash
   supabase functions deploy generate-product-fields
   ```

### Step 5: Verify Other Secrets

Make sure these are also set correctly:

- `SUPABASE_URL` = `https://sclvjrnnnbbptnhonoks.supabase.co`
- `FIRECRAWL_API_KEY` = Your Firecrawl API key (raw value, not encrypted)
- `OPENAI_API_KEY` = Your OpenAI API key (raw value, not encrypted)

### Step 6: Test

1. Wait 30-60 seconds for secrets to propagate
2. Test the function:
   ```bash
   npm run test-generate-product-fields
   ```
3. Or test via frontend: Click "AI Content Rewriter" button

## If You STILL Can't Delete/Edit the Secret

### Option A: Use Different Secret Name

1. Add a NEW secret with name: `SERVICE_ROLE_KEY`
2. Update function code (Step 4 above)
3. Redeploy function
4. The old secret will be ignored

### Option B: Contact Supabase Support

If you absolutely cannot delete/edit secrets:
1. Go to Supabase Dashboard → Support
2. Explain: "Cannot delete/edit Edge Function secrets, need to reset SUPABASE_SERVICE_ROLE_KEY"
3. They can reset it for you

## Verification

After setting the secret, the function should:
- ✅ Show `hasServiceKey: true` in logs
- ✅ Show `role: service_role` in logs
- ✅ Successfully authenticate and check admin role
- ✅ Generate product fields

## Common Mistakes

❌ **WRONG:** Using encrypted/hashed key
❌ **WRONG:** Using anon key instead of service_role key
❌ **WRONG:** Modifying the key in any way
❌ **WRONG:** Using a shortened version

✅ **CORRECT:** Using the RAW service_role key exactly as shown in Dashboard → Settings → API

## Still Stuck?

1. Check function logs: Dashboard → Edge Functions → generate-product-fields → Logs
2. Look for `[CONFIG]` logs to see what key is being read
3. Verify the key format matches what's in Settings → API
