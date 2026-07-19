'use client';

import React, { useState } from 'react';
import { 
  useTasksList, useCreateTask, useUpdateTask, useMoveTask 
} from '@/hooks/useTasks';
import WorkspaceSelector from '@/components/tasks/WorkspaceSelector';
import ProjectSelector from '@/components/tasks/ProjectSelector';
import KanbanBoard from '@/components/tasks/KanbanBoard';
import TaskListView from '@/components/tasks/TaskListView';
import TaskCalendarView from '@/components/tasks/TaskCalendarView';
import TaskDetailsDrawer from '@/components/tasks/TaskDetailsDrawer';
import { LayoutGrid, List, Calendar, Plus, Sparkles } from 'lucide-react';
import { TaskStatus } from '@studysync/database';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function TasksPage() {
  const searchParams = useSearchParams();
  const action = searchParams?.get('action');
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeLayout, setActiveLayout] = useState<'kanban' | 'list' | 'calendar'>('kanban');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Task Mutations
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const moveTaskMutation = useMoveTask();

  // Load Tasks
  const { data: tasksData, isLoading } = useTasksList({
    workspaceId: activeWorkspaceId,
    projectId: selectedProjectId || undefined,
  });

  const handleMoveTask = async (taskId: string, status: TaskStatus, order: number) => {
    try {
      await moveTaskMutation.mutateAsync({ taskId, status, order });
    } catch (e) {
      // Ignored
    }
  };

  const handleToggleComplete = async (taskId: string, current: boolean) => {
    try {
      await updateTaskMutation.mutateAsync({
        taskId,
        dto: { isCompleted: !current, status: !current ? 'DONE' : 'TODO' },
      });
    } catch (e) {
      // Ignored
    }
  };

  const handleCreateTask = async (status: TaskStatus = 'TODO') => {
    if (!activeWorkspaceId) return;
    try {
      const task = await createTaskMutation.mutateAsync({
        workspaceId: activeWorkspaceId,
        projectId: selectedProjectId,
        title: 'New Task',
        status,
      });
      setSelectedTaskId(task.id);
    } catch (e) {
      // Ignored
    }
  };

  useEffect(() => {
    if (action === 'new' && activeWorkspaceId) {
      handleCreateTask('TODO');
    }
  }, [action, activeWorkspaceId]);

  return (
    <div className="absolute inset-0 flex bg-background divide-x divide-border/40 overflow-hidden">
      
      {/* Project Selector Left Sidebar */}
      <ProjectSelector
        activeWorkspaceId={activeWorkspaceId}
        selectedProjectId={selectedProjectId}
        onSelectProject={setSelectedProjectId}
      />

      {/* Main Workspace Feed Center */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        
        {/* Workspace Toolbar Header */}
        <div className="h-14 border-b border-border/40 px-6 flex items-center justify-between bg-card/15 shrink-0 select-none">
          <div className="flex items-center gap-3">
            <WorkspaceSelector
              activeWorkspaceId={activeWorkspaceId}
              onSelectWorkspace={setActiveWorkspaceId}
            />
            {activeWorkspaceId && (
              <button
                onClick={() => handleCreateTask('TODO')}
                className="flex items-center gap-1.5 px-3 py-2 bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-semibold rounded-lg shadow-sm cursor-pointer transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Task
              </button>
            )}
          </div>

          {/* Layout switches */}
          <div className="flex items-center gap-1 bg-secondary/35 border border-border/40 p-1 rounded-lg">
            <button
              onClick={() => setActiveLayout('kanban')}
              className={`p-1.5 rounded-md flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors ${
                activeLayout === 'kanban' ? 'bg-background text-foreground border border-border/30' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Kanban
            </button>
            <button
              onClick={() => setActiveLayout('list')}
              className={`p-1.5 rounded-md flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors ${
                activeLayout === 'list' ? 'bg-background text-foreground border border-border/30' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              List
            </button>
            <button
              onClick={() => setActiveLayout('calendar')}
              className={`p-1.5 rounded-md flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors ${
                activeLayout === 'calendar' ? 'bg-background text-foreground border border-border/30' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              Calendar
            </button>
          </div>
        </div>

        {/* Content Portal */}
        <div className="flex-1 min-h-0 h-full overflow-hidden relative">
          {isLoading ? (
            <div className="h-full flex items-center justify-center select-none text-xs text-muted-foreground animate-pulse uppercase tracking-wider">
              Loading tasks feed...
            </div>
          ) : activeWorkspaceId ? (
            <div className="h-full flex flex-col min-h-0">
              {activeLayout === 'kanban' && (
                <KanbanBoard
                  tasks={tasksData?.tasks || []}
                  onMoveTask={handleMoveTask}
                  onSelectTask={setSelectedTaskId}
                  onCreateTask={handleCreateTask}
                />
              )}
              {activeLayout === 'list' && (
                <TaskListView
                  tasks={tasksData?.tasks || []}
                  onSelectTask={setSelectedTaskId}
                  onToggleComplete={handleToggleComplete}
                />
              )}
              {activeLayout === 'calendar' && (
                <TaskCalendarView
                  tasks={tasksData?.tasks || []}
                  onSelectTask={setSelectedTaskId}
                />
              )}
            </div>
          ) : (
            /* Empty State: Create/Select Workspace */
            <div className="h-full flex flex-col items-center justify-center p-8 text-center select-none bg-card/5 font-sans">
              <div className="h-16 w-16 rounded-2xl bg-secondary/35 border border-border/40 flex items-center justify-center mb-4 shadow-[0_4px_24px_rgba(0,0,0,0.15)]">
                <LayoutGrid className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="font-bold text-lg text-foreground">Select a Workspace</h3>
              <p className="text-muted-foreground text-xs leading-relaxed max-w-xs mt-1.5">
                Choose an existing task workspace from the selector in the header, or create a new workspace to start tracking projects.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Task Details Side Drawer */}
      <AnimatePresence>
        {selectedTaskId && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 384, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full shrink-0 z-10"
          >
            <TaskDetailsDrawer
              taskId={selectedTaskId}
              onClose={() => setSelectedTaskId(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
