"use client";

import React, { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createApiClient } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

export default function DashboardPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        const api = createApiClient(session.access_token);
        const [fetchedTasks, fetchedStats] = await Promise.all([
          api.tasks.list({ task_status: "pending" }),
          api.gamification.stats()
        ]);
        setTasks((fetchedTasks as any[]) || []);
        setStats(fetchedStats);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const toggleTask = async (id: number | string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const api = createApiClient(session.access_token);
      await api.tasks.complete(id.toString());
      setTasks(tasks.filter(t => t.id !== id));
    } catch (err) {
      console.error("Failed to complete task:", err);
    }
  };

  return (
    <>
      <div className="max-w-[1100px] mx-auto px-4 md:px-margin-desktop py-12 space-y-12">
        {/* Hero Header */}
        <section className="relative">
          <p className="font-label-caps text-label-caps uppercase tracking-[0.3em] text-on-surface-variant mb-4 font-black italic">
            TODAY • FRIDAY
          </p>
          <div className="relative inline-block">
            <h1 className="font-display-hero text-6xl md:text-display-hero anton-text leading-none text-on-surface drop-shadow-[4px_4px_0px_#4F46E5]">
              HEY HERO 👋
            </h1>
          </div>
        </section>

        {/* Stat Strip */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Streak */}
          <div className="bg-white p-6 rounded-lg comic-border comic-shadow flex items-center gap-4 transition-all hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[10px_10px_0px_0px_#1a1c1b]">
            <div className="w-14 h-14 rounded-full bg-secondary-fixed comic-border flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary text-headline-md" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
            </div>
            <div>
              <p className="text-on-surface-variant font-label-caps text-label-caps font-black italic">CURRENT STREAK</p>
              <p className="font-headline-md text-headline-md text-on-surface anton-text">{stats?.longest_streak || 0} DAYS</p>
            </div>
          </div>

          {/* XP */}
          <div className="bg-white p-6 rounded-lg comic-border comic-shadow flex items-center gap-4 transition-all hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[10px_10px_0px_0px_#1a1c1b]">
            <div className="w-14 h-14 rounded-full bg-tertiary-fixed comic-border flex items-center justify-center">
              <span className="material-symbols-outlined text-tertiary text-headline-md" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
            </div>
            <div>
              <p className="text-on-surface-variant font-label-caps text-label-caps font-black italic">TOTAL XP</p>
              <p className="font-headline-md text-headline-md text-on-surface anton-text">{stats?.total_xp?.toLocaleString() || 0}</p>
            </div>
          </div>

          {/* Level */}
          <div className="bg-primary-container p-6 rounded-lg comic-border comic-shadow text-white flex items-center gap-4 transition-all hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[10px_10px_0px_0px_#1a1c1b]">
            <div className="w-14 h-14 rounded-full bg-white/20 comic-border border-white flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-headline-md" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
            </div>
            <div>
              <p className="text-white/80 font-label-caps text-label-caps font-black italic">LEVEL PROGRESS</p>
              <p className="font-headline-md text-headline-md anton-text">LEVEL {stats?.current_level || 1} <span className="text-sm font-normal opacity-70 anton-text ml-2">ACE</span></p>
            </div>
          </div>
        </section>

        {/* Filter & Content Layout */}
        <div className="space-y-8">
          {/* Segmented Control */}
          <div className="flex overflow-x-auto bg-surface-container-high p-1.5 rounded-lg comic-border w-fit comic-shadow-sm max-w-full">
            <button className="px-6 md:px-8 py-2.5 bg-primary text-white rounded font-label-caps text-label-caps font-black italic uppercase">All</button>
            <button className="px-6 md:px-8 py-2.5 text-on-surface-variant font-label-caps text-label-caps hover:text-on-surface transition-colors font-black italic uppercase">School</button>
            <button className="px-6 md:px-8 py-2.5 text-on-surface-variant font-label-caps text-label-caps hover:text-on-surface transition-colors font-black italic uppercase">Personal</button>
            <button className="px-6 md:px-8 py-2.5 text-on-surface-variant font-label-caps text-label-caps hover:text-on-surface transition-colors font-black italic uppercase">Habits</button>
          </div>

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Left Column: Tasks */}
            <div className="col-span-12 lg:col-span-7 space-y-6">
              <div className="flex justify-between items-end mb-2 border-b-4 border-on-surface pb-2">
                <h2 className="font-headline-md text-headline-md anton-text">DEEP WORK LIST</h2>
                <span className="text-on-surface font-black italic text-label-caps uppercase">{tasks.filter(t => !t.checked).length} REMAINING</span>
              </div>

              {loading ? (
                <div className="py-8 text-center text-on-surface-variant italic font-bold">Loading missions...</div>
              ) : tasks.length === 0 ? (
                <div className="py-8 text-center text-on-surface-variant italic font-bold">No active missions right now. You're clear!</div>
              ) : (
                tasks.map(task => (
                  <div 
                    key={task.id}
                    className={`group bg-white p-6 rounded-lg comic-border flex items-center justify-between transition-all ${
                      task.checked 
                        ? 'opacity-60 translate-x-[4px] translate-y-[4px] shadow-none' 
                        : 'comic-shadow-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none'
                    }`}
                  >
                    <div className="flex items-center gap-5">
                      <input 
                        type="checkbox" 
                        checked={!!task.checked}
                        onChange={() => toggleTask(task.id)}
                        className="w-7 h-7 rounded comic-border text-primary focus:ring-primary transition-all custom-checkbox cursor-pointer shrink-0" 
                      />
                      <div>
                        <h3 className={`font-body-lg text-body-lg font-black transition-colors ${task.checked ? 'text-on-surface-variant line-through' : 'text-on-surface group-hover:text-primary'}`}>
                          {task.title}
                        </h3>
                        <p className="text-on-surface-variant font-black italic text-xs uppercase mt-1">
                          {task.due_date ? new Date(task.due_date).toLocaleDateString() : "NO DUE DATE"} • <span className={task.task_type === 'school' ? 'text-secondary' : 'text-primary-container'}>{task.task_type || "TASK"}</span>
                        </p>
                      </div>
                    </div>
                    <div className="hidden sm:flex bg-secondary-fixed text-on-secondary-container px-4 py-1.5 comic-border rounded-full font-label-xp text-label-xp items-center gap-1 font-black italic shrink-0">
                      <span>+{task.xp || 50}</span> <span className="text-[10px] opacity-70">XP</span>
                    </div>
                  </div>
                ))
              )}

              {/* Completed Task Example */}
              <div className="bg-surface-container-low p-6 rounded-lg comic-border flex items-center justify-between opacity-60">
                <div className="flex items-center gap-5">
                  <div className="w-7 h-7 rounded bg-on-surface flex items-center justify-center shrink-0">
                    <Check className="text-white text-sm" size={16} />
                  </div>
                  <div>
                    <h3 className="font-body-lg text-body-lg font-bold text-on-surface-variant line-through">Morning Workout (Lower Body)</h3>
                    <p className="text-on-surface-variant font-black italic text-xs uppercase mt-1">COMPLETED AT 08:30 AM</p>
                  </div>
                </div>
                <div className="hidden sm:flex bg-surface-container-highest text-on-surface-variant px-4 py-1.5 comic-border rounded-full font-label-xp text-label-xp font-black italic shrink-0">
                  <span>DONE</span>
                </div>
              </div>
            </div>

            {/* Right Column: Goals Progress */}
            <div className="col-span-12 lg:col-span-5 space-y-8">
              <div className="bg-white p-6 md:p-8 rounded-lg comic-border comic-shadow">
                <h2 className="font-headline-md text-headline-md anton-text mb-8 border-b-2 border-on-surface inline-block">TODAY'S PROGRESS</h2>
                <div className="space-y-10">
                  {/* Goal 1 */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <span className="font-label-caps text-label-caps text-on-surface uppercase font-black italic">DAILY XP GOAL</span>
                      <span className="font-label-xp text-label-xp text-primary anton-text text-lg">850 / 1200</span>
                    </div>
                    <div className="w-full h-4 bg-surface-container comic-border rounded-full overflow-hidden">
                      <div className="h-full bg-primary-container border-r-2 border-on-surface transition-all duration-1000" style={{ width: '70%' }}></div>
                    </div>
                  </div>
                  
                  {/* Goal 2 */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <span className="font-label-caps text-label-caps text-on-surface uppercase font-black italic">FOCUS HOURS</span>
                      <span className="font-label-xp text-label-xp text-secondary anton-text text-lg">3.5 / 5.0 HRS</span>
                    </div>
                    <div className="w-full h-4 bg-surface-container comic-border rounded-full overflow-hidden">
                      <div className="h-full bg-secondary-container border-r-2 border-on-surface transition-all duration-1000" style={{ width: '65%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-12 p-6 bg-surface-container-low comic-border rounded-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-1 bg-primary text-white text-[10px] font-black italic comic-border-b comic-border-l transform rotate-3">PRO-TIP</div>
                <div className="flex gap-4 items-start relative z-10">
                  <div className="w-12 h-12 rounded bg-primary/10 comic-border flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary">auto_awesome</span>
                  </div>
                  <div>
                    <p className="font-body-md font-black text-on-surface mb-2 uppercase italic text-sm">PARKER'S RADAR</p>
                    <p className="text-on-surface-variant font-medium text-sm leading-relaxed italic">"You're only 350 XP away from hitting your daily streak target! Complete that Economics analysis to level up."</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Floating Action Button */}
      <button className="fixed bottom-6 right-6 md:bottom-10 md:right-10 w-16 h-16 md:w-20 md:h-20 bg-primary-container text-white rounded-lg comic-border comic-shadow hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[10px_10px_0px_0px_#1a1c1b] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all flex items-center justify-center z-50 group">
        <span className="material-symbols-outlined text-3xl font-black">add</span>
        <span className="absolute right-20 md:right-24 bg-on-surface text-white px-5 py-2 comic-border text-sm font-black italic opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none uppercase">NEW QUEST</span>
      </button>
    </>
  );
}
