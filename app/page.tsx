"use client"

import Link from "next/link"
import { useUser } from "@/lib/useUser"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button, buttonVariants } from "@/components/ui/button"
import { motion } from "framer-motion"

export default function Home() {
    const { user, loading } = useUser()
    const router = useRouter()
    const [menuOpen, setMenuOpen] = useState(false)

    useEffect(() => {
        if (!loading && user) router.replace("/dashboard")
    }, [user, loading, router])

    if (loading || user) return null

    // Animation variants
    const fadeIn = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    }

    return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155] text-white relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-600/30 via-transparent to-transparent" />

            {/* Floating elements for visual interest */}
            <div className="absolute w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[10%] right-[15%] w-64 h-64 rounded-full bg-purple-500/10 blur-3xl"></div>
                <div className="absolute top-[40%] left-[10%] w-72 h-72 rounded-full bg-blue-500/10 blur-3xl"></div>
                <div className="absolute bottom-[20%] right-[20%] w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl"></div>

                {/* Grid pattern overlay */}
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10"></div>
            </div>

            {/* Header */}
            <header className="w-full max-w-6xl mx-auto flex items-center justify-between py-5 px-6 z-10 rounded-b-xl bg-white/5 backdrop-blur-md border-b border-white/5 relative">
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Captionly</span>
                        <div className="absolute -bottom-1 left-0 w-full h-[2px] bg-gradient-to-r from-blue-400 to-purple-400"></div>
                    </div>
                    <span className="rounded-full bg-gradient-to-r from-blue-600/40 to-purple-600/40 backdrop-blur-md text-xs px-3 py-1 ml-2 text-blue-100 border border-blue-500/20">AI Video Captions</span>
                </div>
                {/* Desktop Nav */}
                <nav className="hidden md:flex flex-1 items-center justify-center gap-8">
                    <Link href="/pricing" className="font-medium text-white/80 hover:text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded px-3 py-2 relative group">
                        Pricing
                        <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-blue-400 transition-all duration-300 group-hover:w-full"></span>
                    </Link>
                    <Link href="/faq" className="font-medium text-white/80 hover:text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded px-3 py-2 relative group">
                        FAQ
                        <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-blue-400 transition-all duration-300 group-hover:w-full"></span>
                    </Link>
                    <Link href="/reviews" className="font-medium text-white/80 hover:text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded px-3 py-2 relative group">
                        Reviews
                        <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-blue-400 transition-all duration-300 group-hover:w-full"></span>
                    </Link>
                </nav>
                <div className="hidden md:flex items-center gap-4">
                    <Link
                        href="/login"
                        className={buttonVariants({
                            variant: "accent",
                            className: "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border border-white/10 shadow-lg shadow-blue-500/20"
                        })}
                    >
                        Log in
                    </Link>
                </div>
                {/* Hamburger for mobile */}
                <button
                    className="md:hidden flex items-center justify-center p-2 rounded-full bg-white/5 border border-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                    aria-label="Open menu"
                    onClick={() => setMenuOpen(true)}
                >
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-white">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
            </header>

            {/* Main Content (hidden when menu is open) */}
            <div className={`w-full flex-1 flex flex-col transition-opacity duration-200 ${menuOpen ? 'opacity-0' : 'opacity-100'}`}>
                <section className="flex-1 flex flex-col items-center justify-center z-10 px-4 py-16">
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={fadeIn}
                        transition={{ duration: 0.5 }}
                        className="max-w-5xl mx-auto text-center"
                    >
                        <div className="inline-block px-6 py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-blue-300 font-medium text-sm mb-6">
                            ✨ Boost your social media engagement with AI
                        </div>

                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-center leading-tight mb-8">
                            <span className="text-white">AI-Powered Video </span>
                            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">Captioning</span>
                            <span className="text-white"> for Creators</span>
                        </h1>

                        <p className="text-lg md:text-2xl text-slate-300 text-center max-w-3xl mx-auto mb-10 leading-relaxed">
                            Instantly generate, edit, and burn captions onto your videos.
                            <span className="block mt-2">Boost accessibility, engagement, and reach with Captionly.io.</span>
                        </p>

                        <div className="flex flex-col sm:flex-row gap-5 justify-center mt-8">
                            <Link
                                href="/upload"
                                className={buttonVariants({
                                    variant: "accent",
                                    size: "lg",
                                    className: "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border border-white/10 shadow-lg shadow-blue-500/20 font-medium px-8 text-white"
                                })}
                            >
                                Start for Free
                            </Link>
                            <Link
                                href="https://your-demo-video-link.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={buttonVariants({
                                    variant: "outline",
                                    size: "lg",
                                    className: "bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 font-medium px-8"
                                })}
                            >
                                See Live Demo
                            </Link>
                        </div>
                    </motion.div>

                    {/* Feature highlights */}
                    <div className="w-full max-w-5xl mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 px-4">
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={fadeIn}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 hover:bg-white/10 transition"
                        >
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-4">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                                    <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">Fast & Accurate</h3>
                            <p className="text-slate-300">Generate precise captions in seconds with our advanced AI technology.</p>
                        </motion.div>

                        <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={fadeIn}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 hover:bg-white/10 transition"
                        >
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-4">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                                    <path d="M15.5 9L8.5 16M8.5 9L15.5 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">Easy Editing</h3>
                            <p className="text-slate-300">Fine-tune your captions with our intuitive editing interface.</p>
                        </motion.div>

                        <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={fadeIn}
                            transition={{ duration: 0.5, delay: 0.4 }}
                            className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 hover:bg-white/10 transition"
                        >
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center mb-4">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                                    <path d="M12 17L12 7M12 7L8 11M12 7L16 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">One-Click Export</h3>
                            <p className="text-slate-300">Download your captioned videos instantly in high quality.</p>
                        </motion.div>
                    </div>
                </section>

                <footer className="w-full text-center text-sm text-slate-400 py-8 z-10 border-t border-white/5 mt-8">
                    <div className="max-w-5xl mx-auto px-4">
                        <div className="flex justify-center mb-4">
                            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Captionly.io</span>
                        </div>
                        <p>&copy; {new Date().getFullYear()} Captionly.io &mdash; AI Video Captioning SaaS</p>
                    </div>
                </footer>
            </div>

            {/* Mobile Menu Overlay */}
            <div
                className={`fixed inset-0 z-50 bg-gradient-to-br from-[#0f172a] to-[#1e293b] transform transition-transform duration-300 ease-in-out ${menuOpen ? 'translate-y-0' : '-translate-y-full'
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* Menu Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-white/10" style={{ minHeight: '64px' }}>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Captionly</span>
                            <span className="rounded-full bg-gradient-to-r from-blue-600/40 to-purple-600/40 text-xs px-3 py-1 ml-2 text-blue-100 border border-blue-500/20">AI Video Captions</span>
                        </div>
                        <button
                            className="p-2 rounded-full bg-white/5 border border-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                            aria-label="Close menu"
                            onClick={() => setMenuOpen(false)}
                        >
                            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-white">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Menu Content */}
                    <div className="flex flex-col flex-1 px-6 pt-8">
                        <nav className="flex flex-col gap-8 text-lg font-medium">
                            <Link href="/pricing" className="text-white hover:text-blue-300 transition py-2 border-b border-white/10" onClick={() => setMenuOpen(false)}>Pricing</Link>
                            <Link href="/faq" className="text-white hover:text-blue-300 transition py-2 border-b border-white/10" onClick={() => setMenuOpen(false)}>FAQ</Link>
                            <Link href="/reviews" className="text-white hover:text-blue-300 transition py-2 border-b border-white/10" onClick={() => setMenuOpen(false)}>Reviews</Link>
                        </nav>
                        <div className="mt-auto mb-8">
                            <Link
                                href="/login"
                                className={buttonVariants({
                                    variant: "accent",
                                    size: "lg",
                                    className: "w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border border-white/10 shadow-lg"
                                })}
                                onClick={() => setMenuOpen(false)}
                            >
                                Log in
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    )
} 