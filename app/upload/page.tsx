"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/lib/useUser"
import { supabase } from "@/lib/supabase"
import { Upload } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"

export default function UploadPage() {
    const { user, loading: userLoading } = useUser()
    const router = useRouter()
    const { toast } = useToast()
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [progress, setProgress] = useState(0)
    const [dragOver, setDragOver] = useState(false)

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
        }
    }, [validateFile])

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
            const { error: dbError } = await supabase.from("videos").insert({
                user_id: user.id,
                title: file.name.split(".")[0], // Use filename as initial title
                status: "ready", // Video is ready for subtitle generation
                storage_path: filePath,
                original_url: publicUrl, // Add the public URL as original_url
                size: file.size,
            })

            if (dbError) throw dbError

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
    }, [file, user, router, toast, simulateProgress])

    useEffect(() => {
        if (!userLoading && !user) {
            router.replace("/login?redirect=/upload")
        }
    }, [user, userLoading, router])

    if (userLoading || !user) return null

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155] px-4 py-10">
            <div className="max-w-xl mx-auto">
                <div className="bg-[#181f2a]/90 rounded-xl shadow-lg p-6">
                    <h1 className="text-2xl font-bold text-white mb-6">Upload Video</h1>

                    <div className="space-y-4">
                        {!file ? (
                            <div
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragOver
                                    ? "border-blue-500 bg-blue-500/10"
                                    : "border-slate-600 hover:border-slate-500"
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
                                    className="cursor-pointer flex flex-col items-center gap-3"
                                >
                                    <Upload className={`w-10 h-10 ${dragOver ? "text-blue-400" : "text-slate-400"}`} />
                                    <span className="text-slate-300">
                                        Drag & drop or click to upload
                                    </span>
                                    <span className="text-sm text-slate-400">
                                        MP4 videos only (max 100MB)
                                    </span>
                                </label>
                            </div>
                        ) : (
                            <div className="bg-slate-800/50 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <p className="text-white font-medium">{file.name}</p>
                                        <p className="text-sm text-slate-400">
                                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setFile(null)}
                                        className="text-slate-400 hover:text-slate-300"
                                        disabled={uploading}
                                    >
                                        Remove
                                    </button>
                                </div>
                                {uploading && (
                                    <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
                                        <div
                                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                )}
                                {progress > 0 && progress < 100 && (
                                    <p className="text-sm text-slate-400 text-center">
                                        Uploading: {progress}%
                                    </p>
                                )}
                            </div>
                        )}

                        {error && (
                            <div className="text-red-400 text-sm mt-2">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 mt-6">
                            <Button
                                variant="ghost"
                                onClick={() => router.replace('/dashboard')}
                                disabled={uploading}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleUpload}
                                disabled={!file || uploading}
                            >
                                {uploading ? `Uploading ${progress}%` : "Upload"}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
} 