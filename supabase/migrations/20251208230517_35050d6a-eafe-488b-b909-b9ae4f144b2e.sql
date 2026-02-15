-- Create table to store cached sitemap XML
CREATE TABLE public.sitemap_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  xml_content text NOT NULL,
  url_count integer NOT NULL DEFAULT 0,
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  generated_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sitemap_cache ENABLE ROW LEVEL SECURITY;

-- Anyone can view the cached sitemap (for edge function to serve it)
CREATE POLICY "Anyone can view sitemap cache" 
ON public.sitemap_cache 
FOR SELECT 
USING (true);

-- Only admins can update the sitemap cache
CREATE POLICY "Admins can manage sitemap cache" 
ON public.sitemap_cache 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_sitemap_cache_updated_at
BEFORE UPDATE ON public.sitemap_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();