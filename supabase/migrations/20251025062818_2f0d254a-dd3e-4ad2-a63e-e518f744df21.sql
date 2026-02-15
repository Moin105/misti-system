-- Create cookie categories table
CREATE TABLE public.cookie_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cookie banner config table
CREATE TABLE public.cookie_banner_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  heading TEXT NOT NULL DEFAULT 'We value your privacy',
  description TEXT NOT NULL DEFAULT 'We use cookies to enhance your browsing experience and analyze our traffic. Please choose your preferences.',
  accept_button_text TEXT NOT NULL DEFAULT 'Accept All',
  reject_button_text TEXT NOT NULL DEFAULT 'Reject All',
  customize_button_text TEXT NOT NULL DEFAULT 'Customize',
  is_active BOOLEAN DEFAULT true,
  banner_position TEXT NOT NULL DEFAULT 'bottom',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user consent logs table
CREATE TABLE public.cookie_consent_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT NOT NULL,
  ip_hash TEXT,
  consent_preferences JSONB NOT NULL DEFAULT '{}',
  consent_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cookie_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cookie_banner_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cookie_consent_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cookie_categories
CREATE POLICY "Anyone can view active cookie categories"
  ON public.cookie_categories FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage cookie categories"
  ON public.cookie_categories FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for cookie_banner_config
CREATE POLICY "Anyone can view active banner config"
  ON public.cookie_banner_config FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage banner config"
  ON public.cookie_banner_config FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for cookie_consent_logs
CREATE POLICY "Users can view own consent logs"
  ON public.cookie_consent_logs FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can create consent logs"
  ON public.cookie_consent_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage all consent logs"
  ON public.cookie_consent_logs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default cookie categories
INSERT INTO public.cookie_categories (name, slug, description, is_required, sort_order) VALUES
  ('Necessary', 'necessary', 'Essential cookies required for the website to function properly. These cannot be disabled.', true, 1),
  ('Analytics', 'analytics', 'Help us understand how visitors interact with our website by collecting and reporting information anonymously.', false, 2),
  ('Marketing', 'marketing', 'Used to track visitors across websites to display relevant advertisements and measure campaign effectiveness.', false, 3),
  ('Preferences', 'preferences', 'Enable the website to remember choices you make and provide enhanced, personalized features.', false, 4);

-- Insert default banner config
INSERT INTO public.cookie_banner_config (heading, description, accept_button_text, reject_button_text, customize_button_text, banner_position) VALUES
  ('We value your privacy', 'We use cookies to enhance your browsing experience and analyze our traffic. Please choose your preferences.', 'Accept All', 'Reject All', 'Customize', 'bottom');

-- Create trigger for updated_at
CREATE TRIGGER update_cookie_categories_updated_at
  BEFORE UPDATE ON public.cookie_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cookie_banner_config_updated_at
  BEFORE UPDATE ON public.cookie_banner_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();