# ✅ Reviews to Review Platforms Relationship - FIXED

## Problem
PostgREST couldn't find the relationship between `reviews` and `review_platforms` tables, causing this error:
```
Could not find a relationship between 'reviews' and 'review_platforms' in the schema cache
```

## Solution Applied
✅ Migration created and applied: `20260219210000_fix_reviews_platform_relationship.sql`

This migration:
1. Drops and recreates the foreign key constraint `reviews_platform_id_fkey`
2. Ensures proper relationship: `reviews.platform_id` → `review_platforms.id`
3. Adds a comment to help PostgREST understand the relationship

## Verification
✅ Foreign key constraint verified:
- Constraint: `reviews_platform_id_fkey`
- Table: `reviews`
- References: `review_platforms`

## Next Step: Refresh PostgREST Schema Cache

PostgREST needs to refresh its schema cache to detect the relationship. Choose one method:

### Option 1: Supabase Dashboard (Easiest)
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `sclvjrnnnbbptnhonoks`
3. Go to **Settings** → **API**
4. Click **"Reload Schema"** or **"Restart API"** button
5. Wait 10-30 seconds for cache to refresh

### Option 2: Supabase CLI
```bash
# If you have Supabase CLI installed
supabase db remote commit

# OR restart PostgREST
supabase functions serve --no-verify-jwt
# Then stop it (Ctrl+C) - this refreshes the cache
```

### Option 3: Wait (Automatic)
PostgREST automatically refreshes its schema cache every few minutes. Wait 2-5 minutes and try again.

## Test the Fix

After refreshing the schema cache, test the query:

```typescript
const { data, error } = await supabase
  .from("reviews")
  .select(`
    *,
    review_platforms (name, primary_color, url)
  `)
  .eq("is_active", true)
  .order("posted_at", { ascending: false });
```

This should now work without errors! ✅

## Files Modified
- ✅ `supabase/migrations/20260219210000_fix_reviews_platform_relationship.sql` - Migration created
- ✅ `scripts/apply-migration.ts` - Script to apply migrations
- ✅ `package.json` - Added `apply-migration` command

## If Still Not Working

If the error persists after refreshing schema cache:

1. **Check constraint exists:**
   ```sql
   SELECT conname, conrelid::regclass, confrelid::regclass
   FROM pg_constraint
   WHERE conname = 'reviews_platform_id_fkey';
   ```

2. **Use explicit relationship in query:**
   ```typescript
   // Instead of: review_platforms (...)
   // Use: platform:review_platforms (...)
   .select(`
     *,
     platform:review_platforms (name, primary_color, url)
   `)
   ```

3. **Contact Supabase Support** if issue persists
