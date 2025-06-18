"use client"

import { useState, useRef, useEffect, forwardRef, ForwardedRef, useImperativeHandle } from "react"
import { useVideoUrl } from "@/lib/useVideoUrl"
import { Play, Pause } from "lucide-react"

interface VideoPlayerProps {
  videoId: string
  onTimeUpdate?: (currentTime: number) => void
  onPlayStateChange?: (isPlaying: boolean) => void
  className?: string
  autoPlay?: boolean
  controls?: boolean
}

// Define a handle type for the ref
export interface VideoPlayerHandle {
  play: () => Promise<void>;
  pause: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  seek: (time: number) => void;
}

export const VideoPlayer = forwardRef(function VideoPlayer(
  {
    videoId,
    onTimeUpdate,
    onPlayStateChange,
    className = "w-full aspect-video",
    autoPlay = false,
    controls = false
  }: VideoPlayerProps,
  ref: ForwardedRef<VideoPlayerHandle>
) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const { videoUrl, loading, error } = useVideoUrl(videoId)

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    play: async () => {
      if (videoRef.current) {
        await videoRef.current.play();
      }
    },
    pause: () => {
      if (videoRef.current) {
        videoRef.current.pause();
      }
    },
    getCurrentTime: () => currentTime,
    getDuration: () => duration,
    seek: (time: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = time;
      }
    }
  }), [currentTime, duration]);

  // Set up video event listeners
  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement) return

    const handleTimeUpdate = () => {
      const time = videoElement.currentTime
      setCurrentTime(time)
      if (onTimeUpdate) onTimeUpdate(time)
    }

    const handleDurationChange = () => {
      setDuration(videoElement.duration)
    }

    const handlePlay = () => {
      setIsPlaying(true)
      if (onPlayStateChange) onPlayStateChange(true)
    }

    const handlePause = () => {
      setIsPlaying(false)
      if (onPlayStateChange) onPlayStateChange(false)
    }

    videoElement.addEventListener('timeupdate', handleTimeUpdate)
    videoElement.addEventListener('durationchange', handleDurationChange)
    videoElement.addEventListener('play', handlePlay)
    videoElement.addEventListener('pause', handlePause)

    return () => {
      videoElement.removeEventListener('timeupdate', handleTimeUpdate)
      videoElement.removeEventListener('durationchange', handleDurationChange)
      videoElement.removeEventListener('play', handlePlay)
      videoElement.removeEventListener('pause', handlePause)
    }
  }, [onTimeUpdate, onPlayStateChange])

  // Load video when URL is available
  useEffect(() => {
    if (videoUrl && videoRef.current) {
      videoRef.current.load()
      if (autoPlay) {
        videoRef.current.play().catch(err => {
          console.error("Error auto-playing video:", err)
        })
      }
    }
  }, [videoUrl, autoPlay])

  // Toggle play/pause
  const togglePlayPause = () => {
    if (!videoRef.current) return
    
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play().catch(err => {
        console.error("Error playing video:", err)
      })
    }
  }

  // Format time (seconds) to MM:SS format
  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60)
    const seconds = Math.floor(timeInSeconds % 60)
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  // Handle seeking
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !duration) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const pos = (e.clientX - rect.left) / rect.width
    videoRef.current.currentTime = pos * duration
  }

  if (loading) {
    return (
      <div className={`${className} bg-slate-800 flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  if (error || !videoUrl) {
    return (
      <div className={`${className} bg-slate-800 flex items-center justify-center`}>
        <p className="text-slate-400">Video not available</p>
      </div>
    )
  }

  return (
    <div className="relative bg-black rounded-lg overflow-hidden">
      <video 
        ref={videoRef}
        className={className}
        controls={controls}
        preload="auto"
        crossOrigin="anonymous"
        playsInline
      >
        <source src={videoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      
      {!controls && (
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
          
          {/* Progress bar */}
          <div 
            className="flex-1 h-1 bg-white/20 rounded-full cursor-pointer"
            onClick={handleSeek}
          >
            <div 
              className="h-1 bg-blue-500 rounded-full" 
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
          
          <div className="text-white text-sm">
            {formatTime(duration)}
          </div>
        </div>
      )}
    </div>
  )
}) 