"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function AuthCallbackPage() {
    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        // Get the session from URL that Supabase Auth passed
        supabase.auth.getSession().then(({ data: { session } }) => {
            // If there's a session, the user is logged in
            if (session) {
                // Check if there's a redirect parameter
                const redirectTo = searchParams.get("redirect") || "/dashboard"
                router.replace(redirectTo)
            } else {
                // If no session, redirect to login
                router.replace("/login")
            }
        })
    }, [router, searchParams])

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155]">
            <div className="text-white text-lg">Completing sign in...</div>
        </div>
    )
} 