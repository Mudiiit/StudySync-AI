'use client';

import React, { useState } from 'react';
import { 
  useNotebooks, useCreateNotebook, useDeleteNotebook, useUpdateNotebook
} from '@/hooks/useNotes';
import { 
  Book, Plus, Folder, Trash, Archive, Heart, Tag, 
  Sparkles, GraduationCap, Code, FileText, Briefcase, 
  ChevronRight, Calendar, Settings, MoreVertical, X, Check, Edit3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/providers/ToastProvider';

// Available customization options for notebooks
const NOTEBOOK_COLORS = [
  { name: 'Violet', hex: '#8B5CF6' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Rose', hex: '#F43F5E' },
  { name: 'Amber', hex: '#F59E0B' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Slate', hex: '#64748B' }
];

const NOTEBOOK_ICONS = [
  { name: 'Book', value: 'book', icon: Book },
  { name: 'Education', value: 'graduation-cap', icon: GraduationCap },
  { name: 'Code', value: 'code', icon: Code },
  { name: 'Notes', value: 'file-text', icon: FileText },
  { name: 'Projects', value: 'briefcase', icon: Briefcase },
  { name: 'AI Sparkles', value: 'sparkles', icon: Sparkles }
];

interface NotebookSidebarProps {
  selectedNotebookId: string | null;
  onSelectNotebook: (id: string | null) => void;
  activeFilter: 'all' | 'favorites' | 'archived' | 'trash';
  onChangeFilter: (filter: 'all' | 'favorites' | 'archived' | 'trash') => void;
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
}

import { useSearchParams } from 'next/navigation';
import ConfirmModal from '@/components/ui/ConfirmModal';

export default function NotebookSidebar({
  selectedNotebookId,
  onSelectNotebook,
  activeFilter,
  onChangeFilter,
  selectedTag,
  onSelectTag
}: NotebookSidebarProps) {
  const searchParams = useSearchParams();
  const action = searchParams?.get('action');

  const { data: notebooks, isLoading } = useNotebooks();
  const createNotebookMutation = useCreateNotebook();
  const deleteNotebookMutation = useDeleteNotebook();
  const updateNotebookMutation = useUpdateNotebook();
  const { showToast } = useToast();

  // Rename states
  const [renameNotebookId, setRenameNotebookId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState('');

  // Create notebook modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newColor, setNewColor] = useState('#8B5CF6');
  const [newIcon, setNewIcon] = useState('book');
  const [newDescription, setNewDescription] = useState('');

  // Dropdowns and menus
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  React.useEffect(() => {
    if (action === 'new_notebook') {
      setShowCreateModal(true);
    }
  }, [action]);

  const handleCreateNotebook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      await createNotebookMutation.mutateAsync({
        title: newTitle.trim(),
        color: newColor,
        icon: newIcon,
        description: newDescription.trim() || undefined
      });
      setNewTitle('');
      setNewDescription('');
      setNewColor('#8B5CF6');
      setNewIcon('book');
      setShowCreateModal(false);
    } catch (err) {
      console.error('Failed to create notebook:', err);
    }
  };

  const handleDeleteNotebook = async (id: string) => {
    try {
      await deleteNotebookMutation.mutateAsync(id);
      if (selectedNotebookId === id) {
        onSelectNotebook(null);
      }
    } catch (err) {
      console.error('Failed to delete notebook:', err);
    }
  };

  const startRename = (notebook: any) => {
    setRenameNotebookId(notebook.id);
    setRenameTitle(notebook.title);
  };

  const cancelRename = () => {
    setRenameNotebookId(null);
    setRenameTitle('');
  };

  const saveRename = async () => {
    if (!renameNotebookId) return;
    const trimmedTitle = renameTitle.trim();
    if (!trimmedTitle) {
      cancelRename();
      return;
    }
    const currentNotebook = notebooks?.find(n => n.id === renameNotebookId);
    if (!currentNotebook) return;

    if (trimmedTitle === currentNotebook.title) {
      cancelRename();
      return;
    }

    // Client side duplicate check
    const isDuplicate = notebooks?.some(
      n => n.id !== renameNotebookId && n.title.toLowerCase() === trimmedTitle.toLowerCase()
    );
    if (isDuplicate) {
      showToast('A notebook with that name already exists.', 'error');
      return;
    }

    try {
      await updateNotebookMutation.mutateAsync({
        notebookId: renameNotebookId,
        dto: { title: trimmedTitle }
      });
      showToast('Notebook renamed successfully', 'success');
      cancelRename();
    } catch (err: any) {
      console.error('Failed to rename notebook:', err);
      const errMsg = err.response?.data?.message || 'Failed to rename notebook';
      showToast(errMsg, 'error');
    }
  };

  // Helper to render dynamically stored icon strings
  const renderIcon = (iconName: string, color: string, className = "h-4 w-4") => {
    const iconObj = NOTEBOOK_ICONS.find(i => i.value === iconName);
    const IconComponent = iconObj ? iconObj.icon : Book;
    return <IconComponent className={className} style={{ color }} />;
  };

  // Deduplicate and aggregate tags from all notebooks if required, or fetch user tags
  // For simplicity, we get standard notebook metrics and quick filters
  return (
    <div className="w-64 border-r border-border/40 bg-zinc-950 flex flex-col h-full shrink-0 select-none font-sans text-zinc-100">
      
      {/* Title Header */}
      <div className="p-5 flex items-center justify-between border-b border-border/10">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-violet-600 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.4)]">
            <Sparkles className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="font-bold tracking-tight text-md">Notes Workspace</span>
        </div>
      </div>

      {/* Main Filter Links Section */}
      <div className="px-3 py-4 space-y-1">
        <button
          onClick={() => {
            onChangeFilter('all');
            onSelectNotebook(null);
            onSelectTag(null);
          }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeFilter === 'all' && !selectedNotebookId && !selectedTag
              ? 'bg-zinc-800 text-white border-l-2 border-violet-500' 
              : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
          }`}
        >
          <FileText className="h-4 w-4" />
          All Notes
        </button>

        <button
          onClick={() => {
            onChangeFilter('favorites');
            onSelectNotebook(null);
            onSelectTag(null);
          }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeFilter === 'favorites' && !selectedNotebookId && !selectedTag
              ? 'bg-zinc-800 text-white border-l-2 border-violet-500' 
              : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
          }`}
        >
          <Heart className="h-4 w-4 text-rose-500" />
          Favorites
        </button>

        <button
          onClick={() => {
            onChangeFilter('archived');
            onSelectNotebook(null);
            onSelectTag(null);
          }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeFilter === 'archived' && !selectedNotebookId && !selectedTag
              ? 'bg-zinc-800 text-white border-l-2 border-violet-500' 
              : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
          }`}
        >
          <Archive className="h-4 w-4 text-emerald-500" />
          Archive
        </button>

        <button
          onClick={() => {
            onChangeFilter('trash');
            onSelectNotebook(null);
            onSelectTag(null);
          }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeFilter === 'trash' && !selectedNotebookId && !selectedTag
              ? 'bg-zinc-800 text-white border-l-2 border-violet-500' 
              : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
          }`}
        >
          <Trash className="h-4 w-4 text-zinc-500" />
          Trash
        </button>
      </div>

      {/* Notebooks List Section */}
      <div className="flex-1 overflow-y-auto px-3 space-y-4">
        
        {/* Notebook Section Header */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1.5 text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
            <span>Notebooks</span>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="p-1 hover:bg-zinc-800 hover:text-zinc-200 rounded transition-colors"
              title="Create Notebook"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-0.5">
            {isLoading ? (
              <div className="px-3 py-2 space-y-2">
                <div className="h-6 bg-zinc-900 rounded-md animate-pulse"></div>
                <div className="h-6 bg-zinc-900 rounded-md animate-pulse w-5/6"></div>
              </div>
            ) : notebooks && notebooks.length > 0 ? (
              notebooks.map(notebook => (
                <div
                  key={notebook.id}
                  onClick={() => {
                    onChangeFilter('all');
                    onSelectNotebook(notebook.id);
                    onSelectTag(null);
                  }}
                  className={`group w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all relative ${
                    selectedNotebookId === notebook.id 
                      ? 'bg-zinc-900 text-white shadow-sm border border-zinc-800' 
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1" onClick={(e) => { if (renameNotebookId === notebook.id) e.stopPropagation(); }}>
                    {renderIcon(notebook.icon, notebook.color, "h-4 w-4 shrink-0")}
                    {renameNotebookId === notebook.id ? (
                      <input
                        type="text"
                        value={renameTitle}
                        onChange={(e) => setRenameTitle(e.target.value)}
                        onBlur={saveRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveRename();
                          if (e.key === 'Escape') cancelRename();
                        }}
                        className="bg-zinc-950 border border-violet-500 rounded px-1.5 py-0.5 text-xs text-zinc-200 focus:outline-none w-full"
                        autoFocus
                      />
                    ) : (
                      <span className="truncate">{notebook.title}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {notebook._count?.notes !== undefined && renameNotebookId !== notebook.id && (
                      <span className="text-[10px] text-zinc-500 font-semibold px-1.5 py-0.5 bg-zinc-800/40 rounded-full">
                        {notebook._count.notes}
                      </span>
                    )}
                    {renameNotebookId !== notebook.id && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); startRename(notebook); }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-500 hover:text-violet-400 rounded transition-all cursor-pointer"
                          title="Rename notebook"
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(notebook.id); }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-500 hover:text-red-400 rounded transition-all cursor-pointer"
                          title="Delete notebook"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-3 py-4 text-center border border-dashed border-zinc-800/50 rounded-xl text-zinc-600 text-[10px] leading-relaxed">
                No notebooks created yet. Click "+" to start organizing.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Creation Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl p-6"
            >
              <div className="flex items-center justify-between mb-5 border-b border-border/10 pb-3">
                <h3 className="font-bold text-sm text-zinc-200">New Notebook</h3>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="text-zinc-400 hover:text-zinc-200 p-1 rounded-lg"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreateNotebook} className="space-y-4 text-xs">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:border-violet-500 placeholder:text-zinc-700"
                    placeholder="e.g. Biology 101, Work Stuff"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Description</label>
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:border-violet-500 placeholder:text-zinc-700 min-h-[60px]"
                    placeholder="Brief description of this notebook..."
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1.5">Color Palette</label>
                  <div className="flex gap-2 flex-wrap">
                    {NOTEBOOK_COLORS.map(c => (
                      <button
                        type="button"
                        key={c.hex}
                        onClick={() => setNewColor(c.hex)}
                        className={`h-6 w-6 rounded-full border flex items-center justify-center transition-transform ${
                          newColor === c.hex ? 'scale-110 border-white' : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: c.hex }}
                      >
                        {newColor === c.hex && <Check className="h-3 w-3 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1.5">Notebook Icon</label>
                  <div className="grid grid-cols-6 gap-2">
                    {NOTEBOOK_ICONS.map(i => {
                      const Icon = i.icon;
                      return (
                        <button
                          type="button"
                          key={i.value}
                          onClick={() => setNewIcon(i.value)}
                          className={`p-2 bg-zinc-950 border rounded-lg flex items-center justify-center transition-all ${
                            newIcon === i.value ? 'border-violet-500 text-violet-500 bg-violet-500/10' : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-2 border border-zinc-800 hover:bg-zinc-850 rounded-lg font-medium text-zinc-400 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-violet-600 hover:bg-violet-750 text-white rounded-lg font-semibold shadow-md shadow-violet-500/20 transition-all"
                  >
                    Create
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <ConfirmModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) handleDeleteNotebook(deleteConfirmId);
        }}
        title="Delete Notebook"
        message="Are you sure you want to delete this notebook? Notes will remain unassigned."
      />
    </div>
  );
}
