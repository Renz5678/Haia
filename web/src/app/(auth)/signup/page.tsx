"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { UserPlus } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuthStore();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          }
        }
      });

      if (error) throw error;
      
      if (data.session) {
        window.location.href = "/dashboard";
      } else {
        setError("Check your email for the confirmation link.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to sign up");
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

      <h1 className="anton-text text-3xl mb-2 text-on-surface">Join the Guild</h1>
      <p className="text-on-surface-variant font-label-caps italic mb-8">START YOUR ADVENTURE TODAY</p>

      <form onSubmit={handleSignup} className="w-full space-y-5">
        <div>
          <label className="block font-label-caps uppercase font-bold mb-2">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-surface-container-low comic-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary font-body-md"
            placeholder="Hero Name"
            required
          />
        </div>

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
          {loading ? "Creating Account..." : (
            <>
              <UserPlus size={20} />
              Create Account
            </>
          )}
        </button>
      </form>

      <p className="mt-8 font-body-md text-on-surface-variant">
        Already have an account? <Link href="/login" className="text-primary font-bold hover:underline italic">Sign in</Link>
      </p>
    </div>
  );
}
