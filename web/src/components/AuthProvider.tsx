"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { createApiClient } from "@/lib/api";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useAuthStore();
  const supabase = createClient();

  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        try {
          // You can also fetch the full profile from the backend using the token
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"}/api/v1/users/me`, {
            headers: {
              Authorization: `Bearer ${session.access_token}`
            }
          });
          if (!res.ok) throw new Error("Failed to fetch profile");
          const profile = await res.json();
          
          setUser({
            id: profile.id,
            email: profile.email,
            display_name: profile.display_name,
            current_level: profile.current_level,
            total_xp: profile.total_xp,
          });
        } catch (error) {
          console.error("Failed to fetch profile", error);
          // Fallback to basic session info
          setUser({
            id: session.user.id,
            email: session.user.email || "",
            display_name: session.user.user_metadata?.display_name || "User",
            current_level: 1,
            total_xp: 0,
          });
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"}/api/v1/users/me`, {
            headers: {
              Authorization: `Bearer ${session.access_token}`
            }
          });
          if (!res.ok) throw new Error("Failed to fetch profile");
          const profile = await res.json();
          
          setUser({
            id: profile.id,
            email: profile.email,
            display_name: profile.display_name,
            current_level: profile.current_level,
            total_xp: profile.total_xp,
          });
        } catch (error) {
          setUser({
            id: session.user.id,
            email: session.user.email || "",
            display_name: session.user.user_metadata?.display_name || "User",
            current_level: 1,
            total_xp: 0,
          });
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return <>{children}</>;
}
