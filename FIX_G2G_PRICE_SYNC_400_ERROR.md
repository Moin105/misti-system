# Fix g2g_price_sync 400 Bad Request Error

## Problem
Getting `400 Bad Request` error when trying to POST (INSERT) to `g2g_price_sync` table.

## Common Causes

### 1. Missing Required Fields
The following fields are **REQUIRED** (NOT NULL):
- `product_id` (UUID) - Must reference an existing product
- `g2g_url` (TEXT) - The G2G URL to sync from
- `sync_type` (TEXT) - Either 'product' or 'option' (defaults to 'product' if not provided)

### 2. CHECK Constraint Violation
If `sync_type = 'option'`, then **BOTH** of these must be provided:
- `product_option_id` (UUID) - Must NOT be NULL
- `option_label` (TEXT) - Must NOT be NULL

### 3. Unique Constraint Violation
- For `sync_type = 'product'`: Only ONE sync config per product (unique on `product_id`)
- For `sync_type = 'option'`: Unique on `(product_id, product_option_id, option_label)`

### 4. Invalid UUID Format
- `product_id` must be a valid UUID
- `product_option_id` (if provided) must be a valid UUID

### 5. Foreign Key Constraint
- `product_id` must exist in `products` table
- `product_option_id` (if provided) must exist in `product_options` table

## Required Fields for INSERT

### For Product-Level Sync (sync_type = 'product'):
```json
{
  "product_id": "uuid-here",
  "g2g_url": "https://www.g2g.com/...",
  "sync_type": "product"  // optional, defaults to 'product'
  // All other fields have defaults or are optional
}
```

### For Option-Level Sync (sync_type = 'option'):
```json
{
  "product_id": "uuid-here",
  "g2g_url": "https://www.g2g.com/...",
  "sync_type": "option",
  "product_option_id": "uuid-here",  // REQUIRED for option sync
  "option_label": "EU"  // REQUIRED for option sync
  // All other fields have defaults or are optional
}
```

## Fields with Defaults (Can Be Omitted)

These fields have defaults and don't need to be provided:
- `id` - Auto-generated UUID
- `price_unit` - Defaults to 1000
- `price_unit_label` - Defaults to 'per 1K'
- `markup_percentage` - Defaults to 25
- `is_active` - Defaults to true
- `sync_interval_hours` - Defaults to 24
- `created_at` - Auto-generated timestamp
- `updated_at` - Auto-generated timestamp
- `last_sync_status` - Defaults to 'pending'
- `scrape_method` - Defaults to 'scrape'

## Optional Fields (Can Be NULL)

These fields are optional:
- `product_option_id` - NULL for product sync, required for option sync
- `option_label` - NULL for product sync, required for option sync
- `last_sync_at` - NULL initially
- `last_g2g_price` - NULL initially
- `last_our_price` - NULL initially
- `last_sync_error` - NULL initially
- `api_url` - NULL if using scrape method
- `target_seller` - NULL to use 4th lowest price

## Example Valid Requests

### Product Sync:
```json
POST /rest/v1/g2g_price_sync
{
  "product_id": "44ba9ead-093b-4d81-bf68-22b0becd5f02",
  "g2g_url": "https://www.g2g.com/categories/path-of-exile-2-currency/offer/group?fa=...",
  "markup_percentage": 50,
  "price_unit": 10000,
  "price_unit_label": "per 10K (10,000)"
}
```

### Option Sync:
```json
POST /rest/v1/g2g_price_sync
{
  "product_id": "6527407f-41c5-4fbc-8dbb-2adde1e61ccb",
  "g2g_url": "https://www.g2g.com/categories/wow-gold/offer/group?fa=...",
  "sync_type": "option",
  "product_option_id": "7686ef4b-2e2a-47bf-8a4b-27224ecd3d0c",
  "option_label": "EU",
  "markup_percentage": 20,
  "price_unit": 10000,
  "price_unit_label": "per 10K (10,000)"
}
```

## Debugging Steps

1. **Check the actual error message** in the response body - it will tell you exactly what's wrong
2. **Verify product_id exists**:
   ```sql
   SELECT id FROM products WHERE id = 'your-product-id';
   ```
3. **Verify product_option_id exists** (if using option sync):
   ```sql
   SELECT id FROM product_options WHERE id = 'your-option-id';
   ```
4. **Check for existing sync config**:
   ```sql
   SELECT * FROM g2g_price_sync WHERE product_id = 'your-product-id';
   ```
5. **Verify CHECK constraint** - If sync_type='option', both product_option_id and option_label must be provided

## Common Error Messages

- `null value in column "id" violates not-null constraint` - **FIXED**: Run migration `20260220400000_fix_g2g_price_sync_id_default.sql` to set default value
- `null value in column "product_id" violates not-null constraint` - Missing product_id
- `null value in column "g2g_url" violates not-null constraint` - Missing g2g_url
- `new row violates check constraint "check_option_sync_fields"` - Option sync missing product_option_id or option_label
- `duplicate key value violates unique constraint` - Product already has a sync config
- `violates foreign key constraint` - product_id or product_option_id doesn't exist

## Solution

Make sure your POST request includes:
1. ✅ `product_id` (valid UUID that exists in products table)
2. ✅ `g2g_url` (non-empty string)
3. ✅ If `sync_type = 'option'`: Both `product_option_id` and `option_label`
4. ✅ No duplicate product_id for product-level syncs
