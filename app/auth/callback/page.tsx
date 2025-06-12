"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function AuthCallbackPage() {
    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        const fetchSession = async () => {
            try {
                // Exchange code for session
                const { error } = await supabase.auth.exchangeCodeForSession(
                    window.location.href
                );

                if (error) {
                    console.error("Error exchanging code for session:", error);
                    router.replace("/login");
                    return;
                }

                // Get the session after exchange
                const { data: { session } } = await supabase.auth.getSession();

                // If there's a session, the user is logged in
                if (session) {
                    // Check if there's a redirect parameter
                    const redirectTo = searchParams.get("redirect") || "/dashboard";
                    // Add a small delay to ensure session is stored
                    setTimeout(() => {
                        router.replace(redirectTo);
                    }, 500);
                } else {
                    // If no session, redirect to login
                    router.replace("/login");
                }
            } catch (err) {
                console.error("Auth error:", err);
                router.replace("/login");
            }
        };

        fetchSession();
    }, [router, searchParams])

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155]">
            <div className="text-white text-lg">Completing sign in...</div>
        </div>
    )
} 