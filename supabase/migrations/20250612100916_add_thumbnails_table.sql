-- Create thumbnails table
CREATE TABLE thumbnails (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    public_url TEXT
);

-- Enable RLS on thumbnails table
ALTER TABLE thumbnails ENABLE ROW LEVEL SECURITY;

-- Thumbnails policies
CREATE POLICY "Users can view thumbnails of their videos"
    ON thumbnails FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM videos
            WHERE videos.id = thumbnails.video_id
            AND videos.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert thumbnails for their videos"
    ON thumbnails FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM videos
            WHERE videos.id = thumbnails.video_id
            AND videos.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update thumbnails of their videos"
    ON thumbnails FOR UPDATE
