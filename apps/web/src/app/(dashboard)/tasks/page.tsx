'use client';

import React, { useState, useEffect } from 'react';
import { 
  useTasksList, useCreateTask, useUpdateTask, useMoveTask,
  useGenerateTasksFromAi, useDetectOverload, useWorkspaces, useProjects
} from '@/hooks/useTasks';
import WorkspaceSelector from '@/components/tasks/WorkspaceSelector';
import ProjectSelector from '@/components/tasks/ProjectSelector';
import KanbanBoard from '@/components/tasks/KanbanBoard';
import TaskListView from '@/components/tasks/TaskListView';
import TaskCalendarView from '@/components/tasks/TaskCalendarView';
import TaskTimelineView from '@/components/tasks/TaskTimelineView';
import TaskDetailsDrawer from '@/components/tasks/TaskDetailsDrawer';
import { 
  LayoutGrid, List, Calendar, Plus, Sparkles, AlertTriangle, 
  Settings, Loader2, RefreshCw, BarChart2, BookOpen, X
} from 'lucide-react';
import { TaskStatus } from '@studysync/database';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/components/providers/ToastProvider';

export default function TasksPage() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const action = searchParams?.get('action');
  
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeLayout, setActiveLayout] = useState<'kanban' | 'list' | 'calendar' | 'timeline'>('kanban');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // AI Task Generation state
  const [sourceType, setSourceType] = useState<'SYLLABUS' | 'NOTES' | 'WEAK_TOPICS' | 'TUTOR'>('WEAK_TOPICS');
  const [sourceText, setSourceText] = useState('');
  const [aiModalOpen, setAiModalOpen] = useState(false);

  // Mutations & Queries
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const moveTaskMutation = useMoveTask();
  const generateTasksMutation = useGenerateTasksFromAi();
  
  const { data: overloadCheck } = useDetectOverload(activeWorkspaceId);

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
        title: 'New Study Task',
        status,
      });
      setSelectedTaskId(task.id);
    } catch (e) {
      // Ignored
    }
  };

  const handleAiGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId) return;

    try {
      showToast('AI Task Workspace is extracting tasks...', 'info');
      await generateTasksMutation.mutateAsync({
        workspaceId: activeWorkspaceId,
        projectId: selectedProjectId || undefined,
        sourceType,
        sourceText: sourceType === 'WEAK_TOPICS' ? undefined : sourceText,
      });
      setAiModalOpen(false);
      setSourceText('');
      showToast('StudySync AI successfully generated study tasks!', 'success');
    } catch (err) {
      showToast('Failed to auto-generate tasks', 'error');
    }
  };

  useEffect(() => {
    if (action === 'new' && activeWorkspaceId) {
      handleCreateTask('TODO');
    }
  }, [action, activeWorkspaceId]);

  return (
    <div className="absolute inset-0 flex bg-background divide-x divide-border/40 overflow-hidden font-sans">
      
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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCreateTask('TODO')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-extrabold rounded-lg shadow-sm cursor-pointer transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Task
                </button>
                <button
                  onClick={() => setAiModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-extrabold rounded-lg shadow-sm cursor-pointer transition-colors"
                >
                  <Sparkles className="h-4 w-4 text-violet-400 animate-pulse" />
                  AI Autopilot
                </button>
              </div>
            )}
          </div>

          {/* Layout switches */}
          <div className="flex items-center gap-1 bg-zinc-900/40 border border-zinc-850 p-1 rounded-lg">
            {(['kanban', 'list', 'calendar', 'timeline'] as const).map((layout) => (
              <button
                key={layout}
                onClick={() => setActiveLayout(layout)}
                className={`p-1.5 rounded-md flex items-center gap-1 text-[11px] font-extrabold capitalize cursor-pointer transition-colors ${
                  activeLayout === layout 
                    ? 'bg-violet-600 text-white shadow' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {layout === 'kanban' && <LayoutGrid className="h-3.5 w-3.5" />}
                {layout === 'list' && <List className="h-3.5 w-3.5" />}
                {layout === 'calendar' && <Calendar className="h-3.5 w-3.5" />}
                {layout === 'timeline' && <BarChart2 className="h-3.5 w-3.5" />}
                {layout}
              </button>
            ))}
          </div>
        </div>

        {/* Cognitive Overload Warning Alert banner */}
        {overloadCheck?.isOverloaded && (
          <div className="mx-6 mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-amber-400 shrink-0">
            <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-[10px] uppercase tracking-wider">Cognitive Overload Risk Warning</p>
              <p className="text-[11px] mt-0.5 opacity-90 leading-relaxed font-semibold">
                {overloadCheck.message}
              </p>
            </div>
          </div>
        )}

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
              {activeLayout === 'timeline' && (
                <TaskTimelineView
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
              <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-300">Select a Workspace</h3>
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

      {/* AI Task Generator Dialog Modal */}
      {aiModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0d0d11] border border-zinc-850 rounded-2xl p-6 space-y-4 shadow-xl text-left select-text">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-1.5 uppercase tracking-wide">
                <Sparkles className="h-4.5 w-4.5 text-violet-400" />
                AI Task Workspace Generator
              </h3>
              <button onClick={() => setAiModalOpen(false)} className="text-zinc-500 hover:text-zinc-300 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAiGenerate} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Source AI Feed</label>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-300 text-xs focus:outline-none focus:border-violet-500"
                >
                  <option value="WEAK_TOPICS">Weak Topics (Memory profile)</option>
                  <option value="SYLLABUS">Syllabus Curriculum Upload</option>
                  <option value="NOTES">Custom PDF Notes / Materials</option>
                  <option value="TUTOR">Tutor Conversation History</option>
                </select>
              </div>

              {sourceType !== 'WEAK_TOPICS' && (
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Reference Text</label>
                  <textarea
                    rows={4}
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                    placeholder="Paste syllabus modules, lecture notes headings, or copy/paste tutor responses here..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-300 text-xs focus:outline-none focus:border-violet-500 resize-none leading-relaxed"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={generateTasksMutation.isPending}
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-extrabold rounded-xl transition duration-150 flex items-center justify-center gap-1.5 uppercase text-xs tracking-wider cursor-pointer shadow-md"
              >
                {generateTasksMutation.isPending ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    Generating Study Blocks...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4.5 w-4.5 text-white" />
                    Build AI Task Workspace
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
