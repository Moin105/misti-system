-- Add contact details, country, and address fields to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS contact_details TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS address TEXT;

-- Add comments for documentation
COMMENT ON COLUMN orders.contact_details IS 'Customer contact information (Discord, phone, etc.)';
COMMENT ON COLUMN orders.country IS 'Customer country';
COMMENT ON COLUMN orders.address IS 'Customer billing/shipping address (optional)';