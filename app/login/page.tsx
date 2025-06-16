"use client"

import { useUser } from "@/lib/useUser"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { createClient } from '@/utils/supabase/client'
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import Link from "next/link"    

export default function LoginPage() {
    const { user, loading } = useUser()
    const router = useRouter()
    const searchParams = useSearchParams()
    const redirectTo = searchParams.get("redirect") || "/dashboard"
    const supabase = createClient()

    const [email, setEmail] = useState("")
    const [loadingAuth, setLoadingAuth] = useState(false)
    const [message, setMessage] = useState<string | null>(null)

    useEffect(() => {
        if (!loading && user) {
            router.replace(redirectTo)
        }
    }, [user, loading, router, redirectTo])

    async function handleEmailLogin(e: React.FormEvent) {
        e.preventDefault()
        setLoadingAuth(true)
        setMessage(null)
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${redirectTo}`
            }
        })
        if (error) setMessage(error.message)
        else setMessage("Check your email for the magic link!")
        setLoadingAuth(false)
    }

    async function handleGoogleLogin() {
        setLoadingAuth(true)
        setMessage(null)
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback?redirect=${redirectTo}`
            }
        })
        if (error) setMessage(error.message)
        setLoadingAuth(false)
    }

    // Animation variants
    const fadeIn = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    }

    // Show loading state when checking auth
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155]">
                <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-400"></div>
                    <div className="text-white text-lg">Loading...</div>
                </div>
            </div>
        );
    }

    // If user is already logged in, don't render the login form
    if (user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155]">
                <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-400"></div>
                    <div className="text-white text-lg">Redirecting to dashboard...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155] px-4 relative">
            {/* Background elements */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[10%] right-[15%] w-64 h-64 rounded-full bg-purple-500/10 blur-3xl"></div>
                <div className="absolute top-[40%] left-[10%] w-72 h-72 rounded-full bg-blue-500/10 blur-3xl"></div>
                <div className="absolute bottom-[20%] right-[20%] w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl"></div>
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10"></div>
            </div>

            <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                <div className="relative overflow-hidden rounded-2xl backdrop-blur-sm">
                    {/* Card glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-cyan-600/20 opacity-50"></div>

                    {/* Main card content */}
                    <div className="bg-[#181f2a]/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 flex flex-col items-center border border-white/10 relative z-10">
                        <Link href="/" className="absolute top-4 left-4 text-slate-400 hover:text-white transition">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </Link>

                        <div className="flex flex-col items-center mb-8">
                            <span className="text-3xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">Captionly</span>
                            <span className="text-slate-300 font-medium text-lg">Sign in to your account</span>
                        </div>

                        <Button
                            onClick={handleGoogleLogin}
                            disabled={loadingAuth}
                            variant="secondary"
                            className="w-full bg-white text-gray-900 hover:bg-gray-100 font-medium flex items-center justify-center gap-2 shadow-md"
                        >
                            <svg width="20" height="20" viewBox="0 0 48 48" className="mr-2"><g><path fill="#4285F4" d="M24 9.5c3.54 0 6.7 1.22 9.19 3.22l6.85-6.85C35.91 2.36 30.28 0 24 0 14.82 0 6.71 5.82 2.69 14.09l7.98 6.2C12.13 13.13 17.57 9.5 24 9.5z" /><path fill="#34A853" d="M46.1 24.55c0-1.64-.15-3.22-.42-4.74H24v9.01h12.42c-.54 2.9-2.18 5.36-4.65 7.03l7.19 5.59C43.98 37.13 46.1 31.3 46.1 24.55z" /><path fill="#FBBC05" d="M10.67 28.29a14.5 14.5 0 0 1 0-8.58l-7.98-6.2A23.94 23.94 0 0 0 0 24c0 3.93.94 7.65 2.69 10.89l7.98-6.2z" /><path fill="#EA4335" d="M24 48c6.28 0 11.56-2.08 15.41-5.66l-7.19-5.59c-2.01 1.35-4.59 2.16-8.22 2.16-6.43 0-11.87-3.63-14.33-8.79l-7.98 6.2C6.71 42.18 14.82 48 24 48z" /><path fill="none" d="M0 0h48v48H0z" /></g></svg>
                            {loadingAuth ? "Connecting..." : "Sign in with Google"}
                        </Button>

                        <div className="flex items-center w-full my-6">
                            <div className="flex-1 h-px bg-slate-700" />
                            <span className="mx-3 text-slate-400 text-sm">or</span>
                            <div className="flex-1 h-px bg-slate-700" />
                        </div>

                        <form onSubmit={handleEmailLogin} className="w-full flex flex-col gap-3">
                            <div className="space-y-2">
                                <label htmlFor="email" className="text-slate-300 text-sm font-medium block">Email address</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-slate-500">
                                            <path d="M21 5.25L12 13.5L3 5.25M3.75 5.25H20.25C20.6642 5.25 21 5.58579 21 6V18C21 18.4142 20.6642 18.75 20.25 18.75H3.75C3.33579 18.75 3 18.4142 3 18V6C3 5.58579 3.33579 5.25 3.75 5.25Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                    <input
                                        id="email"
                                        type="email"
                                        required
                                        autoComplete="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="rounded-lg bg-[#232b3a] border border-slate-700 pl-10 pr-4 py-3 text-white w-full placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                                        placeholder="you@example.com"
                                        disabled={loadingAuth}
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={loadingAuth}
                                variant="accent"
                                className="mt-4 w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg shadow-blue-500/20 border border-white/10"
                            >
                                {loadingAuth ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                                        <span>Sending...</span>
                                    </div>
                                ) : (
                                    "Sign in with email"
                                )}
                            </Button>
                        </form>

                        {message && (
                            <div className={`mt-4 text-center text-sm p-3 rounded-lg w-full ${message.includes("Check your email") ? "bg-blue-500/20 text-blue-200" : "bg-orange-500/20 text-orange-200"}`}>
                                {message}
                            </div>
                        )}

                        <p className="text-xs text-slate-500 mt-6 text-center">
                            By signing in, you agree to our <a href="#" className="text-blue-400 hover:text-blue-300 transition">Terms of Service</a> and <a href="#" className="text-blue-400 hover:text-blue-300 transition">Privacy Policy</a>.
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    )
} 