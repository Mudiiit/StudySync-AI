'use client';

import React, { useState } from 'react';
import { useFolders, useCreateFolder, useDeleteFolder } from '@/hooks/useNotes';
import { Folder, FolderPlus, Trash2, ChevronRight, ChevronDown, FileText, Pin, Heart, Trash } from 'lucide-react';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface FolderSidebarProps {
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  activeFilter: 'all' | 'pinned' | 'favorites' | 'trash';
  onChangeFilter: (filter: 'all' | 'pinned' | 'favorites' | 'trash') => void;
}

export default function FolderSidebar({
  selectedFolderId,
  onSelectFolder,
  activeFilter,
  onChangeFilter,
}: FolderSidebarProps) {
  const { data: folders, isLoading } = useFolders();
  const createFolderMutation = useCreateFolder();
  const deleteFolderMutation = useDeleteFolder();
  
  const [newFolderName, setNewFolderName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await createFolderMutation.mutateAsync({ name: newFolderName, parentId: null });
      setNewFolderName('');
      setShowCreateInput(false);
    } catch (err) {
      // Ignored
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    try {
      await deleteFolderMutation.mutateAsync(folderId);
      if (selectedFolderId === folderId) {
        onSelectFolder(null);
      }
    } catch (err) {
      // Ignored
    }
  };

  const toggleCollapse = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  const handleSelectFolder = (folderId: string) => {
    onChangeFilter('all'); // reset standard filters when selecting a specific folder
    onSelectFolder(folderId);
  };

  return (
    <div className="w-64 border-r border-border/40 bg-card/10 flex flex-col h-full font-sans text-sm">
      {/* Navigation Groups */}
      <div className="p-4 space-y-1 select-none">
        <button
          onClick={() => { onChangeFilter('all'); onSelectFolder(null); }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left font-medium transition-colors cursor-pointer ${
            activeFilter === 'all' && selectedFolderId === null
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
          }`}
        >
          <FileText className="h-4.5 w-4.5" />
          All Notes
        </button>

        <button
          onClick={() => { onChangeFilter('pinned'); onSelectFolder(null); }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left font-medium transition-colors cursor-pointer ${
            activeFilter === 'pinned'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
          }`}
        >
          <Pin className="h-4.5 w-4.5" />
          Pinned
        </button>

        <button
          onClick={() => { onChangeFilter('favorites'); onSelectFolder(null); }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left font-medium transition-colors cursor-pointer ${
            activeFilter === 'favorites'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
          }`}
        >
          <Heart className="h-4.5 w-4.5" />
          Favorites
        </button>

        <button
          onClick={() => { onChangeFilter('trash'); onSelectFolder(null); }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left font-medium transition-colors cursor-pointer ${
            activeFilter === 'trash'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
          }`}
        >
          <Trash className="h-4.5 w-4.5" />
          Trash Bin
        </button>
      </div>

      <div className="h-[1px] bg-border/40 mx-4 my-2" />

      {/* Folders header */}
      <div className="px-4 py-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground select-none">
        <span>Folders</span>
        <button
          onClick={() => setShowCreateInput(!showCreateInput)}
          className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <FolderPlus className="h-4 w-4" />
        </button>
      </div>

      {/* New Folder Inline Form */}
      {showCreateInput && (
        <form onSubmit={handleCreateFolder} className="px-4 py-2">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            className="w-full px-2 py-1.5 rounded border border-border bg-card text-xs focus:outline-none focus:border-primary text-foreground"
            placeholder="Folder name..."
            autoFocus
          />
        </form>
      )}

      {/* Folders List */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5 text-left">
        {isLoading ? (
          <div className="py-8 text-center text-xs text-muted-foreground animate-pulse uppercase tracking-wider">
            Loading folders...
          </div>
        ) : folders && folders.length > 0 ? (
          folders.map((folder) => {
            const isSelected = selectedFolderId === folder.id;
            const isCollapsed = collapsedFolders[folder.id];

            return (
              <div key={folder.id} className="space-y-0.5">
                <div
                  onClick={() => handleSelectFolder(folder.id)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer group text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <button
                      onClick={(e) => toggleCollapse(folder.id, e)}
                      className="p-0.5 hover:bg-secondary/40 rounded transition-colors text-muted-foreground"
                    >
                      {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                    <Folder className="h-4 w-4 shrink-0" />
                    <span className="truncate">{folder.name}</span>
                  </div>
                  
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(folder.id); }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-secondary rounded text-muted-foreground hover:text-destructive transition-all cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>

                {/* Subfolders or children rendering can go here if supporting deep nested structures */}
              </div>
            );
          })
        ) : (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No folders created
          </div>
        )}
      </div>
      <ConfirmModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) handleDeleteFolder(deleteConfirmId);
        }}
        title="Delete Folder"
        message="Are you sure you want to delete this folder? All notes inside will be unassigned."
      />
    </div>
  );
}
