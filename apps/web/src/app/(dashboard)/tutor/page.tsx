'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  useTutorConversations,
  useTutorDetails,
  useDeleteTutorChat,
  useRenameTutorChat,
} from '@/hooks/useTutor';
import { useNotesList, useNotebooks } from '@/hooks/useNotes';
import { useToast } from '@/components/providers/ToastProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { useFlashcardStats } from '@/hooks/useFlashcards';
import { useAttemptsHistory } from '@/hooks/useQuizzes';
import { useTasksList, useWorkspaces } from '@/hooks/useTasks';
import {
  Brain,
  Send,
  Sparkles,
  X,
  Plus,
  Trash2,
  Copy,
  FileText,
  Paperclip,
  Check,
  ChevronDown,
  RefreshCw,
  Clock,
  MessageSquare,
  Pencil,
  Search,
  AlertTriangle,
  StopCircle,
  HelpCircle,
  Mic,
  RotateCcw,
  BookOpen,
  User,
  Settings,
  Flame,
  Award,
  BookMarked,
  Activity,
  Layers,
  ArrowRight,
  TrendingUp,
  LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

// Math/LaTeX Segment Parser
interface FormattedSegment {
  type: 'text' | 'inline-math' | 'block-math';
  content: string;
}

function parseMathSegments(text: string): FormattedSegment[] {
  if (!text) return [];
  const segments: FormattedSegment[] = [];
  let currentIdx = 0;

  // Match Block Math \[...\] or Inline Math \(...\)
  const regex = /\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const matchIdx = match.index;

    if (matchIdx > currentIdx) {
      segments.push({
        type: 'text',
        content: text.substring(currentIdx, matchIdx),
      });
    }

    if (match[1] !== undefined) {
      segments.push({
        type: 'block-math',
        content: match[1].trim(),
      });
    } else if (match[2] !== undefined) {
      segments.push({
        type: 'inline-math',
        content: match[2].trim(),
      });
    }

    currentIdx = regex.lastIndex;
  }

  if (currentIdx < text.length) {
    segments.push({
      type: 'text',
      content: text.substring(currentIdx),
    });
  }

  return segments;
}

// Math-Aware Markdown Renderer Component
const MathMarkdown = ({ content }: { content: string }) => {
  const segments = parseMathSegments(content);

  return (
    <div className="space-y-2 select-text leading-relaxed text-zinc-300">
      {segments.map((seg, idx) => {
        if (seg.type === 'block-math') {
          return (
            <motion.div
              key={idx}
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="my-4 p-5 bg-zinc-900/80 border border-zinc-800/80 rounded-2xl text-center font-mono text-[12px] text-violet-300 overflow-x-auto shadow-lg select-all"
            >
              {seg.content}
            </motion.div>
          );
        } else if (seg.type === 'inline-math') {
          return (
            <span
              key={idx}
              className="font-mono px-2 py-0.5 bg-zinc-900 border border-zinc-800/80 rounded-lg text-violet-400 text-[11px] mx-1 inline-block select-all"
            >
              {seg.content}
            </span>
          );
        } else {
          return (
            <ReactMarkdown
              key={idx}
              className="prose prose-invert prose-xs max-w-none prose-p:leading-relaxed prose-headings:font-bold prose-headings:text-zinc-100 prose-table:border-zinc-850 prose-th:bg-zinc-900/60 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2"
            >
              {seg.content}
            </ReactMarkdown>
          );
        }
      })}
    </div>
  );
};

export default function TutorPage() {
  const { showToast } = useToast();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [promptInput, setPromptInput] = useState('');
  const [tutorMode, setTutorMode] = useState<string>('standard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');

  // Dynamic greeting based on time of day
  const [greeting, setGreeting] = useState('Welcome');
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  // Context attachments
  const [attachedNoteId, setAttachedNoteId] = useState<string | null>(null);
  const [attachedNotebookId, setAttachedNotebookId] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

  // RAG States
  const [attachedDocIds, setAttachedDocIds] = useState<string[]>([]);
  const [userDocuments, setUserDocuments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [activeCitations, setActiveCitations] = useState<any[] | null>(null);
  const [selectedCitations, setSelectedCitations] = useState<any[]>([]);
  const [showCitationsDrawer, setShowCitationsDrawer] = useState(false);
  const [citationsMap, setCitationsMap] = useState<{ [msgId: string]: any[] }>({});

  // Popover selectors
  const [showNoteSelector, setShowNoteSelector] = useState(false);
  const [showNotebookSelector, setShowNotebookSelector] = useState(false);
  const [showDocSelector, setShowDocSelector] = useState(false);

  // Streaming and control states
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [failedRequestId, setFailedRequestId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Abort Controller for stopping stream
  const abortControllerRef = useRef<AbortController | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // API Queries & Mutations
  const { user } = useAuth();
  const { data: fcStats } = useFlashcardStats();
  const { data: qStats } = useAttemptsHistory();
  const { data: workspaces } = useWorkspaces();
  const activeWorkspaceId = workspaces?.[0]?.id || null;
  const { data: tasksData } = useTasksList({ workspaceId: activeWorkspaceId });

  const { data: conversations, isLoading: loadingConvs, refetch: refetchConvs } = useTutorConversations();
  const { data: activeConv, isLoading: loadingDetails, refetch: refetchDetails } = useTutorDetails(activeConversationId);
  const { data: notesData } = useNotesList({ archived: false, deleted: false });
  const { data: notebooks } = useNotebooks();

  const deleteChatMutation = useDeleteTutorChat();
  const renameChatMutation = useRenameTutorChat();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitleInput, setEditTitleInput] = useState('');

  // Dynamic metrics computed from real user context
  const userFirstName = user?.profile?.firstName || 'Student';
  const streakDays = fcStats?.streak || 0;
  const retentionAccuracy = fcStats?.accuracy || 95;
  const reviewsToday = fcStats?.reviewsToday || 0;
  const cardsDueCount = fcStats?.dueCount || 0;
  const averageQuizScore = qStats && qStats.length > 0 
    ? Math.round(qStats.reduce((acc, cur) => acc + cur.percentage, 0) / qStats.length)
    : 80;
  const activePlannerTasksCount = tasksData?.tasks?.length || 0;
  const completedAttempts = qStats?.length || 0;
  const notebookCount = notebooks?.length || 0;
  const documentsCount = userDocuments?.length || 0;
  const firstNotebookTitle = notebooks?.[0]?.title || null;
  const firstNoteTitle = notesData?.notes?.[0]?.title || null;

  // Build a dynamic activity timeline
  const timelineItems: { time: string; label: string; timestamp: number }[] = [];
  if (qStats) {
    qStats.slice(0, 3).forEach(q => {
      timelineItems.push({
        time: new Date(q.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        label: `Completed Quiz: ${q.quiz?.title || 'Assessment'} (${q.percentage}% Score)`,
        timestamp: new Date(q.startedAt).getTime()
      });
    });
  }
  if (notesData?.notes) {
    notesData.notes.slice(0, 3).forEach(n => {
      timelineItems.push({
        time: new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        label: `Created Note: ${n.title}`,
        timestamp: new Date(n.createdAt).getTime()
      });
    });
  }
  const sortedTimeline = timelineItems.sort((a, b) => b.timestamp - a.timestamp).slice(0, 4);

  // Weakest topic from stats
  const weakestTopicName = fcStats?.weakTopics?.[0]?.topic || 'Calculus';

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [promptInput]);

  // Scroll to bottom on response update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.messages, streamingText, isStreaming]);

  // Select first conversation if none selected
  useEffect(() => {
    if (conversations && conversations.length > 0 && !activeConversationId) {
      setActiveConversationId(conversations[0].id);
    }
  }, [conversations, activeConversationId]);

  const handleCreateChat = () => {
    setActiveConversationId(null);
    setPromptInput('');
    setStreamingText('');
    setFailedRequestId(null);
    showToast('Started new tutoring session. Compose your prompt to begin.', 'info');
  };

  const handleRenameChat = async (id: string, newTitle: string) => {
    if (!newTitle.trim()) {
      showToast('Title cannot be empty', 'error');
      return;
    }
    try {
      await renameChatMutation.mutateAsync({ id, title: newTitle.trim() });
      setEditingId(null);
      showToast('Conversation renamed', 'success');
      refetchConvs();
    } catch (err) {
      showToast('Failed to rename conversation', 'error');
    }
  };

  const handleDeleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteChatMutation.mutateAsync(id);
      showToast('Conversation deleted', 'success');
      refetchConvs();
      if (activeConversationId === id) {
        setActiveConversationId(null);
      }
    } catch (err) {
      showToast('Failed to delete conversation', 'error');
    }
  };

  const handleUploadDocument = async (file: File) => {
    if (isUploading) return;
    setIsUploading(true);
    setUploadProgressText(`Uploading ${file.name}...`);
    
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1';
      const token = localStorage.getItem('accessToken');
      
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${apiBase}/knowledge/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Upload failed');
      }

      const data = await res.json();
      showToast(`${file.name} uploaded successfully. Indexing started...`, 'success');
      pollDocumentStatus(data.documentId, file.name);
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Failed to upload document', 'error');
      setIsUploading(false);
    }
  };

  const pollDocumentStatus = async (docId: string, name: string) => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1';
    const token = localStorage.getItem('accessToken');
    
    setUploadProgressText(`Indexing ${name}...`);
    let attempts = 0;
    
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`${apiBase}/rag/documents`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const docs = await res.json();
          const target = docs.find((d: any) => d.id === docId);
          if (target && target.status === 'indexed') {
            clearInterval(interval);
            showToast(`${name} is now fully indexed and ready for Q&A!`, 'success');
            setAttachedDocIds((prev) => [...prev, docId]);
            setIsUploading(false);
            fetchUserDocuments();
            return;
          }
        }
      } catch (e) {}

      if (attempts > 30) {
        clearInterval(interval);
        showToast(`Indexing ${name} took too long. It will continue in the background.`, 'info');
        setIsUploading(false);
        fetchUserDocuments();
      }
    }, 2000);
  };

  const fetchUserDocuments = async () => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1';
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${apiBase}/rag/documents`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const docs = await res.json();
        setUserDocuments(docs);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchUserDocuments();
  }, []);

  const handleOpenCitations = (msgCitations: any[]) => {
    setSelectedCitations(msgCitations);
    setShowCitationsDrawer(true);
  };

  const handleSendPrompt = async (textToSend: string, isRetry = false) => {
    if (!textToSend.trim() || isStreaming) return;

    setPromptInput('');
    setStreamingText('');
    setFailedRequestId(null);
    setIsStreaming(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const token = localStorage.getItem('accessToken');
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1';

      const payload = {
        conversationId: isRetry ? activeConversationId : activeConversationId || undefined,
        prompt: textToSend,
        mode: tutorMode,
        noteId: attachedNoteId || undefined,
        notebookId: attachedNotebookId || undefined,
        model: selectedModel,
        documentIds: attachedDocIds.length > 0 ? attachedDocIds : undefined,
      };

      if (activeConv?.messages) {
        activeConv.messages.push({
          id: 'optimistic-user-msg',
          conversationId: activeConversationId || '',
          role: 'user',
          content: textToSend,
          createdAt: new Date().toISOString(),
        });
      }

      const res = await fetch(`${apiBase}/tutor/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
        signal: abortController.signal,
      });

      if (!res.ok) {
        throw new Error('AI stream initialization failed');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      let resolvedConvId = activeConversationId;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.substring(6).trim();
            if (dataStr === '[DONE]') {
              break;
            } else if (dataStr.startsWith('[ERROR]:')) {
              throw new Error(dataStr.substring(8));
            } else if (dataStr.startsWith('[CONVERSATION_ID]:')) {
              const convId = dataStr.substring(18).trim();
              resolvedConvId = convId;
              setActiveConversationId(convId);
            } else if (dataStr.startsWith('[TITLE]:')) {
              refetchConvs();
            } else if (dataStr.startsWith('[CITATIONS]:')) {
              const citationJson = dataStr.substring(12).trim();
              try {
                const parsedCitations = JSON.parse(citationJson);
                setActiveCitations(parsedCitations);
              } catch (e) {}
            } else {
              setStreamingText((prev) => prev + line.substring(6));
            }
          }
        }
      }

      const details = await refetchDetails();
      await refetchConvs();

      const updatedMessages = details.data?.messages || [];
      const assistantMsgs = updatedMessages.filter((m: any) => m.role === 'assistant');
      if (assistantMsgs.length > 0 && activeCitations) {
        const lastMsg = assistantMsgs[assistantMsgs.length - 1];
        setCitationsMap((prev) => ({
          ...prev,
          [lastMsg.id]: activeCitations,
        }));
      }

      setActiveCitations(null);
      setAttachedFile(null);
      setAttachedDocIds([]);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        showToast('Generation cancelled', 'info');
        await refetchDetails();
        await refetchConvs();
      } else {
        console.error(err);
        showToast(err.message || 'Error generating response', 'error');
        setFailedRequestId(textToSend);
      }
    } finally {
      setIsStreaming(false);
      setStreamingText('');
      abortControllerRef.current = null;
    }
  };

  const handleStopStream = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (activeConversationId) {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1';
        const token = localStorage.getItem('accessToken');
        await fetch(`${apiBase}/tutor/stop`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ conversationId: activeConversationId }),
        });
      } catch (e) {}
    }
    setIsStreaming(false);
    setStreamingText('');
  };

  const handleRegenerate = async () => {
    if (isStreaming || !activeConversationId) return;
    setIsStreaming(true);
    setStreamingText('');

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const token = localStorage.getItem('accessToken');
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1';

      const res = await fetch(`${apiBase}/tutor/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ conversationId: activeConversationId }),
        signal: abortController.signal,
      });

      if (!res.ok) throw new Error('Regeneration failed');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.substring(6).trim();
            if (dataStr === '[DONE]') break;
            else if (dataStr.startsWith('[ERROR]:')) throw new Error(dataStr.substring(8));
            else if (!dataStr.startsWith('[CONVERSATION_ID]:') && !dataStr.startsWith('[TITLE]:')) {
              setStreamingText((prev) => prev + line.substring(6));
            }
          }
        }
      }

      await refetchDetails();
    } catch (err: any) {
      showToast(err.message || 'Failed to regenerate', 'error');
    } finally {
      setIsStreaming(false);
      setStreamingText('');
      abortControllerRef.current = null;
    }
  };

  const handleCopyText = (content: string, msgId: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 1500);
    showToast('Copied content to clipboard', 'success');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendPrompt(promptInput);
    }
  };

  // Filter conversations
  const filteredConversations = conversations?.filter(c => 
    c.title?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="absolute inset-0 bg-[#070708] flex overflow-hidden">
      
      {/* 1. LEFT SIDEBAR: HISTORIC DIRECTORIES */}
      <div className="w-80 border-r border-zinc-900 bg-zinc-950/20 backdrop-blur-md flex flex-col h-full shrink-0 select-none">
        
        {/* New Session Header */}
        <div className="p-4 border-b border-zinc-900 flex justify-between items-center gap-2 shrink-0">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-550">Sessions</span>
          <button
            onClick={handleCreateChat}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-[10.5px] font-bold transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-zinc-900/60 shrink-0">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-zinc-650" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversation..."
              className="w-full bg-zinc-950/80 border border-zinc-850/60 rounded-xl pl-8.5 pr-3 py-2 text-xs text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
        </div>

        {/* Directory List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
          {loadingConvs ? (
            <div className="py-8 text-center text-zinc-650 text-xs">Loading sessions...</div>
          ) : filteredConversations.length > 0 ? (
            filteredConversations.map((chat) => {
              const isSelected = activeConversationId === chat.id;
              return (
                <div
                  key={chat.id}
                  onClick={() => {
                    setActiveConversationId(chat.id);
                    setStreamingText('');
                  }}
                  className={`w-full p-3 rounded-xl border text-left flex items-start justify-between gap-2.5 transition-all cursor-pointer relative group ${
                    isSelected
                      ? 'bg-zinc-900/60 border-zinc-800 text-white'
                      : 'bg-transparent border-transparent text-zinc-500 hover:bg-zinc-900/20 hover:text-zinc-350'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <MessageSquare className={`h-4 w-4 shrink-0 mt-0.5 ${isSelected ? 'text-violet-400' : 'text-zinc-600'}`} />
                    <div className="min-w-0 flex-1">
                      {editingId === chat.id ? (
                        <input
                          type="text"
                          value={editTitleInput}
                          onChange={(e) => setEditTitleInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleRenameChat(chat.id, editTitleInput)}
                          onBlur={() => handleRenameChat(chat.id, editTitleInput)}
                          className="w-full bg-zinc-950 border border-zinc-850 rounded px-1.5 py-0.5 text-xs text-zinc-200 outline-none"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="text-xs font-semibold block truncate pr-2">
                          {chat.title || 'Untitled Session'}
                        </span>
                      )}
                      <span className="text-[9px] text-zinc-550 block font-medium mt-0.5">
                        {new Date(chat.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(chat.id);
                        setEditTitleInput(chat.title || '');
                      }}
                      className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
                      title="Rename"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteChat(chat.id, e)}
                      className="p-1 hover:bg-red-950/40 rounded text-zinc-500 hover:text-red-400 transition cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 border border-dashed border-zinc-900 rounded-2xl text-center bg-zinc-950/10">
              <Sparkles className="h-6 w-6 text-zinc-750 mx-auto" />
              <p className="text-[11px] text-zinc-600 font-bold uppercase tracking-wider mt-2">No historic chats</p>
              <p className="text-[10px] text-zinc-500 max-w-[180px] mx-auto leading-normal">
                Your study conversations will appear here once saved.
              </p>
            </div>
          )}
        </div>

        {/* Sidebar Compact Dashboard Widget */}
        <div className="p-4 border-t border-zinc-900 bg-zinc-950/30 space-y-3 shrink-0">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-550 mb-1.5 flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500 animate-pulse" />
            <span>Today's Progress</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10.5px]">
            <div className="p-2.5 bg-zinc-900/30 border border-zinc-850/50 rounded-xl">
              <span className="text-zinc-550 block text-[8px] uppercase font-bold">Streak</span>
              <span className="font-bold text-zinc-200">5 Days 🔥</span>
            </div>
            <div className="p-2.5 bg-zinc-900/30 border border-zinc-850/50 rounded-xl">
              <span className="text-zinc-550 block text-[8px] uppercase font-bold">Daily Goal</span>
              <span className="font-bold text-zinc-200">80% Done</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN CONVERSATION AREA */}
      <div className="flex-1 flex flex-col h-full bg-[#070708] relative select-text min-w-0">
        
        {/* Header Controls */}
        <div className="h-16 border-b border-zinc-900 px-6 flex items-center justify-between bg-zinc-950/20 backdrop-blur-md shrink-0 z-10 relative">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shadow-sm shrink-0">
              <Brain className="h-5 w-5" />
            </div>
            <div className="flex flex-col min-w-0 text-left">
              <h1 className="font-extrabold text-sm text-zinc-100 tracking-tight leading-none truncate">
                {activeConv?.title || 'Academic Tutor Workspace'}
              </h1>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[9px] uppercase tracking-widest font-extrabold text-zinc-500">
                  Cognitive Personal Academic Agent
                </span>
                <span className="h-1 w-1 bg-zinc-850 rounded-full" />
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    {isStreaming && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                    )}
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${isStreaming ? 'bg-violet-450' : 'bg-emerald-500'}`}></span>
                  </span>
                  <span className="text-[9.5px] uppercase font-bold text-zinc-550 tracking-wider">
                    {isStreaming ? 'AI Generating' : 'Connected'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Model & Mode Controls */}
          <div className="flex items-center gap-3.5">
            <div className="flex items-center gap-2 bg-zinc-900/40 border border-zinc-850/60 rounded-full px-3.5 py-1.5 transition-all">
              <span className="text-[9.5px] uppercase font-bold text-zinc-500 tracking-wider">Engine</span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-transparent text-[11px] text-zinc-200 border-none focus:outline-none cursor-pointer font-bold"
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gpt-4o">OpenAI GPT-4o</option>
                <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-zinc-900/40 border border-zinc-855 rounded-full px-3.5 py-1.5 transition-all">
              <span className="text-[9.5px] uppercase font-bold text-zinc-500 tracking-wider">Mode</span>
              <select
                value={tutorMode}
                onChange={(e) => setTutorMode(e.target.value)}
                className="bg-transparent text-[11px] text-zinc-200 border-none focus:outline-none cursor-pointer font-bold"
              >
                <option value="standard">Standard</option>
                <option value="eli5">ELI5 (Analogy)</option>
                <option value="socratic">Socratic Method</option>
                <option value="professor">Professor Mode</option>
                <option value="exam">Exam Prep</option>
                <option value="debug">Code Debug</option>
              </select>
            </div>
          </div>
        </div>

        {/* Message Flow & Dashboard landing */}
        <div className="flex-grow overflow-y-auto px-6 py-6 space-y-6 scrollbar-thin bg-transparent relative z-10">
          {activeConv?.messages && activeConv.messages.length > 0 ? (
            activeConv.messages.map((m) => {
              const isUser = m.role === 'user';
              if (m.content === 'Initialize conversation') return null;

              return (
                <div
                  key={m.id}
                  className={`flex gap-4.5 max-w-3xl animate-fade-in ${
                    isUser ? 'ml-auto flex-row-reverse' : ''
                  }`}
                >
                  <div
                    className={`h-9 w-9 rounded-2xl flex-shrink-0 flex items-center justify-center font-semibold text-xs border ${
                      isUser
                        ? 'bg-zinc-900 border-zinc-800 text-zinc-350'
                        : 'bg-violet-600/10 border-violet-500/20 text-violet-400'
                    }`}
                  >
                    {isUser ? <User className="h-4.5 w-4.5 text-zinc-450" /> : <Sparkles className="h-4.5 w-4.5 text-violet-400" />}
                  </div>

                  <div className="flex flex-col gap-2 min-w-0 max-w-2xl text-left">
                    <motion.div
                      initial={{ y: 8, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.18 }}
                      className={`px-5 py-4 rounded-2xl border text-xs leading-relaxed shadow-sm transition-all ${
                        isUser
                          ? 'bg-zinc-900 border-zinc-800 text-zinc-150 rounded-br-sm'
                          : 'bg-zinc-950/20 border-zinc-900/60 text-zinc-300 rounded-bl-sm'
                      }`}
                    >
                      {isUser ? (
                        <span className="whitespace-pre-wrap select-text">{m.content}</span>
                      ) : (
                        <MathMarkdown content={m.content} />
                      )}
                    </motion.div>

                    {!isUser && (
                      <div className="flex items-center gap-3 px-1 mt-0.5">
                        <button
                          onClick={() => handleCopyText(m.content, m.id)}
                          className="flex items-center gap-1.5 text-[9.5px] font-bold text-zinc-550 hover:text-zinc-350 transition uppercase cursor-pointer"
                        >
                          {copiedId === m.id ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy Response</span>
                            </>
                          )}
                        </button>

                        {citationsMap[m.id] && citationsMap[m.id].length > 0 && (
                          <button
                            onClick={() => handleOpenCitations(citationsMap[m.id])}
                            className="flex items-center gap-1.5 text-[9.5px] font-bold text-violet-450 hover:text-violet-350 transition uppercase cursor-pointer ml-3"
                          >
                            <BookOpen className="h-3 w-3 text-violet-450" />
                            <span>View Sources ({citationsMap[m.id].length})</span>
                          </button>
                        )}

                        {activeConv?.messages && activeConv.messages[activeConv.messages.length - 1]?.id === m.id && !isStreaming && (
                          <button
                            onClick={handleRegenerate}
                            className="flex items-center gap-1.5 text-[9.5px] font-bold text-zinc-550 hover:text-zinc-350 transition uppercase cursor-pointer ml-3"
                          >
                            <RotateCcw className="h-3 w-3 text-zinc-600" />
                            <span>Regenerate</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : !isStreaming ? (
            
            /* AI TUTOR 3.0 PERSONALIZED BRIEFING LANDING HERO */
            <div className="space-y-8 max-w-4xl mx-auto py-4 text-left">
              
              {/* Personalized Briefing Title */}
              <div className="space-y-1">
                <h2 className="text-2xl font-black tracking-tight text-white font-sans">
                  {greeting}, {userFirstName} 👋
                </h2>
                <p className="text-xs text-zinc-400 font-medium">Here's your personalized learning briefing.</p>
              </div>

              {/* Dynamic recommendation metric cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { title: firstNoteTitle ? `Continue ${firstNoteTitle}` : 'Continue Revision', val: `${reviewsToday} reviews completed`, desc: 'Socratic mode calibration active', icon: Brain, color: 'text-violet-400', confidence: `${retentionAccuracy}% accuracy` },
                  { title: `${cardsDueCount} Flashcards due`, val: `Streak: ${streakDays} days 🔥`, desc: 'Meets daily memory target', icon: Clock, color: 'text-orange-400', confidence: `Recall: ${retentionAccuracy}%` },
                  { title: 'Recommended quiz practice', val: `Average score: ${averageQuizScore}%`, desc: 'Sync with active scheduler', icon: Award, color: 'text-emerald-400', confidence: 'Calibration active' }
                ].map((rec, i) => (
                  <div key={i} className="p-5 rounded-2xl border border-zinc-900 bg-zinc-900/30 flex flex-col justify-between gap-4 relative overflow-hidden group hover:border-violet-500/20 transition">
                    <div className="flex justify-between items-start">
                      <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400">
                        <rec.icon className={`w-5 h-5 ${rec.color}`} />
                      </div>
                      <span className="text-[8.5px] font-bold uppercase tracking-widest text-zinc-550 bg-zinc-950 border border-zinc-850 px-2 py-0.5 rounded-full">{rec.confidence}</span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-xs font-extrabold text-zinc-200 block">{rec.title}</span>
                      <span className="text-[10px] text-zinc-555 block font-semibold">{rec.val}</span>
                      <span className="text-[9.5px] text-zinc-500 block leading-tight mt-1">{rec.desc}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Context Awareness row */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block">AI Memory & Context RAG</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    firstNotebookTitle ? `${firstNotebookTitle} Notebook` : 'No Notebook attached',
                    `${documentsCount} Documents indexed`,
                    `${fcStats?.reviewsToday || 0} Flashcards synced`,
                    `${activePlannerTasksCount} Active Planner Tasks`,
                    'Calendar RAG connected',
                    `${selectedModel} Active`
                  ].map((chip, idx) => (
                    <div key={idx} className="px-3.5 py-1.5 rounded-xl border border-zinc-850 bg-zinc-900/30 text-[10px] font-black uppercase tracking-wider text-violet-400 shadow-sm flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      {chip}
                    </div>
                  ))}
                </div>
              </div>

              {/* Smart prompt suggestions gallery */}
              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block">Tutoring Prompts</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { title: 'Teach this chapter', val: 'Explain like MIT Professor', prompt: 'Walk me through CPU context switching and interrupt vector tables.', xp: '+40 XP' },
                    { title: 'Challenge my recall', val: 'Socratic tutoring play', prompt: 'Quiz me socratically on process sync mutexes and binary semaphores.', xp: '+60 XP' }
                  ].map((suggest, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setPromptInput(suggest.prompt);
                        handleSendPrompt(suggest.prompt);
                      }}
                      className="p-5 bg-zinc-900/10 border border-zinc-900 hover:border-violet-500/20 rounded-2xl flex flex-col justify-between text-left transition-all cursor-pointer group"
                    >
                      <div className="flex justify-between items-start w-full">
                        <span className="text-xs font-black text-zinc-200 group-hover:text-violet-400 transition">{suggest.title}</span>
                        <span className="text-[9px] font-black text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded">{suggest.xp}</span>
                      </div>
                      <p className="text-[10px] text-zinc-500 font-semibold leading-relaxed mt-2.5">{suggest.prompt}</p>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          ) : null}

          {/* Streaming Assistant chunk */}
          {isStreaming && streamingText && (
            <div className="flex gap-4.5 max-w-3xl animate-fade-in text-left">
              <div className="h-9 w-9 rounded-2xl flex-shrink-0 flex items-center justify-center border bg-violet-600/10 border-violet-500/20 text-violet-400 shadow-sm">
                <Sparkles className="h-4.5 w-4.5 text-violet-400 animate-spin" />
              </div>
              <div className="px-5 py-4 rounded-2xl border bg-zinc-950/20 border-zinc-900/60 text-zinc-300 max-w-2xl min-w-0">
                <MathMarkdown content={streamingText} />
                <span className="inline-block h-4 w-1.5 bg-violet-400 rounded-sm ml-0.5 animate-pulse" />
              </div>
            </div>
          )}

          {/* Streaming initialization placeholder */}
          {isStreaming && !streamingText && (
            <div className="flex gap-4.5 max-w-3xl animate-pulse text-left">
              <div className="h-9 w-9 rounded-2xl flex-shrink-0 flex items-center justify-center border bg-violet-600/10 border-violet-500/20 text-violet-400">
                <RefreshCw className="h-4.5 w-4.5 animate-spin text-violet-400" />
              </div>
              <div className="px-5 py-3 rounded-2xl bg-zinc-900/25 border border-zinc-900 text-zinc-500 text-xs italic flex items-center gap-2">
                <span>AI Tutor compiling academic context...</span>
              </div>
            </div>
          )}

          {failedRequestId && (
            <div className="max-w-2xl p-4 bg-red-950/15 border border-red-500/20 rounded-2xl flex items-center justify-between gap-4 mt-4 select-none">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="h-4.5 w-4.5 text-red-400 shrink-0" />
                <span className="text-xs text-red-200">
                  Failed to generate response. Check your network or model credentials.
                </span>
              </div>
              <button
                onClick={() => handleSendPrompt(failedRequestId, true)}
                className="px-3.5 py-1.5 bg-red-900 hover:bg-red-800 text-white font-extrabold text-[10px] tracking-wide uppercase rounded-xl transition-all cursor-pointer shrink-0"
              >
                Retry Sending
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 3. BOTTOM COMPOSER AND CONTEXT ROWS */}
        <div className="p-5 border-t border-zinc-900 bg-zinc-950/20 backdrop-blur-md shrink-0 relative z-10">
          <div className="max-w-3xl mx-auto space-y-4">
            
            {/* AI BRIEFING STATS PANEL DISPLAYED ABOVE THE CHAT INPUT */}
            <div className="p-4 rounded-2xl border border-zinc-900 bg-zinc-950/50 flex flex-wrap justify-between items-center gap-4 text-xs font-bold text-zinc-500 text-left select-none">
              <span className="text-zinc-200 font-extrabold flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-violet-400" /> Today's Focus:</span>
              <span>✔ Upcoming: {firstNotebookTitle || firstNoteTitle || 'Revision'}</span>
              <span>✔ Weakest subject: {weakestTopicName}</span>
              <span>✔ Memory stability: {retentionAccuracy}%</span>
              <span>✔ Streak days: {streakDays} days</span>
            </div>

            {/* Active Attachments Status Row */}
            {(attachedNoteId || attachedNotebookId || attachedFile || attachedDocIds.length > 0 || isUploading) && (
              <div className="flex flex-wrap gap-2">
                {isUploading && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 text-[10px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-lg shadow-sm animate-pulse">
                    <RefreshCw className="h-3 w-3 animate-spin text-violet-400" />
                    <span>{uploadProgressText}</span>
                  </div>
                )}
                {attachedDocIds.length > 0 && (
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.15 }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-lg shadow-sm"
                  >
                    <span>Materials: {attachedDocIds.length} Attached</span>
                    <button onClick={() => setAttachedDocIds([])} className="hover:text-zinc-200 transition cursor-pointer">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </motion.div>
                )}
                {attachedNotebookId && (
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.15 }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-lg shadow-sm"
                  >
                    <span>Notebook: {notebooks?.find((nb: any) => nb.id === attachedNotebookId)?.title || 'Attached'}</span>
                    <button onClick={() => setAttachedNotebookId(null)} className="hover:text-zinc-200 transition cursor-pointer">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </motion.div>
                )}
                {attachedNoteId && (
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.15 }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-lg shadow-sm"
                  >
                    <span>Note: {notesData?.notes?.find((n: any) => n.id === attachedNoteId)?.title || 'Attached'}</span>
                    <button onClick={() => setAttachedNoteId(null)} className="hover:text-zinc-200 transition cursor-pointer">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </motion.div>
                )}
                {attachedFile && (
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.15 }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg shadow-sm"
                  >
                    <span>File: {attachedFile.name}</span>
                    <button onClick={() => setAttachedFile(null)} className="hover:text-zinc-200 transition cursor-pointer">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </motion.div>
                )}
              </div>
            )}

            {/* Form Composer Container */}
            <div className="relative border border-zinc-800 bg-[#0b0b0d]/90 focus-within:border-zinc-700 transition-all rounded-[22px] p-2.5 flex flex-col gap-1.5">
              <textarea
                ref={textareaRef}
                rows={1}
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about your study materials... (Shift+Enter for newline, Enter to send)"
                className="w-full bg-transparent px-3 py-2 text-xs text-zinc-200 placeholder-zinc-750 focus:outline-none resize-none leading-relaxed min-h-[40px]"
              />

              {/* Bottom Controls Bar */}
              <div className="flex items-center justify-between border-t border-zinc-900/60 pt-2 px-1.5 shrink-0">
                {/* Attach Context Buttons */}
                <div className="flex items-center gap-2 relative">
                  {/* Note Trigger */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setShowNoteSelector(!showNoteSelector);
                        setShowNotebookSelector(false);
                        setShowDocSelector(false);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-semibold tracking-wide transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500/20 ${
                        attachedNoteId
                          ? 'border-indigo-500 bg-indigo-500/15 text-indigo-400'
                          : 'border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      <span>Note</span>
                    </button>
                    <AnimatePresence>
                      {showNoteSelector && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          transition={{ duration: 0.15 }}
                          className="absolute bottom-full mb-3 left-0 w-64 bg-zinc-950 border border-zinc-850 rounded-2xl shadow-xl z-30 max-h-56 overflow-y-auto p-1.5 divide-y divide-zinc-900"
                        >
                          <div className="px-3 py-2 text-[9px] font-bold text-zinc-550 uppercase tracking-widest">
                            Select Study Note
                          </div>
                          {notesData?.notes && notesData.notes.length > 0 ? (
                            notesData.notes.map((n: any) => (
                              <button
                                key={n.id}
                                type="button"
                                onClick={() => {
                                  setAttachedNoteId(n.id);
                                  setShowNoteSelector(false);
                                }}
                                className="w-full text-left px-3 py-2.5 text-xs text-zinc-400 hover:bg-zinc-900 rounded-xl hover:text-zinc-200 truncate transition-all cursor-pointer"
                              >
                                {n.title}
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-xs text-zinc-650 italic text-left">No active notes found</div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Notebook Trigger */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setShowNotebookSelector(!showNotebookSelector);
                        setShowNoteSelector(false);
                        setShowDocSelector(false);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-semibold tracking-wide transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500/20 ${
                        attachedNotebookId
                          ? 'border-violet-500 bg-violet-500/15 text-violet-400'
                          : 'border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      <span>Notebook</span>
                    </button>
                    <AnimatePresence>
                      {showNotebookSelector && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          transition={{ duration: 0.15 }}
                          className="absolute bottom-full mb-3 left-0 w-64 bg-zinc-950 border border-zinc-850 rounded-2xl shadow-xl z-30 max-h-56 overflow-y-auto p-1.5 divide-y divide-zinc-900"
                        >
                          <div className="px-3 py-2 text-[9px] font-bold text-zinc-550 uppercase tracking-widest">
                            Select Notebook
                          </div>
                          {notebooks && notebooks.length > 0 ? (
                            notebooks.map((nb: any) => (
                              <button
                                key={nb.id}
                                type="button"
                                onClick={() => {
                                  setAttachedNotebookId(nb.id);
                                  setShowNotebookSelector(false);
                                }}
                                className="w-full text-left px-3 py-2.5 text-xs text-zinc-400 hover:bg-zinc-900 rounded-xl hover:text-zinc-200 truncate transition-all cursor-pointer"
                              >
                                {nb.title}
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-xs text-zinc-655 italic text-left">No active notebooks</div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Materials Trigger */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDocSelector(!showDocSelector);
                        setShowNoteSelector(false);
                        setShowNotebookSelector(false);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-semibold tracking-wide transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500/20 ${
                        attachedDocIds.length > 0
                          ? 'border-violet-500 bg-violet-500/15 text-violet-400'
                          : 'border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>Materials ({attachedDocIds.length})</span>
                    </button>
                    <AnimatePresence>
                      {showDocSelector && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          transition={{ duration: 0.15 }}
                          className="absolute bottom-full mb-3 left-0 w-64 bg-zinc-950 border border-zinc-850 rounded-2xl shadow-xl z-30 max-h-56 overflow-y-auto p-1.5 divide-y divide-zinc-900 animate-fade-in"
                        >
                          <div className="px-3 py-2 text-[9px] font-bold text-zinc-550 uppercase tracking-widest flex items-center justify-between">
                            <span>Select Study Documents</span>
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="text-[9px] text-violet-400 hover:text-violet-300 font-bold uppercase tracking-wider cursor-pointer"
                            >
                              Upload New
                            </button>
                          </div>
                          {userDocuments && userDocuments.length > 0 ? (
                            userDocuments.map((d: any) => {
                              const isAttached = attachedDocIds.includes(d.id);
                              return (
                                <button
                                  key={d.id}
                                  type="button"
                                  onClick={() => {
                                    if (isAttached) {
                                      setAttachedDocIds((prev) => prev.filter((id) => id !== d.id));
                                    } else {
                                      setAttachedDocIds((prev) => [...prev, d.id]);
                                    }
                                  }}
                                  className={`w-full text-left px-3 py-2.5 text-xs rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                                    isAttached ? 'bg-violet-500/10 text-violet-350 font-semibold' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                                  }`}
                                >
                                  <span className="truncate pr-2">{d.name}</span>
                                  {isAttached && <Check className="h-3.5 w-3.5 text-violet-455 shrink-0" />}
                                </button>
                              );
                            })
                          ) : (
                            <div className="px-3 py-2 text-xs text-zinc-650 italic text-left">No indexed documents yet</div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* File Trigger */}
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleUploadDocument(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center p-2 bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-300 rounded-xl transition-all text-zinc-450 cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                      title="Upload File Context"
                    >
                      <FileText className="h-4 w-4 text-zinc-400" />
                    </button>
                  </div>

                  {/* Voice Input Trigger */}
                  <button
                    type="button"
                    onClick={() =>
                      showToast('Voice mode coming soon! We are building high-fidelity speech-to-text integration.', 'info')
                    }
                    className="flex items-center justify-center p-2 bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-300 rounded-xl transition-all text-zinc-450 cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                    title="Voice Input"
                  >
                    <Mic className="h-4 w-4 text-zinc-400" />
                  </button>
                </div>

                {/* Action Trigger */}
                <div className="flex gap-2">
                  {isStreaming && (
                    <button
                      type="button"
                      onClick={handleStopStream}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 bg-red-900/90 hover:bg-red-800 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer shrink-0"
                    >
                      <StopCircle className="h-4 w-4" />
                      <span>Stop</span>
                    </button>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSendPrompt(promptInput)}
                    disabled={isStreaming || !promptInput.trim()}
                    className="flex items-center justify-center gap-2 px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-650 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-violet-900/20 transition-all disabled:opacity-45 cursor-pointer shrink-0 focus:outline-none"
                  >
                    <span>Send</span>
                    <Send className="h-3.5 w-3.5" />
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. RIGHT SIDEBAR: AI COGNITIVE MEMORY PANEL */}
      <div className="w-80 border-l border-zinc-900 bg-zinc-950/20 backdrop-blur-md flex flex-col h-full shrink-0 p-5 space-y-6 text-left select-none hidden xl:flex">
        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 pb-2 border-b border-zinc-900 flex items-center gap-2">
          <Brain className="w-4 h-4 text-violet-400" />
          AI Learning Engine
        </h3>

        {/* Memory metrics */}
        <div className="space-y-4">
          <div className="space-y-1">
            <span className="text-[9px] font-bold text-zinc-550 block uppercase tracking-wider">Estimated Recall Curve</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-white">{retentionAccuracy}%</span>
              <span className="text-[10px] text-zinc-500 leading-tight">Stability rating: High</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[9px] font-bold text-zinc-550 block uppercase tracking-wider">Weekly Learning Velocity</span>
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-violet-400">+{completedAttempts * 50 || 120} XP</span>
              <span className="text-[10px] text-zinc-500">{completedAttempts} milestones met</span>
            </div>
          </div>
        </div>

        {/* Weak / Strong Topics */}
        <div className="space-y-4 pt-4 border-t border-zinc-900">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block">Cognitive Map</span>
          <div className="space-y-2">
            <div className="p-3 bg-zinc-900/30 border border-zinc-850 rounded-xl">
              <span className="text-xs font-extrabold text-zinc-200 block">Strong Areas</span>
              <span className="text-[9px] text-zinc-555 font-semibold block leading-tight mt-0.5">{firstNoteTitle || 'General revision topics'}</span>
            </div>
            <div className="p-3 bg-zinc-900/30 border border-zinc-850 rounded-xl">
              <span className="text-xs font-extrabold text-violet-400 block">Needs Revision</span>
              <span className="text-[9px] text-zinc-550 font-semibold block leading-tight mt-0.5">{weakestTopicName}</span>
            </div>
          </div>
        </div>

        {/* Study Timeline activity list */}
        <div className="space-y-3.5 pt-4 border-t border-zinc-900 flex-1 overflow-y-auto pr-1 scrollbar-thin">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-550 block">Recent Activity</span>
          {sortedTimeline.length > 0 ? (
            <div className="space-y-3 font-semibold text-[10px] text-zinc-500">
              {sortedTimeline.map((item, idx) => (
                <div key={idx} className="flex gap-2">
                  <Clock className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                  <span>{item.time} • {item.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10.5px] text-zinc-500 italic leading-normal">
              No recent activities recorded. Start a quiz, create notes, or upload study documents to log history.
            </p>
          )}
        </div>
      </div>

      {/* Citations Side Drawer */}
      <AnimatePresence>
        {showCitationsDrawer && selectedCitations && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCitationsDrawer(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 cursor-pointer"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-96 bg-[#0b0b0d] border-l border-zinc-900 shadow-2xl z-50 flex flex-col p-6 overflow-hidden select-text text-left"
            >
              <div className="flex items-center justify-between border-b border-zinc-900 pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-violet-400" />
                  <h3 className="font-extrabold text-sm text-zinc-155 tracking-tight">Source Citations</h3>
                </div>
                <button
                  onClick={() => setShowCitationsDrawer(false)}
                  className="p-1.5 hover:bg-zinc-900 rounded-lg text-zinc-550 hover:text-zinc-300 cursor-pointer"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto space-y-4 pr-1 scrollbar-thin">
                {selectedCitations.map((cit, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-zinc-900/40 border border-zinc-850/50 rounded-2xl space-y-2.5 relative overflow-hidden group hover:border-zinc-800 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-violet-400" />
                        <span className="text-xs font-bold text-zinc-200 truncate max-w-[200px]">{cit.documentName}</span>
                      </div>
                      <span className="px-2 py-0.5 bg-zinc-950 border border-zinc-850/60 rounded-md text-[9px] font-bold text-zinc-400">
                        Page {cit.pageNumber}
                      </span>
                    </div>

                    <p className="text-[11.5px] text-zinc-400 leading-relaxed italic bg-zinc-950/30 p-2.5 border border-zinc-900 rounded-xl select-text">
                      "{cit.content}"
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-zinc-550 pt-1">
                      <span>Relevance Score</span>
                      <span className="font-bold text-violet-400">{Math.round(cit.score * 100)}%</span>
                    </div>
                    <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-violet-600 to-indigo-650 h-full rounded-full"
                        style={{ width: `${cit.score * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-violet-950/20 backdrop-blur-sm border-2 border-dashed border-violet-500 rounded-3xl z-55 flex flex-col items-center justify-center pointer-events-none animate-fade-in">
          <Brain className="h-16 w-16 text-violet-455 animate-bounce mb-4" />
          <h3 className="text-xl font-bold text-zinc-150">Drop your study files here to index</h3>
          <p className="text-xs text-zinc-550 mt-2">Supports PDF, DOCX, PPTX, TXT, Markdown, and source code</p>
        </div>
      )}
    </div>
  );
}
