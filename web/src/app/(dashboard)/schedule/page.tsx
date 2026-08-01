"use client";

import React, { useEffect, useState, useRef } from "react";
import html2canvas from "html2canvas";
import { Camera, Download, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createApiClient } from "@/lib/api";

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
      // clear the input
      e.target.value = '';
    }
  };

  const exportSchedule = async () => {
    if (!scheduleRef.current) return;
    try {
      const canvas = await html2canvas(scheduleRef.current, { scale: 2 });
      const image = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = image;
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

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] w-full overflow-hidden bg-[#FAFAF8] relative z-0">
      <style dangerouslySetInnerHTML={{__html: `
        .schedule-bg {
          background-image: radial-gradient(#E5E5E2 1px, transparent 1px);
          background-size: 20px 20px;
        }
      `}} />
      <div className="absolute inset-0 schedule-bg pointer-events-none z-[-1]"></div>

      <div className="flex-1 overflow-y-auto p-4 md:p-gutter flex flex-col items-center">
        <div className="w-full max-w-5xl mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="font-headline-lg text-3xl md:text-headline-lg comic-text">MY SCHEDULE</h1>
          
          <div className="flex gap-4">
            <label className="bg-white text-on-surface font-label-caps uppercase font-black italic px-4 py-2 rounded comic-border comic-shadow hover:-translate-y-1 transition-transform cursor-pointer flex items-center gap-2">
              {uploading ? <Loader2 className="animate-spin" size={16} /> : <Camera size={16} />}
              {uploading ? "PARSING..." : "UPLOAD PHOTO"}
              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
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
          <div className="w-full max-w-5xl mb-4 bg-error text-white font-bold p-3 rounded comic-border">
            {error}
          </div>
        )}

        <div className="w-full max-w-5xl overflow-x-auto bg-white comic-border comic-shadow p-6 rounded-lg" ref={scheduleRef}>
          <div className="flex flex-col gap-6">
            <div className="text-center mb-4">
              <h2 className="font-headline-md text-2xl anton-text italic border-b-4 border-primary inline-block pb-1">HAIA SMART SCHEDULE</h2>
            </div>

            {courses.length === 0 ? (
              <div className="text-center p-12 opacity-50 font-bold comic-text">
                No courses added yet. Upload a photo of your schedule or COR to begin!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {courses.map((course: any) => (
                  <div key={course.id} className="bg-surface-container-low comic-border p-4 rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group hover:-translate-y-1 transition-all">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-primary/20 rotate-45 translate-x-8 -translate-y-8 group-hover:scale-150 transition-transform"></div>
                    <h3 className="font-headline-sm text-xl font-black comic-text mb-1">{course.course_code}</h3>
                    <p className="font-bold text-sm mb-4 bg-white inline-block px-2 border-2 border-black -rotate-1">{course.section || "No Section"}</p>
                    
                    <div className="space-y-2 text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                        <span>{course.days}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">schedule</span>
                        <span>
                          {new Date(course.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                          {new Date(course.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">meeting_room</span>
                        <span>{course.room || "TBA"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">laptop_mac</span>
                        <span className="uppercase text-xs font-bold tracking-widest">{course.modality || "F2F"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {courses.length > 0 && (
               <div className="mt-8 text-center border-t-2 border-dashed border-black pt-4">
                 <p className="font-label-caps tracking-widest text-xs opacity-60">GENERATED BY HAIA AI</p>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
