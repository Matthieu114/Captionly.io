import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId } = body;

    console.log("Render video API called with videoId:", videoId); // Debug log

    if (!videoId) {
      console.log("Error: No videoId provided"); // Debug log
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
      console.log("Authentication error:", authError); // Debug log
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    console.log("User authenticated:", user.id); // Debug log

    // Check if the video exists and belongs to the user
    const { data: video, error: videoError } = await supabase
      .from("videos")
      .select("id, status, storage_path, user_id, title")
      .eq("id", videoId)
      .eq("user_id", user.id)
      .single();

    console.log("Video query result:", { video, error: videoError }); // Debug log

    if (videoError || !video) {
      console.log("Video not found or access denied"); // Debug log
      return NextResponse.json(
        { error: "Video not found or access denied" },
        { status: 404 }
      );
    }

    console.log("Video status:", video.status); // Debug log

    // Check if video is ready for rendering
    if (video.status !== "captioned") {
      console.log(`Video not ready for rendering. Status: ${video.status}`); // Debug log
      return NextResponse.json(
        {
          error: `Video is not ready for rendering. Current status: ${video.status}`
        },
        { status: 400 }
      );
    }

    // Update video status to rendering
    const { error: updateError } = await supabase
      .from("videos")
      .update({ status: "rendering" })
      .eq("id", videoId);

    if (updateError) {
      console.error("Error updating video status:", updateError);
      return NextResponse.json(
        { error: "Failed to update video status" },
        { status: 500 }
      );
    }

    console.log("Starting background rendering process"); // Debug log

    // Start the rendering process asynchronously
    processVideoRendering(videoId, video.storage_path, video.title, user.id).catch((error) => {
      console.error(`Unhandled error in rendering process:`, error);
    });

    return NextResponse.json({
      success: true,
      message: "Video rendering started",
      videoId: videoId
    });
  } catch (error) {
    console.error("Error in render-video API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Separate function to handle the actual rendering process
async function processVideoRendering(videoId: string, storagePath: string, videoTitle: string, userId: string) {
  let supabase;
  let tempDir;
  let videoPath;
  let outputPath;
  let subtitlePath;

  try {
    // Create a new Supabase client for the background process
    supabase = await createClient();

    // Create temporary directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'captionly-'));
    videoPath = path.join(tempDir, 'input.mp4');
    subtitlePath = path.join(tempDir, 'subtitles.srt');
    outputPath = path.join(tempDir, 'output.mp4');

    console.log(`Created temp directory: ${tempDir}`);

    // Download video file from Supabase storage
    const { data: videoData, error: videoError } = await supabase.storage
      .from("videos")
      .download(storagePath);

    if (videoError) {
      throw new Error(`Failed to download video: ${videoError.message}`);
    }

    // Save video to temp file
    fs.writeFileSync(videoPath, Buffer.from(await videoData.arrayBuffer()));
    console.log(`Saved video to ${videoPath}, size: ${fs.statSync(videoPath).size} bytes`);

    // Fetch captions from database
    const { data: captions, error: captionsError } = await supabase
      .from("captions")
      .select("*")
      .eq("video_id", videoId)
      .order("start_time", { ascending: true });

    if (captionsError) {
      throw new Error(`Failed to fetch captions: ${captionsError.message}`);
    }

    if (!captions || captions.length === 0) {
      throw new Error("No captions found for this video");
    }

    console.log(`Found ${captions.length} captions for video`);

    // Generate SRT file from captions
    const srtContent = captions.map((caption, index) => {
      const startTime = formatSrtTime(caption.start_time);
      const endTime = formatSrtTime(caption.end_time);
      return `${index + 1}\n${startTime} --> ${endTime}\n${caption.text}\n`;
    }).join('\n');

    fs.writeFileSync(subtitlePath, srtContent);
    console.log(`Generated SRT file at ${subtitlePath}, size: ${fs.statSync(subtitlePath).size} bytes`);

    // Run FFmpeg to burn subtitles into video
    console.log("Starting FFmpeg process to burn subtitles...");
    
    // Use absolute path for ffmpeg and add better error handling
    const ffmpegCommand = `ffmpeg -y -i "${videoPath}" -vf "subtitles='${subtitlePath}':force_style='FontName=Arial,FontSize=24,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=1,Shadow=1,MarginV=20'" -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k "${outputPath}"`;
    
    console.log("FFmpeg command:", ffmpegCommand);
    
    try {
      const { stdout, stderr } = await execAsync(ffmpegCommand);
      console.log("FFmpeg stdout:", stdout);
      if (stderr) console.log("FFmpeg stderr:", stderr);
    } catch (ffmpegError: any) {
      console.error("FFmpeg error:", ffmpegError);
      throw new Error(`FFmpeg processing failed: ${ffmpegError.message}`);
    }
    
    console.log("FFmpeg process completed");

    // Verify output file was created
    if (!fs.existsSync(outputPath)) {
      throw new Error("FFmpeg did not create output file");
    }

    // Read the output file
    const outputBuffer = fs.readFileSync(outputPath);
    console.log(`Read output video, size: ${outputBuffer.length} bytes`);

    // Upload rendered video to Supabase storage
    const renderedPath = `${userId}/${videoId}/rendered.mp4`;
    const { error: uploadError } = await supabase.storage
      .from("videos")
      .upload(renderedPath, outputBuffer, {
        contentType: "video/mp4",
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Failed to upload rendered video: ${uploadError.message}`);
    }

    console.log(`Uploaded rendered video to ${renderedPath}`);

    // Update video status and store the rendered path
    const { error: updateError } = await supabase
      .from("videos")
      .update({
        status: "rendered",
        rendered_path: renderedPath
      })
      .eq("id", videoId);

    if (updateError) {
      throw new Error(`Failed to update video status: ${updateError.message}`);
    }

    console.log(`Successfully completed rendering for video ${videoId}`);
  } catch (error) {
    console.error("Error in background rendering process:", error);

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
  } finally {
    // Clean up temporary files
    if (tempDir && fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log(`Cleaned up temporary directory: ${tempDir}`);
      } catch (cleanupError) {
        console.error("Error cleaning up temporary files:", cleanupError);
      }
    }
  }
}

// Helper function to format time in SRT format (HH:MM:SS,mmm)
function formatSrtTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const ms = milliseconds % 1000;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
} 