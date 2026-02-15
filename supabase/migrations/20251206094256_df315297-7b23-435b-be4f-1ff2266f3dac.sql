-- Phase 3: Create game_faqs table for rich results
CREATE TABLE public.game_faqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  generated_by TEXT DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.game_faqs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view active game FAQs" 
ON public.game_faqs 
FOR SELECT 
USING ((is_active = true) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage game FAQs" 
ON public.game_faqs 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_game_faqs_game_id ON public.game_faqs(game_id);
CREATE INDEX idx_game_faqs_active ON public.game_faqs(is_active) WHERE is_active = true;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_game_faqs_updated_at
BEFORE UPDATE ON public.game_faqs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();