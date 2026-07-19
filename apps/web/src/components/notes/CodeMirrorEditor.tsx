'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown as mdLang } from '@codemirror/lang-markdown';
import { oneDark } from '@uiw/react-codemirror';
import ReactMarkdown from 'react-markdown';
import { useTheme } from '../providers/ThemeProvider';
import { 
  Eye, Edit3, Columns, Check, AlertCircle, RefreshCw,
  Bold, Italic, Code, List, Link, Table, Sparkles, ChevronDown,
  Users, MessageSquarePlus, Wifi, WifiOff
} from 'lucide-react';
import notesService from '@/services/notes';
import { useToast } from '../providers/ToastProvider';
import GenerateFlashcardsModal from '../flashcards/GenerateFlashcardsModal';
import { useNoteSocket } from '@/hooks/useNoteSocket';

import { StateField, StateEffect, RangeSetBuilder } from '@codemirror/state';
import { Decoration, EditorView, WidgetType } from '@codemirror/view';

// ==========================================
// CODEMIRROR DECORATION EXTENSIONS
// ==========================================

const addCursorEffect = StateEffect.define<{ userId: string; name: string; color: string; from: number; to: number }>();
const removeCursorEffect = StateEffect.define<string>();

class CursorWidget extends WidgetType {
  constructor(private name: string, private color: string) {
    super();
  }

  toDOM() {
    const cursorEl = document.createElement('span');
    cursorEl.style.borderLeft = `2px solid ${this.color}`;
    cursorEl.style.position = 'relative';
    cursorEl.style.marginLeft = '-1px';
    cursorEl.style.marginRight = '-1px';
    cursorEl.style.height = '1.2em';
    cursorEl.style.display = 'inline-block';
    cursorEl.style.verticalAlign = 'middle';

    const labelEl = document.createElement('span');
    labelEl.textContent = this.name;
    labelEl.style.background = this.color;
    labelEl.style.color = '#fff';
    labelEl.style.fontSize = '9px';
    labelEl.style.fontWeight = '700';
    labelEl.style.padding = '2px 4px';
    labelEl.style.borderRadius = '3px';
    labelEl.style.position = 'absolute';
    labelEl.style.bottom = '100%';
    labelEl.style.left = '0';
    labelEl.style.whiteSpace = 'nowrap';
    labelEl.style.pointerEvents = 'none';
    labelEl.style.zIndex = '50';
    labelEl.style.opacity = '1';
    
    // Auto-fade label after 2 seconds
    setTimeout(() => {
      labelEl.style.opacity = '0';
      labelEl.style.transition = 'opacity 0.5s';
    }, 2000);

    cursorEl.appendChild(labelEl);
    return cursorEl;
  }
}

const cursorStateField = StateField.define<Map<string, { name: string; color: string; from: number; to: number }>>({
  create() {
    return new Map();
  },
  update(value, tr) {
    const newValue = new Map<string, { name: string; color: string; from: number; to: number }>();
    for (const [userId, val] of value.entries()) {
      try {
        const newFrom = tr.changes.mapPos(val.from);
        const newTo = tr.changes.mapPos(val.to);
        newValue.set(userId, { ...val, from: newFrom, to: newTo });
      } catch (e) {
        newValue.set(userId, val);
      }
    }

    for (const effect of tr.effects) {
      if (effect.is(addCursorEffect)) {
        newValue.set(effect.value.userId, effect.value);
      } else if (effect.is(removeCursorEffect)) {
        newValue.delete(effect.value);
      }
    }
    return newValue;
  },
  provide(field) {
    return EditorView.decorations.from(field, (value) => {
      const builder = new RangeSetBuilder<Decoration>();
      const sorted = Array.from(value.values()).sort((a, b) => a.from - b.from);
      
      for (const cur of sorted) {
        if (cur.from === cur.to) {
          const deco = Decoration.widget({
            widget: new CursorWidget(cur.name, cur.color),
            side: 1,
          });
          builder.add(cur.from, cur.from, deco);
        } else {
          const deco = Decoration.mark({
            attributes: { 
              style: `background-color: ${cur.color}33; border-bottom: 2px solid ${cur.color}` 
            }
          });
          builder.add(cur.from, cur.to, deco);
        }
      }
      return builder.finish();
    });
  }
});

// Comments underline decoration StateField
const commentHighlightEffect = StateEffect.define<{ id: string; from: number; to: number }[]>();
const commentHighlightsField = StateField.define<Map<string, { from: number; to: number }>>({
  create() { return new Map(); },
  update(value, tr) {
    const newValue = new Map<string, { from: number; to: number }>();
    for (const [id, range] of value.entries()) {
      newValue.set(id, { from: tr.changes.mapPos(range.from), to: tr.changes.mapPos(range.to) });
    }
    for (const effect of tr.effects) {
      if (effect.is(commentHighlightEffect)) {
        newValue.clear();
        for (const item of effect.value) {
          newValue.set(item.id, item);
        }
      }
    }
    return newValue;
  },
  provide(field) {
    return EditorView.decorations.from(field, (value) => {
      const builder = new RangeSetBuilder<Decoration>();
      const sorted = Array.from(value.values()).sort((a, b) => a.from - b.from);
      for (const item of sorted) {
        if (item.from < item.to) {
          const deco = Decoration.mark({
            attributes: {
              class: 'cm-comment-highlight',
              style: 'background-color: rgba(139, 92, 246, 0.15); border-bottom: 2px dashed rgba(139, 92, 246, 0.4); cursor: pointer;'
            }
          });
          builder.add(item.from, item.to, deco);
        }
      }
      return builder.finish();
    });
  }
});

// ==========================================
// EDITOR COMPONENT
// ==========================================

interface CodeMirrorEditorProps {
  noteId: string;
  initialContent: string;
  onContentChange: (content: string) => void;
  onRunAiAction?: (action: string) => void;
  aiLoading?: boolean;
  autoFocus?: boolean;
  onSelectionChange?: (selection: { from: number; to: number; text: string } | null) => void;
  onToggleComments?: () => void;
  onToggleShare?: () => void;
  commentsCount?: number;
  jumpRange?: { from: number; to: number } | null;
}

export default function CodeMirrorEditor({ 
  noteId, 
  initialContent, 
  onContentChange,
  onRunAiAction,
  aiLoading = false,
  autoFocus = false,
  onSelectionChange,
  onToggleComments,
  onToggleShare,
  commentsCount = 0,
  jumpRange = null
}: CodeMirrorEditorProps) {
  const [content, setContent] = useState(initialContent);

  useEffect(() => {
    if (jumpRange && editorViewRef.current) {
      editorViewRef.current.dispatch({
        selection: { anchor: jumpRange.from, head: jumpRange.to },
        scrollIntoView: true,
      });
      editorViewRef.current.focus();
    }
  }, [jumpRange]);
  const [mode, setMode] = useState<'editor' | 'preview' | 'split'>('split');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty' | 'offline'>('saved');
  const { theme } = useTheme();
  const { showToast } = useToast();
  
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const isApplyingRemoteChange = useRef(false);
  const typingTimeoutRef = useRef<any>(null);

  const [showAiDropdown, setShowAiDropdown] = useState(false);
  const [localAiLoading, setLocalAiLoading] = useState(false);
  const [isGeneratingSelectionFlashcards, setIsGeneratingSelectionFlashcards] = useState(false);
  const [selectedTextForCards, setSelectedTextForCards] = useState('');
  const [activeSelectionRange, setActiveSelectionRange] = useState<{ from: number; to: number; text: string } | null>(null);

  // Sync edits, cursors, presence dynamically using the custom WebSocket hook
  const handleRemoteEdit = useCallback((data: { userId: string; change: { from: number; to: number; insert: string }; fullContent?: string }) => {
    const view = editorViewRef.current;
    if (!view) return;

    isApplyingRemoteChange.current = true;
    view.dispatch({
      changes: {
        from: data.change.from,
        to: data.change.to,
        insert: data.change.insert,
      },
    });
    isApplyingRemoteChange.current = false;

    // Keep state and parents synced
    const currentVal = view.state.doc.toString();
    setContent(currentVal);
    onContentChange(currentVal);
  }, [onContentChange]);

  const handleRemoteCursor = useCallback((data: any) => {
    const view = editorViewRef.current;
    if (!view || !data.cursor) return;

    view.dispatch({
      effects: addCursorEffect.of({
        userId: data.userId,
        name: data.name,
        color: data.cursorColor,
        from: data.cursor.from,
        to: data.cursor.to,
      }),
    });
  }, []);

  const {
    connected,
    status: socketStatus,
    activeUsers,
    sendEdit,
    sendCursor,
    sendTyping,
  } = useNoteSocket({
    noteId,
    onRemoteEdit: handleRemoteEdit,
    onRemoteCursor: handleRemoteCursor,
  });

  // Keep saveStatus indicator synchronized with Socket connections
  useEffect(() => {
    if (socketStatus === 'offline') {
      setSaveStatus('offline');
    } else if (socketStatus === 'saving') {
      setSaveStatus('saving');
    } else {
      setSaveStatus('saved');
    }
  }, [socketStatus]);

  // Sync content when noteId or initialContent changes
  useEffect(() => {
    console.log('[CodeMirrorEditor] Syncing content for noteId:', noteId, 'Content length:', initialContent?.length || 0);
    setContent(initialContent || '');
    setSaveStatus('saved');
    
    if (autoFocus) {
      setTimeout(() => {
        if (editorViewRef.current) {
          editorViewRef.current.focus();
        }
      }, 50);
    }
  }, [noteId, initialContent, autoFocus]);

  // Fetch comments ranges and underline them in CodeMirror
  useEffect(() => {
    const fetchAndDecorateComments = async () => {
      const view = editorViewRef.current;
      if (!view || !noteId) return;

      try {
        const res: any = await notesService.getNote(noteId); // or comments directly
        const commentsList = res.comments || [];
        const ranges = commentsList
          .filter((c: any) => !c.resolved && c.highlightStart !== null && c.highlightEnd !== null)
          .map((c: any) => ({
            id: c.id,
            from: c.highlightStart,
            to: c.highlightEnd,
          }));

        view.dispatch({
          effects: commentHighlightEffect.of(ranges),
        });
      } catch (e) {
        console.error('Failed to decorate comments in editor:', e);
      }
    };

    fetchAndDecorateComments();
  }, [noteId, commentsCount]);

  // Cleanup auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const triggerAutoSave = (newContent: string) => {
    setSaveStatus('dirty');
    
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await notesService.autoSave(noteId, newContent);
        setSaveStatus('saved');
      } catch (err) {
        console.error('[CodeMirrorEditor] Autosave failed:', err);
        setSaveStatus('offline');
      }
    }, 1500); // 1.5s debounce
  };

  const handleChange = (val: string, viewUpdate: any) => {
    setContent(val);
    onContentChange(val);

    // If change was made locally by user:
    if (!isApplyingRemoteChange.current) {
      // 1. Process character-level differences and dispatch to server
      viewUpdate.changes.iterChanges((from: number, to: number, fromB: number, toB: number, inserted: any) => {
        const insertText = inserted.toString();
        sendEdit({ from, to, insert: insertText }, val);
      });

      // 2. Broadcast local cursor movement
      const mainSelection = viewUpdate.state.selection.main;
      if (mainSelection) {
        sendCursor({ from: mainSelection.from, to: mainSelection.to });
      }

      // 3. Broadcast typing state
      sendTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => sendTyping(false), 2000);

      // 4. Trigger fallback REST autosave
      triggerAutoSave(val);
    }
  };

  const handleUpdate = (update: any) => {
    if (update.selectionSet) {
      const selection = update.state.selection.main;
      if (selection && selection.from !== selection.to) {
        const text = update.state.sliceDoc(selection.from, selection.to);
        const range = { from: selection.from, to: selection.to, text };
        setActiveSelectionRange(range);
        if (onSelectionChange) onSelectionChange(range);
      } else {
        setActiveSelectionRange(null);
        if (onSelectionChange) onSelectionChange(null);
      }
    }
  };

  const handleCreateEditor = (view: any) => {
    editorViewRef.current = view;
  };

  // Helper to insert markdown templates into editor
  const insertMarkdown = (prefix: string, suffix = '', actionName = 'Format') => {
    const view = editorViewRef.current;
    if (!view) return;

    const state = view.state;
    const selection = state.selection.main;
    const selectedText = state.sliceDoc(selection.from, selection.to);
    const replacement = `${prefix}${selectedText || ''}${suffix}`;
    
    view.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: replacement
      },
      selection: { 
        anchor: selection.from + prefix.length + (selectedText ? selectedText.length : 0) 
      }
    });
    
    view.focus();
  };

  const aiActions = [
    { label: 'AI Summarize', value: 'summarize' },
    { label: 'AI Improve Writing', value: 'improve' },
    { label: 'AI Explain', value: 'explain' },
    { label: 'AI Expand', value: 'expand' },
    { label: 'AI Bullet Points', value: 'bullets' },
    { label: 'Shorten Content', value: 'shorten' },
    { label: 'Generate Study Notes', value: 'study_notes' },
    { label: 'Generate Revision Sheet', value: 'revision_sheet' },
    { label: 'Create Flashcards', value: 'create_flashcards' }
  ];

  const handleAiAction = async (action: string) => {
    setShowAiDropdown(false);

    if (action === 'create_flashcards') {
      const view = editorViewRef.current;
      if (view) {
        const state = view.state;
        const selection = state.selection.main;
        const selectedText = state.doc.sliceString(selection.from, selection.to);
        setSelectedTextForCards(selectedText || view.state.doc.toString());
        setIsGeneratingSelectionFlashcards(true);
      }
      return;
    }

    if (action === 'summarize') {
      if (onRunAiAction) {
        onRunAiAction(action);
      }
      return;
    }

    const view = editorViewRef.current;
    if (!view) return;

    setLocalAiLoading(true);

    try {
      const res = await notesService.processAiAction(noteId, action);
      const insertText = `\n\n=== AI ${action.toUpperCase()} ===\n${res.result}\n====================\n`;
      
      const state = view.state;
      const selection = state.selection.main;

      view.dispatch({
        changes: {
          from: selection.from,
          to: selection.to,
          insert: insertText
        },
        selection: { anchor: selection.from + insertText.length }
      });
      
      view.focus();
      
      const currentVal = view.state.doc.toString();
      setContent(currentVal);
      onContentChange(currentVal);
      triggerAutoSave(currentVal);
      
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'AI request failed';
      showToast(`AI Assistant Error: ${errMsg}`, 'error');
    } finally {
      setLocalAiLoading(false);
    }
  };

  const safeContent = content || '';
  const words = safeContent.trim().split(/\s+/).filter(Boolean).length;
  const chars = safeContent.length;
  const readTime = Math.max(1, Math.ceil(words / 200));
  const isThinking = aiLoading || localAiLoading;

  return (
    <div className="h-full flex flex-col bg-zinc-900/10 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-sm text-zinc-100 font-sans relative">
      
      {/* Editor top toolbar */}
      <div className="h-14 border-b border-border/10 bg-zinc-950 px-4 flex items-center justify-between gap-4">
        
        {/* Toggle Mode Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1 bg-zinc-900/60 p-1 rounded-lg border border-zinc-800">
            <button
              onClick={() => setMode('editor')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors ${
                mode === 'editor' ? 'bg-zinc-850 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Edit3 className="h-3.5 w-3.5" />
              Edit
            </button>
            <button
              onClick={() => setMode('preview')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors ${
                mode === 'preview' ? 'bg-zinc-850 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              Preview
            </button>
            <button
              onClick={() => setMode('split')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors ${
                mode === 'split' ? 'bg-zinc-850 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Columns className="h-3.5 w-3.5" />
              Split
            </button>
          </div>

          {/* Active Collaborators Avatars List */}
          {connected && activeUsers.length > 0 && (
            <div className="flex items-center -space-x-1.5 pl-3 border-l border-zinc-800">
              {activeUsers.map((user) => (
                <div
                  key={user.userId}
                  className="w-6 h-6 rounded-full border border-zinc-900 bg-zinc-850 flex items-center justify-center text-[9px] font-bold text-white uppercase relative group shadow"
                  style={{ borderLeftColor: user.cursorColor, borderWidth: '2px' }}
                  title={`${user.name} (${user.email})`}
                >
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    user.name.charAt(0)
                  )}
                  {/* Tooltip on Hover */}
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-zinc-950 text-zinc-300 text-[10px] px-2 py-0.5 rounded shadow border border-zinc-800 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
                    {user.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Toolbar Shortcuts */}
        {mode !== 'preview' && (
          <div className="flex items-center gap-1 px-3 border-x border-border/10 hidden md:flex">
            <button 
              onMouseDown={(e) => { e.preventDefault(); insertMarkdown('**', '**', 'Bold'); }} 
              className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg transition-colors"
              title="Bold"
            >
              <Bold className="h-3.5 w-3.5" />
            </button>
            <button 
              onMouseDown={(e) => { e.preventDefault(); insertMarkdown('*', '*', 'Italic'); }} 
              className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg transition-colors"
              title="Italic"
            >
              <Italic className="h-3.5 w-3.5" />
            </button>
            <button 
              onMouseDown={(e) => { e.preventDefault(); insertMarkdown('<u>', '</u>', 'Underline'); }} 
              className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg transition-colors"
              title="Underline"
            >
              <span className="underline font-semibold text-xs h-3.5 w-3.5 flex items-center justify-center">U</span>
            </button>
            <button 
              onMouseDown={(e) => { e.preventDefault(); insertMarkdown('### ', '', 'Heading'); }} 
              className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg transition-colors"
              title="Heading"
            >
              <span className="font-bold text-xs h-3.5 w-3.5 flex items-center justify-center">H</span>
            </button>
            <button 
              onMouseDown={(e) => { e.preventDefault(); insertMarkdown('- ', '', 'Bullet List'); }} 
              className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg transition-colors"
              title="Bullet List"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button 
              onMouseDown={(e) => { e.preventDefault(); insertMarkdown('```\n', '\n```', 'Code Block'); }} 
              className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg transition-colors"
              title="Code Block"
            >
              <Code className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* AI Action Menu & Auto-save tracker */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Share note button */}
          {onToggleShare && (
            <button
              onClick={onToggleShare}
              className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-zinc-800 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              title="Share workspace"
            >
              <Users className="h-4 w-4" />
              <span>Share</span>
            </button>
          )}

          {/* Comments toggle button */}
          {onToggleComments && (
            <button
              onClick={onToggleComments}
              className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-zinc-800 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer relative"
              title="Toggle Comments"
            >
              <MessageSquarePlus className="h-4 w-4" />
              <span>Comments</span>
              {commentsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-violet-650 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-zinc-950">
                  {commentsCount}
                </span>
              )}
            </button>
          )}
          
          {/* AI Assistant dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowAiDropdown(!showAiDropdown)}
              disabled={isThinking}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-750 disabled:bg-violet-850 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              <span>{isThinking ? 'Analyzing...' : 'AI Assistant'}</span>
              <ChevronDown className="h-3 w-3" />
            </button>

            {showAiDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl z-20">
                {aiActions.map(action => (
                  <button
                    key={action.value}
                    onClick={() => handleAiAction(action.value)}
                    className="w-full text-left px-4 py-2 hover:bg-zinc-850 text-zinc-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Connection / Autosave status indicator */}
          <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-semibold select-none pr-1">
            {saveStatus === 'saved' && (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-emerald-500/80 hidden sm:inline">Synced</span>
              </>
            )}
            {saveStatus === 'saving' && (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-violet-500" />
                <span className="text-violet-500/80 hidden sm:inline">Saving</span>
              </>
            )}
            {saveStatus === 'dirty' && (
              <>
                <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-amber-500/80 hidden sm:inline">Unsaved</span>
              </>
            )}
            {saveStatus === 'offline' && (
              <>
                <WifiOff className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
                <span className="text-rose-500/80 hidden sm:inline">Offline</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Editor Panel content areas */}
      <div className="flex-1 flex min-h-0 divide-x divide-border/10 relative">
        
        {/* Editor Screen */}
        {(mode === 'editor' || mode === 'split') && (
          <div className="flex-1 overflow-y-auto h-full text-left font-mono text-xs leading-relaxed relative bg-zinc-950">
            <CodeMirror
              value={content}
              onCreateEditor={handleCreateEditor}
              height="100%"
              theme={theme === 'dark' ? oneDark : 'light'}
              extensions={[mdLang(), cursorStateField, commentHighlightsField]}
              onChange={handleChange}
              onUpdate={handleUpdate}
              autoFocus={autoFocus}
              className="h-full [&_.cm-editor]:h-full [&_.cm-scroller]:h-full [&_.cm-content]:px-6 [&_.cm-content]:py-6"
            />

            {/* Selection floating add-comment toolbar button */}
            {activeSelectionRange && onToggleComments && (
              <button
                onClick={onToggleComments}
                className="absolute z-20 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-[10px] px-2.5 py-1.5 rounded-lg shadow-2xl flex items-center gap-1 border border-violet-400 transition cursor-pointer select-none animate-bounce"
                style={{
                  top: '10px',
                  right: '24px',
                }}
              >
                <MessageSquarePlus className="w-3.5 h-3.5" />
                <span>Comment Selection</span>
              </button>
            )}
          </div>
        )}

        {/* Markdown Preview Screen */}
        {(mode === 'preview' || mode === 'split') && (
          <div className="flex-1 overflow-y-auto h-full p-8 text-left bg-zinc-900/20">
            <div className="prose prose-invert max-w-none prose-zinc prose-headings:font-bold prose-headings:font-sans prose-p:text-xs prose-p:leading-relaxed prose-a:text-violet-400">
              {safeContent.trim() ? (
                <ReactMarkdown>{safeContent}</ReactMarkdown>
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-600 text-xs font-sans uppercase tracking-wider">
                  No preview content
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer metrics */}
      <div className="h-10 border-t border-border/10 bg-zinc-950 px-4 flex items-center justify-between text-[11px] text-zinc-500 font-sans font-semibold">
        <div className="flex items-center gap-4">
          <span>{words} Words</span>
          <span>{chars} Characters</span>
        </div>
        <span>{readTime} Min Read</span>
      </div>

      {isGeneratingSelectionFlashcards && (
        <GenerateFlashcardsModal
          noteId={noteId}
          selectedText={selectedTextForCards}
          onClose={() => setIsGeneratingSelectionFlashcards(false)}
        />
      )}

    </div>
  );
}
