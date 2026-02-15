-- Add target_seller column to g2g_price_sync table
-- This allows syncing prices based on a specific seller's offers instead of 4th lowest
ALTER TABLE g2g_price_sync 
ADD COLUMN target_seller TEXT DEFAULT NULL;

-- Add comment to explain the field
COMMENT ON COLUMN g2g_price_sync.target_seller IS 
  'Optional: When set, use prices only from this seller username (e.g., Lockbox). If null or seller not found, falls back to 4th lowest price logic.';