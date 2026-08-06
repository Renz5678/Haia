"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { createApiClient } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { Skeleton } from "@/components/ui/Skeleton";
import { CreateQuestModal } from "@/components/CreateQuestModal";
import { useToast, ToastContainer } from "@/components/ui/Toast";

const DAILY_XP_GOAL = 1200;

const RADAR_TIPS = [
  "Log your first habit today to start a streak and earn bonus XP!",
  "Completing a quest before noon unlocks a 10% XP bonus window.",
  "Link tasks to a Goal to watch your progress bar fill up automatically.",
  "Flexible habits count weekly — hit your target 3x this week for a streak.",
  "Send a schedule photo to the Telegram bot to auto-fill your timetable.",
  "Use the Quick Capture bar to log tasks in plain English — Haia handles the rest.",
];

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState("all");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tasks, setTasks] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const supabase = createClient();
  const { toasts, showToast, dismiss } = useToast();

  const [tip, setTip] = useState(RADAR_TIPS[0]);
  const [mounted, setMounted] = useState(false);

  async function fetchData() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const api = createApiClient(session.access_token);
      const [fetchedTasks, fetchedStats] = await Promise.all([
        api.tasks.list({ task_status: "pending" }),
        api.gamification.stats(),
      ]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setTasks((fetchedTasks as any[]) || []);
      setStats(fetchedStats);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setMounted(true);
    setTip(RADAR_TIPS[Math.floor(Math.random() * RADAR_TIPS.length)]);
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTask = async (id: number | string) => {
    const previousTasks = tasks;
    setTasks(tasks.filter((t) => t.id !== id));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const api = createApiClient(session.access_token);
      await api.tasks.complete(id.toString());
      showToast("success", "Quest complete! XP earned 🎉");
      // Refresh stats so XP bar updates
      const freshStats = await api.gamification.stats();
      setStats(freshStats);
    } catch (err) {
      console.error("Failed to complete task:", err);
      setTasks(previousTasks);
      showToast("error", "Couldn't complete that quest. Try again?");
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filteredTasks = tasks.filter((t: any) => {
    if (activeTab === "all") return true;
    if (activeTab === "school") return (t.task_type || "").toLowerCase() === "school";
    if (activeTab === "personal") return (t.task_type || "").toLowerCase() === "personal";
    return true;
  });

  const todayXp: number = stats?.today_xp ?? 0;
  const xpProgressPct = Math.min(100, (todayXp / DAILY_XP_GOAL) * 100);

  return (
    <>
      <ToastContainer toasts={toasts} dismiss={dismiss} />
      <div className="max-w-[1100px] mx-auto px-4 md:px-margin-desktop py-12 space-y-12">
        {/* Hero Header */}
        <section className="relative">
          <p className="font-label-caps text-label-caps uppercase tracking-[0.3em] text-on-surface-variant mb-4 font-black italic">
            TODAY • {new Date().toLocaleDateString("en-US", { weekday: "long" }).toUpperCase()}
          </p>
          <div className="relative inline-block">
            <h1 className="font-display-hero text-6xl md:text-display-hero anton-text leading-none text-on-surface drop-shadow-[4px_4px_0px_#4F46E5] uppercase">
              HEY {user?.display_name || "HERO"} 👋
            </h1>
          </div>
        </section>

        {/* Stat Strip */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Streak */}
          <div className="bg-white p-6 rounded-lg comic-border comic-shadow flex items-center gap-4 transition-all hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[10px_10px_0px_0px_#1a1c1b] animate-fade-in-up opacity-0" style={{ animationDelay: "0ms" }}>
            <div className="w-14 h-14 rounded-full bg-secondary-fixed comic-border flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary text-headline-md" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
            </div>
            <div>
              <p className="text-on-surface-variant font-label-caps text-label-caps font-black italic">CURRENT STREAK</p>
              {loading
                ? <Skeleton className="h-7 w-24 mt-1" />
                : <p className="font-headline-md text-headline-md text-on-surface anton-text">{stats?.current_streak ?? 0} DAYS</p>
              }
            </div>
          </div>

          {/* XP */}
          <div className="bg-white p-6 rounded-lg comic-border comic-shadow flex items-center gap-4 transition-all hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[10px_10px_0px_0px_#1a1c1b] animate-fade-in-up opacity-0" style={{ animationDelay: "100ms" }}>
            <div className="w-14 h-14 rounded-full bg-tertiary-fixed comic-border flex items-center justify-center">
              <span className="material-symbols-outlined text-tertiary text-headline-md" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
            </div>
            <div>
              <p className="text-on-surface-variant font-label-caps text-label-caps font-black italic">TOTAL XP</p>
              {loading
                ? <Skeleton className="h-7 w-24 mt-1" />
                : <p className="font-headline-md text-headline-md text-on-surface anton-text">{stats?.total_xp?.toLocaleString() ?? 0}</p>
              }
            </div>
          </div>

          {/* Level */}
          <div className="bg-primary-container p-6 rounded-lg comic-border comic-shadow text-white flex items-center gap-4 transition-all hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[10px_10px_0px_0px_#1a1c1b] animate-fade-in-up opacity-0" style={{ animationDelay: "200ms" }}>
            <div className="w-14 h-14 rounded-full bg-white/20 comic-border border-white flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-headline-md" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
            </div>
            <div>
              <p className="text-white/80 font-label-caps text-label-caps font-black italic">LEVEL PROGRESS</p>
              {loading
                ? <Skeleton className="h-7 w-28 mt-1 bg-white/30" />
                : <p className="font-headline-md text-headline-md anton-text">LEVEL {stats?.current_level ?? 1} <span className="text-sm font-normal opacity-70 anton-text ml-2">ACE</span></p>
              }
            </div>
          </div>
        </section>

        {/* Filter & Content Layout */}
        <div className="space-y-8">
          <div className="flex overflow-x-auto bg-surface-container-high p-1.5 rounded-lg comic-border w-fit comic-shadow-sm max-w-full">
            {["all", "school", "personal"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 md:px-8 py-2.5 rounded font-label-caps text-label-caps font-black italic uppercase transition-colors ${
                  activeTab === tab ? "bg-primary text-white" : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Left Column: Tasks */}
            <div className="col-span-12 lg:col-span-7 space-y-6">
              <div className="flex justify-between items-end mb-2 border-b-4 border-on-surface pb-2">
                <h2 className="font-headline-md text-headline-md anton-text">DEEP WORK LIST</h2>
                <span className="text-on-surface font-black italic text-label-caps uppercase">{filteredTasks.length} REMAINING</span>
              </div>

              {loading ? (
                <div className="space-y-6">
                  {[0, 1].map((i) => (
                    <div key={i} className="bg-white p-6 rounded-lg comic-border h-[90px] flex items-center gap-5">
                      <Skeleton className="w-7 h-7 rounded shrink-0" />
                      <div className="flex-1">
                        <Skeleton className="h-6 w-1/3 mb-2" />
                        <Skeleton className="h-4 w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="py-8 text-center text-on-surface-variant italic font-bold animate-fade-in-up">
                  No active missions right now. You&apos;re clear!
                </div>
              ) : (
                filteredTasks.map((task, index) => (
                  <div
                    key={task.id}
                    className={`group bg-white p-6 rounded-lg comic-border flex items-center justify-between transition-all animate-fade-in-up opacity-0 ${
                      task.checked
                        ? "opacity-60 translate-x-[4px] translate-y-[4px] shadow-none"
                        : "comic-shadow-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
                    }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-5">
                      <input
                        type="checkbox"
                        checked={!!task.checked}
                        onChange={() => toggleTask(task.id)}
                        className="w-7 h-7 rounded comic-border text-primary focus:ring-primary transition-all custom-checkbox cursor-pointer shrink-0"
                      />
                      <div>
                        <h3 className={`font-body-lg text-body-lg font-black transition-colors ${task.checked ? "text-on-surface-variant line-through" : "text-on-surface group-hover:text-primary"}`}>
                          {task.title}
                        </h3>
                        <p className="text-on-surface-variant font-black italic text-xs uppercase mt-1">
                          {task.due_date ? new Date(task.due_date).toLocaleDateString() : "NO DUE DATE"} •{" "}
                          <span className={task.task_type === "school" ? "text-secondary" : "text-primary-container"}>
                            {task.task_type || "TASK"}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="hidden sm:flex bg-secondary-fixed text-on-secondary-container px-4 py-1.5 comic-border rounded-full font-label-xp text-label-xp items-center gap-1 font-black italic shrink-0">
                      <span>+{task.xp_value || task.xp || 50}</span> <span className="text-[10px] opacity-70">XP</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Right Column: Progress */}
            <div className="col-span-12 lg:col-span-5 space-y-8">
              <div className="bg-white p-6 md:p-8 rounded-lg comic-border comic-shadow">
                <h2 className="font-headline-md text-headline-md anton-text mb-8 border-b-2 border-on-surface inline-block">TODAY&apos;S PROGRESS</h2>
                <div className="space-y-10">
                  {/* Daily XP Goal */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <span className="font-label-caps text-label-caps text-on-surface uppercase font-black italic">DAILY XP GOAL</span>
                      {loading
                        ? <Skeleton className="h-5 w-24" />
                        : <span className="font-label-xp text-label-xp text-primary anton-text text-lg">{todayXp} / {DAILY_XP_GOAL}</span>
                      }
                    </div>
                    <div className="w-full h-4 bg-surface-container comic-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-container border-r-2 border-on-surface transition-all duration-1000"
                        style={{ width: loading ? "0%" : `${xpProgressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Tasks remaining */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <span className="font-label-caps text-label-caps text-on-surface uppercase font-black italic">QUESTS CLEARED</span>
                      {loading
                        ? <Skeleton className="h-5 w-20" />
                        : <span className="font-label-xp text-label-xp text-secondary anton-text text-lg">{stats?.tasks_completed ?? 0} TOTAL</span>
                      }
                    </div>
                    <div className="w-full h-4 bg-surface-container comic-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-secondary-container border-r-2 border-on-surface transition-all duration-1000"
                        style={{ width: loading ? "0%" : `${Math.min(100, ((stats?.tasks_completed ?? 0) / 100) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* HAIA's Radar tip */}
              <div className="mt-12 p-6 bg-surface-container-low comic-border rounded-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-1 bg-primary text-white text-[10px] font-black italic comic-border-b comic-border-l transform rotate-3">PRO-TIP</div>
                <div className="flex gap-4 items-start relative z-10">
                  <div className="w-12 h-12 rounded bg-primary/10 comic-border flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary">auto_awesome</span>
                  </div>
                  <div>
                    <p className="font-body-md font-black text-on-surface mb-2 uppercase italic text-sm">HAIA&apos;S RADAR</p>
                    {mounted ? (
                      <p suppressHydrationWarning className="text-on-surface-variant font-medium text-sm leading-relaxed italic">&quot;{tip}&quot;</p>
                    ) : (
                      <div className="h-4 bg-surface-container rounded w-64 animate-pulse mt-1" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 md:bottom-10 md:right-10 w-16 h-16 md:w-20 md:h-20 bg-primary-container text-white rounded-lg comic-border comic-shadow hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[10px_10px_0px_0px_#1a1c1b] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all flex items-center justify-center z-50 group"
      >
        <span className="material-symbols-outlined text-3xl font-black">add</span>
        <span className="absolute right-20 md:right-24 bg-on-surface text-white px-5 py-2 comic-border text-sm font-black italic opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none uppercase">NEW QUEST</span>
      </button>

      <CreateQuestModal
        isOpen={isModalOpen}
        initialData={null}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchData();
          showToast("success", "Quest added to the log!");
        }}
      />
    </>
  );
}
