"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuthStore } from "@/store/useAuthStore";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuthStore();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      if (data.session) {
        // Fetch user profile from DB (or wait for layout to do it)
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      setError(err.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl comic-border comic-shadow flex flex-col items-center">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-primary comic-border rounded-lg flex items-center justify-center comic-shadow-sm">
          <img src="/images/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
        </div>
        <img src="/images/name.png" alt="PARKER" className="h-10 w-auto object-contain" />
      </div>

      <h1 className="anton-text text-3xl mb-2 text-on-surface">Welcome Back</h1>
      <p className="text-on-surface-variant font-label-caps italic mb-8">READY FOR YOUR NEXT QUEST?</p>

      <form onSubmit={handleLogin} className="w-full space-y-5">
        <div>
          <label className="block font-label-caps uppercase font-bold mb-2">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-surface-container-low comic-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary font-body-md"
            placeholder="hero@academy.edu"
            required
          />
        </div>
        
        <div>
          <label className="block font-label-caps uppercase font-bold mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-surface-container-low comic-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary font-body-md"
            placeholder="••••••••"
            required
          />
        </div>

        {error && (
          <div className="bg-error-container text-on-error-container p-3 rounded-lg comic-border font-bold text-sm">
            {error}
          </div>
        )}

        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-white font-label-caps uppercase font-black italic py-4 rounded-lg comic-border comic-shadow-sm flex items-center justify-center gap-2 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? "Logging in..." : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
              Login to Dashboard
            </>
          )}
        </button>

        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t-2 border-on-surface/10"></div>
          <span className="flex-shrink-0 mx-4 font-label-caps text-[10px] text-on-surface-variant italic font-bold">OR</span>
          <div className="flex-grow border-t-2 border-on-surface/10"></div>
        </div>

        <button 
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white text-on-surface font-label-caps uppercase font-black italic py-4 rounded-lg comic-border comic-shadow-sm flex items-center justify-center gap-3 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20px" height="20px">
            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
            <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
            <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
            <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
          </svg>
          Sign in with Google
        </button>
      </form>

      <p className="mt-8 font-body-md text-on-surface-variant">
        Don't have an account? <Link href="/signup" className="text-primary font-bold hover:underline italic">Join the Guild</Link>
      </p>
    </div>
  );
}
