"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { useUser } from "@/lib/useUser"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

interface Video {
    id: string
    title: string
    status: 'uploading' | 'ready' | 'error' | 'transcribing' | 'rendering' | 'rendered'
    created_at: string
}

export default function ProcessPage() {
    const { user, loading } = useUser()
    const [video, setVideo] = useState<Video | null>(null)
    const [fetching, setFetching] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [progress, setProgress] = useState(0)
    const router = useRouter()
    const params = useParams()
    const searchParams = useSearchParams()
    const videoId = params.videoId as string
    const stage = searchParams.get('stage') || 'transcribing'
    const supabase = createClient()

    // Simulate progress for demo purposes
    useEffect(() => {
        if (!video) return
        
        if (stage === 'rendering' && video.status !== 'rendered') {
            // Simulate rendering progress
            const interval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 100) {
                        clearInterval(interval)
                        
                        // Simulate completion after reaching 100%
                        setTimeout(() => {
                            // Update video status to rendered
                            supabase
                                .from("videos")
                                .update({ status: 'rendered' })
                                .eq("id", videoId)
                                .then(() => {
                                    // Redirect to download page
                                    router.replace(`/download/${videoId}`)
                                })
                        }, 1000)
                        
                        return 100
                    }
                    return prev + Math.random() * 5
                })
            }, 500)
            
            return () => clearInterval(interval)
        }
    }, [video, stage, videoId, router])

    useEffect(() => {
        if (!loading && !user) {
            router.replace("/")
            return
        }

        if (!user || !videoId) return

        // Fetch initial video data
        const fetchVideo = async () => {
            try {
                const { data, error } = await supabase
                    .from("videos")
                    .select("id, title, status, created_at")
                    .eq("id", videoId)
                    .eq("user_id", user.id)
                    .single()

                if (error) throw error
                if (!data) throw new Error("Video not found")

                // If we're in rendering stage, update the status
                if (stage === 'rendering' && data.status !== 'rendering' && data.status !== 'rendered') {
                    await supabase
                        .from("videos")
                        .update({ status: 'rendering' })
                        .eq("id", videoId)
                    
                    data.status = 'rendering'
                }

                setVideo(data)
                setFetching(false)

                // Handle redirects based on status and stage
                if (stage !== 'rendering') {
                    if (data.status === 'ready') {
                        router.replace(`/edit/${videoId}`)
                    } else if (data.status === 'rendered') {
                        router.replace(`/download/${videoId}`)
                    }
                } else if (data.status === 'rendered') {
                    // If already rendered, go to download
                    router.replace(`/download/${videoId}`)
                }
            } catch (err) {
                console.error("Error fetching video:", err)
                setError(err instanceof Error ? err.message : "Failed to load video")
                setFetching(false)
            }
        }

        fetchVideo()

        // Set up real-time subscription for status updates
        const subscription = supabase
            .channel(`video-${videoId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'videos',
                    filter: `id=eq.${videoId}`
                },
                (payload) => {
                    const updatedVideo = payload.new as Video
                    setVideo(updatedVideo)

                    // Handle redirects based on status updates
                    if (stage !== 'rendering') {
                        if (updatedVideo.status === 'ready') {
                            setTimeout(() => {
                                router.replace(`/edit/${videoId}`)
                            }, 2000)
                        } else if (updatedVideo.status === 'rendered') {
                            setTimeout(() => {
                                router.replace(`/download/${videoId}`)
                            }, 2000)
                        }
                    } else if (updatedVideo.status === 'rendered') {
                        setTimeout(() => {
                            router.replace(`/download/${videoId}`)
                        }, 2000)
                    }
                }
            )
            .subscribe()

        return () => {
            subscription.unsubscribe()
        }
    }, [user, loading, videoId, router, stage])

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

    if (error || !video) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155]">
                <div className="text-center">
                    <div className="text-red-400 text-xl mb-4">❌ Error</div>
                    <p className="text-white mb-4">{error || "Video not found"}</p>
                    <button
                        onClick={() => router.push("/dashboard")}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        )
    }

    const getStepStatus = (step: string) => {
        if (stage === 'rendering') {
            switch (step) {
                case 'save_captions':
                    return video.status === 'rendering' || video.status === 'rendered' ? 'complete' : 'pending'
                case 'render':
                    return video.status === 'rendering' ? 'active' : (video.status === 'rendered' ? 'complete' : 'pending')
                case 'finalize':
                    return video.status === 'rendered' ? 'complete' : 'pending'
                default:
                    return 'pending'
            }
        } else {
            // Original transcription flow
            switch (video.status) {
                case 'transcribing':
                    if (step === 'upload') return 'complete'
                    if (step === 'transcribe') return 'active'
                    return 'pending'
                case 'ready':
                    return 'complete'
                case 'error':
                    return 'error'
                default:
                    return 'pending'
            }
        }
    }

    const StepIcon = ({ status }: { status: 'complete' | 'active' | 'pending' | 'error' }) => {
        switch (status) {
            case 'complete':
                return <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-sm">✓</div>
            case 'active':
                return <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                </div>
            case 'error':
                return <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-sm">✕</div>
            default:
                return <div className="w-6 h-6 bg-gray-500 rounded-full"></div>
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155] px-4 py-10">
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2 text-slate-300 hover:text-white transition group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span>Back to Dashboard</span>
                    </Link>
                </div>
                
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        {stage === 'rendering' ? 'Rendering Video' : 'Processing Video'}
                    </h1>
                    <p className="text-slate-300">{video.title}</p>
                </div>

                <div className="bg-[#181f2a]/90 rounded-xl shadow-lg p-8">
                    {stage === 'rendering' ? (
                        // Rendering flow
                        <div className="space-y-6">
                            {/* Save Captions Step */}
                            <div className="flex items-center space-x-4">
                                <StepIcon status={getStepStatus('save_captions')} />
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-white">Saving captions</h3>
                                    <p className="text-slate-400 text-sm">
                                        Your edited captions are being saved
                                    </p>
                                </div>
                            </div>

                            {/* Rendering Step */}
                            <div className="flex items-center space-x-4">
                                <StepIcon status={getStepStatus('render')} />
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-white">Rendering video</h3>
                                    <p className="text-slate-400 text-sm">
                                        {video.status === 'rendering'
                                            ? 'Burning captions into your video...'
                                            : video.status === 'rendered'
                                                ? 'Video rendering completed'
                                                : 'Waiting to start rendering'
                                        }
                                    </p>
                                </div>
                            </div>

                            {/* Progress bar */}
                            {video.status === 'rendering' && (
                                <div className="mt-2 mb-4">
                                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                                            style={{ width: `${Math.min(progress, 100)}%` }}
                                        ></div>
                                    </div>
                                    <div className="text-right text-xs text-slate-400 mt-1">
                                        {Math.min(Math.round(progress), 100)}%
                                    </div>
                                </div>
                            )}

                            {/* Finalize Step */}
                            <div className="flex items-center space-x-4">
                                <StepIcon status={getStepStatus('finalize')} />
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-white">Finalizing</h3>
                                    <p className="text-slate-400 text-sm">
                                        {video.status === 'rendered'
                                            ? 'Your video is ready for download!'
                                            : 'Preparing your video for download'
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Transcription flow
                        <div className="space-y-6">
                            {/* Upload Complete Step */}
                            <div className="flex items-center space-x-4">
                                <StepIcon status={getStepStatus('upload')} />
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-white">Upload complete</h3>
                                    <p className="text-slate-400 text-sm">Your video has been successfully uploaded</p>
                                </div>
                            </div>

                            {/* Transcribing Step */}
                            <div className="flex items-center space-x-4">
                                <StepIcon status={getStepStatus('transcribe')} />
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-white">Transcribing audio</h3>
                                    <p className="text-slate-400 text-sm">
                                        {video.status === 'transcribing'
                                            ? 'Converting speech to text using AI...'
                                            : video.status === 'ready'
                                                ? 'Audio transcription completed'
                                                : 'Waiting to start transcription'
                                        }
                                    </p>
                                </div>
                            </div>

                            {/* Syncing Step */}
                            <div className="flex items-center space-x-4">
                                <StepIcon status={video.status === 'ready' ? 'complete' : 'pending'} />
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-white">Syncing text to timestamps</h3>
                                    <p className="text-slate-400 text-sm">
                                        {video.status === 'ready'
                                            ? 'Subtitles have been synchronized with video'
                                            : 'Preparing to sync subtitles with video timing'
                                        }
                                    </p>
                                </div>
                            </div>

                            {/* Complete Step */}
                            <div className="flex items-center space-x-4">
                                <StepIcon status={video.status === 'ready' ? 'complete' : 'pending'} />
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-white">Subtitles ready!</h3>
                                    <p className="text-slate-400 text-sm">
                                        {video.status === 'ready'
                                            ? 'Your subtitles are ready for editing'
                                            : 'Almost there...'
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {video.status === 'ready' && stage !== 'rendering' && (
                        <div className="mt-8 text-center">
                            <p className="text-green-400 mb-4">✨ Processing complete! Redirecting to editor...</p>
                        </div>
                    )}

                    {video.status === 'rendered' && (
                        <div className="mt-8 text-center">
                            <p className="text-green-400 mb-4">✨ Rendering complete! Redirecting to download page...</p>
                        </div>
                    )}

                    {video.status === 'error' && (
                        <div className="mt-8 text-center">
                            <p className="text-red-400 mb-4">❌ Something went wrong during processing</p>
                            <button
                                onClick={() => router.push("/dashboard")}
                                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                Back to Dashboard
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
} 