"use client";

import React, { useEffect, useState, useRef } from "react";
import { toPng } from 'html-to-image';
import { Camera, Download, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createApiClient } from "@/lib/api";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const START_HOUR = 8; // 8 AM
const END_HOUR = 21; // 9 PM
const PIXELS_PER_HOUR = 60;
const TOTAL_HOURS = END_HOUR - START_HOUR;

const COLORS = [
  "#fecaca", // red-200
  "#fde047", // yellow-300
  "#a7f3d0", // emerald-200
  "#bfdbfe", // blue-200
  "#e9d5ff", // purple-200
  "#fbcfe8", // pink-200
  "#fed7aa", // orange-200
  "#99f6e4", // teal-200
];

function getCourseColor(code: string) {
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = code.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

function parseTimeToDecimal(timeStr: string) {
  // timeStr is "HH:MM:SS"
  const [h, m] = timeStr.split(":").map(Number);
  return h + m / 60;
}

function formatTime(timeStr: string) {
  const d = new Date(`2000-01-01T${timeStr}`);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(" ", "");
}

export default function SchedulePage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const scheduleRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const fetchCourses = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const api = createApiClient(session.access_token);
      
      const fetchedCourses = await api.courses.list();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setCourses(fetchedCourses as any[]);
    } catch (err) {
      console.error(err);
      setError("Failed to load schedule");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const api = createApiClient(session.access_token);
      
      await api.courses.parseSchedule(file);
      await fetchCourses();
    } catch (err) {
      console.error(err);
      setError("Failed to parse schedule photo.");
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const exportSchedule = async () => {
    if (!scheduleRef.current) return;
    try {
      // Temporarily remove cross-origin stylesheets to prevent html-to-image SecurityError
      const links = document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]');
      const removedLinks: { node: HTMLLinkElement, parent: ParentNode | null, nextSibling: ChildNode | null }[] = [];
      
      links.forEach(link => {
        if (link.href.includes('fonts.googleapis.com')) {
           removedLinks.push({ node: link, parent: link.parentNode, nextSibling: link.nextSibling });
           link.parentNode?.removeChild(link);
        }
      });

      const dataUrl = await toPng(scheduleRef.current, { pixelRatio: 2, backgroundColor: '#ffffff' });
      
      // Restore the stylesheets immediately
      removedLinks.forEach(({ node, parent, nextSibling }) => {
         if (parent) {
             parent.insertBefore(node, nextSibling);
         }
      });

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "haia_schedule.png";
      a.click();
    } catch (err) {
      console.error("Export failed", err);
      setError("Failed to export schedule to image.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8 bg-[#FAFAF8]">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  // Generate background time lines
  const timeLines = [];
  for (let i = 0; i <= TOTAL_HOURS * 2; i++) {
    const timeValue = START_HOUR + i * 0.5;
    const hour = Math.floor(timeValue);
    const min = (timeValue % 1) * 60;
    const isHour = min === 0;
    
    let timeLabel = "";
    if (hour <= 12) {
      timeLabel = `${hour}:${min === 0 ? "00" : "30"}${hour === 12 ? "PM" : "AM"}`;
    } else {
      timeLabel = `${hour - 12}:${min === 0 ? "00" : "30"}PM`;
    }
    
    timeLines.push(
      <div 
        key={i} 
        className={`absolute w-full flex items-center border-t ${isHour ? "border-black" : "border-black/20"}`}
        style={{ top: `${i * (PIXELS_PER_HOUR / 2)}px`, height: "0px", left: 0 }}
      >
        <span className="absolute -left-[65px] -translate-y-1/2 text-xs font-bold w-[60px] text-right">
          {timeLabel}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] w-full overflow-hidden bg-[#FAFAF8] relative z-0">
      <div className="flex-1 overflow-y-auto p-4 md:p-gutter flex flex-col items-center">
        <div className="w-full max-w-6xl mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="font-headline-lg text-3xl md:text-headline-lg comic-text">MY SCHEDULE</h1>
          
          <div className="flex gap-4">
            <label className="bg-white text-on-surface font-label-caps uppercase font-black italic px-4 py-2 rounded comic-border comic-shadow hover:-translate-y-1 transition-transform cursor-pointer flex items-center gap-2">
              {uploading ? <Loader2 className="animate-spin" size={16} /> : <Camera size={16} />}
              {uploading ? "PARSING..." : "UPLOAD FILE"}
              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileUpload} disabled={uploading} />
            </label>
            
            <button 
              onClick={exportSchedule}
              className="bg-primary text-white font-label-caps uppercase font-black italic px-4 py-2 rounded comic-border comic-shadow hover:-translate-y-1 transition-transform flex items-center gap-2"
            >
              <Download size={16} />
              EXPORT TO PNG
            </button>
          </div>
        </div>
        
        {error && (
          <div className="w-full max-w-6xl mb-4 bg-error text-white font-bold p-3 rounded comic-border">
            {error}
          </div>
        )}

        <div className="w-full max-w-6xl bg-white comic-border comic-shadow rounded-lg p-8 pb-12 overflow-x-auto">
          <div ref={scheduleRef} className="bg-white p-4 min-w-[800px]">
            <div className="pl-[70px] grid grid-cols-7 gap-2 mb-4">
              {DAYS.map(day => (
                <div key={day} className="text-center font-black comic-text uppercase text-sm">
                  {day}
                </div>
              ))}
            </div>

            <div className="relative ml-[70px] border-l-2 border-r-2 border-black" style={{ height: `${TOTAL_HOURS * PIXELS_PER_HOUR}px` }}>
              {/* Grid Background Lines */}
              {timeLines}

              {/* Day Columns */}
              <div className="absolute inset-0 grid grid-cols-7 gap-2">
                {DAYS.map((day) => {
                  const dayCourses = courses.filter(c => {
                     // Check if course.days includes this day. It could be an array or string.
                     if (Array.isArray(c.days)) {
                       return c.days.includes(day);
                     }
                     return c.days === day;
                  });

                  return (
                    <div key={day} className="relative h-full border-r-2 border-black/10 last:border-r-0">
                      {dayCourses.map(course => {
                        const start = parseTimeToDecimal(course.start_time);
                        const end = parseTimeToDecimal(course.end_time);
                        
                        // Bound the times to the grid visually if they overflow
                        const visualStart = Math.max(START_HOUR, start);
                        const visualEnd = Math.min(END_HOUR, end);
                        
                        const top = (visualStart - START_HOUR) * PIXELS_PER_HOUR;
                        const height = (visualEnd - visualStart) * PIXELS_PER_HOUR;
                        
                        const bgColor = getCourseColor(course.code);

                        return (
                          <div
                            key={course.id + day}
                            className="absolute left-1 right-1 rounded-md border-2 border-black overflow-hidden flex flex-col items-center justify-center p-1 text-center comic-shadow-sm hover:z-10 hover:-translate-y-1 transition-transform"
                            style={{ 
                              top: `${top}px`, 
                              height: `${height}px`,
                              backgroundColor: bgColor 
                            }}
                          >
                            <div className="font-bold text-[11px] leading-tight mb-1 uppercase line-clamp-3">
                              {course.name || course.code}
                            </div>
                            <div className="text-[10px] font-medium opacity-80 uppercase">
                              {formatTime(course.start_time)}-{formatTime(course.end_time)}
                            </div>
                            <div className="text-[9px] font-black opacity-50 mt-1 absolute bottom-1 right-1">
                              {course.room || "TBA"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
