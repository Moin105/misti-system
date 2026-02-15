-- Create review platforms table
CREATE TABLE public.review_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#000000',
  average_rating NUMERIC(2,1) DEFAULT 5.0,
  total_reviews INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create reviews table
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id UUID NOT NULL REFERENCES public.review_platforms(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  review_url TEXT,
  posted_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.review_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- RLS policies for review_platforms
CREATE POLICY "Anyone can view active platforms"
  ON public.review_platforms FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage platforms"
  ON public.review_platforms FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS policies for reviews
CREATE POLICY "Anyone can view active reviews"
  ON public.reviews FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage reviews"
  ON public.reviews FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Add updated_at triggers
CREATE TRIGGER update_review_platforms_updated_at
  BEFORE UPDATE ON public.review_platforms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default platforms
INSERT INTO public.review_platforms (name, slug, url, primary_color, average_rating, total_reviews, sort_order) VALUES
  ('Trustpilot', 'trustpilot', 'https://www.trustpilot.com/review/misti.services', '#00B67A', 5.0, 150, 1),
  ('Reviews.io', 'reviews-io', 'https://www.reviews.io/company-reviews/store/misti.services', '#FF6700', 5.0, 200, 2);