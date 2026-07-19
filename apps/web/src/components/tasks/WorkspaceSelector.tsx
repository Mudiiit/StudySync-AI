'use client';

import React, { useState } from 'react';
import { useWorkspaces, useCreateWorkspace } from '@/hooks/useTasks';
import { ChevronDown, Plus, LayoutGrid, Check, Loader2 } from 'lucide-react';

interface WorkspaceSelectorProps {
  activeWorkspaceId: string | null;
  onSelectWorkspace: (id: string) => void;
}

export default function WorkspaceSelector({
  activeWorkspaceId,
  onSelectWorkspace,
}: WorkspaceSelectorProps) {
  const { data: workspaces, isLoading } = useWorkspaces();
  const createWorkspaceMutation = useCreateWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const activeWorkspace = workspaces?.find((w) => w.id === activeWorkspaceId);

  // Auto-select first workspace on load if none selected
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
    } catch (e) {
      // Ignored
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
          {/* Overlay to click off */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          
          <div className="absolute left-0 mt-2 w-64 bg-card border border-border/40 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.3)] z-50 overflow-hidden py-1">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Workspaces
            </div>

            {/* List */}
            <div className="max-h-48 overflow-y-auto py-1">
              {workspaces?.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => {
                    onSelectWorkspace(ws.id);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/40 text-left transition-colors cursor-pointer"
                >
                  <span className="truncate font-medium">{ws.name}</span>
                  {ws.id === activeWorkspaceId && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                </button>
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
    </div>
  );
}
