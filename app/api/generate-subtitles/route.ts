import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import OpenAI from "openai";
import { toFile } from "openai";
import type { FileLike } from "openai/uploads";
import path from "path";
// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60000, // 60 seconds timeout
  maxRetries: 2
});

// Helper function to download video from Supabase storage
async function downloadVideoFromStorage(
  supabase: any,
  storagePath: string
): Promise<FileLike> {
  const { data, error } = await supabase.storage
    .from("videos")
    .download(storagePath);

  if (error) {
    console.error(`Storage download error:`, error);
    throw new Error(`Failed to download video: ${error.message}`);
  }

  if (!data) {
    throw new Error("No data received from storage");
  }

  console.log(`Downloaded video blob, size: ${data.size} bytes`);
  

  // Create a proper File object for OpenAI
  const fileName = path.basename(storagePath);
  const file = await toFile(data, fileName, {
    type: "video/mp4"
  });

  console.log(`Created file object: ${fileName}, type: ${file.type}`);
  return file;
}

// Helper function to convert transcription to captions
function transcriptionToCaptions(transcription: any, videoId: string) {
  const captions: Array<{
    video_id: string;
    start_time: number;
    end_time: number;
    text: string;
  }> = [];

  if (transcription.segments && transcription.segments.length > 0) {
    console.log(`Processing ${transcription.segments.length} segments`);
    // Use segments for more precise timing
    for (const segment of transcription.segments) {
      if (segment.text && segment.text.trim()) {
        captions.push({
          video_id: videoId,
          start_time: Math.round(segment.start * 1000), // Convert to milliseconds
          end_time: Math.round(segment.end * 1000),
          text: segment.text.trim()
        });
      }
    }
  } else {
    console.log("No segments found, using fallback text splitting");
    // Fallback: split text into chunks (less accurate timing)
    const text = transcription.text || "";
    const words = text.split(" ").filter((word: string) => word.trim());

    if (words.length === 0) {
      console.warn("No words found in transcription");
      return captions;
    }

    const wordsPerSegment = 10;
    const estimatedDuration = 30; // seconds - would need actual video duration
    const segmentDuration =
      estimatedDuration / Math.ceil(words.length / wordsPerSegment);

    for (let i = 0; i < words.length; i += wordsPerSegment) {
      const segmentIndex = Math.floor(i / wordsPerSegment);
      const startTime = segmentIndex * segmentDuration;
      const endTime = Math.min(
        (segmentIndex + 1) * segmentDuration,
        estimatedDuration
      );

      const segmentText = words
        .slice(i, i + wordsPerSegment)
        .join(" ")
        .trim();
      if (segmentText) {
        captions.push({
          video_id: videoId,
          start_time: Math.round(startTime * 1000),
          end_time: Math.round(endTime * 1000),
          text: segmentText
        });
      }
    }
  }

  console.log(`Generated ${captions.length} captions`);
  return captions;
}

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

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured" },
        { status: 500 }
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
      .select("id, status, storage_path, user_id, size")
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

    // Check file size (OpenAI has a 25MB limit for Whisper)
    if (video.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Video file is too large for transcription (max 25MB)" },
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
    // Start the transcription process asynchronously
    processVideoTranscription(videoId, video.storage_path).catch((error) => {
      console.error(`Unhandled error in transcription process:`, error);
    });

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

// Separate function to handle the actual transcription process
async function processVideoTranscription(videoId: string, storagePath: string) {
  let supabase;

  try {
    // Create a new Supabase client for the background process
    supabase = await createClient();

    // Download video file from Supabase storage
    const supabaseFileLike = await downloadVideoFromStorage(supabase, storagePath);

    // Transcribe using OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: supabaseFileLike,
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
      language: "en" // Optional: specify language for better accuracy
    });

    console.log(`Transcription completed for video ${videoId}`);
    console.log(
      `Transcription text preview: ${transcription.text?.substring(0, 100)}...`
    );

    // Convert transcription to captions format
    const captions = transcriptionToCaptions(transcription, videoId);

    if (captions.length === 0) {
      console.warn(`No captions generated for video ${videoId}`);
      throw new Error("No captions were generated from the transcription");
    }

    // Delete existing captions for this video (if any)
    const { error: deleteError } = await supabase
      .from("captions")
      .delete()
      .eq("video_id", videoId);

    if (deleteError) {
      console.warn(`Error deleting existing captions:`, deleteError);
    }

    // Save new captions to database
    const { error: captionsError } = await supabase
      .from("captions")
      .insert(captions);

    if (captionsError) {
      console.error(`Error saving captions:`, captionsError);
      throw new Error(`Failed to save captions: ${captionsError.message}`);
    }

    // Update video status to ready
    const { error: statusError } = await supabase
      .from("videos")
      .update({ status: "ready" })
      .eq("id", videoId);

    if (statusError) {
      console.error(`Error updating video status:`, statusError);
      throw new Error(`Failed to update video status: ${statusError.message}`);
    }

    console.log(
      `Successfully completed transcription for video ${videoId} with ${captions.length} captions`
    );
  } catch (error) {
    console.error("Error in background transcription process:", error);

    // Log specific error types for debugging
    if (error instanceof Error) {
      console.error(`Error type: ${error.constructor.name}`);
      console.error(`Error message: ${error.message}`);
      if ("status" in error) {
        console.error(`Error status: ${(error as any).status}`);
      }
      if ("code" in error) {
        console.error(`Error code: ${(error as any).code}`);
      }
    }

    // Update video status to error
    if (supabase) {
      try {
        await supabase
          .from("videos")
          .update({ status: "error" })
          .eq("id", videoId);
      } catch (updateError) {
        console.error("Failed to update video status to error:", updateError);
      }
    }
  }
}
