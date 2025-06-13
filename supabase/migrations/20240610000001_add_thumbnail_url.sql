-- Add thumbnail_url column to videos table
ALTER TABLE videos ADD COLUMN IF NOT EXISTS thumbnail_url TEXT; 