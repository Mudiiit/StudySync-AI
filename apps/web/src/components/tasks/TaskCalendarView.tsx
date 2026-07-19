'use client';

import React, { useState } from 'react';
import { Task } from '@/services/tasks';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TaskCalendarViewProps {
  tasks: Task[];
  onSelectTask: (taskId: string) => void;
}

export default function TaskCalendarView({ tasks, onSelectTask }: TaskCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Generate calendar cells (days)
  const cells = [];
  // Empty spaces for previous month's overhang
  for (let i = 0; i < firstDayIndex; i++) {
    cells.push(null);
  }
  // Days of current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d));
  }

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'URGENT': return 'bg-red-500/10 border-red-500/35 text-red-400';
      case 'HIGH': return 'bg-amber-500/10 border-amber-500/35 text-amber-400';
      default: return 'bg-blue-500/10 border-blue-500/35 text-blue-400';
    }
  };

  return (
    <div className="flex-1 p-6 h-full min-h-0 bg-card/5 flex flex-col font-sans select-none text-left">
      {/* Calendar Header Toggles */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-sm tracking-tight text-foreground">
          {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevMonth}
            className="p-1 border border-border/40 hover:bg-secondary rounded-lg transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1 border border-border/40 hover:bg-secondary rounded-lg transition-colors cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Week Header */}
      <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 select-none">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="flex-1 grid grid-cols-7 gap-1.5 min-h-0">
        {cells.map((cell, idx) => {
          if (!cell) {
            return (
              <div
                key={`empty-${idx}`}
                className="bg-secondary/5 rounded-xl border border-border/10 opacity-40 min-h-[80px]"
              />
            );
          }

          // Find tasks due on this day
          const dayTasks = tasks.filter((t) => {
            if (!t.dueDate) return false;
            const dDate = new Date(t.dueDate);
            return (
              dDate.getDate() === cell.getDate() &&
              dDate.getMonth() === cell.getMonth() &&
              dDate.getFullYear() === cell.getFullYear()
            );
          });

          return (
            <div
              key={cell.toISOString()}
              className="bg-card/15 rounded-xl border border-border/40 p-2 flex flex-col min-h-[80px] overflow-hidden hover:border-border transition-colors group text-left"
            >
              <span className="text-[10px] font-bold text-muted-foreground group-hover:text-foreground transition-colors mb-2">
                {cell.getDate()}
              </span>

              {/* Day's tasks tags */}
              <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                {dayTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onSelectTask(t.id)}
                    className={`px-1.5 py-0.5 rounded text-[8px] font-semibold border truncate cursor-pointer transition-colors ${getPriorityColor(t.priority)}`}
                  >
                    {t.title || 'Untitled Task'}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
