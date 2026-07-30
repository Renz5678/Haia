"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#f4f4f5] text-on-surface text-center p-8">
          <div className="bg-white p-12 rounded-2xl comic-border comic-shadow-lg max-w-2xl w-full">
            <h2 className="font-display-hero text-6xl anton-text mb-6 text-primary">FATAL ERROR!</h2>
            <p className="font-body-lg text-lg text-on-surface-variant mb-8 italic">
              A catastrophic failure occurred. We're on it!
            </p>
            <div className="flex justify-center">
              <button
                onClick={() => reset()}
                className="bg-primary text-white font-label-caps uppercase px-8 py-4 comic-border comic-shadow hover:-translate-y-1 transition-transform"
              >
                Reload Application
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
