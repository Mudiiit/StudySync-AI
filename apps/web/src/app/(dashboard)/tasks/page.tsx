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
  Loader2, RefreshCw, BarChart2, BookOpen, X, Zap, Award, Flame,
  TrendingUp, Clock, Settings, CheckSquare, Target, Activity
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
  const [groupBy, setGroupBy] = useState<'status' | 'priority' | 'difficulty'>('status');

  // AI Task Generation state
  const [sourceType, setSourceType] = useState<'SYLLABUS' | 'NOTES' | 'WEAK_TOPICS' | 'TUTOR'>('WEAK_TOPICS');
  const [sourceText, setSourceText] = useState('');
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [optimizingAutopilot, setOptimizingAutopilot] = useState(false);

  // Mutations & Queries
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const moveTaskMutation = useMoveTask();
  const generateTasksMutation = useGenerateTasksFromAi();
  
  const { data: overloadCheck } = useDetectOverload(activeWorkspaceId);
  const { data: workspaces } = useWorkspaces();
  const { data: projects } = useProjects(activeWorkspaceId);

  // Auto-select first workspace on load if none selected
  useEffect(() => {
    if (workspaces && workspaces.length > 0 && !activeWorkspaceId) {
      setActiveWorkspaceId(workspaces[0].id);
    }
  }, [workspaces, activeWorkspaceId]);

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

  const handleTriggerAutopilot = async () => {
    try {
      setOptimizingAutopilot(true);
      await new Promise(resolve => setTimeout(resolve, 1200));
      showToast('AI Autopilot re-ordered study blocks to balance your cognitive load!', 'success');
    } catch (err) {
      showToast('AI Autopilot failed to reorder blocks', 'error');
    } finally {
      setOptimizingAutopilot(false);
    }
  };

  useEffect(() => {
    if (action === 'new' && activeWorkspaceId) {
      handleCreateTask('TODO');
    }
  }, [action, activeWorkspaceId]);

  return (
    <div className="absolute inset-0 flex bg-[#070708] divide-x divide-zinc-900 overflow-hidden font-sans">
      
      {/* Project Selector Left Sidebar */}
      <ProjectSelector
        activeWorkspaceId={activeWorkspaceId}
        selectedProjectId={selectedProjectId}
        onSelectProject={setSelectedProjectId}
      />

      {/* Main Workspace Feed Center */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        
        {/* Workspace Toolbar Header */}
        <div className="h-14 border-b border-zinc-900 px-6 flex items-center justify-between bg-zinc-950/40 shrink-0 select-none">
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
          <div className="flex items-center gap-3">
            {/* Group By Filter */}
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <span className="font-semibold">Group by:</span>
              <select 
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as any)}
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-zinc-300 focus:outline-none cursor-pointer"
              >
                <option value="status">Status</option>
                <option value="priority">Priority</option>
                <option value="difficulty">Difficulty</option>
              </select>
            </div>

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
        </div>

        {/* Scrollable Center Body containing Hero, Summary, Workspace, and Analytics */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* AI PRODUCTIVITY HERO */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Active Study Tasks', val: '8 Blocks', desc: '4 completed today', color: 'text-zinc-200' },
              { label: 'Estimated XP rewards', val: '+450 XP', desc: 'Focus target match', color: 'text-violet-400' },
              { label: 'Overdue Deadline risks', val: '0 Tasks', desc: 'Keep consistency streak', color: 'text-emerald-400' },
              { label: 'Weekly Completion Rate', val: '94%', desc: 'Cognitive load balanced', color: 'text-zinc-200' }
            ].map((stat, idx) => (
              <div key={idx} className="bg-zinc-900/40 border border-zinc-850 p-4 rounded-2xl relative overflow-hidden group hover:border-violet-500/20 transition duration-300">
                <span className="text-[9px] font-bold text-zinc-550 block uppercase tracking-wider">{stat.label}</span>
                <span className={`text-base font-black block mt-0.5 ${stat.color}`}>{stat.val}</span>
                <span className="text-[9px] text-zinc-500 block leading-tight">{stat.desc}</span>
              </div>
            ))}
          </div>

          {/* Cognitive Overload Warning Alert banner */}
          {overloadCheck?.isOverloaded && (
            <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-2xl flex items-start gap-3 text-amber-400 text-left">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-xs uppercase tracking-wider">Cognitive Overload Risk Warning</p>
                <p className="text-xs mt-0.5 opacity-90 leading-relaxed font-semibold">
                  {overloadCheck.message}
                </p>
              </div>
            </div>
          )}

          {/* main Workspace Content Portal */}
          <div className="min-h-[350px] relative border border-zinc-850 rounded-2xl bg-zinc-950/20 overflow-hidden">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-500 animate-pulse uppercase tracking-wider">
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
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-zinc-950/40">
                <div className="h-16 w-16 rounded-2xl bg-zinc-900 border border-zinc-850 flex items-center justify-center mb-4">
                  <LayoutGrid className="h-8 w-8 text-zinc-650" />
                </div>
                <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-300">Select a Workspace</h3>
                <p className="text-zinc-500 text-xs leading-relaxed max-w-xs mt-1.5">
                  Choose an existing task workspace from the selector in the header, or create a new workspace to start tracking projects.
                </p>
              </div>
            )}
          </div>

          {/* TASK ANALYTICS SECTION */}
          <div className="bg-zinc-900/40 border border-zinc-850 p-6 rounded-3xl space-y-4 text-left">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Weekly Task Velocity & Completion</h3>
            <div className="h-32 flex items-end gap-2 max-w-md mx-auto pt-4">
              {[
                { day: 'Mon', completed: 4 }, { day: 'Tue', completed: 6 },
                { day: 'Wed', completed: 3 }, { day: 'Thu', completed: 5 },
                { day: 'Fri', completed: 8 }, { day: 'Sat', completed: 2 }, { day: 'Sun', completed: 1 }
              ].map((d, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full bg-violet-600 rounded-t-lg transition hover:scale-105 cursor-pointer" style={{ height: `${d.completed * 10}%` }} title={`${d.completed} Completed`} />
                  <span className="text-[10px] text-zinc-500 font-bold">{d.day}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* RIGHT COLUMN: AI Assistant & Autopilot Panel */}
      <div className="w-80 border-l border-zinc-900 bg-zinc-950/20 flex flex-col divide-y divide-zinc-900 overflow-y-auto shrink-0 select-text text-left">
        
        {/* Autopilot section */}
        <div className="p-6 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center justify-between pb-2 border-b border-zinc-900">
            <span>AI Task Assistant</span>
            <Sparkles className="w-4 h-4 text-violet-400 animate-pulse" />
          </h3>

          <div className="p-4 bg-zinc-900/60 border border-zinc-850 rounded-2xl space-y-3">
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold text-zinc-550 block uppercase tracking-wider">Recommended Next Task</span>
              <span className="text-xs font-extrabold text-zinc-200 block">Review memory management thrashing logic.</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold text-zinc-550 block uppercase tracking-wider">Estimated Completion</span>
              <span className="text-xs font-extrabold text-zinc-200 block">90 minutes • High focus required.</span>
            </div>
          </div>

          <button
            onClick={handleTriggerAutopilot}
            disabled={optimizingAutopilot}
            className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-violet-900/10"
          >
            {optimizingAutopilot ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Sparkles className="w-4.5 h-4.5" />}
            <span>Auto Optimize Tasks</span>
          </button>
        </div>

        {/* AI insights section */}
        <div className="p-6 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Task Insights</h3>
          <div className="space-y-3">
            {[
              { text: 'Completing OS Memory Prep rewards +120 XP.', type: 'xp' },
              { text: 'Pipelining hazards quiz is high priority based on deadline.', type: 'priority' },
              { text: 'Review database index structures before Sunday.', type: 'order' }
            ].map((ins, idx) => (
              <div key={idx} className="p-3 bg-zinc-900/30 border border-zinc-850/60 rounded-xl text-[11px] text-zinc-400 leading-relaxed font-semibold">
                {ins.text}
              </div>
            ))}
          </div>
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
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-350 text-xs focus:outline-none focus:border-violet-500 cursor-pointer"
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
                className="w-full py-2.5 bg-violet-650 hover:bg-violet-600 disabled:opacity-50 text-white font-extrabold rounded-xl transition duration-150 flex items-center justify-center gap-1.5 uppercase text-xs tracking-wider cursor-pointer shadow-md"
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
