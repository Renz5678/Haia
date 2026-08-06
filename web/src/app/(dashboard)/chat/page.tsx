"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, ArrowUp, History, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createApiClient } from "@/lib/api";

function formatMessage(text: string) {
  let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-black text-primary drop-shadow-sm">$1</strong>');
  formatted = formatted.replace(/\*(.*?)\*/g, "<em>$1</em>");
  return { __html: formatted };
}

/** Format ISO date as relative time: "2m ago", "1h ago", etc. */
function relativeTime(isoString: string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ChatPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Sidebar data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stats, setStats] = useState<any>(null);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    async function fetchAll() {
      setHistoryLoading(true);
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setHistoryLoading(false); return; }

      const api = createApiClient(session.access_token);

      try {
        const [history, tasks, gamStats] = await Promise.all([
          api.chat.history(50),
          api.tasks.list({ task_status: "completed" }),
          api.gamification.stats(),
        ]);

        // Map chat history to UI format
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formatted = (history as any[]).map((msg: any) => ({
          id: msg.id,
          sender: msg.role === "assistant" ? "Haia" : "Hero",
          text: msg.content,
          time: new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          hasAction: !!msg.linked_item_type,
          actionDetails: msg.linked_item_type
            ? { title: `Linked ${msg.linked_item_type}`, subtitle: msg.intent || "Updated", xp: "+50" }
            : undefined,
        }));
        setMessages(formatted);

        // Most recently completed tasks for the sidebar
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setRecentTasks((tasks as any[]).slice(0, 5));
        setStats(gamStats);
      } catch (err) {
        console.error("Failed to load chat data:", err);
      } finally {
        setHistoryLoading(false);
      }
    }
    fetchAll();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = {
      id: Date.now().toString(),
      sender: "Hero",
      text: input,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      hasAction: false,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const api = createApiClient(session.access_token);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await api.chat.send(userMsg.text, "web");

      const botMsg = {
        id: res.id || Date.now().toString() + "bot",
        sender: "Haia",
        text: res.content,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        hasAction: !!res.linked_item_type,
        actionDetails: res.linked_item_type
          ? { title: `Linked ${res.linked_item_type}`, subtitle: res.intent || "Updated", xp: "+50" }
          : undefined,
      };

      setMessages((prev) => [...prev, botMsg]);

      // Refresh stats so XP bar updates after AI might have logged something
      const freshStats = await api.gamification.stats().catch(() => null);
      if (freshStats) setStats(freshStats);
    } catch (err: any) {
      let errorMsg = "Sorry boss, I'm having trouble connecting right now. Try again in a sec?";
      
      // Graceful degradation for 503/429
      if (err?.message?.includes("503") || err?.message?.includes("429")) {
        try {
          const jsonStr = err.message.substring(err.message.indexOf("{"));
          const parsed = JSON.parse(jsonStr);
          if (parsed.detail) errorMsg = parsed.detail;
        } catch {
          errorMsg = "The AI is resting right now due to high demand. Please try again in a moment!";
        }
      }

      setMessages((prev) => [...prev, {
        id: Date.now().toString() + "err",
        sender: "Haia",
        text: errorMsg,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        hasAction: false,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleVoice = async () => {
    if (isRecording) {
      // Stop and send
      mediaRecorderRef.current?.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const file = new File([blob], "voice.webm", { type: "audio/webm" });

        setLoading(true);
        try {
          const supabase = createClient();
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;
          const api = createApiClient(session.access_token);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const res: any = await api.parse.voice(file);
          const reply = res?.assistant_reply || res?.content || "Got it! Voice note processed.";
          setMessages((prev) => [...prev, {
            id: Date.now().toString() + "voice",
            sender: "Haia",
            text: reply,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            hasAction: false,
          }]);
        } catch {
          setMessages((prev) => [...prev, {
            id: Date.now().toString() + "voice-err",
            sender: "Haia",
            text: "Couldn't process voice note. Try again?",
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            hasAction: false,
          }]);
        } finally {
          setLoading(false);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      alert("Microphone access denied. Please allow it in your browser settings.");
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = stats as any;
  const total_xp: number = s?.total_xp ?? 0;
  const xp_for_next: number = s?.xp_for_next_level ?? 1000;
  const xp_to_next: number = s?.xp_to_next_level ?? xp_for_next;
  const xp_progress = xp_for_next > 0 ? Math.min(100, (total_xp / xp_for_next) * 100) : 0;
  const current_level: number = s?.current_level ?? 1;

  return (
    <div className="flex h-[calc(100vh-80px)] w-full overflow-hidden bg-surface paper-texture relative z-0">

      {/* Main Chat Area */}
      <section className="flex-1 flex flex-col relative h-full min-w-0">
        <div className="flex-1 overflow-y-auto px-4 md:px-margin-desktop py-8 scroll-smooth">
          <div className="max-w-[720px] mx-auto w-full space-y-12">

            {/* Day Separator */}
            <div className="flex justify-center">
              <span className="bg-primary text-white px-4 py-1 border-2 border-on-surface shadow-[3px_3px_0px_0px_rgba(26,28,27,1)] font-label-caps uppercase tracking-widest text-xs">
                Today
              </span>
            </div>

            {/* Loading skeleton */}
            {historyLoading && (
              <div className="flex flex-col gap-4 items-start">
                <div className="h-16 w-3/4 bg-surface-container animate-pulse rounded-2xl" />
                <div className="h-10 w-1/2 bg-surface-container animate-pulse rounded-2xl self-end" />
                <div className="h-20 w-4/5 bg-surface-container animate-pulse rounded-2xl" />
              </div>
            )}

            {/* Chat Messages */}
            {!historyLoading && (
              <div className="flex flex-col gap-10">
                {messages.length === 0 && (
                  <div className="bubble-bot p-5 rounded-2xl rounded-bl-none bg-surface max-w-[85%]">
                    <p className="font-body-md text-on-surface font-semibold">
                      Hey! I&apos;m Haia 👋 Tell me what you need to get done, or ask me anything about your progress.
                    </p>
                  </div>
                )}

                {messages.map((msg) => (
                  <div key={msg.id} className={`flex flex-col gap-3 max-w-[85%] relative ${msg.sender === "Hero" ? "self-end items-end" : ""}`}>
                    {msg.sender === "Haia" ? (
                      <div className="bubble-bot p-5 rounded-2xl rounded-bl-none bg-surface">
                        <div className="tail-bot" />
                        <div className="space-y-4">
                          <p
                            className="font-body-md text-on-surface font-semibold chat-markdown whitespace-pre-wrap"
                            dangerouslySetInnerHTML={formatMessage(msg.text)}
                          />
                          {msg.hasAction && msg.actionDetails && (
                            <div className="flex items-center gap-4 p-4 bg-surface-container-low border-2 border-on-surface rounded-xl shadow-[2px_2px_0px_0px_rgba(26,28,27,1)]">
                              <div className="w-12 h-12 rounded-lg bg-xp-gold flex items-center justify-center border-2 border-on-surface shrink-0">
                                <span className="material-symbols-outlined text-on-secondary-fixed text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>fitness_center</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-headline-md text-sm font-black uppercase text-on-surface truncate">{msg.actionDetails.title}</h4>
                                <p className="text-[12px] font-bold text-on-surface-variant truncate">{msg.actionDetails.subtitle}</p>
                              </div>
                              <div className="px-3 py-1 bg-xp-gold border-2 border-on-surface rounded text-[12px] font-black text-on-secondary-fixed shrink-0">
                                {msg.actionDetails.xp} XP!
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="bubble-user p-5 rounded-2xl rounded-br-none bg-indigo-deep text-white">
                        <div className="tail-user" />
                        <p className="font-body-md font-bold tracking-tight">{msg.text}</p>
                      </div>
                    )}
                    <span className="text-[10px] font-label-caps text-on-surface-variant uppercase tracking-tighter px-1">
                      {msg.time} — {msg.sender}
                    </span>
                  </div>
                ))}

                {loading && (
                  <div className="flex flex-col gap-3 max-w-[85%]">
                    <div className="bubble-bot p-5 rounded-2xl rounded-bl-none bg-surface">
                      <div className="tail-bot" />
                      <div className="flex items-center gap-1.5 h-6 px-1">
                        <div className="w-2.5 h-2.5 bg-on-surface rounded-full animate-[bounce_1s_infinite]" style={{ animationDelay: "0ms" }} />
                        <div className="w-2.5 h-2.5 bg-on-surface rounded-full animate-[bounce_1s_infinite]" style={{ animationDelay: "150ms" }} />
                        <div className="w-2.5 h-2.5 bg-on-surface rounded-full animate-[bounce_1s_infinite]" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-4 md:p-margin-desktop pt-0 pb-6 md:pb-12 w-full">
          <div className="max-w-[720px] mx-auto relative group">
            <div className="absolute -inset-1 bg-on-surface/10 blur-md group-focus-within:bg-primary/20 transition-all rounded-full" />
            <div className="relative bg-surface ink-border rounded-full p-2 pl-6 md:pl-8 flex items-center gap-2 md:gap-4 shadow-[6px_6px_0px_0px_rgba(26,28,27,1)] focus-within:translate-x-[2px] focus-within:translate-y-[2px] focus-within:shadow-none transition-all">
              <input
                className="flex-1 bg-transparent border-none focus:ring-0 outline-none text-on-surface placeholder:text-on-surface-variant/50 font-body-md py-2 md:py-3 font-bold w-full"
                placeholder="WHAT'S THE PLAN, BOSS?..."
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
              />
              <button
                onClick={handleVoice}
                title={isRecording ? "Stop recording" : "Record voice note"}
                className={`hidden sm:flex w-10 h-10 md:w-12 md:h-12 items-center justify-center transition-colors shrink-0 rounded-full ${
                  isRecording ? "bg-error text-white animate-pulse" : "text-on-surface-variant hover:text-primary"
                }`}
              >
                {isRecording ? <Loader2 size={20} className="animate-spin" /> : <Mic size={24} />}
              </button>
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="w-10 h-10 md:w-12 md:h-12 bg-primary-container border-2 border-on-surface rounded-full flex items-center justify-center text-white active:scale-90 transition-transform shadow-[3px_3px_0px_0px_rgba(26,28,27,1)] shrink-0 disabled:opacity-50"
              >
                <ArrowUp size={24} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Recently Logged Panel (Right) — real data */}
      <aside className="hidden xl:flex w-[340px] border-l-2 border-on-surface flex-col bg-surface-container-low/50 backdrop-blur-sm relative z-10 shrink-0">
        <div className="p-8 h-full overflow-y-auto flex flex-col">
          <h3 className="font-label-caps text-xs font-black uppercase tracking-widest text-on-surface-variant mb-8 flex items-center justify-between">
            Recently Completed
            <History size={16} />
          </h3>

          <div className="space-y-4 flex-1">
            {recentTasks.length === 0 && !historyLoading && (
              <p className="text-sm text-on-surface-variant italic">No completed quests yet. Go crush some! ⚔️</p>
            )}

            {recentTasks.map((task) => (
              <div
                key={task.id}
                className="p-4 bg-white border-2 border-on-surface shadow-[4px_4px_0px_0px_rgba(26,28,27,1)] hover:-translate-y-1 transition-transform cursor-default relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`px-2 py-0.5 border border-on-surface text-[10px] font-black ${
                    (task.task_type || "").toLowerCase() === "school"
                      ? "bg-secondary-fixed text-on-secondary-fixed"
                      : "bg-tertiary-fixed text-on-tertiary-fixed"
                  }`}>
                    {(task.task_type || "QUEST").toUpperCase()}
                  </span>
                  <span className="text-[9px] font-black text-on-surface-variant/70">
                    {task.completed_at ? relativeTime(task.completed_at) : "recently"}
                  </span>
                </div>
                <h4 className="font-headline-md text-sm font-black mb-1 uppercase tracking-tight line-clamp-2">{task.title}</h4>
                <div className="flex items-center gap-1 text-[10px] font-bold text-on-surface-variant">
                  <span className="text-xp-gold font-black">+{task.xp_value || 50} XP</span>
                </div>
              </div>
            ))}
          </div>

          {/* XP Progress — real data */}
          <div className="mt-8 p-6 bg-indigo-deep border-2 border-on-surface shadow-[6px_6px_0px_0px_rgba(26,28,27,1)] text-white relative overflow-hidden">
            <div className="relative z-10">
              <span className="font-label-caps text-[10px] uppercase font-black tracking-widest opacity-90">Progress Meter</span>
              <h4 className="font-display-hero text-3xl font-black mt-1 anton-text">
                {historyLoading ? "..." : total_xp.toLocaleString()} XP
              </h4>
              <div className="mt-4 w-full bg-white/20 h-4 border-2 border-on-surface overflow-hidden">
                <div
                  className="bg-xp-gold h-full border-r-2 border-on-surface transition-all duration-700"
                  style={{ width: `${xp_progress}%` }}
                />
              </div>
              <p className="mt-2 text-[10px] font-black uppercase opacity-80 tracking-tighter">
                {historyLoading ? "..." : `Level up in: ${xp_to_next.toLocaleString()} XP`}
              </p>
              <p className="text-[10px] opacity-60 font-bold mt-1">Level {current_level} → {current_level + 1}</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
