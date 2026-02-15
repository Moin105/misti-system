-- Create footer sections table
CREATE TABLE public.footer_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create footer links table
CREATE TABLE public.footer_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID REFERENCES public.footer_sections(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create social links table
CREATE TABLE public.social_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.footer_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.footer_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;

-- Create policies for footer_sections
CREATE POLICY "Anyone can view active footer sections"
ON public.footer_sections FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage footer sections"
ON public.footer_sections FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create policies for footer_links
CREATE POLICY "Anyone can view active footer links"
ON public.footer_links FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage footer links"
ON public.footer_links FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create policies for social_links
CREATE POLICY "Anyone can view active social links"
ON public.social_links FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage social links"
ON public.social_links FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Add triggers for updated_at
CREATE TRIGGER update_footer_sections_updated_at
BEFORE UPDATE ON public.footer_sections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_footer_links_updated_at
BEFORE UPDATE ON public.footer_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_social_links_updated_at
BEFORE UPDATE ON public.social_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default data
INSERT INTO public.footer_sections (title, slug, sort_order) VALUES
('Company', 'company', 1),
('Legal', 'legal', 2),
('Popular Services', 'popular-services', 3),
('Other Games', 'other-games', 4);

INSERT INTO public.footer_links (section_id, label, url, sort_order) VALUES
((SELECT id FROM public.footer_sections WHERE slug = 'company'), 'About us', '#', 1),
((SELECT id FROM public.footer_sections WHERE slug = 'company'), 'Work with us', '#', 2),
((SELECT id FROM public.footer_sections WHERE slug = 'company'), 'Guides', '#', 3),
((SELECT id FROM public.footer_sections WHERE slug = 'company'), 'Contact us', '#', 4),
((SELECT id FROM public.footer_sections WHERE slug = 'company'), 'Get help', '#', 5),
((SELECT id FROM public.footer_sections WHERE slug = 'company'), 'Guarantees', '#', 6),
((SELECT id FROM public.footer_sections WHERE slug = 'legal'), 'Terms and conditions', '#', 1),
((SELECT id FROM public.footer_sections WHERE slug = 'legal'), 'Privacy policy', '#', 2),
((SELECT id FROM public.footer_sections WHERE slug = 'legal'), 'Refund policy', '#', 3),
((SELECT id FROM public.footer_sections WHERE slug = 'legal'), 'Cookies policy', '#', 4);

INSERT INTO public.social_links (platform, url, icon_name, sort_order) VALUES
('Facebook', 'https://facebook.com', 'Facebook', 1),
('Instagram', 'https://instagram.com', 'Instagram', 2),
('Youtube', 'https://youtube.com', 'Youtube', 3),
('Twitter', 'https://twitter.com', 'Twitter', 4);