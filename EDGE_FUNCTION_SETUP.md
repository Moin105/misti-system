# Edge Function Setup Guide

## Issue: "Invalid JWT" Error

The Edge Functions are returning `401 Unauthorized` with "Invalid JWT" because the `SUPABASE_ANON_KEY` environment variable is not set in the Edge Function environment.

## Solution: Set Environment Variables

### Step 1: Go to Supabase Dashboard

1. Go to: https://supabase.com/dashboard
2. Select your project: `sclvjrnnnbbptnhonoks`
3. Go to: **Edge Functions** → **Settings** (or **Project Settings** → **Edge Functions**)

### Step 2: Set Required Environment Variables

Add these environment variables for your Edge Functions:

```
SUPABASE_URL=https://sclvjrnnnbbptnhonoks.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjbHZqcm5ubmJicHRuaG9ub2tzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNjk3MjEsImV4cCI6MjA4Njg0NTcyMX0.YK_RfC9JiclVdReaRK05-F1xMvjZtvJKzjrml-AkWbM
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
FIRECRAWL_API_KEY=your-firecrawl-key-here
OPENAI_API_KEY=your-openai-key-here
```

**OR** if you prefer Lovable AI:

```
LOVABLE_API_KEY=your-lovable-key-here
```

### Step 3: Get Your Keys

1. **SUPABASE_ANON_KEY**: 
   - Go to **Settings** → **API**
   - Copy the `anon` `public` key

2. **SUPABASE_SERVICE_ROLE_KEY**:
   - Go to **Settings** → **API**
   - Copy the `service_role` `secret` key (⚠️ Keep this secret!)

3. **OPENAI_API_KEY** or **LOVABLE_API_KEY**:
   - Use your existing API key

4. **FIRECRAWL_API_KEY**:
   - Get from https://firecrawl.dev

### Step 4: Redeploy Functions

After setting environment variables, redeploy the functions:

**Option A: Using Supabase CLI**
```bash
supabase functions deploy generate-product-fields
supabase functions deploy generate-product-rewards
supabase functions deploy generate-product-faqs
supabase functions deploy generate-product-meta-titles
supabase functions deploy generate-game-faqs
```

**Option B: Using Supabase Dashboard**
1. Go to **Edge Functions**
2. Click on each function
3. Click **Deploy** or **Redeploy**

## Updated Functions

The following functions have been updated to:
- ✅ Support both OpenAI and Lovable AI
- ✅ Use anon key for JWT verification (proper authentication)
- ✅ Use service role key for database operations
- ✅ Better error messages

- `generate-product-fields`
- `generate-product-rewards`
- `generate-product-faqs`
- `generate-product-meta-titles`
- `generate-game-faqs`

## Testing

After setup, test the function:

```bash
curl -X POST https://sclvjrnnnbbptnhonoks.supabase.co/functions/v1/generate-product-fields \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sourceUrl":"https://example.com","gameId":"...","categoryId":"...","productType":"simple"}'
```

## Troubleshooting

### Still getting "Invalid JWT"?

1. **Check environment variables are set**: Go to Dashboard → Edge Functions → Settings
2. **Check JWT token is valid**: Make sure you're logged in and the token hasn't expired
3. **Check function logs**: Go to Dashboard → Edge Functions → [Function Name] → Logs
4. **Redeploy function**: Sometimes environment variables need a redeploy to take effect

### "AI provider not configured" error?

- Set either `OPENAI_API_KEY` or `LOVABLE_API_KEY` in Edge Function environment variables
- The function will automatically use whichever is available (OpenAI takes priority)
