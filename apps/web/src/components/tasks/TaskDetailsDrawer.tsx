'use client';

import React, { useState } from 'react';
import { 
  useTaskDetails, useUpdateTask, useDeleteTask, 
  useAddComment, useAddChecklistItem, useToggleChecklistItem, 
  useAddDependency, useRemoveDependency, useAiBreakdown, useProjects, useTasksList,
  useCreateChecklist, useCheckPrerequisites, useEstimateDuration, useAddTimeLog,
  useTimeLogs, useFocusContext
} from '@/hooks/useTasks';
import { 
  X, CheckSquare, Trash2, Calendar, AlertCircle, 
  MessageSquare, Sparkles, Plus, Check, Loader2, ArrowRight, CornerDownLeft,
  Clock, Play, BookOpen, HelpCircle, ShieldAlert, BadgeInfo
} from 'lucide-react';
import { TaskStatus, TaskPriority } from '@studysync/database';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useToast } from '@/components/providers/ToastProvider';
import Link from 'next/link';

interface TaskDetailsDrawerProps {
  taskId: string;
  onClose: () => void;
}

export default function TaskDetailsDrawer({ taskId, onClose }: TaskDetailsDrawerProps) {
  const { showToast } = useToast();
  const { data: task, isLoading } = useTaskDetails(taskId);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();
  const addCommentMutation = useAddComment();
  const addChecklistItemMutation = useAddChecklistItem();
  const toggleChecklistItemMutation = useToggleChecklistItem();
  const addDependencyMutation = useAddDependency();
  const removeDependencyMutation = useRemoveDependency();
  const aiBreakdownMutation = useAiBreakdown();
  const createChecklistMutation = useCreateChecklist();
  
  // Sprint 4 new hooks
  const { data: prereqCheck } = useCheckPrerequisites(taskId);
  const estimateDurationMutation = useEstimateDuration();
  const addTimeLogMutation = useAddTimeLog();
  const { data: timeLogs } = useTimeLogs(taskId);
  const { data: focusContext } = useFocusContext(taskId);

  const [commentText, setCommentText] = useState('');
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [selectedDepId, setSelectedDepId] = useState('');
  
  // Time Logging state
  const [logMins, setLogMins] = useState(30);
  const [logNotes, setLogNotes] = useState('');

  const { data: projects } = useProjects(task?.workspaceId || null);
  const { data: siblingTasks } = useTasksList({
    workspaceId: task?.workspaceId || null,
    limit: 100,
  });

  if (isLoading) {
    return (
      <div className="w-96 border-l border-border/40 bg-[#0d0d11]/90 flex flex-col h-full items-center justify-center p-8 select-none">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground mt-2 font-sans">Loading details...</span>
      </div>
    );
  }

  if (!task) return null;

  const handleUpdate = (fields: Partial<any>) => {
    updateTaskMutation.mutate({ taskId, dto: fields });
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      await addCommentMutation.mutateAsync({ taskId, content: commentText });
      setCommentText('');
    } catch (e) {
      // Ignored
    }
  };

  const handleAddSubtask = async (e: React.FormEvent, checklistId: string) => {
    e.preventDefault();
    if (!subtaskTitle.trim()) return;
    try {
      await addChecklistItemMutation.mutateAsync({ 
        taskId, 
        checklistId, 
        title: subtaskTitle 
      });
      setSubtaskTitle('');
    } catch (e) {
      // Ignored
    }
  };

  const handleAddDependency = async () => {
    if (!selectedDepId) return;
    try {
      await addDependencyMutation.mutateAsync({ taskId, dependsOnId: selectedDepId });
      setSelectedDepId('');
    } catch (err) {
      showToast('Circular dependency detected! Operation rejected to prevent dependency loops.', 'error');
    }
  };

  const handleLogTime = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addTimeLogMutation.mutateAsync({
        taskId,
        durationMins: Number(logMins),
        notes: logNotes,
      });
      setLogNotes('');
      showToast('Time log added successfully', 'success');
    } catch (err) {
      showToast('Failed to log study duration', 'error');
    }
  };

  const handleDelete = async () => {
    await deleteTaskMutation.mutateAsync(taskId);
    onClose();
  };

  const existingDepIds = task.dependencies?.map((d) => d.dependsOnId) || [];
  const dependencyCandidates = siblingTasks?.tasks?.filter(
    (t) => t.id !== taskId && !existingDepIds.includes(t.id)
  ) || [];

  const firstChecklist = task.checklists && task.checklists.length > 0 ? task.checklists[0] : null;

  return (
    <div className="w-96 border-l border-border/40 bg-[#0d0d11]/90 flex flex-col h-full font-sans text-xs text-left overflow-hidden select-none">
      
      {/* Header Panel */}
      <div className="p-4 border-b border-border/40 flex items-center justify-between bg-card/25">
        <h3 className="font-bold text-sm tracking-tight text-foreground flex items-center gap-1.5">
          <CheckSquare className="h-4.5 w-4.5 text-primary" />
          Task Inspector
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDeleteConfirmOpen(true)}
            className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
            title="Delete Task"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        
        {/* Prerequisite Unmet Dependencies Warning */}
        {prereqCheck?.hasUnmetDependencies && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2 text-amber-400">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-[10px] uppercase tracking-wider">Prerequisites Incomplete</p>
              <p className="text-[11px] mt-0.5 opacity-90 leading-normal">
                Prerequisites must be completed before starting this: 
                <span className="font-bold ml-1">
                  {prereqCheck.unmetPrerequisites.map((p) => p.title).join(', ')}
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Title & Description inputs */}
        <div className="space-y-3">
          <input
            type="text"
            defaultValue={task.title}
            onBlur={(e) => handleUpdate({ title: e.target.value })}
            className="w-full bg-transparent border-0 font-bold text-base text-foreground focus:outline-none focus:ring-0 p-0 placeholder:text-muted-foreground/30"
            placeholder="Task title..."
          />
          <textarea
            defaultValue={task.description || ''}
            onBlur={(e) => handleUpdate({ description: e.target.value })}
            className="w-full bg-transparent border border-border/20 rounded-lg p-2.5 min-h-[80px] focus:outline-none focus:border-border text-foreground leading-relaxed"
            placeholder="Add task details description here..."
          />
        </div>

        {/* Task Attributes Dropdowns */}
        <div className="grid grid-cols-2 gap-3 bg-secondary/10 p-3 rounded-xl border border-border/20">
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Status</label>
            <select
              value={task.status}
              onChange={(e) => handleUpdate({ status: e.target.value as TaskStatus })}
              className="w-full bg-card border border-border/40 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary text-foreground font-semibold cursor-pointer"
            >
              <option value="TODO">Todo</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="REVIEW">Review</option>
              <option value="DONE">Done</option>
            </select>
          </div>

          <div>
            <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Priority</label>
            <select
              value={task.priority}
              onChange={(e) => handleUpdate({ priority: e.target.value as TaskPriority })}
              className="w-full bg-card border border-border/40 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary text-foreground font-semibold cursor-pointer"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          <div>
            <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Difficulty</label>
            <select
              value={(task as any).difficulty || 'MEDIUM'}
              onChange={(e) => handleUpdate({ difficulty: e.target.value })}
              className="w-full bg-card border border-border/40 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary text-foreground font-semibold cursor-pointer"
            >
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>

          <div>
            <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Project</label>
            <select
              value={task.projectId || ''}
              onChange={(e) => handleUpdate({ projectId: e.target.value || null })}
              className="w-full bg-card border border-border/40 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary text-foreground font-semibold cursor-pointer"
            >
              <option value="">No Project</option>
              {projects?.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Due Date</label>
            <input
              type="date"
              defaultValue={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
              onChange={(e) => handleUpdate({ dueDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
              className="w-full bg-card border border-border/40 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary text-foreground font-semibold cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
              AI Priority
              <span title="Computed by StudySync AI priority score engine.">
                <BadgeInfo className="h-3 w-3 text-muted-foreground" />
              </span>
            </label>
            <div className="w-full bg-card border border-border/40 rounded px-2.5 py-1.5 text-xs text-foreground font-bold flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-violet-400" />
              <span>{(task as any).aiPriorityScore || 50}/100</span>
            </div>
          </div>
        </div>

        {/* Focus Mode Panel */}
        <div className="p-3 bg-violet-600/10 border border-violet-500/20 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-[10px] uppercase tracking-wider text-violet-400 flex items-center gap-1">
              <Play className="h-3.5 w-3.5 fill-violet-400" /> Launch Focus Session
            </h4>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
            <Link
              href={focusContext?.tutorConvId ? `/tutor?conversationId=${focusContext.tutorConvId}` : '/tutor'}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:border-violet-500/40 rounded-lg text-center flex items-center justify-center gap-1.5 text-zinc-300 hover:text-white transition-colors"
            >
              <Sparkles className="h-3 w-3 text-violet-400" />
              Open Tutor
            </Link>
            <Link
              href={focusContext?.noteId ? `/notes?id=${focusContext.noteId}` : '/notes'}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:border-violet-500/40 rounded-lg text-center flex items-center justify-center gap-1.5 text-zinc-300 hover:text-white transition-colors"
            >
              <BookOpen className="h-3 w-3 text-violet-400" />
              Open Notes
            </Link>
            <Link
              href={focusContext?.quizId ? `/quizzes/${focusContext.quizId}/play` : '/quizzes'}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:border-violet-500/40 rounded-lg text-center flex items-center justify-center gap-1.5 text-zinc-300 hover:text-white transition-colors"
            >
              <HelpCircle className="h-3 w-3 text-violet-400" />
              Open Quiz
            </Link>
            <Link
              href="/pomodoro"
              className="p-2 bg-zinc-900 border border-zinc-800 hover:border-violet-500/40 rounded-lg text-center flex items-center justify-center gap-1.5 text-zinc-300 hover:text-white transition-colors"
            >
              <Clock className="h-3 w-3 text-violet-400" />
              Start Pomodoro
            </Link>
          </div>
        </div>

        {/* AI Duration Estimator & Logging */}
        <div className="space-y-3 bg-[#070708]/60 p-3 rounded-xl border border-border/20">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Clock className="h-4 w-4 text-primary" /> Duration & Time logs
            </h4>
            <button
              onClick={() => estimateDurationMutation.mutate(taskId)}
              disabled={estimateDurationMutation.isPending}
              className="flex items-center gap-1 text-[9px] font-bold text-violet-400 border border-violet-500/20 hover:bg-violet-600/5 px-2 py-0.5 rounded transition-colors disabled:opacity-50"
            >
              {estimateDurationMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              AI Estimate
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-[11px] font-semibold text-zinc-400">
            <div>
              <span>Estimated:</span>
              <input
                type="number"
                value={task.estimatedMinutes || 60}
                onChange={(e) => handleUpdate({ estimatedMinutes: Number(e.target.value) })}
                className="w-full bg-zinc-900/60 border border-zinc-800/80 rounded px-2 py-1 text-zinc-200 mt-1 focus:outline-none"
              />
            </div>
            <div>
              <span>Spent (Mins):</span>
              <div className="w-full bg-zinc-900/40 border border-zinc-800/40 rounded px-2 py-1.5 text-zinc-300 mt-1 font-bold">
                {timeLogs?.reduce((acc: number, log: any) => acc + log.durationMins, 0) || 0} mins
              </div>
            </div>
          </div>

          {/* Time Logging Form */}
          <form onSubmit={handleLogTime} className="flex gap-2 items-end pt-1">
            <div className="flex-1">
              <span className="text-[10px] text-zinc-400 block mb-1">Mins</span>
              <input
                type="number"
                value={logMins}
                onChange={(e) => setLogMins(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200 text-xs focus:outline-none"
              />
            </div>
            <div className="flex-[2]">
              <span className="text-[10px] text-zinc-400 block mb-1">Study Notes</span>
              <input
                type="text"
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
                placeholder="Topic focus description..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200 text-xs focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-lg"
            >
              Log
            </button>
          </form>
        </div>

        {/* Circular Dependency preventions */}
        <div className="space-y-2">
          <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Dependencies</h4>
          <div className="flex gap-2">
            <select
              value={selectedDepId}
              onChange={(e) => setSelectedDepId(e.target.value)}
              className="flex-1 bg-card border border-border/40 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-primary text-foreground font-medium cursor-pointer"
            >
              <option value="">Add Prerequisite...</option>
              {dependencyCandidates.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
            <button
              onClick={handleAddDependency}
              className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg cursor-pointer transition-colors shadow-sm shrink-0"
            >
              Link
            </button>
          </div>

          {/* Mapped dependencies list */}
          <div className="space-y-1 mt-1">
            {task.dependencies?.map((dep) => (
              <div key={dep.dependsOnId} className="flex justify-between items-center bg-secondary/15 p-2 rounded-lg border border-border/20">
                <span className="font-medium text-muted-foreground truncate max-w-[200px]">{dep.dependsOn.title}</span>
                <button
                  onClick={() => removeDependencyMutation.mutate({ taskId, dependsOnId: dep.dependsOnId })}
                  className="text-muted-foreground hover:text-destructive cursor-pointer transition-colors text-[10px] font-semibold"
                >
                  Unlink
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Checklist Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Subtask Checklist</h4>
            <button
              onClick={() => aiBreakdownMutation.mutate(taskId)}
              disabled={aiBreakdownMutation.isPending}
              className="flex items-center gap-1 text-[10px] font-bold text-primary hover:bg-primary/5 px-2 py-1 rounded transition-colors disabled:opacity-50 cursor-pointer border border-primary/20"
            >
              {aiBreakdownMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3 text-primary animate-pulse" />
              )}
              AI Breakdown
            </button>
          </div>

          {/* Inline subtask list */}
          {firstChecklist ? (
            <div className="space-y-2">
              {firstChecklist.items.map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-left">
                  <input
                    type="checkbox"
                    checked={item.isCompleted}
                    onChange={() => toggleChecklistItemMutation.mutate({ taskId, itemId: item.id, isCompleted: !item.isCompleted })}
                    className="h-3.5 w-3.5 rounded border-border/50 text-primary cursor-pointer"
                  />
                  <span className={`text-xs font-semibold ${item.isCompleted ? 'line-through text-muted-foreground/60' : 'text-foreground'}`}>
                    {item.title}
                  </span>
                </div>
              ))}

              {/* Inline input to append check item */}
              <form onSubmit={(e) => handleAddSubtask(e, firstChecklist.id)} className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  value={subtaskTitle}
                  onChange={(e) => setSubtaskTitle(e.target.value)}
                  placeholder="Add item..."
                  className="flex-1 bg-transparent border-b border-border/20 py-1 focus:outline-none focus:border-primary text-foreground"
                />
              </form>
            </div>
          ) : (
            <button
              onClick={() => updateTaskMutation.mutateAsync({ taskId, dto: {} }).then(() => {
                createChecklistMutation.mutate({ taskId, title: 'Subtasks' });
              })}
              className="w-full py-2 hover:bg-secondary/40 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer transition-colors border border-dashed border-border/40 text-center"
            >
              Add Checklist Section
            </button>
          )}
        </div>

        {/* Comments Feed section */}
        <div className="space-y-3.5 pt-2 border-t border-border/30">
          <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1 select-none">
            <MessageSquare className="h-4 w-4" />
            Comments
          </h4>

          {/* Comments Feed */}
          <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
            {task.comments?.map((c) => (
              <div key={c.id} className="p-2.5 bg-secondary/15 rounded-xl border border-border/30 space-y-1">
                <div className="flex justify-between items-center text-[10px] text-muted-foreground select-none">
                  <span className="font-semibold text-foreground">
                    {c.user?.profile?.firstName || 'User'} {c.user?.profile?.lastName || ''}
                  </span>
                  <span>{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-xs text-muted-foreground/90 whitespace-pre-wrap leading-relaxed select-text">{c.content}</p>
              </div>
            ))}
          </div>

          {/* Form to submit comment */}
          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 bg-card border border-border/40 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary text-foreground"
            />
            <button
              type="submit"
              className="p-1.5 bg-primary hover:bg-primary/95 text-primary-foreground rounded-lg cursor-pointer transition-colors shadow-sm"
            >
              <CornerDownLeft className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Task"
        message="Are you sure you want to delete this task?"
      />
    </div>
  );
}
