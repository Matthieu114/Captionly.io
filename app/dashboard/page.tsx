"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useUser } from "@/lib/useUser"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"

interface Video {
    id: string
    title: string
    status: 'uploading' | 'ready' | 'error' | 'transcribing'
    created_at: string
}

export default function DashboardPage() {
    const { user, loading } = useUser()
    const [videos, setVideos] = useState<Video[]>([])
    const [fetching, setFetching] = useState(false)
    const [generatingSubtitles, setGeneratingSubtitles] = useState<string | null>(null)
    const router = useRouter()

    async function handleLogout() {
        await supabase.auth.signOut()
        router.replace("/")
    }

    async function handleGenerateSubtitles(videoId: string) {
        setGeneratingSubtitles(videoId)

        try {
            // Get the session for authentication
            const { data: { session } } = await supabase.auth.getSession()

            const response = await fetch('/api/generate-subtitles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(session && { 'Authorization': `Bearer ${session.access_token}` })
                },
                body: JSON.stringify({ videoId }),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to generate subtitles')
            }

            // Update the video status in local state
            setVideos(prevVideos =>
                prevVideos.map(video =>
                    video.id === videoId
                        ? { ...video, status: 'transcribing' as const }
                        : video
                )
            )

            // Redirect to processing page
            router.push(`/process/${videoId}`)

        } catch (error) {
            console.error('Error generating subtitles:', error)
            alert(error instanceof Error ? error.message : 'Failed to generate subtitles. Please try again.')
        } finally {
            setGeneratingSubtitles(null)
        }
    }

    useEffect(() => {
        if (!loading && !user) router.replace("/")
    }, [user, loading, router])

    useEffect(() => {
        if (user) {
            setFetching(true)
            supabase
                .from("videos")
                .select("id, title, status, created_at")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .then(({ data }) => {
                    setVideos(data || [])
                    setFetching(false)
                })
        }
    }, [user])

    if (loading || (!user && !loading)) return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155]">
            <span className="text-white text-lg">Loading...</span>
        </div>
    )

    function getStatusDisplay(status: Video['status']) {
        const statusMap = {
            uploading: { color: 'bg-blue-500/80 text-white', text: 'Uploading' },
            ready: { color: 'bg-green-600/80 text-white', text: 'Ready' },
            transcribing: { color: 'bg-purple-500/80 text-white', text: 'Transcribing' },
            error: { color: 'bg-red-600/80 text-white', text: 'Error' }
        }

        return statusMap[status] || statusMap.error
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155] px-4 py-10">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-white">Your Videos</h1>
                    <div className="flex gap-4">
                        <Link href="/upload" className={buttonVariants({ variant: "default" })}>
                            Upload Video
                        </Link>
                        <Button
                            variant="secondary"
                            onClick={handleLogout}
                        >
                            Log out
                        </Button>
                    </div>
                </div>
                <div className="bg-[#181f2a]/90 rounded-xl shadow-lg p-6">
                    {fetching ? (
                        <div className="text-slate-300">Loading videos...</div>
                    ) : videos.length === 0 ? (
                        <div className="text-slate-400 text-center py-12">No videos uploaded yet.</div>
                    ) : (
                        <ul className="divide-y divide-slate-800">
                            {videos.map(video => {
                                const statusInfo = getStatusDisplay(video.status)
                                return (
                                    <li key={video.id} className="py-4 flex items-center justify-between">
                                        <div>
                                            <div className="text-lg font-semibold text-white">{video.title}</div>
                                            <div className="text-xs text-slate-400">
                                                Uploaded: {new Date(video.created_at).toLocaleString()}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusInfo.color}`}>
                                                {statusInfo.text}
                                            </span>

                                            {/* Generate Subtitles CTA for ready videos */}
                                            {video.status === 'ready' && (
                                                <Button
                                                    onClick={() => handleGenerateSubtitles(video.id)}
                                                    disabled={generatingSubtitles === video.id}
                                                    size="sm"
                                                    className="bg-blue-600 hover:bg-blue-700"
                                                >
                                                    {generatingSubtitles === video.id ? 'Starting...' : 'Generate Subtitles'}
                                                </Button>
                                            )}

                                            {/* Process button for transcribing videos */}
                                            {video.status === 'transcribing' && (
                                                <Link href={`/process/${video.id}`}>
                                                    <Button size="sm" variant="outline">
                                                        View Progress
                                                    </Button>
                                                </Link>
                                            )}

                                            {/* Edit button placeholder for videos with subtitles */}
                                            <Link href={`/edit/${video.id}`} className="text-blue-400 hover:underline text-sm">
                                                Edit
                                            </Link>
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    )
} 