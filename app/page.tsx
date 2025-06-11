"use client"

import Link from "next/link"
import { useUser } from "@/lib/useUser"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function Home() {
    const { user, loading } = useUser()
    const router = useRouter()
    const [menuOpen, setMenuOpen] = useState(false)

    useEffect(() => {
        if (!loading && user) router.replace("/dashboard")
    }, [user, loading, router])

    if (loading || user) return null

    return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155] text-white relative overflow-hidden">
            {/* Gradient overlay */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-600/30 via-transparent to-transparent" />

            {/* Header */}
            <header className="w-full max-w-6xl mx-auto flex items-center justify-between py-5 px-6 z-10 rounded-b-xl bg-transparent backdrop-blur-md relative" style={{ WebkitBackdropFilter: 'blur(8px)' }}>
                <div className="flex items-center gap-2">
                    <span className="text-2xl font-extrabold tracking-tight text-blue-400">Captionly</span>
                    <span className="rounded bg-blue-900/40 text-xs px-2 py-1 ml-2 text-blue-200">AI Video Captions</span>
                </div>
                {/* Desktop Nav */}
                <nav className="hidden md:flex flex-1 items-center justify-center gap-8">
                    <Link href="/pricing" className="font-semibold text-white hover:text-blue-300 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded px-3 py-2">Pricing</Link>
                    <Link href="/faq" className="font-semibold text-white hover:text-blue-300 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded px-3 py-2">FAQ</Link>
                    <Link href="/reviews" className="font-semibold text-white hover:text-blue-300 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded px-3 py-2">Reviews</Link>
                </nav>
                <div className="hidden md:flex items-center gap-4">
                    <Link
                        href="/login"
                        className="ml-4 rounded-lg border-2 border-orange-500 bg-orange-500/90 text-white font-bold px-5 py-2 shadow-lg shadow-orange-900/20 hover:bg-orange-600 hover:border-orange-600 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                    >
                        Login
                    </Link>
                </div>
                {/* Hamburger for mobile */}
                <button
                    className="md:hidden flex items-center justify-center p-2 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                    aria-label="Open menu"
                    onClick={() => setMenuOpen(true)}
                >
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-white">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
            </header>

            {/* Main Content (hidden when menu is open) */}
            <div className={`w-full flex-1 flex flex-col transition-opacity duration-200 ${menuOpen ? 'opacity-0' : 'opacity-100'}`}>
                <section className="flex-1 flex flex-col items-center justify-center z-10 px-4">
                    <h1 className="text-4xl md:text-6xl font-extrabold text-center leading-tight mb-6">
                        <span className="text-white">AI-Powered Video </span>
                        <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">Captioning</span>
                        <span className="text-white"> for Creators</span>
                    </h1>
                    <p className="text-lg md:text-2xl text-slate-200 text-center max-w-2xl mb-8">
                        Instantly generate, edit, and burn captions onto your videos. Boost accessibility, engagement, and reach with Captionly.io.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center mt-4">
                        <Link
                            href="https://your-demo-video-link.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg bg-orange-500 hover:bg-orange-600 transition text-white px-8 py-3 text-lg font-semibold shadow-lg shadow-orange-900/20"
                        >
                            See Live Demo
                        </Link>
                        <Link
                            href="/upload"
                            className="rounded-lg border border-blue-400 text-blue-200 hover:bg-blue-900/30 transition px-8 py-3 text-lg font-semibold"
                        >
                            Upload Video
                        </Link>
                    </div>
                </section>
                <footer className="w-full text-center text-xs text-slate-400 py-6 z-10">
                    &copy; {new Date().getFullYear()} Captionly.io &mdash; AI Video Captioning SaaS
                </footer>
            </div>

            {/* Mobile Menu Overlay */}
            <div
                className={`fixed inset-0 z-50 bg-[#181f2a] transform transition-transform duration-300 ease-in-out ${menuOpen ? 'translate-y-0' : '-translate-y-full'
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* Menu Header */}
                    <div className="flex items-center justify-between px-6 py-5" style={{ minHeight: '64px' }}>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-extrabold tracking-tight text-blue-400">Captionly</span>
                            <span className="rounded bg-blue-900/40 text-xs px-2 py-1 ml-2 text-blue-200">AI Video Captions</span>
                        </div>
                        <button
                            className="p-2 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                            aria-label="Close menu"
                            onClick={() => setMenuOpen(false)}
                        >
                            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-white">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Menu Content */}
                    <div className="flex flex-col flex-1 px-6 pt-8">
                        <nav className="flex flex-col gap-8 text-lg font-semibold">
                            <Link href="/pricing" className="text-white hover:text-blue-300 transition" onClick={() => setMenuOpen(false)}>Pricing</Link>
                            <Link href="/faq" className="text-white hover:text-blue-300 transition" onClick={() => setMenuOpen(false)}>FAQ</Link>
                            <Link href="/reviews" className="text-white hover:text-blue-300 transition" onClick={() => setMenuOpen(false)}>Reviews</Link>
                        </nav>
                        <div className="mt-auto mb-8">
                            <Link
                                href="/login"
                                className="w-full block text-center rounded-lg border-2 border-orange-500 bg-orange-500/90 text-white font-bold px-5 py-3 shadow-lg shadow-orange-900/20 hover:bg-orange-600 hover:border-orange-600 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 text-lg"
                                onClick={() => setMenuOpen(false)}
                            >
                                Login
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    )
} 