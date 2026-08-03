"use client";

import React, { useState, useEffect } from "react";
import { Check, Filter, Search, Target } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createApiClient } from "@/lib/api";
import { TaskCardSkeleton } from "@/components/ui/Skeleton";
import { CreateQuestModal } from "@/components/CreateQuestModal";

export default function QuestsPage() {
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [quests, setQuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editQuest, setEditQuest] = useState<any>(null);
  const supabase = createClient();

  async function fetchData() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const api = createApiClient(session.access_token);
      const fetchedTasks = await api.tasks.list();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setQuests(fetchedTasks as any[]);
    } catch (err) {
      console.error("Failed to fetch quests:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, []);

  const toggleQuest = async (id: number | string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const api = createApiClient(session.access_token);
      await api.tasks.complete(id.toString());
      setQuests(quests.filter(q => q.id !== id));
    } catch (err) {
      console.error("Failed to complete quest:", err);
    }
  };

  const filteredQuests = quests.filter(q => {
    if (filter !== "ALL" && (q.task_type || "").toUpperCase() !== filter) return false;
    if (search && !q.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-[1100px] mx-auto px-4 md:px-margin-desktop py-12 space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-4 border-on-surface pb-6">
        <div>
          <p className="font-label-caps text-label-caps uppercase tracking-[0.3em] text-on-surface-variant mb-2 font-black italic">
            ACTIVE MISSIONS
          </p>
          <h1 className="font-display-hero text-5xl md:text-6xl anton-text leading-none text-on-surface drop-shadow-[4px_4px_0px_#4F46E5]">
            QUEST LOG
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
            <input 
              type="text" 
              placeholder="Search quests..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-container-low border-2 border-on-surface rounded-full pl-10 pr-4 py-2 font-body-md focus:outline-none focus:ring-2 focus:ring-primary comic-shadow-sm transition-all"
            />
          </div>
          <div className="flex bg-surface-container-high p-1 rounded-lg comic-border shrink-0 w-full sm:w-auto">
            {["ALL", "SCHOOL", "PERSONAL"].map((f) => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 sm:flex-none px-4 py-2 rounded font-label-caps text-label-caps font-black italic uppercase transition-colors ${filter === f ? "bg-primary text-white" : "text-on-surface-variant hover:text-on-surface"}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quest List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <>
            <TaskCardSkeleton />
            <TaskCardSkeleton />
            <TaskCardSkeleton />
            <TaskCardSkeleton />
            <TaskCardSkeleton />
            <TaskCardSkeleton />
          </>
        ) : filteredQuests.length === 0 ? (
          <div className="col-span-full py-12 text-center text-on-surface-variant font-body-lg italic animate-fade-in-up">
            No quests found. You&apos;re all caught up!
          </div>
        ) : (
          filteredQuests.map((quest, index) => (
            <div 
              key={quest.id}
              className={`group bg-white p-6 rounded-lg comic-border flex flex-col justify-between transition-all animate-fade-in-up opacity-0 ${
                quest.checked 
                  ? 'opacity-60 translate-x-[4px] translate-y-[4px] shadow-none' 
                  : 'comic-shadow-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none'
              } cursor-pointer`}
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => {
                setEditQuest(quest);
                setIsModalOpen(true);
              }}
            >
              <div className="flex items-start gap-4 mb-4">
                <input 
                  type="checkbox" 
                  checked={!!quest.checked}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleQuest(quest.id);
                  }}
                  className="w-7 h-7 mt-1 rounded comic-border text-primary focus:ring-primary transition-all custom-checkbox cursor-pointer shrink-0" 
                />
                <div>
                  <h3 className={`font-body-lg text-lg font-black transition-colors ${quest.checked ? 'text-on-surface-variant line-through' : 'text-on-surface group-hover:text-primary'}`}>
                    {quest.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${(quest.task_type || "").toUpperCase() === 'SCHOOL' ? 'bg-secondary-fixed text-on-secondary-container' : 'bg-primary-container text-white'}`}>
                      {quest.task_type || "TASK"}
                    </span>
                    <span className="text-on-surface-variant font-black italic text-xs uppercase flex items-center gap-1">
                      {quest.due_date ? new Date(quest.due_date).toLocaleDateString() : "NO DUE DATE"}
                    </span>
                    {quest.goal_ids && quest.goal_ids.length > 0 && (
                      <span className="bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded font-black italic text-[10px] comic-border flex items-center gap-1">
                        <Target size={10} /> {quest.goal_ids.length} GOAL{quest.goal_ids.length > 1 ? 'S' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-end border-t-2 border-surface-container pt-4 mt-auto">
                <div className="bg-surface-container-high text-on-surface px-4 py-1.5 comic-border rounded-full font-label-xp text-label-xp items-center gap-1 font-black italic flex">
                  <span>+{quest.xp || 50}</span> <span className="text-[10px] opacity-70">XP</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating Action Button */}
      <button 
        onClick={() => {
          setEditQuest(null);
          setIsModalOpen(true);
        }}
        className="fixed bottom-6 right-6 md:bottom-10 md:right-10 w-16 h-16 md:w-20 md:h-20 bg-primary-container text-white rounded-lg comic-border comic-shadow hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[10px_10px_0px_0px_#1a1c1b] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all flex items-center justify-center z-50 group"
      >
        <span className="material-symbols-outlined text-3xl font-black">add</span>
        <span className="absolute right-20 md:right-24 bg-on-surface text-white px-5 py-2 comic-border text-sm font-black italic opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none uppercase">NEW QUEST</span>
      </button>

      <CreateQuestModal 
        isOpen={isModalOpen} 
        initialData={editQuest}
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchData} 
      />
    </div>
  );
}
