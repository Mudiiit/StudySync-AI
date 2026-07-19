'use client';

import React, { useState, useEffect } from 'react';
import { useNoteDetails, useUpdateNote, useCreateNote, useNotebooks } from '@/hooks/useNotes';
import NotebookSidebar from '@/components/notes/NotebookSidebar';
import NoteList from '@/components/notes/NoteList';
import CodeMirrorEditor from '@/components/notes/CodeMirrorEditor';
import RightPropertiesSidebar from '@/components/notes/RightPropertiesSidebar';
import VersionHistoryPanel from '@/components/notes/VersionHistoryPanel';
import CommentsSidebar from '@/components/notes/CommentsSidebar';
import SharingModal from '@/components/notes/SharingModal';
import GenerateFlashcardsModal from '@/components/flashcards/GenerateFlashcardsModal';
import { Sparkles, History, FileText, Plus, Pin, Heart, Trash, X, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import notesService from '@/services/notes';
import { useToast } from '@/components/providers/ToastProvider';
import { useSearchParams } from 'next/navigation';

export default function NotesPage() {
  const searchParams = useSearchParams();
  const action = searchParams?.get('action');
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'favorites' | 'archived' | 'trash'>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Right sidebar toggle: show properties or version history
  const [showVersionPanel, setShowVersionPanel] = useState(false);
  const [showCommentsSidebar, setShowCommentsSidebar] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [activeSelection, setActiveSelection] = useState<{ from: number; to: number; text: string } | null>(null);
  const [commentsCount, setCommentsCount] = useState(0);
  const [jumpRange, setJumpRange] = useState<{ from: number; to: number } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [lastFailedAction, setLastFailedAction] = useState<string | null>(null);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  
  // New Note Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createNoteTitle, setCreateNoteTitle] = useState('');
  const [createNoteNotebookId, setCreateNoteNotebookId] = useState<string | null>(null);
  const [shouldFocusEditor, setShouldFocusEditor] = useState(false);
  const { showToast } = useToast();

  // Load Note Details
  const { data: note, isLoading: loadingDetails, refetch: refetchDetails } = useNoteDetails(selectedNoteId);
  const { data: notebooks } = useNotebooks();
  const updateNoteMutation = useUpdateNote();
  const createNoteMutation = useCreateNote();

  const [liveContent, setLiveContent] = useState<string>('');

  useEffect(() => {
    if (note) {
      setLiveContent(note.autoSaveContent || note.content || '');
    } else {
      setLiveContent('');
    }
  }, [note?.id, note?.content, note?.autoSaveContent]);

  useEffect(() => {
    if (shouldFocusEditor && selectedNoteId) {
      setShouldFocusEditor(false);
    }
  }, [shouldFocusEditor, selectedNoteId]);

  useEffect(() => {
    if (action === 'new') {
      handleCreateNoteFromEmpty();
    }
  }, [action]);

  const handleContentChange = (content: string) => {
    setLiveContent(content);
  };

  const handleCreateNoteFromEmpty = () => {
    setCreateNoteTitle('');
    setCreateNoteNotebookId(selectedNotebookId);
    setIsCreateModalOpen(true);
  };

  const submitCreateNote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      const finalTitle = createNoteTitle.trim() || 'Untitled Note';
      const newNote = await createNoteMutation.mutateAsync({
        title: finalTitle,
        content: '',
        notebookId: createNoteNotebookId,
        favorite: activeFilter === 'favorites',
        archived: activeFilter === 'archived',
        deleted: activeFilter === 'trash',
        tags: selectedTag ? [selectedTag] : [],
      });
      setSelectedNoteId(newNote.id);
      setIsCreateModalOpen(false);
      setShouldFocusEditor(true);
      showToast('Note created successfully', 'success');
    } catch (err) {
      console.error('Failed to create note:', err);
      showToast('Failed to create note', 'error');
    }
  };

  const handleRunAiAction = async (action: string) => {
    console.log('[NotesPage] handleRunAiAction started with action:', action);
    console.log('[NotesPage] selectedNoteId:', selectedNoteId, 'note:', note);
    if (!selectedNoteId || !note) {
      console.warn('[NotesPage] Early return: selectedNoteId or note is falsy!');
      return;
    }

    console.log('[NotesPage] Setting aiLoading = true');
    setAiLoading(true);
    setAiError(null);
    setLastFailedAction(null);
    try {
      console.log(`[NotesPage] Calling API client notesService.processAiAction with noteId: ${selectedNoteId}, action: ${action}`);
      await notesService.processAiAction(selectedNoteId, action);
      console.log('[NotesPage] Action execution succeeded, refetching note details...');
      await refetchDetails();
      console.log('[NotesPage] Note details refetched successfully');
    } catch (err: any) {
      console.error(`[NotesPage] AI execution failed for action ${action} with error:`, err);
      const errMsg = err.response?.data?.message || err.message || 'Something went wrong while generating AI content.';
      setAiError(errMsg);
      setLastFailedAction(action);
      showToast(`AI Assistant Error: ${errMsg}`, 'error');
    } finally {
      console.log('[NotesPage] Setting aiLoading = false');
      setAiLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 flex divide-x divide-border/10 overflow-hidden bg-zinc-950">
      
      {/* Dynamic Notebooks & Filter Sidebar */}
      <NotebookSidebar
        selectedNotebookId={selectedNotebookId}
        onSelectNotebook={setSelectedNotebookId}
        activeFilter={activeFilter}
        onChangeFilter={setActiveFilter}
        selectedTag={selectedTag}
        onSelectTag={setSelectedTag}
      />

      {/* Unified Notes Feed */}
      <NoteList
        selectedNotebookId={selectedNotebookId}
        selectedNoteId={selectedNoteId}
        onSelectNote={setSelectedNoteId}
        activeFilter={activeFilter}
        selectedTag={selectedTag}
        onRequestNewNote={handleCreateNoteFromEmpty}
      />

      {/* Editor Center Workspace */}
      <div className="flex-1 flex flex-col min-w-0 bg-zinc-950 relative h-full">
        {selectedNoteId && note ? (
          <div className="flex-1 flex flex-col min-h-0 h-full p-6 space-y-4">
            
            {/* Header controls */}
            <div className="flex items-center justify-between gap-4">
              <h1 className="flex-1 font-bold text-xl tracking-tight text-zinc-100 truncate">
                {note.title || 'Untitled Note'}
              </h1>
              
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setShowVersionPanel(!showVersionPanel)}
                  className={`p-2 rounded-lg border border-zinc-800 flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors ${
                    showVersionPanel 
                      ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' 
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                  }`}
                  title="Toggle Version History"
                >
                  <History className="h-4 w-4" />
                  <span>History</span>
                </button>
              </div>
            </div>

            {/* Note Editor Area */}
            <div className="flex-1 min-h-0">
              <CodeMirrorEditor
                noteId={note.id}
                initialContent={note.autoSaveContent || note.content}
                onContentChange={handleContentChange}
                onRunAiAction={handleRunAiAction}
                aiLoading={aiLoading}
                autoFocus={shouldFocusEditor}
                onSelectionChange={(sel) => setActiveSelection(sel)}
                onToggleComments={() => setShowCommentsSidebar(!showCommentsSidebar)}
                onToggleShare={() => setShowShareModal(true)}
                commentsCount={commentsCount}
                jumpRange={jumpRange}
              />
            </div>
          </div>
        ) : (
          /* Empty Workspace State */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="max-w-sm flex flex-col items-center gap-3"
            >
              <div className="h-16 w-16 rounded-2xl bg-zinc-900 border border-zinc-800/80 flex items-center justify-center mb-2 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
                <FileText className="h-8 w-8 text-zinc-655" />
              </div>
              <h3 className="font-bold text-md text-zinc-200">No Note Selected</h3>
              <p className="text-zinc-500 text-xs leading-relaxed mb-4">
                Choose a note from the feed, or click below to start writing a fresh academic summary.
              </p>
              {activeFilter !== 'trash' && (
                <button
                  onClick={handleCreateNoteFromEmpty}
                  className="bg-violet-600 hover:bg-violet-750 text-white px-5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-[0_4px_14px_rgba(139,92,246,0.25)] hover:shadow-[0_4px_20px_rgba(139,92,246,0.35)] transition-all"
                >
                  <Plus className="h-4.5 w-4.5" />
                  Create New Note
                </button>
              )}
            </motion.div>
          </div>
        )}
      </div>

      {/* Discussion Sidebar Panel */}
      {showCommentsSidebar && selectedNoteId && (
        <CommentsSidebar
          noteId={selectedNoteId}
          onClose={() => setShowCommentsSidebar(false)}
          activeSelection={activeSelection}
          onCommentAdded={() => setCommentsCount((c) => c + 1)}
          onJumpToHighlight={(start, end) => setJumpRange({ from: start, to: end })}
        />
      )}

      {/* Right Properties or Version History Drawer Panel */}
      <AnimatePresence mode="wait">
        {selectedNoteId && note && (
          <motion.div
            key={showVersionPanel ? 'version' : 'properties'}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 288, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="h-full z-10 shrink-0 bg-zinc-950 flex"
          >
            {showVersionPanel ? (
              <VersionHistoryPanel
                noteId={selectedNoteId}
                onClose={() => setShowVersionPanel(false)}
              />
            ) : (
              <RightPropertiesSidebar
                note={{ ...note, content: liveContent }}
                onUpdateNote={async (dto) => {
                  await updateNoteMutation.mutateAsync({
                    noteId: selectedNoteId,
                    dto
                  });
                }}
                onRunAiAction={handleRunAiAction}
                onGenerateFlashcards={() => setIsGeneratingFlashcards(true)}
                aiLoading={aiLoading}
                aiError={aiError}
                lastFailedAction={lastFailedAction}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-100 text-base">Create New Note</h3>
                  <p className="text-zinc-500 text-xs mt-0.5">Create a new note before you start writing.</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-400 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={submitCreateNote} className="p-6 flex flex-col gap-5">
              {/* Note Title */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Note Title</label>
                <input
                  type="text"
                  value={createNoteTitle}
                  onChange={(e) => setCreateNoteTitle(e.target.value)}
                  placeholder="e.g. Binary Trees, OS Revision, DBMS Unit 3"
                  className="w-full bg-zinc-950 border border-zinc-805 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition"
                  autoFocus
                />
              </div>

              {/* Notebook Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Notebook</label>
                <div className="relative">
                  <select
                    value={createNoteNotebookId || 'none'}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCreateNoteNotebookId(val === 'none' ? null : val);
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-violet-500 cursor-pointer appearance-none"
                  >
                    <option value="none">Unassigned (General Notes)</option>
                    {notebooks?.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.title}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-400">
                    <BookOpen className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-4 border-t border-border/10 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 font-semibold text-zinc-300 transition text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 font-semibold text-white transition text-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Create Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isGeneratingFlashcards && selectedNoteId && (
        <GenerateFlashcardsModal
          noteId={selectedNoteId}
          onClose={() => setIsGeneratingFlashcards(false)}
        />
      )}

      {showShareModal && selectedNoteId && (
        <SharingModal
          noteId={selectedNoteId}
          onClose={() => setShowShareModal(false)}
        />
      )}

    </div>
  );
}
