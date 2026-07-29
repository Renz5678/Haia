"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/next/image";
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
      </form>

      <p className="mt-8 font-body-md text-on-surface-variant">
        Don't have an account? <Link href="/signup" className="text-primary font-bold hover:underline italic">Join the Guild</Link>
      </p>
    </div>
  );
}
