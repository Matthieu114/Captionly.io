"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { useUser } from "@/lib/useUser"
import Link from "next/link"
import { ArrowLeft, Play, Pause, ChevronRight, Trash2, Plus, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { v4 as uuidv4 } from 'uuid'
import { VideoPlayer, VideoPlayerHandle } from "@/components/VideoPlayer"

interface Video {
  id: string
  title: string
  status: 'uploading' | 'ready' | 'error' | 'transcribing' | 'captioned' | 'rendering' | 'rendered'
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
  
  const videoRef = useRef<VideoPlayerHandle>(null)
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

        // Update status to captioned if needed
        if (videoData.status === 'ready') {
          await supabase
            .from("videos")
            .update({ status: 'captioned' })
            .eq("id", videoId)
          
          videoData.status = 'captioned'
        }

        // Fetch captions
        const { data: captionsData, error: captionsError } = await supabase
          .from("captions")
          .select("*")
          .eq("video_id", videoId)
          .order("start_time", { ascending: true })

        if (captionsError) throw captionsError

        // Process captions - convert milliseconds to seconds
        if (captionsData && captionsData.length > 0) {
          const processedCaptions = captionsData.map(caption => ({
            ...caption,
            // Always convert from milliseconds to seconds
            start_time: caption.start_time / 1000,
            end_time: caption.end_time / 1000
          }))
          setCaptions(processedCaptions)
        } else {
          const fakeCaptions = generateFakeCaptions(videoId)
          setCaptions(fakeCaptions)
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

  // Handle time update from video player
  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time)
    
    // Find the active caption based on current time
    const activeCaption = captions.find(
      caption => 
        time >= caption.start_time && 
        time <= caption.end_time
    )
    
    setActiveCaptionId(activeCaption?.id || null)
  }

  // Handle play state change
  const handlePlayStateChange = (playing: boolean) => {
    setIsPlaying(playing)
  }

  // Jump to specific caption
  const jumpToCaption = (caption: Caption) => {
    if (!videoRef.current) return
    
    videoRef.current.seek(caption.start_time)
    setActiveCaptionId(caption.id)
    
    if (!isPlaying) {
      videoRef.current.play().catch(err => {
        console.error("Error playing video:", err)
      })
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

  // Add a new caption
  const addCaption = () => {
    // Find the last caption's end time or default to 0
    const lastCaption = captions[captions.length - 1]
    const startTime = lastCaption ? lastCaption.end_time + 0.1 : 0
    const endTime = startTime + 3 // Default 3 second duration
    
    const newCaption: Caption = {
      id: uuidv4(), // Generate a unique ID
      video_id: videoId,
      start_time: startTime,
      end_time: endTime,
      text: "New caption"
    }
    
    setCaptions(prevCaptions => [...prevCaptions, newCaption])
  }

  // Save captions
  const saveCaptions = async () => {
    try {
      console.log("Saving captions, current video status:", video?.status); // Debug log
      
      // Update video status to captioned if not already
      if (video && video.status !== 'captioned') {
        console.log("Updating video status to captioned"); // Debug log
        const { error: statusError } = await supabase
          .from("videos")
          .update({ status: 'captioned' })
          .eq("id", videoId)
        
        if (statusError) {
          console.error("Error updating video status:", statusError);
          throw new Error("Failed to update video status to captioned");
        }
        
        setVideo({...video, status: 'captioned'})
        console.log("Video status updated to captioned"); // Debug log
      }

      console.log("Saving captions to database:", captions.length, "captions"); // Debug log

      // For each caption, upsert it to the database
      for (const caption of captions) {
        // Convert seconds back to milliseconds as integers
        const captionToSave = {
          id: caption.id,
          video_id: caption.video_id,
          start_time: Math.round(caption.start_time * 1000), // Convert to milliseconds
          end_time: Math.round(caption.end_time * 1000),     // Convert to milliseconds
          text: caption.text
        }
        
        const { error } = await supabase
          .from("captions")
          .upsert(captionToSave)
        
        if (error) {
          console.error("Error saving caption:", error, captionToSave);
          throw error;
        }
      }
      
      console.log("All captions saved successfully"); // Debug log
      
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
      throw err; // Re-throw to handle in renderVideo
    }
  }

  // Render video with captions
  const renderVideo = async () => {
    setRendering(true)
    
    try {
      console.log("Starting render process"); // Debug log
      
      // Save captions first
      await saveCaptions()
      
      // Add a small delay to ensure database is updated
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      console.log("Calling render-video API"); // Debug log
      
      // Call the render-video API to start the rendering process
      const response = await fetch('/api/render-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoId }),
      })
      
      console.log("Render API response status:", response.status); // Debug log
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error("Render API error:", errorData); // Debug log
        throw new Error(errorData.error || 'Failed to start rendering')
      }
      
      const responseData = await response.json()
      console.log("Render API success:", responseData); // Debug log
      
      // Redirect to processing page with rendering parameter
      router.push(`/process/${videoId}?stage=rendering`)
    } catch (err) {
      console.error("Error starting render:", err)
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to start rendering process.",
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
              <VideoPlayer 
                videoId={videoId} 
                onTimeUpdate={handleTimeUpdate}
                onPlayStateChange={handlePlayStateChange}
                ref={videoRef}
              />
              
              {/* Caption overlay */}
              {activeCaptionId && (
                <div className="absolute bottom-16 left-0 right-0 flex justify-center">
                  <div className="bg-black/70 text-white px-4 py-2 rounded-md text-lg max-w-[80%] text-center">
                    {captions.find(c => c.id === activeCaptionId)?.text}
                  </div>
                </div>
              )}
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
                    <option>Medium</option>
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
                onClick={addCaption}
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