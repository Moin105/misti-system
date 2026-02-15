-- Enable the pg_trgm extension for trigram searches
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN index on products.name for fast ilike pattern matching
CREATE INDEX IF NOT EXISTS idx_products_name_gin ON products USING gin(name gin_trgm_ops);

-- Also add index for game name searches (commonly searched)
CREATE INDEX IF NOT EXISTS idx_games_name_gin ON games USING gin(name gin_trgm_ops);

-- Add index for category name searches
CREATE INDEX IF NOT EXISTS idx_categories_name_gin ON categories USING gin(name gin_trgm_ops);