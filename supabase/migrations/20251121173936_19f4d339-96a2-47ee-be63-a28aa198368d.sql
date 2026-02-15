-- Create product_faqs table
CREATE TABLE IF NOT EXISTS public.product_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  generated_by TEXT DEFAULT 'manual', -- 'ai' or 'manual'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for product_faqs
CREATE INDEX IF NOT EXISTS idx_product_faqs_product_id ON public.product_faqs(product_id);
CREATE INDEX IF NOT EXISTS idx_product_faqs_active ON public.product_faqs(is_active);
CREATE INDEX IF NOT EXISTS idx_product_faqs_sort_order ON public.product_faqs(product_id, sort_order);

-- Enable RLS on product_faqs
ALTER TABLE public.product_faqs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_faqs
CREATE POLICY "Admins can manage product FAQs"
  ON public.product_faqs
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active product FAQs"
  ON public.product_faqs
  FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

-- Create faq_generation_logs table
CREATE TABLE IF NOT EXISTS public.faq_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL, -- 'generate', 'regenerate', 'batch'
  status TEXT NOT NULL, -- 'success', 'error', 'partial'
  questions_generated INTEGER DEFAULT 0,
  processing_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes for faq_generation_logs
CREATE INDEX IF NOT EXISTS idx_faq_logs_product_id ON public.faq_generation_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_faq_logs_created_at ON public.faq_generation_logs(created_at DESC);

-- Enable RLS on faq_generation_logs
ALTER TABLE public.faq_generation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for faq_generation_logs
CREATE POLICY "Admins can manage FAQ generation logs"
  ON public.faq_generation_logs
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at on product_faqs
CREATE TRIGGER update_product_faqs_updated_at
  BEFORE UPDATE ON public.product_faqs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();