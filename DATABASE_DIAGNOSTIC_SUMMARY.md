# Database Diagnostic Summary

**Date:** 2026-02-19  
**Database:** Supabase (sclvjrnnnbbptnhonoks)

## Overview

After running the diagnostic script, here's what was found:

- **Tables in database:** 76
- **Tables in migrations:** 72
- **Functions:** 65
- **Triggers:** 43
- **RLS Policies:** 168

## Issues Found

### 1. Missing Tables (2)
These tables are defined in migrations but don't exist in the database:

- `chat_conversations` - **Intentionally dropped** (see migration `20251021092639`)
- `chat_messages` - **Intentionally dropped** (see migration `20251021092639`)

**Status:** ✅ These were intentionally removed in favor of 3rd party chat integration.

### 2. Extra Tables (6)
These tables exist in the database but don't have migrations:

- `competitor_prices` - Needs migration
- `price_change_log` - Needs migration
- `price_comparisons` - Needs migration
- `price_entities` - Needs migration
- `pricing_rules` - Needs migration
- `translations` - Needs migration

**Action Required:** Create migrations for these tables.

### 3. Column Type Mismatches (101)
Many columns were incorrectly set to `TEXT` type during data import instead of their proper types:

**Common Issues:**
- UUID columns → TEXT
- JSONB columns → TEXT
- NUMERIC/DECIMAL columns → TEXT or INTEGER
- BOOLEAN columns → TEXT
- TIMESTAMPTZ columns → TEXT

**Action Required:** Migration `20260219203000_fix_column_types_from_data_import.sql` has been created to fix these.

### 4. Missing Columns (4)
Columns defined in migrations but missing from database:

- `chat_integration.script_code` (TEXT)
- `product_rewards.meta_title` (TEXT)
- `product_rewards.meta_description` (TEXT)
- `products.subcategory_id` (UUID) - **Note:** This was replaced with `category_id` in later migrations

**Action Required:** Add these columns via migration.

### 5. Extra Columns (44)
Columns that exist in database but not in migrations (likely added manually or via data import):

**Notable extra columns:**
- `blog_posts`: meta_keywords, featured_image, author_name, read_time_minutes, canonical_url, published_at
- `categories`: meta_description, meta_keywords, og_image
- `games`: meta_description, meta_keywords, og_image, robots, canonical_url
- `products`: slider_config, total_sales, start_time_value, delivery_text, delivery_value, meta_keywords, og_image, canonical_url, image_alt_text
- `profiles`: total_lifetime_spending, referred_by, total_referrals, referral_earnings
- `orders`: cashback_earned, country, address, coupon_discount, referral_discount
- `security_audit_log`: event_category, request_id, user_agent, error_code, error_message

**Action Required:** Decide whether to:
1. Add these to migrations (if they should be permanent)
2. Remove them (if they're not needed)
3. Keep them as-is (if they're data-only, not schema)

## Recommended Actions

### Priority 1: Fix Column Types
Run the migration: `20260219203000_fix_column_types_from_data_import.sql`

**Warning:** This migration uses `USING` clauses to convert data. Test on a backup first!

### Priority 2: Create Migrations for Extra Tables
Create migrations for the 6 extra tables that exist in DB but not in migrations.

### Priority 3: Add Missing Columns
Add the 4 missing columns via migration.

### Priority 4: Document Extra Columns
Decide on the 44 extra columns - add to migrations or remove.

## Migration Files Created

1. ✅ `20260219203000_fix_column_types_from_data_import.sql` - Fixes 101 column type mismatches

## Next Steps

1. **Review** the type fix migration carefully
2. **Test** on a backup/staging database first
3. **Apply** the migration: `supabase db push`
4. **Create** migrations for extra tables
5. **Add** missing columns
6. **Re-run** diagnostic: `npm run diagnose-db`

## Notes

- The diagnostic script is available at: `scripts/diagnose-database.ts`
- Run it anytime with: `npm run diagnose-db`
- The script compares actual database schema with migration files
