import { useState, useEffect, useCallback } from "react";

interface VideoUrlCache {
  [videoId: string]: {
    url: string;
    expiresAt: number;
  };
}

const videoCache: VideoUrlCache = {};

export function useVideoUrl(videoId: string) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVideoUrl = useCallback(async () => {
    if (!videoId) {
      setVideoUrl(null);
      return;
    }

    // Check cache first
    const cached = videoCache[videoId];
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
      setVideoUrl(cached.url);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/video-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ videoId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch video URL");
      }

      const data = await response.json();

      if (data.success && data.signedUrl) {
        const expiresAt = now + data.expiresIn * 1000 - 60000; // Expire 1 minute early to be safe

        // Cache the URL
        videoCache[videoId] = {
          url: data.signedUrl,
          expiresAt
        };

        setVideoUrl(data.signedUrl);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      console.error(`Failed to fetch video URL for video ${videoId}:`, err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setVideoUrl(null);
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    fetchVideoUrl();
  }, [fetchVideoUrl]);

  return {
    videoUrl,
    loading,
    error,
    refetch: fetchVideoUrl
  };
} 