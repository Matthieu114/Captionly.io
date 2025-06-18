"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { useUser } from "@/lib/useUser"
import Link from "next/link"
import Image from "next/image"
import { Button, buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ThumbnailImage } from "@/components/ThumbnailImage"
import { motion } from "framer-motion"
import {
    Plus,
    LogOut,
    Trash2,
    FileVideo,
    Edit,
    ChevronRight,
    PlayCircle,
    Clock,
    AlertCircle,
    CheckCircle2,
    Loader2,
    UploadCloud,
    CheckCircle,
    FileText,
    HelpCircle
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface Video {
    id: string
    title: string
    status: 'uploading' | 'ready' | 'error' | 'transcribing' | 'captioned' | 'rendering' | 'rendered'
    created_at: string
    original_url?: string
    captioned_url?: string
    thumbnail_url?: string
}

export default function DashboardPage() {
    const { user, loading, logout } = useUser()
    const [videos, setVideos] = useState<Video[]>([])
    const [fetching, setFetching] = useState(false)
    const [generatingSubtitles, setGeneratingSubtitles] = useState<string | null>(null)
    const [deletingVideo, setDeletingVideo] = useState<string | null>(null)
    const router = useRouter()
    const { toast } = useToast()
    const supabase = createClient()

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    }

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    }

    async function handleLogout() {
        await logout()
    }

    async function handleDeleteVideo(videoId: string) {
        if (!confirm("Are you sure you want to delete this video? This action cannot be undone.")) {
            return
        }

        setDeletingVideo(videoId)

        try {
            // Get the video info to get the storage path
            const { data: videoData } = await supabase
                .from("videos")
                .select("storage_path")
                .eq("id", videoId)
                .single()

            if (videoData?.storage_path) {
                // Delete the video from storage
                await supabase.storage.from('videos').remove([videoData.storage_path])
            }

            // Delete captions if they exist
            const { data: captionsData } = await supabase
                .from("captions")
                .select("id")
                .eq("video_id", videoId)

            if (captionsData && captionsData.length > 0) {
                await supabase
                    .from("captions")
                    .delete()
                    .eq("video_id", videoId)
            }

            // Delete the video entry
            const { error } = await supabase
                .from("videos")
                .delete()
                .eq("id", videoId)

            if (error) throw error

            // Update local state
            setVideos(prevVideos => prevVideos.filter(video => video.id !== videoId))

            toast({
                title: "Video deleted",
                description: "The video has been successfully deleted.",
                duration: 5000,
            })

        } catch (error) {
            console.error('Error deleting video:', error)
            toast({
                title: "Error",
                description: "Failed to delete video. Please try again.",
                variant: "destructive",
                duration: 5000,
            })
        } finally {
            setDeletingVideo(null)
        }
    }

    async function handleGenerateSubtitles(videoId: string) {
        setGeneratingSubtitles(videoId)

        try {
            // Get the user for authentication
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                throw new Error("Authentication required")
            }

            const response = await fetch('/api/generate-subtitles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
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
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : 'Failed to generate subtitles. Please try again.',
                variant: "destructive",
                duration: 5000,
            })
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
                .select("id, title, status, created_at, original_url, thumbnail_url")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .then(({ data }) => {
                    setVideos(data || [])
                    setFetching(false)
                })
        }
    }, [user])

    function getStatusIcon(status: Video['status']) {
        switch (status) {
            case 'uploading':
                return <UploadCloud className="w-3.5 h-3.5" />
            case 'ready':
                return <CheckCircle className="w-3.5 h-3.5" />
            case 'error':
                return <AlertCircle className="w-3.5 h-3.5" />
            case 'transcribing':
                return <Loader2 className="w-3.5 h-3.5 animate-spin" />
            case 'captioned':
                return <FileText className="w-3.5 h-3.5" />
            case 'rendering':
                return <Loader2 className="w-3.5 h-3.5 animate-spin" />
            case 'rendered':
                return <CheckCircle className="w-3.5 h-3.5" />
            default:
                return <HelpCircle className="w-3.5 h-3.5" />
        }
    }

    function getStatusDisplay(status: Video['status']) {
        switch (status) {
            case 'uploading':
                return { text: 'Uploading', color: 'text-blue-400 border-blue-400/30' }
            case 'ready':
                return { text: 'Ready', color: 'text-green-400 border-green-400/30' }
            case 'error':
                return { text: 'Error', color: 'text-red-400 border-red-400/30' }
            case 'transcribing':
                return { text: 'Transcribing', color: 'text-amber-400 border-amber-400/30' }
            case 'captioned':
                return { text: 'Captioned', color: 'text-purple-400 border-purple-400/30' }
            case 'rendering':
                return { text: 'Rendering', color: 'text-amber-400 border-amber-400/30' }
            case 'rendered':
                return { text: 'Rendered', color: 'text-green-400 border-green-400/30' }
            default:
                return { text: 'Unknown', color: 'text-slate-400 border-slate-400/30' }
        }
    }

    // Loading skeleton
    if (loading || (!user && !loading)) return (
        <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155]">
            <DashboardSkeleton />
        </div>
    )

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155] relative">
            {/* Background elements */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[10%] right-[15%] w-64 h-64 rounded-full bg-purple-500/10 blur-3xl"></div>
                <div className="absolute top-[40%] left-[10%] w-72 h-72 rounded-full bg-blue-500/10 blur-3xl"></div>
                <div className="absolute bottom-[20%] right-[20%] w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl"></div>
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10"></div>
            </div>

            <div className="relative z-10 container mx-auto px-4 py-12">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Your Videos</h1>
                        <p className="text-slate-400 mt-2">Manage your uploaded videos and generate captions</p>
                    </div>
                    <div className="flex gap-3">
                        <Link
                            href="/upload"
                            className={buttonVariants({
                                variant: "default",
                                className: "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg shadow-blue-500/20 border border-white/10 gap-2"
                            })}
                        >
                            <Plus className="w-4 h-4" />
                            Upload Video
                        </Link>
                        <Button
                            variant="outline"
                            onClick={handleLogout}
                            className="bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 gap-2"
                        >
                            <LogOut className="w-4 h-4" />
                            Log out
                        </Button>
                    </div>
                </div>

                <div className="bg-white/5 backdrop-blur-sm rounded-xl shadow-xl p-6 border border-white/10">
                    {fetching ? (
                        <VideoListSkeleton />
                    ) : videos.length === 0 ? (
                        <EmptyState />
                    ) : (
                        <motion.ul
                            className="divide-y divide-white/10"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                        >
                            {videos.map(video => {
                                const statusInfo = getStatusDisplay(video.status)
                                return (
                                    <motion.li
                                        key={video.id}
                                        className="py-5 flex flex-col md:flex-row gap-4"
                                        variants={itemVariants}
                                    >
                                        {/* Video thumbnail */}
                                        <div className="relative w-full md:w-48 h-32 md:h-24 overflow-hidden rounded-lg bg-slate-800 flex-shrink-0">
                                            <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm z-10 flex items-center justify-center">
                                                <PlayCircle className="w-10 h-10 text-white/70" />
                                            </div>
                                            <ThumbnailImage
                                                videoId={video.id}
                                                title={video.title}
                                                hasThumbnail={!!video.thumbnail_url}
                                                width={192}
                                                height={108}
                                                className="object-cover w-full h-full"
                                            />
                                        </div>

                                        {/* Video info */}
                                        <div className="flex-1 min-w-0 flex flex-col md:flex-row justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-lg font-semibold text-white truncate">{video.title}</h3>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusInfo.color} flex items-center gap-1.5`}>
                                                        {getStatusIcon(video.status)}
                                                        {statusInfo.text}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                                                    <time dateTime={video.created_at}>
                                                        {new Date(video.created_at).toLocaleDateString('en-US', {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric'
                                                        })}
                                                    </time>
                                                </div>
                                            </div>

                                            {/* Video actions */}
                                            <div className="flex gap-2 mt-4 md:mt-0">
                                                {video.status === 'ready' && (
                                                    <Button
                                                        size="sm"
                                                        variant="default"
                                                        className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                                                        onClick={() => handleGenerateSubtitles(video.id)}
                                                        disabled={generatingSubtitles === video.id}
                                                    >
                                                        {generatingSubtitles === video.id ? (
                                                            <>
                                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                Processing...
                                                            </>
                                                        ) : (
                                                            <>Generate Subtitles</>
                                                        )}
                                                    </Button>
                                                )}

                                                {video.status === 'transcribing' && (
                                                    <Link
                                                        href={`/process/${video.id}`}
                                                        className={buttonVariants({
                                                            variant: "outline",
                                                            size: "sm",
                                                            className: "bg-white/5 backdrop-blur-sm border border-white/10"
                                                        })}
                                                    >
                                                        View Progress
                                                    </Link>
                                                )}

                                                {video.status === 'captioned' && (
                                                    <Link
                                                        href={`/edit/${video.id}`}
                                                        className={buttonVariants({
                                                            variant: "default",
                                                            size: "sm",
                                                            className: "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                                                        })}
                                                    >
                                                        Edit Captions
                                                    </Link>
                                                )}

                                                {video.status === 'rendering' && (
                                                    <Link
                                                        href={`/process/${video.id}?stage=rendering`}
                                                        className={buttonVariants({
                                                            variant: "outline",
                                                            size: "sm",
                                                            className: "bg-white/5 backdrop-blur-sm border border-white/10"
                                                        })}
                                                    >
                                                        View Progress
                                                    </Link>
                                                )}

                                                {video.status === 'rendered' && (
                                                    <Link
                                                        href={`/download/${video.id}`}
                                                        className={buttonVariants({
                                                            variant: "default",
                                                            size: "sm",
                                                            className: "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                                                        })}
                                                    >
                                                        Download
                                                    </Link>
                                                )}

                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10"
                                                    onClick={() => handleDeleteVideo(video.id)}
                                                    disabled={deletingVideo === video.id}
                                                >
                                                    {deletingVideo === video.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </motion.li>
                                )
                            })}
                        </motion.ul>
                    )}
                </div>
            </div>
        </div>
    )
}

// Skeleton loaders
function DashboardSkeleton() {
    return (
        <div className="container mx-auto px-4 py-12">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-4">
                <div>
                    <Skeleton className="w-48 h-8 mb-2" />
                    <Skeleton className="w-72 h-5" />
                </div>
                <div className="flex gap-3">
                    <Skeleton className="w-36 h-10" />
                    <Skeleton className="w-28 h-10" />
                </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl shadow-xl p-6 border border-white/10">
                <VideoListSkeleton />
            </div>
        </div>
    )
}

function VideoListSkeleton() {
    // Create an array to render multiple skeleton items
    const skeletonItems = Array.from({ length: 3 }, (_, i) => i)

    return (
        <div className="divide-y divide-white/10">
            {skeletonItems.map((item) => (
                <div key={item} className="py-5 flex flex-col md:flex-row gap-4">
                    {/* Thumbnail skeleton */}
                    <Skeleton className="w-full md:w-48 h-32 md:h-24" />

                    {/* Content skeleton */}
                    <div className="flex-1 min-w-0 flex flex-col md:flex-row justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <Skeleton className="w-48 h-6" />
                                <Skeleton className="w-24 h-6 rounded-full" />
                            </div>
                            <Skeleton className="w-32 h-5" />
                        </div>

                        {/* Action buttons skeleton */}
                        <div className="flex items-center gap-3 mt-2 md:mt-0">
                            <Skeleton className="w-36 h-9" />
                            <Skeleton className="w-20 h-9" />
                            <Skeleton className="w-10 h-9" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

function EmptyState() {
    return (
        <div className="py-16 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <FileVideo className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No videos yet</h3>
            <p className="text-slate-400 text-center max-w-md mb-6">
                Upload your first video to get started with automatic captions
            </p>
            <Link
                href="/upload"
                className={buttonVariants({
                    variant: "default",
                    className: "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg shadow-blue-500/20 border border-white/10 gap-2"
                })}
            >
                <Plus className="w-4 h-4" />
                Upload Video
            </Link>
        </div>
    )
} 