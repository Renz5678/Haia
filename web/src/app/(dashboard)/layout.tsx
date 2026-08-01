"use client";

import React, { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopHeader from "@/components/TopHeader";
import ChatDrawer from "@/components/ChatDrawer";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="flex min-h-screen relative z-10 overflow-hidden">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        <TopHeader onOpenChat={() => setIsChatOpen(true)} />
        <main className="flex-1 min-w-0 overflow-y-auto">
          {children}
        </main>
      </div>
      
      <ChatDrawer isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}
