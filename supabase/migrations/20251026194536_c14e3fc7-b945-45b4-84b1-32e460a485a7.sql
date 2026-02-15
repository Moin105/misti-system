-- Create service_highlights table
CREATE TABLE public.service_highlights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  icon_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_highlights ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage service highlights"
ON public.service_highlights
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active service highlights"
ON public.service_highlights
FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_service_highlights_updated_at
BEFORE UPDATE ON public.service_highlights
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default data
INSERT INTO public.service_highlights (icon_name, title, description, sort_order, is_active) VALUES
('Headset', '24/7 Support', 'Our dedicated support team is available around the clock to assist you with any questions or concerns', 0, true),
('DollarSign', 'Easy Refunds', 'If you change your mind or encounter any issues, our hassle-free refund process ensures your satisfaction', 1, true),
('Rocket', 'Instant Replies', 'Get quick responses to your inquiries with our lightning-fast communication system', 2, true),
('Clock', 'Start in Minutes', 'Begin your experience immediately with our streamlined onboarding process', 3, true),
('ShieldCheck', 'Secure & Safe', 'Your data and transactions are protected with industry-leading security measures', 4, true);