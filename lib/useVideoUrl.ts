import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

export function useVideoUrl(videoId: string) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!videoId) {
      setLoading(false);
      return;
    }

    async function fetchVideoUrl() {
      try {
        // First, get the video record to check status and paths
        const { data: videoData, error: videoError } = await supabase
          .from("videos")
          .select("status, original_url, captioned_url, rendered_path, storage_path")
          .eq("id", videoId)
          .single();

        if (videoError) throw videoError;
        if (!videoData) throw new Error("Video not found");

        // If the video is rendered and has a rendered_path, use that
        if (videoData.status === "rendered" && videoData.rendered_path) {
          try {
            // Get a signed URL for the rendered video
            const { data: signedUrlData, error: signedUrlError } = await supabase.storage
              .from("videos")
              .createSignedUrl(videoData.rendered_path, 3600); // 1 hour expiry
            
            if (!signedUrlError && signedUrlData?.signedUrl) {
              setVideoUrl(signedUrlData.signedUrl);
              setLoading(false);
              return;
            }
          } catch (err) {
            console.error("Error getting signed URL for rendered video:", err);
          }
        }

        // If the video is rendered and has a captioned_url (legacy), use that
        if (videoData.status === "rendered" && videoData.captioned_url) {
          // Check if this is a public URL that needs to be converted to a signed URL
          const publicUrl = videoData.captioned_url;
          if (publicUrl.includes("storage.googleapis.com") || publicUrl.includes("supabase.co/storage")) {
            try {
              // Extract the path from the public URL - this is a simplistic approach
              const urlParts = publicUrl.split("/storage/v1/object/public/videos/");
              if (urlParts.length > 1) {
                const storagePath = urlParts[1];
                
                // Get a signed URL for direct access
                const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                  .from("videos")
                  .createSignedUrl(storagePath, 3600); // 1 hour expiry
                
                if (!signedUrlError && signedUrlData?.signedUrl) {
                  setVideoUrl(signedUrlData.signedUrl);
                  setLoading(false);
                  return;
                }
              }
            } catch (err) {
              console.error("Error getting signed URL:", err);
              // Fall back to the public URL if there's an error
              setVideoUrl(publicUrl);
              setLoading(false);
              return;
            }
          } else {
            // Use the captioned URL directly if it's not a storage URL
            setVideoUrl(publicUrl);
            setLoading(false);
            return;
          }
        }

        // For all other cases, get a fresh signed URL from the API
        const response = await fetch(`/api/video-url?videoId=${videoId}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch video URL");
        }
        
        const data = await response.json();
        if (!data?.url) throw new Error("No URL returned");

        setVideoUrl(data.url);
      } catch (err) {
        console.error("Error fetching video URL:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    }

    fetchVideoUrl();
  }, [videoId]);

  return { videoUrl, loading, error };
} 