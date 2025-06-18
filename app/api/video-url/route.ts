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

    // Get video data including storage path
    const { data: video, error: videoError } = await supabase
      .from("videos")
      .select("id, storage_path, user_id")
      .eq("id", videoId)
      .eq("user_id", user.id)
      .single();

    if (videoError || !video) {
      return NextResponse.json(
        { error: "Video not found or access denied" },
        { status: 404 }
      );
    }

    if (!video.storage_path) {
      return NextResponse.json(
        { error: "No video file available" },
        { status: 404 }
      );
    }

    // Generate signed URL for the video (valid for 1 hour)
    const { data: signedUrlData, error: signedUrlError } =
      await supabase.storage
        .from("videos")
        .createSignedUrl(video.storage_path, 3600); // 1 hour expiry

    if (signedUrlError) {
      console.error("Error creating signed URL:", signedUrlError);
      return NextResponse.json(
        { error: "Failed to generate video URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      signedUrl: signedUrlData.signedUrl,
      expiresIn: 3600 // seconds
    });
  } catch (error) {
    console.error("Error in video-url API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 