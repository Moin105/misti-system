-- Create table for payment icons display
CREATE TABLE public.payment_icons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon_url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for product guarantee/support messages
CREATE TABLE public.product_guarantees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  icon_name TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for chat CTA configuration
CREATE TABLE public.chat_cta_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  icon_name TEXT NOT NULL DEFAULT 'MessageCircle',
  button_text TEXT NOT NULL DEFAULT 'Any questions? Chat with us',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.payment_icons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_guarantees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_cta_config ENABLE ROW LEVEL SECURITY;

-- Create policies for payment_icons
CREATE POLICY "Anyone can view active payment icons"
  ON public.payment_icons
  FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage payment icons"
  ON public.payment_icons
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create policies for product_guarantees
CREATE POLICY "Anyone can view active guarantees"
  ON public.product_guarantees
  FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage guarantees"
  ON public.product_guarantees
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create policies for chat_cta_config
CREATE POLICY "Anyone can view active chat CTA"
  ON public.chat_cta_config
  FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage chat CTA"
  ON public.chat_cta_config
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default data
INSERT INTO public.payment_icons (name, icon_url, sort_order) VALUES
  ('Visa', 'https://upload.wikimedia.org/wikipedia/commons/0/04/Visa.svg', 1),
  ('Mastercard', 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg', 2),
  ('PayPal', 'https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg', 3),
  ('Apple Pay', 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_Pay_logo.svg', 4),
  ('Google Pay', 'https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg', 5);

INSERT INTO public.product_guarantees (icon_name, title, subtitle, sort_order) VALUES
  ('Target', 'Found cheaper?', 'We''ll match the price', 1),
  ('TrendingUp', 'Have progress?', 'We''ll adjust the price', 2);

INSERT INTO public.chat_cta_config (icon_name, button_text) VALUES
  ('MessageCircle', 'Any questions? Chat with us');