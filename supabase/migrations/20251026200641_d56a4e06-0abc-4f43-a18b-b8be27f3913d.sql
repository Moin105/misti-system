-- Create product_trust_badges table
CREATE TABLE IF NOT EXISTS product_trust_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  icon_name text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE product_trust_badges ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active trust badges"
  ON product_trust_badges FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage trust badges"
  ON product_trust_badges FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_product_trust_badges_updated_at
  BEFORE UPDATE ON product_trust_badges
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default data
INSERT INTO product_trust_badges (icon_name, title, description, sort_order) VALUES
  ('Shield', '100% Safe', 'Secure transactions', 1),
  ('Clock', 'Fast Delivery', 'Quick service', 2),
  ('MessageCircle', '24/7 Support', 'Always available', 3),
  ('Award', 'Best Quality', 'Top rated service', 4);