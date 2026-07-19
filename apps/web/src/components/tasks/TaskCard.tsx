'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/services/tasks';
import { Calendar, AlertCircle, CheckCircle, MessageSquare } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

export default function TaskCard({ task, onClick }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'URGENT': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'HIGH': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'MEDIUM': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default: return 'bg-secondary/40 text-muted-foreground border-border/30';
    }
  };

  // Checklist stats
  const chk = task.checklists?.[0];
  const totalSteps = chk?.items?.length || 0;
  const completedSteps = chk?.items?.filter((i) => i.isCompleted).length || 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="p-4 bg-card/25 hover:bg-card/45 border border-border/40 hover:border-border rounded-xl cursor-grab active:cursor-grabbing text-left space-y-3 transition-colors shadow-sm select-none"
    >
      <div className="flex justify-between items-start gap-2">
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getPriorityColor(task.priority)}`}>
          {task.priority}
        </span>
        {task.isCompleted && <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />}
      </div>

      <h4 className="font-semibold text-xs leading-snug truncate text-foreground">
        {task.title || 'Untitled Task'}
      </h4>

      {task.description && (
        <p className="text-[10px] text-muted-foreground line-clamp-1">
          {task.description}
        </p>
      )}

      <div className="flex justify-between items-center text-[10px] text-muted-foreground select-none">
        <span className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          {task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No due date'}
        </span>

        {/* Stats indicators */}
        <div className="flex items-center gap-2">
          {totalSteps > 0 && (
            <span className="text-[9px] font-bold bg-secondary/35 px-1.5 py-0.5 rounded">
              {completedSteps}/{totalSteps}
            </span>
          )}
          {task.comments && task.comments.length > 0 && (
            <span className="flex items-center gap-0.5">
              <MessageSquare className="h-3 w-3" />
              {task.comments.length}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
