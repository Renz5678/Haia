"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Zap } from "lucide-react";

export default function LandingPage() {
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="bg-[#050505] text-[#FAFAF8] min-h-screen overflow-hidden flex flex-col relative">
      {/* Halftone Glow Layer */}
      <div 
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: "radial-gradient(circle at center, rgba(79, 70, 229, 0.15) 0%, transparent 70%)",
          maskImage: "radial-gradient(circle, black 1px, transparent 1.5px)",
          maskSize: "12px 12px",
          WebkitMaskImage: "radial-gradient(circle, black 1px, transparent 1.5px)",
          WebkitMaskSize: "12px 12px"
        }}
      ></div>

      {/* Interactive Cursor Glow */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-300"
        style={{
          opacity: isHovering ? 0.6 : 0.4,
          background: `radial-gradient(circle 250px at ${mousePos.x}px ${mousePos.y}px, rgba(79, 70, 229, 0.15), transparent 80%)`
        }}
      ></div>

      {/* Header Wordmark */}
      <header className="relative z-20 px-4 md:px-margin-desktop py-8 flex justify-center items-center">
        <div className="w-32 md:w-40 opacity-90" style={{ filter: "invert(1) brightness(2)" }}>
          <img src="/images/name.png" alt="HAIA Wordmark" className="w-full h-auto" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10 flex flex-col items-center justify-center px-4 md:px-margin-desktop">
        <div className="mb-12 relative">
          <div className="relative z-10 animate-[float_6s_ease-in-out_infinite]">
            <div className="w-32 h-32 md:w-48 md:h-48 flex items-center justify-center rounded-full bg-indigo-deep/10 border border-indigo-deep/20 backdrop-blur-sm p-4">
              <img src="/images/logo.png" alt="HAIA Logo" className="w-full h-full object-contain" />
            </div>
          </div>
          <div className="absolute inset-0 scale-125 border border-indigo-deep/10 rounded-full animate-pulse"></div>
        </div>

        <div className="text-center max-w-2xl">
          <h1 className="font-display-hero text-5xl md:text-7xl font-extrabold leading-tight mb-8 anton-text">
            Turn your to-do list.<br />
            <span className="text-indigo-deep">Into a game.</span>
          </h1>
          <p className="font-body-lg text-lg md:text-xl text-on-surface-variant max-w-md mx-auto mb-12">
            Level up your life with an AI coach that turns boring tasks into epic quests.
          </p>
          
          <div className="flex flex-col items-center gap-6">
            <Link 
              href="/signup"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              className="bg-indigo-deep text-white font-headline-md text-xl md:text-2xl px-12 py-5 rounded-lg active:translate-x-1 active:translate-y-1 active:shadow-none transition-all duration-150 uppercase tracking-wider flex items-center gap-3"
              style={{ boxShadow: "6px 6px 0px 0px #000000" }}
            >
              Start Your Quest
              <Zap size={24} fill="currentColor" />
            </Link>
            <Link href="/login" className="font-label-caps text-xs text-outline uppercase tracking-widest hover:text-white transition-colors">
              Already a hero? Sign in
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-20 w-full pb-12 flex flex-col items-center gap-4">
        <div className="flex gap-3">
          <div className="w-6 h-2.5 rounded-full bg-indigo-deep border-2 border-indigo-deep transition-all"></div>
          <div className="w-2.5 h-2.5 rounded-full border-2 border-[#E5E5E2] transition-all"></div>
          <div className="w-2.5 h-2.5 rounded-full border-2 border-[#E5E5E2] transition-all"></div>
        </div>
        
        <div className="mt-4 flex gap-6 opacity-30 text-white">
          <span className="font-label-caps text-[10px] uppercase tracking-[0.2em]">Terms</span>
          <span className="font-label-caps text-[10px] uppercase tracking-[0.2em]">Privacy</span>
          <span className="font-label-caps text-[10px] uppercase tracking-[0.2em]">v1.0.4</span>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
      `}} />
    </div>
  );
}
