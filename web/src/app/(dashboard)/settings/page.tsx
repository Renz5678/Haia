"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Bell, Star, Palette, MessageCircle, Calendar, AlertTriangle, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { createClient } from "@/lib/supabase/client";
import { createApiClient } from "@/lib/api";
import { AlertModal } from "@/components/ui/AlertModal";
import { Skeleton } from "@/components/ui/Skeleton";

export default function SettingsPage() {
  const router = useRouter();
  // ── Notification preferences (wired to backend) ──────────────────────────
  const [deepWork, setDeepWork] = useState(false);
  const [questReminders, setQuestReminders] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // ── Integration state ─────────────────────────────────────────────────────
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isTelegramConnected, setIsTelegramConnected] = useState(false);

  // ── Profile ───────────────────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState("");
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  // ── Gamification stats ────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // ── Delete confirmation ───────────────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Alert modal ───────────────────────────────────────────────────────────
  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false, title: "", message: "",
  });

  const { user } = useAuthStore();
  const supabase = createClient();

  // ── Fetch initial data ────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const api = createApiClient(session.access_token);

        const [intRes, statsRes] = await Promise.all([
          api.integrations.list(),
          api.gamification.stats(),
        ]);

        if (intRes.integrations.includes("google_calendar")) setIsGoogleConnected(true);
        if (intRes.integrations.includes("telegram")) setIsTelegramConnected(true);
        setStats(statsRes);

        // Fetch user prefs to populate toggles
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const me: any = await api.users.me();
        const prefs = me?.notification_preferences || {};
        setDeepWork(!!prefs.deep_work);
        setQuestReminders(!!prefs.quest_reminders);
      } catch (err) {
        console.error("Failed to init settings:", err);
      } finally {
        setStatsLoading(false);
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user?.display_name) setDisplayName(user.display_name);
  }, [user?.display_name]);

  // Listen for Google OAuth popup to post back
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === "google_connected") {
        setIsGoogleConnected(true);
        setAlertConfig({ isOpen: true, title: "Connection Successful", message: "Google Calendar connected!" });
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const saveNotifPref = async (key: "deep_work" | "quest_reminders", value: boolean) => {
    setSavingPrefs(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const api = createApiClient(session.access_token);
      await api.users.updateMe({
        notification_preferences: { deep_work: deepWork, quest_reminders: questReminders, [key]: value },
      });
    } catch (err) {
      console.error("Failed to save notification prefs:", err);
      setAlertConfig({ isOpen: true, title: "Error", message: "Couldn't save notification preference. Try again." });
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleToggleDeepWork = async () => {
    const next = !deepWork;
    setDeepWork(next);
    await saveNotifPref("deep_work", next);
  };

  const handleToggleQuestReminders = async () => {
    const next = !questReminders;
    setQuestReminders(next);
    await saveNotifPref("quest_reminders", next);
  };

  const handleConnectTelegram = async () => {
    setIsLinking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");
      const api = createApiClient(session.access_token);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await api.integrations.telegram.linkCode();
      setLinkCode(res.link_code);
    } catch {
      setAlertConfig({ isOpen: true, title: "Error", message: "Failed to generate linking code. Make sure you are logged in." });
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
    } catch {
      setAlertConfig({ isOpen: true, title: "Error", message: "Failed to initiate Google connection." });
    }
  };

  const handleUpdateName = async () => {
    if (displayName === user?.display_name) return;
    setIsUpdatingUser(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const api = createApiClient(session.access_token);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatedUser: any = await api.users.updateMe({ display_name: displayName });
      useAuthStore.getState().setUser(updatedUser);
      setAlertConfig({ isOpen: true, title: "Success", message: "Display name updated!" });
    } catch {
      setAlertConfig({ isOpen: true, title: "Error", message: "Failed to update display name." });
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");
      const api = createApiClient(session.access_token);
      await api.users.deleteAccount();
      await supabase.auth.signOut();
      router.push("/login");
    } catch {
      setAlertConfig({ isOpen: true, title: "Error", message: "Failed to delete account. Please try again." });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = stats as any;
  const total_xp: number = s?.total_xp ?? 0;
  const current_level: number = s?.current_level ?? 1;
  const xp_for_next: number = s?.xp_for_next_level ?? current_level * 1000;
  const progress_pct = xp_for_next > 0 ? Math.min(100, (total_xp / xp_for_next) * 100) : 0;

  return (
    <div className="flex-1 overflow-y-auto h-[calc(100vh-80px)] bg-[#f9f9f7] relative">
      <style dangerouslySetInnerHTML={{__html: `
        .halftone-bg-settings {
          background-color: #f9f9f7;
          background-image: radial-gradient(#d1d1d1 1px, transparent 0);
          background-size: 40px 40px;
        }
      `}} />
      <div className="absolute inset-0 halftone-bg-settings pointer-events-none z-[-1]" />

      <div className="max-w-max-width-content mx-auto py-12 px-4 md:px-margin-desktop">
        <h1 className="font-display-hero text-5xl md:text-display-hero mb-12 anton-text">Settings</h1>

        <div className="space-y-16">

          {/* ── Account Identity ─────────────────────────────────────────── */}
          <section>
            <div className="flex items-center gap-4 mb-6">
              <User className="text-primary" size={32} />
              <h2 className="font-headline-md text-headline-md uppercase tracking-tight anton-text">Account Identity</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-6 bg-white border border-on-surface pop-shadow rounded-xl">
                <div className="flex justify-between items-center mb-2">
                  <label className="font-label-caps text-label-caps text-on-surface-variant">Display Name</label>
                  {displayName !== user?.display_name && (
                    <button
                      onClick={handleUpdateName}
                      disabled={isUpdatingUser}
                      className="text-[10px] font-bold uppercase bg-primary text-white px-3 py-1 rounded disabled:opacity-60"
                    >
                      {isUpdatingUser ? "Saving..." : "Save"}
                    </button>
                  )}
                </div>
                <input
                  className="w-full bg-surface-bright border border-on-surface p-3 font-body-lg focus:ring-0 focus:border-indigo-deep outline-none"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              <div className="p-6 bg-white border border-on-surface pop-shadow rounded-xl">
                <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">Email Address</label>
                <input
                  className="w-full bg-surface-container-low border border-on-surface/20 text-on-surface-variant p-3 font-body-lg cursor-not-allowed outline-none"
                  type="email"
                  value={user?.email || ""}
                  readOnly
                />
              </div>
            </div>
          </section>

          {/* ── Integrations ──────────────────────────────────────────────── */}
          <section>
            <div className="flex items-center gap-4 mb-6">
              <MessageCircle className="text-primary" size={32} />
              <h2 className="font-headline-md text-headline-md uppercase tracking-tight anton-text">Integrations</h2>
            </div>
            <div className="space-y-6">
              {/* Telegram */}
              <div className="bg-white border border-on-surface pop-shadow rounded-xl">
                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-body-lg font-bold">Telegram Bot (HAIA)</h3>
                    <p className="text-on-surface-variant text-body-md">Connect your account to interact with Haia from Telegram.</p>
                  </div>
                  <button
                    onClick={handleConnectTelegram}
                    disabled={isLinking || !!linkCode || isTelegramConnected}
                    className={`bg-[#2AABEE] text-white px-6 py-3 rounded-lg font-bold border-2 border-on-surface shadow-[4px_4px_0px_0px_#1a1c1b] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-70 disabled:cursor-not-allowed ${isTelegramConnected ? "!bg-emerald-500 !text-white" : ""}`}
                  >
                    <MessageCircle size={20} />
                    {isTelegramConnected ? "Connected ✓" : isLinking ? "Generating..." : linkCode ? "Code Generated" : "Connect Telegram"}
                  </button>
                </div>
                {linkCode && (
                  <div className="p-6 bg-surface-container-low border-t border-on-surface flex flex-col items-center justify-center">
                    <p className="font-label-caps text-on-surface-variant mb-2">SEND THIS CODE TO THE HAIA TELEGRAM BOT</p>
                    <div className="font-display-hero text-4xl tracking-widest text-primary anton-text">{linkCode}</div>
                    <p className="text-sm text-on-surface-variant mt-2 italic">Expires in 15 minutes</p>
                  </div>
                )}
              </div>

              {/* Google */}
              <div className="bg-white border border-on-surface pop-shadow rounded-xl">
                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-body-lg font-bold">Google Calendar &amp; Mail</h3>
                    <p className="text-on-surface-variant text-body-md">Connect your Google account to sync events and enable email parsing.</p>
                  </div>
                  <button
                    onClick={handleConnectGoogle}
                    disabled={isGoogleConnected}
                    className={`bg-primary text-white px-6 py-3 rounded-lg font-bold border-2 border-on-surface shadow-[4px_4px_0px_0px_#1a1c1b] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-70 disabled:cursor-not-allowed ${isGoogleConnected ? "!bg-emerald-500 !text-white" : ""}`}
                  >
                    <Calendar size={20} />
                    {isGoogleConnected ? "Connected ✓" : "Connect Google"}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* ── Notifications ─────────────────────────────────────────────── */}
          <section>
            <div className="flex items-center gap-4 mb-6">
              <Bell className="text-primary" size={32} />
              <h2 className="font-headline-md text-headline-md uppercase tracking-tight anton-text">Alert Protocol</h2>
              {savingPrefs && <Loader2 size={16} className="animate-spin text-primary" />}
            </div>
            <div className="bg-white border border-on-surface pop-shadow rounded-xl divide-y divide-on-surface">
              {/* Deep Work */}
              <div className="p-6 flex items-center justify-between">
                <div>
                  <h3 className="font-body-lg font-bold">Deep Work Mode</h3>
                  <p className="text-on-surface-variant text-body-md">Suppress all non-essential pings during focus sessions.</p>
                </div>
                <button
                  className={`w-14 h-8 rounded-full relative transition-colors border-2 border-on-surface shrink-0 ${deepWork ? "bg-indigo-deep" : "bg-surface-muted"}`}
                  onClick={handleToggleDeepWork}
                >
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full border border-on-surface transition-all ${deepWork ? "right-1" : "left-1"}`} />
                </button>
              </div>

              {/* Quest Reminders */}
              <div className="p-6 flex items-center justify-between">
                <div>
                  <h3 className="font-body-lg font-bold">Quest Reminders</h3>
                  <p className="text-on-surface-variant text-body-md">Daily Telegram alerts for quests due in the next 24 hours.</p>
                </div>
                <button
                  className={`w-14 h-8 rounded-full relative transition-colors border-2 border-on-surface shrink-0 ${questReminders ? "bg-indigo-deep" : "bg-surface-muted"}`}
                  onClick={handleToggleQuestReminders}
                >
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full border border-on-surface transition-all ${questReminders ? "right-1" : "left-1"}`} />
                </button>
              </div>
            </div>
          </section>

          {/* ── Leveling System (real data) ────────────────────────────────── */}
          <section>
            <div className="flex items-center gap-4 mb-6">
              <Star className="text-xp-gold" size={32} />
              <h2 className="font-headline-md text-headline-md uppercase tracking-tight anton-text">Leveling System</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-8 bg-on-surface text-white rounded-xl flex flex-col items-center justify-center space-y-4 pop-shadow">
                <span className="font-label-caps text-label-caps opacity-70">CURRENT RANK</span>
                {statsLoading
                  ? <Skeleton className="h-10 w-32 bg-white/20" />
                  : <span className="font-display-hero text-4xl text-xp-gold anton-text">LEVEL {current_level}</span>
                }
                <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                  <div className="bg-xp-gold h-full transition-all duration-700" style={{ width: `${progress_pct}%` }} />
                </div>
                {statsLoading
                  ? <Skeleton className="h-4 w-24 bg-white/20" />
                  : <span className="font-label-xp text-label-xp">{total_xp.toLocaleString()} / {xp_for_next.toLocaleString()} XP</span>
                }
              </div>

              <div className="md:col-span-2 p-8 bg-secondary-container border border-on-surface rounded-xl pop-shadow">
                <h3 className="font-headline-md mb-4 text-on-secondary-fixed anton-text">Keep the Momentum</h3>
                <p className="font-body-md text-on-secondary-fixed mb-4">
                  You need <strong>{statsLoading ? "..." : (s?.xp_to_next_level ?? 0).toLocaleString()} XP</strong> to reach Level {current_level + 1}. Complete quests and log habits to level up!
                </p>
                <div className="w-full bg-white/40 h-3 rounded-full overflow-hidden">
                  <div className="h-full bg-on-secondary-fixed/80 transition-all duration-700" style={{ width: `${progress_pct}%` }} />
                </div>
              </div>
            </div>
          </section>

          {/* ── Interface Skin ────────────────────────────────────────────── */}
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
                <span className="font-label-caps text-label-caps block text-center text-white">COMING SOON</span>
              </div>

              <div className="flex-shrink-0 w-48 border border-on-surface bg-surface-bright p-4 rounded-xl opacity-60 grayscale hover:grayscale-0 transition-all cursor-pointer">
                <div className="w-full h-24 bg-white border border-on-surface mb-3 rounded flex items-center justify-center shadow-inner">
                  <span className="text-on-surface-variant font-label-caps">PAPER-CUT</span>
                </div>
                <span className="font-label-caps text-label-caps block text-center">COMING SOON</span>
              </div>
            </div>
          </section>
        </div>

        {/* ── Danger Zone ───────────────────────────────────────────────────── */}
        <footer className="mt-24 pt-12 border-t-4 border-on-surface mb-24">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div>
              <h2 className="font-headline-md text-error mb-2 anton-text tracking-wide">Destruction Protocol</h2>
              <p className="text-on-surface-variant font-body-md max-w-md">
                Once account data is purged, your XP, Streaks, and Quest History cannot be recovered from the HAIA servers.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-8 py-4 border-2 border-error text-error font-bold rounded-xl hover:bg-error hover:text-white transition-all pop-shadow hover:shadow-none active:translate-x-1 active:translate-y-1"
            >
              DELETE ALL DATA
            </button>
          </div>
        </footer>
      </div>

      {/* ── Alert Modal ────────────────────────────────────────────────────── */}
      <AlertModal
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={() => setAlertConfig((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* ── Delete Confirmation Modal ─────────────────────────────────────── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white comic-border comic-shadow rounded-xl p-8 max-w-md w-full text-center">
            <AlertTriangle className="text-error mx-auto mb-4" size={48} />
            <h2 className="font-headline-md text-xl font-black uppercase mb-2">Are you absolutely sure?</h2>
            <p className="text-on-surface-variant text-sm mb-6">
              This will permanently delete your account, all quests, habits, goals, XP, streaks, and conversation history. <strong>This cannot be undone.</strong>
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 py-3 border-2 border-on-surface font-bold rounded-lg hover:bg-surface-container transition-colors disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="flex-1 py-3 bg-error text-white font-bold rounded-lg comic-border comic-shadow-sm hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isDeleting ? <><Loader2 size={16} className="animate-spin" /> Deleting...</> : "Yes, Delete Everything"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
