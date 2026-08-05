"use client";

import React, { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopHeader from "@/components/TopHeader";
import ChatDrawer from "@/components/ChatDrawer";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen relative z-10 overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        <TopHeader
          onOpenChat={() => setIsChatOpen(true)}
          onMenuToggle={() => setIsSidebarOpen((prev) => !prev)}
        />
        <main className="flex-1 min-w-0 overflow-y-auto">
          {children}
        </main>
      </div>

      <ChatDrawer isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}

