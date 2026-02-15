-- Table to track 2FA settings and enforcement
CREATE TABLE public.mfa_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  is_enforced boolean DEFAULT false,
  enforced_at timestamptz,
  enforced_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mfa_settings ENABLE ROW LEVEL SECURITY;

-- Users can view their own settings
CREATE POLICY "Users can view own MFA settings"
ON public.mfa_settings FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own settings
CREATE POLICY "Users can insert own MFA settings"
ON public.mfa_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own settings
CREATE POLICY "Users can update own MFA settings"
ON public.mfa_settings FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can manage all settings
CREATE POLICY "Admins can manage all MFA settings"
ON public.mfa_settings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Site-wide security settings table
CREATE TABLE public.site_security_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);

-- Enable RLS
ALTER TABLE public.site_security_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings
CREATE POLICY "Anyone can view security settings"
ON public.site_security_settings FOR SELECT
USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage security settings"
ON public.site_security_settings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default: admins MUST have 2FA
INSERT INTO public.site_security_settings (setting_key, setting_value)
VALUES ('mfa_enforcement', '{"require_for_admins": true, "require_for_all": false}');

-- Trigger for updated_at
CREATE TRIGGER update_mfa_settings_updated_at
BEFORE UPDATE ON public.mfa_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_site_security_settings_updated_at
BEFORE UPDATE ON public.site_security_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();