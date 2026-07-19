'use client';

import React, { useState } from 'react';
import { 
  useNotesList, useCreateNote, useUpdateNote, 
  useToggleFavorite, useToggleArchive, useToggleSoftDelete 
} from '@/hooks/useNotes';
import { Search, Plus, Pin, Heart, Trash, FileText, Calendar, RotateCcw, Archive } from 'lucide-react';
import { Note } from '@/services/notes';

interface NoteListProps {
  selectedNotebookId: string | null;
  selectedNoteId: string | null;
  onSelectNote: (noteId: string | null) => void;
  activeFilter: 'all' | 'favorites' | 'archived' | 'trash';
  selectedTag: string | null;
  onRequestNewNote?: () => void;
}

export default function NoteList({
  selectedNotebookId,
  selectedNoteId,
  onSelectNote,
  activeFilter,
  selectedTag,
  onRequestNewNote
}: NoteListProps) {
  const [search, setSearch] = useState('');
  const createNoteMutation = useCreateNote();
  const updateNoteMutation = useUpdateNote();
  const toggleFavoriteMutation = useToggleFavorite();
  const toggleArchiveMutation = useToggleArchive();
  const toggleSoftDeleteMutation = useToggleSoftDelete();

  // Load Notes with precise filters
  const { data: notesData, isLoading } = useNotesList({
    notebookId: selectedNotebookId || undefined,
    favorite: activeFilter === 'favorites' ? true : undefined,
    archived: activeFilter === 'archived' ? true : activeFilter === 'all' ? false : undefined,
    deleted: activeFilter === 'trash',
    tag: selectedTag || undefined,
    search: search.trim() || undefined,
  });

  const handleCreateNote = () => {
    if (onRequestNewNote) {
      onRequestNewNote();
    }
  };

  const handleTogglePin = async (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateNoteMutation.mutateAsync({
        noteId: note.id,
        dto: { isPinned: !note.isPinned },
      });
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  };

  const handleToggleFavorite = async (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleFavoriteMutation.mutateAsync(note.id);
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleToggleArchive = async (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleArchiveMutation.mutateAsync(note.id);
      if (selectedNoteId === note.id) {
        onSelectNote(null);
      }
    } catch (err) {
      console.error('Failed to toggle archive:', err);
    }
  };

  const handleToggleTrash = async (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleSoftDeleteMutation.mutateAsync(note.id);
      if (selectedNoteId === note.id) {
        onSelectNote(null);
      }
    } catch (err) {
      console.error('Failed to toggle trash:', err);
    }
  };

  // Helper to format date
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="w-80 border-r border-border/40 bg-zinc-950/40 flex flex-col h-full font-sans text-sm text-zinc-100 select-none">
      {/* Search & Add Header */}
      <div className="p-4 space-y-3 border-b border-border/10">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm tracking-tight capitalize text-zinc-200">
            {selectedTag ? `#${selectedTag}` : activeFilter === 'all' ? 'My Notes' : `${activeFilter} Notes`}
          </h3>
          {activeFilter !== 'trash' && (
            <button
              onClick={handleCreateNote}
              className="p-1 bg-violet-600 hover:bg-violet-750 text-white rounded-lg cursor-pointer transition-colors shadow-sm"
              title="New Note"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-600" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-xs focus:outline-none focus:border-violet-500 text-zinc-200 placeholder:text-zinc-700 transition-colors"
          />
        </div>
      </div>

      {/* Notes Feed */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-20 bg-zinc-900/60 rounded-xl border border-zinc-850/50 animate-pulse" />
            ))}
          </div>
        ) : notesData?.notes && notesData.notes.length > 0 ? (
          notesData.notes.map((note) => {
            const isSelected = selectedNoteId === note.id;

            return (
              <div
                key={note.id}
                onClick={() => onSelectNote(note.id)}
                className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all relative group flex flex-col justify-between h-[100px] ${
                  isSelected
                    ? 'bg-violet-500/10 border-violet-500/30 shadow-[0_4px_12px_rgba(139,92,246,0.08)]'
                    : 'bg-zinc-900/20 hover:bg-zinc-900/40 border-zinc-850 hover:border-zinc-800'
                }`}
              >
                {/* Title and Pin */}
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-semibold text-xs truncate leading-tight group-hover:text-violet-400 transition-colors ${
                      isSelected ? 'text-violet-400' : 'text-zinc-200'
                    }`}>
                      {note.title || 'Untitled Note'}
                    </h4>
                    {note.notebook && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-bold text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-850">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: note.notebook.color }} />
                        {note.notebook.title}
                      </span>
                    )}
                  </div>
                  
                  {activeFilter !== 'trash' && (
                    <button
                      onClick={(e) => handleTogglePin(note, e)}
                      className={`p-0.5 rounded transition-all cursor-pointer ${
                        note.isPinned 
                          ? 'text-violet-500 bg-violet-500/10' 
                          : 'opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-300'
                      }`}
                      title={note.isPinned ? "Unpin Note" : "Pin Note"}
                    >
                      <Pin className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Date and actions */}
                <div className="flex items-center justify-between text-[10px] text-zinc-500 font-medium">
                  <span className="flex items-center gap-1 text-[9px]">
                    <Calendar className="h-3 w-3 text-zinc-600" />
                    {formatDate(note.updatedAt)}
                  </span>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {activeFilter !== 'trash' ? (
                      <>
                        <button
                          onClick={(e) => handleToggleFavorite(note, e)}
                          className={`p-1 rounded hover:bg-zinc-800 transition-colors ${
                            note.favorite ? 'text-rose-500' : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                          title="Toggle favorite"
                        >
                          <Heart className="h-3.5 w-3.5 fill-current" />
                        </button>
                        <button
                          onClick={(e) => handleToggleArchive(note, e)}
                          className={`p-1 rounded hover:bg-zinc-800 transition-colors ${
                            note.archived ? 'text-emerald-500' : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                          title="Toggle archive"
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleToggleTrash(note, e)}
                          className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-red-400 transition-colors"
                          title="Send to Trash"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={(e) => handleToggleTrash(note, e)}
                        className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-violet-400 transition-colors flex items-center gap-1"
                        title="Restore Note"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Restore</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-16 px-4 text-center flex flex-col items-center justify-center border border-dashed border-border/60 rounded-2xl bg-card/10 select-none">
            <FileText className="h-10 w-10 text-muted-foreground/30 mb-3 stroke-[1.25]" />
            <h3 className="font-bold text-xs text-foreground mb-1">No notes found</h3>
            <p className="text-[11px] text-muted-foreground max-w-[200px] leading-relaxed mb-4">
              {activeFilter === 'trash'
                ? 'Your trash is currently empty.'
                : 'Create your first note to start organizing your studies.'}
            </p>
            {activeFilter !== 'trash' && (
              <button
                onClick={handleCreateNote}
                className="flex items-center gap-1 bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-lg text-[10px] font-semibold transition cursor-pointer shadow-sm shadow-primary/20"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Note</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
