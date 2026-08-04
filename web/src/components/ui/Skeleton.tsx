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

export function CalendarSkeleton() {
  return (
    <div className="flex w-full h-full animate-pulse">
      <div className="flex-1 p-4 md:p-gutter flex flex-col">
        <div className="flex justify-between mb-8">
          <Skeleton className="h-10 w-48" />
          <div className="flex gap-4">
             <Skeleton className="h-6 w-20" />
             <Skeleton className="h-6 w-20" />
             <Skeleton className="h-6 w-20" />
          </div>
        </div>
        <div className="border-2 border-black bg-black flex-1 flex flex-col">
          <div className="grid grid-cols-7 gap-0 border-b-2 border-black">
            {[1, 2, 3, 4, 5, 6, 7].map(i => <div key={i} className="bg-surface-muted h-8 border-r border-black" />)}
          </div>
          <div className="grid grid-cols-7 gap-0 bg-white flex-1 min-h-[500px]">
             {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="border-r border-b border-black p-2 flex flex-col gap-2">
                  <Skeleton className="h-6 w-6 rounded" />
                  {i % 5 === 0 && <Skeleton className="h-4 w-full" />}
                  {i % 8 === 0 && <Skeleton className="h-4 w-3/4" />}
                </div>
             ))}
          </div>
        </div>
      </div>
      <div className="hidden xl:flex w-80 border-l-2 border-black bg-surface-container-low flex-col p-6 space-y-6">
         <div>
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-40" />
         </div>
         <div>
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-16 w-full rounded-lg mb-2" />
            <Skeleton className="h-16 w-full rounded-lg" />
         </div>
         <div>
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-12 w-full rounded-lg" />
         </div>
      </div>
    </div>
  );
}

