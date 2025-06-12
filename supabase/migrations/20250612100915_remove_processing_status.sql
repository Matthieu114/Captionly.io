-- Remove 'processing' status from videos table and update any existing processing videos to ready
UPDATE videos SET status = 'ready' WHERE status = 'processing';

-- Update constraint to remove 'processing' status
ALTER TABLE videos DROP CONSTRAINT IF EXISTS videos_status_check;
ALTER TABLE videos ADD CONSTRAINT videos_status_check 
    CHECK (status IN ('uploading', 'ready', 'error', 'transcribing')); 