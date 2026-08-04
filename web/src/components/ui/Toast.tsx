"use client";

/**
 * Lightweight in-tone toast notification for Haia.
 * Shows at the top-centre of the screen, stacks naturally.
 * Usage:
 *   const { toasts, showToast } = useToast();
 *   showToast("success", "Quest completed!");
 *   <ToastContainer toasts={toasts} />
 */

import React, { useState, useCallback, useEffect } from "react";
import { CheckCircle2, XCircle, AlertTriangle, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string, durationMs = 4000) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, durationMs);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, showToast, dismiss };
}

// ─── Individual Toast ─────────────────────────────────────────────────────────

const icons: Record<ToastType, React.ReactNode> = {
  success:  <CheckCircle2 size={20} className="text-secondary shrink-0" />,
  error:    <XCircle      size={20} className="text-red-500 shrink-0" />,
  warning:  <AlertTriangle size={20} className="text-yellow-500 shrink-0" />,
};

const borderColors: Record<ToastType, string> = {
  success: "border-secondary",
  error:   "border-red-500",
  warning: "border-yellow-500",
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Tiny delay so the enter animation triggers
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`
        flex items-start gap-3 bg-white comic-border rounded-lg px-4 py-3
        comic-shadow-sm max-w-sm w-full
        border-l-4 ${borderColors[toast.type]}
        transition-all duration-300
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}
      `}
    >
      {icons[toast.type]}
      <p className="flex-1 font-body-md text-sm font-bold text-on-surface leading-snug">
        {toast.message}
      </p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 text-on-surface-variant hover:text-on-surface transition-colors mt-0.5"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
}

// ─── Container ────────────────────────────────────────────────────────────────

export function ToastContainer({
  toasts,
  dismiss,
}: {
  toasts: Toast[];
  dismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 items-center pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onDismiss={dismiss} />
        </div>
      ))}
    </div>
  );
}
