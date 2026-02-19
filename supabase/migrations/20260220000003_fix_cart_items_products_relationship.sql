-- Fix: Explicitly recreate foreign key constraint between cart_items and products
-- This ensures PostgREST detects the relationship for nested queries

-- Drop existing constraint if it exists
ALTER TABLE public.cart_items 
  DROP CONSTRAINT IF EXISTS cart_items_product_id_fkey;

-- Recreate the foreign key constraint explicitly
ALTER TABLE public.cart_items 
  ADD CONSTRAINT cart_items_product_id_fkey 
  FOREIGN KEY (product_id) 
  REFERENCES public.products(id) 
  ON DELETE CASCADE;

-- Refresh PostgREST schema cache (manual step after applying migration)
-- Go to Supabase Dashboard -> Settings -> API -> Reload Schema
-- OR wait a few minutes for automatic refresh
