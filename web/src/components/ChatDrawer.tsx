"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, ArrowUp, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createApiClient } from "@/lib/api";

function formatMessage(text: string) {
  let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-black text-primary drop-shadow-sm">$1</strong>');
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
  return { __html: formatted };
}

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatDrawer({ isOpen, onClose }: ChatDrawerProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  useEffect(() => {
    async function fetchHistory() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const api = createApiClient(session.access_token);
      try {
        const history = await api.chat.history(20);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formatted = (history as any[]).map((msg: any) => ({
          id: msg.id,
          sender: msg.role === 'assistant' ? 'Haia' : 'Hero',
          text: msg.content,
          time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }));
        setMessages(formatted);
      } catch (err) {
        console.error("Failed to fetch chat history:", err);
      }
    }
    if (isOpen) {
        fetchHistory();
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg = {
      id: Date.now().toString(),
      sender: "Hero",
      text: input,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
      };
      
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-[400px] bg-surface border-l-2 border-on-surface shadow-[-8px_0_0_0_rgba(26,28,27,1)] z-50 flex flex-col transform transition-transform">
        {/* Header */}
        <div className="h-20 px-6 border-b-2 border-on-surface flex items-center justify-between bg-primary text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white border-2 border-on-surface rounded-full flex items-center justify-center overflow-hidden">
                <img src="/haia-avatar.png" alt="Haia" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = 'https://api.dicebear.com/7.x/bottts/svg?seed=Haia&backgroundColor=C0AEDE' }} />
            </div>
            <div>
              <h2 className="font-headline-md text-xl anton-text uppercase tracking-wide">HAIA</h2>
              <p className="text-[10px] font-label-caps uppercase tracking-widest italic opacity-80">Online</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 border-2 border-on-surface bg-white text-on-surface hover:bg-surface-container rounded-full flex items-center justify-center transition-colors shadow-[2px_2px_0px_0px_rgba(26,28,27,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 paper-texture flex flex-col gap-6">
          <div className="flex justify-center mt-4">
              <span className="bg-surface-container-high px-3 py-1 border-2 border-on-surface font-label-caps uppercase italic tracking-widest text-[10px]">
                Today
              </span>
          </div>

          {messages.map(msg => (
            <div key={msg.id} className={`flex flex-col gap-1 max-w-[85%] relative ${msg.sender === "Hero" ? "self-end items-end" : ""}`}>
              {msg.sender === "Haia" ? (
                <div className="p-3 rounded-2xl rounded-bl-none bg-white border-2 border-on-surface shadow-[3px_3px_0px_0px_rgba(26,28,27,1)]">
                  <p 
                    className="font-body-md text-sm text-on-surface font-semibold chat-markdown whitespace-pre-wrap"
                    dangerouslySetInnerHTML={formatMessage(msg.text)}
                  />
                </div>
              ) : (
                <div className="p-3 rounded-2xl rounded-br-none bg-primary text-white border-2 border-on-surface shadow-[3px_3px_0px_0px_rgba(26,28,27,1)]">
                  <p className="font-body-md text-sm font-bold tracking-tight">{msg.text}</p>
                </div>
              )}
              <span className="text-[9px] font-label-caps text-on-surface-variant uppercase tracking-tighter px-1 mt-1">
                {msg.time}
              </span>
            </div>
          ))}
          
          {loading && (
            <div className="flex flex-col gap-1 max-w-[85%] relative">
              <div className="p-4 rounded-2xl rounded-bl-none bg-white border-2 border-on-surface shadow-[3px_3px_0px_0px_rgba(26,28,27,1)]">
                <div className="flex items-center gap-1.5 h-4">
                  <div className="w-2 h-2 bg-primary rounded-full animate-[bounce_1s_infinite] drop-shadow-sm" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-[bounce_1s_infinite] drop-shadow-sm" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-[bounce_1s_infinite] drop-shadow-sm" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-surface border-t-2 border-on-surface shrink-0 z-10">
          <div className="relative bg-white ink-border rounded-full p-1.5 pl-4 flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(26,28,27,1)] focus-within:translate-x-[2px] focus-within:translate-y-[2px] focus-within:shadow-none transition-all">
            <input 
              className="flex-1 bg-transparent border-none focus:ring-0 outline-none text-on-surface placeholder:text-on-surface-variant/50 font-body-md text-sm font-bold italic w-full" 
              placeholder="Message Haia..." 
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
            <button 
              onClick={handleSend}
              className="w-10 h-10 bg-primary border-2 border-on-surface rounded-full flex items-center justify-center text-white active:scale-90 transition-transform shrink-0"
            >
              <ArrowUp size={20} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
