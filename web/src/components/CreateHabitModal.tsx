"use client";

import React, { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createApiClient } from "@/lib/api";

interface Goal {
  id: string;
  title: string;
}

interface CreateHabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateHabitModal({ isOpen, onClose, onSuccess }: CreateHabitModalProps) {
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [targetCount, setTargetCount] = useState(1);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [availableGoals, setAvailableGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const api = createApiClient(session.access_token);
        const fetched = await api.goals.list("active");
        setAvailableGoals(fetched as Goal[]);
      } catch (err) {
        console.error("Failed to fetch goals:", err);
      }
    };

    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName("");
      setFrequency("daily");
      setTargetCount(1);
      setSelectedGoals([]);
      fetchGoals();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const api = createApiClient(session.access_token);

      await api.habits.create({
        name,
        frequency,
        target_count: frequency === "flexible" ? targetCount : undefined,
        goal_ids: selectedGoals,
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to create habit:", err);
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
            <h2 className="font-headline-md text-headline-md anton-text text-on-surface leading-none uppercase">New Habit</h2>
            <p className="font-black italic text-on-surface-variant text-sm mt-1">BUILD THAT STREAK!</p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-error text-on-error comic-border hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[4px_4px_0px_0px_#1a1c1b] transition-all"
          >
            <X size={18} className="font-black" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label className="block font-black italic text-label-caps uppercase text-on-surface mb-2">Habit Name</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Morning Run"
              className="w-full p-3 bg-white comic-border rounded-lg focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all font-body-lg font-bold"
            />
          </div>

          {/* Frequency */}
          <div>
            <label className="block font-black italic text-label-caps uppercase text-on-surface mb-2">Frequency</label>
            <select 
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full p-3 bg-white comic-border rounded-lg focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all font-bold appearance-none cursor-pointer"
            >
              <option value="daily">Daily</option>
              <option value="weekdays">Weekdays</option>
              <option value="weekends">Weekends</option>
              <option value="flexible">Flexible</option>
            </select>
          </div>

          {frequency === "flexible" && (
            <div>
              <label className="block font-black italic text-label-caps uppercase text-on-surface mb-2">Times per week</label>
              <input 
                type="number" 
                min="1"
                max="7"
                required
                value={targetCount}
                onChange={(e) => setTargetCount(parseInt(e.target.value) || 1)}
                className="w-full p-3 bg-white comic-border rounded-lg focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all font-body-lg font-bold"
              />
            </div>
          )}

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
            {loading ? 'SUMMONING...' : 'CREATE HABIT'}
          </button>
        </form>
      </div>
    </div>
  );
}
