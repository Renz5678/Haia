"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, PlusCircle, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createApiClient } from "@/lib/api";
import { AlertModal } from "@/components/ui/AlertModal";
import { CalendarSkeleton } from "@/components/ui/Skeleton";
import { CreateQuestModal } from "@/components/CreateQuestModal";

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function CalendarPage() {
  // Navigable view — starts on current month
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-indexed

  const [activeDate, setActiveDate] = useState(now.getDate());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [courses, setCourses] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [habits, setHabits] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isQuestModalOpen, setIsQuestModalOpen] = useState(false);

  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false, title: "", message: "",
  });

  const monthTitle = new Date(viewYear, viewMonth, 1)
    .toLocaleString("default", { month: "long" })
    .toUpperCase() + " " + viewYear;

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();

  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();
  const todayDate = now.getDate();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
    setActiveDate(1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
    setActiveDate(1);
  };

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const api = createApiClient(session.access_token);

        const [fetchedCourses, fetchedHabits, fetchedTasks, integrationsRes] = await Promise.all([
          api.courses.list(),
          api.habits.list(),
          api.tasks.list({}),
          api.integrations.list(),
        ]);

        if (integrationsRes.integrations.includes("google_calendar")) {
          setIsGoogleConnected(true);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setCourses(fetchedCourses as any[]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setHabits(fetchedHabits as any[]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setTasks(fetchedTasks as any[]);
      } catch (err) {
        console.error("Failed to load calendar data", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const api = createApiClient(session.access_token);
      await api.integrations.google.sync();
      setAlertConfig({ isOpen: true, title: "Sync Started", message: "Sync started in the background!" });
    } catch {
      setAlertConfig({ isOpen: true, title: "Sync Failed", message: "Failed to sync to Google Calendar." });
    } finally {
      setIsSyncing(false);
    }
  };

  const getDayInfo = (dayInt: number) => {
    const d = new Date(viewYear, viewMonth, dayInt);
    const dayIndex = d.getDay();
    const dayName = DAYS_OF_WEEK[dayIndex];
    return { d, dayIndex, dayName };
  };

  const getCoursesForDay = (dayName: string) =>
    courses.filter((c) =>
      Array.isArray(c.days) ? c.days.includes(dayName) : c.days === dayName
    );

  const getHabitsForDay = (dayIndex: number) =>
    habits.filter((h) => {
      if (h.frequency === "daily") return true;
      if (h.frequency === "weekdays" && dayIndex >= 1 && dayIndex <= 5) return true;
      if (h.frequency === "weekends" && (dayIndex === 0 || dayIndex === 6)) return true;
      if (h.frequency === "custom" && h.custom_days?.includes(dayIndex)) return true;
      return false;
    });

  /** Tasks that have a due_date falling on a specific calendar day */
  const getTasksForDay = (dayInt: number) => {
    const target = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(dayInt).padStart(2, "0")}`;
    return tasks.filter((t) => {
      if (!t.due_date) return false;
      return t.due_date.slice(0, 10) === target;
    });
  };

  const renderCells = () => {
    const cells = [];
    // empty placeholders
    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push(<div key={`empty-${i}`} className="bg-surface-container-low h-24 md:h-32 p-2 md:p-3 opacity-50 border-r border-b border-black" />);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const isActive = i === activeDate;
      const isToday = isCurrentMonth && i === todayDate;
      const { dayIndex, dayName } = getDayInfo(i);

      const dayCourses = getCoursesForDay(dayName);
      const dayHabits = getHabitsForDay(dayIndex);
      const dayTasks = getTasksForDay(i);

      cells.push(
        <div
          key={`day-${i}`}
          onClick={() => setActiveDate(i)}
          className={`h-24 md:h-32 p-2 md:p-3 transition-colors relative cursor-pointer border-r border-b border-black ${
            isActive ? "active-day-ink group bg-black" : "bg-white hover:bg-indigo-50 group"
          }`}
        >
          <span className={`font-headline-md font-bold comic-text text-sm md:text-base ${
            isActive ? "text-white" : isToday ? "text-primary" : "text-on-surface"
          }`}>
            {i}
            {isToday && !isActive && (
              <span className="ml-1 text-[8px] font-black uppercase text-primary align-middle">TODAY</span>
            )}
          </span>
          <div className="flex flex-col gap-0.5 mt-1 overflow-hidden h-[calc(100%-26px)] pb-1 relative z-10">
            {/* Courses (indigo) */}
            {dayCourses.map((c) => (
              <div key={c.id} className={`px-1 py-0.5 text-[9px] font-bold rounded truncate ink-border-2 shrink-0 ${isActive ? "bg-white text-black" : "bg-indigo-deep text-white"}`}>
                {c.code}
              </div>
            ))}
            {/* Habits (gold) */}
            {dayHabits.map((h) => (
              <div key={h.id} className={`px-1 py-0.5 text-[9px] font-bold rounded truncate ink-border-2 shrink-0 ${isActive ? "bg-white text-black" : "bg-xp-gold text-black"}`}>
                {h.name}
              </div>
            ))}
            {/* Tasks with due dates (green) */}
            {dayTasks.map((t) => (
              <div key={t.id} className={`px-1 py-0.5 text-[9px] font-bold rounded truncate ink-border-2 shrink-0 ${isActive ? "bg-white text-black" : "bg-tertiary-container text-on-tertiary-container"}`}>
                {t.title}
              </div>
            ))}
          </div>
          {isActive && <div className="absolute inset-0 ink-border-2 pointer-events-none" />}
        </div>
      );
    }

    // trailing empty cells
    const totalCells = firstDayOfMonth + daysInMonth;
    const remaining = Math.ceil(totalCells / 7) * 7 - totalCells;
    for (let i = 0; i < remaining; i++) {
      cells.push(<div key={`empty-end-${i}`} className="bg-surface-container-low h-24 md:h-32 p-2 md:p-3 opacity-50 border-r border-b border-black" />);
    }
    return cells;
  };

  const activeDayInfo = getDayInfo(activeDate);
  const activeCourses = getCoursesForDay(activeDayInfo.dayName);
  const activeHabits = getHabitsForDay(activeDayInfo.dayIndex);
  const activeTasks = getTasksForDay(activeDate);

  return (
    <div className="flex h-[calc(100vh-80px)] w-full overflow-hidden bg-[#FAFAF8] relative z-0">
      <style dangerouslySetInnerHTML={{__html: `
        .calendar-bg {
          background-image: radial-gradient(#E5E5E2 1px, transparent 1px);
          background-size: 20px 20px;
        }
      `}} />
      <div className="absolute inset-0 calendar-bg pointer-events-none z-[-1]" />

      {isLoading ? (
        <div className="absolute inset-0 z-50 bg-[#FAFAF8]">
          <CalendarSkeleton />
        </div>
      ) : (
        <>
          {/* Left Side: Calendar Grid */}
          <section className="flex-1 p-4 md:p-gutter overflow-y-auto halftone-pattern min-w-0">
            <div className="max-w-max-width-content mx-auto">
              {/* Calendar Header */}
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
                <div className="flex items-center gap-4">
                  <h1 className="font-headline-lg text-3xl md:text-headline-lg comic-text">{monthTitle}</h1>
                  <div className="flex gap-1">
                    <button
                      onClick={prevMonth}
                      className="ink-border-2 p-1 bg-white hover:bg-surface-container-low transition-colors"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={nextMonth}
                      className="ink-border-2 p-1 bg-white hover:bg-surface-container-low transition-colors"
                    >
                      <ChevronRight size={20} />
                    </button>
                    {isGoogleConnected && (
                      <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        title="Sync to Google Calendar"
                        className="ink-border-2 p-1 ml-2 bg-primary text-white hover:opacity-90 disabled:opacity-50"
                      >
                        <RefreshCw size={20} className={isSyncing ? "animate-spin" : ""} />
                      </button>
                    )}
                  </div>
                </div>
                {/* Legend */}
                <div className="flex gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-indigo-deep ink-border-2" />
                    <span className="text-xs font-bold comic-text">SCHOOL</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-xp-gold ink-border-2" />
                    <span className="text-xs font-bold comic-text">HABITS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-tertiary-container ink-border-2" />
                    <span className="text-xs font-bold comic-text">QUESTS</span>
                  </div>
                </div>
              </div>

              {/* Grid */}
              <div className="ink-border-2 bg-black">
                {/* Days Header */}
                <div className="grid grid-cols-7 gap-0 border-b-2 border-black">
                  {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => (
                    <div key={day} className="bg-surface-muted p-1 md:p-2 text-center comic-text font-bold text-[10px] md:text-xs border-r border-black last:border-r-0">
                      {day}
                    </div>
                  ))}
                </div>
                {/* Grid Cells */}
                <div className="grid grid-cols-7 gap-0 bg-white">
                  {renderCells()}
                </div>
              </div>
            </div>
          </section>

          {/* Right Side: Agenda Panel */}
          <aside className="hidden xl:flex w-80 border-l-2 border-black bg-surface-container-low flex-col p-6 agenda-scroll overflow-y-auto shrink-0">
            <div className="mb-8">
              <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest mb-1">
                {isCurrentMonth && activeDate === todayDate ? "Today's Focus" : "Selected Day"}
              </p>
              <h2 className="font-headline-md font-extrabold comic-text">
                {new Date(viewYear, viewMonth, 1).toLocaleString("default", { month: "long" }).toUpperCase()} {activeDate}
              </h2>
            </div>

            <div className="space-y-6 flex-1">
              {/* School */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-indigo-deep">school</span>
                  <h3 className="font-bold comic-text text-sm">SCHOOL QUESTS</h3>
                </div>
                <div className="space-y-3">
                  {activeCourses.length === 0 ? (
                    <div className="text-center p-4 text-xs font-bold text-on-surface-variant opacity-60">No classes today.</div>
                  ) : (
                    activeCourses.map((course) => (
                      <div key={course.id} className="bg-white p-3 ink-border-2 rounded comic-shadow-sm flex flex-col gap-1">
                        <span className="font-bold text-sm comic-text">{course.code}</span>
                        <span className="text-xs text-on-surface-variant font-bold">{course.start_time} – {course.end_time}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Habits */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-xp-gold">fitness_center</span>
                  <h3 className="font-bold comic-text text-sm">DAILY RECURRING</h3>
                </div>
                <div className="space-y-3">
                  {activeHabits.length === 0 ? (
                    <div className="text-center p-4 text-xs font-bold text-on-surface-variant opacity-60">No habits scheduled.</div>
                  ) : (
                    activeHabits.map((habit) => (
                      <div key={habit.id} className="bg-white p-3 ink-border-2 rounded comic-shadow-sm flex items-center justify-between">
                        <span className="font-bold text-sm comic-text">{habit.name}</span>
                        <span className="text-xs text-on-surface-variant font-bold">{habit.frequency}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Quests due this day */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-tertiary-container">task_alt</span>
                  <h3 className="font-bold comic-text text-sm">QUESTS DUE</h3>
                </div>
                <div className="space-y-3">
                  {activeTasks.length === 0 ? (
                    <div className="text-center p-4 text-xs font-bold text-on-surface-variant opacity-60">No quests due.</div>
                  ) : (
                    activeTasks.map((task) => (
                      <div key={task.id} className="bg-white p-3 ink-border-2 rounded comic-shadow-sm flex flex-col gap-1">
                        <span className="font-bold text-sm comic-text line-clamp-1">{task.title}</span>
                        <span className={`text-[10px] font-bold uppercase ${task.status === "completed" ? "text-secondary" : "text-error"}`}>
                          {task.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Haia tip box */}
              <div className="bg-black text-white p-4 ink-border-2 shadow-[4px_4px_0px_0px_#feae2c]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-xp-gold" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                  <p className="text-[10px] font-bold tracking-widest uppercase">HAIA SAYS:</p>
                </div>
                <p className="font-body-md text-sm italic">&quot;Every day is a new quest — pick your battles wisely.&quot;</p>
              </div>
            </div>

            {/* NEW QUEST button — wired */}
            <div className="mt-auto pt-8">
              <button
                onClick={() => setIsQuestModalOpen(true)}
                className="w-full border-2 border-black border-dashed p-4 font-bold comic-text text-sm hover:bg-white transition-colors flex items-center justify-center gap-2"
              >
                <PlusCircle size={20} />
                NEW QUEST
              </button>
            </div>
          </aside>

          <AlertModal
            isOpen={alertConfig.isOpen}
            title={alertConfig.title}
            message={alertConfig.message}
            onClose={() => setAlertConfig((prev) => ({ ...prev, isOpen: false }))}
          />
        </>
      )}

      <CreateQuestModal
        isOpen={isQuestModalOpen}
        initialData={null}
        onClose={() => setIsQuestModalOpen(false)}
        onSuccess={() => setIsQuestModalOpen(false)}
      />
    </div>
  );
}
