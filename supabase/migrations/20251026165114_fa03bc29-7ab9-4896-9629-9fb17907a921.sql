-- Create sitemap configuration table
CREATE TABLE public.sitemap_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  base_url TEXT NOT NULL DEFAULT 'https://misti.services',
  include_games BOOLEAN NOT NULL DEFAULT true,
  include_products BOOLEAN NOT NULL DEFAULT true,
  include_blog BOOLEAN NOT NULL DEFAULT true,
  game_priority NUMERIC NOT NULL DEFAULT 0.7,
  product_priority NUMERIC NOT NULL DEFAULT 0.8,
  blog_priority NUMERIC NOT NULL DEFAULT 0.6,
  static_page_priority NUMERIC NOT NULL DEFAULT 0.8,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sitemap static pages table
CREATE TABLE public.sitemap_static_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url_path TEXT NOT NULL,
  priority NUMERIC NOT NULL DEFAULT 0.8,
  changefreq TEXT NOT NULL DEFAULT 'weekly',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sitemap_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sitemap_static_pages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sitemap_config
CREATE POLICY "Anyone can view sitemap config"
  ON public.sitemap_config
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage sitemap config"
  ON public.sitemap_config
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for sitemap_static_pages
CREATE POLICY "Anyone can view active static pages"
  ON public.sitemap_static_pages
  FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage static pages"
  ON public.sitemap_static_pages
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_sitemap_config_updated_at
  BEFORE UPDATE ON public.sitemap_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sitemap_static_pages_updated_at
  BEFORE UPDATE ON public.sitemap_static_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default configuration
INSERT INTO public.sitemap_config (base_url) VALUES ('https://misti.services');

-- Insert common static pages
INSERT INTO public.sitemap_static_pages (url_path, priority, changefreq, sort_order) VALUES
  ('/', 1.0, 'daily', 1),
  ('/services', 0.9, 'weekly', 2),
  ('/about-us', 0.7, 'monthly', 3),
  ('/contact-us', 0.7, 'monthly', 4),
  ('/work-with-us', 0.6, 'monthly', 5),
  ('/blog', 0.8, 'daily', 6);