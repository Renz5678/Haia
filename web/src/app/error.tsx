"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to Sentry
    Sentry.captureException(error);
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f4f4f5] text-on-surface text-center p-8">
      <div className="bg-white p-12 rounded-2xl comic-border comic-shadow-lg max-w-2xl w-full">
        <h2 className="font-display-hero text-6xl anton-text mb-6 text-primary">CRITICAL HIT!</h2>
        <p className="font-body-lg text-lg text-on-surface-variant mb-8 italic">
          Something unexpected happened and broke your streak. Don&apos;t worry, our engineers have been notified.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="bg-primary text-white font-label-caps uppercase px-8 py-4 comic-border comic-shadow hover:-translate-y-1 transition-transform"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="bg-surface-container-high text-on-surface font-label-caps uppercase px-8 py-4 comic-border hover:-translate-y-1 transition-transform"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
