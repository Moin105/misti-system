-- Add parent_link column to products table for internal linking
ALTER TABLE products 
ADD COLUMN parent_link TEXT DEFAULT NULL;

COMMENT ON COLUMN products.parent_link IS 
  'Optional internal link to a related/parent product for better SEO internal linking. Store relative URL path.';