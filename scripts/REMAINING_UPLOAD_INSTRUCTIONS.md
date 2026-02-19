# Remaining CSV Upload Instructions

## Overview
This document outlines the steps to upload the remaining/failed CSV files after fixing schema issues.

## Step 1: Apply Database Migration

First, you need to apply the migration that creates the missing tables and adds the missing column:

```powershell
# Make sure you're in the project root
cd C:\Users\hp\misti-launchpad

# Apply the migration using Supabase CLI
supabase db push

# OR if you're using Supabase Dashboard:
# 1. Go to your Supabase Dashboard
# 2. Navigate to SQL Editor
# 3. Copy and paste the contents of: supabase/migrations/20260218000001_create_missing_tables.sql
# 4. Run the SQL
```

### What the Migration Does:
1. **Creates `competitor_configs` table** - Stores competitor website configurations
2. **Creates `supported_languages` table** - Stores language/translation settings
3. **Creates `url_redirects` table** - Stores URL redirect rules
4. **Creates `product_mappings` table** - Maps products to competitor prices
5. **Adds `product_bg_image_url` column** to `games` table - Background image for game product pages

## Step 2: Set Environment Variables

Make sure you have your Supabase Service Role Key set:

```powershell
$env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
```

## Step 3: Run the Upload Script

Run the script that processes only the remaining/failed files:

```powershell
npm run upload-remaining
```

Or directly with tsx:

```powershell
tsx scripts/upload-remaining-csvs.ts
```

## Files Being Processed

The script processes files in the correct dependency order:

### STEP 1: Schema Fixes (Priority Level 0)
1. `competitor_configs-export-2026-02-17_01-44-50.csv`
2. `games-export-2026-02-17_01-53-53.csv` (now has product_bg_image_url column)
3. `supported_languages-export-2026-02-17_02-08-18.csv`
4. `url_redirects-export-2026-02-17_02-08-30.csv`
5. `product_mappings-export-2026-02-17_01-58-58.csv`

### STEP 2: Dependency Re-Upload
**Level 1:**
- `categories-export-2026-02-17_01-44-03.csv`
- `footer_links-export-2026-02-17_01-51-13.csv`

**Level 2:**
- `game_faqs-export-2026-02-17_01-52-41.csv`
- `game_genre_assignments-export-2026-02-17_01-52-54.csv`
- `products-export-2026-02-17_02-00-18.csv`

**Level 3:**
- `cart_items-export-2026-02-17_01-43-34.csv`
- `faq_generation_logs-export-2026-02-17_01-47-17.csv`
- `g2g_price_sync-export-2026-02-17_01-52-27.csv`
- `product_drafts-export-2026-02-17_01-57-25.csv`
- `product_faqs-export-2026-02-17_01-57-34.csv`
- `product_options-export-2026-02-17_01-58-56.csv`
- `product_rewards-export-2026-02-17_01-58-51.csv`
- `seo_generation_logs-export-2026-02-17_02-03-07.csv`

### STEP 3: Pending Unprocessed Files
**Level 4:**
- `g2g_price_history-export-2026-02-17_01-52-13.csv`
- `order_items-export-2026-02-17_01-54-52.csv`

**Level 5:**
- `profiles-export-2026-02-17_02-00-34.csv`
- `user_roles-export-2026-02-17_02-10-24.csv`

**Level 6:**
- `cashback_transactions-export-2026-02-17_01-43-54.csv`
- `cookie_consent_logs-export-2026-02-17_01-45-39.csv`
- `coupon_usage-export-2026-02-17_01-46-05.csv`
- `deleted_urls-export-2026-02-17_01-46-36.csv`
- `orders-export-2026-02-17_01-55-05.csv`
- `referral_transactions-export-2026-02-17_02-01-35.csv`
- `sitemap_cache-export-2026-02-17_02-07-16.csv`

**Level 7:**
- `reviews-export-2026-02-17_02-02-32.csv`

**Level 8:**
- `coupons-export-2026-02-17_01-46-15.csv`

**Level 9:**
- `price_entities-export-2026-02-17_01-56-12.csv`
- `pricing_rules-export-2026-02-17_01-56-24.csv`
- `product_inquiries-export-2026-02-17_01-58-10.csv`

## Troubleshooting

### If migration fails:
- Check that you have the correct permissions in Supabase
- Verify that the `update_updated_at_column()` function exists (it should from previous migrations)
- Check Supabase logs for specific error messages

### If upload fails:
- Verify the Service Role Key is set correctly
- Check that all parent tables exist (e.g., games, categories, products)
- Review the error messages in the console output
- Some tables may have foreign key constraints that need parent data first

### Common Issues:
1. **Foreign Key Constraint Errors**: Make sure parent tables are uploaded first
2. **Missing Columns**: Verify the migration was applied successfully
3. **Permission Errors**: Ensure you're using the Service Role Key (not anon key)

## Summary

After completing these steps, all remaining CSV files should be uploaded to your Supabase database. The script will provide a detailed summary of successes and failures at the end.
