"use client";

import React, { useState, useEffect } from "react";
import { Flame, TrendingUp, Target, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createApiClient } from "@/lib/api";
import { HabitCardSkeleton } from "@/components/ui/Skeleton";
import { CreateHabitModal } from "@/components/CreateHabitModal";
import { useToast, ToastContainer } from "@/components/ui/Toast";

/** Returns a YYYY-MM-DD string for a date offset by `daysAgo` from today (local time). */
function dateOffsetLocal(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const today = dateOffsetLocal(0);

/**
 * Build a 7-element boolean array representing the last 7 days (oldest → newest).
 * true = habit was logged on that day.
 */
function buildHeatmap(logs: { logged_date: string }[]): boolean[] {
  const logDates = new Set(logs.map((l) => l.logged_date.slice(0, 10)));
  return Array.from({ length: 7 }, (_, i) => logDates.has(dateOffsetLocal(6 - i)));
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function HabitsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [habits, setHabits] = useState<any[]>([]);
  // Real 7-day logs per habit: { [habitId]: boolean[] }
  const [heatmaps, setHeatmaps] = useState<Record<string, boolean[]>>({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editHabit, setEditHabit] = useState<any>(null);
  const supabase = createClient();
  const { toasts, showToast, dismiss } = useToast();

  async function fetchData() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const api = createApiClient(session.access_token);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchedHabits = (await api.habits.list(false)) as any[];

      const enrichedHabits = fetchedHabits.map((h) => ({
        ...h,
        completedToday: h.last_activity_date === today,
      }));
      setHabits(enrichedHabits);

      // Fetch 7-day logs for each habit in parallel
      const logsResults = await Promise.all(
        fetchedHabits.map((h) =>
          api.habits.getLogs(h.id, 7).catch(() => [])
        )
      );

      const newHeatmaps: Record<string, boolean[]> = {};
      fetchedHabits.forEach((h, i) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        newHeatmaps[h.id] = buildHeatmap(logsResults[i] as any[]);
      });
      setHeatmaps(newHeatmaps);
    } catch {
      showToast("error", "Couldn't load your habits. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleHabit = async (id: string) => {
    // --- Optimistic update ---
    const previousHabits = habits;
    const previousHeatmaps = heatmaps;

    setHabits(habits.map((h) => {
      if (h.id !== id) return h;
      return {
        ...h,
        completedToday: !h.completedToday,
        current_streak: !h.completedToday
          ? h.current_streak + 1
          : Math.max(0, h.current_streak - 1),
      };
    }));

    // Optimistically update today's heatmap dot
    setHeatmaps((prev) => {
      const dots = [...(prev[id] ?? Array(7).fill(false))];
      dots[6] = !dots[6]; // today is always index 6
      return { ...prev, [id]: dots };
    });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not signed in");

      const api = createApiClient(session.access_token);
      await api.habits.log(id, { logged_date: today });
      showToast("success", "Habit logged! Keep the streak alive 🔥");

      // Refresh logs for this habit to get accurate data
      const freshLogs = await api.habits.getLogs(id, 7).catch(() => []);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setHeatmaps((prev) => ({ ...prev, [id]: buildHeatmap(freshLogs as any[]) }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("23505") || message.includes("unique")) {
        setHabits(previousHabits);
        setHeatmaps(previousHeatmaps);
        showToast("warning", "Already logged for today — come back tomorrow!");
      } else {
        setHabits(previousHabits);
        setHeatmaps(previousHeatmaps);
        showToast("error", "Couldn't log that habit. Try again?");
      }
    }
  };

  return (
    <div className="max-w-[1100px] mx-auto px-4 md:px-margin-desktop py-12 space-y-10">
      <ToastContainer toasts={toasts} dismiss={dismiss} />

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
          <>
            <HabitCardSkeleton />
            <HabitCardSkeleton />
            <HabitCardSkeleton />
            <HabitCardSkeleton />
            <HabitCardSkeleton />
            <HabitCardSkeleton />
          </>
        ) : habits.length === 0 ? (
          <div className="col-span-full py-12 text-center text-on-surface-variant font-body-lg italic animate-fade-in-up">
            No routines found. Time to build some!
          </div>
        ) : (
          habits.map((habit, index) => {
            const dots: boolean[] = heatmaps[habit.id] ?? Array(7).fill(false);
            return (
              <div
                key={habit.id}
                className="group bg-white p-6 rounded-lg comic-border flex flex-col justify-between transition-all comic-shadow-sm animate-fade-in-up opacity-0 cursor-pointer"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => {
                  setEditHabit(habit);
                  setIsModalOpen(true);
                }}
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-body-lg text-xl font-black text-on-surface pr-4">{habit.name}</h3>
                  <div className="flex items-center gap-1 bg-surface-container-high px-3 py-1 rounded-full comic-border shrink-0">
                    <Flame
                      className={habit.completedToday ? "text-secondary" : "text-on-surface-variant"}
                      size={16}
                      fill={habit.completedToday ? "currentColor" : "none"}
                    />
                    <span className="font-headline-sm font-black anton-text">{habit.current_streak || 0}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-on-surface-variant" />
                    <span className="text-sm font-bold text-on-surface-variant italic uppercase">
                      {habit.frequency === "flexible"
                        ? `Flexible (${habit.target_count || 1}x / week)`
                        : habit.frequency || "Daily"}
                    </span>
                  </div>
                  {habit.goal_ids && habit.goal_ids.length > 0 && (
                    <span className="bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded font-black italic text-[10px] comic-border flex items-center gap-1">
                      <Target size={10} /> {habit.goal_ids.length} GOAL{habit.goal_ids.length > 1 ? "S" : ""}
                    </span>
                  )}
                </div>

                {/* Real 7-day heatmap */}
                <div className="mb-4">
                  <div className="flex justify-between px-1 mb-1">
                    {dots.map((done, i) => (
                      <div
                        key={i}
                        title={DAY_LABELS[i]}
                        className={`w-7 h-7 rounded-md border-2 border-on-surface transition-all ${
                          done
                            ? "bg-secondary shadow-[2px_2px_0px_0px_#1a1c1b]"
                            : "bg-surface-container-low"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between px-1">
                    {DAY_LABELS.map((d) => (
                      <span key={d} className="text-[9px] font-bold text-on-surface-variant w-7 text-center">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Last logged */}
                {habit.last_activity_date && (
                  <div className="flex items-center gap-1 text-[10px] text-on-surface-variant font-bold mb-3">
                    <Calendar size={10} />
                    Last: {new Date(habit.last_activity_date + "T00:00:00").toLocaleDateString()}
                  </div>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleHabit(habit.id);
                  }}
                  className={`w-full py-3 rounded-lg comic-border font-label-caps font-black italic uppercase transition-all ${
                    habit.completedToday
                      ? "bg-surface-container text-on-surface-variant border-dashed"
                      : "bg-primary-container text-white comic-shadow-sm hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none active:bg-primary"
                  }`}
                >
                  {habit.completedToday ? "Completed Today ✓" : "Mark Done"}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => {
          setEditHabit(null);
          setIsModalOpen(true);
        }}
        className="fixed bottom-6 right-6 md:bottom-10 md:right-10 w-16 h-16 md:w-20 md:h-20 bg-secondary text-on-secondary rounded-lg comic-border comic-shadow hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[10px_10px_0px_0px_#1a1c1b] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all flex items-center justify-center z-50 group"
      >
        <span className="material-symbols-outlined text-3xl font-black">add</span>
        <span className="absolute right-20 md:right-24 bg-on-surface text-white px-5 py-2 comic-border text-sm font-black italic opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none uppercase">NEW HABIT</span>
      </button>

      <CreateHabitModal
        isOpen={isModalOpen}
        initialData={editHabit}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchData();
          showToast("success", editHabit ? "Habit updated!" : "New habit added — build that streak! 🔥");
        }}
      />
    </div>
  );
}
