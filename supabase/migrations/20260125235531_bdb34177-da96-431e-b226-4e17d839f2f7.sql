-- =====================================================
-- PROJECT-WIDE SECURITY HARDENING
-- Defense-in-depth: Revoke default privileges + Least privilege grants
-- =====================================================

-- =====================================================
-- PHASE 1: BULK REVOKE ALL PRIVILEGES FROM ANON/PUBLIC
-- =====================================================
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', tbl.tablename);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC', tbl.tablename);
  END LOOP;
END $$;

-- =====================================================
-- PHASE 2: GRANT MINIMAL PUBLIC READ ACCESS (SEO TABLES)
-- Only SELECT for anonymous browsing
-- =====================================================

-- Games & Products (Core SEO content)
GRANT SELECT ON public.games TO anon, authenticated;
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.product_options TO anon, authenticated;
GRANT SELECT ON public.product_faqs TO anon, authenticated;
GRANT SELECT ON public.product_rewards TO anon, authenticated;
GRANT SELECT ON public.product_guarantees TO anon, authenticated;
GRANT SELECT ON public.product_trust_badges TO anon, authenticated;

-- Blog & CMS
GRANT SELECT ON public.blog_posts TO anon, authenticated;
GRANT SELECT ON public.blog_categories TO anon, authenticated;
GRANT SELECT ON public.cms_pages TO anon, authenticated;

-- Site Configuration & Footer
GRANT SELECT ON public.footer_sections TO anon, authenticated;
GRANT SELECT ON public.footer_links TO anon, authenticated;
GRANT SELECT ON public.contact_info TO anon, authenticated;
GRANT SELECT ON public.cookie_banner_config TO anon, authenticated;
GRANT SELECT ON public.cookie_categories TO anon, authenticated;
GRANT SELECT ON public.exchange_rates TO anon, authenticated;

-- Marketing & Social Proof
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT SELECT ON public.review_platforms TO anon, authenticated;
GRANT SELECT ON public.global_review_config TO anon, authenticated;
GRANT SELECT ON public.service_highlights TO anon, authenticated;
GRANT SELECT ON public.why_we_features TO anon, authenticated;
GRANT SELECT ON public.how_it_works_steps TO anon, authenticated;
GRANT SELECT ON public.how_it_works_showcase TO anon, authenticated;
GRANT SELECT ON public.about_stats TO anon, authenticated;
GRANT SELECT ON public.site_faqs TO anon, authenticated;
GRANT SELECT ON public.game_faqs TO anon, authenticated;
GRANT SELECT ON public.game_genres TO anon, authenticated;
GRANT SELECT ON public.game_genre_assignments TO anon, authenticated;

-- SEO & Redirects
GRANT SELECT ON public.url_redirects TO anon, authenticated;
GRANT SELECT ON public.deleted_urls TO anon, authenticated;

-- Payment Display (public icons only, no secrets)
GRANT SELECT ON public.payment_icons TO anon, authenticated;

-- Chat & Discord Widgets
GRANT SELECT ON public.discord_config TO anon, authenticated;
GRANT SELECT ON public.chat_integration TO anon, authenticated;
GRANT SELECT ON public.chat_cta_config TO anon, authenticated;

-- Referral Config (public display)
GRANT SELECT ON public.referral_config TO anon, authenticated;

-- Cashback Tiers (public display)
GRANT SELECT ON public.cashback_tiers TO anon, authenticated;

-- =====================================================
-- PHASE 3: GRANT PUBLIC INSERT ACCESS (FORMS ONLY)
-- For GDPR consent, inquiries, applications
-- =====================================================

-- GDPR consent logging
GRANT INSERT ON public.cookie_consent_logs TO anon;
GRANT SELECT, INSERT ON public.cookie_consent_logs TO authenticated;

-- Public contact/inquiry forms
GRANT INSERT ON public.product_inquiries TO anon;
GRANT SELECT, INSERT ON public.product_inquiries TO authenticated;

-- Job applications
GRANT INSERT ON public.work_applications TO anon;
GRANT SELECT, INSERT ON public.work_applications TO authenticated;

-- Inquiry rate limits (for anon rate limiting)
GRANT SELECT, INSERT, DELETE ON public.inquiry_rate_limits TO anon, authenticated;

-- =====================================================
-- PHASE 4: GRANT AUTHENTICATED USER ACCESS
-- Protected by existing RLS policies
-- =====================================================

-- User Profiles (already hardened in previous migration)
-- Grants preserved: SELECT, INSERT, UPDATE to authenticated

-- User Cart
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;

-- User Orders (read + create only, no modify after creation)
GRANT SELECT, INSERT ON public.orders TO authenticated;
GRANT SELECT, INSERT ON public.order_items TO authenticated;

-- Cashback Transactions (read own only via RLS)
GRANT SELECT ON public.cashback_transactions TO authenticated;

-- Referral Transactions (read own only via RLS)
GRANT SELECT ON public.referral_transactions TO authenticated;

-- MFA Settings (user manages own)
GRANT SELECT, INSERT, UPDATE ON public.mfa_settings TO authenticated;

-- Coupon Usage (read own via RLS)
GRANT SELECT ON public.coupon_usage TO authenticated;

-- =====================================================
-- PHASE 5: ADMIN/SERVICE-ROLE ONLY TABLES
-- These get NO grants - access via service_role or SECURITY DEFINER
-- =====================================================

-- user_roles - accessed via has_role() function only
-- (Keep existing grants for authenticated to enable has_role checks)
GRANT SELECT ON public.user_roles TO authenticated;

-- security_audit_log - service_role INSERT via log_security_event()
-- NO GRANTS to anon or authenticated

-- password_reset_tokens - edge function access only
-- NO GRANTS to anon or authenticated

-- password_failed_verification_attempts - auth hook only
-- NO GRANTS to anon or authenticated

-- rate_limits - service_role edge function only
-- NO GRANTS to anon or authenticated

-- coupons - admin management + validate_coupon() RPC
GRANT SELECT ON public.coupons TO authenticated;

-- payment_methods - accessed via get_public_payment_methods() RPC
-- NO direct grants needed

-- Admin-only management tables (no grants):
-- competitor_configs, competitor_prices, pricing_rules
-- g2g_price_sync, g2g_price_history
-- product_drafts, product_mappings, price_entities, price_change_log, price_comparisons
-- faq_generation_logs, seo_generation_logs
-- sitemap tables

-- =====================================================
-- PHASE 6: VERIFY RLS IS ENABLED ON ALL USER TABLES
-- =====================================================

-- Ensure RLS is enabled on key tables (already done, but verify)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashback_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_failed_verification_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PHASE 7: ADD ADDITIONAL RLS POLICIES FOR AUTHENTICATED ACCESS
-- Ensure authenticated users can only access their own data
-- =====================================================

-- Cart Items: User can only access their own cart
DROP POLICY IF EXISTS "Users can view their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can insert their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can update their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can delete their own cart items" ON public.cart_items;

CREATE POLICY "Users can view their own cart items"
  ON public.cart_items FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cart items"
  ON public.cart_items FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cart items"
  ON public.cart_items FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cart items"
  ON public.cart_items FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Orders: Users can view and create their own orders
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;

CREATE POLICY "Users can view their own orders"
  ON public.orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders"
  ON public.orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update orders"
  ON public.orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Order Items: Users can view their own order items
DROP POLICY IF EXISTS "Users can view their own order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;

CREATE POLICY "Users can view their own order items"
  ON public.order_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create order items"
  ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all order items"
  ON public.order_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Cashback Transactions: Users can view their own
DROP POLICY IF EXISTS "Users can view their own cashback transactions" ON public.cashback_transactions;

CREATE POLICY "Users can view their own cashback transactions"
  ON public.cashback_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Referral Transactions: Users can view where they are referrer or referee
DROP POLICY IF EXISTS "Users can view their referral transactions" ON public.referral_transactions;

CREATE POLICY "Users can view their referral transactions"
  ON public.referral_transactions FOR SELECT TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referee_id);

-- MFA Settings: Users can manage their own
DROP POLICY IF EXISTS "Users can view their own MFA settings" ON public.mfa_settings;
DROP POLICY IF EXISTS "Users can insert their own MFA settings" ON public.mfa_settings;
DROP POLICY IF EXISTS "Users can update their own MFA settings" ON public.mfa_settings;

CREATE POLICY "Users can view their own MFA settings"
  ON public.mfa_settings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own MFA settings"
  ON public.mfa_settings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own MFA settings"
  ON public.mfa_settings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Coupon Usage: Users can view their own usage
DROP POLICY IF EXISTS "Users can view their own coupon usage" ON public.coupon_usage;

CREATE POLICY "Users can view their own coupon usage"
  ON public.coupon_usage FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- PHASE 8: SECURE ADMIN-ONLY TABLES
-- No public access, service_role only
-- =====================================================

-- Security Audit Log: Insert only via service_role function
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.security_audit_log;
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.security_audit_log;
DROP POLICY IF EXISTS "No updates allowed" ON public.security_audit_log;
DROP POLICY IF EXISTS "No deletes allowed" ON public.security_audit_log;

CREATE POLICY "Service role can insert audit logs"
  ON public.security_audit_log FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Admins can view audit logs"
  ON public.security_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "No updates allowed on audit logs"
  ON public.security_audit_log FOR UPDATE TO authenticated
  USING (false);

CREATE POLICY "No deletes allowed on audit logs"
  ON public.security_audit_log FOR DELETE TO authenticated
  USING (false);

-- Password Reset Tokens: Service role only
DROP POLICY IF EXISTS "Service role manages password tokens" ON public.password_reset_tokens;

CREATE POLICY "Service role manages password tokens"
  ON public.password_reset_tokens FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Block all authenticated access to password tokens
CREATE POLICY "No authenticated access to password tokens"
  ON public.password_reset_tokens FOR ALL TO authenticated
  USING (false);

-- Password Failed Attempts: Service role only
DROP POLICY IF EXISTS "Service role manages failed attempts" ON public.password_failed_verification_attempts;

CREATE POLICY "Service role manages failed attempts"
  ON public.password_failed_verification_attempts FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "No authenticated access to failed attempts"
  ON public.password_failed_verification_attempts FOR ALL TO authenticated
  USING (false);

-- Rate Limits: Service role only
DROP POLICY IF EXISTS "Service role manages rate limits" ON public.rate_limits;

CREATE POLICY "Service role manages rate limits"
  ON public.rate_limits FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);