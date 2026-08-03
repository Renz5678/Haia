"use client";

import React, { useState, useEffect } from "react";
import { User, Bell, Star, Palette, MessageCircle, Calendar } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { createClient } from "@/lib/supabase/client";

import { createApiClient } from "@/lib/api";

export default function SettingsPage() {
  const [deepWork, setDeepWork] = useState(true);
  const [questReminders, setQuestReminders] = useState(false);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isTelegramConnected, setIsTelegramConnected] = useState(false);
  
  const { user } = useAuthStore();
  const supabase = createClient();

  const handleConnectTelegram = async () => {
    setIsLinking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");
      
      const api = createApiClient(session.access_token);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await api.integrations.telegram.linkCode();
      setLinkCode(res.link_code);
    } catch (err) {
      console.error("Failed to generate link code", err);
      alert("Failed to generate linking code. Make sure you are logged in.");
    } finally {
      setIsLinking(false);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");
      
      const api = createApiClient(session.access_token);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await api.integrations.google.connect();
      if (res.auth_url) {
        window.open(res.auth_url, "Connect Google", "width=600,height=600");
      }
    } catch (err) {
      console.error("Failed to connect Google", err);
      alert("Failed to initiate Google connection.");
    }
  };

  useEffect(() => {
    async function fetchIntegrations() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        const api = createApiClient(session.access_token);
        const res = await api.integrations.list();
        if (res.integrations.includes("google_calendar")) {
          setIsGoogleConnected(true);
        }
        if (res.integrations.includes("telegram")) {
          setIsTelegramConnected(true);
        }
      } catch (err) {
        console.error("Failed to fetch integrations", err);
      }
    }
    fetchIntegrations();
  }, [supabase.auth]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'google_connected') {
        setIsGoogleConnected(true);
        alert("Google Calendar connected successfully!");
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto h-[calc(100vh-80px)] bg-[#f9f9f7] relative">
      <style dangerouslySetInnerHTML={{__html: `
        .halftone-bg-settings {
          background-color: #f9f9f7;
          background-image: radial-gradient(#d1d1d1 1px, transparent 0);
          background-size: 40px 40px;
        }
      `}} />
      <div className="absolute inset-0 halftone-bg-settings pointer-events-none z-[-1]"></div>
      
      {/* Settings Canvas */}
      <div className="max-w-max-width-content mx-auto py-12 px-4 md:px-margin-desktop">
        <h1 className="font-display-hero text-5xl md:text-display-hero mb-12 anton-text">Settings</h1>
        
        <div className="space-y-16">
          
          {/* Account Section */}
          <section>
            <div className="flex items-center gap-4 mb-6">
              <User className="text-primary" size={32} />
              <h2 className="font-headline-md text-headline-md uppercase tracking-tight anton-text">Account Identity</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-6 bg-white border border-on-surface pop-shadow rounded-xl">
                <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">Display Name</label>
                <input 
                  className="w-full bg-surface-bright border border-on-surface p-3 font-body-lg focus:ring-0 focus:border-indigo-deep outline-none" 
                  type="text" 
                  defaultValue={user?.email ? "Haia Ace" : ""}
                />
              </div>
              <div className="p-6 bg-white border border-on-surface pop-shadow rounded-xl">
                <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">Email Address</label>
                <input 
                  className="w-full bg-surface-bright border border-on-surface p-3 font-body-lg focus:ring-0 focus:border-indigo-deep outline-none" 
                  type="email" 
                  defaultValue={user?.email || ""}
                />
              </div>
            </div>
          </section>

          {/* Integrations Section (Telegram) */}
          <section>
            <div className="flex items-center gap-4 mb-6">
              <MessageCircle className="text-primary" size={32} />
              <h2 className="font-headline-md text-headline-md uppercase tracking-tight anton-text">Integrations</h2>
            </div>
            <div className="bg-white border border-on-surface pop-shadow rounded-xl">
              <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-body-lg font-bold">Telegram Bot (HAIA)</h3>
                  <p className="text-on-surface-variant text-body-md">Connect your account to interact with Haia from Telegram.</p>
                </div>
                <button 
                  onClick={handleConnectTelegram}
                  disabled={isLinking || !!linkCode || isTelegramConnected}
                  className={`bg-[#2AABEE] text-white px-6 py-3 rounded-lg font-bold border-2 border-on-surface shadow-[4px_4px_0px_0px_#1a1c1b] active:translate-x-1 active:translate-y-1 active:shadow-[0px_0px_0px_0px_#1a1c1b] transition-all flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-70 disabled:cursor-not-allowed ${isTelegramConnected ? "!bg-emerald-500 !text-white" : ""}`}
                >
                  <MessageCircle size={20} />
                  {isTelegramConnected ? "Connected" : (isLinking ? "Generating..." : (linkCode ? "Code Generated" : "Connect Telegram"))}
                </button>
              </div>
              {linkCode && (
                <div className="p-6 bg-surface-container-low border-t border-on-surface flex flex-col items-center justify-center">
                  <p className="font-label-caps text-on-surface-variant mb-2">SEND THIS CODE TO @YOUR_BOT_USERNAME</p>
                  <div className="font-display-hero text-4xl tracking-widest text-primary anton-text">{linkCode}</div>
                  <p className="text-sm text-on-surface-variant mt-2 italic">Expires in 15 minutes</p>
                </div>
              )}
            </div>

            <div className="bg-white border border-on-surface pop-shadow rounded-xl mt-6">
              <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-body-lg font-bold">Google Calendar & Mail</h3>
                  <p className="text-on-surface-variant text-body-md">Connect your Google account to sync events and enable email parsing.</p>
                </div>
                <button 
                  onClick={handleConnectGoogle}
                  disabled={isGoogleConnected}
                  className={`bg-primary text-white px-6 py-3 rounded-lg font-bold border-2 border-on-surface shadow-[4px_4px_0px_0px_#1a1c1b] active:translate-x-1 active:translate-y-1 active:shadow-[0px_0px_0px_0px_#1a1c1b] transition-all flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-70 disabled:cursor-not-allowed ${isGoogleConnected ? "!bg-emerald-500 !text-white" : ""}`}
                >
                  <Calendar size={20} />
                  {isGoogleConnected ? "Connected" : "Connect Google"}
                </button>
              </div>
            </div>
          </section>

          {/* Notifications Section */}
          <section>
            <div className="flex items-center gap-4 mb-6">
              <Bell className="text-primary" size={32} />
              <h2 className="font-headline-md text-headline-md uppercase tracking-tight anton-text">Alert Protocol</h2>
            </div>
            <div className="bg-white border border-on-surface pop-shadow rounded-xl divide-y divide-on-surface">
              <div className="p-6 flex items-center justify-between">
                <div>
                  <h3 className="font-body-lg font-bold">Deep Work Mode</h3>
                  <p className="text-on-surface-variant text-body-md">Suppress all non-essential pings during focus sessions.</p>
                </div>
                <button 
                  className={`w-14 h-8 rounded-full relative transition-colors border-2 border-on-surface shrink-0 ${deepWork ? 'bg-indigo-deep' : 'bg-surface-muted'}`}
                  onClick={() => setDeepWork(!deepWork)}
                >
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full border border-on-surface transition-all ${deepWork ? 'right-1' : 'left-1'}`}></div>
                </button>
              </div>
              
              <div className="p-6 flex items-center justify-between">
                <div>
                  <h3 className="font-body-lg font-bold">Quest Reminders</h3>
                  <p className="text-on-surface-variant text-body-md">Hourly check-ins on your current active productivity quest.</p>
                </div>
                <button 
                  className={`w-14 h-8 rounded-full relative transition-colors border-2 border-on-surface shrink-0 ${questReminders ? 'bg-indigo-deep' : 'bg-surface-muted'}`}
                  onClick={() => setQuestReminders(!questReminders)}
                >
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full border border-on-surface transition-all ${questReminders ? 'right-1' : 'left-1'}`}></div>
                </button>
              </div>
            </div>
          </section>

          {/* Experience & Gamification */}
          <section>
            <div className="flex items-center gap-4 mb-6">
              <Star className="text-xp-gold" size={32} />
              <h2 className="font-headline-md text-headline-md uppercase tracking-tight anton-text">Leveling System</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-8 bg-on-surface text-white rounded-xl flex flex-col items-center justify-center space-y-4 pop-shadow">
                <span className="font-label-caps text-label-caps opacity-70">CURRENT RANK</span>
                <span className="font-display-hero text-4xl text-xp-gold anton-text">LEVEL 24</span>
                <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                  <div className="bg-xp-gold h-full w-[72%]"></div>
                </div>
                <span className="font-label-xp text-label-xp">4,200 / 6,000 XP</span>
              </div>
              
              <div className="md:col-span-2 p-8 bg-secondary-container border border-on-surface rounded-xl pop-shadow">
                <h3 className="font-headline-md mb-4 text-on-secondary-fixed anton-text">Global Prestige Mode</h3>
                <p className="font-body-md text-on-secondary-fixed mb-6">Enable public leaderboards to compare your focus stats with other high-level Productivity Aces.</p>
                <button className="bg-on-surface text-white px-8 py-3 rounded-lg font-label-caps text-label-caps hover:bg-opacity-90 transition-all flex items-center justify-center gap-2">
                  ACTIVATE CHALLENGE
                  <Star size={16} />
                </button>
              </div>
            </div>
          </section>

          {/* Visuals & Aesthetics */}
          <section>
            <div className="flex items-center gap-4 mb-6">
              <Palette className="text-primary" size={32} />
              <h2 className="font-headline-md text-headline-md uppercase tracking-tight anton-text">Interface Skin</h2>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4">
              <div className="flex-shrink-0 w-48 border-2 border-primary bg-surface p-4 rounded-xl pop-shadow">
                <div className="w-full h-24 halftone-bg border border-on-surface mb-3 rounded flex items-center justify-center">
                  <span className="text-on-surface-variant font-label-caps">POP-ART</span>
                </div>
                <span className="font-label-caps text-label-caps block text-center">ACTIVE</span>
              </div>
              
              <div className="flex-shrink-0 w-48 border border-on-surface bg-inverse-surface p-4 rounded-xl opacity-60 grayscale hover:grayscale-0 transition-all cursor-pointer">
                <div className="w-full h-24 bg-zinc-900 border border-white/20 mb-3 rounded flex items-center justify-center">
                  <span className="text-white font-label-caps">NEO-NOIR</span>
                </div>
                <span className="font-label-caps text-label-caps block text-center text-white">SELECT</span>
              </div>
              
              <div className="flex-shrink-0 w-48 border border-on-surface bg-surface-bright p-4 rounded-xl opacity-60 grayscale hover:grayscale-0 transition-all cursor-pointer">
                <div className="w-full h-24 bg-white border border-on-surface mb-3 rounded flex items-center justify-center shadow-inner">
                  <span className="text-on-surface-variant font-label-caps">PAPER-CUT</span>
                </div>
                <span className="font-label-caps text-label-caps block text-center">SELECT</span>
              </div>
            </div>
          </section>
          
        </div>
        
        {/* Danger Zone */}
        <footer className="mt-24 pt-12 border-t-4 border-on-surface mb-24">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div>
              <h2 className="font-headline-md text-error mb-2 anton-text tracking-wide">Destruction Protocol</h2>
              <p className="text-on-surface-variant font-body-md max-w-md">Once account data is purged, your XP, Streaks, and Quest History cannot be recovered from the HAIA servers.</p>
            </div>
            <button className="px-8 py-4 border-2 border-error text-error font-bold rounded-xl hover:bg-error hover:text-white transition-all pop-shadow hover:shadow-none active:translate-x-1 active:translate-y-1">
              DELETE ALL DATA
            </button>
          </div>
        </footer>

      </div>
    </div>
  );
}
