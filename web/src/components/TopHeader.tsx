"use client";

import React from "react";
import Link from "next/link";
import { Zap, Bell, Settings as SettingsIcon, Menu } from "lucide-react";

export default function TopHeader() {
  return (
    <header className="h-20 px-4 md:px-margin-desktop flex justify-between items-center bg-surface border-b-2 border-on-surface sticky top-0 z-40 shadow-[4px_4px_0px_0px_rgba(20,27,43,1)]">
      <div className="flex items-center gap-4 md:gap-8">
        <button className="md:hidden w-12 h-12 flex items-center justify-center comic-border rounded-lg hover:bg-surface-container transition-colors">
          <Menu size={24} />
        </button>
        <nav className="hidden md:flex gap-8">
          <Link href="/dashboard" className="font-label-caps text-label-caps uppercase tracking-[0.2em] text-primary border-b-4 border-primary pb-1">Focus</Link>
          <Link href="/quests" className="font-label-caps text-label-caps uppercase tracking-[0.2em] text-on-surface-variant hover:text-primary transition-colors">Quests</Link>
          <Link href="/archive" className="font-label-caps text-label-caps uppercase tracking-[0.2em] text-on-surface-variant hover:text-primary transition-colors">Archive</Link>
        </nav>
      </div>
      
      <div className="flex items-center gap-3 md:gap-6">
        <div className="hidden sm:flex items-center bg-surface-container-high comic-border rounded-full px-5 py-1.5 gap-2 comic-shadow-sm transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none cursor-default">
          <Zap className="text-secondary" fill="currentColor" size={20} />
          <span className="font-label-caps text-label-caps font-black italic">STREAK: 12</span>
        </div>
        
        <div className="flex gap-2 md:gap-3">
          <button className="w-10 h-10 md:w-12 md:h-12 rounded-full comic-border bg-white hover:bg-surface-container transition-colors flex items-center justify-center comic-shadow-sm active:shadow-none active:translate-x-[2px] active:translate-y-[2px]">
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
