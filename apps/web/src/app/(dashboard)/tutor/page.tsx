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
    <div className="space-y-1 select-text">
      {segments.map((seg, idx) => {
        if (seg.type === 'block-math') {
          return (
            <div
              key={idx}
              className="my-3.5 p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl text-center font-mono text-[11px] text-violet-300 overflow-x-auto shadow-inner select-all"
            >
              {seg.content}
            </div>
          );
        } else if (seg.type === 'inline-math') {
          return (
            <span
              key={idx}
              className="font-mono px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded-lg text-violet-400 text-[10.5px] mx-0.5 select-all"
            >
              {seg.content}
            </span>
          );
        } else {
          return (
            <ReactMarkdown
              key={idx}
              className="prose prose-invert prose-xs max-w-none prose-p:leading-relaxed prose-headings:font-bold prose-headings:text-zinc-200 prose-table:border-zinc-800 prose-th:bg-zinc-900/50 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2"
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

  // Context attachments
  const [attachedNoteId, setAttachedNoteId] = useState<string | null>(null);
  const [attachedNotebookId, setAttachedNotebookId] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

  // Popover selectors
  const [showNoteSelector, setShowNoteSelector] = useState(false);
  const [showNotebookSelector, setShowNotebookSelector] = useState(false);

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
    showToast('Discussion refreshed. Compose your message to begin.', 'info');
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
      };

      // Optimistic user bubble insertion
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
              // Title auto-generated
              refetchConvs();
            } else {
              setStreamingText((prev) => prev + line.substring(6));
            }
          }
        }
      }

      // Finish streaming, sync state
      await refetchDetails();
      await refetchConvs();
      setAttachedFile(null);
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
    <div className="flex h-[calc(100vh-4rem)] bg-[#09090b] text-zinc-150 overflow-hidden font-sans select-none">
      {/* 1. LEFT SIDEBAR PANEL - CONVERSATIONS HISTORY */}
      <div className="w-72 border-r border-zinc-800 bg-[#0c0c0e] flex flex-col h-full shrink-0">
        {/* Controls header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={handleCreateChat}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 hover:text-white rounded-xl text-[10px] tracking-wider uppercase font-bold transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="px-3.5 pt-3 shrink-0">
          <div className="relative flex items-center bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 focus-within:border-zinc-700 transition">
            <Search className="h-3.5 w-3.5 text-zinc-500 mr-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chat history..."
              className="bg-transparent text-xs border-none focus:outline-none w-full placeholder-zinc-700 text-zinc-300"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-grow overflow-y-auto p-3 space-y-4 pr-1 scrollbar-thin">
          {loadingConvs ? (
            <div className="space-y-2">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-10 bg-zinc-900/40 border border-zinc-850 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : Object.keys(grouped).some((k) => grouped[k].length > 0) ? (
            Object.keys(grouped).map((groupName) => {
              if (grouped[groupName].length === 0) return null;
              return (
                <div key={groupName} className="space-y-1">
                  <span className="text-[8.5px] font-extrabold uppercase tracking-widest text-zinc-550 block px-2.5 mb-1.5">
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
                            className="flex items-center gap-1.5 p-1.5 rounded-xl bg-zinc-950 border border-zinc-800"
                          >
                            <input
                              type="text"
                              value={editTitleInput}
                              onChange={(e) => setEditTitleInput(e.target.value)}
                              autoFocus
                              className="bg-transparent border-none text-[10.5px] focus:outline-none w-full text-zinc-200 px-1 py-0.5"
                            />
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                type="submit"
                                className="p-1 hover:bg-zinc-800 text-emerald-400 rounded cursor-pointer"
                              >
                                <Check className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="p-1 hover:bg-zinc-800 text-zinc-500 rounded cursor-pointer"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          </form>
                        );
                      }

                      return (
                        <div
                          key={c.id}
                          onClick={() => {
                            setActiveConversationId(c.id);
                            setFailedRequestId(null);
                          }}
                          className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between group ${
                            isSelected
                              ? 'bg-zinc-900 border border-zinc-800 text-zinc-100 shadow-sm'
                              : 'hover:bg-zinc-950 border border-transparent text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <MessageSquare className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                            <span className="text-xs font-medium truncate leading-tight select-none">
                              {c.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0 ml-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(c.id);
                                setEditTitleInput(c.title);
                              }}
                              className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 rounded transition cursor-pointer"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteChat(c.id, e)}
                              className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-red-400 rounded transition cursor-pointer"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-[10.5px] text-zinc-600 font-semibold uppercase tracking-wider">
              No chat logs found
            </div>
          )}
        </div>
      </div>

      {/* 2. MAIN CONVERSATION AREA */}
      <div className="flex-1 flex flex-col h-full bg-[#0a0a0c]/60 relative select-text">
        {/* Header Controls */}
        <div className="h-16 border-b border-zinc-800/80 px-6 flex items-center justify-between bg-zinc-950/20 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shadow-sm shrink-0">
              <Brain className="h-4.5 w-4.5" />
            </div>
            <div className="flex flex-col min-w-0">
              <h1 className="font-extrabold text-sm text-white tracking-tight leading-none truncate">
                {activeConv?.title || 'StudySync AI Tutor'}
              </h1>
              <span className="text-[9px] uppercase tracking-widest font-extrabold text-zinc-500 mt-1">
                Cognitive Personal Academic Agent
              </span>
            </div>
          </div>

          {/* Model & Mode Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1">
              <span className="text-[8.5px] uppercase font-extrabold text-zinc-550">Engine:</span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-transparent text-xs text-zinc-200 border-none focus:outline-none cursor-pointer font-bold pr-1"
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gpt-4o">OpenAI GPT-4o</option>
                <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1">
              <span className="text-[8.5px] uppercase font-extrabold text-zinc-550">Mode:</span>
              <select
                value={tutorMode}
                onChange={(e) => setTutorMode(e.target.value)}
                className="bg-transparent text-xs text-zinc-200 border-none focus:outline-none cursor-pointer font-bold pr-1"
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
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 scrollbar-thin">
          {activeConv?.messages && activeConv.messages.length > 0 ? (
            activeConv.messages.map((m) => {
              const isUser = m.role === 'user';
              if (m.content === 'Initialize conversation') return null;

              return (
                <div
                  key={m.id}
                  className={`flex gap-4 max-w-3xl animate-fade-in ${
                    isUser ? 'ml-auto flex-row-reverse' : ''
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`h-8.5 w-8.5 rounded-2xl flex-shrink-0 flex items-center justify-center font-bold text-xs shadow-sm border ${
                      isUser
                        ? 'bg-zinc-800 border-zinc-700 text-zinc-300'
                        : 'bg-violet-600/10 border-violet-500/20 text-violet-400'
                    }`}
                  >
                    {isUser ? 'S' : <Sparkles className="h-4 w-4" />}
                  </div>

                  {/* Body Content */}
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <div
                      className={`px-4 py-3.5 rounded-2xl border text-sm leading-relaxed max-w-2xl shadow-sm ${
                        isUser
                          ? 'bg-zinc-900 border-zinc-800 text-zinc-250'
                          : 'bg-zinc-950/20 border-zinc-900 text-zinc-300'
                      }`}
                    >
                      {isUser ? (
                        <span className="whitespace-pre-wrap select-text">{m.content}</span>
                      ) : (
                        <MathMarkdown content={m.content} />
                      )}
                    </div>

                    {/* Copy and Regenerate Controls for Assistant messages */}
                    {!isUser && (
                      <div className="flex items-center gap-2 mt-1 px-1">
                        <button
                          onClick={() => handleCopyText(m.content, m.id)}
                          className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 hover:text-zinc-300 transition uppercase cursor-pointer"
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

                        {/* If it is the last message in conversation, show regenerate */}
                        {activeConv?.messages && activeConv.messages[activeConv.messages.length - 1]?.id === m.id && !isStreaming && (
                          <button
                            onClick={handleRegenerate}
                            className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 hover:text-zinc-300 transition uppercase cursor-pointer ml-3"
                          >
                            <RotateCcw className="h-3 w-3" />
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
            /* Recommendations/Empty State */
            <div className="flex flex-col items-center justify-center h-full text-center py-20 animate-fade-in max-w-xl mx-auto select-none">
              <div className="p-4 bg-violet-600/10 border border-violet-500/20 text-violet-400 rounded-3xl mb-5 shadow shadow-violet-500/5 animate-pulse">
                <Brain className="h-9 w-9" />
              </div>
              <h2 className="font-extrabold text-base tracking-tight text-white">
                Interactive Cognitive Study Tutor
              </h2>
              <p className="text-xs text-zinc-500 leading-relaxed max-w-md mt-1.5">
                Attach note parameters or full notebooks. Ask this agent to summarize key takeaways,
                design exam revisions, formulate socratic quizzes, or debug software.
              </p>

              {/* Suggestions grid */}
              <div className="grid grid-cols-2 gap-3.5 w-full mt-8">
                {[
                  {
                    title: 'Explain complex math',
                    prompt: 'Explain the difference between Fourier Transform and Laplace Transform using analogies.',
                  },
                  {
                    title: 'Socratic quiz me',
                    prompt: 'Use the socratic method to quiz me on basic memory registers and processor cache.',
                  },
                  {
                    title: 'Code review helper',
                    prompt: 'Review this recursive function and identify if there is a stack overflow risk.',
                  },
                  {
                    title: 'Synthesize study plan',
                    prompt: 'Create a highly testable study guide on microeconomics price elasticities.',
                  },
                ].map((item) => (
                  <button
                    key={item.title}
                    onClick={() => {
                      setPromptInput(item.prompt);
                      handleSendPrompt(item.prompt);
                    }}
                    className="p-3.5 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl hover:border-violet-500/30 text-left hover:bg-zinc-900/80 transition cursor-pointer shadow-sm group"
                  >
                    <span className="block text-[10.5px] font-bold text-zinc-200 group-hover:text-violet-400 transition">
                      {item.title}
                    </span>
                    <span className="block text-[9.5px] text-zinc-550 line-clamp-2 mt-1 leading-normal">
                      {item.prompt}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Assistant Stream Segment */}
          {isStreaming && streamingText && (
            <div className="flex gap-4 max-w-3xl animate-fade-in">
              <div className="h-8.5 w-8.5 rounded-2xl flex-shrink-0 flex items-center justify-center border bg-violet-600/10 border-violet-500/20 text-violet-400 shadow-sm animate-pulse">
                <Sparkles className="h-4 w-4 animate-spin" />
              </div>
              <div className="px-4 py-3.5 rounded-2xl border bg-zinc-950/20 border-zinc-900 text-zinc-300 max-w-2xl min-w-0">
                <MathMarkdown content={streamingText} />
                <span className="inline-block h-3.5 w-1.5 bg-violet-400 rounded-sm ml-0.5 animate-pulse" />
              </div>
            </div>
          )}

          {/* Loading initial token */}
          {isStreaming && !streamingText && (
            <div className="flex gap-4 max-w-3xl animate-pulse">
              <div className="h-8.5 w-8.5 rounded-2xl flex-shrink-0 flex items-center justify-center border bg-violet-600/10 border-violet-500/20 text-violet-400">
                <RefreshCw className="h-4 w-4 animate-spin" />
              </div>
              <div className="px-4 py-3 rounded-2xl bg-zinc-900/20 border border-zinc-900 text-zinc-500 text-xs italic">
                AI Agent compiling context...
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
                className="px-3 py-1.5 bg-red-900 hover:bg-red-800 text-white font-extrabold text-[10px] tracking-wide uppercase rounded-xl transition cursor-pointer shrink-0"
              >
                Retry Sending
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 3. BOTTOM COMPOSER AND CONTEXT ROWS */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/40 backdrop-blur-md shrink-0">
          {/* Active Attachments Status Row */}
          {(attachedNoteId || attachedNotebookId || attachedFile) && (
            <div className="flex flex-wrap gap-2 mb-3">
              {attachedNotebookId && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-lg">
                  <span>Notebook: {notebooks?.find((nb: any) => nb.id === attachedNotebookId)?.title || 'Attached'}</span>
                  <button onClick={() => setAttachedNotebookId(null)} className="hover:text-zinc-200 transition cursor-pointer">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              {attachedNoteId && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                  <span>Note: {notesData?.notes?.find((n: any) => n.id === attachedNoteId)?.title || 'Attached'}</span>
                  <button onClick={() => setAttachedNoteId(null)} className="hover:text-zinc-200 transition cursor-pointer">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              {attachedFile && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <span>File: {attachedFile.name}</span>
                  <button onClick={() => setAttachedFile(null)} className="hover:text-zinc-200 transition cursor-pointer">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Form Composer Container */}
          <div className="relative border border-zinc-800 bg-[#0c0c0e] focus-within:border-zinc-700 transition rounded-2xl p-2.5 flex flex-col gap-2">
            <textarea
              ref={textareaRef}
              rows={2}
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your study materials... (Shift+Enter for newline, Enter to send)"
              className="w-full bg-transparent px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none resize-none leading-relaxed"
            />

            {/* Bottom Controls Bar */}
            <div className="flex items-center justify-between border-t border-zinc-900/60 pt-2 px-1 shrink-0">
              {/* Attach Context Buttons */}
              <div className="flex items-center gap-2 relative">
                {/* Note Trigger */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNoteSelector(!showNoteSelector);
                      setShowNotebookSelector(false);
                    }}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border text-[9px] font-bold tracking-wider uppercase transition cursor-pointer ${
                      attachedNoteId
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                        : 'border-zinc-800 hover:border-zinc-700 text-zinc-550 hover:text-zinc-400'
                    }`}
                  >
                    <Paperclip className="h-3 w-3" />
                    <span>Attach Note</span>
                  </button>
                  <AnimatePresence>
                    {showNoteSelector && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-full mb-2 left-0 w-64 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-xl z-30 max-h-48 overflow-y-auto p-1 divide-y divide-zinc-900"
                      >
                        <div className="px-2.5 py-1.5 text-[8.5px] font-extrabold text-zinc-550 uppercase tracking-wider">
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
                              className="w-full text-left px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-900 rounded-xl hover:text-zinc-200 truncate transition cursor-pointer"
                            >
                              {n.title}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-xs text-zinc-700">No active notes found</div>
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
                    }}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border text-[9px] font-bold tracking-wider uppercase transition cursor-pointer ${
                      attachedNotebookId
                        ? 'border-violet-500 bg-violet-500/10 text-violet-400'
                        : 'border-zinc-800 hover:border-zinc-700 text-zinc-550 hover:text-zinc-400'
                    }`}
                  >
                    <Paperclip className="h-3 w-3" />
                    <span>Notebook</span>
                  </button>
                  <AnimatePresence>
                    {showNotebookSelector && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-full mb-2 left-0 w-64 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-xl z-30 max-h-48 overflow-y-auto p-1 divide-y divide-zinc-900"
                      >
                        <div className="px-2.5 py-1.5 text-[8.5px] font-extrabold text-zinc-550 uppercase tracking-wider">
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
                              className="w-full text-left px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-900 rounded-xl hover:text-zinc-200 truncate transition cursor-pointer"
                            >
                              {nb.title}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-xs text-zinc-700">No active notebooks</div>
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
                        setAttachedFile(e.target.files[0]);
                        showToast('Document context attached', 'success');
                      }
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center p-1.5 rounded-xl border border-zinc-800 hover:border-zinc-700 hover:text-zinc-300 transition text-zinc-550 cursor-pointer"
                    title="Upload File Context"
                  >
                    <FileText className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Voice Input Trigger */}
                <button
                  type="button"
                  onClick={() =>
                    showToast('Voice mode coming soon! We are building high-fidelity speech-to-text integration.', 'info')
                  }
                  className="flex items-center justify-center p-1.5 rounded-xl border border-zinc-800 hover:border-zinc-700 hover:text-zinc-300 transition text-zinc-550 cursor-pointer"
                  title="Voice Input"
                >
                  <Mic className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Action Trigger */}
              <div className="flex gap-2">
                {isStreaming && (
                  <button
                    type="button"
                    onClick={handleStopStream}
                    className="flex items-center justify-center gap-1 px-3 py-1.5 bg-red-900 hover:bg-red-800 text-white rounded-xl text-xs font-bold transition shadow cursor-pointer shrink-0"
                  >
                    <StopCircle className="h-4 w-4" />
                    <span>Stop</span>
                  </button>
                )}

                <button
                  onClick={() => handleSendPrompt(promptInput)}
                  disabled={isStreaming || !promptInput.trim()}
                  className="flex items-center justify-center gap-1.5 px-4.5 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50 cursor-pointer shrink-0"
                >
                  <span>Send</span>
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
