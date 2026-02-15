-- Create CMS pages table for About Us and Contact Us
CREATE TABLE public.cms_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_published BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;

-- Anyone can view published pages
CREATE POLICY "Anyone can view published pages"
ON public.cms_pages
FOR SELECT
USING (is_published = true OR has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage pages
CREATE POLICY "Admins can manage pages"
ON public.cms_pages
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_cms_pages_updated_at
BEFORE UPDATE ON public.cms_pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default About Us page
INSERT INTO public.cms_pages (slug, title, subtitle, content, is_published) VALUES (
  'about-us',
  'About Us',
  'Professional Gaming Boost Services',
  '[
    {
      "type": "hero",
      "heading": "Who We Are",
      "subheading": "Your Trusted Gaming Partner",
      "description": "At misti.services, we are a team of dedicated gaming professionals committed to helping you achieve your gaming goals. With years of experience across multiple titles and a passion for excellence, we deliver premium boosting services that are safe, fast, and reliable."
    },
    {
      "type": "content",
      "heading": "Our Mission",
      "content": "<p>We believe every gamer deserves to experience the best their favorite games have to offer. Our mission is to provide top-tier boosting services that save you time while ensuring complete account security and satisfaction.</p><p>Whether you''re looking to reach higher ranks, complete challenging content, or unlock exclusive rewards, our expert team is here to make it happen.</p>"
    },
    {
      "type": "features",
      "heading": "Why Choose Us",
      "items": [
        {
          "icon": "Shield",
          "title": "100% Safe & Secure",
          "description": "Your account security is our top priority. We use VPN protection and never share your information."
        },
        {
          "icon": "Zap",
          "title": "Fast Delivery",
          "description": "Most orders start within 15 minutes. We value your time and deliver results quickly."
        },
        {
          "icon": "Users",
          "title": "Professional Team",
          "description": "Our boosters are experienced players with proven track records in their respective games."
        },
        {
          "icon": "Clock",
          "title": "24/7 Support",
          "description": "Our support team is always available to answer your questions and provide updates."
        }
      ]
    },
    {
      "type": "stats",
      "items": [
        {"label": "Happy Customers", "value": "5,000+"},
        {"label": "Orders Completed", "value": "10,000+"},
        {"label": "Average Rating", "value": "5.0"},
        {"label": "Years Experience", "value": "12+"}
      ]
    }
  ]'::jsonb,
  true
);

-- Insert default Contact Us page
INSERT INTO public.cms_pages (slug, title, subtitle, content, is_published) VALUES (
  'contact-us',
  'Contact Us',
  'Get in Touch With Our Team',
  '[
    {
      "type": "hero",
      "heading": "Stay Connected With Us",
      "subheading": "Join Our Discord",
      "description": "Don''t miss out on special deals exclusive to Discord users. Every day, we post unique flash deals at incredibly tasty prices for our Discord users. Take advantage of our Flash deals that are available for a limited time."
    },
    {
      "type": "contact_cta",
      "heading": "Need Help?",
      "content": "<p>Our friendly and expert MonsiteR team is here to assist you with any questions regarding orders and to help you choose the most suitable time for your boosts.</p><p>Most importantly, if you can''t find the service you need on our website, reach out to us, and we''ll find a solution for you.</p>"
    }
  ]'::jsonb,
  true
);