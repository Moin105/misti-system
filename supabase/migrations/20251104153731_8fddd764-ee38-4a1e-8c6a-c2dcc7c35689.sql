-- Add hero image position column to games table
ALTER TABLE games 
ADD COLUMN hero_image_position TEXT DEFAULT 'center';