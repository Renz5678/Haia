"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Clock, PlusCircle } from "lucide-react";

export default function CalendarPage() {
  const [activeDate, setActiveDate] = useState(5);

  const renderCells = () => {
    const cells = [];
    // 5 empty placeholders
    for (let i = 0; i < 5; i++) {
      cells.push(<div key={`empty-${i}`} className="bg-surface-container-low h-24 md:h-32 p-2 md:p-3 opacity-50"></div>);
    }
    // 31 days
    for (let i = 1; i <= 31; i++) {
      const isActive = i === activeDate;
      const isSchool = i % 4 === 0;
      const isHabit = i % 2 === 0 || isActive;
      const isPersonal = i % 5 === 0;

      cells.push(
        <div 
          key={`day-${i}`} 
          onClick={() => setActiveDate(i)}
          className={`h-24 md:h-32 p-2 md:p-3 transition-colors relative cursor-pointer ${
            isActive ? 'active-day-ink group' : 'bg-white hover:bg-indigo-50 group'
          }`}
        >
          <span className={`font-headline-md font-bold comic-text ${isActive ? 'text-white' : 'text-on-surface'}`}>{i}</span>
          <div className="flex flex-wrap gap-1 mt-2">
            {isSchool && <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full ink-border-2 ${isActive ? 'bg-white' : 'bg-indigo-deep'}`}></div>}
            {isHabit && <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-xp-gold ink-border-2"></div>}
            {isPersonal && <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-tertiary-container ink-border-2"></div>}
          </div>
          {isActive && <div className="absolute inset-0 ink-border-2 pointer-events-none"></div>}
        </div>
      );
    }
    return cells;
  };

  return (
    <div className="flex h-[calc(100vh-80px)] w-full overflow-hidden bg-[#FAFAF8] relative z-0">
      <style dangerouslySetInnerHTML={{__html: `
        .calendar-bg {
          background-image: radial-gradient(#E5E5E2 1px, transparent 1px);
          background-size: 20px 20px;
        }
      `}} />
      <div className="absolute inset-0 calendar-bg pointer-events-none z-[-1]"></div>

      {/* Left Side: Calendar Grid */}
      <section className="flex-1 p-4 md:p-gutter overflow-y-auto halftone-pattern min-w-0">
        <div className="max-w-max-width-content mx-auto">
          {/* Calendar Header */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
            <div className="flex items-center gap-4">
              <h1 className="font-headline-lg text-3xl md:text-headline-lg comic-text">MARCH 2024</h1>
              <div className="flex gap-1">
                <button className="ink-border-2 p-1 bg-white hover:bg-surface-container-low"><ChevronLeft size={20} /></button>
                <button className="ink-border-2 p-1 bg-white hover:bg-surface-container-low"><ChevronRight size={20} /></button>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-indigo-deep ink-border-2"></span>
                <span className="text-xs font-bold comic-text">SCHOOL</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-xp-gold ink-border-2"></span>
                <span className="text-xs font-bold comic-text">HABITS</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-tertiary-container ink-border-2"></span>
                <span className="text-xs font-bold comic-text">PERSONAL</span>
              </div>
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 ink-border-2 bg-black gap-[2px]">
            {/* Days Header */}
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
              <div key={day} className="bg-surface-muted p-1 md:p-2 text-center comic-text font-bold text-[10px] md:text-xs">{day}</div>
            ))}
            
            {/* Grid Cells */}
            {renderCells()}
          </div>
        </div>
      </section>

      {/* Right Side: Agenda Panel */}
      <aside className="hidden xl:flex w-80 border-l-2 border-black bg-surface-container-low flex-col p-6 agenda-scroll overflow-y-auto shrink-0">
        <div className="mb-8">
          <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest mb-1">Today's Focus</p>
          <h2 className="font-headline-md font-extrabold comic-text">MARCH {activeDate}</h2>
        </div>

        <div className="space-y-6">
          {/* School Category */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-indigo-deep">school</span>
              <h3 className="font-bold comic-text text-sm">SCHOOL QUESTS</h3>
            </div>
            <div className="space-y-3">
              <div className="bg-white ink-border-2 p-3 pop-art-shadow hover:-translate-y-1 transition-transform cursor-pointer group">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold comic-text leading-tight">Advanced Algorithms Midterm</h4>
                  <span className="bg-xp-gold text-[10px] font-bold px-2 py-0.5 ink-border-2 whitespace-nowrap ml-2">+500 XP</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-on-surface-variant" />
                  <span className="text-xs font-bold opacity-60">10:00 AM - 12:00 PM</span>
                </div>
              </div>
              
              <div className="bg-white ink-border-2 p-3 pop-art-shadow hover:-translate-y-1 transition-transform cursor-pointer group">
                <h4 className="font-bold comic-text leading-tight">Physics Lab Write-up</h4>
                <div className="mt-2 h-1 bg-surface-container-high overflow-hidden">
                  <div className="h-full bg-indigo-deep w-3/4"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Habits Category */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-xp-gold">fitness_center</span>
              <h3 className="font-bold comic-text text-sm">DAILY RECURRING</h3>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-3 bg-white ink-border-2 p-3 cursor-pointer select-none">
                <input className="w-5 h-5 ink-border-2 text-indigo-deep focus:ring-0 focus:ring-offset-0" type="checkbox" />
                <span className="font-bold comic-text text-sm">Hydration Goal (2L)</span>
                <span className="ml-auto text-xs font-bold text-xp-gold">+50 XP</span>
              </label>
              
              <label className="flex items-center gap-3 bg-white ink-border-2 p-3 cursor-pointer select-none">
                <input defaultChecked className="w-5 h-5 ink-border-2 text-indigo-deep focus:ring-0 focus:ring-offset-0" type="checkbox" />
                <span className="font-bold comic-text text-sm line-through opacity-50">Morning Meditation</span>
                <span className="ml-auto text-xs font-bold text-xp-gold">+50 XP</span>
              </label>
            </div>
          </div>

          {/* Notes/AI Interaction */}
          <div className="bg-black text-white p-4 ink-border-2 shadow-[4px_4px_0px_0px_#feae2c]">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-xp-gold" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              <p className="text-[10px] font-bold tracking-widest uppercase">HAIA SAYS:</p>
            </div>
            <p className="font-body-md text-sm italic">"High energy detected for your 10 AM slot. Keep the momentum, Ace!"</p>
          </div>
        </div>

        <div className="mt-auto pt-8">
          <button className="w-full border-2 border-black border-dashed p-4 font-bold comic-text text-sm hover:bg-white transition-colors flex items-center justify-center gap-2">
            <PlusCircle size={20} />
            NEW QUEST
          </button>
        </div>
      </aside>

    </div>
  );
}
