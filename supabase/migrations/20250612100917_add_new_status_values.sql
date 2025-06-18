-- Add new status values for videos table: 'captioned', 'rendering', 'rendered'
ALTER TABLE videos DROP CONSTRAINT IF EXISTS videos_status_check;
ALTER TABLE videos ADD CONSTRAINT videos_status_check 
    CHECK (status IN ('uploading', 'processing', 'ready', 'error', 'transcribing', 'captioned', 'rendering', 'rendered')); 