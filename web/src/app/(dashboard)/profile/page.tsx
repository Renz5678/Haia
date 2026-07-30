"use client";

import React, { useEffect, useState } from "react";
import { Timer, CheckCircle, Lock, Plus, Medal, Star, Rocket } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createApiClient } from "@/lib/api";

export default function ProfilePage() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ 
        x: (e.clientX / window.innerWidth) * 20, 
        y: (e.clientY / window.innerHeight) * 20 
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
  }, []);

  const total_xp = stats?.total_xp || 0;
  const current_level = stats?.current_level || 1;
  const tasks_completed = stats?.tasks_completed || 0;
  
  // Calculate level progress (mock max xp per level as level * 1000)
  const xp_for_next_level = current_level * 1000;
  const progress_pct = Math.min(100, (total_xp / xp_for_next_level) * 100);
  const strokeDashoffset = 282.7 - (282.7 * progress_pct) / 100;

  return (
    <div className="flex-1 min-w-0 bg-background relative overflow-y-auto h-[calc(100vh-80px)]">
      
      {/* Profile Hero Section */}
      <section>
        {/* Bold Graphic Hero */}
        <div className="bg-[#0f0069] text-white py-12 md:py-20 relative overflow-hidden">
          {/* Atmospheric Background Overlay */}
          <div 
            className="absolute inset-0 halftone-bg pointer-events-none transition-all duration-100"
            style={{ backgroundPosition: \`\${mousePos.x}px \${mousePos.y}px\` }}
          ></div>
          
          <div className="max-w-max-width-content mx-auto px-4 md:px-margin-desktop relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
            
            {/* Profile Identity */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <div className="relative mb-6">
                <div className="w-32 h-32 md:w-48 md:h-48 rounded-2xl ink-border bg-white p-2 relative overflow-hidden group">
                  <img alt="Logo" className="w-full h-full object-cover rounded-xl grayscale hover:grayscale-0 transition-all duration-500" src="/images/logo.png" />
                  <div className="absolute inset-0 bg-primary/20 mix-blend-multiply"></div>
                </div>
                <div className="absolute -bottom-4 -right-4 bg-xp-gold text-on-surface px-4 py-1 ink-border font-label-xp text-label-xp rotate-3">
                  ELITE
                </div>
              </div>
              
              <h1 className="font-display-hero text-5xl md:text-[56px] anton-text tracking-tighter uppercase mb-2">Parker</h1>
              <p className="font-body-lg text-body-lg text-on-primary-container max-w-md">Level 24 Productivity Ace • Senior Scholar at Imperial Academy</p>
            </div>
            
            {/* Level & Progress Ring */}
            <div className="relative flex flex-col items-center justify-center">
              <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
                {/* Progress Ring SVG */}
                <svg className="absolute inset-0 w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" fill="none" r="45" stroke="rgba(255,255,255,0.1)" strokeWidth="8"></circle>
                  <circle className="cel-shade-amber" cx="50" cy="50" fill="none" r="45" stroke="#feae2c" strokeDasharray="282.7" strokeDashoffset={strokeDashoffset} strokeWidth="8"></circle>
                </svg>
                
                {/* Level Display */}
                <div className="text-center z-10">
                  <span className="block font-label-caps text-label-caps text-on-primary-container tracking-[0.2em] mb-1">CURRENT LEVEL</span>
                  <span className="block font-display-hero text-6xl md:text-display-hero text-xp-gold leading-none anton-text">{loading ? "..." : current_level}</span>
                  <span className="block font-label-xp text-label-xp mt-2 text-on-primary-container">{loading ? "..." : total_xp.toLocaleString()} / {xp_for_next_level.toLocaleString()} XP</span>
                </div>
              </div>
            </div>

          </div>
        </div>
        
        {/* Stats & Badges Grid (Graphic Novel Style) */}
        <div className="max-w-max-width-content mx-auto px-4 md:px-margin-desktop py-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            
            {/* Left Panel: Stats */}
            <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Focus Time */}
              <div className="ink-border bg-white p-6 relative group overflow-hidden hover:-translate-y-1 transition-transform">
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-30 transition-opacity">
                  <Timer size={64} />
                </div>
                <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-4">FOCUS CAPACITY</h3>
                <p className="font-display-hero text-4xl md:text-headline-lg text-primary anton-text tracking-widest">142h</p>
                <div className="mt-4 h-1 w-full bg-surface-container-high rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-3/4"></div>
                </div>
              </div>
              
              {/* Tasks Completed */}
              <div className="ink-border bg-white p-6 relative group overflow-hidden hover:-translate-y-1 transition-transform">
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-30 transition-opacity">
                  <CheckCircle size={64} />
                </div>
                <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-4">TASKS CLEARED</h3>
                <p className="font-display-hero text-4xl md:text-headline-lg text-secondary anton-text tracking-widest">{loading ? "..." : tasks_completed}</p>
                <p className="font-label-xp text-label-xp text-on-surface-variant mt-2">Lifetime total</p>
              </div>
              
              {/* Skill Bento */}
              <div className="sm:col-span-2 ink-border bg-surface-muted p-6 md:p-8">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-6 gap-4">
                  <div>
                    <h2 className="font-headline-md text-headline-md mb-1 anton-text">SKILL ARCHETYPE</h2>
                    <p className="text-on-surface-variant">Strategic Momentum Specialist</p>
                  </div>
                  <div className="ink-border bg-white px-4 py-2 font-label-xp text-label-xp uppercase">Class: S-Rank</div>
                </div>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between font-label-caps text-label-caps">
                      <span>LOGIC & PLANNING</span>
                      <span className="text-primary">LVL 9</span>
                    </div>
                    <div className="h-4 ink-border bg-white p-0.5">
                      <div className="h-full bg-primary" style={{ width: '85%' }}></div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between font-label-caps text-label-caps">
                      <span>CREATIVE FOCUS</span>
                      <span className="text-secondary">LVL 7</span>
                    </div>
                    <div className="h-4 ink-border bg-white p-0.5">
                      <div className="h-full bg-secondary" style={{ width: '62%' }}></div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between font-label-caps text-label-caps">
                      <span>SOCIAL COOPERATION</span>
                      <span className="text-tertiary-container">LVL 4</span>
                    </div>
                    <div className="h-4 ink-border bg-white p-0.5">
                      <div className="h-full bg-tertiary-container" style={{ width: '40%' }}></div>
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
                  {/* Medal 1 */}
                  <div className="aspect-square ink-border bg-surface-muted/20 flex items-center justify-center group relative cursor-pointer">
                    <Medal className="text-xp-gold" size={32} />
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
                  </div>
                  {/* Medal 2 */}
                  <div className="aspect-square ink-border bg-surface-muted/20 flex items-center justify-center group relative cursor-pointer">
                    <Star className="text-secondary" size={32} />
                  </div>
                  {/* Medal 3 */}
                  <div className="aspect-square ink-border bg-surface-muted/20 flex items-center justify-center group relative cursor-pointer">
                    <Rocket className="text-primary-fixed-dim" size={32} />
                  </div>
                  
                  {/* Locked Medals */}
                  <div className="aspect-square ink-border bg-[#000]/50 flex items-center justify-center opacity-30">
                    <Lock size={24} />
                  </div>
                  <div className="aspect-square ink-border bg-[#000]/50 flex items-center justify-center opacity-30">
                    <Lock size={24} />
                  </div>
                  <div className="aspect-square ink-border bg-[#000]/50 flex items-center justify-center opacity-30">
                    <Lock size={24} />
                  </div>
                </div>
                
                <button className="w-full mt-6 py-3 bg-white text-[#1a1c1b] font-label-caps text-label-caps uppercase ink-border hover:bg-xp-gold transition-colors">
                  View Hall of Fame
                </button>
              </div>
              
              {/* Quest Card */}
              <div className="ink-border bg-xp-gold/10 p-6 border-xp-gold">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-xp-gold flex items-center justify-center ink-border">
                    <span className="font-label-caps font-bold text-on-surface">4k</span>
                  </div>
                  <h3 className="font-headline-md text-headline-md anton-text">ACTIVE QUEST</h3>
                </div>
                <p className="font-body-md text-body-md font-bold mb-2">Chronicles of Calculus III</p>
                <p className="font-body-md text-body-md text-on-surface-variant mb-6">Complete 3 deep focus sessions to unlock the "Math Wizard" title.</p>
                <div className="flex items-center justify-between">
                  <span className="font-label-xp text-label-xp">REWARD: 500 XP</span>
                  <span className="material-symbols-outlined animate-bounce">arrow_forward</span>
                </div>
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
