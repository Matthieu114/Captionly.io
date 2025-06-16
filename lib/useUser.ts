"use client";

import { useEffect, useState, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session }, error: sessionError }) => {
        if (sessionError) {
          console.error("Error getting session:", sessionError);
          setError(sessionError);
        }
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Unexpected error during session check:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Log auth events for debugging
      console.log(`Auth state changed: ${event}`, session?.user?.id || "No user");
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      router.push("/login");
    } catch (err) {
      console.error("Error during logout:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [supabase.auth, router]);

  return { user, loading, error, logout };
}
