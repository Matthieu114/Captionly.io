"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { useUser } from "@/lib/useUser"
import Link from "next/link"
import { ArrowLeft, Download, Share2, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { VideoPlayer } from "@/components/VideoPlayer"

interface Video {
  id: string
  title: string
  status: 'uploading' | 'ready' | 'error' | 'transcribing' | 'captioned' | 'rendering' | 'rendered'
  created_at: string
  original_url?: string
  captioned_url?: string
  thumbnail_url?: string
}

export default function DownloadPage() {
  const { user, loading } = useUser()
  const [video, setVideo] = useState<Video | null>(null)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  
  const router = useRouter()
  const params = useParams()
  const videoId = params.videoId as string
  const supabase = createClient()
  const { toast } = useToast()

  // Fetch video data
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/")
      return
    }

    if (!user || !videoId) return

    const fetchVideo = async () => {
      try {
        const { data, error } = await supabase
          .from("videos")
          .select("id, title, status, created_at, original_url, captioned_url, thumbnail_url")
          .eq("id", videoId)
          .eq("user_id", user.id)
          .single()

        if (error) throw error
        if (!data) throw new Error("Video not found")

        // Check if the video is in rendered status
        if (data.status !== 'rendered') {
          // Redirect back to process page if not rendered
          router.replace(`/process/${videoId}?stage=rendering`)
          return
        }

        // Verify we have a captioned URL
        if (!data.captioned_url) {
          throw new Error("Rendered video URL not found")
        }

        setVideo(data)
        setFetching(false)
      } catch (err) {
        console.error("Error fetching video:", err)
        setError(err instanceof Error ? err.message : "Failed to load video")
        setFetching(false)
      }
    }

    fetchVideo()
  }, [user, loading, videoId, router])

  // Handle download
  const handleDownload = async () => {
    try {
      setDownloading(true);
      
      // Get the rendered video path
      const { data: videoData, error: videoError } = await supabase
        .from("videos")
        .select("rendered_path, title")
        .eq("id", videoId)
        .single();

      if (videoError || !videoData) {
        throw new Error("Failed to fetch video data");
      }

      if (!videoData.rendered_path) {
        throw new Error("No rendered video available");
      }

      // Get a signed URL for download
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("videos")
        .createSignedUrl(videoData.rendered_path, 300); // 5 minutes for download

      if (signedUrlError || !signedUrlData?.signedUrl) {
        throw new Error("Failed to generate download URL");
      }

      // Download the file
      const response = await fetch(signedUrlData.signedUrl);
      if (!response.ok) {
        throw new Error("Failed to download video");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Create download link
      const a = document.createElement("a");
      a.href = url;
      a.download = `${videoData.title || "captioned-video"}.mp4`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      console.error("Download error:", error);
      // You might want to show a toast notification here
    } finally {
      setDownloading(false);
    }
  };

  // Copy share link
  const handleCopyShareLink = () => {
    if (!video) return
    
    // In a real app, this would be a public sharing URL
    const shareUrl = `${window.location.origin}/share/${video.id}`
    
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        toast({
          title: "Link copied!",
          description: "Share link copied to clipboard.",
          duration: 3000,
        })
      })
      .catch(() => {
        toast({
          title: "Copy failed",
          description: "Failed to copy link to clipboard.",
          variant: "destructive",
          duration: 5000,
        })
      })
  }

  // Loading state
  if (loading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <span className="text-white text-lg">Loading...</span>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !video) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155]">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">❌ Error</div>
          <p className="text-white mb-4">{error || "Video not found"}</p>
          <Button
            onClick={() => router.push("/dashboard")}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155]">
      {/* Background elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] right-[15%] w-64 h-64 rounded-full bg-purple-500/10 blur-3xl"></div>
        <div className="absolute top-[40%] left-[10%] w-72 h-72 rounded-full bg-blue-500/10 blur-3xl"></div>
        <div className="absolute bottom-[20%] right-[20%] w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl"></div>
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10"></div>
      </div>
      
      <div className="container mx-auto px-4 py-12 relative z-10">
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-slate-300 hover:text-white transition group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Dashboard</span>
          </Link>
          
          <div className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Captionly
          </div>
        </div>
        
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-block bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm mb-4">
              ✨ Ready to Download
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">{video.title}</h1>
            <p className="text-slate-400">Your captioned video is ready to download</p>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-xl shadow-xl p-8 border border-white/10 mb-8">
            {/* Video preview */}
            <div className="aspect-video bg-black rounded-lg overflow-hidden mb-8">
              <VideoPlayer 
                videoId={videoId} 
                controls={true}
              />
            </div>
            
            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 flex-1 py-6 flex items-center justify-center gap-2"
                onClick={handleDownload}
                disabled={downloading || !video.captioned_url}
              >
                {downloading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    <span>Downloading...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    <span>Download Video</span>
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                className="bg-white/5 flex-1 py-6 flex items-center justify-center gap-2"
                onClick={handleCopyShareLink}
              >
                <Share2 className="w-5 h-5" />
                <span>Copy Share Link</span>
              </Button>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              variant="outline"
              className="bg-white/5 flex-1 py-5 flex items-center justify-center gap-2"
              onClick={() => router.push("/dashboard")}
            >
              <Home className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </Button>
            
            <Button
              variant="outline"
              className="bg-white/5 flex-1 py-5 flex items-center justify-center gap-2"
              onClick={() => router.push(`/edit/${videoId}`)}
            >
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
              >
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Edit Captions Again</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 