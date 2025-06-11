-- Create videos table
CREATE TABLE videos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('uploading', 'processing', 'ready', 'error')),
    storage_path TEXT NOT NULL,
    processed_url TEXT,
    duration INTEGER,
    original_url TEXT,
    size INTEGER NOT NULL
);

-- Create captions table
CREATE TABLE captions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    start_time INTEGER NOT NULL,
    end_time INTEGER NOT NULL,
    text TEXT NOT NULL
);

-- Create RLS policies
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE captions ENABLE ROW LEVEL SECURITY;

-- Videos policies
CREATE POLICY "Users can view their own videos"
    ON videos FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own videos"
    ON videos FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own videos"
    ON videos FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own videos"
    ON videos FOR DELETE
    USING (auth.uid() = user_id);

-- Captions policies
CREATE POLICY "Users can view captions of their videos"
    ON captions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM videos
        WHERE videos.id = captions.video_id
        AND videos.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert captions for their videos"
    ON captions FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM videos
        WHERE videos.id = captions.video_id
        AND videos.user_id = auth.uid()
    ));

CREATE POLICY "Users can update captions of their videos"
    ON captions FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM videos
        WHERE videos.id = captions.video_id
        AND videos.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete captions of their videos"
    ON captions FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM videos
        WHERE videos.id = captions.video_id
        AND videos.user_id = auth.uid()
    ));

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', false);

-- Storage policies
CREATE POLICY "Users can upload their own videos"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'videos' AND
        auth.uid() = (storage.foldername(name))[1]::uuid
    );

CREATE POLICY "Users can view their own videos"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'videos' AND
        auth.uid() = (storage.foldername(name))[1]::uuid
    );

CREATE POLICY "Users can update their own videos"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'videos' AND
        auth.uid() = (storage.foldername(name))[1]::uuid
    );

CREATE POLICY "Users can delete their own videos"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'videos' AND
        auth.uid() = (storage.foldername(name))[1]::uuid
    ); 