-- Add customization fields to chat_integration table
ALTER TABLE chat_integration 
ADD COLUMN IF NOT EXISTS visitor_name_field TEXT,
ADD COLUMN IF NOT EXISTS custom_attributes JSONB DEFAULT '{}'::jsonb;