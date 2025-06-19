import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  try {
    // Get videoId from query parameters
    const videoId = request.nextUrl.searchParams.get('videoId');

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

    // Get video data from database
    const { data: video, error: videoError } = await supabase
      .from("videos")
      .select("storage_path, status, original_url, captioned_url, rendered_path")
      .eq("id", videoId)
      .single();

    if (videoError) {
      console.error("Database error:", videoError);
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // If the video is rendered and has a rendered_path, prioritize that
    if (video.status === 'rendered' && video.rendered_path) {
      try {
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from("videos")
          .createSignedUrl(video.rendered_path, 3600); // 1 hour expiry

        if (!signedUrlError && signedUrlData?.signedUrl) {
          return NextResponse.json({ url: signedUrlData.signedUrl });
        }
      } catch (err) {
        console.error("Error getting signed URL for rendered video:", err);
      }
    }

    // If the video is rendered and has a captioned_url (legacy), handle that
    if (video.status === 'rendered' && video.captioned_url) {
      // If it's already a full URL, return it
      if (video.captioned_url.startsWith('http')) {
        return NextResponse.json({ url: video.captioned_url });
      }
    }

    // For all other cases, use the original storage path
    if (!video.storage_path) {
      return NextResponse.json({ error: "No video file found" }, { status: 404 });
    }

    // Generate signed URL for the original video
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("videos")
      .createSignedUrl(video.storage_path, 3600); // 1 hour expiry

    if (signedUrlError) {
      console.error("Signed URL error:", signedUrlError);
      return NextResponse.json({ error: "Failed to generate video URL" }, { status: 500 });
    }

    if (!signedUrlData?.signedUrl) {
      return NextResponse.json({ error: "Failed to generate video URL" }, { status: 500 });
    }

    return NextResponse.json({ url: signedUrlData.signedUrl });
  } catch (error) {
    console.error("Error in video-url API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
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
      url: signedUrlData.signedUrl,
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