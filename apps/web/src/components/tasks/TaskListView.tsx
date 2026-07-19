'use client';

import React from 'react';
import { Task, TaskStatus } from '@/services/tasks';
import { Calendar, AlertCircle, ArrowUpDown } from 'lucide-react';

interface TaskListViewProps {
  tasks: Task[];
  onSelectTask: (taskId: string) => void;
  onToggleComplete: (taskId: string, current: boolean) => void;
}

export default function TaskListView({
  tasks,
  onSelectTask,
  onToggleComplete,
}: TaskListViewProps) {
  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'URGENT': return 'bg-red-500/10 text-red-500';
      case 'HIGH': return 'bg-amber-500/10 text-amber-500';
      case 'MEDIUM': return 'bg-blue-500/10 text-blue-500';
      default: return 'bg-secondary text-muted-foreground';
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'DONE': return 'bg-emerald-500/10 text-emerald-500';
      case 'REVIEW': return 'bg-purple-500/10 text-purple-500';
      case 'IN_PROGRESS': return 'bg-amber-500/10 text-amber-500';
      default: return 'bg-blue-500/10 text-blue-500';
    }
  };

  return (
    <div className="flex-1 p-6 h-full min-h-0 bg-card/5 overflow-y-auto select-none font-sans text-xs text-left">
      <div className="w-full border border-border/40 rounded-xl overflow-hidden bg-card/15 shadow-sm">
        {/* Sticky Headers */}
        <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-secondary/20 border-b border-border/40 font-bold uppercase tracking-wider text-[10px] text-muted-foreground select-none">
          <div className="col-span-1 text-center">Done</div>
          <div className="col-span-5 flex items-center gap-1">Task Title <ArrowUpDown className="h-3 w-3" /></div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Priority</div>
          <div className="col-span-2">Due Date</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border/30">
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onSelectTask(task.id)}
                className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-secondary/25 transition-colors cursor-pointer items-center text-foreground font-medium"
              >
                {/* Done Checkbox */}
                <div className="col-span-1 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={task.isCompleted}
                    onChange={() => onToggleComplete(task.id, task.isCompleted)}
                    className="h-4 w-4 rounded border-border/50 text-primary focus:ring-primary/45 cursor-pointer bg-card/30"
                  />
                </div>

                {/* Title */}
                <div className="col-span-5 truncate text-foreground font-semibold">
                  {task.title || 'Untitled Task'}
                </div>

                {/* Status */}
                <div className="col-span-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusBadge(task.status)}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Priority */}
                <div className="col-span-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getPriorityBadge(task.priority)}`}>
                    {task.priority}
                  </span>
                </div>

                {/* Due Date */}
                <div className="col-span-2 flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'None'}
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-muted-foreground font-sans italic">
              No tasks found in list view
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
