'use client';

import React, { useState } from 'react';
import { useProjects, useCreateProject } from '@/hooks/useTasks';
import { Layers, Folder, Plus, Check } from 'lucide-react';

interface ProjectSelectorProps {
  activeWorkspaceId: string | null;
  selectedProjectId: string | null;
  onSelectProject: (id: string | null) => void;
}

export default function ProjectSelector({
  activeWorkspaceId,
  selectedProjectId,
  onSelectProject,
}: ProjectSelectorProps) {
  const { data: projects, isLoading } = useProjects(activeWorkspaceId);
  const createProjectMutation = useCreateProject();
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !activeWorkspaceId) return;
    try {
      const p = await createProjectMutation.mutateAsync({
        workspaceId: activeWorkspaceId,
        name,
      });
      onSelectProject(p.id);
      setName('');
      setShowAddForm(false);
    } catch (e) {
      // Ignored
    }
  };

  return (
    <div className="w-56 border-r border-border/40 bg-card/5 flex flex-col h-full font-sans text-xs p-4 select-none text-left">
      <div className="flex items-center justify-between mb-4">
        <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Projects</span>
        {activeWorkspaceId && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="p-0.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleCreate} className="mb-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name..."
            className="w-full px-2 py-1.5 rounded border border-border bg-card text-xs focus:outline-none focus:border-primary text-foreground"
            autoFocus
          />
        </form>
      )}

      {/* Projects List Links */}
      <div className="flex-1 overflow-y-auto space-y-1">
        <button
          onClick={() => onSelectProject(null)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left font-medium transition-colors cursor-pointer ${
            selectedProjectId === null
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
          }`}
        >
          <span className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            All Projects
          </span>
          {selectedProjectId === null && <Check className="h-3.5 w-3.5" />}
        </button>

        {isLoading ? (
          <div className="py-4 text-center text-[10px] text-muted-foreground animate-pulse uppercase tracking-wider">
            Loading projects...
          </div>
        ) : projects && projects.length > 0 ? (
          projects.map((proj) => {
            const isSelected = selectedProjectId === proj.id;
            return (
              <button
                key={proj.id}
                onClick={() => onSelectProject(proj.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left font-medium transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
                }`}
              >
                <span className="flex items-center gap-2 truncate pr-2">
                  <Folder className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                  <span className="truncate">{proj.name}</span>
                </span>
                {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>
            );
          })
        ) : (
          <div className="py-8 text-center text-[10px] text-muted-foreground italic">
            No projects found
          </div>
        )}
      </div>
    </div>
  );
}
