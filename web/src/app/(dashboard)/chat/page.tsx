"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, ArrowUp, History, Calendar, LayoutGrid } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createApiClient } from "@/lib/api";

function formatMessage(text: string) {
  let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-black text-primary drop-shadow-sm">$1</strong>');
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
  return { __html: formatted };
}

export default function ChatPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    async function fetchHistory() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const api = createApiClient(session.access_token);
      try {
        const history = await api.chat.history(50);
        // Map backend chat_messages to UI format
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formatted = (history as any[]).map((msg: any) => ({
          id: msg.id,
          sender: msg.role === 'assistant' ? 'Haia' : 'Hero',
          text: msg.content,
          time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          hasAction: !!msg.linked_item_type,
          actionDetails: msg.linked_item_type ? {
            title: `Linked ${msg.linked_item_type}`,
            subtitle: msg.intent || "Updated",
            xp: "+50",
          } : undefined
        }));
        setMessages(formatted);
      } catch (err) {
        console.error("Failed to fetch chat history:", err);
      }
    }
    fetchHistory();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg = {
      id: Date.now().toString(),
      sender: "Hero",
      text: input,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      hasAction: false
    };
    
    setMessages(prev => [...prev, userMsg]);
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
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        hasAction: !!res.linked_item_type,
        actionDetails: res.linked_item_type ? {
          title: `Linked ${res.linked_item_type}`,
          subtitle: res.intent || "Updated",
          xp: "+50",
        } : undefined
      };
      
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error("Failed to send message:", err);
      setMessages(prev => [...prev, {
        id: Date.now().toString() + "err",
        sender: "Haia",
        text: "Sorry boss, I'm having trouble connecting right now.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        hasAction: false
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-80px)] w-full overflow-hidden bg-surface paper-texture relative z-0">
      
      {/* Main Chat Area */}
      <section className="flex-1 flex flex-col relative h-full min-w-0">
        <div className="flex-1 overflow-y-auto px-4 md:px-margin-desktop py-8 scroll-smooth">
          <div className="max-w-[720px] mx-auto w-full space-y-12">
            
            {/* Day Separator */}
            <div className="flex justify-center">
              <span className="bg-primary text-white px-4 py-1 border-2 border-on-surface shadow-[3px_3px_0px_0px_rgba(26,28,27,1)] font-label-caps uppercase italic tracking-widest text-xs">
                Today
              </span>
            </div>

            {/* Chat History */}
            <div className="flex flex-col gap-10">
              {messages.map(msg => (
                <div key={msg.id} className={`flex flex-col gap-3 max-w-[85%] relative ${msg.sender === "Hero" ? "self-end items-end" : ""}`}>
                  
                  {msg.sender === "Haia" ? (
                    <div className="bubble-bot p-5 rounded-2xl rounded-bl-none bg-surface">
                      <div className="tail-bot"></div>
                      <div className="space-y-4">
                        <p 
                          className="font-body-md text-on-surface font-semibold italic chat-markdown whitespace-pre-wrap"
                          dangerouslySetInnerHTML={formatMessage(msg.text)}
                        />
                        
                        {msg.hasAction && msg.actionDetails && (
                          <div className="flex items-center gap-4 p-4 bg-surface-container-low border-2 border-on-surface rounded-xl shadow-[2px_2px_0px_0px_rgba(26,28,27,1)]">
                            <div className="w-12 h-12 rounded-lg bg-xp-gold flex items-center justify-center border-2 border-on-surface shrink-0">
                              <span className="material-symbols-outlined text-on-secondary-fixed text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>fitness_center</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-headline-md text-sm font-black uppercase italic text-on-surface truncate">{msg.actionDetails.title}</h4>
                              <p className="text-[12px] font-bold text-on-surface-variant truncate">{msg.actionDetails.subtitle}</p>
                            </div>
                            <div className="px-3 py-1 bg-xp-gold border-2 border-on-surface rounded text-[12px] font-black text-on-secondary-fixed italic shrink-0">
                              {msg.actionDetails.xp} XP!
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bubble-user p-5 rounded-2xl rounded-br-none bg-indigo-deep text-white">
                      <div className="tail-user"></div>
                      <p className="font-body-md font-bold tracking-tight">{msg.text}</p>
                    </div>
                  )}
                  
                  <span className="text-[10px] font-label-caps text-on-surface-variant uppercase tracking-tighter px-1">
                    {msg.time} - {msg.sender}
                  </span>
                </div>
              ))}
              {loading && (
                <div className="flex flex-col gap-3 max-w-[85%] relative">
                  <div className="bubble-bot p-5 rounded-2xl rounded-bl-none bg-surface">
                    <div className="tail-bot"></div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-1.5 h-6 px-1">
                        <div className="w-2.5 h-2.5 bg-on-surface rounded-full animate-[bounce_1s_infinite] drop-shadow-sm" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2.5 h-2.5 bg-on-surface rounded-full animate-[bounce_1s_infinite] drop-shadow-sm" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2.5 h-2.5 bg-on-surface rounded-full animate-[bounce_1s_infinite] drop-shadow-sm" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-4 md:p-margin-desktop pt-0 pb-6 md:pb-12 w-full">
          <div className="max-w-[720px] mx-auto relative group">
            <div className="absolute -inset-1 bg-on-surface/10 blur-md group-focus-within:bg-primary/20 transition-all rounded-full"></div>
            <div className="relative bg-surface ink-border rounded-full p-2 pl-6 md:pl-8 flex items-center gap-2 md:gap-4 shadow-[6px_6px_0px_0px_rgba(26,28,27,1)] focus-within:translate-x-[2px] focus-within:translate-y-[2px] focus-within:shadow-none transition-all">
              <input 
                className="flex-1 bg-transparent border-none focus:ring-0 outline-none text-on-surface placeholder:text-on-surface-variant/50 font-body-md py-2 md:py-3 font-bold italic w-full" 
                placeholder="WHAT'S THE PLAN, BOSS?..." 
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
              />
              <button className="hidden sm:flex w-10 h-10 md:w-12 md:h-12 items-center justify-center text-on-surface-variant hover:text-primary transition-colors shrink-0">
                <Mic size={24} />
              </button>
              <button 
                onClick={handleSend}
                className="w-10 h-10 md:w-12 md:h-12 bg-primary-container border-2 border-on-surface rounded-full flex items-center justify-center text-white active:scale-90 transition-transform shadow-[3px_3px_0px_0px_rgba(26,28,27,1)] shrink-0"
              >
                <ArrowUp size={24} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Recently Logged Panel (Right) */}
      <aside className="hidden xl:flex w-[340px] border-l-2 border-on-surface flex-col bg-surface-container-low/50 backdrop-blur-sm relative before:absolute before:inset-0 before:bg-[url('https://www.transparenttextures.com/patterns/dust.png')] before:opacity-5 before:pointer-events-none z-10 shrink-0">
        <div className="p-8 h-full overflow-y-auto">
          <h3 className="font-label-caps text-xs font-black uppercase tracking-widest text-on-surface-variant mb-8 flex items-center justify-between italic">
            Recently Logged
            <History size={16} />
          </h3>
          
          <div className="space-y-6">
            {/* Logged Item 1 */}
            <div className="p-4 bg-white border-2 border-on-surface shadow-[4px_4px_0px_0px_rgba(26,28,27,1)] hover:-translate-y-1 transition-transform cursor-default relative overflow-hidden group">
              <div className="flex justify-between items-start mb-3">
                <span className="px-2 py-0.5 border border-on-surface bg-secondary-fixed text-[10px] font-black text-on-secondary-fixed italic">HABIT</span>
                <span className="text-[9px] font-black text-on-surface-variant/70">1M AGO</span>
              </div>
              <h4 className="font-headline-md text-base font-black italic mb-1 uppercase tracking-tight">Gym Session</h4>
              <div className="flex items-center gap-2 text-[11px] font-bold text-on-surface-variant">
                <Calendar size={14} />
                TOMORROW, 7:00 AM
              </div>
            </div>

            {/* Logged Item 2 */}
            <div className="p-4 bg-white border-2 border-on-surface shadow-[4px_4px_0px_0px_rgba(26,28,27,1)] hover:-translate-y-1 transition-transform cursor-default relative overflow-hidden">
              <div className="flex justify-between items-start mb-3">
                <span className="px-2 py-0.5 border border-on-surface bg-tertiary-fixed text-[10px] font-black text-on-tertiary-fixed italic">QUEST</span>
                <span className="text-[9px] font-black text-on-surface-variant/70">2H AGO</span>
              </div>
              <h4 className="font-headline-md text-base font-black italic mb-1 uppercase tracking-tight">Finish UI Design</h4>
              <div className="flex items-center gap-2 text-[11px] font-bold text-on-surface-variant">
                <LayoutGrid size={14} />
                CS PROJECT
              </div>
            </div>

            {/* Daily Progress Stat */}
            <div className="mt-12 p-6 bg-indigo-deep border-2 border-on-surface shadow-[6px_6px_0px_0px_rgba(26,28,27,1)] text-white relative overflow-hidden">
              <div className="relative z-10">
                <span className="font-label-caps text-[10px] uppercase font-black tracking-widest italic opacity-90">Progress Meter</span>
                <h4 className="font-display-hero text-3xl font-black italic mt-2 anton-text">1,240 XP</h4>
                <div className="mt-6 w-full bg-white/20 h-4 border-2 border-on-surface overflow-hidden">
                  <div className="bg-xp-gold h-full w-[72%] border-r-2 border-on-surface"></div>
                </div>
                <p className="mt-3 text-[10px] font-black uppercase italic opacity-80 tracking-tighter">Level up in: 260 XP</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

    </div>
  );
}
