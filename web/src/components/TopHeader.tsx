"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Zap, Bell, Settings as SettingsIcon, Menu, Sparkles, Send, MessageCircle } from "lucide-react";

export default function TopHeader({ onOpenChat }: { onOpenChat?: () => void }) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");

  const pageTitles: Record<string, string> = {
    "/dashboard": "HOME",
    "/quests": "QUESTS",
    "/habits": "HABITS",
    "/goals": "GOALS",
    "/schedule": "SCHEDULE",
    "/chat": "HAIA",
    "/settings": "SETTINGS",
  };

  const title = pageTitles[pathname] || "DASHBOARD";

  const handleCaptureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    // TODO: Send to API
    console.log("Quick capture:", query);
    setQuery("");
  };

  return (
    <header className="h-20 px-4 md:px-margin-desktop flex justify-between items-center bg-surface border-b-2 border-on-surface sticky top-0 z-40 shadow-[4px_4px_0px_0px_rgba(20,27,43,1)]">
      {/* Left: Mobile Menu & Page Title */}
      <div className="flex items-center gap-4 md:gap-8 flex-1 md:flex-none">
        <button className="md:hidden w-12 h-12 flex items-center justify-center comic-border rounded-lg hover:bg-surface-container transition-colors">
          <Menu size={24} />
        </button>
        <h2 className="hidden md:block font-headline-md text-2xl anton-text uppercase tracking-wide text-on-surface w-32">
          {title}
        </h2>
      </div>
      
      {/* Center: Global AI Quick Capture */}
      <div className="hidden md:flex flex-1 max-w-xl mx-4">
        <form onSubmit={handleCaptureSubmit} className="w-full relative flex items-center group">
          <div className="absolute left-4 text-primary group-focus-within:text-secondary transition-colors">
            <Sparkles size={20} />
          </div>
          <input 
            type="text" 
            placeholder="Log a task, habit, or goal..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-12 bg-surface-container-low border-2 border-on-surface rounded-full pl-12 pr-12 font-body-lg focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white comic-shadow-sm transition-all"
          />
          <button type="submit" className="absolute right-3 w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white hover:bg-primary/90 transition-colors comic-border">
            <Send size={14} className="mr-0.5" />
          </button>
        </form>
      </div>

      {/* Right: Stats & Settings */}
      <div className="flex items-center gap-3 md:gap-6 shrink-0">
        <div className="hidden sm:flex items-center bg-surface-container-high comic-border rounded-full px-5 py-1.5 gap-2 comic-shadow-sm transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none cursor-default">
          <Zap className="text-secondary" fill="currentColor" size={20} />
          <span className="font-label-caps text-label-caps font-black italic">STREAK: 0</span>
        </div>
        
        <div className="flex gap-2 md:gap-3">
          <button 
            onClick={onOpenChat}
            className="w-10 h-10 md:w-12 md:h-12 rounded-full comic-border bg-white hover:bg-surface-container transition-colors flex items-center justify-center comic-shadow-sm active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
          >
            <MessageCircle size={20} className="text-primary" />
          </button>
          <button className="hidden sm:flex w-10 h-10 md:w-12 md:h-12 rounded-full comic-border bg-white hover:bg-surface-container transition-colors items-center justify-center comic-shadow-sm active:shadow-none active:translate-x-[2px] active:translate-y-[2px]">
            <Bell size={20} />
          </button>
          <Link href="/settings" className="w-10 h-10 md:w-12 md:h-12 rounded-full comic-border bg-white hover:bg-surface-container transition-colors flex items-center justify-center comic-shadow-sm active:shadow-none active:translate-x-[2px] active:translate-y-[2px]">
            <SettingsIcon size={20} />
          </Link>
        </div>
      </div>
    </header>
  );
}
