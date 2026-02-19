# CSV Upload Setup Guide

## Issue: Permission Denied

The upload is failing because we need the **Supabase Service Role Key** to insert data (it bypasses Row Level Security).

## How to Get Your Service Role Key

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Find the **service_role** key (NOT the anon key)
5. Copy it

## How to Set It

### Option 1: Set Environment Variable (Temporary - Current Session Only)

**PowerShell:**
```powershell
$env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
npm run upload-all-csvs supabase/csv
```

**Command Prompt:**
```cmd
set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
npm run upload-all-csvs supabase/csv
```

### Option 2: Create .env File (Permanent)

Create a `.env` file in the project root:

```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

Then run:
```bash
npm run upload-all-csvs supabase/csv
```

**⚠️ Important:** Never commit the `.env` file to git! It should already be in `.gitignore`.

## Test First

Before uploading all files, test with one file:

```bash
npm run test-csv supabase/csv/about_stats-export-2026-02-17_01-40-02.csv about_stats
```

## After Setting the Key

Once you've set the service role key, run:

```bash
npm run upload-all-csvs supabase/csv
```

This will upload all 69 CSV files to their corresponding tables.
