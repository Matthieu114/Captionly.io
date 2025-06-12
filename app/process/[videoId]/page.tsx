"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useUser } from "@/lib/useUser"

interface Video {
    id: string
    title: string
    status: 'uploading' | 'ready' | 'error' | 'transcribing'
    created_at: string
}

export default function ProcessPage() {
    const { user, loading } = useUser()
    const [video, setVideo] = useState<Video | null>(null)
    const [fetching, setFetching] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const params = useParams()
    const videoId = params.videoId as string

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

                setVideo(data)
                setFetching(false)

                // If video processing is complete, redirect to edit page
                if (data.status === 'ready') {
                    router.replace(`/edit/${videoId}`)
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

                    // Redirect when processing is complete
                    if (updatedVideo.status === 'ready') {
                        setTimeout(() => {
                            router.replace(`/edit/${videoId}`)
                        }, 2000) // Give user time to see completion
                    }
                }
            )
            .subscribe()

        return () => {
            subscription.unsubscribe()
        }
    }, [user, loading, videoId, router])

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
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Processing Video</h1>
                    <p className="text-slate-300">{video.title}</p>
                </div>

                <div className="bg-[#181f2a]/90 rounded-xl shadow-lg p-8">
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

                    {video.status === 'ready' && (
                        <div className="mt-8 text-center">
                            <p className="text-green-400 mb-4">✨ Processing complete! Redirecting to editor...</p>
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