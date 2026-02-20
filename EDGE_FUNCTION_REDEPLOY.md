# Edge Function Redeploy Required

## Issue

The `generate-product-fields` Edge Function is still returning `401 Unauthorized` even though the code has been fixed.

## Root Cause

The function code has been updated locally, but **it needs to be redeployed to Supabase** for the changes to take effect.

## Solution: Redeploy Functions

### Option 1: Using Supabase CLI (Recommended)

```bash
# Make sure you're in the project root
cd C:\Users\hp\misti-launchpad

# Deploy the function
supabase functions deploy generate-product-fields

# Also deploy other updated functions
supabase functions deploy generate-product-rewards
supabase functions deploy generate-product-faqs
supabase functions deploy generate-product-meta-titles
supabase functions deploy generate-game-faqs
```

### Option 2: Using Supabase Dashboard

1. Go to: https://supabase.com/dashboard
2. Select your project: `sclvjrnnnbbptnhonoks`
3. Go to: **Edge Functions**
4. Find `generate-product-fields`
5. Click **Deploy** or **Redeploy**
6. Repeat for other functions if needed

## Verify Environment Variables

Before redeploying, make sure these environment variables are set in Supabase Dashboard:

1. Go to: **Edge Functions** → **Settings** (or **Project Settings** → **Edge Functions**)
2. Verify these are set with **plain text values** (not hashes):
   - `SUPABASE_URL=https://sclvjrnnnbbptnhonoks.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key`
   - `OPENAI_API_KEY=your-openai-key` (or `LOVABLE_API_KEY`)
   - `FIRECRAWL_API_KEY=your-firecrawl-key`

## After Redeploy

1. Wait 1-2 minutes for deployment to complete
2. Test the function again
3. Check function logs if errors persist: **Edge Functions** → **[Function Name]** → **Logs**

## Code Changes Made

The function now:
- ✅ Uses service role key for JWT verification (same pattern as `verify-payment`)
- ✅ Extracts token directly from Authorization header
- ✅ Passes token to `getUser(token)` method
- ✅ Supports both OpenAI and Lovable AI

## Troubleshooting

If you still get 401 errors after redeploy:

1. **Check function logs** for detailed error messages
2. **Verify environment variables** are set correctly (plain text, not hashes)
3. **Check JWT token** - make sure you're logged in and token hasn't expired
4. **Clear browser cache** and try again
