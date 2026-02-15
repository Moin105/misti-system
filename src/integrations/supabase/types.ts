export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      about_stats: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          label: string
          sort_order: number | null
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          label: string
          sort_order?: number | null
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          label?: string
          sort_order?: number | null
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      blog_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          author_name: string | null
          canonical_url: string | null
          category_id: string | null
          content: string
          created_at: string | null
          excerpt: string | null
          featured_image: string | null
          id: string
          is_legal_page: boolean | null
          is_published: boolean | null
          meta_description: string | null
          meta_keywords: string | null
          published_at: string | null
          read_time_minutes: number | null
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          canonical_url?: string | null
          category_id?: string | null
          content: string
          created_at?: string | null
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          is_legal_page?: boolean | null
          is_published?: boolean | null
          meta_description?: string | null
          meta_keywords?: string | null
          published_at?: string | null
          read_time_minutes?: number | null
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          canonical_url?: string | null
          category_id?: string | null
          content?: string
          created_at?: string | null
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          is_legal_page?: boolean | null
          is_published?: boolean | null
          meta_description?: string | null
          meta_keywords?: string | null
          published_at?: string | null
          read_time_minutes?: number | null
          slug?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          created_at: string | null
          id: string
          product_id: string | null
          quantity: number
          selected_options: Json | null
          total_price: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          quantity?: number
          selected_options?: Json | null
          total_price?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          quantity?: number
          selected_options?: Json | null
          total_price?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "popular_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      cashback_tiers: {
        Row: {
          cashback_percentage: number
          created_at: string | null
          id: string
          is_active: boolean | null
          min_spending: number
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          cashback_percentage?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          min_spending?: number
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          cashback_percentage?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          min_spending?: number
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cashback_transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          order_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cashback_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          game_id: string
          icon: string | null
          id: string
          is_active: boolean | null
          meta_description: string | null
          meta_keywords: string | null
          meta_title: string | null
          name: string
          og_image: string | null
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          game_id: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          name: string
          og_image?: string | null
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          game_id?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          name?: string
          og_image?: string | null
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_cta_config: {
        Row: {
          button_text: string
          created_at: string
          icon_name: string
          id: string
          is_active: boolean | null
          updated_at: string
        }
        Insert: {
          button_text?: string
          created_at?: string
          icon_name?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
        }
        Update: {
          button_text?: string
          created_at?: string
          icon_name?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      chat_integration: {
        Row: {
          created_at: string
          custom_attributes: Json | null
          id: string
          is_active: boolean
          property_id: string | null
          provider: string
          sri_hash: string | null
          updated_at: string
          visitor_name_field: string | null
          widget_id: string | null
        }
        Insert: {
          created_at?: string
          custom_attributes?: Json | null
          id?: string
          is_active?: boolean
          property_id?: string | null
          provider?: string
          sri_hash?: string | null
          updated_at?: string
          visitor_name_field?: string | null
          widget_id?: string | null
        }
        Update: {
          created_at?: string
          custom_attributes?: Json | null
          id?: string
          is_active?: boolean
          property_id?: string | null
          provider?: string
          sri_hash?: string | null
          updated_at?: string
          visitor_name_field?: string | null
          widget_id?: string | null
        }
        Relationships: []
      }
      cms_pages: {
        Row: {
          content: Json
          created_at: string
          id: string
          is_published: boolean | null
          slug: string
          sort_order: number | null
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          is_published?: boolean | null
          slug: string
          sort_order?: number | null
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          is_published?: boolean | null
          slug?: string
          sort_order?: number | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      competitor_configs: {
        Row: {
          base_url: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          rate_limit_ms: number | null
          scrape_method: string | null
          updated_at: string | null
        }
        Insert: {
          base_url?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          rate_limit_ms?: number | null
          scrape_method?: string | null
          updated_at?: string | null
        }
        Update: {
          base_url?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          rate_limit_ms?: number | null
          scrape_method?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      competitor_prices: {
        Row: {
          competitor_id: string | null
          created_at: string | null
          currency: string | null
          detected_quantity: number | null
          error_message: string | null
          fetch_status: string | null
          id: string
          last_checked: string | null
          normalized_name: string | null
          price: number
          price_per_unit: number | null
          product_name_raw: string
          raw_data: Json | null
          source_url: string
        }
        Insert: {
          competitor_id?: string | null
          created_at?: string | null
          currency?: string | null
          detected_quantity?: number | null
          error_message?: string | null
          fetch_status?: string | null
          id?: string
          last_checked?: string | null
          normalized_name?: string | null
          price: number
          price_per_unit?: number | null
          product_name_raw: string
          raw_data?: Json | null
          source_url: string
        }
        Update: {
          competitor_id?: string | null
          created_at?: string | null
          currency?: string | null
          detected_quantity?: number | null
          error_message?: string | null
          fetch_status?: string | null
          id?: string
          last_checked?: string | null
          normalized_name?: string | null
          price?: number
          price_per_unit?: number | null
          product_name_raw?: string
          raw_data?: Json | null
          source_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_prices_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "competitor_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_info: {
        Row: {
          contact_type: string
          created_at: string | null
          icon_name: string
          id: string
          is_active: boolean | null
          label: string
          sort_order: number | null
          updated_at: string | null
          value: string
        }
        Insert: {
          contact_type: string
          created_at?: string | null
          icon_name: string
          id?: string
          is_active?: boolean | null
          label: string
          sort_order?: number | null
          updated_at?: string | null
          value: string
        }
        Update: {
          contact_type?: string
          created_at?: string | null
          icon_name?: string
          id?: string
          is_active?: boolean | null
          label?: string
          sort_order?: number | null
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      cookie_banner_config: {
        Row: {
          accept_button_text: string
          banner_position: string
          created_at: string
          customize_button_text: string
          description: string
          heading: string
          id: string
          is_active: boolean | null
          reject_button_text: string
          updated_at: string
        }
        Insert: {
          accept_button_text?: string
          banner_position?: string
          created_at?: string
          customize_button_text?: string
          description?: string
          heading?: string
          id?: string
          is_active?: boolean | null
          reject_button_text?: string
          updated_at?: string
        }
        Update: {
          accept_button_text?: string
          banner_position?: string
          created_at?: string
          customize_button_text?: string
          description?: string
          heading?: string
          id?: string
          is_active?: boolean | null
          reject_button_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      cookie_categories: {
        Row: {
          created_at: string
          description: string
          id: string
          is_active: boolean | null
          is_required: boolean
          name: string
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean
          name: string
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean
          name?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      cookie_consent_logs: {
        Row: {
          consent_preferences: Json
          consent_timestamp: string
          created_at: string
          id: string
          ip_hash: string | null
          session_id: string
          user_id: string | null
        }
        Insert: {
          consent_preferences?: Json
          consent_timestamp?: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          session_id: string
          user_id?: string | null
        }
        Update: {
          consent_preferences?: Json
          consent_timestamp?: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      coupon_usage: {
        Row: {
          coupon_id: string
          discount_amount: number
          id: string
          order_id: string
          used_at: string
          user_id: string
        }
        Insert: {
          coupon_id: string
          discount_amount: number
          id?: string
          order_id: string
          used_at?: string
          user_id: string
        }
        Update: {
          coupon_id?: string
          discount_amount?: number
          id?: string
          order_id?: string
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          applicable_categories: string[] | null
          applicable_games: string[] | null
          applicable_products: string[] | null
          code: string
          created_at: string
          created_by: string | null
          current_uses: number
          description: string | null
          discount_percentage: number
          expires_at: string | null
          first_order_only: boolean | null
          id: string
          is_active: boolean
          max_uses: number | null
          max_uses_per_user: number | null
          min_order_amount: number | null
          promo_banner_color: string | null
          promo_banner_text: string | null
          show_on_pages: string[] | null
          updated_at: string
        }
        Insert: {
          applicable_categories?: string[] | null
          applicable_games?: string[] | null
          applicable_products?: string[] | null
          code: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          description?: string | null
          discount_percentage: number
          expires_at?: string | null
          first_order_only?: boolean | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          max_uses_per_user?: number | null
          min_order_amount?: number | null
          promo_banner_color?: string | null
          promo_banner_text?: string | null
          show_on_pages?: string[] | null
          updated_at?: string
        }
        Update: {
          applicable_categories?: string[] | null
          applicable_games?: string[] | null
          applicable_products?: string[] | null
          code?: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          description?: string | null
          discount_percentage?: number
          expires_at?: string | null
          first_order_only?: boolean | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          max_uses_per_user?: number | null
          min_order_amount?: number | null
          promo_banner_color?: string | null
          promo_banner_text?: string | null
          show_on_pages?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      deleted_urls: {
        Row: {
          content_id: string | null
          content_type: string
          created_at: string
          deleted_at: string
          deleted_by: string | null
          id: string
          original_title: string | null
          url_path: string
        }
        Insert: {
          content_id?: string | null
          content_type: string
          created_at?: string
          deleted_at?: string
          deleted_by?: string | null
          id?: string
          original_title?: string | null
          url_path: string
        }
        Update: {
          content_id?: string | null
          content_type?: string
          created_at?: string
          deleted_at?: string
          deleted_by?: string | null
          id?: string
          original_title?: string | null
          url_path?: string
        }
        Relationships: []
      }
      discord_config: {
        Row: {
          created_at: string
          description: string
          discord_url: string
          heading: string
          id: string
          is_active: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          discord_url: string
          heading?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          discord_url?: string
          heading?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          base_currency: string
          created_at: string
          id: string
          last_updated: string
          rate: number
          target_currency: string
        }
        Insert: {
          base_currency?: string
          created_at?: string
          id?: string
          last_updated?: string
          rate: number
          target_currency: string
        }
        Update: {
          base_currency?: string
          created_at?: string
          id?: string
          last_updated?: string
          rate?: number
          target_currency?: string
        }
        Relationships: []
      }
      faq_generation_logs: {
        Row: {
          created_at: string | null
          created_by: string | null
          error_message: string | null
          game_id: string | null
          id: string
          operation_type: string
          processing_time_ms: number | null
          product_id: string | null
          questions_generated: number | null
          status: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          game_id?: string | null
          id?: string
          operation_type: string
          processing_time_ms?: number | null
          product_id?: string | null
          questions_generated?: number | null
          status: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          game_id?: string | null
          id?: string
          operation_type?: string
          processing_time_ms?: number | null
          product_id?: string | null
          questions_generated?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "faq_generation_logs_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faq_generation_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "popular_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faq_generation_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      footer_links: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          label: string
          section_id: string | null
          sort_order: number | null
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          section_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          section_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "footer_links_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "footer_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      footer_sections: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          slug: string
          sort_order: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          slug: string
          sort_order?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          slug?: string
          sort_order?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      g2g_price_history: {
        Row: {
          created_at: string
          g2g_price: number
          id: string
          markup_applied: number
          our_price: number
          price_unit: number
          sync_config_id: string
        }
        Insert: {
          created_at?: string
          g2g_price: number
          id?: string
          markup_applied: number
          our_price: number
          price_unit: number
          sync_config_id: string
        }
        Update: {
          created_at?: string
          g2g_price?: number
          id?: string
          markup_applied?: number
          our_price?: number
          price_unit?: number
          sync_config_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "g2g_price_history_sync_config_id_fkey"
            columns: ["sync_config_id"]
            isOneToOne: false
            referencedRelation: "g2g_price_sync"
            referencedColumns: ["id"]
          },
        ]
      }
      g2g_price_sync: {
        Row: {
          api_url: string | null
          created_at: string
          g2g_url: string
          id: string
          is_active: boolean
          last_g2g_price: number | null
          last_our_price: number | null
          last_sync_at: string | null
          last_sync_error: string | null
          last_sync_status: string | null
          markup_percentage: number
          option_label: string | null
          price_unit: number
          price_unit_label: string
          product_id: string
          product_option_id: string | null
          scrape_method: string | null
          sync_interval_hours: number
          sync_type: string
          target_seller: string | null
          updated_at: string
        }
        Insert: {
          api_url?: string | null
          created_at?: string
          g2g_url: string
          id?: string
          is_active?: boolean
          last_g2g_price?: number | null
          last_our_price?: number | null
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          markup_percentage?: number
          option_label?: string | null
          price_unit?: number
          price_unit_label?: string
          product_id: string
          product_option_id?: string | null
          scrape_method?: string | null
          sync_interval_hours?: number
          sync_type?: string
          target_seller?: string | null
          updated_at?: string
        }
        Update: {
          api_url?: string | null
          created_at?: string
          g2g_url?: string
          id?: string
          is_active?: boolean
          last_g2g_price?: number | null
          last_our_price?: number | null
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          markup_percentage?: number
          option_label?: string | null
          price_unit?: number
          price_unit_label?: string
          product_id?: string
          product_option_id?: string | null
          scrape_method?: string | null
          sync_interval_hours?: number
          sync_type?: string
          target_seller?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "g2g_price_sync_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "popular_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "g2g_price_sync_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "g2g_price_sync_product_option_id_fkey"
            columns: ["product_option_id"]
            isOneToOne: false
            referencedRelation: "product_options"
            referencedColumns: ["id"]
          },
        ]
      }
      game_faqs: {
        Row: {
          answer: string
          created_at: string | null
          game_id: string
          generated_by: string | null
          id: string
          is_active: boolean | null
          question: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          answer: string
          created_at?: string | null
          game_id: string
          generated_by?: string | null
          id?: string
          is_active?: boolean | null
          question: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          answer?: string
          created_at?: string | null
          game_id?: string
          generated_by?: string | null
          id?: string
          is_active?: boolean | null
          question?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_faqs_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      game_genre_assignments: {
        Row: {
          created_at: string | null
          game_id: string
          genre_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          game_id: string
          genre_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          game_id?: string
          genre_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_genre_assignments_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_genre_assignments_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "game_genres"
            referencedColumns: ["id"]
          },
        ]
      }
      game_genres: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      games: {
        Row: {
          canonical_url: string | null
          created_at: string | null
          description: string | null
          game_platform: string | null
          hero_image_position: string | null
          hero_image_url: string | null
          icon_url: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_popular: boolean | null
          meta_description: string | null
          meta_keywords: string | null
          meta_title: string | null
          name: string
          og_image: string | null
          product_bg_image_url: string | null
          robots: string | null
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          canonical_url?: string | null
          created_at?: string | null
          description?: string | null
          game_platform?: string | null
          hero_image_position?: string | null
          hero_image_url?: string | null
          icon_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_popular?: boolean | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          name: string
          og_image?: string | null
          product_bg_image_url?: string | null
          robots?: string | null
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          canonical_url?: string | null
          created_at?: string | null
          description?: string | null
          game_platform?: string | null
          hero_image_position?: string | null
          hero_image_url?: string | null
          icon_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_popular?: boolean | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          name?: string
          og_image?: string | null
          product_bg_image_url?: string | null
          robots?: string | null
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      global_review_config: {
        Row: {
          average_rating: number
          created_at: string
          id: string
          is_active: boolean | null
          reviews_io_url: string | null
          total_reviews: number
          trustpilot_url: string | null
          updated_at: string
        }
        Insert: {
          average_rating?: number
          created_at?: string
          id?: string
          is_active?: boolean | null
          reviews_io_url?: string | null
          total_reviews?: number
          trustpilot_url?: string | null
          updated_at?: string
        }
        Update: {
          average_rating?: number
          created_at?: string
          id?: string
          is_active?: boolean | null
          reviews_io_url?: string | null
          total_reviews?: number
          trustpilot_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      how_it_works_showcase: {
        Row: {
          created_at: string | null
          description: string
          features: Json
          id: string
          is_active: boolean | null
          rating: string
          reviews: string
          sort_order: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          features?: Json
          id?: string
          is_active?: boolean | null
          rating: string
          reviews: string
          sort_order?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          features?: Json
          id?: string
          is_active?: boolean | null
          rating?: string
          reviews?: string
          sort_order?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      how_it_works_steps: {
        Row: {
          created_at: string | null
          description: string
          highlight: string
          icon_name: string
          id: string
          is_active: boolean | null
          number: string
          sort_order: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          highlight: string
          icon_name: string
          id?: string
          is_active?: boolean | null
          number: string
          sort_order?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          highlight?: string
          icon_name?: string
          id?: string
          is_active?: boolean | null
          number?: string
          sort_order?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      inquiry_rate_limits: {
        Row: {
          created_at: string
          id: string
          ip_address: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string
        }
        Relationships: []
      }
      mfa_settings: {
        Row: {
          created_at: string | null
          enforced_at: string | null
          enforced_by: string | null
          id: string
          is_enforced: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          enforced_at?: string | null
          enforced_by?: string | null
          id?: string
          is_enforced?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          enforced_at?: string | null
          enforced_by?: string | null
          id?: string
          is_enforced?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number | null
          selected_options: Json | null
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number | null
          selected_options?: Json | null
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number | null
          selected_options?: Json | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "popular_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string | null
          cashback_earned: number
          cashback_used: number
          contact_details: string | null
          country: string | null
          coupon_discount: number
          coupon_id: string | null
          created_at: string | null
          customer_email: string
          customer_name: string | null
          id: string
          notes: string | null
          order_number: string
          referral_discount: number
          referrer_id: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          total_amount: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          cashback_earned?: number
          cashback_used?: number
          contact_details?: string | null
          country?: string | null
          coupon_discount?: number
          coupon_id?: string | null
          created_at?: string | null
          customer_email: string
          customer_name?: string | null
          id?: string
          notes?: string | null
          order_number: string
          referral_discount?: number
          referrer_id?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_amount: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          cashback_earned?: number
          cashback_used?: number
          contact_details?: string | null
          country?: string | null
          coupon_discount?: number
          coupon_id?: string | null
          created_at?: string | null
          customer_email?: string
          customer_name?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          referral_discount?: number
          referrer_id?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_amount?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "admin_user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      password_failed_verification_attempts: {
        Row: {
          failed_attempts: number | null
          last_failed_at: string | null
          user_id: string
        }
        Insert: {
          failed_attempts?: number | null
          last_failed_at?: string | null
          user_id: string
        }
        Update: {
          failed_attempts?: number | null
          last_failed_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      payment_icons: {
        Row: {
          created_at: string
          icon_url: string
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon_url: string
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon_url?: string
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          config: Json
          created_at: string | null
          fee_text: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          type: string
          updated_at: string | null
        }
        Insert: {
          config?: Json
          created_at?: string | null
          fee_text?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          type: string
          updated_at?: string | null
        }
        Update: {
          config?: Json
          created_at?: string | null
          fee_text?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      price_change_log: {
        Row: {
          approved_by: string | null
          change_percent: number
          change_source: string
          created_at: string | null
          id: string
          new_price: number
          notes: string | null
          old_price: number
          price_entity_id: string | null
          product_id: string | null
          rule_id: string | null
        }
        Insert: {
          approved_by?: string | null
          change_percent: number
          change_source: string
          created_at?: string | null
          id?: string
          new_price: number
          notes?: string | null
          old_price: number
          price_entity_id?: string | null
          product_id?: string | null
          rule_id?: string | null
        }
        Update: {
          approved_by?: string | null
          change_percent?: number
          change_source?: string
          created_at?: string | null
          id?: string
          new_price?: number
          notes?: string | null
          old_price?: number
          price_entity_id?: string | null
          product_id?: string | null
          rule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_change_log_price_entity_id_fkey"
            columns: ["price_entity_id"]
            isOneToOne: false
            referencedRelation: "price_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_change_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "popular_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_change_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_change_log_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "pricing_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      price_comparisons: {
        Row: {
          calculated_at: string | null
          competitor_name: string
          competitor_price: number
          difference_percent: number
          id: string
          mapping_id: string | null
          my_price: number
          price_entity_id: string | null
          recommendation_reason: string | null
          recommended_price: number | null
          status: string
        }
        Insert: {
          calculated_at?: string | null
          competitor_name: string
          competitor_price: number
          difference_percent: number
          id?: string
          mapping_id?: string | null
          my_price: number
          price_entity_id?: string | null
          recommendation_reason?: string | null
          recommended_price?: number | null
          status: string
        }
        Update: {
          calculated_at?: string | null
          competitor_name?: string
          competitor_price?: number
          difference_percent?: number
          id?: string
          mapping_id?: string | null
          my_price?: number
          price_entity_id?: string | null
          recommendation_reason?: string | null
          recommended_price?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_comparisons_mapping_id_fkey"
            columns: ["mapping_id"]
            isOneToOne: false
            referencedRelation: "product_mappings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_comparisons_price_entity_id_fkey"
            columns: ["price_entity_id"]
            isOneToOne: false
            referencedRelation: "price_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      price_entities: {
        Row: {
          base_quantity: number | null
          category_name: string
          currency: string | null
          entity_type: string
          game_name: string
          id: string
          last_updated: string | null
          option_value_label: string | null
          price: number
          price_per_unit: number | null
          product_id: string | null
          product_name: string
          product_option_id: string | null
          product_slug: string
          quantity_unit: string | null
        }
        Insert: {
          base_quantity?: number | null
          category_name: string
          currency?: string | null
          entity_type: string
          game_name: string
          id?: string
          last_updated?: string | null
          option_value_label?: string | null
          price: number
          price_per_unit?: number | null
          product_id?: string | null
          product_name: string
          product_option_id?: string | null
          product_slug: string
          quantity_unit?: string | null
        }
        Update: {
          base_quantity?: number | null
          category_name?: string
          currency?: string | null
          entity_type?: string
          game_name?: string
          id?: string
          last_updated?: string | null
          option_value_label?: string | null
          price?: number
          price_per_unit?: number | null
          product_id?: string | null
          product_name?: string
          product_option_id?: string | null
          product_slug?: string
          quantity_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_entities_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "popular_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_entities_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_entities_product_option_id_fkey"
            columns: ["product_option_id"]
            isOneToOne: false
            referencedRelation: "product_options"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_rules: {
        Row: {
          category_id: string | null
          competitor_id: string | null
          created_at: string | null
          game_id: string | null
          id: string
          is_active: boolean | null
          max_decrease_percent: number | null
          min_price_floor: number | null
          name: string
          product_id: string | null
          require_approval: boolean | null
          rule_type: string
          scope: string | null
          updated_at: string | null
          value: number
        }
        Insert: {
          category_id?: string | null
          competitor_id?: string | null
          created_at?: string | null
          game_id?: string | null
          id?: string
          is_active?: boolean | null
          max_decrease_percent?: number | null
          min_price_floor?: number | null
          name: string
          product_id?: string | null
          require_approval?: boolean | null
          rule_type: string
          scope?: string | null
          updated_at?: string | null
          value: number
        }
        Update: {
          category_id?: string | null
          competitor_id?: string | null
          created_at?: string | null
          game_id?: string | null
          id?: string
          is_active?: boolean | null
          max_decrease_percent?: number | null
          min_price_floor?: number | null
          name?: string
          product_id?: string | null
          require_approval?: boolean | null
          rule_type?: string
          scope?: string | null
          updated_at?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "pricing_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_rules_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "competitor_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_rules_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_rules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "popular_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_rules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_drafts: {
        Row: {
          base_price: number | null
          category_id: string | null
          created_at: string
          created_by: string | null
          delivery_method: string | null
          description: string | null
          faqs: Json | null
          game_id: string | null
          how_it_works: string | null
          id: string
          image_alt_text: string | null
          is_slider_product: boolean | null
          meta_description: string | null
          meta_keywords: string | null
          meta_title: string | null
          name: string
          notes: string | null
          product_type: Database["public"]["Enums"]["product_generator_type"]
          region_platform: string | null
          requirements: string | null
          short_description: string | null
          similarity_score: number | null
          slider_config: Json | null
          slug: string
          source_content: string | null
          source_url: string
          status: string
          tags: string[] | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          base_price?: number | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          delivery_method?: string | null
          description?: string | null
          faqs?: Json | null
          game_id?: string | null
          how_it_works?: string | null
          id?: string
          image_alt_text?: string | null
          is_slider_product?: boolean | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          name: string
          notes?: string | null
          product_type?: Database["public"]["Enums"]["product_generator_type"]
          region_platform?: string | null
          requirements?: string | null
          short_description?: string | null
          similarity_score?: number | null
          slider_config?: Json | null
          slug: string
          source_content?: string | null
          source_url: string
          status?: string
          tags?: string[] | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          base_price?: number | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          delivery_method?: string | null
          description?: string | null
          faqs?: Json | null
          game_id?: string | null
          how_it_works?: string | null
          id?: string
          image_alt_text?: string | null
          is_slider_product?: boolean | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          name?: string
          notes?: string | null
          product_type?: Database["public"]["Enums"]["product_generator_type"]
          region_platform?: string | null
          requirements?: string | null
          short_description?: string | null
          similarity_score?: number | null
          slider_config?: Json | null
          slug?: string
          source_content?: string | null
          source_url?: string
          status?: string
          tags?: string[] | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_drafts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_drafts_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      product_faqs: {
        Row: {
          answer: string
          created_at: string | null
          generated_by: string | null
          id: string
          is_active: boolean | null
          product_id: string
          question: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          answer: string
          created_at?: string | null
          generated_by?: string | null
          id?: string
          is_active?: boolean | null
          product_id: string
          question: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          answer?: string
          created_at?: string | null
          generated_by?: string | null
          id?: string
          is_active?: boolean | null
          product_id?: string
          question?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_faqs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "popular_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_faqs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_guarantees: {
        Row: {
          created_at: string
          icon_name: string
          id: string
          is_active: boolean | null
          sort_order: number | null
          subtitle: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon_name: string
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          subtitle: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon_name?: string
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          subtitle?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_inquiries: {
        Row: {
          created_at: string | null
          customer_email: string
          customer_name: string
          id: string
          message: string
          product_name: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_email: string
          customer_name: string
          id?: string
          message: string
          product_name?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_email?: string
          customer_name?: string
          id?: string
          message?: string
          product_name?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      product_mappings: {
        Row: {
          competitor_id: string | null
          competitor_price_id: string | null
          competitor_url: string
          created_at: string | null
          id: string
          is_active: boolean | null
          match_confidence: number | null
          match_type: string | null
          price_entity_id: string | null
          updated_at: string | null
        }
        Insert: {
          competitor_id?: string | null
          competitor_price_id?: string | null
          competitor_url: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          match_confidence?: number | null
          match_type?: string | null
          price_entity_id?: string | null
          updated_at?: string | null
        }
        Update: {
          competitor_id?: string | null
          competitor_price_id?: string | null
          competitor_url?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          match_confidence?: number | null
          match_type?: string | null
          price_entity_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_mappings_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "competitor_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_mappings_competitor_price_id_fkey"
            columns: ["competitor_price_id"]
            isOneToOne: false
            referencedRelation: "competitor_prices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_mappings_price_entity_id_fkey"
            columns: ["price_entity_id"]
            isOneToOne: false
            referencedRelation: "price_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      product_options: {
        Row: {
          created_at: string | null
          default_value: string | null
          id: string
          is_required: boolean | null
          label: string
          max_value: number | null
          min_value: number | null
          name: string
          option_type: Database["public"]["Enums"]["option_type"]
          options: Json | null
          percentage_applies_to_cumulative: boolean
          price_modifier: number | null
          price_modifier_type: string | null
          product_id: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_value?: string | null
          id?: string
          is_required?: boolean | null
          label: string
          max_value?: number | null
          min_value?: number | null
          name: string
          option_type: Database["public"]["Enums"]["option_type"]
          options?: Json | null
          percentage_applies_to_cumulative?: boolean
          price_modifier?: number | null
          price_modifier_type?: string | null
          product_id: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_value?: string | null
          id?: string
          is_required?: boolean | null
          label?: string
          max_value?: number | null
          min_value?: number | null
          name?: string
          option_type?: Database["public"]["Enums"]["option_type"]
          options?: Json | null
          percentage_applies_to_cumulative?: boolean
          price_modifier?: number | null
          price_modifier_type?: string | null
          product_id?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_options_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "popular_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_options_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_rewards: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          generated_at: string
          id: string
          is_approved: boolean
          product_id: string
          rewards_content: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          generated_at?: string
          id?: string
          is_approved?: boolean
          product_id: string
          rewards_content: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          generated_at?: string
          id?: string
          is_approved?: boolean
          product_id?: string
          rewards_content?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_rewards_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "popular_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_rewards_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_trust_badges: {
        Row: {
          created_at: string | null
          description: string
          icon_name: string
          id: string
          is_active: boolean | null
          sort_order: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          icon_name: string
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          icon_name?: string
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          badge_text: string | null
          base_price: number
          canonical_url: string | null
          category_id: string
          created_at: string | null
          delivery_text: string | null
          delivery_value: string | null
          description: string | null
          how_it_works: string | null
          id: string
          image_alt_text: string | null
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          is_manually_popular: boolean | null
          is_slider_product: boolean | null
          meta_description: string | null
          meta_keywords: string | null
          meta_title: string | null
          name: string
          og_image: string | null
          parent_link: string | null
          requirements: string | null
          short_description: string | null
          slider_config: Json | null
          slug: string
          sort_order: number | null
          start_time_text: string | null
          start_time_value: string | null
          total_reviews: number | null
          total_sales: number | null
          trust_score: number | null
          updated_at: string | null
        }
        Insert: {
          badge_text?: string | null
          base_price: number
          canonical_url?: string | null
          category_id: string
          created_at?: string | null
          delivery_text?: string | null
          delivery_value?: string | null
          description?: string | null
          how_it_works?: string | null
          id?: string
          image_alt_text?: string | null
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_manually_popular?: boolean | null
          is_slider_product?: boolean | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          name: string
          og_image?: string | null
          parent_link?: string | null
          requirements?: string | null
          short_description?: string | null
          slider_config?: Json | null
          slug: string
          sort_order?: number | null
          start_time_text?: string | null
          start_time_value?: string | null
          total_reviews?: number | null
          total_sales?: number | null
          trust_score?: number | null
          updated_at?: string | null
        }
        Update: {
          badge_text?: string | null
          base_price?: number
          canonical_url?: string | null
          category_id?: string
          created_at?: string | null
          delivery_text?: string | null
          delivery_value?: string | null
          description?: string | null
          how_it_works?: string | null
          id?: string
          image_alt_text?: string | null
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_manually_popular?: boolean | null
          is_slider_product?: boolean | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          name?: string
          og_image?: string | null
          parent_link?: string | null
          requirements?: string | null
          short_description?: string | null
          slider_config?: Json | null
          slug?: string
          sort_order?: number | null
          start_time_text?: string | null
          start_time_value?: string | null
          total_reviews?: number | null
          total_sales?: number | null
          trust_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cashback_balance: number
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_banned: boolean | null
          referral_code: string | null
          referral_earnings: number | null
          referred_by: string | null
          total_lifetime_spending: number
          total_referrals: number | null
          updated_at: string | null
        }
        Insert: {
          cashback_balance?: number
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          is_banned?: boolean | null
          referral_code?: string | null
          referral_earnings?: number | null
          referred_by?: string | null
          total_lifetime_spending?: number
          total_referrals?: number | null
          updated_at?: string | null
        }
        Update: {
          cashback_balance?: number
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_banned?: boolean | null
          referral_code?: string | null
          referral_earnings?: number | null
          referred_by?: string | null
          total_lifetime_spending?: number
          total_referrals?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "admin_user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          identifier: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          identifier: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          identifier?: string
        }
        Relationships: []
      }
      referral_config: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          min_order_amount: number
          referee_discount_percentage: number
          referrer_percentage: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          min_order_amount?: number
          referee_discount_percentage?: number
          referrer_percentage?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          min_order_amount?: number
          referee_discount_percentage?: number
          referrer_percentage?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      referral_transactions: {
        Row: {
          created_at: string | null
          id: string
          order_id: string | null
          referee_discount: number
          referee_id: string
          referrer_id: string
          reward_amount: number
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          referee_discount?: number
          referee_id: string
          referrer_id: string
          reward_amount?: number
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          referee_discount?: number
          referee_id?: string
          referrer_id?: string
          reward_amount?: number
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_transactions_referee_id_fkey"
            columns: ["referee_id"]
            isOneToOne: false
            referencedRelation: "admin_user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_transactions_referee_id_fkey"
            columns: ["referee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_transactions_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "admin_user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_transactions_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      review_platforms: {
        Row: {
          average_rating: number | null
          created_at: string
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          primary_color: string
          slug: string
          sort_order: number | null
          total_reviews: number | null
          updated_at: string
          url: string
        }
        Insert: {
          average_rating?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          primary_color?: string
          slug: string
          sort_order?: number | null
          total_reviews?: number | null
          updated_at?: string
          url: string
        }
        Update: {
          average_rating?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          primary_color?: string
          slug?: string
          sort_order?: number | null
          total_reviews?: number | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author_name: string
          content: string
          created_at: string
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          is_verified: boolean | null
          platform_id: string
          posted_at: string
          rating: number
          review_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_name: string
          content: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          is_verified?: boolean | null
          platform_id: string
          posted_at: string
          rating: number
          review_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          is_verified?: boolean | null
          platform_id?: string
          posted_at?: string
          rating?: number
          review_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "review_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          created_at: string
          error_code: string | null
          error_message: string | null
          event_category: string | null
          function_name: string
          id: string
          ip_address: string | null
          operation_details: Json | null
          request_id: string | null
          severity: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          event_category?: string | null
          function_name: string
          id?: string
          ip_address?: string | null
          operation_details?: Json | null
          request_id?: string | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          event_category?: string | null
          function_name?: string
          id?: string
          ip_address?: string | null
          operation_details?: Json | null
          request_id?: string | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      seo_generation_logs: {
        Row: {
          created_at: string | null
          created_by: string | null
          error_message: string | null
          id: string
          new_values: Json
          old_values: Json | null
          operation_type: string
          processing_time_ms: number | null
          product_id: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          new_values: Json
          old_values?: Json | null
          operation_type: string
          processing_time_ms?: number | null
          product_id?: string | null
          status: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          new_values?: Json
          old_values?: Json | null
          operation_type?: string
          processing_time_ms?: number | null
          product_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_generation_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "popular_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_generation_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      service_highlights: {
        Row: {
          created_at: string
          description: string
          icon_name: string
          id: string
          is_active: boolean | null
          sort_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          icon_name: string
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          icon_name?: string
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_faqs: {
        Row: {
          answer: string
          created_at: string | null
          id: string
          is_active: boolean | null
          question: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          answer: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          question: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          answer?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          question?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      site_security_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      sitemap_cache: {
        Row: {
          created_at: string
          generated_at: string
          generated_by: string | null
          id: string
          updated_at: string
          url_count: number
          xml_content: string
        }
        Insert: {
          created_at?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          updated_at?: string
          url_count?: number
          xml_content: string
        }
        Update: {
          created_at?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          updated_at?: string
          url_count?: number
          xml_content?: string
        }
        Relationships: []
      }
      sitemap_config: {
        Row: {
          base_url: string
          blog_priority: number
          created_at: string
          game_priority: number
          id: string
          include_blog: boolean
          include_games: boolean
          include_products: boolean
          product_priority: number
          static_page_priority: number
          updated_at: string
        }
        Insert: {
          base_url?: string
          blog_priority?: number
          created_at?: string
          game_priority?: number
          id?: string
          include_blog?: boolean
          include_games?: boolean
          include_products?: boolean
          product_priority?: number
          static_page_priority?: number
          updated_at?: string
        }
        Update: {
          base_url?: string
          blog_priority?: number
          created_at?: string
          game_priority?: number
          id?: string
          include_blog?: boolean
          include_games?: boolean
          include_products?: boolean
          product_priority?: number
          static_page_priority?: number
          updated_at?: string
        }
        Relationships: []
      }
      sitemap_static_pages: {
        Row: {
          changefreq: string
          created_at: string
          id: string
          is_active: boolean
          priority: number
          sort_order: number | null
          updated_at: string
          url_path: string
        }
        Insert: {
          changefreq?: string
          created_at?: string
          id?: string
          is_active?: boolean
          priority?: number
          sort_order?: number | null
          updated_at?: string
          url_path: string
        }
        Update: {
          changefreq?: string
          created_at?: string
          id?: string
          is_active?: boolean
          priority?: number
          sort_order?: number | null
          updated_at?: string
          url_path?: string
        }
        Relationships: []
      }
      social_links: {
        Row: {
          created_at: string | null
          icon_name: string
          id: string
          is_active: boolean | null
          platform: string
          sort_order: number | null
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          icon_name: string
          id?: string
          is_active?: boolean | null
          platform: string
          sort_order?: number | null
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          icon_name?: string
          id?: string
          is_active?: boolean | null
          platform?: string
          sort_order?: number | null
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      subcategories: {
        Row: {
          category_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      supported_languages: {
        Row: {
          code: string
          created_at: string | null
          currency_format: string | null
          date_format: string | null
          formality: string | null
          is_active: boolean | null
          is_rtl: boolean | null
          locale: string
          name: string
          native_name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          currency_format?: string | null
          date_format?: string | null
          formality?: string | null
          is_active?: boolean | null
          is_rtl?: boolean | null
          locale: string
          name: string
          native_name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          currency_format?: string | null
          date_format?: string | null
          formality?: string | null
          is_active?: boolean | null
          is_rtl?: boolean | null
          locale?: string
          name?: string
          native_name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      translations: {
        Row: {
          created_at: string | null
          id: string
          language_code: string
          original_hash: string
          seo_optimized: boolean | null
          source_field: string
          source_id: string
          source_table: string
          translated_text: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          language_code: string
          original_hash: string
          seo_optimized?: boolean | null
          source_field: string
          source_id: string
          source_table: string
          translated_text: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          language_code?: string
          original_hash?: string
          seo_optimized?: boolean | null
          source_field?: string
          source_id?: string
          source_table?: string
          translated_text?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      url_redirects: {
        Row: {
          created_at: string | null
          created_by: string | null
          destination_path: string
          hit_count: number | null
          id: string
          is_active: boolean | null
          is_pattern: boolean | null
          last_hit_at: string | null
          notes: string | null
          source_path: string
          status_code: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          destination_path: string
          hit_count?: number | null
          id?: string
          is_active?: boolean | null
          is_pattern?: boolean | null
          last_hit_at?: string | null
          notes?: string | null
          source_path: string
          status_code?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          destination_path?: string
          hit_count?: number | null
          id?: string
          is_active?: boolean | null
          is_pattern?: boolean | null
          last_hit_at?: string | null
          notes?: string | null
          source_path?: string
          status_code?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      why_we_features: {
        Row: {
          created_at: string | null
          description: string
          icon_name: string
          id: string
          is_active: boolean | null
          sort_order: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          icon_name: string
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          icon_name?: string
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      work_applications: {
        Row: {
          age: number
          booster_type: string
          boosting_experience: string
          country: string
          created_at: string
          discord_name: string
          email: string
          games: string
          hours_available: string
          how_found_us: string
          id: string
          marketplace_profiles: string | null
          notes: string | null
          phone_number: string | null
          proof_urls: Json | null
          services: string
          status: string | null
          updated_at: string
        }
        Insert: {
          age: number
          booster_type: string
          boosting_experience: string
          country: string
          created_at?: string
          discord_name: string
          email: string
          games: string
          hours_available: string
          how_found_us: string
          id?: string
          marketplace_profiles?: string | null
          notes?: string | null
          phone_number?: string | null
          proof_urls?: Json | null
          services: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          age?: number
          booster_type?: string
          boosting_experience?: string
          country?: string
          created_at?: string
          discord_name?: string
          email?: string
          games?: string
          hours_available?: string
          how_found_us?: string
          id?: string
          marketplace_profiles?: string | null
          notes?: string | null
          phone_number?: string | null
          proof_urls?: Json | null
          services?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      admin_user_stats: {
        Row: {
          cashback_balance: number | null
          email: string | null
          full_name: string | null
          id: string | null
          is_banned: boolean | null
          last_sign_in_at: string | null
          order_count: number | null
          paid_amount: number | null
          recent_order_number: string | null
          recent_purchase_date: string | null
          referral_code: string | null
          referral_earnings: number | null
          referred_by: string | null
          registration_date: string | null
          total_cashback_used: number | null
          total_coupon_discount: number | null
          total_lifetime_spending: number | null
          total_referral_discount: number | null
          total_referrals: number | null
          total_spent: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "admin_user_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      popular_products: {
        Row: {
          badge_text: string | null
          base_price: number | null
          category_id: string | null
          created_at: string | null
          description: string | null
          how_it_works: string | null
          id: string | null
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          is_manually_popular: boolean | null
          is_popular: boolean | null
          is_slider_product: boolean | null
          name: string | null
          requirements: string | null
          short_description: string | null
          slider_config: Json | null
          slug: string | null
          sort_order: number | null
          total_reviews: number | null
          trust_score: number | null
          updated_at: string | null
        }
        Insert: {
          badge_text?: string | null
          base_price?: number | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          how_it_works?: string | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_manually_popular?: boolean | null
          is_popular?: never
          is_slider_product?: boolean | null
          name?: string | null
          requirements?: string | null
          short_description?: string | null
          slider_config?: Json | null
          slug?: string | null
          sort_order?: number | null
          total_reviews?: number | null
          trust_score?: number | null
          updated_at?: string | null
        }
        Update: {
          badge_text?: string | null
          base_price?: number | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          how_it_works?: string | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_manually_popular?: boolean | null
          is_popular?: never
          is_slider_product?: boolean | null
          name?: string | null
          requirements?: string | null
          short_description?: string | null
          slider_config?: Json | null
          slug?: string | null
          sort_order?: number | null
          total_reviews?: number | null
          trust_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      apply_coupon_usage: { Args: { p_coupon_id: string }; Returns: undefined }
      cleanup_expired_password_tokens: { Args: never; Returns: undefined }
      cleanup_expired_reset_tokens: { Args: never; Returns: undefined }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      generate_order_number: { Args: never; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
      get_admin_user_stats: {
        Args: never
        Returns: {
          cashback_balance: number
          email: string
          full_name: string
          id: string
          is_banned: boolean
          last_sign_in_at: string
          order_count: number
          paid_amount: number
          recent_order_number: string
          recent_purchase_date: string
          referral_code: string
          referral_earnings: number
          referred_by: string
          registration_date: string
          total_cashback_used: number
          total_coupon_discount: number
          total_lifetime_spending: number
          total_referral_discount: number
          total_referrals: number
          total_spent: number
        }[]
      }
      get_blog_post_url: { Args: { post_id: string }; Returns: string }
      get_category_url: { Args: { category_id: string }; Returns: string }
      get_game_url: { Args: { game_id: string }; Returns: string }
      get_product_url: { Args: { product_id: string }; Returns: string }
      get_public_cashback_tiers: {
        Args: never
        Returns: {
          cashback_percentage: number
          min_spending: number
          sort_order: number
          tier_name: string
        }[]
      }
      get_public_payment_methods: {
        Args: never
        Returns: {
          created_at: string
          fee_text: string
          id: string
          is_active: boolean
          logo_url: string
          name: string
          type: string
          updated_at: string
        }[]
      }
      get_user_tier: {
        Args: { p_pending_amount?: number; p_user_id: string }
        Returns: {
          current_spending: number
          min_spending: number
          next_tier_min_spending: number
          next_tier_name: string
          spending_to_next_tier: number
          tier_id: string
          tier_name: string
          tier_percentage: number
        }[]
      }
      get_visible_coupons: {
        Args: { p_page_id?: string; p_page_type: string }
        Returns: {
          code: string
          description: string
          discount_percentage: number
          expires_at: string
          id: string
          min_order_amount: number
          promo_banner_color: string
          promo_banner_text: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hook_password_verification_attempt: {
        Args: { event: Json }
        Returns: Json
      }
      increment_redirect_hit: {
        Args: { p_redirect_id: string }
        Returns: undefined
      }
      log_security_event: {
        Args: {
          p_error_code?: string
          p_error_message?: string
          p_event_category?: string
          p_function_name: string
          p_operation_details?: Json
          p_request_id?: string
          p_severity?: string
          p_user_agent?: string
          p_user_id?: string
        }
        Returns: undefined
      }
      process_order_cashback: {
        Args: {
          p_cashback_earned: number
          p_cashback_used: number
          p_order_amount: number
          p_order_id: string
          p_user_id: string
        }
        Returns: Json
      }
      process_referral_reward: {
        Args: {
          p_order_amount: number
          p_order_id: string
          p_referee_id: string
          p_referrer_id?: string
        }
        Returns: Json
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      update_exchange_rate: {
        Args: {
          p_base_currency: string
          p_rate: number
          p_target_currency: string
        }
        Returns: undefined
      }
      validate_coupon: {
        Args: { p_cart_items: Json; p_code: string; p_user_id: string }
        Returns: Json
      }
      validate_referral_code: {
        Args: { p_code: string; p_user_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
      option_type: "select" | "checkbox" | "number" | "text" | "button_group"
      order_status: "pending" | "processing" | "completed" | "cancelled"
      product_generator_type: "simple" | "single_slider" | "multi_range"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      option_type: ["select", "checkbox", "number", "text", "button_group"],
      order_status: ["pending", "processing", "completed", "cancelled"],
      product_generator_type: ["simple", "single_slider", "multi_range"],
    },
  },
} as const
