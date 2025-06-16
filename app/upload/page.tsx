"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/lib/useUser"
import { createClient } from "@/utils/supabase/client"
import { Upload, X, ArrowLeft, FileVideo, CheckCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import Link from "next/link"

export default function UploadPage() {
    const { user, loading: userLoading } = useUser()
    const router = useRouter()
    const { toast } = useToast()
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [progress, setProgress] = useState(0)
    const [dragOver, setDragOver] = useState(false)
    const [processingThumbnail, setProcessingThumbnail] = useState(false)
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const supabase = createClient()

    const validateFile = useCallback((file: File) => {
        setError(null)

        // Validate file type
        if (!file.type.includes("video/mp4")) {
            setError("Please upload an MP4 video file")
            return false
        }

        // Validate file size (100MB = 100 * 1024 * 1024 bytes)
        if (file.size > 100 * 1024 * 1024) {
            setError("File size must be less than 100MB")
            return false
        }

        return true
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(false)

        const droppedFile = e.dataTransfer.files[0]
        if (!droppedFile) return

        if (validateFile(droppedFile)) {
            setFile(droppedFile)
            generateThumbnailPreview(droppedFile)
        }
    }, [validateFile])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(false)
    }, [])

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (!selectedFile) return

        if (validateFile(selectedFile)) {
            setFile(selectedFile)
            generateThumbnailPreview(selectedFile)
        }
    }, [validateFile])

    const generateThumbnailPreview = useCallback((videoFile: File) => {
        // Create a URL for the video file
        const videoUrl = URL.createObjectURL(videoFile)

        // Set up video element
        const video = videoRef.current
        if (!video) return

        video.src = videoUrl
        video.currentTime = 1.0 // Seek to 1 second

        // Once the video has seeked to the specified time
        const handleVideoSeeked = () => {
            // Get the canvas element
            const canvas = canvasRef.current
            if (!canvas) return

            // Set canvas dimensions
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight

            // Draw the current video frame to the canvas
            const ctx = canvas.getContext('2d')
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

                // Convert canvas to data URL
                const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8)
                setThumbnailPreview(thumbnailUrl)

                // Clean up
                video.removeEventListener('seeked', handleVideoSeeked)
                URL.revokeObjectURL(videoUrl)
            }
        }

        video.addEventListener('seeked', handleVideoSeeked)

        // Handle errors
        video.addEventListener('error', () => {
            console.error('Error loading video for thumbnail generation')
            URL.revokeObjectURL(videoUrl)
        })
    }, [])

    const extractThumbnail = useCallback(async (videoId: string) => {
        if (!thumbnailPreview) return null

        try {
            setProcessingThumbnail(true)

            // Get the user for authentication
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                throw new Error("Authentication required")
            }

            const response = await fetch('/api/extract-thumbnail', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    videoId,
                    thumbnailDataUrl: thumbnailPreview
                }),
            })

            if (!response.ok) {
                const error = await response.json()
                console.error('Thumbnail generation error:', error)
                return null
            }

            const data = await response.json()
            return data.thumbnailUrl
        } catch (error) {
            console.error('Error extracting thumbnail:', error)
            return null
        } finally {
            setProcessingThumbnail(false)
        }
    }, [thumbnailPreview])

    const simulateProgress = useCallback(() => {
        setProgress(0)
        const interval = setInterval(() => {
            setProgress(current => {
                if (current >= 95) {
                    clearInterval(interval)
                    return current
                }
                return current + 5
            })
        }, 500)
        return interval
    }, [])

    const handleUpload = useCallback(async () => {
        if (!file || !user) return

        try {
            setUploading(true)
            setError(null)

            // Start progress simulation
            const progressInterval = simulateProgress()

            // Create a unique file name
            const fileExt = file.name.split(".").pop()
            const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
            const filePath = `${user.id}/${fileName}`

            // Upload to Supabase Storage
            const { error: uploadError, data } = await supabase.storage
                .from("videos")
                .upload(filePath, file, {
                    cacheControl: "3600",
                    upsert: false
                })

            // Clear progress simulation
            clearInterval(progressInterval)
            setProgress(100)

            if (uploadError) throw uploadError

            // Get the public URL for the uploaded file
            const { data: { publicUrl } } = supabase.storage
                .from("videos")
                .getPublicUrl(filePath)

            // Create database entry
            const { error: dbError, data: videoData } = await supabase.from("videos").insert({
                user_id: user.id,
                title: file.name.split(".")[0], // Use filename as initial title
                status: "ready", // Video is ready for subtitle generation
                storage_path: filePath,
                original_url: publicUrl, // Add the public URL as original_url
                size: file.size,
            }).select('id').single()

            if (dbError) throw dbError

            // Extract thumbnail from the video
            if (videoData?.id) {
                await extractThumbnail(videoData.id)
            }

            toast({
                title: "Upload successful!",
                description: "Your video is ready for subtitle generation.",
                duration: 5000,
            })

            // Redirect to dashboard
            router.push("/dashboard")
        } catch (err) {
            console.error("Upload error:", err)
            setError("Failed to upload video. Please try again.")
            setProgress(0)
            toast({
                title: "Upload failed",
                description: "There was an error uploading your video. Please try again.",
                variant: "destructive",
                duration: 5000,
            })
        } finally {
            setUploading(false)
        }
    }, [file, user, router, toast, simulateProgress, extractThumbnail])

    useEffect(() => {
        if (!userLoading && !user) {
            router.replace("/login?redirect=/upload")
        }
    }, [user, userLoading, router])

    // Animation variants
    const fadeIn = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    }

    if (userLoading || !user) return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155]">
            <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-400"></div>
                <div className="text-white text-lg">Loading...</div>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155] relative">
            {/* Hidden video and canvas for thumbnail generation */}
            <video
                ref={videoRef}
                className="hidden"
                muted
                playsInline
            />
            <canvas
                ref={canvasRef}
                className="hidden"
            />

            {/* Background elements */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[10%] right-[15%] w-64 h-64 rounded-full bg-purple-500/10 blur-3xl"></div>
                <div className="absolute top-[40%] left-[10%] w-72 h-72 rounded-full bg-blue-500/10 blur-3xl"></div>
                <div className="absolute bottom-[20%] right-[20%] w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl"></div>
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10"></div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-12">
                {/* Header with navigation */}
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

                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={fadeIn}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-xl mx-auto"
                >
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl shadow-xl p-8 border border-white/10">
                        <h1 className="text-2xl font-bold text-white mb-2">Upload Video</h1>
                        <p className="text-slate-400 mb-8">Upload your video to generate captions</p>

                        <div className="space-y-6">
                            {!file ? (
                                <div
                                    onDrop={handleDrop}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    className={`border-2 border-dashed rounded-xl p-10 text-center transition-all duration-300 ${dragOver
                                        ? "border-blue-500 bg-blue-500/10 scale-[1.02]"
                                        : "border-slate-700 hover:border-slate-500 hover:bg-white/5"
                                        }`}
                                >
                                    <input
                                        type="file"
                                        accept="video/mp4"
                                        onChange={handleFileChange}
                                        className="hidden"
                                        id="video-upload"
                                        disabled={uploading}
                                    />
                                    <label
                                        htmlFor="video-upload"
                                        className="cursor-pointer flex flex-col items-center gap-4"
                                    >
                                        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${dragOver
                                            ? "bg-blue-500/20"
                                            : "bg-slate-800/80"
                                            }`}>
                                            <Upload className={`w-8 h-8 ${dragOver ? "text-blue-400" : "text-slate-400"}`} />
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-slate-200 font-medium text-lg">
                                                {dragOver ? "Drop your video here" : "Drag & drop or click to upload"}
                                            </p>
                                            <p className="text-sm text-slate-400">
                                                MP4 videos only (max 100MB)
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            ) : (
                                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                                    <div className="flex items-start gap-4">
                                        <div className="w-24 h-24 rounded-lg overflow-hidden bg-slate-800/80 flex-shrink-0">
                                            {thumbnailPreview ? (
                                                <img
                                                    src={thumbnailPreview}
                                                    alt="Video thumbnail"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <FileVideo className="w-6 h-6 text-blue-400" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-3">
                                                <div>
                                                    <p className="text-white font-medium text-lg truncate">{file.name}</p>
                                                    <p className="text-sm text-slate-400">
                                                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => setFile(null)}
                                                    className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition"
                                                    disabled={uploading}
                                                    aria-label="Remove file"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {uploading && (
                                                <div className="mt-4 space-y-2">
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className="text-slate-300">Uploading...</span>
                                                        <span className="text-blue-400">{progress}%</span>
                                                    </div>
                                                    <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
                                                        <div
                                                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                                                            style={{ width: `${progress}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {progress === 100 && processingThumbnail && (
                                                <div className="flex items-center gap-2 text-blue-400 mt-3">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent"></div>
                                                    <span className="text-sm">Processing video...</span>
                                                </div>
                                            )}

                                            {progress === 100 && !processingThumbnail && (
                                                <div className="flex items-center gap-2 text-green-400 mt-3">
                                                    <CheckCircle className="w-4 h-4" />
                                                    <span className="text-sm">Upload complete!</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="bg-red-500/20 text-red-300 text-sm p-4 rounded-lg border border-red-500/30">
                                    <div className="flex items-center gap-2">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-red-400">
                                            <path d="M12 9V14M12 17.5V18M6.6 20H17.4C18.8 20 19.5 20 19.9 19.65C20.3 19.3 20.5 18.7 20.8 17.6L21.8 12.6C22.1 11.3 22.2 10.7 22 10.2C21.8 9.7 21.1 9.3 19.9 8.5L15.3 5.5C14.2 4.8 13.7 4.5 13.1 4.5C12.5 4.5 12 4.8 10.9 5.5L6.1 8.5C4.9 9.3 4.2 9.7 4 10.2C3.8 10.7 3.9 11.3 4.2 12.6L5.2 17.6C5.5 18.7 5.7 19.3 6.1 19.65C6.5 20 7.2 20 8.6 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <span>{error}</span>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-3 mt-6">
                                <Button
                                    variant="outline"
                                    onClick={() => router.replace('/dashboard')}
                                    disabled={uploading || processingThumbnail}
                                    className="bg-transparent border-slate-700 hover:bg-white/5 text-slate-300"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleUpload}
                                    disabled={!file || uploading || processingThumbnail}
                                    className={`bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border border-white/10 shadow-lg shadow-blue-500/20 ${!file || uploading || processingThumbnail ? 'opacity-50' : ''}`}
                                >
                                    {uploading ? (
                                        <div className="flex items-center gap-2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                            <span>Uploading...</span>
                                        </div>
                                    ) : processingThumbnail ? (
                                        <div className="flex items-center gap-2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                            <span>Processing...</span>
                                        </div>
                                    ) : (
                                        "Upload Video"
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    )
} 