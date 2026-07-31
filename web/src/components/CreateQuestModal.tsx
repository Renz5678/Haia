"use client";

import React, { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createApiClient } from "@/lib/api";

interface Goal {
  id: string;
  title: string;
}

interface CreateQuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateQuestModal({ isOpen, onClose, onSuccess }: CreateQuestModalProps) {
  const [title, setTitle] = useState("");
  const [taskType, setTaskType] = useState("task");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [availableGoals, setAvailableGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset form
      setTitle("");
      setTaskType("task");
      setPriority("medium");
      setDueDate("");
      setSelectedGoals([]);
      fetchGoals();
    }
  }, [isOpen]);

  const fetchGoals = async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const api = createApiClient(session.access_token);
      const fetched = await api.goals.list({ status: "active" });
      setAvailableGoals(fetched as Goal[]);
    } catch (err) {
      console.error("Failed to fetch goals:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const api = createApiClient(session.access_token);

      await api.tasks.create({
        title,
        task_type: taskType,
        priority,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        goal_ids: selectedGoals,
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to create quest:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleGoal = (id: string) => {
    setSelectedGoals(prev => 
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in-up" onClick={onClose} />
      
      <div className="relative bg-surface p-6 md:p-8 rounded-xl comic-border comic-shadow-lg w-full max-w-md animate-fade-in-up shadow-[16px_16px_0px_0px_#1a1c1b] border-4">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-6 border-b-4 border-on-surface pb-4">
          <div>
            <h2 className="font-headline-md text-headline-md anton-text text-on-surface leading-none uppercase">New Quest</h2>
            <p className="font-black italic text-on-surface-variant text-sm mt-1">TIME FOR A NEW MISSION!</p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-error text-on-error comic-border hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[4px_4px_0px_0px_#1a1c1b] transition-all"
          >
            <X size={18} className="font-black" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block font-black italic text-label-caps uppercase text-on-surface mb-2">Quest Title</label>
            <input 
              type="text" 
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Defeat the Math Exam"
              className="w-full p-3 bg-white comic-border rounded-lg focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all font-body-lg font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Type */}
            <div>
              <label className="block font-black italic text-label-caps uppercase text-on-surface mb-2">Type</label>
              <select 
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
                className="w-full p-3 bg-white comic-border rounded-lg focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all font-bold appearance-none cursor-pointer"
              >
                <option value="task">Task</option>
                <option value="assignment">Assignment</option>
                <option value="project">Project</option>
                <option value="exam">Exam</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block font-black italic text-label-caps uppercase text-on-surface mb-2">Priority</label>
              <select 
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full p-3 bg-white comic-border rounded-lg focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all font-bold appearance-none cursor-pointer"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block font-black italic text-label-caps uppercase text-on-surface mb-2">Due Date (Optional)</label>
            <input 
              type="date" 
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full p-3 bg-white comic-border rounded-lg focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all font-bold"
            />
          </div>

          {/* Attach to Goals */}
          {availableGoals.length > 0 && (
            <div>
              <label className="block font-black italic text-label-caps uppercase text-on-surface mb-3">Attach to Sprints</label>
              <div className="flex flex-wrap gap-2">
                {availableGoals.map((goal) => {
                  const isSelected = selectedGoals.includes(goal.id);
                  return (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => toggleGoal(goal.id)}
                      className={`px-3 py-1.5 rounded-full comic-border font-black italic text-xs uppercase flex items-center gap-1 transition-all ${
                        isSelected 
                          ? 'bg-primary text-white scale-105 shadow-[2px_2px_0px_0px_#1a1c1b]' 
                          : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      {isSelected && <Check size={12} />}
                      {goal.title}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Submit */}
          <button 
            type="submit"
            disabled={loading}
            className="w-full p-4 bg-primary text-white rounded-lg comic-border font-headline-md text-headline-md anton-text uppercase tracking-wide hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[8px_8px_0px_0px_#1a1c1b] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            {loading ? 'SUMMONING...' : 'CREATE QUEST'}
          </button>
        </form>
      </div>
    </div>
  );
}
