-- Add columns to support option-level syncing
ALTER TABLE public.g2g_price_sync 
ADD COLUMN sync_type TEXT NOT NULL DEFAULT 'product',
ADD COLUMN product_option_id UUID REFERENCES public.product_options(id) ON DELETE CASCADE,
ADD COLUMN option_label TEXT;

-- Add constraint to ensure option fields are set when sync_type is 'option'
ALTER TABLE public.g2g_price_sync
ADD CONSTRAINT check_option_sync_fields 
CHECK (
  (sync_type = 'product') OR 
  (sync_type = 'option' AND product_option_id IS NOT NULL AND option_label IS NOT NULL)
);

-- Remove the unique constraint on product_id since we can have multiple entries per product (one per option)
ALTER TABLE public.g2g_price_sync DROP CONSTRAINT IF EXISTS g2g_price_sync_product_id_key;

-- Add a unique constraint for option-level syncs
CREATE UNIQUE INDEX idx_g2g_price_sync_option_unique 
ON public.g2g_price_sync (product_id, product_option_id, option_label) 
WHERE sync_type = 'option';

-- Add a unique constraint for product-level syncs (only one per product)
CREATE UNIQUE INDEX idx_g2g_price_sync_product_unique 
ON public.g2g_price_sync (product_id) 
WHERE sync_type = 'product';

-- Add index for faster lookups
CREATE INDEX idx_g2g_price_sync_option_id ON public.g2g_price_sync(product_option_id) WHERE product_option_id IS NOT NULL;