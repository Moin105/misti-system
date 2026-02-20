# Fix Product Rewards RLS Policies

## Problem
Product rewards cannot be edited, regenerated, deleted, or published because the RLS policy is missing `WITH CHECK` clause for UPDATE operations.

## Solution

Run this SQL in Supabase Dashboard → SQL Editor:

```sql
-- Drop existing policy
DROP POLICY IF EXISTS "Admins can manage rewards" ON public.product_rewards;

-- Recreate with both USING and WITH CHECK clauses
CREATE POLICY "Admins can manage rewards"
ON public.product_rewards
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
```

## Why This Fix Works

PostgreSQL RLS requires:
- `USING` clause: Controls which rows can be **read** (SELECT)
- `WITH CHECK` clause: Controls which rows can be **written** (INSERT/UPDATE)

The original policy only had `USING`, which allowed admins to read rewards but not update them. Adding `WITH CHECK` allows admins to update/insert/delete rewards.

## Verify

After running the fix, verify the policy:

```sql
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'product_rewards';
```

Both `qual` and `with_check` should show: `has_role(auth.uid(), 'admin'::app_role)`
