-- Add icon_url column to games table for icon-based card design
ALTER TABLE games 
ADD COLUMN icon_url TEXT;