# OpenAI API Key Fix - Quota Exceeded Error

## Problem
Getting **429 Too Many Requests** / **"You exceeded your current quota"** error from OpenAI API.

## Root Causes

1. **OpenAI key not set correctly** in Edge Functions
2. **OpenAI account has no credits/quota**
3. **Key is invalid/expired**
4. **Rate limit hit** (too many requests)

## Solution

### Step 1: Verify OpenAI Key in Edge Functions

1. Go to **Supabase Dashboard** → **Edge Functions** → **Settings** → **Secrets**
2. Check if `OPENAI_API_KEY` exists
3. Verify the value is the **RAW key** (starts with `sk-...`), not a hash

### Step 2: Update OPENAI_API_KEY Secret

1. Get your OpenAI key:
   - Go to **OpenAI Dashboard** → **API Keys**
   - Copy the key (starts with `sk-...`)

2. Update Edge Function secret:
   - **Name:** `OPENAI_API_KEY`
   - **Value:** Paste the RAW key (full key starting with `sk-...`)
   - **Important:** Use the RAW key, not encrypted/hashed

### Step 3: Verify OpenAI Account Status

1. Go to **OpenAI Dashboard** → **Usage**
2. Check:
   - ✅ Account has credits/quota
   - ✅ No billing issues
   - ✅ API access is enabled

### Step 4: Test the Key

You can test if the key works by checking OpenAI dashboard:
- **OpenAI Dashboard** → **Usage** → Should show API usage
- If showing 0 requests, the key might not be working

## Common Issues

### Issue 1: Key Format Wrong
- ❌ **WRONG:** Hash/encrypted value
- ❌ **WRONG:** Shortened key
- ✅ **CORRECT:** Full key starting with `sk-proj-...` or `sk-...`

### Issue 2: Account Has No Credits
- Check **OpenAI Dashboard** → **Billing**
- Add credits if needed

### Issue 3: Key Not Set in Edge Functions
- The key must be in **Edge Functions → Settings → Secrets**
- Not just in `.env` file

### Issue 4: Rate Limit
- Wait a few minutes and try again
- Check rate limits in OpenAI dashboard

## Verification

After setting the key:

1. **Wait 30 seconds** for secret to propagate
2. **Test the function** again
3. **Check OpenAI Dashboard** → **Usage** - should show API calls
4. **Check function logs** - should not show "quota exceeded" error

## Quick Fix Checklist

- [ ] `OPENAI_API_KEY` secret exists in Edge Functions
- [ ] Secret value is RAW key (starts with `sk-...`)
- [ ] OpenAI account has credits/quota
- [ ] Tested function - works ✅

## Still Not Working?

1. **Verify key format:**
   - Should start with `sk-proj-...` or `sk-...`
   - Should be very long (hundreds of characters)

2. **Check OpenAI dashboard:**
   - Usage → Should show API calls
   - Billing → Should have credits

3. **Test with curl:**
   ```bash
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer YOUR_OPENAI_KEY"
   ```
   Should return list of models if key is valid.
