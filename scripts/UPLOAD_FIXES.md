# Database Upload Fixes - Summary

## Issues Fixed

### 1. Missing Tables in Priority Order
The following tables were missing from the `UPLOAD_ORDER` array and have now been added:

- `subcategories` - Added to Level 2 (depends on `categories`)
- `competitor_prices` - Added to Level 1 (depends on `competitor_configs`)
- `inquiry_rate_limits` - Added to Level 0 (no dependencies)
- `mfa_settings` - Added to Level 0 (no dependencies)
- `password_failed_verification_attempts` - Added to Level 0 (no dependencies)
- `password_reset_tokens` - Added to Level 0 (no dependencies)
- `price_change_log` - Added to Level 10 (depends on `price_entities`, `products`, `pricing_rules`)
- `price_comparisons` - Added to Level 10 (depends on `price_entities`, `product_mappings`)
- `translations` - Added to Level 0 (no dependencies)

### 2. Improved Error Handling
- Added table existence check before uploading
- Better error messages for missing tables
- Improved logging for partial successes
- Better handling of foreign key constraint errors

### 3. Priority Order Structure
Tables are now organized in the correct dependency order:

- **Level 0**: Base tables with no dependencies (games, review_platforms, etc.)
- **Level 1**: Tables depending on Level 0 (categories, competitor_prices, etc.)
- **Level 2**: Tables depending on Level 1 (products, subcategories, etc.)
- **Level 3**: Tables depending on Level 2 (product_options, product_mappings, etc.)
- **Level 4**: Tables depending on Level 3 (g2g_price_history, order_items)
- **Level 5**: User-dependent tables (profiles, user_roles)
- **Level 6**: Tables depending on users and other tables (orders, cashback_transactions, etc.)
- **Level 7**: Reviews (depends on review_platforms)
- **Level 8**: Coupons
- **Level 9**: Special cases (price_entities, pricing_rules, product_inquiries)
- **Level 10**: Price-related tables (price_change_log, price_comparisons)

## How to Run the Upload

1. **Set your Supabase Service Role Key** (required for bypassing RLS):
   ```powershell
   $env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
   ```

2. **Run the upload script**:
   ```powershell
   npm run upload-all-csvs supabase/csv
   ```

   Or using tsx directly:
   ```powershell
   tsx scripts/upload-all-csvs.ts supabase/csv
   ```

3. **Monitor the output** - The script will:
   - Show upload order by priority level
   - Process each CSV file in dependency order
   - Report success/failure for each table
   - Provide a summary at the end

## All Tables Included (69 tables)

All tables from your Lovable Cloud export are now included in the priority order:

1. about_stats
2. blog_categories
3. blog_posts
4. cart_items
5. cashback_tiers
6. cashback_transactions
7. categories
8. chat_cta_config
9. chat_integration
10. cms_pages
11. competitor_configs
12. competitor_prices ✅ (was missing)
13. contact_info
14. cookie_banner_config
15. cookie_categories
16. cookie_consent_logs
17. coupon_usage
18. coupons
19. deleted_urls
20. discord_config
21. exchange_rates
22. faq_generation_logs
23. footer_links
24. footer_sections
25. g2g_price_history
26. g2g_price_sync
27. game_faqs
28. game_genre_assignments
29. game_genres
30. games
31. global_review_config
32. how_it_works_showcase
33. how_it_works_steps
34. inquiry_rate_limits ✅ (was missing)
35. mfa_settings ✅ (was missing)
36. order_items
37. orders
38. password_failed_verification_attempts ✅ (was missing)
39. password_reset_tokens ✅ (was missing)
40. payment_icons
41. payment_methods
42. price_change_log ✅ (was missing)
43. price_comparisons ✅ (was missing)
44. price_entities
45. pricing_rules
46. product_drafts
47. product_faqs
48. product_guarantees
49. product_inquiries
50. product_mappings
51. product_options
52. product_rewards
53. product_trust_badges
54. products
55. profiles
56. rate_limits
57. referral_config
58. referral_transactions
59. review_platforms
60. reviews
61. security_audit_log
62. seo_generation_logs
63. service_highlights
64. site_faqs
65. site_security_settings
66. sitemap_cache
67. sitemap_config
68. sitemap_static_pages
69. social_links
70. subcategories ✅ (was missing)
71. supported_languages
72. translations ✅ (was missing)
73. url_redirects
74. user_roles
75. why_we_features
76. work_applications

## Notes

- Tables with 0 rows will still be processed (they may have schema but no data)
- The script will skip tables that don't exist in the database with a clear message
- Foreign key constraint errors are handled by inserting rows one-by-one
- Duplicate key errors are handled gracefully
