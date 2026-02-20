# Edge Function Environment Variables Setup

## ⚠️ Important: Use Plain Text Values

The values you showed me are **encrypted/hashed** (they look like SHA-256 hashes). Edge Functions need the **actual plain text values**.

## How to Get the Real Values

### Step 1: Get SUPABASE_ANON_KEY

1. Go to: https://supabase.com/dashboard
2. Select project: `sclvjrnnnbbptnhonoks`
3. Go to: **Settings** → **API**
4. Find **Project API keys**
5. Copy the `anon` `public` key (it starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

**Example format:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjbHZqcm5ubmJicHRuaG9ub2tzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNjk3MjEsImV4cCI6MjA4Njg0NTcyMX0.YK_RfC9JiclVdReaRK05-F1xMvjZtvJKzjrml-AkWbM
```

### Step 2: Get SUPABASE_SERVICE_ROLE_KEY

1. Same page: **Settings** → **API**
2. Find **Project API keys**
3. Copy the `service_role` `secret` key (⚠️ Keep this secret!)
4. It also starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Step 3: Get SUPABASE_URL

1. Same page: **Settings** → **API**
2. Find **Project URL**
3. Copy it: `https://sclvjrnnnbbptnhonoks.supabase.co`

### Step 4: Set in Edge Functions

1. Go to: **Edge Functions** → **Settings** (or **Project Settings** → **Edge Functions**)
2. Add these environment variables with the **plain text values**:

```
SUPABASE_URL=https://sclvjrnnnbbptnhonoks.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjbHZqcm5ubmJicHRuaG9ub2tzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNjk3MjEsImV4cCI6MjA4Njg0NTcyMX0.YK_RfC9JiclVdReaRK05-F1xMvjZtvJKzjrml-AkWbM
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key-here
OPENAI_API_KEY=your-openai-key-here
FIRECRAWL_API_KEY=your-firecrawl-key-here
```

### Step 5: Redeploy Functions

After setting environment variables, redeploy:

```bash
supabase functions deploy generate-product-fields
```

Or use Supabase Dashboard to redeploy each function.

## What Changed in the Function

The function now uses the same authentication pattern as `verify-payment`:
- ✅ Uses service role key for JWT verification
- ✅ Extracts token directly from Authorization header
- ✅ Passes token to `getUser(token)` method

This is more reliable than using anon key with header.

## Testing

After setup, the function should work. If you still get errors:
1. Check function logs in Dashboard → Edge Functions → [Function] → Logs
2. Verify environment variables are set correctly (plain text, not hashes)
3. Make sure you're logged in and have a valid JWT token
