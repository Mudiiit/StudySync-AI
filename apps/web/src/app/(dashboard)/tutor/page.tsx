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
  const { data: conversations, isLoading: loadingConvs, refetch: refetchConvs } = useTutorConversations();
  const { data: activeConv, isLoading: loadingDetails, refetch: refetchDetails } = useTutorDetails(activeConversationId);
  const { data: notesData } = useNotesList({ archived: false, deleted: false });
  const { data: notebooks } = useNotebooks();

  const deleteChatMutation = useDeleteTutorChat();
  const renameChatMutation = useRenameTutorChat();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitleInput, setEditTitleInput] = useState('');

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

  // Main prompt stream trigger
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendPrompt(promptInput);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Copied content to clipboard', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Group conversations by date
  const groupConversations = () => {
    if (!conversations) return {};
    const filtered = conversations.filter((c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groups: { [key: string]: any[] } = {
      Today: [],
      Yesterday: [],
      'Previous Days': [],
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    filtered.forEach((c) => {
      const cDate = new Date(c.updatedAt);
      cDate.setHours(0, 0, 0, 0);

      if (cDate.getTime() === today.getTime()) {
        groups['Today'].push(c);
      } else if (cDate.getTime() === yesterday.getTime()) {
        groups['Yesterday'].push(c);
      } else {
        groups['Previous Days'].push(c);
      }
    });

    return groups;
  };

  const grouped = groupConversations();

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#09090b] text-zinc-200 overflow-hidden font-sans select-none antialiased">
      {/* 1. LEFT SIDEBAR PANEL - CONVERSATIONS HISTORY */}
      <div className="w-80 border-r border-zinc-900 bg-[#0b0b0d] flex flex-col h-full shrink-0 z-10 shadow-lg">
        {/* Controls header */}
        <div className="p-4 border-b border-zinc-900 flex items-center justify-between gap-3 shrink-0">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleCreateChat}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-zinc-100 hover:text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          >
            <Plus className="h-4 w-4 text-violet-400" />
            <span>New Chat</span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05, rotate: 15 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => showToast('AI Settings dashboard coming soon!', 'info')}
            className="p-2.5 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
            title="Tutor Settings"
          >
            <Settings className="h-4 w-4" />
          </motion.button>
        </div>

        {/* Search Input */}
        <div className="px-4 pt-3 shrink-0">
          <div className="relative flex items-center bg-zinc-950 border border-zinc-900 rounded-xl px-3.5 py-2.5 focus-within:border-zinc-800 transition-all focus-within:ring-2 focus-within:ring-violet-500/10">
            <Search className="h-4 w-4 text-zinc-500 mr-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="bg-transparent text-xs border-none focus:outline-none w-full placeholder-zinc-650 text-zinc-300"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-grow overflow-y-auto p-4 space-y-5 pr-2 scrollbar-thin">
          {loadingConvs ? (
            <div className="space-y-2">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-11 bg-zinc-900/40 border border-zinc-850/50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : Object.keys(grouped).some((k) => grouped[k].length > 0) ? (
            Object.keys(grouped).map((groupName) => {
              if (grouped[groupName].length === 0) return null;
              return (
                <div key={groupName} className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-550 block px-3 mb-2">
                    {groupName}
                  </span>
                  <div className="space-y-0.5">
                    {grouped[groupName].map((c) => {
                      const isSelected = activeConversationId === c.id;
                      const isEditing = editingId === c.id;

                      if (isEditing) {
                        return (
                          <form
                            key={c.id}
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleRenameChat(c.id, editTitleInput);
                            }}
                            className="flex items-center gap-1.5 p-2 rounded-xl bg-zinc-950 border border-zinc-800 focus-within:ring-2 focus-within:ring-violet-500/20"
                          >
                            <input
                              type="text"
                              value={editTitleInput}
                              onChange={(e) => setEditTitleInput(e.target.value)}
                              autoFocus
                              className="bg-transparent border-none text-xs focus:outline-none w-full text-zinc-155 px-1.5 py-0.5"
                            />
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="submit"
                                className="p-1.5 hover:bg-zinc-800 text-emerald-400 rounded-lg cursor-pointer"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="p-1.5 hover:bg-zinc-800 text-zinc-550 rounded-lg cursor-pointer"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </form>
                        );
                      }

                      return (
                        <motion.div
                          key={c.id}
                          layoutId={`chat-${c.id}`}
                          onClick={() => {
                            setActiveConversationId(c.id);
                            setFailedRequestId(null);
                          }}
                          className={`p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between group ${
                            isSelected
                              ? 'bg-zinc-900 border border-zinc-800 text-zinc-100 shadow-sm border-l-2 border-l-violet-500'
                              : 'hover:bg-zinc-950/60 border border-transparent text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <MessageSquare className={`h-4 w-4 shrink-0 ${isSelected ? 'text-violet-400' : 'text-zinc-650'}`} />
                            <span className="text-xs font-medium truncate leading-tight select-none">
                              {c.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition shrink-0 ml-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(c.id);
                                setEditTitleInput(c.title);
                              }}
                              className="p-1.5 hover:bg-zinc-800 text-zinc-555 hover:text-zinc-300 rounded-lg transition cursor-pointer"
                              title="Rename Conversation"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteChat(c.id, e)}
                              className="p-1.5 hover:bg-zinc-800 text-zinc-555 hover:text-red-400 rounded-lg transition cursor-pointer"
                              title="Delete Conversation"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-16 px-4 space-y-2 border border-dashed border-zinc-900 rounded-2xl bg-zinc-950/20">
              <Sparkles className="h-6 w-6 text-zinc-750 mx-auto" />
              <p className="text-[11px] text-zinc-600 font-bold uppercase tracking-wider">No historic chats</p>
              <p className="text-[10px] text-zinc-500 max-w-[180px] mx-auto leading-normal">
                Your study conversations will appear here once saved.
              </p>
            </div>
          )}
        </div>

        {/* Sidebar Compact Dashboard Widget */}
        <div className="p-4 border-t border-zinc-900 bg-zinc-950/30 space-y-3 shrink-0">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500 animate-pulse" />
            <span>Today's Progress</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10.5px]">
            <div className="p-2.5 bg-zinc-900/30 border border-zinc-850/50 rounded-xl">
              <span className="text-zinc-500 block text-[8px] uppercase font-semibold">Streak</span>
              <span className="font-bold text-zinc-200">5 Days 🔥</span>
            </div>
            <div className="p-2.5 bg-zinc-900/30 border border-zinc-850/50 rounded-xl">
              <span className="text-zinc-500 block text-[8px] uppercase font-semibold">Daily Goal</span>
              <span className="font-bold text-zinc-200">80% Done</span>
            </div>
            <div className="p-2.5 bg-zinc-900/30 border border-zinc-850/50 rounded-xl">
              <span className="text-zinc-500 block text-[8px] uppercase font-semibold">Next Exam</span>
              <span className="font-bold text-zinc-200 truncate block">July 25</span>
            </div>
            <div className="p-2.5 bg-zinc-900/30 border border-zinc-850/50 rounded-xl">
              <span className="text-zinc-500 block text-[8px] uppercase font-semibold">Weak Topic</span>
              <span className="font-bold text-violet-400 truncate block">Calculus</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN CONVERSATION AREA */}
      <div className="flex-1 flex flex-col h-full bg-[#070708] relative select-text">
        {/* Background radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-violet-950/5 via-transparent to-transparent pointer-events-none z-0" />

        {/* Header Controls */}
        <div className="h-16 border-b border-zinc-900 px-6 flex items-center justify-between bg-zinc-950/20 backdrop-blur-md shrink-0 z-10 relative">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shadow-sm shrink-0">
              <Brain className="h-5 w-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <h1 className="font-extrabold text-sm text-zinc-100 tracking-tight leading-none truncate">
                {activeConv?.title || 'StudySync AI Tutor'}
              </h1>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[9px] uppercase tracking-widest font-extrabold text-zinc-500">
                  Cognitive Personal Academic Agent
                </span>
                <span className="h-1 w-1 bg-zinc-800 rounded-full" />
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
            <div className="flex items-center gap-2 bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-800/60 hover:border-zinc-750/80 rounded-full px-3.5 py-1.5 transition-all shadow-inner">
              <span className="text-[9.5px] uppercase font-bold text-zinc-500 tracking-wider">Engine</span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-transparent text-[11px] text-zinc-200 border-none focus:outline-none cursor-pointer font-semibold pr-1.5 py-0.5"
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gpt-4o">OpenAI GPT-4o</option>
                <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-800/60 hover:border-zinc-750/80 rounded-full px-3.5 py-1.5 transition-all shadow-inner">
              <span className="text-[9.5px] uppercase font-bold text-zinc-500 tracking-wider">Mode</span>
              <select
                value={tutorMode}
                onChange={(e) => setTutorMode(e.target.value)}
                className="bg-transparent text-[11px] text-zinc-200 border-none focus:outline-none cursor-pointer font-semibold pr-1.5 py-0.5"
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

        {/* Message Flow */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 scrollbar-thin bg-transparent relative z-10">
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
                  {/* Avatar */}
                  <div
                    className={`h-9 w-9 rounded-2xl flex-shrink-0 flex items-center justify-center font-semibold text-xs shadow-sm border ${
                      isUser
                        ? 'bg-zinc-900 border-zinc-800 text-zinc-350'
                        : 'bg-violet-600/10 border-violet-500/20 text-violet-400'
                    }`}
                  >
                    {isUser ? <User className="h-4.5 w-4.5 text-zinc-400" /> : <Sparkles className="h-4.5 w-4.5 text-violet-400" />}
                  </div>

                  {/* Body Content */}
                  <div className="flex flex-col gap-2 min-w-0 max-w-2xl">
                    <motion.div
                      initial={{ y: 8, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.18 }}
                      className={`px-5 py-4 rounded-2xl border text-sm leading-relaxed shadow-sm transition-all ${
                        isUser
                          ? 'bg-zinc-900 border-zinc-800 text-zinc-150 rounded-br-sm selection:bg-violet-900/40'
                          : 'bg-zinc-950/20 border-zinc-900/60 text-zinc-300 rounded-bl-sm selection:bg-violet-900/40'
                      }`}
                    >
                      {isUser ? (
                        <span className="whitespace-pre-wrap select-text">{m.content}</span>
                      ) : (
                        <MathMarkdown content={m.content} />
                      )}
                    </motion.div>

                    {/* Copy and Regenerate Controls for Assistant messages */}
                    {!isUser && (
                      <div className="flex items-center gap-3 px-1 mt-0.5">
                        <button
                          onClick={() => handleCopyText(m.content, m.id)}
                          className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-550 hover:text-zinc-350 transition uppercase cursor-pointer"
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
                            className="flex items-center gap-1.5 text-[10px] font-bold text-violet-450 hover:text-violet-350 transition uppercase cursor-pointer ml-3"
                          >
                            <BookOpen className="h-3 w-3 text-violet-400" />
                            <span>View Sources ({citationsMap[m.id].length})</span>
                          </button>
                        )}

                        {activeConv?.messages && activeConv.messages[activeConv.messages.length - 1]?.id === m.id && !isStreaming && (
                          <button
                            onClick={handleRegenerate}
                            className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-550 hover:text-zinc-350 transition uppercase cursor-pointer ml-3"
                          >
                            <RotateCcw className="h-3 w-3 text-zinc-555" />
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
            /* Onboarding empty state card layout */
            <div className="flex flex-col items-center justify-center h-full text-center py-12 animate-fade-in max-w-xl mx-auto select-none relative">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.18 }}
                className="p-6 bg-gradient-to-tr from-violet-600/10 to-indigo-600/10 border border-violet-500/15 text-violet-400 rounded-[32px] mb-6 shadow-2xl shadow-violet-950/5 relative"
              >
                <div className="absolute inset-0 bg-violet-500/5 rounded-[32px] blur-xl pointer-events-none" />
                <Brain className="h-12 w-12 text-violet-400 relative z-10" />
              </motion.div>
              
              <motion.h2
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.15, delay: 0.05 }}
                className="font-extrabold text-2xl tracking-tight text-zinc-100"
              >
                {greeting} 👋
              </motion.h2>

              <motion.p
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.15, delay: 0.1 }}
                className="text-[12.5px] text-zinc-500 leading-relaxed mt-3 max-w-md font-medium"
              >
                Ready to continue learning? Attach study parameters, notebooks, or files, and prompt me to generate quiz revisions, code summaries, or study frameworks.
              </motion.p>

              {/* Onboarding Quick Action buttons */}
              <motion.div
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.15, delay: 0.15 }}
                className="flex items-center justify-center gap-3 mt-8"
              >
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4.5 py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800/80 hover:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                >
                  <Paperclip className="h-4 w-4 text-violet-400" />
                  <span>Upload Notes</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPromptInput('Help me review my recent notes and construct a comprehensive summary.');
                  }}
                  className="flex items-center gap-2 px-4.5 py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800/80 hover:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                >
                  <Brain className="h-4 w-4 text-indigo-400" />
                  <span>Start Tutoring</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPromptInput('Generate a customized 5-question multiple choice quiz on computer network architectures.');
                  }}
                  className="flex items-center gap-2 px-4.5 py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800/80 hover:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                >
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  <span>Generate Quiz</span>
                </button>
              </motion.div>

              {/* Suggestions grid */}
              <motion.div
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.18, delay: 0.2 }}
                className="grid grid-cols-2 gap-4 w-full mt-10"
              >
                {[
                  {
                    title: 'Explain complex math',
                    prompt: 'Explain the difference between Fourier Transform and Laplace Transform using analogies.',
                    icon: BookOpen,
                  },
                  {
                    title: 'Socratic quiz me',
                    prompt: 'Use the socratic method to quiz me on basic memory registers and processor cache.',
                    icon: HelpCircle,
                  },
                  {
                    title: 'Code review helper',
                    prompt: 'Review this recursive function and identify if there is a stack overflow risk.',
                    icon: FileText,
                  },
                  {
                    title: 'Synthesize study plan',
                    prompt: 'Create a highly testable study guide on microeconomics price elasticities.',
                    icon: Sparkles,
                  },
                ].map((item) => (
                  <motion.button
                    key={item.title}
                    whileHover={{
                      y: -4,
                      scale: 1.01,
                      boxShadow: '0 10px 30px -10px rgba(124, 58, 237, 0.08)',
                      borderColor: 'rgba(124, 58, 237, 0.35)',
                    }}
                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => {
                      setPromptInput(item.prompt);
                      handleSendPrompt(item.prompt);
                    }}
                    className="p-5 bg-[#0d0d11]/45 border border-zinc-900 rounded-[20px] hover:bg-zinc-900/20 text-left transition-all cursor-pointer group relative overflow-hidden"
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <item.icon className="h-4.5 w-4.5 text-violet-400 group-hover:text-violet-300 transition" />
                      <span className="block text-xs font-bold text-zinc-200 group-hover:text-violet-400 transition">
                        {item.title}
                      </span>
                    </div>
                    <span className="block text-[11px] text-zinc-500 line-clamp-2 leading-relaxed font-medium">
                      {item.prompt}
                    </span>
                  </motion.button>
                ))}
              </motion.div>
            </div>
          ) : null}

          {/* Assistant Stream Segment */}
          {isStreaming && streamingText && (
            <div className="flex gap-4.5 max-w-3xl animate-fade-in">
              <div className="h-9 w-9 rounded-2xl flex-shrink-0 flex items-center justify-center border bg-violet-600/10 border-violet-500/20 text-violet-400 shadow-sm animate-pulse">
                <Sparkles className="h-4.5 w-4.5 text-violet-400 animate-spin" />
              </div>
              <div className="px-5 py-4 rounded-2xl border bg-zinc-950/20 border-zinc-900/60 text-zinc-300 max-w-2xl min-w-0">
                <MathMarkdown content={streamingText} />
                <span className="inline-block h-4 w-1.5 bg-violet-400 rounded-sm ml-0.5 animate-pulse" />
              </div>
            </div>
          )}

          {/* Loading initial token */}
          {isStreaming && !streamingText && (
            <div className="flex gap-4.5 max-w-3xl animate-pulse">
              <div className="h-9 w-9 rounded-2xl flex-shrink-0 flex items-center justify-center border bg-violet-600/10 border-violet-500/20 text-violet-400">
                <RefreshCw className="h-4.5 w-4.5 animate-spin text-violet-400" />
              </div>
              <div className="px-5 py-3 rounded-2xl bg-zinc-900/25 border border-zinc-900 text-zinc-500 text-xs italic flex items-center gap-2">
                <span>AI Tutor compiling academic context...</span>
              </div>
            </div>
          )}

          {/* Failed Retry State */}
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
          <div className="max-w-3xl mx-auto">
            {/* Active Attachments Status Ro            {(attachedNoteId || attachedNotebookId || attachedFile || attachedDocIds.length > 0 || isUploading) && (
              <div className="flex flex-wrap gap-2 mb-3">
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
            <div className="relative border border-zinc-800 bg-[#0b0b0d]/90 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.6)] focus-within:border-zinc-700 transition-all focus-within:ring-2 focus-within:ring-violet-500/10 rounded-[22px] p-2.5 flex flex-col gap-1.5">
              <textarea
                ref={textareaRef}
                rows={1}
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about your study materials... (Shift+Enter for newline, Enter to send)"
                className="w-full bg-transparent px-3 py-2 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none resize-none leading-relaxed min-h-[40px]"
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
                            <div className="px-3 py-2 text-xs text-zinc-650 italic">No active notes found</div>
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
                            <div className="px-3 py-2 text-xs text-zinc-655 italic">No active notebooks</div>
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
                          className="absolute bottom-full mb-3 left-0 w-64 bg-zinc-950 border border-zinc-850 rounded-2xl shadow-xl z-30 max-h-56 overflow-y-auto p-1.5 divide-y divide-zinc-900"
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
                                  {isAttached && <Check className="h-3.5 w-3.5 text-violet-450 shrink-0" />}
                                </button>
                              );
                            })
                          ) : (
                            <div className="px-3 py-2 text-xs text-zinc-650 italic">No indexed documents yet</div>
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
                    className="flex items-center justify-center gap-2 px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-650 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-violet-900/20 transition-all disabled:opacity-45 cursor-pointer shrink-0 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
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

      {/* Citations Side Drawer */}
      <AnimatePresence>
        {showCitationsDrawer && selectedCitations && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCitationsDrawer(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs z-40 cursor-pointer"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 right-0 h-full w-96 bg-[#0b0b0d] border-l border-zinc-900 shadow-2xl z-50 flex flex-col p-6 overflow-hidden select-text"
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
          <Brain className="h-16 w-16 text-violet-450 animate-bounce mb-4" />
          <h3 className="text-xl font-bold text-zinc-150">Drop your study files here to index</h3>
          <p className="text-xs text-zinc-550 mt-2">Supports PDF, DOCX, PPTX, TXT, Markdown, and source code</p>
        </div>
      )}
    </div>
  );
}
