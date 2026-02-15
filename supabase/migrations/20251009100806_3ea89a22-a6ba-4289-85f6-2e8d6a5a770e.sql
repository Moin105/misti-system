-- Create table for How It Works steps
CREATE TABLE public.how_it_works_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  highlight TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for How It Works showcase items
CREATE TABLE public.how_it_works_showcase (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  rating TEXT NOT NULL,
  reviews TEXT NOT NULL,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.how_it_works_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.how_it_works_showcase ENABLE ROW LEVEL SECURITY;

-- RLS Policies for steps
CREATE POLICY "Anyone can view active steps"
ON public.how_it_works_steps
FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage steps"
ON public.how_it_works_steps
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for showcase
CREATE POLICY "Anyone can view active showcase items"
ON public.how_it_works_showcase
FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage showcase items"
ON public.how_it_works_showcase
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default steps
INSERT INTO public.how_it_works_steps (number, title, description, icon_name, highlight, sort_order) VALUES
('01', 'Browse our catalog and select a service or a product', 'Explore our wide range of gaming services and products. Filter by game, category, or service type to find exactly what you need.', 'ShoppingCart', 'Easy Selection', 0),
('02', 'Book your slot with payment', 'We put your money on hold in a safe place until you confirm completion. Choose your preferred payment method and secure your order.', 'MessageCircle', 'Secure Payment', 1),
('03', 'The Magic Begins!', 'Our professional team starts working on your order immediately. Track progress in real-time through your dashboard.', 'Rocket', 'Fast Service', 2),
('04', 'Confirm Completion', 'Review the completed work, verify everything meets your expectations, and confirm delivery to release payment.', 'Check', 'Quality Assured', 3);

-- Insert default showcase items
INSERT INTO public.how_it_works_showcase (title, description, rating, reviews, features, sort_order) VALUES
('Premium Boosting Services', 'Professional rank boosting across all major games', '4.9', '25,559', '["Fast Delivery", "Safe & Secure", "Professional Players"]'::jsonb, 0),
('In-Game Currency', 'Quick and secure delivery of game currency', '4.8', '18,234', '["Instant Delivery", "Best Prices", "24/7 Support"]'::jsonb, 1),
('Account Services', 'Complete account management and leveling', '4.9', '32,156', '["VPN Protection", "Professional Service", "Money-Back Guarantee"]'::jsonb, 2);