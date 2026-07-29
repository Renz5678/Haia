import React from "react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      {/* Halftone Texture Overlay */}
      <div className="halftone-bg fixed inset-0 pointer-events-none z-0"></div>
      
      <div className="relative z-10 w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
