"use client"

import { useUser } from "@/lib/useUser"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
    const { user, loading } = useUser()
    const router = useRouter()
    const searchParams = useSearchParams()
    const redirectTo = searchParams.get("redirect") || "/dashboard"

    const [email, setEmail] = useState("")
    const [loadingAuth, setLoadingAuth] = useState(false)
    const [message, setMessage] = useState<string | null>(null)

    useEffect(() => {
        if (!loading && user) {
            router.replace(redirectTo)
        }
    }, [user, loading, router, redirectTo])

    // Don't return null here, instead render conditionally later

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

    // Show loading state when checking auth
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155]">
                <div className="text-white text-lg">Loading...</div>
            </div>
        );
    }

    // If user is already logged in, don't render the login form
    if (user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155]">
                <div className="text-white text-lg">Redirecting to dashboard...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155] px-4">
            <div className="w-full max-w-md bg-[#181f2a]/90 rounded-2xl shadow-2xl p-8 flex flex-col items-center">
                <div className="flex flex-col items-center mb-6">
                    <span className="text-3xl font-extrabold text-white mb-2">Captionly</span>
                    <span className="text-blue-400 font-semibold text-lg">Sign in to your account</span>
                </div>
                <Button
                    onClick={handleGoogleLogin}
                    disabled={loadingAuth}
                    variant="secondary"
                    className="w-full bg-white text-gray-900 hover:bg-gray-100"
                >
                    <svg width="20" height="20" viewBox="0 0 48 48" className="mr-2"><g><path fill="#4285F4" d="M24 9.5c3.54 0 6.7 1.22 9.19 3.22l6.85-6.85C35.91 2.36 30.28 0 24 0 14.82 0 6.71 5.82 2.69 14.09l7.98 6.2C12.13 13.13 17.57 9.5 24 9.5z" /><path fill="#34A853" d="M46.1 24.55c0-1.64-.15-3.22-.42-4.74H24v9.01h12.42c-.54 2.9-2.18 5.36-4.65 7.03l7.19 5.59C43.98 37.13 46.1 31.3 46.1 24.55z" /><path fill="#FBBC05" d="M10.67 28.29a14.5 14.5 0 0 1 0-8.58l-7.98-6.2A23.94 23.94 0 0 0 0 24c0 3.93.94 7.65 2.69 10.89l7.98-6.2z" /><path fill="#EA4335" d="M24 48c6.28 0 11.56-2.08 15.41-5.66l-7.19-5.59c-2.01 1.35-4.59 2.16-8.22 2.16-6.43 0-11.87-3.63-14.33-8.79l-7.98 6.2C6.71 42.18 14.82 48 24 48z" /><path fill="none" d="M0 0h48v48H0z" /></g></svg>
                    Sign in with Google
                </Button>
                <div className="flex items-center w-full my-4">
                    <div className="flex-1 h-px bg-slate-700" />
                    <span className="mx-3 text-slate-400 text-sm">or</span>
                    <div className="flex-1 h-px bg-slate-700" />
                </div>
                <form onSubmit={handleEmailLogin} className="w-full flex flex-col gap-3">
                    <label htmlFor="email" className="text-slate-300 text-sm font-medium">Email</label>
                    <input
                        id="email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="rounded-lg bg-[#232b3a] border border-slate-700 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                        placeholder="you@email.com"
                        disabled={loadingAuth}
                    />
                    <Button
                        type="submit"
                        disabled={loadingAuth}
                        variant="accent"
                        className="mt-2 w-full"
                    >
                        {loadingAuth ? "Sending..." : "Sign in with email"}
                    </Button>
                </form>
                {message && <div className="mt-4 text-center text-sm text-orange-300">{message}</div>}
                <p className="text-xs text-slate-500 mt-6 text-center">
                    By signing in, you agree to our Terms of Service.
                </p>
            </div>
        </div>
    )
} 