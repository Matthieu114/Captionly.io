import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId } = body;

    if (!videoId) {
      return NextResponse.json(
        { error: "Video ID is required" },
        { status: 400 }
      );
    }

    // Create a Supabase client for server-side auth
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if the video exists and belongs to the user
    const { data: video, error: videoError } = await supabase
      .from("videos")
      .select("id, status, storage_path, user_id")
      .eq("id", videoId)
      .eq("user_id", user.id)
      .single();

    if (videoError || !video) {
      return NextResponse.json(
        { error: "Video not found or access denied" },
        { status: 404 }
      );
    }

    // Check if video is ready for transcription
    if (video.status !== "ready") {
      return NextResponse.json(
        {
          error: `Video is not ready for transcription. Current status: ${video.status}`
        },
        { status: 400 }
      );
    }

    // Update video status to transcribing
    const { error: updateError } = await supabase
      .from("videos")
      .update({ status: "transcribing" })
      .eq("id", videoId);

    if (updateError) {
      console.error("Error updating video status:", updateError);
      return NextResponse.json(
        { error: "Failed to update video status" },
        { status: 500 }
      );
    }

    // In a real implementation, we would:
    // 1. Start a background job to process the video
    // 2. Use a service like OpenAI Whisper or AssemblyAI to transcribe the audio
    // 3. Process the transcription results into timed captions
    // 4. Save the captions to the database
    
    // For the demo, we'll simulate this process with a delayed status update
    // In a production app, this would be handled by a separate worker process
    setTimeout(async () => {
      try {
        // Generate fake captions (in a real app, these would come from the transcription service)
        const fakeCaptions = [
          {
            id: `${videoId}-caption-1`,
            video_id: videoId,
            start_time: 0,
            end_time: 3.5,
            text: "Welcome to Captionly.io!"
          },
          {
            id: `${videoId}-caption-2`,
            video_id: videoId,
            start_time: 3.6,
            end_time: 7.2,
            text: "This is a demo of our caption editor."
          },
          {
            id: `${videoId}-caption-3`,
            video_id: videoId,
            start_time: 7.3,
            end_time: 12.0,
            text: "You can edit these captions, adjust timings, and render your video with embedded subtitles."
          },
          {
            id: `${videoId}-caption-4`,
            video_id: videoId,
            start_time: 12.1,
            end_time: 18.0,
            text: "Click on any caption to jump to that point in the video."
          }
        ];

        // Save the fake captions to the database
        for (const caption of fakeCaptions) {
          await supabase.from("captions").upsert(caption);
        }

        // Update video status to ready
        await supabase
          .from("videos")
          .update({ status: "ready" })
          .eq("id", videoId);

        console.log(`Completed transcription for video ${videoId}`);
      } catch (error) {
        console.error("Error in background transcription process:", error);
        
        // Update video status to error
        await supabase
          .from("videos")
          .update({ status: "error" })
          .eq("id", videoId);
      }
    }, 10000); // Simulate a 10-second transcription process

    return NextResponse.json({
      success: true,
      message: "Subtitle generation started",
      videoId: videoId
    });
  } catch (error) {
    console.error("Error in generate-subtitles API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
