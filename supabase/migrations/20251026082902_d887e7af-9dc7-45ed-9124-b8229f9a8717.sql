-- Create table for Discord configuration
CREATE TABLE IF NOT EXISTS public.discord_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discord_url text NOT NULL,
  is_active boolean DEFAULT true,
  heading text NOT NULL DEFAULT 'Stay Connected with Us 💬',
  description text NOT NULL DEFAULT 'Don''t miss out on exclusive deals available only to our Discord community!',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.discord_config ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage discord config"
  ON public.discord_config
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active discord config"
  ON public.discord_config
  FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_discord_config_updated_at
  BEFORE UPDATE ON public.discord_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default config
INSERT INTO public.discord_config (discord_url, heading, description) VALUES
  ('https://discord.gg/yourserver', 'Stay Connected with Us 💬', 'Don''t miss out on exclusive deals available only to our Discord community!
Every day, we share special flash offers at unbeatable prices — available for a limited time only.

Our friendly and experienced Misti Services team is always ready to assist you with your orders, scheduling boosts, or answering any questions you might have.

And if you can''t find the exact service you''re looking for, just reach out to us on Discord — we''ll tailor a custom solution just for you.');