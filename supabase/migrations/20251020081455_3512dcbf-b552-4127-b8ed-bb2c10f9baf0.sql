-- Create table for Why We features
CREATE TABLE public.why_we_features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.why_we_features ENABLE ROW LEVEL SECURITY;

-- Policies for why_we_features
CREATE POLICY "Admins can manage why we features"
  ON public.why_we_features
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active why we features"
  ON public.why_we_features
  FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_why_we_features_updated_at
  BEFORE UPDATE ON public.why_we_features
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default data
INSERT INTO public.why_we_features (title, description, icon_name, sort_order, is_active) VALUES
  ('We respect Deadlines.', 'Our goal is to deliver you our top-notch services as fast as possible, with best care and flexible approach.', 'Clock', 0, true),
  ('We care about security.', 'We guarantee your privacy, account''s safety and secure payments using the most reliable payment methods.', 'Shield', 1, true),
  ('We bring the most Value.', 'We offer the greatest deals and prices on the market and have rewards program to reward our loyal customers.', 'DollarSign', 2, true),
  ('We guarantee Satisfaction.', 'Your 100% satisfaction with the results as a customer is a top priority for us, otherwise you will get a full refund.', 'Award', 3, true);