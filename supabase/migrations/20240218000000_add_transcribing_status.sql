-- Add 'transcribing' status to videos table
ALTER TABLE videos DROP CONSTRAINT IF EXISTS videos_status_check;
ALTER TABLE videos ADD CONSTRAINT videos_status_check 
    CHECK (status IN ('uploading', 'processing', 'ready', 'error', 'transcribing')); 