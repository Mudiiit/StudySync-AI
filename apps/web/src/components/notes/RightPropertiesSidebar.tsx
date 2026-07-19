'use client';

import React, { useState, useEffect } from 'react';
import { Note, Notebook } from '@/services/notes';
import { 
  Book, Tag, Calendar, Sparkles, Plus, X, 
  Clock, BrainCircuit, Lightbulb, FileText, Check
} from 'lucide-react';
import { useNotebooks } from '@/hooks/useNotes';
import ReactMarkdown from 'react-markdown';

const assistantCategories = [
  {
    name: 'Summaries & Notes',
    icon: '📝',
    actions: [
      { value: 'executive_summary', label: 'Executive Summary', desc: 'Quick overview in 2–3 minutes.', icon: '⚡' },
      { value: 'detailed_summary', label: 'Detailed Study Summary', desc: 'Comprehensive detailed notes.', icon: '📚' },
      { value: 'exam_revision', label: 'Exam Revision Notes', desc: 'Condensed notes for revision.', icon: '🎯' },
      { value: 'last_minute_revision', label: 'Last Minute Revision Sheet', desc: 'Key formulas and essentials.', icon: '🔥' },
    ],
  },
  {
    name: 'Terminology & Concepts',
    icon: '🧠',
    actions: [
      { value: 'key_concepts', label: 'Key Concepts Extraction', desc: 'Core ideas and conceptual pillars.', icon: '💡' },
      { value: 'definitions', label: 'Important Definitions', desc: 'Glossary of key terminology.', icon: '📖' },
      { value: 'learning_objectives', label: 'Learning Objectives', desc: 'Bloom\'s Taxonomy targets.', icon: '🏁' },
    ],
  },
  {
    name: 'Practice & Questions',
    icon: '✍️',
    actions: [
      { value: 'practice_questions', label: 'Practice Questions', desc: 'Easy, Medium & Hard test questions.', icon: '✏️' },
      { value: 'viva_questions', label: 'Viva Questions', desc: 'Practice oral defense questions.', icon: '🗣️' },
      { value: 'interview_questions', label: 'Interview Questions', desc: 'Practice technical interviews.', icon: '💼' },
    ],
  },
  {
    name: 'Explanations & Strategy',
    icon: '🏫',
    actions: [
      { value: 'explain_beginner', label: 'Explain Like a Beginner', desc: 'ELI5 everyday analogies.', icon: '🌱' },
      { value: 'explain_professor', label: 'Explain Like a Professor', desc: 'Rigorous formal academic details.', icon: '🎓' },
      { value: 'mnemonics', label: 'Mnemonics & Memory Tricks', desc: 'Analogies and memory hacks.', icon: '🧩' },
      { value: 'student_mistakes', label: 'Common Student Mistakes', desc: 'Misconceptions and exam traps.', icon: '⚠️' },
      { value: 'exam_topics', label: 'Important Exam Topics', desc: 'Predicted topics and focus areas.', icon: '📊' },
      { value: 'related_topics', label: 'Related Topics', desc: 'Adjacent subject dependencies.', icon: '🔗' },
      { value: 'study_time', label: 'Estimated Study Time', desc: 'Time estimate and study roadmap.', icon: '⏱️' },
    ],
  },
];

interface RightPropertiesSidebarProps {
  note: Note;
  onUpdateNote: (dto: Partial<Note>) => Promise<void>;
  onRunAiAction?: (action: string) => void;
  onGenerateFlashcards?: () => void;
  aiLoading?: boolean;
  aiError?: string | null;
  lastFailedAction?: string | null;
}

export default function RightPropertiesSidebar({
  note,
  onUpdateNote,
  onRunAiAction,
  onGenerateFlashcards,
  aiLoading = false,
  aiError = null,
  lastFailedAction = null
}: RightPropertiesSidebarProps) {
  const { data: notebooks } = useNotebooks();
  const [newTag, setNewTag] = useState('');
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameTitleVal, setRenameTitleVal] = useState(note.title);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    setRenameTitleVal(note.title);
  }, [note.id, note.title]);

  const handleNotebookChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const notebookId = val === 'none' ? null : val;
    await onUpdateNote({ notebookId });
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.trim()) return;

    const cleanTag = newTag.trim().toLowerCase();
    const currentTags = note.tags?.map(t => t.tag?.name).filter(Boolean) as string[] || [];
    
    if (!currentTags.includes(cleanTag)) {
      const updatedTags = [...currentTags, cleanTag];
      await onUpdateNote({ tags: updatedTags as any }); // Wait, our API update accepts tags array
    }
    setNewTag('');
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const currentTags = note.tags?.map(t => t.tag?.name).filter(Boolean) as string[] || [];
    const updatedTags = currentTags.filter(t => t !== tagToRemove);
    await onUpdateNote({ tags: updatedTags as any });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="w-72 border-l border-border/40 bg-zinc-950 flex flex-col h-full shrink-0 select-none font-sans text-zinc-100 text-xs">
      
      {/* Sidebar Header */}
      <div className="p-4 border-b border-border/10 flex items-center gap-2">
        <BrainCircuit className="h-4 w-4 text-violet-500" />
        <span className="font-bold text-zinc-200 tracking-tight">Note Properties</span>
      </div>

      {/* Meta/Properties scroll section */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        
        {/* Title Rename Section */}
        <div className="space-y-1.5 pb-4 border-b border-border/10">
          <label className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-violet-400" /> Title
          </label>
          <div className="flex items-start justify-between gap-2 bg-zinc-900/40 border border-zinc-850 p-2.5 rounded-xl">
            <div className="font-semibold text-zinc-200 break-words flex-1 pr-1.5 leading-relaxed text-xs">
              {note.title || 'Untitled Note'}
            </div>
            <button
              onClick={() => setIsRenameModalOpen(true)}
              className="p-1 hover:bg-zinc-850 rounded border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 transition shrink-0 cursor-pointer flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-1"
            >
              <span>✏️ Edit</span>
            </button>
          </div>
        </div>

        {/* Notebook Association */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase flex items-center gap-1">
            <Book className="h-3.5 w-3.5" /> Notebook
          </label>
          <select
            value={note.notebookId || 'none'}
            onChange={handleNotebookChange}
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:border-violet-500 cursor-pointer"
          >
            <option value="none">Unassigned</option>
            {notebooks?.map(n => (
              <option key={n.id} value={n.id}>
                {n.title}
              </option>
            ))}
          </select>
        </div>

        {/* Tags Section */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase flex items-center gap-1">
            <Tag className="h-3.5 w-3.5" /> Tags Cloud
          </label>
          
          {/* Active Tags list */}
          <div className="flex flex-wrap gap-1.5 min-h-[25px]">
            {note.tags && note.tags.length > 0 ? (
              note.tags.map(t => {
                if (!t.tag) return null;
                return (
                  <span 
                    key={t.tag.id}
                    className="inline-flex items-center gap-1 bg-zinc-900 border border-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full font-medium"
                  >
                    #{t.tag.name}
                    <button 
                      onClick={() => handleRemoveTag(t.tag.name)}
                      className="hover:text-red-400 p-0.5 rounded"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                );
              })
            ) : (
              <span className="text-[10px] text-zinc-600 italic">No tags assigned</span>
            )}
          </div>

          {/* Add Tag Form */}
          <form onSubmit={handleAddTag} className="flex gap-1.5 mt-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add tag..."
              className="flex-1 px-2.5 py-1.5 bg-zinc-900/60 border border-zinc-800 rounded-lg focus:outline-none focus:border-violet-500 text-zinc-200"
            />
            <button
              type="submit"
              className="p-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 rounded-lg"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>

        {/* Note Metadata Details */}
        <div className="space-y-3 pt-3 border-t border-border/10">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Created
            </span>
            <span className="text-zinc-400 font-semibold">{formatDate(note.createdAt)}</span>
          </div>

          <div className="flex items-center justify-between text-zinc-500">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Updated
            </span>
            <span className="text-zinc-400 font-semibold">{formatDate(note.updatedAt)}</span>
          </div>

          <div className="flex items-center justify-between text-zinc-500">
            <span className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Characters
            </span>
            <span className="text-zinc-400 font-semibold">{note.content?.length || 0}</span>
          </div>
        </div>

        {/* AI Study Assistant */}
        <div className="space-y-3 pt-4 border-t border-border/10 flex flex-col">
          <label className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase flex items-center gap-1.5">
            <BrainCircuit className="h-3.5 w-3.5 text-violet-500" /> AI Study Assistant
          </label>

          {/* Result view / Loading / Error states */}
          {aiError ? (
            <div className="bg-red-950/20 border border-red-900/50 p-4 rounded-xl flex flex-col text-zinc-300 gap-3">
              <div className="text-[11px] font-semibold text-red-400">
                {aiError}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onRunAiAction && lastFailedAction) {
                    onRunAiAction(lastFailedAction);
                  }
                }}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-200 hover:text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                Retry
              </button>
            </div>
          ) : aiLoading ? (
            <div className="bg-zinc-900/40 border border-zinc-850 p-4 rounded-xl flex flex-col items-center justify-center min-h-[120px] text-zinc-400 gap-2">
              <span className="animate-pulse text-xs font-semibold text-violet-400">Generating...</span>
              <span className="text-[10px] text-zinc-650 italic font-medium">AI Study Assistant is formulating your insights.</span>
            </div>
          ) : note.summary ? (
            <div className="space-y-2">
              <div className="bg-zinc-900/40 border border-zinc-850 p-3.5 rounded-xl text-zinc-300 leading-relaxed text-[11px] prose prose-invert prose-zinc max-w-none prose-headings:text-xs prose-headings:font-bold prose-p:text-[11px] prose-ul:list-disc prose-ul:pl-4 max-h-72 overflow-y-auto scrollbar-thin">
                <ReactMarkdown>{note.summary}</ReactMarkdown>
              </div>
              <div className="text-[10px] text-zinc-500 text-center font-medium">
                Want another action? Select one below to regenerate.
              </div>
            </div>
          ) : (
            <div className="bg-zinc-900/20 border border-zinc-900/50 p-4 rounded-xl text-center text-zinc-500 leading-relaxed text-[10px]">
              No study analysis generated yet. Run an action below to start learning.
            </div>
          )}

          {/* Categorized Actions List */}
          <div className="space-y-2">
            {assistantCategories.map((cat) => {
              const isOpen = activeCategory === cat.name;
              return (
                <div key={cat.name} className="border border-zinc-900 rounded-xl overflow-hidden bg-zinc-900/10">
                  <button
                    type="button"
                    disabled={aiLoading}
                    onClick={() => setActiveCategory(isOpen ? null : cat.name)}
                    className="w-full px-3 py-2 bg-zinc-900/40 hover:bg-zinc-900 flex items-center justify-between text-left text-zinc-350 font-semibold tracking-tight transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </span>
                    <span className="text-[10px] text-zinc-500">{isOpen ? '▼' : '▶'}</span>
                  </button>
                  
                  {isOpen && (
                    <div className="p-1.5 bg-zinc-950/40 border-t border-zinc-900/50 divide-y divide-zinc-900/30 flex flex-col">
                      {cat.actions.map((act) => (
                        <button
                          key={act.value}
                          type="button"
                          disabled={aiLoading}
                          onClick={() => {
                            if (onRunAiAction) {
                              onRunAiAction(act.value);
                            }
                          }}
                          className="w-full p-2 hover:bg-zinc-900/80 flex items-start gap-2.5 transition-colors text-left disabled:opacity-50 group cursor-pointer"
                        >
                          <span className="text-sm shrink-0 mt-0.5">{act.icon}</span>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-zinc-200 text-xs tracking-tight group-hover:text-violet-400 transition-colors">
                              {act.label}
                            </span>
                            <span className="text-[10px] text-zinc-500 leading-normal font-medium mt-0.5">
                              {act.desc}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Flashcards Creation */}
        <div className="space-y-3 pt-4 border-t border-border/10 flex flex-col">
          <label className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase flex items-center gap-1.5">
            <BrainCircuit className="h-3.5 w-3.5 text-violet-500" /> AI Study Flashcards
          </label>

          <div className="bg-zinc-900/40 border border-zinc-850 p-3 rounded-xl flex flex-col text-zinc-400">
            <span className="text-[10px] text-zinc-550 leading-relaxed mb-3">
              Generate intelligent active recall cards from this note using Gemini.
            </span>
            <button
              type="button"
              onClick={() => {
                if (onGenerateFlashcards) {
                  onGenerateFlashcards();
                }
              }}
              className="w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 hover:text-indigo-300 rounded-lg text-[10px] font-semibold transition"
            >
              <Sparkles className="h-3 w-3" />
              Generate Flashcards
            </button>
          </div>
        </div>

      </div>

      {isRenameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl p-6 space-y-4">
            <div>
              <h3 className="font-bold text-zinc-100 text-sm">Rename Note</h3>
              <p className="text-zinc-500 text-[10px] mt-0.5">Enter a new title for this note.</p>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase">Note Title</label>
              <input
                type="text"
                value={renameTitleVal}
                onChange={(e) => setRenameTitleVal(e.target.value)}
                placeholder="e.g. Binary Trees"
                className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-violet-500 transition"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const finalTitle = renameTitleVal.trim() || 'Untitled Note';
                    onUpdateNote({ title: finalTitle });
                    setIsRenameModalOpen(false);
                  } else if (e.key === 'Escape') {
                    setRenameTitleVal(note.title);
                    setIsRenameModalOpen(false);
                  }
                }}
              />
            </div>
            
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setRenameTitleVal(note.title);
                  setIsRenameModalOpen(false);
                }}
                className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded-lg text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const finalTitle = renameTitleVal.trim() || 'Untitled Note';
                  await onUpdateNote({ title: finalTitle });
                  setIsRenameModalOpen(false);
                }}
                className="flex-1 py-2 bg-violet-600 hover:bg-violet-550 text-white rounded-lg text-xs font-semibold transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
