"use client";

import React, { useState, useEffect } from "react";
import { Flame, Plus, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createApiClient } from "@/lib/api";

export default function HabitsPage() {
  const [habits, setHabits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        const api = createApiClient(session.access_token);
        const fetchedHabits = await api.habits.list(true); // active_only=true
        setHabits(fetchedHabits as any[]);
      } catch (err) {
        console.error("Failed to fetch habits:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const toggleHabit = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const api = createApiClient(session.access_token);
      // Determine if completed today. In real gamification, this log determines streak.
      await api.habits.log(id, {});
      
      setHabits(habits.map(h => {
        if (h.id === id) {
          // Optimistically update the UI
          return { ...h, completedToday: !h.completedToday, current_streak: !h.completedToday ? h.current_streak + 1 : h.current_streak - 1 };
        }
        return h;
      }));
    } catch (err) {
      console.error("Failed to log habit:", err);
    }
  };

  return (
    <div className="max-w-[1100px] mx-auto px-4 md:px-margin-desktop py-12 space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-4 border-on-surface pb-6">
        <div>
          <p className="font-label-caps text-label-caps uppercase tracking-[0.3em] text-on-surface-variant mb-2 font-black italic">
            DAILY ROUTINES
          </p>
          <h1 className="font-display-hero text-5xl md:text-6xl anton-text leading-none text-on-surface drop-shadow-[4px_4px_0px_#4F46E5]">
            HABITS
          </h1>
        </div>
      </div>

      {/* Habits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-on-surface-variant font-body-lg italic">
            Loading routines...
          </div>
        ) : habits.length === 0 ? (
          <div className="col-span-full py-12 text-center text-on-surface-variant font-body-lg italic">
            No routines found. Time to build some!
          </div>
        ) : (
          habits.map(habit => (
            <div 
              key={habit.id}
              className={`group bg-white p-6 rounded-lg comic-border flex flex-col justify-between transition-all comic-shadow-sm`}
            >
              <div className="flex justify-between items-start mb-6">
                <h3 className="font-body-lg text-xl font-black text-on-surface pr-4">
                  {habit.name}
                </h3>
                <div className="flex items-center gap-1 bg-surface-container-high px-3 py-1 rounded-full comic-border">
                  <Flame className={habit.completedToday ? "text-secondary" : "text-on-surface-variant"} size={16} fill={habit.completedToday ? "currentColor" : "none"} />
                  <span className="font-headline-sm font-black anton-text">{habit.current_streak || 0}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-6">
                <TrendingUp size={16} className="text-on-surface-variant" />
                <span className="text-sm font-bold text-on-surface-variant italic uppercase">Frequency: {habit.frequency || "Daily"}</span>
              </div>

              <button
                onClick={() => toggleHabit(habit.id)}
                className={`w-full py-3 rounded-lg comic-border font-label-caps font-black italic uppercase transition-all ${
                  habit.completedToday 
                    ? 'bg-surface-container text-on-surface-variant border-dashed'
                    : 'bg-primary-container text-white comic-shadow-sm hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none active:bg-primary'
                }`}
              >
                {habit.completedToday ? "Completed" : "Mark Done"}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Floating Action Button */}
      <button className="fixed bottom-6 right-6 md:bottom-10 md:right-10 w-16 h-16 md:w-20 md:h-20 bg-secondary text-on-secondary rounded-lg comic-border comic-shadow hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[10px_10px_0px_0px_#1a1c1b] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all flex items-center justify-center z-50 group">
        <span className="material-symbols-outlined text-3xl font-black">add</span>
        <span className="absolute right-20 md:right-24 bg-on-surface text-white px-5 py-2 comic-border text-sm font-black italic opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none uppercase">NEW HABIT</span>
      </button>
    </div>
  );
}
