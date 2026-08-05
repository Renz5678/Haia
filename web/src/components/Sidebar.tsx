"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, CheckSquare, RefreshCw, Target, Calendar, CalendarDays, MessageSquare, Settings, LogOut, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";

export default function Sidebar({
  isOpen = false,
  onClose,
}: {
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isExiting, setIsExiting] = React.useState(false);

  const handleSignOut = async () => {
    setIsExiting(true);
    document.body.classList.add('animate-fade-out-down');
    const supabase = createClient();
    await supabase.auth.signOut();
    setTimeout(() => {
      router.push("/login");
      router.refresh();
      setTimeout(() => {
        document.body.classList.remove('animate-fade-out-down');
      }, 100);
    }, 300);
  };

  const links = [
    { name: "Home", href: "/dashboard", icon: LayoutDashboard },
    { name: "Quests", href: "/quests", icon: CheckSquare },
    { name: "Habits", href: "/habits", icon: RefreshCw },
    { name: "Goals", href: "/goals", icon: Target },
    { name: "Schedule", href: "/schedule", icon: Calendar },
    { name: "Calendar", href: "/calendar", icon: CalendarDays },
    { name: "Haia", href: "/chat", icon: MessageSquare },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        flex flex-col w-64 border-r-2 border-on-surface bg-surface h-screen
        overflow-y-auto p-4 space-y-6 shrink-0 transition-transform duration-300
        ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
      `}>
        <div className="flex flex-col gap-2 px-2">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-3" onClick={onClose}>
              <div className="w-10 h-10 bg-primary border-2 border-on-surface rounded-lg flex items-center justify-center shrink-0 shadow-[4px_4px_0px_0px_rgba(20,27,43,1)]">
                <Image src="/images/logo.png" alt="Logo" className="w-7 h-7 object-contain" width={28} height={28} />
              </div>
              <span className="font-display-hero text-3xl anton-text tracking-widest text-on-surface uppercase drop-shadow-[2px_2px_0px_#4F46E5] ml-2 leading-none">HAIA</span>
            </Link>
            {/* Mobile close button */}
            <button
              onClick={onClose}
              className="md:hidden w-8 h-8 flex items-center justify-center rounded hover:bg-surface-container transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <div className="mt-4 flex items-center gap-3 p-2 bg-surface-container rounded-xl border-2 border-on-surface">
            <div className="w-10 h-10 rounded-full border-2 border-on-surface overflow-hidden bg-white shrink-0">
              <div className="w-full h-full bg-primary-fixed-dim" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-label-md font-bold truncate uppercase" title={user?.display_name || "Hero"}>
                {user?.display_name || "Hero"}
              </p>
              <div className="flex justify-between items-center mt-0.5">
                <p className="text-[10px] text-on-surface-variant uppercase tracking-wider truncate">Novice</p>
                <p className="text-[10px] font-bold text-primary uppercase">LVL {user?.current_level || 1}</p>
              </div>
            </div>
          </div>
        </div>
      
        <nav className="flex-1 space-y-2">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={onClose}
                className={`flex items-center gap-4 px-4 py-3 transition-all rounded-lg ${
                  isActive
                    ? "bg-primary text-on-primary border-2 border-on-surface shadow-[4px_4px_0px_0px_rgba(20,27,43,1)] active:scale-[0.98]"
                    : "text-on-surface-variant hover:bg-surface-container-high border-2 border-transparent hover:border-transparent"
                }`}
              >
                <link.icon className="shrink-0" size={24} />
                <span className="font-label-md font-bold">{link.name}</span>
              </Link>
            );
          })}
        </nav>
      
        <div className="mt-auto pt-4 border-t-2 border-on-surface/10 space-y-2">
          <Link
            href="/settings"
            onClick={onClose}
            className={`flex items-center gap-4 px-4 py-2 transition-all rounded-lg ${
              pathname === "/settings"
                ? "bg-primary text-on-primary border-2 border-on-surface shadow-[4px_4px_0px_0px_rgba(20,27,43,1)] active:scale-[0.98]"
                : "text-on-surface-variant hover:bg-surface-container-high border-2 border-transparent hover:border-transparent"
            }`}
          >
            <Settings className="shrink-0" size={20} />
            <span className="font-label-md font-bold">Settings</span>
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-4 px-4 py-2 transition-all rounded-lg text-error hover:bg-error-container border-2 border-transparent hover:border-transparent text-left"
          >
            <LogOut className="shrink-0" size={20} />
            <span className="font-label-md font-bold">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
