"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { useUser } from "@/lib/useUser"
import Link from "next/link"
import { ArrowLeft, Play, Pause, ChevronRight, Trash2, Plus, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

interface Video {
  id: string
  title: string
  status: 'uploading' | 'ready' | 'error' | 'transcribing'
  created_at: string
  original_url?: string
}

interface Caption {
  id: string
  video_id: string
  start_time: number
  end_time: number
  text: string
}

export default function EditPage() {
  const { user, loading } = useUser()
  const [video, setVideo] = useState<Video | null>(null)
  const [captions, setCaptions] = useState<Caption[]>([])
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [activeCaptionId, setActiveCaptionId] = useState<string | null>(null)
  const [rendering, setRendering] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const router = useRouter()
  const params = useParams()
  const videoId = params.videoId as string
  const supabase = createClient()
  const { toast } = useToast()

  // Fetch video and captions data
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/")
      return
    }

    if (!user || !videoId) return

    const fetchVideoAndCaptions = async () => {
      try {
        // Fetch video data
        const { data: videoData, error: videoError } = await supabase
          .from("videos")
          .select("id, title, status, created_at, original_url")
          .eq("id", videoId)
          .eq("user_id", user.id)
          .single()

        if (videoError) throw videoError
        if (!videoData) throw new Error("Video not found")

        setVideo(videoData)

        // For the MVP, we'll create fake captions if none exist
        const { data: captionsData, error: captionsError } = await supabase
          .from("captions")
          .select("*")
          .eq("video_id", videoId)
          .order("start_time", { ascending: true })

        if (captionsError) throw captionsError

        // If no captions exist, create fake ones for testing
        if (!captionsData || captionsData.length === 0) {
          const fakeCaptions = generateFakeCaptions(videoId)
          setCaptions(fakeCaptions)
        } else {
          setCaptions(captionsData)
        }

        setFetching(false)
      } catch (err) {
        console.error("Error fetching data:", err)
        setError(err instanceof Error ? err.message : "Failed to load video and captions")
        setFetching(false)
      }
    }

    fetchVideoAndCaptions()
  }, [user, loading, videoId, router])

  // Handle video playback
  useEffect(() => {
    if (!videoRef.current) return

    const handleTimeUpdate = () => {
      if (videoRef.current) {
        setCurrentTime(videoRef.current.currentTime)
        
        // Find the active caption based on current time
        const activeCaption = captions.find(
          caption => 
            currentTime >= caption.start_time && 
            currentTime <= caption.end_time
        )
        
        setActiveCaptionId(activeCaption?.id || null)
      }
    }

    const videoElement = videoRef.current
    videoElement.addEventListener('timeupdate', handleTimeUpdate)
    
    return () => {
      videoElement.removeEventListener('timeupdate', handleTimeUpdate)
    }
  }, [captions, currentTime])

  // Toggle play/pause
  const togglePlayPause = () => {
    if (!videoRef.current) return
    
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
    
    setIsPlaying(!isPlaying)
  }

  // Jump to specific caption
  const jumpToCaption = (caption: Caption) => {
    if (!videoRef.current) return
    
    videoRef.current.currentTime = caption.start_time
    setActiveCaptionId(caption.id)
    
    if (!isPlaying) {
      videoRef.current.play()
      setIsPlaying(true)
    }
  }

  // Update caption text
  const updateCaptionText = (id: string, newText: string) => {
    setCaptions(prevCaptions => 
      prevCaptions.map(caption => 
        caption.id === id ? { ...caption, text: newText } : caption
      )
    )
  }

  // Delete caption
  const deleteCaption = (id: string) => {
    setCaptions(prevCaptions => prevCaptions.filter(caption => caption.id !== id))
  }

  // Save captions
  const saveCaptions = async () => {
    try {
      // For each caption, upsert it to the database
      for (const caption of captions) {
        const { error } = await supabase
          .from("captions")
          .upsert({
            id: caption.id,
            video_id: caption.video_id,
            start_time: caption.start_time,
            end_time: caption.end_time,
            text: caption.text
          })
        
        if (error) throw error
      }
      
      toast({
        title: "Captions saved",
        description: "Your captions have been saved successfully.",
        duration: 3000,
      })
    } catch (err) {
      console.error("Error saving captions:", err)
      toast({
        title: "Error saving captions",
        description: "There was a problem saving your captions.",
        variant: "destructive",
        duration: 5000,
      })
    }
  }

  // Render video with captions
  const renderVideo = async () => {
    setRendering(true)
    
    try {
      // Save captions first
      await saveCaptions()
      
      // Redirect to processing page with rendering parameter
      router.push(`/process/${videoId}?stage=rendering`)
    } catch (err) {
      console.error("Error starting render:", err)
      toast({
        title: "Error",
        description: "Failed to start rendering process.",
        variant: "destructive",
        duration: 5000,
      })
      setRendering(false)
    }
  }

  // Generate fake captions for testing
  const generateFakeCaptions = (videoId: string): Caption[] => {
    return [
      {
        id: "fake-1",
        video_id: videoId,
        start_time: 0,
        end_time: 3.5,
        text: "Welcome to Captionly.io!"
      },
      {
        id: "fake-2",
        video_id: videoId,
        start_time: 3.6,
        end_time: 7.2,
        text: "This is a demo of our caption editor."
      },
      {
        id: "fake-3",
        video_id: videoId,
        start_time: 7.3,
        end_time: 12.0,
        text: "You can edit these captions, adjust timings, and render your video with embedded subtitles."
      },
      {
        id: "fake-4",
        video_id: videoId,
        start_time: 12.1,
        end_time: 18.0,
        text: "Click on any caption to jump to that point in the video."
      }
    ]
  }

  // Format time (seconds) to MM:SS format
  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60)
    const seconds = Math.floor(timeInSeconds % 60)
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
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
      {/* Header */}
      <div className="border-b border-white/10 bg-white/5 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-slate-300 hover:text-white transition group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>Back to Dashboard</span>
            </Link>
            
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Captionly
            </h1>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">{video.title}</h1>
          <p className="text-slate-400">Edit your captions and customize their appearance</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left panel - Video player and styling */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video player */}
            <div className="bg-black rounded-lg overflow-hidden relative">
              {video.original_url ? (
                <video 
                  ref={videoRef}
                  src={video.original_url} 
                  className="w-full aspect-video"
                  controls={false}
                />
              ) : (
                <div className="w-full aspect-video bg-slate-800 flex items-center justify-center">
                  <p className="text-slate-400">Video preview not available</p>
                </div>
              )}
              
              {/* Caption overlay */}
              {isPlaying && activeCaptionId && (
                <div className="absolute bottom-16 left-0 right-0 flex justify-center">
                  <div className="bg-black/70 text-white px-4 py-2 rounded-md text-lg max-w-[80%] text-center">
                    {captions.find(c => c.id === activeCaptionId)?.text}
                  </div>
                </div>
              )}
              
              {/* Video controls */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm p-4 flex items-center gap-4">
                <button 
                  onClick={togglePlayPause}
                  className="text-white hover:text-blue-400 transition"
                >
                  {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </button>
                
                <div className="text-white text-sm">
                  {formatTime(currentTime)}
                </div>
                
                {/* Progress bar would go here in a full implementation */}
                <div className="flex-1 h-1 bg-white/20 rounded-full">
                  {videoRef.current && videoRef.current.duration && (
                    <div 
                      className="h-1 bg-blue-500 rounded-full" 
                      style={{ width: `${(currentTime / videoRef.current.duration) * 100}%` }}
                    />
                  )}
                </div>
              </div>
            </div>
            
            {/* Caption styling options */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
              <h3 className="text-lg font-medium text-white mb-4">Caption Styling</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Font Style</label>
                  <select className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white">
                    <option>Arial</option>
                    <option>Helvetica</option>
                    <option>Roboto</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Font Size</label>
                  <select className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white">
                    <option>Small</option>
                    <option selected>Medium</option>
                    <option>Large</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Text Color</label>
                  <select className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white">
                    <option>White</option>
                    <option>Yellow</option>
                    <option>Blue</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Position</label>
                  <select className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white">
                    <option>Bottom</option>
                    <option>Middle</option>
                    <option>Top</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right panel - Caption editor */}
          <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6 h-[calc(100vh-12rem)] flex flex-col">
            <h3 className="text-lg font-medium text-white mb-4">Caption Editor</h3>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {captions.map((caption) => (
                <div 
                  key={caption.id} 
                  className={`p-4 rounded-lg border transition-all ${
                    activeCaptionId === caption.id 
                      ? 'bg-blue-900/30 border-blue-500/50' 
                      : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600/50'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-sm text-slate-400">
                      {formatTime(caption.start_time)} - {formatTime(caption.end_time)}
                    </div>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => jumpToCaption(caption)}
                        className="text-slate-400 hover:text-blue-400 transition"
                        title="Jump to this caption"
                      >
                        <Play size={16} />
                      </button>
                      
                      <button 
                        onClick={() => deleteCaption(caption.id)}
                        className="text-slate-400 hover:text-red-400 transition"
                        title="Delete caption"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <textarea
                    value={caption.text}
                    onChange={(e) => updateCaptionText(caption.id, e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white resize-none"
                    rows={2}
                  />
                </div>
              ))}
            </div>
            
            <div className="pt-4 border-t border-white/10 mt-4">
              <Button 
                variant="outline" 
                className="w-full flex items-center justify-center gap-2 bg-white/5"
              >
                <Plus size={16} />
                Add Caption
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer with action buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/80 backdrop-blur-md border-t border-white/10 py-4">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <Button 
            variant="outline" 
            className="bg-white/5"
            onClick={() => router.push('/dashboard')}
          >
            Cancel
          </Button>
          
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="bg-white/5 flex items-center gap-2"
              onClick={saveCaptions}
            >
              <Save size={16} />
              Save Draft
            </Button>
            
            <Button 
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 flex items-center gap-2"
              onClick={renderVideo}
              disabled={rendering}
            >
              {rendering ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Processing...
                </>
              ) : (
                <>
                  Render Video
                  <ChevronRight size={16} />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 