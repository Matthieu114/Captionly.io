"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useUser } from "@/lib/useUser"
import Link from "next/link"

export default function DashboardPage() {
    const { user, loading } = useUser()
    const [videos, setVideos] = useState<any[]>([])
    const [fetching, setFetching] = useState(false)
    const router = useRouter()

    async function handleLogout() {
        await supabase.auth.signOut()
        router.replace("/")
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155] px-4 py-10">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-white">Your Videos</h1>
                    <div className="flex gap-4">
                        <Link href="/upload" className="rounded-lg bg-blue-500 hover:bg-blue-600 transition text-white px-6 py-3 text-lg font-semibold shadow-lg shadow-blue-900/20">Upload Video</Link>
                        <button onClick={handleLogout} className="rounded-lg bg-slate-700 hover:bg-slate-800 transition text-white px-6 py-3 text-lg font-semibold">Log out</button>
                    </div>
                </div>
                <div className="bg-[#181f2a]/90 rounded-xl shadow-lg p-6">
                    {fetching ? (
                        <div className="text-slate-300">Loading videos...</div>
                    ) : videos.length === 0 ? (
                        <div className="text-slate-400 text-center py-12">No videos uploaded yet.</div>
                    ) : (
                        <ul className="divide-y divide-slate-800">
                            {videos.map(video => (
                                <li key={video.id} className="py-4 flex items-center justify-between">
                                    <div>
                                        <div className="text-lg font-semibold text-white">{video.title}</div>
                                        <div className="text-xs text-slate-400">Uploaded: {new Date(video.created_at).toLocaleString()}</div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${video.status === 'ready' ? 'bg-green-600/80 text-white' : video.status === 'processing' ? 'bg-yellow-500/80 text-black' : 'bg-slate-700 text-slate-300'}`}>{video.status}</span>
                                        <Link href={`/edit/${video.id}`} className="text-blue-400 hover:underline text-sm">Edit</Link>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    )
} 