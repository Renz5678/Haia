"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Timer, CheckCircle, Lock, Plus, Medal, Star, Rocket, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createApiClient } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { Skeleton } from "@/components/ui/Skeleton";

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth) * 20,
        y: (e.clientY / window.innerHeight) * 20,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const api = createApiClient(session.access_token);
        const fetchedStats = await api.gamification.stats();
        setStats(fetchedStats);
      } catch (err) {
        console.error("Failed to fetch gamification stats:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = stats as any;
  const total_xp: number = s?.total_xp ?? 0;
  const current_level: number = s?.current_level ?? 1;
  const xp_for_next: number = s?.xp_for_next_level ?? current_level * 1000;
  const tasks_completed: number = s?.tasks_completed ?? 0;
  const habits_completed: number = s?.habits_completed ?? 0;
  const current_streak: number = s?.current_streak ?? 0;
  const longest_streak: number = s?.longest_streak ?? 0;

  const progress_pct = xp_for_next > 0 ? Math.min(100, (total_xp / xp_for_next) * 100) : 0;
  const strokeDashoffset = 282.7 - (282.7 * progress_pct) / 100;

  const displayName = user?.display_name || "Hero";

  return (
    <div className="flex-1 min-w-0 bg-background relative overflow-y-auto h-[calc(100vh-80px)]">

      {/* Profile Hero Section */}
      <section>
        {/* Bold Graphic Hero */}
        <div className="bg-[#0f0069] text-white py-12 md:py-20 relative overflow-hidden">
          {/* Atmospheric Background Overlay */}
          <div
            className="absolute inset-0 halftone-bg pointer-events-none transition-all duration-100"
            style={{ backgroundPosition: `${mousePos.x}px ${mousePos.y}px` }}
          />

          <div className="max-w-max-width-content mx-auto px-4 md:px-margin-desktop relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">

            {/* Profile Identity */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <div className="relative mb-6">
                <div className="w-32 h-32 md:w-48 md:h-48 rounded-2xl ink-border bg-white p-2 relative overflow-hidden group">
                  <Image alt="Logo" className="object-cover rounded-xl grayscale hover:grayscale-0 transition-all duration-500" src="/images/logo.png" fill />
                  <div className="absolute inset-0 bg-primary/20 mix-blend-multiply" />
                </div>
                <div className="absolute -bottom-4 -right-4 bg-xp-gold text-on-surface px-4 py-1 ink-border font-label-xp text-label-xp rotate-3">
                  {current_level >= 20 ? "ELITE" : current_level >= 10 ? "ACE" : "NOVICE"}
                </div>
              </div>

              {loading
                ? <Skeleton className="h-14 w-48 bg-white/20 mb-2" />
                : <h1 className="font-display-hero text-5xl md:text-[56px] anton-text tracking-tighter uppercase mb-2">{displayName}</h1>
              }
              {loading
                ? <Skeleton className="h-5 w-64 bg-white/20" />
                : <p className="font-body-lg text-body-lg text-on-primary-container max-w-md">
                    Level {current_level} Productivity Ace • {current_streak} day streak 🔥
                  </p>
              }
            </div>

            {/* Level & Progress Ring */}
            <div className="relative flex flex-col items-center justify-center">
              <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" fill="none" r="45" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                  <circle
                    className="cel-shade-amber"
                    cx="50" cy="50" fill="none" r="45"
                    stroke="#feae2c"
                    strokeDasharray="282.7"
                    strokeDashoffset={loading ? 282.7 : strokeDashoffset}
                    strokeWidth="8"
                    style={{ transition: "stroke-dashoffset 1.2s ease" }}
                  />
                </svg>

                {/* Level Display */}
                <div className="text-center z-10">
                  <span className="block font-label-caps text-label-caps text-on-primary-container tracking-[0.2em] mb-1">CURRENT LEVEL</span>
                  {loading
                    ? <Skeleton className="h-20 w-24 mx-auto bg-white/20 mb-2" />
                    : <span className="block font-display-hero text-6xl md:text-display-hero text-xp-gold leading-none anton-text">{current_level}</span>
                  }
                  {loading
                    ? <Skeleton className="h-4 w-32 mx-auto bg-white/20 mt-2" />
                    : <span className="block font-label-xp text-label-xp mt-2 text-on-primary-container">{total_xp.toLocaleString()} / {xp_for_next.toLocaleString()} XP</span>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats & Badges Grid */}
        <div className="max-w-max-width-content mx-auto px-4 md:px-margin-desktop py-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

            {/* Left Panel: Stats */}
            <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Habits Completed */}
              <div className="ink-border bg-white p-6 relative group overflow-hidden hover:-translate-y-1 transition-transform">
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-30 transition-opacity">
                  <Timer size={64} />
                </div>
                <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-4">HABITS LOGGED</h3>
                {loading
                  ? <Skeleton className="h-10 w-24" />
                  : <p className="font-display-hero text-4xl md:text-headline-lg text-primary anton-text tracking-widest">{habits_completed}</p>
                }
                <p className="font-label-xp text-label-xp text-on-surface-variant mt-2">Lifetime total</p>
              </div>

              {/* Tasks Completed */}
              <div className="ink-border bg-white p-6 relative group overflow-hidden hover:-translate-y-1 transition-transform">
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-30 transition-opacity">
                  <CheckCircle size={64} />
                </div>
                <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-4">TASKS CLEARED</h3>
                {loading
                  ? <Skeleton className="h-10 w-24" />
                  : <p className="font-display-hero text-4xl md:text-headline-lg text-secondary anton-text tracking-widest">{tasks_completed}</p>
                }
                <p className="font-label-xp text-label-xp text-on-surface-variant mt-2">Lifetime total</p>
              </div>

              {/* Streak Stats */}
              <div className="sm:col-span-2 ink-border bg-surface-muted p-6 md:p-8">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-6 gap-4">
                  <div>
                    <h2 className="font-headline-md text-headline-md mb-1 anton-text">STREAK RECORD</h2>
                    <p className="text-on-surface-variant">Your consistency over time</p>
                  </div>
                  <div className="ink-border bg-white px-4 py-2 font-label-xp text-label-xp uppercase">
                    {longest_streak >= 30 ? "Class: S-Rank" : longest_streak >= 14 ? "Class: A-Rank" : longest_streak >= 7 ? "Class: B-Rank" : "Class: C-Rank"}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between font-label-caps text-label-caps">
                      <span className="flex items-center gap-2"><Zap size={14} /> CURRENT STREAK</span>
                      {loading ? <Skeleton className="h-4 w-16" /> : <span className="text-primary">{current_streak} DAYS</span>}
                    </div>
                    <div className="h-4 ink-border bg-white p-0.5">
                      <div className="h-full bg-primary transition-all duration-700" style={{ width: loading ? "0%" : `${Math.min(100, (current_streak / Math.max(longest_streak, 1)) * 100)}%` }} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between font-label-caps text-label-caps">
                      <span className="flex items-center gap-2"><Star size={14} /> LONGEST STREAK</span>
                      {loading ? <Skeleton className="h-4 w-16" /> : <span className="text-secondary">{longest_streak} DAYS</span>}
                    </div>
                    <div className="h-4 ink-border bg-white p-0.5">
                      <div className="h-full bg-secondary transition-all duration-700" style={{ width: loading ? "0%" : "100%" }} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between font-label-caps text-label-caps">
                      <span>TOTAL XP EARNED</span>
                      {loading ? <Skeleton className="h-4 w-20" /> : <span className="text-tertiary-container">{total_xp.toLocaleString()}</span>}
                    </div>
                    <div className="h-4 ink-border bg-white p-0.5">
                      <div className="h-full bg-tertiary-container transition-all duration-700" style={{ width: loading ? "0%" : `${progress_pct}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel: Badges & Rewards */}
            <div className="md:col-span-4 space-y-6">
              <div className="ink-border bg-[#1a1c1b] text-white p-6">
                <h3 className="font-headline-md text-headline-md mb-6 flex items-center gap-2 anton-text">
                  <Medal className="text-xp-gold" size={24} />
                  MEDALS
                </h3>

                <div className="grid grid-cols-3 gap-4">
                  {/* Earned medals based on real milestones */}
                  <div className={`aspect-square ink-border flex items-center justify-center group relative cursor-pointer ${tasks_completed >= 1 ? "bg-surface-muted/20" : "bg-[#000]/50 opacity-30"}`}>
                    {tasks_completed >= 1 ? <Medal className="text-xp-gold" size={32} /> : <Lock size={24} />}
                  </div>
                  <div className={`aspect-square ink-border flex items-center justify-center group relative cursor-pointer ${current_streak >= 7 ? "bg-surface-muted/20" : "bg-[#000]/50 opacity-30"}`}>
                    {current_streak >= 7 ? <Star className="text-secondary" size={32} /> : <Lock size={24} />}
                  </div>
                  <div className={`aspect-square ink-border flex items-center justify-center group relative cursor-pointer ${total_xp >= 500 ? "bg-surface-muted/20" : "bg-[#000]/50 opacity-30"}`}>
                    {total_xp >= 500 ? <Rocket className="text-primary-fixed-dim" size={32} /> : <Lock size={24} />}
                  </div>

                  {/* Locked placeholders */}
                  <div className="aspect-square ink-border bg-[#000]/50 flex items-center justify-center opacity-30"><Lock size={24} /></div>
                  <div className="aspect-square ink-border bg-[#000]/50 flex items-center justify-center opacity-30"><Lock size={24} /></div>
                  <div className="aspect-square ink-border bg-[#000]/50 flex items-center justify-center opacity-30"><Lock size={24} /></div>
                </div>

                <div className="mt-4 space-y-1 text-[10px] text-white/50 font-label-caps">
                  <p>🥇 Complete 1 quest</p>
                  <p>⭐ Maintain a 7-day streak</p>
                  <p>🚀 Earn 500 XP</p>
                </div>
              </div>

              {/* XP Progress Card */}
              <div className="ink-border bg-xp-gold/10 p-6 border-xp-gold">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-xp-gold flex items-center justify-center ink-border">
                    <span className="font-label-caps font-bold text-on-surface text-xs">{total_xp.toLocaleString()}</span>
                  </div>
                  <h3 className="font-headline-md text-headline-md anton-text">XP PROGRESS</h3>
                </div>
                {loading ? (
                  <Skeleton className="h-4 w-full mb-4" />
                ) : (
                  <>
                    <div className="h-3 ink-border bg-white mb-3 overflow-hidden">
                      <div className="h-full bg-xp-gold transition-all duration-700" style={{ width: `${progress_pct}%` }} />
                    </div>
                    <div className="flex justify-between text-xs font-bold text-on-surface-variant">
                      <span>{total_xp.toLocaleString()} XP</span>
                      <span>{(s?.xp_to_next_level ?? 0).toLocaleString()} XP to Level {current_level + 1}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky CTA Button */}
      <button className="fixed bottom-8 right-8 ink-border bg-indigo-deep text-white px-6 md:px-8 py-3 md:py-4 flex items-center gap-3 hover:-translate-y-1 transition-transform group z-50 rounded-full md:rounded-none">
        <Plus className="group-hover:rotate-90 transition-transform" size={20} />
        <span className="font-label-caps text-label-caps uppercase tracking-widest hidden md:inline">New Entry</span>
      </button>
    </div>
  );
}
