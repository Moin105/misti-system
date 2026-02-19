-- =====================================================
-- FIX COLUMN TYPES FROM DATA IMPORT
-- Many columns were incorrectly set to TEXT during data import
-- This migration fixes them to match the migration definitions
-- =====================================================

-- Blog Posts
ALTER TABLE blog_posts
  ALTER COLUMN is_legal_page TYPE BOOLEAN USING CASE WHEN is_legal_page = 'true' OR is_legal_page = '1' THEN true ELSE false END,
  ALTER COLUMN author_id TYPE UUID USING author_id::uuid,
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at::timestamptz,
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at::timestamptz,
  ALTER COLUMN category_id TYPE UUID USING category_id::uuid;

-- Cart Items
ALTER TABLE cart_items
  ALTER COLUMN selected_options TYPE JSONB USING selected_options::jsonb;

-- Cashback Tiers
ALTER TABLE cashback_tiers
  ALTER COLUMN min_spending TYPE NUMERIC USING min_spending::numeric,
  ALTER COLUMN cashback_percentage TYPE NUMERIC USING cashback_percentage::numeric;

-- Cashback Transactions
ALTER TABLE cashback_transactions
  ALTER COLUMN order_id TYPE UUID USING order_id::uuid;

-- CMS Pages
ALTER TABLE cms_pages
  ALTER COLUMN content TYPE JSONB USING content::jsonb;

-- Cookie Consent Logs
ALTER TABLE cookie_consent_logs
  ALTER COLUMN session_id TYPE TEXT USING session_id::text,
  ALTER COLUMN consent_preferences TYPE JSONB USING consent_preferences::jsonb;

-- Coupons
ALTER TABLE coupons
  ALTER COLUMN discount_percentage TYPE NUMERIC USING discount_percentage::numeric,
  ALTER COLUMN applicable_games TYPE UUID[] USING string_to_array(applicable_games, ',')::uuid[],
  ALTER COLUMN applicable_categories TYPE UUID[] USING string_to_array(applicable_categories, ',')::uuid[],
  ALTER COLUMN applicable_products TYPE UUID[] USING string_to_array(applicable_products, ',')::uuid[],
  ALTER COLUMN min_order_amount TYPE NUMERIC(10,2) USING min_order_amount::numeric,
  ALTER COLUMN max_uses_per_user TYPE INTEGER USING max_uses_per_user::integer;

-- G2G Price History
ALTER TABLE g2g_price_history
  ALTER COLUMN markup_applied TYPE NUMERIC USING markup_applied::numeric;

-- G2G Price Sync
ALTER TABLE g2g_price_sync
  ALTER COLUMN markup_percentage TYPE NUMERIC USING markup_percentage::numeric,
  ALTER COLUMN last_sync_at TYPE TIMESTAMPTZ USING last_sync_at::timestamptz,
  ALTER COLUMN last_g2g_price TYPE NUMERIC USING last_g2g_price::numeric,
  ALTER COLUMN last_our_price TYPE NUMERIC USING last_our_price::numeric,
  ALTER COLUMN sync_interval_hours TYPE INTEGER USING sync_interval_hours::integer,
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at::timestamptz,
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at::timestamptz;

-- How It Works Showcase
ALTER TABLE how_it_works_showcase
  ALTER COLUMN features TYPE JSONB USING features::jsonb;

-- Order Items
ALTER TABLE order_items
  ALTER COLUMN unit_price TYPE DECIMAL(10,2) USING unit_price::numeric,
  ALTER COLUMN selected_options TYPE JSONB USING selected_options::jsonb;

-- Orders
ALTER TABLE orders
  ALTER COLUMN total_amount TYPE DECIMAL(10,2) USING total_amount::numeric,
  ALTER COLUMN cashback_used TYPE NUMERIC USING cashback_used::numeric,
  ALTER COLUMN coupon_id TYPE UUID USING coupon_id::uuid;

-- Payment Methods
ALTER TABLE payment_methods
  ALTER COLUMN config TYPE JSONB USING config::jsonb;

-- Product Drafts
ALTER TABLE product_drafts
  ALTER COLUMN similarity_score TYPE NUMERIC USING similarity_score::numeric,
  ALTER COLUMN product_type TYPE product_generator_type USING product_type::product_generator_type,
  ALTER COLUMN game_id TYPE UUID USING game_id::uuid,
  ALTER COLUMN category_id TYPE UUID USING category_id::uuid,
  ALTER COLUMN faqs TYPE JSONB USING faqs::jsonb,
  ALTER COLUMN is_slider_product TYPE BOOLEAN USING CASE WHEN is_slider_product = 'true' OR is_slider_product = '1' THEN true ELSE false END,
  ALTER COLUMN slider_config TYPE JSONB USING slider_config::jsonb,
  ALTER COLUMN base_price TYPE NUMERIC USING base_price::numeric,
  ALTER COLUMN created_by TYPE UUID USING created_by::uuid,
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at::timestamptz,
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at::timestamptz;

-- Product Inquiries
ALTER TABLE product_inquiries
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at::timestamptz,
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at::timestamptz;

-- Product Mappings
ALTER TABLE product_mappings
  ALTER COLUMN competitor_price_id TYPE UUID USING competitor_price_id::uuid,
  ALTER COLUMN match_confidence TYPE NUMERIC USING match_confidence::numeric;

-- Product Options
ALTER TABLE product_options
  ALTER COLUMN option_type TYPE option_type USING option_type::option_type,
  ALTER COLUMN options TYPE JSONB USING options::jsonb,
  ALTER COLUMN min_value TYPE INTEGER USING min_value::integer,
  ALTER COLUMN max_value TYPE INTEGER USING max_value::integer,
  ALTER COLUMN price_modifier TYPE DECIMAL(10,2) USING price_modifier::numeric;

-- Products
ALTER TABLE products
  ALTER COLUMN base_price TYPE DECIMAL(10,2) USING base_price::numeric,
  ALTER COLUMN trust_score TYPE DECIMAL(3,2) USING trust_score::numeric;

-- Profiles
ALTER TABLE profiles
  ALTER COLUMN cashback_balance TYPE NUMERIC USING cashback_balance::numeric;

-- Referral Config
ALTER TABLE referral_config
  ALTER COLUMN referrer_percentage TYPE NUMERIC USING referrer_percentage::numeric,
  ALTER COLUMN referee_discount_percentage TYPE NUMERIC USING referee_discount_percentage::numeric,
  ALTER COLUMN min_order_amount TYPE NUMERIC USING min_order_amount::numeric;

-- Referral Transactions
ALTER TABLE referral_transactions
  ALTER COLUMN referee_discount TYPE NUMERIC USING referee_discount::numeric;

-- Review Platforms
ALTER TABLE review_platforms
  ALTER COLUMN average_rating TYPE NUMERIC(2,1) USING average_rating::numeric;

-- Security Audit Log
ALTER TABLE security_audit_log
  ALTER COLUMN operation_details TYPE JSONB USING operation_details::jsonb;

-- SEO Generation Logs
ALTER TABLE seo_generation_logs
  ALTER COLUMN game_id TYPE UUID USING game_id::uuid,
  ALTER COLUMN old_values TYPE JSONB USING old_values::jsonb,
  ALTER COLUMN new_values TYPE JSONB USING new_values::jsonb;

-- Site Security Settings
ALTER TABLE site_security_settings
  ALTER COLUMN setting_value TYPE JSONB USING setting_value::jsonb,
  ALTER COLUMN updated_by TYPE UUID USING updated_by::uuid;

-- Sitemap Static Pages
ALTER TABLE sitemap_static_pages
  ALTER COLUMN priority TYPE NUMERIC USING priority::numeric;

-- URL Redirects
ALTER TABLE url_redirects
  ALTER COLUMN is_pattern TYPE BOOLEAN USING CASE WHEN is_pattern = 'true' OR is_pattern = '1' THEN true ELSE false END,
  ALTER COLUMN status_code TYPE INTEGER USING status_code::integer,
  ALTER COLUMN hit_count TYPE INTEGER USING hit_count::integer,
  ALTER COLUMN last_hit_at TYPE TIMESTAMPTZ USING last_hit_at::timestamptz,
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at::timestamptz,
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at::timestamptz,
  ALTER COLUMN created_by TYPE UUID USING created_by::uuid;

-- Work Applications
ALTER TABLE work_applications
  ALTER COLUMN proof_urls TYPE JSONB USING proof_urls::jsonb;

-- FAQ Generation Logs
ALTER TABLE faq_generation_logs
  ALTER COLUMN game_id TYPE UUID USING game_id::uuid;
