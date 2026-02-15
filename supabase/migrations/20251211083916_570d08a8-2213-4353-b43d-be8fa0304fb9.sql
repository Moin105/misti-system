-- Create product_rewards table for AI-generated, admin-approved rewards content
CREATE TABLE public.product_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  rewards_content TEXT NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id)
);

-- Enable RLS
ALTER TABLE public.product_rewards ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view approved rewards
CREATE POLICY "Anyone can view approved rewards"
ON public.product_rewards
FOR SELECT
USING ((is_approved = true) OR has_role(auth.uid(), 'admin'::app_role));

-- Policy: Admins can manage all rewards
CREATE POLICY "Admins can manage rewards"
ON public.product_rewards
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_product_rewards_updated_at
BEFORE UPDATE ON public.product_rewards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_product_rewards_product_id ON public.product_rewards(product_id);
CREATE INDEX idx_product_rewards_is_approved ON public.product_rewards(is_approved);