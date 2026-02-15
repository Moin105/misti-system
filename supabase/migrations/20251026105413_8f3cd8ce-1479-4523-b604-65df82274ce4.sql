-- Create SEO generation audit log table
CREATE TABLE IF NOT EXISTS seo_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('preview', 'update')),
  old_values JSONB,
  new_values JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  error_message TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes for better query performance
CREATE INDEX idx_seo_logs_product ON seo_generation_logs(product_id);
CREATE INDEX idx_seo_logs_created_at ON seo_generation_logs(created_at DESC);
CREATE INDEX idx_seo_logs_status ON seo_generation_logs(status);

-- Enable RLS
ALTER TABLE seo_generation_logs ENABLE ROW LEVEL SECURITY;

-- Admin-only access policy
CREATE POLICY "Admins can view SEO logs"
  ON seo_generation_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admin-only insert policy
CREATE POLICY "Admins can insert SEO logs"
  ON seo_generation_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );