"use client";

import React, { useState, useEffect } from "react";
import { Target, Zap, PlusCircle, Medal } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createApiClient } from "@/lib/api";
import { GoalCardSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { CreateGoalModal } from "@/components/CreateGoalModal";

export default function GoalsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [habits, setHabits] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const supabase = createClient();

  const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        const api = createApiClient(session.access_token);
        const [fetchedHabits, fetchedGoals] = await Promise.all([
          api.habits.list(),
          api.goals.list()
        ]);
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setHabits((fetchedHabits as any[]) || []);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setGoals((fetchedGoals as any[]) || []);
      } catch (err) {
        console.error("Failed to fetch goals data:", err);
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const toggleHabitDot = async (habitId: string, dayIndex: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const api = createApiClient(session.access_token);
      await api.habits.log(habitId, {});
      
      // Optimistic refresh logic could go here, but for simplicity we refetch or just toggle
    } catch (err) {
      console.error("Failed to log habit:", err);
    }
  };

  return (
    <div className="flex-1 w-full bg-[#f9f9f7] relative z-0 min-h-[calc(100vh-80px)] overflow-y-auto">
      <main className="px-4 md:px-margin-desktop py-8 md:py-12 w-full max-w-max-width-content mx-auto">
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="font-display-hero text-4xl md:text-display-hero ink-header mb-2 anton-text tracking-normal">QUOTAS & HABITS</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">Your momentum for this week. Stay sharp.</p>
          </div>
          <div className="flex gap-2">
            <button className="pop-card bg-xp-gold px-6 py-2 font-bold uppercase tracking-wider flex items-center gap-2">
              <Zap size={20} />
              Sync
            </button>
          </div>
        </div>

        {/* Bento Grid Content */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* Main Goals Column */}
          <div className="md:col-span-8 space-y-6">
            <h3 className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
              <Target size={16} /> Active Sprints
            </h3>
            
            {loading ? (
              <div className="space-y-6">
                <GoalCardSkeleton />
                <GoalCardSkeleton />
                <GoalCardSkeleton />
              </div>
            ) : goals.length === 0 ? (
              <div className="p-6 text-center italic text-on-surface-variant animate-fade-in-up">No active sprints. Time to set one!</div>
            ) : (
              goals.map((goal, index) => (
                <div key={goal.id} className="pop-card bg-white p-6 relative overflow-hidden animate-fade-in-up opacity-0" style={{ animationDelay: `${index * 50}ms` }}>
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-4 gap-4">
                    <div>
                      <h4 className="font-headline-md text-headline-md mb-1 anton-text">{goal.title}</h4>
                      <p className="text-on-surface-variant text-sm italic">{goal.description || "No description"}</p>
                    </div>
                    <div className="bg-xp-gold px-3 py-1 rounded-full border-2 border-on-surface font-label-xp text-label-xp flex items-center justify-center gap-1 shrink-0 whitespace-nowrap">
                      {goal.status || "ACTIVE"}
                    </div>
                  </div>
                  <div className="relative h-6 bg-surface-container-high border-2 border-on-surface rounded-full overflow-hidden">
                    <div className="absolute inset-0 halftone"></div>
                    <div className="h-full bg-indigo-deep border-r-2 border-on-surface relative" style={{ width: `${Math.min(100, Math.max(0, goal.progress || 0))}%` }}>
                      <div className="absolute inset-0 halftone opacity-30"></div>
                    </div>
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] md:text-xs font-bold text-on-surface uppercase tracking-wider">
                    <span>{goal.progress || 0}% Complete</span>
                    <span>{goal.target_date ? `Due ${new Date(goal.target_date).toLocaleDateString()}` : "No Deadline"}</span>
                  </div>
                </div>
              ))
            )}
            
            {/* Goal Card 3 (New Sprint) */}
            <div 
              onClick={() => setIsModalOpen(true)}
              className="pop-card bg-white p-6 border-dashed opacity-80 border-2 border-on-surface-variant flex flex-col items-center justify-center py-12 group cursor-pointer hover:opacity-100 hover:border-solid hover:border-on-surface"
            >
              <PlusCircle className="text-on-surface-variant mb-2 group-hover:scale-110 group-hover:text-primary transition-all" size={40} />
              <p className="font-label-caps text-label-caps uppercase tracking-widest group-hover:text-primary">Launch New Sprint</p>
            </div>
          </div>
          
          {/* Habit Sidebar Column */}
          <div className="md:col-span-4 space-y-6">
            <h3 className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
              <Zap size={16} /> Habit Streaks
            </h3>
            
            {/* Habit Tracker List */}
            <div className="space-y-4">
              {loading ? (
                <div className="space-y-4">
                  <div className="pop-card bg-white p-4 h-[100px] flex items-center justify-center">
                    <Skeleton className="w-full h-full" />
                  </div>
                  <div className="pop-card bg-white p-4 h-[100px] flex items-center justify-center">
                    <Skeleton className="w-full h-full" />
                  </div>
                  <div className="pop-card bg-white p-4 h-[100px] flex items-center justify-center">
                    <Skeleton className="w-full h-full" />
                  </div>
                </div>
              ) : habits.length === 0 ? (
                <div className="p-4 text-center italic text-on-surface-variant animate-fade-in-up">No habits found.</div>
              ) : (
                habits.map((habit, index) => (
                  <div key={habit.id} className="pop-card bg-white p-4 animate-fade-in-up opacity-0" style={{ animationDelay: `${index * 50}ms` }}>
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-bold text-on-surface text-sm md:text-base">{habit.name}</span>
                      <span className="text-xp-gold font-bold whitespace-nowrap">{habit.current_streak || 0} 🔥</span>
                    </div>
                    <div className="flex justify-between px-1">
                      {/* For a real app, this pattern should come from backend logs, but we'll mock the 7 days visual for now */}
                      {[0,1,2,3,4,5,6].map((dayIndex) => (
                        <div 
                          key={dayIndex}
                          onClick={() => toggleHabitDot(habit.id, dayIndex)}
                          className={`habit-dot cursor-pointer ${dayIndex < (habit.current_streak || 0) % 7 ? 'active' : 'bg-surface-container-low'}`}
                          title={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][dayIndex]}
                        ></div>
                      ))}
                    </div>
                  </div>
                ))
              )}

              {/* Quick Action Card */}
              <div className="pop-card bg-on-surface text-white p-6 relative overflow-hidden mt-6">
                <div className="absolute -right-4 -bottom-4 halftone opacity-40 rotate-12 w-24 h-24"></div>
                <h4 className="font-headline-md text-headline-md mb-2 relative z-10 italic anton-text">Haia AI Coaching</h4>
                <p className="text-sm opacity-80 mb-4 relative z-10">&quot;You&apos;re 15% more productive when you finish &apos;Deep Work&apos; before noon. Want to reschedule?&quot;</p>
                <button className="w-full bg-white text-on-surface py-2 font-bold rounded relative z-10 hover:bg-xp-gold transition-colors">Open Chat</button>
              </div>

              {/* Mini Stats Sticker */}
              <div className="pop-card bg-[#FF6B6B] p-4 rotate-2 mt-6 max-w-[200px] ml-auto">
                <div className="flex items-center gap-3">
                  <Medal className="text-white shrink-0" size={32} />
                  <div>
                    <p className="text-[10px] uppercase font-bold text-white/80">Weekly Rank</p>
                    <p className="text-xl font-extrabold text-white anton-text tracking-wide">TOP 5%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Call to Action */}
        <div className="md:hidden mt-8 sticky bottom-4">
          <button onClick={() => setIsModalOpen(true)} className="w-full pop-card bg-indigo-deep text-white py-4 font-bold flex items-center justify-center gap-3">
            <Zap size={20} />
            NEW SPRINT
          </button>
        </div>
      </main>

      <CreateGoalModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchData} 
      />
    </div>
  );
}
