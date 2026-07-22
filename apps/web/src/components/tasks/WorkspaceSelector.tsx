'use client';

import React, { useState } from 'react';
import { 
  useWorkspaces, useCreateWorkspace, useUpdateWorkspace, 
  useArchiveWorkspace, useRestoreWorkspace, useDeleteWorkspace, useDuplicateWorkspace
} from '@/hooks/useTasks';
import { 
  ChevronDown, Plus, LayoutGrid, Check, Loader2, MoreVertical, 
  Edit3, Archive, Trash2, Copy, RotateCcw, X 
} from 'lucide-react';
import { useToast } from '@/components/providers/ToastProvider';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface WorkspaceSelectorProps {
  activeWorkspaceId: string | null;
  onSelectWorkspace: (id: string) => void;
}

export default function WorkspaceSelector({
  activeWorkspaceId,
  onSelectWorkspace,
}: WorkspaceSelectorProps) {
  const { showToast } = useToast();
  
  // State for tabs
  const [showArchived, setShowArchived] = useState(false);
  const { data: workspaces, isLoading } = useWorkspaces(showArchived);
  
  const createWorkspaceMutation = useCreateWorkspace();
  const updateWorkspaceMutation = useUpdateWorkspace();
  const archiveWorkspaceMutation = useArchiveWorkspace();
  const restoreWorkspaceMutation = useRestoreWorkspace();
  const deleteWorkspaceMutation = useDeleteWorkspace();
  const duplicateWorkspaceMutation = useDuplicateWorkspace();

  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Rename modal states
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');

  // Delete modal states
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Active workspace metadata
  const activeWorkspace = workspaces?.find((w) => w.id === activeWorkspaceId);

  React.useEffect(() => {
    if (workspaces && workspaces.length > 0 && !activeWorkspaceId) {
      onSelectWorkspace(workspaces[0].id);
    }
  }, [workspaces, activeWorkspaceId, onSelectWorkspace]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const ws = await createWorkspaceMutation.mutateAsync({ name });
      onSelectWorkspace(ws.id);
      setName('');
      setShowAddForm(false);
      showToast('Workspace created successfully', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to create workspace', 'error');
    }
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTargetId || !renameName.trim()) return;
    try {
      await updateWorkspaceMutation.mutateAsync({ id: renameTargetId, name: renameName });
      setRenameTargetId(null);
      setRenameName('');
      showToast('Workspace renamed successfully', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to rename workspace', 'error');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await archiveWorkspaceMutation.mutateAsync(id);
      showToast('Workspace archived', 'success');
    } catch (err) {
      showToast('Failed to archive workspace', 'error');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreWorkspaceMutation.mutateAsync(id);
      showToast('Workspace restored', 'success');
    } catch (err) {
      showToast('Failed to restore workspace', 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteWorkspaceMutation.mutateAsync(deleteTargetId);
      setDeleteTargetId(null);
      showToast('Workspace deleted', 'success');
    } catch (err) {
      showToast('Failed to delete workspace', 'error');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      showToast('Duplicating workspace...', 'info');
      const ws = await duplicateWorkspaceMutation.mutateAsync(id);
      onSelectWorkspace(ws.id);
      showToast('Workspace duplicated successfully!', 'success');
    } catch (err) {
      showToast('Failed to duplicate workspace', 'error');
    }
  };

  return (
    <div className="relative font-sans select-none text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3 py-2 bg-card/25 border border-border/40 hover:border-border rounded-lg text-sm font-semibold text-foreground cursor-pointer transition-colors"
      >
        <LayoutGrid className="h-4.5 w-4.5 text-primary shrink-0" />
        <span className="truncate max-w-[120px]">
          {isLoading ? 'Loading...' : activeWorkspace ? activeWorkspace.name : 'Select Workspace'}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-45" onClick={() => setIsOpen(false)} />
          
          <div className="absolute left-0 mt-2 w-72 bg-card border border-border/40 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.3)] z-50 overflow-hidden py-1">
            
            {/* Active vs Archived tabs selector */}
            <div className="flex border-b border-border/20 px-1 py-1">
              <button
                onClick={() => setShowArchived(false)}
                className={`flex-1 text-[10px] font-bold uppercase tracking-wider py-1 rounded text-center cursor-pointer ${
                  !showArchived ? 'bg-secondary/40 text-foreground' : 'text-muted-foreground'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setShowArchived(true)}
                className={`flex-1 text-[10px] font-bold uppercase tracking-wider py-1 rounded text-center cursor-pointer ${
                  showArchived ? 'bg-secondary/40 text-foreground' : 'text-muted-foreground'
                }`}
              >
                Archived
              </button>
            </div>

            {/* List */}
            <div className="max-h-48 overflow-y-auto py-1 space-y-0.5">
              {workspaces?.map((ws) => (
                <div 
                  key={ws.id}
                  className="flex items-center justify-between px-3 py-1.5 hover:bg-secondary/40 group/item transition-colors"
                >
                  <button
                    onClick={() => {
                      if (!ws.isArchived) {
                        onSelectWorkspace(ws.id);
                        setIsOpen(false);
                      }
                    }}
                    className="flex-1 text-xs text-muted-foreground hover:text-foreground text-left truncate font-medium cursor-pointer"
                  >
                    {ws.name}
                  </button>

                  <div className="flex items-center gap-1">
                    {ws.id === activeWorkspaceId && !ws.isArchived && (
                      <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    )}

                    {/* Quick actions popup context dropdown */}
                    <div className="relative group/menu">
                      <button className="p-1 hover:bg-zinc-800 rounded opacity-0 group-hover/item:opacity-100 transition-opacity cursor-pointer text-zinc-400 hover:text-white">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </button>
                      
                      <div className="hidden group-hover/menu:block absolute right-0 top-6 w-36 bg-zinc-950 border border-zinc-850 rounded-lg shadow-xl py-1 z-50">
                        <button
                          onClick={() => {
                            setRenameTargetId(ws.id);
                            setRenameName(ws.name);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] text-zinc-300 hover:bg-zinc-900 text-left font-semibold cursor-pointer"
                        >
                          <Edit3 className="h-3 w-3" />
                          Rename
                        </button>

                        {!ws.isArchived ? (
                          <button
                            onClick={() => handleArchive(ws.id)}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] text-zinc-300 hover:bg-zinc-900 text-left font-semibold cursor-pointer"
                          >
                            <Archive className="h-3 w-3" />
                            Archive
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRestore(ws.id)}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] text-zinc-300 hover:bg-zinc-900 text-left font-semibold cursor-pointer"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Restore
                          </button>
                        )}

                        <button
                          onClick={() => handleDuplicate(ws.id)}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] text-zinc-300 hover:bg-zinc-900 text-left font-semibold cursor-pointer"
                        >
                          <Copy className="h-3 w-3" />
                          Duplicate
                        </button>

                        <button
                          onClick={() => setDeleteTargetId(ws.id)}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] text-red-400 hover:bg-red-950/20 text-left font-semibold cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="h-[1px] bg-border/40 my-1" />

            {/* Create option */}
            {!showAddForm ? (
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-primary hover:bg-primary/5 font-semibold text-left transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                New Workspace
              </button>
            ) : (
              <form onSubmit={handleSubmit} className="p-3 space-y-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Workspace name..."
                  className="w-full px-2.5 py-1.5 rounded border border-border bg-background text-xs focus:outline-none focus:border-primary text-foreground"
                  autoFocus
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground rounded cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createWorkspaceMutation.isPending}
                    className="px-2 py-1 bg-primary text-primary-foreground text-[10px] rounded font-bold cursor-pointer"
                  >
                    {createWorkspaceMutation.isPending ? 'Saving...' : 'Create'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </>
      )}

      {/* Rename Dialog Modal */}
      {renameTargetId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0d0d11] border border-zinc-850 rounded-2xl p-5 space-y-4 shadow-xl text-left select-text">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
              <h3 className="text-xs font-black text-white uppercase tracking-wider">Rename Workspace</h3>
              <button onClick={() => setRenameTargetId(null)} className="text-zinc-500 hover:text-zinc-300">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleRenameSubmit} className="space-y-3">
              <input
                type="text"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                placeholder="Rename target..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 text-xs focus:outline-none focus:border-violet-500"
                autoFocus
              />
              <div className="flex justify-end gap-2 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setRenameTargetId(null)}
                  className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-lg text-zinc-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateWorkspaceMutation.isPending}
                  className="px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg"
                >
                  {updateWorkspaceMutation.isPending ? 'Renaming...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Workspace Dialog Modal */}
      <ConfirmModal
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Workspace"
        message="Deleting this workspace will archive all associated projects, tasks, milestones, analytics, and activity history. This action can be restored if archive mode is enabled."
      />
    </div>
  );
}
