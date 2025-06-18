import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
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

    // Parse request body
    const { videoId, thumbnailDataUrl } = await request.json();
    if (!videoId || !thumbnailDataUrl) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Get video data to determine storage path
    const { data: videoData, error: videoError } = await supabase
      .from("videos")
      .select("storage_path")
      .eq("id", videoId)
      .eq("user_id", user.id)
      .single();

    if (videoError || !videoData) {
      return NextResponse.json(
        { error: videoError?.message || "Video not found" },
        { status: 404 }
      );
    }

    // Extract base64 data from data URL
    const base64Data = thumbnailDataUrl.split(",")[1];
    if (!base64Data) {
      return NextResponse.json(
        { error: "Invalid data URL format" },
        { status: 400 }
      );
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, "base64");

    // Create a path for the thumbnail following the same pattern as videos
    // Extract the filename from the video storage path and change extension to .jpg
    const videoFileName = videoData.storage_path.split("/").pop();
    if (!videoFileName) {
      return NextResponse.json(
        { error: "Invalid video storage path" },
        { status: 400 }
      );
    }

    const thumbnailFileName = videoFileName.replace(".mp4", ".jpg");
    const storagePath = `${user.id}/thumbnails/${thumbnailFileName}`;

    // Upload thumbnail to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("videos")
      .upload(storagePath, buffer, {
        contentType: "image/jpeg",
        cacheControl: "3600",
        upsert: true
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Failed to upload thumbnail: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Store the storage path instead of public URL for private access
    // Update video record with thumbnail storage path
    const { error: updateError } = await supabase
      .from("videos")
      .update({ thumbnail_url: storagePath }) // Store storage path instead of public URL
      .eq("id", videoId);

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update video: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      thumbnailStoragePath: storagePath,
      message: "Thumbnail uploaded successfully"
    });
  } catch (error) {
    console.error("Error extracting thumbnail:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to extract thumbnail"
      },
      { status: 500 }
    );
  }
}
