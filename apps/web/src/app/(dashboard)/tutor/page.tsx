'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  useTutorConversations, 
  useTutorDetails, 
  useCreateTutorChat, 
  useDeleteTutorChat,
  useRenameTutorChat
} from '@/hooks/useTutor';
import { useNotesList, useNotebooks } from '@/hooks/useNotes';
import { useToast } from '@/components/providers/ToastProvider';
import { 
  Brain, Send, Sparkles, X, Plus, Trash2, Copy, FileText, 
  Download, Printer, Paperclip, Check, ChevronDown, RefreshCw,
  Clock, MessageSquare, Terminal, HelpCircle, Pencil
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

export default function TutorPage() {
  const { showToast } = useToast();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [promptInput, setPromptInput] = useState('');
  const [tutorMode, setTutorMode] = useState<string>('standard');
  
  // Attached contexts
  const [attachedNoteId, setAttachedNoteId] = useState<string | null>(null);
  const [attachedNotebookId, setAttachedNotebookId] = useState<string | null>(null);
  
  // Popover selectors toggle
  const [showNoteSelector, setShowNoteSelector] = useState(false);
  const [showNotebookSelector, setShowNotebookSelector] = useState(false);

  // Streaming response states
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Queries & Mutations
  const { data: conversations, isLoading: loadingConvs, refetch: refetchConvs } = useTutorConversations();
  const { data: activeConv, isLoading: loadingDetails, refetch: refetchDetails } = useTutorDetails(activeConversationId);
  const { data: notesData } = useNotesList({ archived: false, deleted: false });
  const { data: notebooks } = useNotebooks();

  const createChatMutation = useCreateTutorChat();
  const deleteChatMutation = useDeleteTutorChat();
  const renameChatMutation = useRenameTutorChat();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitleInput, setEditTitleInput] = useState('');

  const handleRenameChat = async (id: string, newTitle: string) => {
    if (!newTitle.trim()) {
      showToast('Conversation title cannot be empty', 'error');
      return;
    }
    try {
      await renameChatMutation.mutateAsync({ id, title: newTitle.trim() });
      setEditingId(null);
      showToast('Conversation renamed', 'success');
    } catch (err) {
      showToast('Failed to rename conversation', 'error');
    }
  };

  // Scroll to bottom on updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.messages, streamingText]);

  // Select first conversation if none selected
  useEffect(() => {
    if (conversations && conversations.length > 0 && !activeConversationId) {
      setActiveConversationId(conversations[0].id);
    }
  }, [conversations, activeConversationId]);

  const handleCreateChat = async () => {
    try {
      const chat = await createChatMutation.mutateAsync(undefined);
      setActiveConversationId(chat.id);
      showToast('Created new discussion session', 'success');
    } catch (e) {
      showToast('Failed to create discussion', 'error');
    }
  };

  const handleDeleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteChatMutation.mutateAsync(id);
      showToast('Discussion deleted successfully', 'success');
      if (activeConversationId === id) {
        setActiveConversationId(null);
      }
    } catch (err) {
      showToast('Failed to delete discussion', 'error');
    }
  };

  const handleSendPrompt = async (textToSend: string) => {
    if (!textToSend.trim() || isStreaming) return;
    
    let conversationId = activeConversationId;

    // Auto-create chat if none exists
    if (!conversationId) {
      try {
        const newChat = await createChatMutation.mutateAsync(undefined);
        conversationId = newChat.id;
        setActiveConversationId(newChat.id);
      } catch (err) {
        showToast('Failed to initialize session', 'error');
        return;
      }
    }

    setPromptInput('');
    setStreamingText('');
    setIsStreaming(true);

    try {
      const token = localStorage.getItem('accessToken');
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1';
      
      const queryParams = new URLSearchParams({
        prompt: textToSend,
        noteId: attachedNoteId || '',
        notebookId: attachedNotebookId || '',
        mode: tutorMode,
      });

      // Optimistically trigger details update for user prompt showing up
      setTimeout(() => {
        refetchDetails();
      }, 300);

      const res = await fetch(`${apiBase}/tutor/conversations/${conversationId}/stream?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'AI streaming failed to establish connection');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        
        // Parse SSE chunk format: data: chunk_content\n\n
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const text = line.substring(6);
              setStreamingText((prev) => prev + text);
            } catch (e) {
              // ignore malformed chunks
            }
          }
        }
      }

      // Refresh final database messages
      await refetchDetails();
      await refetchConvs();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to stream AI response', 'error');
    } finally {
      setIsStreaming(false);
      setStreamingText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendPrompt(promptInput);
    }
  };

  // Follow-up chip handlers
  const handleFollowUpClick = (actionText: string) => {
    handleSendPrompt(actionText);
  };

  // Actions
  const handleClearChat = async () => {
    if (!activeConversationId) return;
    try {
      await deleteChatMutation.mutateAsync(activeConversationId);
      const chat = await createChatMutation.mutateAsync(undefined);
      setActiveConversationId(chat.id);
      showToast('Cleared conversation history', 'success');
    } catch (err) {
      showToast('Failed to clear discussion', 'error');
    }
  };

  const handleCopyConversation = () => {
    if (!activeConv?.messages) return;
    const text = activeConv.messages
      .map((m) => `${m.role === 'USER' ? 'Student' : 'AI Tutor'}: ${m.content}`)
      .join('\n\n');
    navigator.clipboard.writeText(text);
    showToast('Copied full conversation to clipboard!', 'success');
  };

  const handleExportMarkdown = () => {
    if (!activeConv || !activeConv.messages) return;
    const mdContent = activeConv.messages
      .map((msg) => `### ${msg.role === 'USER' ? 'Student' : 'AI Tutor'}\n\n${msg.content}\n\n---`)
      .join('\n\n');
    const blob = new Blob([mdContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeConv.title.toLowerCase().replace(/\s+/g, '_')}_history.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Conversation exported as Markdown!', 'success');
  };

  const handleExportPDF = () => {
    if (!activeConv || !activeConv.messages) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Popup blocked! Please allow popups to export PDF.', 'error');
      return;
    }
    const htmlContent = `
      <html>
        <head>
          <title>${activeConv.title}</title>
          <style>
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1f2937; line-height: 1.6; background: #fff; }
            h1 { font-size: 24px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 20px; }
            .message { margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px solid #f3f4f6; }
            .role { font-weight: bold; font-size: 13px; text-transform: uppercase; margin-bottom: 5px; letter-spacing: 0.05em; }
            .user { color: #4f46e5; }
            .assistant { color: #10b981; }
            .content { font-size: 15px; white-space: pre-wrap; font-family: inherit; }
          </style>
        </head>
        <body>
          <h1>StudySync AI Tutor - ${activeConv.title}</h1>
          ${activeConv.messages
            .map(
              (msg) => `
            <div class="message">
              <div class="role ${msg.role.toLowerCase() === 'user' ? 'user' : 'assistant'}">
                ${msg.role === 'USER' ? 'Student' : 'AI Tutor'}
              </div>
              <div class="content">${msg.content}</div>
            </div>
          `,
            )
            .join('')}
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    showToast('Conversation export print dialog opened!', 'success');
  };

  const getEstTokens = () => {
    if (!activeConv?.messages) return 0;
    const totalChars = activeConv.messages.reduce((acc, m) => acc + m.content.length, 0);
    return Math.ceil(totalChars / 4);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-zinc-950 font-sans text-zinc-100 overflow-hidden">
      {/* Sidebar - Discussions List */}
      <div className="w-72 border-r border-zinc-800 bg-zinc-900/20 flex flex-col h-full">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="font-bold text-sm tracking-tight text-zinc-200 uppercase">Discussions</h3>
          <button
            onClick={handleCreateChat}
            className="p-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer"
            title="New Conversation"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {loadingConvs ? (
            <div className="space-y-2">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-12 bg-zinc-900/60 rounded-xl border border-zinc-850 animate-pulse" />
              ))}
            </div>
          ) : conversations && conversations.length > 0 ? (
            conversations.map((c) => {
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
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 p-2 rounded-xl bg-zinc-900 border border-violet-500/30 w-full"
                  >
                    <input
                      type="text"
                      value={editTitleInput}
                      onChange={(e) => setEditTitleInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setEditingId(null);
                        }
                      }}
                      autoFocus
                      className="bg-transparent border-none text-xs font-semibold focus:outline-none w-full text-zinc-200"
                    />
                    <div className="flex items-center gap-1">
                      <button
                        type="submit"
                        className="p-1 hover:bg-zinc-800 text-emerald-400 hover:text-emerald-300 rounded cursor-pointer"
                        title="Save title"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(null);
                        }}
                        className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 rounded cursor-pointer"
                        title="Cancel"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </form>
                );
              }

              return (
                <div
                  key={c.id}
                  onClick={() => setActiveConversationId(c.id)}
                  className={`p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between group ${
                    isSelected 
                      ? 'bg-violet-500/10 border border-violet-500/20 text-violet-400' 
                      : 'hover:bg-zinc-900 border border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <MessageSquare className="h-4 w-4 flex-shrink-0" />
                    <span className="text-xs font-semibold truncate leading-tight">{c.title}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(c.id);
                        setEditTitleInput(c.title);
                      }}
                      className="p-1 text-zinc-500 hover:text-zinc-300 rounded hover:bg-zinc-800 transition cursor-pointer"
                      title="Rename discussion"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteChat(c.id, e)}
                      className="p-1 text-zinc-500 hover:text-red-450 rounded hover:bg-zinc-800 transition cursor-pointer"
                      title="Delete discussion"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-xs text-zinc-600">No active discussions</div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-zinc-950/40 relative">
        {/* Header */}
        <div className="h-16 border-b border-zinc-800/80 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-600/10 border border-violet-500/20 text-violet-400 rounded-xl">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-zinc-200">AI Tutor</h1>
              <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mt-0.5">Ask anything about your study material</p>
            </div>
          </div>

          {/* Mode Selector */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Mode:</label>
            <select
              value={tutorMode}
              onChange={(e) => setTutorMode(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-violet-500 cursor-pointer font-semibold"
            >
              <option value="standard">Standard Tutor</option>
              <option value="eli5">ELI5 (Explain Simple)</option>
              <option value="socratic">Socratic Method</option>
              <option value="professor">Professor Mode</option>
              <option value="exam">Exam Revision</option>
              <option value="debug">Debug Code</option>
            </select>
          </div>
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {activeConv?.messages && activeConv.messages.length > 0 ? (
            activeConv.messages.map((m) => (
              <div 
                key={m.id} 
                className={`flex gap-4 max-w-3xl ${m.role === 'USER' ? 'ml-auto flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center border font-bold text-xs ${
                  m.role === 'USER' 
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-300' 
                    : 'bg-violet-600/15 border-violet-500/30 text-violet-400'
                }`}>
                  {m.role === 'USER' ? 'S' : <Sparkles className="h-4 w-4" />}
                </div>

                {/* Bubble */}
                <div className="flex flex-col gap-1">
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed max-w-2xl border ${
                    m.role === 'USER'
                      ? 'bg-zinc-900/60 border-zinc-800 text-zinc-200'
                      : 'bg-zinc-900/20 border-zinc-900 text-zinc-300'
                  }`}>
                    {m.role === 'USER' ? (
                      <span className="whitespace-pre-wrap">{m.content}</span>
                    ) : (
                      <div className="prose prose-invert prose-xs max-w-none">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                  
                  {/* Render Follow-up prompts only under the LAST assistant message */}
                  {m.role === 'ASSISTANT' && activeConv?.messages && activeConv.messages[activeConv.messages.length - 1].id === m.id && !isStreaming && (
                    <div className="flex flex-wrap gap-1.5 mt-2 max-w-2xl">
                      {[
                        'Explain more',
                        'Give example',
                        'Visualize',
                        'Quiz me',
                        'Create flashcards',
                        'Simpler version'
                      ].map((item) => (
                        <button
                          key={item}
                          onClick={() => handleFollowUpClick(item)}
                          className="px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase text-zinc-400 bg-zinc-900/50 border border-zinc-850 hover:border-violet-500/40 hover:text-violet-400 rounded-full transition-all cursor-pointer"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : !isStreaming ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <div className="p-4 bg-violet-600/15 border border-violet-500/20 text-violet-400 rounded-2xl mb-4 animate-bounce">
                <Brain className="h-8 w-8" />
              </div>
              <h2 className="font-bold text-sm tracking-tight text-zinc-300">Welcome to AI Tutor</h2>
              <p className="text-xs text-zinc-600 max-w-xs mt-1">Select a notebook or note, and ask the tutor to explain, quiz you, or guide your learning.</p>
            </div>
          ) : null}

          {/* Streaming Assistant Response */}
          {isStreaming && streamingText && (
            <div className="flex gap-4 max-w-3xl">
              <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center border bg-violet-600/15 border-violet-500/30 text-violet-400">
                <Sparkles className="h-4 w-4 animate-spin" />
              </div>
              <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed max-w-2xl border bg-zinc-900/20 border-zinc-900 text-zinc-300">
                <div className="prose prose-invert prose-xs max-w-none">
                  <ReactMarkdown>{streamingText}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {isStreaming && !streamingText && (
            <div className="flex gap-4 max-w-3xl">
              <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center border bg-violet-600/15 border-violet-500/30 text-violet-400">
                <RefreshCw className="h-4 w-4 animate-spin" />
              </div>
              <div className="px-4 py-3 rounded-2xl bg-zinc-900/20 border border-zinc-900 text-zinc-500 text-xs italic animate-pulse">
                Tutor is typing...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Panel */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/10">
          
          {/* Active Attachments Status Row */}
          {(attachedNoteId || attachedNotebookId) && (
            <div className="flex flex-wrap gap-2 mb-3">
              {attachedNotebookId && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-lg">
                  <span>Notebook Context: {notebooks?.find((nb: any) => nb.id === attachedNotebookId)?.title || 'Selected Notebook'}</span>
                  <button onClick={() => setAttachedNotebookId(null)} className="hover:text-zinc-200 transition cursor-pointer">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              {attachedNoteId && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                  <span>Note Context: {notesData?.notes?.find((n: any) => n.id === attachedNoteId)?.title || 'Selected Note'}</span>
                  <button onClick={() => setAttachedNoteId(null)} className="hover:text-zinc-200 transition cursor-pointer">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Form */}
          <div className="relative border border-zinc-800 bg-zinc-950/60 rounded-2xl p-2 focus-within:border-violet-500 transition-all flex flex-col gap-2">
            <textarea
              ref={textareaRef}
              rows={2}
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your study materials... (Ctrl+Enter or Enter to send)"
              className="w-full bg-transparent px-3 py-2 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none resize-none leading-relaxed"
            />

            {/* Bottom Controls Bar */}
            <div className="flex items-center justify-between border-t border-zinc-900/60 pt-2 px-1">
              
              {/* Attach Popover Buttons */}
              <div className="flex items-center gap-2 relative">
                
                {/* Note Trigger */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => { setShowNoteSelector(!showNoteSelector); setShowNotebookSelector(false); }}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[10px] font-bold tracking-wider uppercase transition cursor-pointer ${
                      attachedNoteId 
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' 
                        : 'border-zinc-800 hover:border-zinc-750 text-zinc-500 hover:text-zinc-350'
                    }`}
                  >
                    <Paperclip className="h-3 w-3" />
                    Attach Note
                  </button>
                  <AnimatePresence>
                    {showNoteSelector && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-full mb-2 left-0 w-64 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-30 max-h-48 overflow-y-auto p-1"
                      >
                        <div className="px-2.5 py-1.5 text-[9px] font-bold text-zinc-500 uppercase border-b border-zinc-800">Attach Note Context</div>
                        {notesData?.notes && notesData.notes.length > 0 ? (
                          notesData.notes.map((n: any) => (
                            <button
                              key={n.id}
                              type="button"
                              onClick={() => { setAttachedNoteId(n.id); setShowNoteSelector(false); }}
                              className="w-full text-left px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-800 rounded-lg hover:text-zinc-200 truncate transition cursor-pointer"
                            >
                              {n.title}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-xs text-zinc-600">No notes found</div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Notebook Trigger */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => { setShowNotebookSelector(!showNotebookSelector); setShowNoteSelector(false); }}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[10px] font-bold tracking-wider uppercase transition cursor-pointer ${
                      attachedNotebookId 
                        ? 'border-violet-500 bg-violet-500/10 text-violet-400' 
                        : 'border-zinc-800 hover:border-zinc-750 text-zinc-500 hover:text-zinc-350'
                    }`}
                  >
                    <Paperclip className="h-3 w-3" />
                    Attach Notebook
                  </button>
                  <AnimatePresence>
                    {showNotebookSelector && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-full mb-2 left-0 w-64 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-30 max-h-48 overflow-y-auto p-1"
                      >
                        <div className="px-2.5 py-1.5 text-[9px] font-bold text-zinc-500 uppercase border-b border-zinc-800">Attach Notebook Context</div>
                        {notebooks && notebooks.length > 0 ? (
                          notebooks.map((nb: any) => (
                            <button
                              key={nb.id}
                              type="button"
                              onClick={() => { setAttachedNotebookId(nb.id); setShowNotebookSelector(false); }}
                              className="w-full text-left px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-800 rounded-lg hover:text-zinc-200 truncate transition cursor-pointer"
                            >
                              {nb.title}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-xs text-zinc-600">No notebooks found</div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>

              {/* Submit Trigger */}
              <button
                onClick={() => handleSendPrompt(promptInput)}
                disabled={isStreaming || !promptInput.trim()}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                <span>Send</span>
                <Send className="h-3.5 w-3.5" />
              </button>

            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Conversation statistics */}
      <div className="w-80 border-l border-zinc-800 bg-zinc-900/20 flex flex-col h-full font-sans text-sm select-none">
        <div className="p-4 border-b border-zinc-800">
          <h3 className="font-bold text-sm tracking-tight text-zinc-250 uppercase">Session Info</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Active Context Card */}
          <div className="bg-zinc-900/40 border border-zinc-850 p-4 rounded-xl space-y-3">
            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Active Context</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500">Notebook:</span>
                <span className="font-semibold text-zinc-300">
                  {attachedNotebookId 
                    ? notebooks?.find((n: any) => n.id === attachedNotebookId)?.title 
                    : 'None Attached'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500">Note:</span>
                <span className="font-semibold text-zinc-300">
                  {attachedNoteId 
                    ? notesData?.notes?.find((n: any) => n.id === attachedNoteId)?.title 
                    : 'None Attached'}
                </span>
              </div>
            </div>
          </div>

          {/* Chat statistics */}
          <div className="bg-zinc-900/40 border border-zinc-850 p-4 rounded-xl space-y-3">
            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Discussion Stats</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500 flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Total Messages:</span>
                <span className="font-semibold text-zinc-300">{activeConv?.messages?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Estimated Tokens:</span>
                <span className="font-semibold text-zinc-300">{getEstTokens()}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2 pt-2">
            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-1">Quick Actions</h4>
            
            <button
              onClick={handleCopyConversation}
              disabled={!activeConv?.messages || activeConv.messages.length === 0}
              className="w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl border border-zinc-850 bg-zinc-900/20 hover:bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            >
              <Copy className="h-4 w-4" />
              Copy Conversation
            </button>

            <button
              onClick={handleExportMarkdown}
              disabled={!activeConv?.messages || activeConv.messages.length === 0}
              className="w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl border border-zinc-850 bg-zinc-900/20 hover:bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Export Markdown (.md)
            </button>

            <button
              onClick={handleExportPDF}
              disabled={!activeConv?.messages || activeConv.messages.length === 0}
              className="w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl border border-zinc-850 bg-zinc-900/20 hover:bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              Export PDF / Print
            </button>

            <button
              onClick={handleClearChat}
              disabled={!activeConversationId}
              className="w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl border border-red-500/10 bg-red-500/5 hover:bg-red-500/10 text-red-400 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Clear Conversation
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
