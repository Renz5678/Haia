import React from "react";

export function Skeleton({ className = "" }: { className?: string }) {
  // A subtle comic shimmer using a linear gradient that pans across
  return (
    <div
      className={`animate-comic-shimmer bg-[length:400%_100%] bg-[linear-gradient(110deg,#e8e8e6_8%,#f4f4f2_18%,#e8e8e6_33%)] rounded-lg ${className}`}
    />
  );
}

export function TaskCardSkeleton() {
  return (
    <div className="bg-white p-5 rounded-lg border-2 border-surface-variant flex flex-col justify-between h-[180px]">
      <div>
        <div className="flex justify-between items-start mb-3">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
        </div>
        <Skeleton className="h-6 w-3/4 mb-4" />
      </div>
      <div className="flex justify-between items-end mt-4">
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </div>
  );
}

export function HabitCardSkeleton() {
  return (
    <div className="bg-white p-6 rounded-lg border-2 border-surface-variant flex flex-col justify-between h-[200px]">
      <div className="flex justify-between items-start mb-6">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-8 w-12 rounded-full" />
      </div>
      <Skeleton className="h-4 w-1/3 mb-6" />
      <Skeleton className="h-12 w-full rounded-lg" />
    </div>
  );
}

export function GoalCardSkeleton() {
  return (
    <div className="bg-white p-6 rounded-lg border-2 border-surface-variant flex flex-col justify-between h-[220px]">
      <div className="flex justify-between items-start mb-4">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-6 w-16" />
      </div>
      <Skeleton className="h-4 w-1/2 mb-6" />
      <div className="w-full h-4 rounded-full mb-2">
        <Skeleton className="w-full h-full rounded-full" />
      </div>
      <Skeleton className="h-3 w-1/4 self-end mb-4" />
      <Skeleton className="h-12 w-full rounded-lg" />
    </div>
  );
}
