-- Create product type enum for the generator
CREATE TYPE product_generator_type AS ENUM ('simple', 'single_slider', 'multi_range');

-- Create product drafts table for storing generated drafts before publishing
CREATE TABLE public.product_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Source information
  source_url TEXT NOT NULL,
  source_content TEXT,
  similarity_score NUMERIC DEFAULT 0,
  
  -- Product type selection
  product_type product_generator_type NOT NULL DEFAULT 'simple',
  
  -- Basic product info
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  short_description TEXT,
  description TEXT,
  how_it_works TEXT,
  requirements TEXT,
  
  -- Game/Category relationship
  game_id UUID REFERENCES public.games(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  
  -- SEO fields
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT,
  image_alt_text TEXT,
  tags TEXT[],
  
  -- FAQs stored as JSON array
  faqs JSONB DEFAULT '[]'::jsonb,
  
  -- Slider configuration (for slider products)
  is_slider_product BOOLEAN DEFAULT false,
  slider_config JSONB,
  
  -- Pricing (manual entry)
  base_price NUMERIC,
  
  -- Additional input fields from user
  region_platform TEXT,
  unit TEXT,
  delivery_method TEXT,
  notes TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewing', 'published', 'rejected')),
  
  -- Audit fields
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_drafts ENABLE ROW LEVEL SECURITY;

-- Policies: Admin only access
CREATE POLICY "Admins can manage product drafts"
  ON public.product_drafts
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create updated_at trigger
CREATE TRIGGER update_product_drafts_updated_at
  BEFORE UPDATE ON public.product_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_product_drafts_status ON public.product_drafts(status);
CREATE INDEX idx_product_drafts_game_id ON public.product_drafts(game_id);
CREATE INDEX idx_product_drafts_created_at ON public.product_drafts(created_at DESC);