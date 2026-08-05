"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Zap, Bell, Calendar, Menu, Sparkles, Send, MessageCircle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createApiClient } from "@/lib/api";

export default function TopHeader({
  onOpenChat,
  onMenuToggle,
}: {
  onOpenChat?: () => void;
  onMenuToggle?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [currentStreak, setCurrentStreak] = useState<number | null>(null);

  useEffect(() => {
    async function fetchStreak() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const api = createApiClient(session.access_token);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stats: any = await api.gamification.stats();
        setCurrentStreak(stats?.current_streak ?? 0);
      } catch {
        setCurrentStreak(0);
      }
    }
    fetchStreak();
  }, []);

  const pageTitles: Record<string, string> = {
    "/dashboard": "HOME",
    "/quests": "QUESTS",
    "/habits": "HABITS",
    "/goals": "GOALS",
    "/schedule": "SCHEDULE",
    "/calendar": "CALENDAR",
    "/chat": "HAIA",
    "/settings": "SETTINGS",
  };

  const title = pageTitles[pathname] || "DASHBOARD";

  const handleCaptureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setFeedback({ type: "error", msg: "Not signed in." });
        return;
      }

      const api = createApiClient(session.access_token);
      const result: any = await api.parse.text(query.trim(), "typed");
      
      if (result.intent === "unknown") {
        setFeedback({ type: "error", msg: "AI is too busy right now (High Demand) or couldn't parse that. Try again in a bit!" });
        setTimeout(() => setFeedback(null), 5000);
        setIsSubmitting(false);
        return;
      }

      setQuery("");
      setFeedback({ type: "success", msg: "Got it! Check your Quests." });
      setTimeout(() => setFeedback(null), 3000);

      // If we're already on the quests page, a hard refresh will pick up the new item.
      // Otherwise a soft push is fine — the quests page fetches on mount.
      if (pathname !== "/quests") {
        router.push("/quests");
      } else {
        router.refresh();
      }
    } catch (err: any) {
      const errMsg = err?.message || "";
      if (errMsg.includes("503") || errMsg.includes("429")) {
        setFeedback({ type: "error", msg: "The AI model is currently experiencing high demand. Please try again later." });
      } else {
        setFeedback({ type: "error", msg: "Couldn't parse that — try rephrasing?" });
      }
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <header className="h-20 px-4 md:px-margin-desktop flex justify-between items-center bg-surface border-b-2 border-on-surface sticky top-0 z-40 shadow-[4px_4px_0px_0px_rgba(20,27,43,1)]">
      {/* Left: Mobile Menu & Page Title */}
      <div className="flex items-center gap-4 md:gap-8 flex-1 md:flex-none">
        <button
          onClick={onMenuToggle}
          className="md:hidden w-12 h-12 flex items-center justify-center comic-border rounded-lg hover:bg-surface-container transition-colors"
        >
          <Menu size={24} />
        </button>
        <h2 className="hidden md:block font-headline-md text-2xl anton-text uppercase tracking-wide text-on-surface w-32">
          {title}
        </h2>
      </div>
      
      {/* Center: Global AI Quick Capture */}
      <div className="hidden md:flex flex-1 max-w-xl mx-4 flex-col gap-1">
        <form onSubmit={handleCaptureSubmit} className="w-full relative flex items-center group">
          <div className="absolute left-4 text-primary group-focus-within:text-secondary transition-colors">
            <Sparkles size={20} />
          </div>
          <input 
            type="text" 
            placeholder="Log a task, habit, or goal..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isSubmitting}
            className="w-full h-12 bg-surface-container-low border-2 border-on-surface rounded-full pl-12 pr-12 font-body-lg focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white comic-shadow-sm transition-all disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={isSubmitting || !query.trim()}
            className="absolute right-3 w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white hover:bg-primary/90 transition-colors comic-border disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? <Loader2 size={14} className="animate-spin" />
              : <Send size={14} className="mr-0.5" />
            }
          </button>
        </form>
        {feedback && (
          <p className={`text-xs font-bold italic px-4 animate-fade-in-up ${feedback.type === "success" ? "text-secondary" : "text-error"}`}>
            {feedback.msg}
          </p>
        )}
      </div>

      {/* Right: Stats & Settings */}
      <div className="flex items-center gap-3 md:gap-6 shrink-0">
        <div className="hidden sm:flex items-center bg-surface-container-high comic-border rounded-full px-5 py-1.5 gap-2 comic-shadow-sm transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none cursor-default">
          <Zap className="text-secondary" fill="currentColor" size={20} />
          <span className="font-label-caps text-label-caps font-black italic">
            STREAK: {currentStreak === null ? "—" : currentStreak}
          </span>
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
          <Link href="/calendar" className="w-10 h-10 md:w-12 md:h-12 rounded-full comic-border bg-white hover:bg-surface-container transition-colors flex items-center justify-center comic-shadow-sm active:shadow-none active:translate-x-[2px] active:translate-y-[2px]">
            <Calendar size={20} />
          </Link>
        </div>
      </div>
    </header>
  );
}


