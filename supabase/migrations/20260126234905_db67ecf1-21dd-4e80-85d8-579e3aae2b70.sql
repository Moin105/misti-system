-- Restore security_invoker setting on popular_products view
-- This was accidentally removed when the view was recreated in migration 20260126230657
-- The view should use SECURITY INVOKER to respect RLS policies on the products table
ALTER VIEW popular_products SET (security_invoker = on);