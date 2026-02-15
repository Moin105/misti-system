-- Drop the custom chat tables since we're using 3rd party
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.chat_conversations CASCADE;

-- Create table for 3rd party chat integration settings
CREATE TABLE public.chat_integration (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'custom',
  script_code TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_integration ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage chat integration"
  ON public.chat_integration FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active chat integration"
  ON public.chat_integration FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_chat_integration_updated_at
  BEFORE UPDATE ON public.chat_integration
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();