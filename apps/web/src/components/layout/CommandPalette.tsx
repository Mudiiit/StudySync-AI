'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  useNotesList, useNotebooks 
} from '@/hooks/useNotes';
import { useFlashcardsList } from '@/hooks/useFlashcards';
import { useQuizzesList } from '@/hooks/useQuizzes';
import { useTasksList, useWorkspaces } from '@/hooks/useTasks';
import { useTutorConversations } from '@/hooks/useTutor';
import { useToast } from '@/components/providers/ToastProvider';
import { 
  Search, Plus, CheckSquare, Book, Layers, BookOpen, Brain, 
  RotateCcw, Calendar, Sparkles, Activity, Upload, FileText, 
  MessageSquare, Pin, ArrowRight, CornerDownLeft, User, Trophy, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface CommandItem {
  id: string;
  title: string;
  category: 'Commands';
  icon: React.ComponentType<any>;
  url: string;
  keywords?: string[];
}

interface DocumentItem {
  id: string;
  name: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  status: 'indexed' | 'processing';
}

interface RecentItem {
  id: string;
  title: string;
  category: 'Notes' | 'Quizzes' | 'Tutor Conversations' | 'Documents' | 'Commands';
  icon: string;
  url: string;
  timestamp: number;
}

// Icon mappings for dynamic render
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  plus: Plus,
  'check-square': CheckSquare,
  book: Book,
  layers: Layers,
  'book-open': BookOpen,
  brain: Brain,
  'rotate-ccw': RotateCcw,
  calendar: Calendar,
  sparkles: Sparkles,
  activity: Activity,
  upload: Upload,
  file: FileText,
  message: MessageSquare
};

// Static Quick Actions Commands list
const COMMANDS: CommandItem[] = [
  { id: 'new-note', title: 'New Note', category: 'Commands', icon: Plus, url: '/notes?action=new', keywords: ['new', 'create', 'note'] },
  { id: 'new-task', title: 'New Task', category: 'Commands', icon: CheckSquare, url: '/tasks?action=new', keywords: ['new', 'create', 'task', 'todo'] },
  { id: 'create-notebook', title: 'Create Notebook', category: 'Commands', icon: Book, url: '/notes?action=new_notebook', keywords: ['new', 'create', 'notebook', 'folder'] },
  { id: 'generate-flashcards', title: 'Generate Flashcards', category: 'Commands', icon: Layers, url: '/notes?action=flashcards', keywords: ['generate', 'flashcards', 'cards', 'ai', 'study'] },
  { id: 'generate-quiz', title: 'Generate Quiz', category: 'Commands', icon: BookOpen, url: '/quizzes?action=new', keywords: ['generate', 'quiz', 'quizzes', 'test', 'ai'] },
  { id: 'open-tutor', title: 'Open AI Tutor', category: 'Commands', icon: Brain, url: '/tutor', keywords: ['tutor', 'ai', 'chat', 'ask', 'study'] },
  { id: 'start-pomodoro', title: 'Start Pomodoro', category: 'Commands', icon: RotateCcw, url: '/pomodoro?action=start', keywords: ['pomodoro', 'timer', 'focus', 'start'] },
  { id: 'open-calendar', title: 'Open Calendar', category: 'Commands', icon: Calendar, url: '/calendar', keywords: ['calendar', 'events', 'schedule'] },
  { id: 'open-dashboard', title: 'Open Dashboard', category: 'Commands', icon: Sparkles, url: '/dashboard', keywords: ['dashboard', 'home', 'main'] },
  { id: 'open-analytics', title: 'Open Analytics', category: 'Commands', icon: Activity, url: '/analytics', keywords: ['analytics', 'charts', 'progress', 'stats'] },
  { id: 'upload-document', title: 'Upload Document', category: 'Commands', icon: Upload, url: '/documents?action=upload', keywords: ['upload', 'document', 'pdf', 'file', 'rag'] },
  { id: 'open-profile', title: 'Open Profile Settings', category: 'Commands', icon: User, url: '/profile', keywords: ['profile', 'settings', 'avatar', 'user', 'privacy'] },
  { id: 'open-achievements', title: 'Open Achievements Panel', category: 'Commands', icon: Trophy, url: '/achievements', keywords: ['achievements', 'trophy', 'badges', 'xp', 'gamification'] },
  { id: 'open-leaderboard', title: 'Open Leaderboard Standings', category: 'Commands', icon: Trophy, url: '/leaderboard', keywords: ['leaderboard', 'rankings', 'weekly', 'monthly', 'competition'] },
  { id: 'open-social', title: 'Open Social Learning Workspace', category: 'Commands', icon: Users, url: '/social', keywords: ['social', 'friends', 'groups', 'challenges', 'notebooks', 'invite', 'collaboration'] }
];

// Document Fetching Hook
function useDocumentsList() {
  return useQuery<DocumentItem[]>({
    queryKey: ['rag', 'documents'],
    queryFn: async () => {
      const res = await api.get('/rag/documents');
      return res.data;
    },
    refetchOnWindowFocus: false
  });
}

export default function CommandPalette() {
  const router = useRouter();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Favorites & Recents storage states
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [recents, setRecents] = useState<RecentItem[]>([]);

  // List scroll ref
  const listContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: workspaces } = useWorkspaces();
  const activeWorkspaceId = workspaces && workspaces.length > 0 ? workspaces[0].id : null;

  const { data: notesData } = useNotesList({ archived: false, deleted: false });
  const { data: notebooks } = useNotebooks();
  const { data: flashcards } = useFlashcardsList({});
  const { data: quizzes } = useQuizzesList();
  const { data: tasksData } = useTasksList({ workspaceId: activeWorkspaceId });
  const { data: tutorChats } = useTutorConversations();
  const { data: documents } = useDocumentsList();

  // Load localStorage items on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPins = localStorage.getItem('command-palette-pins');
      if (savedPins) setPinnedIds(JSON.parse(savedPins));

      const savedRecents = localStorage.getItem('command-palette-recents');
      if (savedRecents) setRecents(JSON.parse(savedRecents));
    }
  }, []);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Body scroll disable on open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = '';
    }
  }, [open]);

  // Handle pinning toggle
  const togglePin = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    let updated;
    if (pinnedIds.includes(id)) {
      updated = pinnedIds.filter((x) => x !== id);
      showToast('Removed from favorites', 'info');
    } else {
      updated = [...pinnedIds, id];
      showToast('Added to favorites', 'success');
    }
    setPinnedIds(updated);
    localStorage.setItem('command-palette-pins', JSON.stringify(updated));
  };

  // Add item to recents on selection
  const addToRecents = (item: Omit<RecentItem, 'timestamp'>) => {
    const updated = [
      { ...item, timestamp: Date.now() },
      ...recents.filter((x) => x.id !== item.id)
    ].slice(0, 15); // keep max 15 items

    setRecents(updated);
    localStorage.setItem('command-palette-recents', JSON.stringify(updated));
  };

  // Filter and Compile Results list
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();

    // 1. Compile all database entities mapped to standard display format
    const notesList = (notesData?.notes || []).map((n) => ({
      id: `note:${n.id}`,
      title: n.title || 'Untitled Note',
      category: 'Notes' as const,
      icon: FileText,
      url: `/notes?noteId=${n.id}`,
      searchStr: `${n.title} ${n.content || ''}`.toLowerCase()
    }));

    const notebooksList = (notebooks || []).map((nb) => ({
      id: `notebook:${nb.id}`,
      title: nb.title,
      category: 'Notebooks' as const,
      icon: Book,
      url: `/notes?notebookId=${nb.id}`,
      searchStr: nb.title.toLowerCase()
    }));

    const flashcardsList = (flashcards?.items || []).map((f) => ({
      id: `flashcard:${f.id}`,
      title: f.question,
      category: 'Flashcards' as const,
      icon: Layers,
      url: `/flashcards`,
      searchStr: `${f.question} ${f.answer}`.toLowerCase()
    }));

    const quizzesList = (quizzes || []).map((qz) => ({
      id: `quiz:${qz.id}`,
      title: qz.title,
      category: 'Quizzes' as const,
      icon: BookOpen,
      url: `/quizzes`,
      searchStr: qz.title.toLowerCase()
    }));

    const tasksList = (tasksData?.tasks || []).map((t) => ({
      id: `task:${t.id}`,
      title: t.title,
      category: 'Tasks' as const,
      icon: CheckSquare,
      url: `/tasks`,
      searchStr: `${t.title} ${t.description || ''}`.toLowerCase()
    }));

    const chatsList = (tutorChats || []).map((chat) => ({
      id: `chat:${chat.id}`,
      title: chat.title,
      category: 'Tutor Conversations' as const,
      icon: MessageSquare,
      url: `/tutor`,
      searchStr: chat.title.toLowerCase()
    }));

    const docsList = (documents || []).map((doc) => ({
      id: `doc:${doc.id}`,
      title: doc.name,
      category: 'Documents' as const,
      icon: FileText,
      url: `/documents`,
      searchStr: doc.name.toLowerCase()
    }));

    // Standard Quick actions
    const commandsList = COMMANDS.map((cmd) => ({
      id: `cmd:${cmd.id}`,
      title: cmd.title,
      category: 'Commands' as const,
      icon: cmd.icon,
      url: cmd.url,
      searchStr: `${cmd.title} ${(cmd.keywords || []).join(' ')}`.toLowerCase()
    }));

    // If query is empty, compile Pinned (Favorites) and Recents
    if (!q) {
      const pinnedItems = commandsList.filter((c) => pinnedIds.includes(c.id));
      
      // Separate recents by categories
      const recentNotes = recents.filter((r) => r.category === 'Notes').slice(0, 3);
      const recentQuizzes = recents.filter((r) => r.category === 'Quizzes').slice(0, 2);
      const recentChats = recents.filter((r) => r.category === 'Tutor Conversations').slice(0, 2);
      const recentDocs = recents.filter((r) => r.category === 'Documents').slice(0, 2);
      const recentCmds = recents.filter((r) => r.category === 'Commands').slice(0, 3);

      const recentItemsFormatted = [
        ...recentNotes,
        ...recentQuizzes,
        ...recentChats,
        ...recentDocs,
        ...recentCmds
      ].map((r) => ({
        id: r.id,
        title: r.title,
        category: `Recent ${r.category}` as any,
        icon: ICON_MAP[r.icon] || FileText,
        url: r.url,
        searchStr: ''
      }));

      return {
        groups: [
          ...(pinnedItems.length > 0 ? [{ title: 'Pinned / Favorites', items: pinnedItems }] : []),
          ...(recentItemsFormatted.length > 0 ? [{ title: 'Recent Items', items: recentItemsFormatted }] : []),
          { title: 'Quick Actions', items: commandsList }
        ],
        flatCount: pinnedItems.length + recentItemsFormatted.length + commandsList.length,
        flatList: [...pinnedItems, ...recentItemsFormatted, ...commandsList]
      };
    }

    // Filter list when query matches
    const filteredNotes = notesList.filter((item) => item.searchStr.includes(q)).slice(0, 5);
    const filteredNotebooks = notebooksList.filter((item) => item.searchStr.includes(q)).slice(0, 3);
    const filteredFlashcards = flashcardsList.filter((item) => item.searchStr.includes(q)).slice(0, 3);
    const filteredQuizzes = quizzesList.filter((item) => item.searchStr.includes(q)).slice(0, 3);
    const filteredTasks = tasksList.filter((item) => item.searchStr.includes(q)).slice(0, 5);
    const filteredChats = chatsList.filter((item) => item.searchStr.includes(q)).slice(0, 3);
    const filteredDocs = docsList.filter((item) => item.searchStr.includes(q)).slice(0, 3);
    const filteredCommands = commandsList.filter((item) => item.searchStr.includes(q));

    const groups: { title: string; items: any[] }[] = [];
    let flatList: any[] = [];

    if (filteredCommands.length > 0) {
      groups.push({ title: 'Commands', items: filteredCommands });
      flatList = [...flatList, ...filteredCommands];
    }
    if (filteredNotes.length > 0) {
      groups.push({ title: 'Notes', items: filteredNotes });
      flatList = [...flatList, ...filteredNotes];
    }
    if (filteredNotebooks.length > 0) {
      groups.push({ title: 'Notebooks', items: filteredNotebooks });
      flatList = [...flatList, ...filteredNotebooks];
    }
    if (filteredFlashcards.length > 0) {
      groups.push({ title: 'Flashcards', items: filteredFlashcards });
      flatList = [...flatList, ...filteredFlashcards];
    }
    if (filteredQuizzes.length > 0) {
      groups.push({ title: 'Quizzes', items: filteredQuizzes });
      flatList = [...flatList, ...filteredQuizzes];
    }
    if (filteredTasks.length > 0) {
      groups.push({ title: 'Tasks', items: filteredTasks });
      flatList = [...flatList, ...filteredTasks];
    }
    if (filteredChats.length > 0) {
      groups.push({ title: 'Tutor Conversations', items: filteredChats });
      flatList = [...flatList, ...filteredChats];
    }
    if (filteredDocs.length > 0) {
      groups.push({ title: 'Documents', items: filteredDocs });
      flatList = [...flatList, ...filteredDocs];
    }

    return {
      groups,
      flatCount: flatList.length,
      flatList
    };
  }, [query, notesData, notebooks, flashcards, quizzes, tasksData, tutorChats, documents, pinnedIds, recents]);

  // Handle Item Navigation & Record
  const handleSelectItem = (item: any) => {
    if (!item) return;

    // Track icon string for recents
    let iconStr = 'file';
    if (item.category === 'Commands') {
      const match = COMMANDS.find((c) => `cmd:${c.id}` === item.id);
      iconStr = match ? (match.id.includes('note') ? 'file' : match.id.includes('task') ? 'check-square' : 'plus') : 'plus';
    } else if (item.category.includes('Quiz')) {
      iconStr = 'book-open';
    } else if (item.category.includes('Tutor')) {
      iconStr = 'message';
    }

    // Save to recents
    addToRecents({
      id: item.id,
      title: item.title,
      category: item.category.replace('Recent ', '') as any,
      icon: iconStr,
      url: item.url
    });

    setOpen(false);
    router.push(item.url);
  };

  // Keyboard navigation overrides
  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.flatCount);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.flatCount) % results.flatCount);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results.flatList[selectedIndex]) {
        handleSelectItem(results.flatList[selectedIndex]);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const current = results.flatList[selectedIndex];
      if (current && current.category === 'Commands') {
        togglePin(current.id);
      }
    }
  };

  // Scroll active list item into view if arrow keys move it past visible bounds
  useEffect(() => {
    const listEl = listContainerRef.current;
    if (!listEl) return;
    const activeItemEl = listEl.querySelector('[data-active="true"]');
    if (activeItemEl) {
      activeItemEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-background/80 backdrop-blur-md font-sans">
          {/* Backdrop Click Off Overlay */}
          <div className="fixed inset-0" onClick={() => setOpen(false)} />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            className="w-full max-w-xl bg-card border border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col z-10 max-h-[480px]"
          >
            {/* Search Input Box */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border bg-secondary/20">
              <Search className="h-5 w-5 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
                onKeyDown={handleListKeyDown}
                placeholder="Search notes, quizzes, tasks, tutor chats, or type commands..."
                className="w-full bg-transparent text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none"
              />
              <button 
                onClick={() => setOpen(false)}
                className="text-[10px] bg-secondary px-2 py-1 rounded text-muted-foreground font-bold border border-border shadow cursor-pointer"
              >
                ESC
              </button>
            </div>

            {/* List Results */}
            <div 
              ref={listContainerRef}
              className="flex-1 overflow-y-auto p-2 space-y-4"
            >
              {results.flatCount > 0 ? (
                (() => {
                  let runningIndex = 0;
                  return results.groups.map((group) => (
                    <div key={group.title} className="space-y-1">
                      <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        {group.title}
                      </div>
                      <div className="space-y-0.5">
                        {group.items.map((item) => {
                          const idx = runningIndex++;
                          const isActive = idx === selectedIndex;
                          const isPinned = pinnedIds.includes(item.id);
                          const IconComp = item.icon;

                          return (
                            <div
                              key={item.id}
                              data-active={isActive}
                              onMouseEnter={() => setSelectedIndex(idx)}
                              onClick={() => handleSelectItem(item)}
                              className={`px-3 py-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between border ${
                                isActive 
                                  ? 'bg-primary/10 border-primary/30 text-primary' 
                                  : 'bg-transparent border-transparent text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <IconComp className="h-4.5 w-4.5 shrink-0" />
                                <span className="text-xs font-semibold truncate leading-tight">{item.title}</span>
                              </div>

                              {/* Actions on right */}
                              <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground">
                                {item.category === 'Commands' && (
                                  <button
                                    onClick={(e) => togglePin(item.id, e)}
                                    className={`p-1 rounded hover:bg-secondary transition cursor-pointer ${
                                      isPinned ? 'text-primary' : 'opacity-0 group-hover:opacity-100 hover:text-foreground'
                                    }`}
                                    style={{ opacity: isActive || isPinned ? 1 : 0 }}
                                    title={isPinned ? 'Unfavorite command' : 'Favorite command'}
                                  >
                                    <Pin className="h-3 w-3" />
                                  </button>
                                )}
                                {isActive && (
                                  <div className="flex items-center gap-0.5 bg-secondary border border-border px-1.5 py-0.5 rounded shadow">
                                    <span>Enter</span>
                                    <CornerDownLeft className="h-2.5 w-2.5" />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()
              ) : (
                /* Empty State */
                <div className="py-12 px-6 flex flex-col items-center justify-center text-center">
                  <Search className="h-8 w-8 text-muted-foreground/30 stroke-[1.25] mb-2 animate-pulse" />
                  <p className="text-xs text-muted-foreground font-medium">No results found for "{query}"</p>
                  <div className="mt-4 flex flex-col gap-1.5 w-full max-w-xs">
                    <div className="text-[9px] font-bold text-muted-foreground/80 uppercase tracking-wider mb-1">Suggested Shortcuts</div>
                    <button
                      onClick={() => handleSelectItem({ url: '/notes?action=new', id: 'cmd:new-note', title: 'New Note', category: 'Commands' })}
                      className="w-full flex items-center justify-between px-3 py-2 border border-border hover:border-border/80 bg-secondary/10 hover:bg-secondary/35 rounded-xl text-left text-xs font-semibold text-muted-foreground hover:text-foreground transition cursor-pointer"
                    >
                      <span>Create Note</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleSelectItem({ url: '/tasks?action=new', id: 'cmd:new-task', title: 'New Task', category: 'Commands' })}
                      className="w-full flex items-center justify-between px-3 py-2 border border-border hover:border-border/80 bg-secondary/10 hover:bg-secondary/35 rounded-xl text-left text-xs font-semibold text-muted-foreground hover:text-foreground transition cursor-pointer"
                    >
                      <span>Create Task</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleSelectItem({ url: '/tutor', id: 'cmd:open-tutor', title: 'Open AI Tutor', category: 'Commands' })}
                      className="w-full flex items-center justify-between px-3 py-2 border border-border hover:border-border/80 bg-secondary/10 hover:bg-secondary/35 rounded-xl text-left text-xs font-semibold text-muted-foreground hover:text-foreground transition cursor-pointer"
                    >
                      <span>Open AI Tutor</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Hints */}
            <div className="px-4 py-2 bg-secondary/30 border-t border-border flex items-center justify-between text-[9px] font-semibold text-muted-foreground select-none">
              <div className="flex items-center gap-3">
                <span>↑↓ Navigate</span>
                <span>Enter Select</span>
                <span>Esc Close</span>
              </div>
              <div>
                <span>Tab Pin Command</span>
              </div>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
