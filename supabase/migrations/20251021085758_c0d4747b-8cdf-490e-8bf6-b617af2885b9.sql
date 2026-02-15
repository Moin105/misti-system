-- Create table for work applications
CREATE TABLE public.work_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discord_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT,
  country TEXT NOT NULL,
  age INTEGER NOT NULL,
  booster_type TEXT NOT NULL,
  services TEXT NOT NULL,
  games TEXT NOT NULL,
  boosting_experience TEXT NOT NULL,
  proof_urls JSONB DEFAULT '[]'::jsonb,
  marketplace_profiles TEXT,
  hours_available TEXT NOT NULL,
  how_found_us TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.work_applications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can submit applications"
ON public.work_applications
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view all applications"
ON public.work_applications
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update applications"
ON public.work_applications
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete applications"
ON public.work_applications
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_work_applications_updated_at
BEFORE UPDATE ON public.work_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();