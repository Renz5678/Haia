import React from 'react';

interface AlertModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

export function AlertModal({ isOpen, title, message, onClose }: AlertModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white border-4 border-on-surface p-6 sm:p-8 w-full max-w-md pop-shadow transform transition-all animate-fade-in-up">
        <h3 className="font-headline-md font-bold mb-4 anton-text text-2xl uppercase tracking-wide">
          {title}
        </h3>
        <p className="font-body-md text-on-surface-variant mb-8 text-lg">
          {message}
        </p>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-primary text-white font-bold border-2 border-on-surface shadow-[4px_4px_0px_0px_#1a1c1b] active:translate-x-1 active:translate-y-1 active:shadow-[0px_0px_0px_0px_#1a1c1b] transition-all uppercase tracking-wider"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
}
