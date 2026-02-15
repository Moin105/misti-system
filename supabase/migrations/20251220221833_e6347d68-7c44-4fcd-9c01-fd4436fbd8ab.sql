-- Create performance indexes for faster queries

-- Products: Fast lookup by category + slug + active status
CREATE INDEX IF NOT EXISTS idx_products_category_slug_active 
ON products(category_id, slug, is_active);

-- Products: Fast lookup by slug + active status
CREATE INDEX IF NOT EXISTS idx_products_slug_active 
ON products(slug, is_active);

-- Product Options: Fast lookup by product_id
CREATE INDEX IF NOT EXISTS idx_product_options_product_id 
ON product_options(product_id);

-- Categories: Fast lookup by game + active + sort order
CREATE INDEX IF NOT EXISTS idx_categories_game_active_order 
ON categories(game_id, is_active, sort_order);

-- Categories: Fast lookup by slug + game + active
CREATE INDEX IF NOT EXISTS idx_categories_slug_game_active 
ON categories(slug, game_id, is_active);

-- Games: Fast lookup by slug + active status  
CREATE INDEX IF NOT EXISTS idx_games_slug_active 
ON games(slug, is_active);

-- Product rewards: Fast lookup by product + approved
CREATE INDEX IF NOT EXISTS idx_product_rewards_product_approved 
ON product_rewards(product_id, is_approved);

-- Deleted URLs: Fast lookup by url_path
CREATE INDEX IF NOT EXISTS idx_deleted_urls_path 
ON deleted_urls(url_path);