-- Create site_faqs table for landing page FAQs
CREATE TABLE public.site_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_faqs ENABLE ROW LEVEL SECURITY;

-- Public read access for active FAQs
CREATE POLICY "Anyone can view active site FAQs" 
  ON public.site_faqs FOR SELECT 
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

-- Admin write access
CREATE POLICY "Admins can manage site FAQs" 
  ON public.site_faqs FOR ALL 
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create updated_at trigger
CREATE TRIGGER update_site_faqs_updated_at
  BEFORE UPDATE ON public.site_faqs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial FAQs
INSERT INTO public.site_faqs (question, answer, sort_order) VALUES
('Is my account safe during boosting services?', 'Absolutely! We prioritize account security above all else. Our professional boosters use VPN protection matching your location, follow strict security protocols, and never share your credentials. We also offer offline mode for sensitive accounts.', 1),
('What payment methods do you accept?', 'We accept all major payment methods including credit/debit cards (Visa, Mastercard, American Express), PayPal, cryptocurrency, and various regional payment options. All transactions are securely processed with industry-standard encryption.', 2),
('How long does delivery take?', 'Delivery times vary by service type. Most orders begin within 1-24 hours of purchase. Gold and currency deliveries are typically instant to a few hours, while boosting services depend on the scope of work. You can track progress in real-time through your account dashboard.', 3),
('What is your refund policy?', 'We offer a satisfaction guarantee on all services. If we cannot complete your order or you are unsatisfied with the service, we provide full or partial refunds depending on the situation. Contact our support team within 48 hours of any issues.', 4),
('How do I communicate with my booster?', 'Once your order is assigned, you can communicate directly with your booster through our secure messaging system in your account dashboard. You will also receive email updates on order progress and can contact our 24/7 support team anytime.', 5),
('Do you offer discounts for returning customers?', 'Yes! We have a cashback loyalty program where you earn cashback on every purchase based on your tier level. You can also use referral codes for additional discounts and check our promotions page for seasonal offers.', 6)