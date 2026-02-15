-- Add total_price column to cart_items table
ALTER TABLE public.cart_items 
ADD COLUMN total_price numeric NOT NULL DEFAULT 0;