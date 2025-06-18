import { useState, useEffect, useCallback } from "react";

interface ThumbnailUrlCache {
  [videoId: string]: {
    url: string;
    expiresAt: number;
  };
}

const thumbnailCache: ThumbnailUrlCache = {};

export function useThumbnailUrl(videoId: string, hasThumbnail: boolean) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchThumbnailUrl = useCallback(async () => {
    if (!hasThumbnail || !videoId) {
      setThumbnailUrl(null);
      return;
    }

    // Check cache first
    const cached = thumbnailCache[videoId];
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
      setThumbnailUrl(cached.url);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/thumbnail-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ videoId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch thumbnail URL");
      }

      const data = await response.json();

      if (data.success && data.signedUrl) {
        const expiresAt = now + data.expiresIn * 1000 - 60000; // Expire 1 minute early to be safe

        // Cache the URL
        thumbnailCache[videoId] = {
          url: data.signedUrl,
          expiresAt
        };

        setThumbnailUrl(data.signedUrl);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      console.error(`Failed to fetch thumbnail URL for video ${videoId}:`, err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setThumbnailUrl(null);
    } finally {
      setLoading(false);
    }
  }, [videoId, hasThumbnail]);

  useEffect(() => {
    fetchThumbnailUrl();
  }, [fetchThumbnailUrl]);

  return {
    thumbnailUrl,
    loading,
    error,
    refetch: fetchThumbnailUrl
  };
}
