-- Add game_id column to faq_generation_logs for tracking game FAQ generations
ALTER TABLE faq_generation_logs ADD COLUMN game_id uuid REFERENCES games(id) ON DELETE SET NULL;