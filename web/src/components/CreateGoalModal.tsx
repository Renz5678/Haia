import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { createApiClient } from '@/lib/api';

interface CreateGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateGoalModal({ isOpen, onClose, onSuccess }: CreateGoalModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      setError("Title is required");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");
      
      const api = createApiClient(session.access_token);
      await api.goals.create({
        title,
        description,
        target_date: targetDate || undefined,
        area: 'productivity'
      });
      
      onSuccess();
      onClose();
      setTitle('');
      setDescription('');
      setTargetDate('');
    } catch (err) {
      console.error(err);
      setError("Failed to create goal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-surface w-full max-w-md comic-border rounded-xl shadow-[8px_8px_0px_0px_rgba(26,28,27,1)] overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="bg-primary p-4 border-b-4 border-on-surface flex justify-between items-center">
          <h2 className="font-headline-md text-2xl anton-text text-white tracking-wide italic">NEW SPRINT</h2>
          <button onClick={onClose} className="text-white hover:text-xp-gold transition-colors font-black text-xl leading-none">
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {error && <div className="mb-4 bg-error text-white p-3 font-bold rounded">{error}</div>}
          
          <form id="create-goal-form" onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block font-label-caps text-label-caps uppercase tracking-widest text-on-surface mb-2 font-black italic">
                Sprint Objective
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Master Next.js App Router"
                className="w-full bg-surface-container border-2 border-on-surface p-3 font-body-md focus:outline-none focus:ring-0 focus:border-primary shadow-[2px_2px_0px_0px_rgba(26,28,27,1)]"
                autoFocus
              />
            </div>

            <div>
              <label className="block font-label-caps text-label-caps uppercase tracking-widest text-on-surface mb-2 font-black italic">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What exactly will you achieve?"
                className="w-full bg-surface-container border-2 border-on-surface p-3 font-body-md focus:outline-none focus:ring-0 focus:border-primary shadow-[2px_2px_0px_0px_rgba(26,28,27,1)] h-24 resize-none"
              />
            </div>

            <div>
              <label className="block font-label-caps text-label-caps uppercase tracking-widest text-on-surface mb-2 font-black italic">
                Deadline (Optional)
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
                className="w-full bg-surface-container border-2 border-on-surface p-3 font-body-md focus:outline-none focus:ring-0 focus:border-primary shadow-[2px_2px_0px_0px_rgba(26,28,27,1)]"
              />
            </div>
          </form>
        </div>

        <div className="p-4 bg-surface-container-low border-t-2 border-on-surface flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 font-label-caps font-black italic uppercase tracking-wider text-on-surface hover:bg-surface-container transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-goal-form"
            disabled={loading}
            className="px-6 py-2 font-label-caps font-black italic uppercase tracking-wider bg-primary text-white comic-border comic-shadow-sm hover:translate-x-1 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(26,28,27,1)] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all disabled:opacity-50"
          >
            {loading ? "Creating..." : "Launch Sprint"}
          </button>
        </div>

      </div>
    </div>
  );
}
