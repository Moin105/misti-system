-- Create table for About Us statistics
CREATE TABLE IF NOT EXISTS public.about_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  value text NOT NULL,
  label text NOT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.about_stats ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage about stats"
  ON public.about_stats
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active about stats"
  ON public.about_stats
  FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_about_stats_updated_at
  BEFORE UPDATE ON public.about_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default stats
INSERT INTO public.about_stats (value, label, sort_order) VALUES
  ('10,000+', 'Happy Customers', 1),
  ('50,000+', 'Orders Completed', 2),
  ('24/7', 'Support Available', 3),
  ('4.9/5', 'Customer Rating', 4);