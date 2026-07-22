'use client';

import React, { useMemo } from 'react';
import { Task } from '@/services/tasks';
import { Calendar, ChevronRight, GitCommit, Play, Sparkles } from 'lucide-react';

interface TaskTimelineViewProps {
  tasks: Task[];
  onSelectTask: (id: string) => void;
}

export default function TaskTimelineView({ tasks, onSelectTask }: TaskTimelineViewProps) {
  // Sort tasks by due date
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      return dateA - dateB;
    });
  }, [tasks]);

  return (
    <div className="flex-1 overflow-x-auto p-6 bg-[#070708] h-full select-none">
      <div className="min-w-[800px] max-w-5xl mx-auto space-y-6">
        
        {/* Timeline Header Info */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4.5 w-4.5 text-violet-400" />
            <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">
              Study Plan Gantt Timeline
            </h3>
          </div>
          <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 font-extrabold px-3 py-1 rounded-full uppercase">
            {sortedTasks.length} Scheduled Tasks
          </span>
        </div>

        {sortedTasks.length === 0 ? (
          <div className="p-12 text-center border border-zinc-850 rounded-2xl bg-zinc-950/20">
            <Calendar className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-xs text-zinc-400 font-semibold">No tasks scheduled with due dates.</p>
          </div>
        ) : (
          <div className="relative border-l border-zinc-800 pl-6 ml-4 space-y-6 py-2">
            {sortedTasks.map((task, idx) => {
              const formattedDate = task.dueDate 
                ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                : 'No Deadline';

              const progressPct = task.isCompleted ? 100 : task.status === 'IN_PROGRESS' ? 50 : 0;

              return (
                <div 
                  key={task.id} 
                  className="relative group cursor-pointer"
                  onClick={() => onSelectTask(task.id)}
                >
                  {/* Timeline Dot Marker */}
                  <div className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-[#070708] bg-zinc-700 group-hover:bg-violet-500 transition-colors flex items-center justify-center">
                    {task.isCompleted && <div className="h-1.5 w-1.5 rounded-full bg-violet-400" />}
                  </div>

                  {/* Timeline Card */}
                  <div className="p-4 bg-[#0d0d11]/75 border border-zinc-850 group-hover:border-zinc-750 rounded-xl transition duration-150 shadow-md">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                            task.priority === 'URGENT' || task.priority === 'HIGH'
                              ? 'bg-red-500/10 border-red-500/30 text-red-400'
                              : 'bg-zinc-800/40 border-zinc-700/50 text-zinc-400'
                          }`}>
                            {task.priority}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-bold">
                            Due {formattedDate}
                          </span>
                          {task.project && (
                            <span className="text-[10px] text-violet-400 font-bold">
                              • {task.project.name}
                            </span>
                          )}
                        </div>

                        <h4 className="text-xs font-bold text-zinc-100 group-hover:text-white transition-colors">
                          {task.title}
                        </h4>
                        
                        {task.description && (
                          <p className="text-[11px] text-zinc-400 line-clamp-1">
                            {task.description}
                          </p>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div className="w-24 shrink-0 space-y-1 text-right select-none">
                        <div className="flex items-center justify-between text-[9px] text-zinc-400 font-extrabold">
                          <span>PROGRESS</span>
                          <span>{progressPct}%</span>
                        </div>
                        <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/50">
                          <div 
                            className="h-full bg-violet-500 rounded-full transition-all"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Pre-requisites listing */}
                    {task.dependencies && task.dependencies.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-zinc-900 flex items-center gap-1.5 text-[9px] text-amber-400 font-bold uppercase">
                        <GitCommit className="h-3 w-3" />
                        Prerequisites: {task.dependencies.map((d) => d.dependsOn.title).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
