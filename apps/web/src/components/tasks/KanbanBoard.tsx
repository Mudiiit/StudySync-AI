'use client';

import React from 'react';
import {
  DndContext,
  DragEndEvent,
  useSensor,
  useSensors,
  PointerSensor,
  closestCorners,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Task, TaskStatus } from '@/services/tasks';
import TaskCard from './TaskCard';
import { Plus } from 'lucide-react';

interface KanbanBoardProps {
  tasks: Task[];
  onMoveTask: (taskId: string, status: TaskStatus, order: number) => void;
  onSelectTask: (taskId: string) => void;
  onCreateTask: (status: TaskStatus) => void;
}

const COLUMNS: { label: string; status: TaskStatus; color: string }[] = [
  { label: 'Todo', status: 'TODO', color: 'border-t-blue-500' },
  { label: 'In Progress', status: 'IN_PROGRESS', color: 'border-t-amber-500' },
  { label: 'Review', status: 'REVIEW', color: 'border-t-purple-500' },
  { label: 'Done', status: 'DONE', color: 'border-t-emerald-500' },
];

export default function KanbanBoard({
  tasks,
  onMoveTask,
  onSelectTask,
  onCreateTask,
}: KanbanBoardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Avoid triggering drag on simple clicks
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // Find target status column
    let targetStatus: TaskStatus | null = null;
    let targetOrder = 0;

    // Is target a column ID?
    const isColumn = COLUMNS.some((col) => col.status === overId);

    if (isColumn) {
      targetStatus = overId as TaskStatus;
      // Append to bottom
      const columnTasks = tasks.filter((t) => t.status === targetStatus);
      targetOrder = columnTasks.length;
    } else {
      // Target is another task CARD
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask) {
        targetStatus = overTask.status;
        targetOrder = overTask.order;
      }
    }

    if (targetStatus) {
      onMoveTask(taskId, targetStatus, targetOrder);
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="flex-1 grid grid-cols-4 gap-4 p-6 min-h-0 h-full overflow-x-auto select-none bg-card/5">
        {COLUMNS.map((col) => {
          const columnTasks = tasks
            .filter((t) => t.status === col.status)
            .sort((a, b) => a.order - b.order);

          return (
            <div
              key={col.status}
              className={`flex flex-col h-full bg-secondary/10 rounded-xl border border-border/30 border-t-2 ${col.color} p-3.5 space-y-3 min-w-[220px]`}
            >
              {/* Column Header */}
              <div className="flex justify-between items-center px-1">
                <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                  {col.label}
                </span>
                <span className="text-[10px] font-bold bg-secondary px-1.5 py-0.5 rounded-full text-muted-foreground">
                  {columnTasks.length}
                </span>
              </div>

              {/* Sortable Tasks Feed Wrapper */}
              <div className="flex-1 overflow-y-auto space-y-2.5 min-h-[150px]">
                <SortableContext items={columnTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  {columnTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onClick={() => onSelectTask(task.id)}
                    />
                  ))}
                </SortableContext>
              </div>

              {/* Column Add Trigger */}
              <button
                onClick={() => onCreateTask(col.status)}
                className="w-full flex items-center justify-center gap-1.5 py-2 hover:bg-secondary/40 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer transition-colors border border-dashed border-border/40"
              >
                <Plus className="h-4 w-4" />
                Add Task
              </button>
            </div>
          );
        })}
      </div>
    </DndContext>
  );
}
