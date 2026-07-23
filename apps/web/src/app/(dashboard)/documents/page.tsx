'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import UploadDropzone from '@/components/ui/UploadDropzone';
import { useToast } from '@/components/providers/ToastProvider';
import { useCreateNote } from '@/hooks/useNotes';
import { useGenerateFlashcardsFromSelection } from '@/hooks/useFlashcards';
import api from '@/lib/axios';
import { 
  FileText, Send, Loader2, Sparkles, BookOpen, 
  ChevronLeft, ChevronRight, Bookmark, 
  Trash2, Underline, BookmarkCheck, 
  StickyNote, Plus, Brain, Eye, BookMarked, RefreshCw, ZoomIn, ZoomOut, Highlighter,
  Edit, AlertCircle, UploadCloud, X, Compass, Activity, Target, Award, Clock
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useGenerateQuizFromSelection } from '@/hooks/useQuizzes';
import { motion, AnimatePresence } from 'framer-motion';

interface DocumentItem {
  id: string;
  name: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  summary?: string | null;
  createdAt: string;
  status: 'indexed' | 'processing';
}

interface DocumentVector {
  id: string;
  pageNumber: number;
  chunkIndex: number;
  contentChunk: string;
}

interface DocumentDetail extends DocumentItem {
  vectors: DocumentVector[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  citations?: { documentName: string; pageNumber: number; content: string }[];
}

interface Annotation {
  id: string;
  type: 'highlight' | 'underline' | 'sticky';
  pageNumber: number;
  text: string;
  note?: string;
  color?: string;
}

export default function DocumentsPage() {
  const { showToast } = useToast();
  const router = useRouter();

  // Documents list
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  // Active document detail
  const [activeDoc, setActiveDoc] = useState<DocumentDetail | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);

  // Reader settings
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [searchWord, setSearchWord] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'actions' | 'highlights' | 'graph'>('chat');

  // Floating toolbar state
  const [floatingSelection, setFloatingSelection] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  // Annotations
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [stickyInput, setStickyInput] = useState<{ page: number; text: string } | null>(null);

  // Chat grounded in document
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Academic Actions State
  const [actionOutput, setActionOutput] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionTitle, setActionTitle] = useState('');

  // Documents search & actions
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [previewMode, setPreviewMode] = useState<'visual' | 'text'>('text');
  const [docLoadError, setDocLoadError] = useState<string | null>(null);
  const [actionOutputs, setActionOutputs] = useState<Record<string, string>>({});
  const [activeActionType, setActiveActionType] = useState<string>('summary');

  // Mutations
  const createNoteMutation = useCreateNote();
  const generateCardsMutation = useGenerateFlashcardsFromSelection();
  const generateQuizMutation = useGenerateQuizFromSelection();

  // Scroll Container Ref
  const readerContainerRef = useRef<HTMLDivElement>(null);

  // Fetch library list
  const fetchDocuments = async () => {
    try {
      const res = await api.get('/rag/documents');
      setDocuments(res.data);
    } catch (e) {
      showToast('Failed to load documents list', 'error');
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Fetch single document detail
  const loadDocumentDetail = async (id: string) => {
    setLoadingDoc(true);
    setDocLoadError(null);
    try {
      const res = await api.get(`/rag/documents/${id}`);
      setActiveDoc(res.data);
      
      localStorage.setItem(`doc-last-opened-${id}`, Date.now().toString());

      const savedPage = localStorage.getItem(`doc-page-${id}`);
      setCurrentPage(savedPage ? parseInt(savedPage, 10) : 1);

      const savedAnnotations = localStorage.getItem(`doc-annotations-${id}`);
      setAnnotations(savedAnnotations ? JSON.parse(savedAnnotations) : []);

      const savedBookmarks = localStorage.getItem(`doc-bookmarks-${id}`);
      setBookmarks(savedBookmarks ? JSON.parse(savedBookmarks) : []);

      const savedChat = localStorage.getItem(`doc-chat-${id}`);
      setChatLog(savedChat ? JSON.parse(savedChat) : []);
      setActionOutput(null);

      const savedActionOutputs = localStorage.getItem(`doc-action-outputs-${id}`);
      setActionOutputs(savedActionOutputs ? JSON.parse(savedActionOutputs) : {});

      if (
        res.data.mimeType === 'application/pdf' ||
        res.data.mimeType.startsWith('image/') ||
        res.data.mimeType === 'text/markdown'
      ) {
        setPreviewMode('visual');
      } else {
        setPreviewMode('text');
      }
    } catch (e) {
      setDocLoadError('Failed to load document preview. Please try re-indexing.');
      showToast('Failed to load document text contents', 'error');
    } finally {
      setLoadingDoc(false);
    }
  };

  const handleStartRename = (doc: DocumentItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(doc.id);
    setRenameInput(doc.name);
  };

  const handleSaveRename = async (id: string) => {
    if (!renameInput.trim()) {
      showToast('Document name cannot be empty', 'error');
      setRenamingId(null);
      return;
    }

    const duplicate = documents.find(
      (d) => d.name.toLowerCase() === renameInput.trim().toLowerCase() && d.id !== id
    );
    if (duplicate) {
      showToast('A document with this name already exists', 'error');
      return;
    }

    const previousDocs = [...documents];
    setDocuments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, name: renameInput.trim() } : d))
    );
    if (activeDoc?.id === id) {
      setActiveDoc((prev) => (prev ? { ...prev, name: renameInput.trim() } : null));
    }
    setRenamingId(null);

    try {
      await api.patch(`/rag/documents/${id}`, { name: renameInput.trim() });
      showToast('Document renamed successfully', 'success');
    } catch (err: any) {
      setDocuments(previousDocs);
      showToast(err.response?.data?.message || 'Failed to rename document', 'error');
    }
  };

  const handleConfirmDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const handleExecuteDelete = async () => {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    setDeleteConfirmId(null);
    try {
      await api.delete(`/storage/${id}`);
      showToast('Document deleted successfully', 'success');
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      if (selectedDocId === id) {
        setSelectedDocId(null);
        setActiveDoc(null);
      }
      localStorage.removeItem(`doc-page-${id}`);
      localStorage.removeItem(`doc-annotations-${id}`);
      localStorage.removeItem(`doc-bookmarks-${id}`);
      localStorage.removeItem(`doc-chat-${id}`);
      localStorage.removeItem(`doc-last-opened-${id}`);
      localStorage.removeItem(`doc-chat-count-${id}`);
      localStorage.removeItem(`doc-action-outputs-${id}`);
    } catch (err) {
      showToast('Failed to delete document', 'error');
    }
  };

  useEffect(() => {
    if (selectedDocId) {
      loadDocumentDetail(selectedDocId);
    } else {
      setActiveDoc(null);
    }
  }, [selectedDocId]);

  // Aggregate slide pages
  const docPages = useMemo(() => {
    if (!activeDoc) return [];
    const pagesMap: Record<number, string[]> = {};
    activeDoc.vectors.forEach((v) => {
      if (!pagesMap[v.pageNumber]) pagesMap[v.pageNumber] = [];
      pagesMap[v.pageNumber].push(v.contentChunk);
    });
    return Object.keys(pagesMap)
      .map(Number)
      .sort((a, b) => a - b)
      .map((pageNum) => ({
        pageNumber: pageNum,
        text: pagesMap[pageNum].join('\n')
      }));
  }, [activeDoc]);

  // Word count & read time stats
  const docStats = useMemo(() => {
    if (!activeDoc) return { words: 0, readTime: 0 };
    const fullText = activeDoc.vectors.map((v) => v.contentChunk).join(' ');
    const words = fullText.split(/\s+/).filter(Boolean).length;
    const readTime = Math.ceil(words / 200);
    return { words, readTime };
  }, [activeDoc]);

  // Save page state to local storage
  const handlePageChange = (pageNum: number) => {
    if (pageNum < 1 || pageNum > docPages.length) return;
    setCurrentPage(pageNum);
    if (selectedDocId) {
      localStorage.setItem(`doc-page-${selectedDocId}`, pageNum.toString());
    }
    if (readerContainerRef.current) {
      readerContainerRef.current.scrollTop = 0;
    }
  };

  // Toggle bookmark
  const toggleBookmark = (pageNum: number) => {
    let updated;
    if (bookmarks.includes(pageNum)) {
      updated = bookmarks.filter((x) => x !== pageNum);
      showToast('Bookmark removed', 'info');
    } else {
      updated = [...bookmarks, pageNum].sort((a, b) => a - b);
      showToast('Page bookmarked', 'success');
    }
    setBookmarks(updated);
    if (selectedDocId) {
      localStorage.setItem(`doc-bookmarks-${selectedDocId}`, JSON.stringify(updated));
    }
  };

  // Re-indexing
  const handleTriggerReindex = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.post(`/rag/index/${id}`);
      showToast('Re-indexing job queued successfully', 'success');
      fetchDocuments();
    } catch (err) {
      showToast('Failed to trigger re-index', 'error');
    }
  };

  // Upload callback
  const handleUploadSuccess = async (doc: any) => {
    showToast('Upload successful. Indexing vectors...', 'success');
    try {
      await api.post(`/rag/index/${doc.id}`);
      fetchDocuments();
    } catch (e) {
      showToast('Failed to queue indexing', 'error');
    }
  };

  // Grounded Chat handler
  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedDocId) return;

    const userMsg: ChatMessage = { role: 'user', content: chatInput };
    const updatedChat = [...chatLog, userMsg];
    setChatLog(updatedChat);
    setChatInput('');
    setChatLoading(true);

    const chatCount = parseInt(localStorage.getItem(`doc-chat-count-${selectedDocId}`) || '0', 10);
    localStorage.setItem(`doc-chat-count-${selectedDocId}`, (chatCount + 1).toString());

    try {
      const res = await api.post('/rag/ask', {
        documentIds: [selectedDocId],
        question: userMsg.content,
      });

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: res.data.response,
        citations: res.data.citations
      };
      
      const newChat = [...updatedChat, assistantMsg];
      setChatLog(newChat);
      localStorage.setItem(`doc-chat-${selectedDocId}`, JSON.stringify(newChat));
    } catch (err: any) {
      showToast('Failed to get cited answer', 'error');
    } finally {
      setChatLoading(false);
    }
  };

  // Clear Chat Logs
  const handleClearChat = () => {
    if (!selectedDocId) return;
    setChatLog([]);
    localStorage.removeItem(`doc-chat-${selectedDocId}`);
    showToast('Cleared conversation history', 'info');
  };

  // Text selection handler
  const handleTextSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setFloatingSelection(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setFloatingSelection({
      text: sel.toString().trim(),
      x: rect.left + window.scrollX + rect.width / 2,
      y: rect.top + window.scrollY - 45
    });
  };

  // Clear selection
  const clearSelection = () => {
    window.getSelection()?.removeAllRanges();
    setFloatingSelection(null);
  };

  // Floating Actions
  const handleFloatHighlight = (color = 'yellow') => {
    if (!floatingSelection || !selectedDocId) return;
    const newAnn: Annotation = {
      id: Math.random().toString(),
      type: 'highlight',
      pageNumber: currentPage,
      text: floatingSelection.text,
      color
    };
    const updated = [...annotations, newAnn];
    setAnnotations(updated);
    localStorage.setItem(`doc-annotations-${selectedDocId}`, JSON.stringify(updated));
    showToast('Text highlighted', 'success');
    clearSelection();
  };

  const handleFloatUnderline = () => {
    if (!floatingSelection || !selectedDocId) return;
    const newAnn: Annotation = {
      id: Math.random().toString(),
      type: 'underline',
      pageNumber: currentPage,
      text: floatingSelection.text
    };
    const updated = [...annotations, newAnn];
    setAnnotations(updated);
    localStorage.setItem(`doc-annotations-${selectedDocId}`, JSON.stringify(updated));
    showToast('Text underlined', 'success');
    clearSelection();
  };

  const handleFloatSticky = () => {
    if (!floatingSelection) return;
    setStickyInput({ page: currentPage, text: floatingSelection.text });
  };

  const saveStickyNote = (noteText: string) => {
    if (!stickyInput || !selectedDocId) return;
    const newAnn: Annotation = {
      id: Math.random().toString(),
      type: 'sticky',
      pageNumber: stickyInput.page,
      text: stickyInput.text,
      note: noteText
    };
    const updated = [...annotations, newAnn];
    setAnnotations(updated);
    localStorage.setItem(`doc-annotations-${selectedDocId}`, JSON.stringify(updated));
    setStickyInput(null);
    showToast('Sticky note added', 'success');
    clearSelection();
  };

  const handleFloatSaveNote = async () => {
    if (!floatingSelection) return;
    try {
      await createNoteMutation.mutateAsync({
        title: `Snippet from ${activeDoc?.name || 'Doc'}`,
        content: `> ${floatingSelection.text}\n\n*Saved from document intelligence workspace.*`
      });
      showToast('Saved selection as a Note!', 'success');
      clearSelection();
    } catch (e) {
      showToast('Failed to create note', 'error');
    }
  };

  const handleFloatFlashcards = async () => {
    if (!floatingSelection) return;
    try {
      await generateCardsMutation.mutateAsync({
        text: floatingSelection.text,
        type: 'recall',
        quantity: 3
      });
      showToast('Generated 3 flashcards in background!', 'success');
      clearSelection();
    } catch (e) {
      showToast('Failed to generate cards', 'error');
    }
  };

  const handleFloatAskAI = () => {
    if (!floatingSelection) return;
    setChatInput(`Explain this paragraph:\n"${floatingSelection.text}"`);
    setActiveTab('chat');
    clearSelection();
  };

  // Delete annotation
  const handleDeleteAnnotation = (id: string) => {
    if (!selectedDocId) return;
    const updated = annotations.filter((a) => a.id !== id);
    setAnnotations(updated);
    localStorage.setItem(`doc-annotations-${selectedDocId}`, JSON.stringify(updated));
    showToast('Annotation deleted', 'info');
  };

  // AI Academic Actions Streamer
  const handleAcademicAction = async (title: string, promptText: string, type: string) => {
    setActionLoading(true);
    setActionTitle(title);
    setActiveActionType(type);
    setActiveTab('actions');
    setActionOutput('');

    const systemInstruction = 
      'You are an elite study tutor. Format your output with clear markdown structures. ' +
      'Always start with a title, use lists, tables, bold text, and include "Exam Tips" and "Key Summary Rules".';

    try {
      const encodedPrompt = encodeURIComponent(promptText);
      const encodedSystem = encodeURIComponent(systemInstruction);
      const eventSource = new EventSource(
        `${api.defaults.baseURL}/ai/tutor/stream?prompt=${encodedPrompt}&system=${encodedSystem}`
      );

      eventSource.onmessage = (event) => {
        if (event.data === '[DONE]') {
          eventSource.close();
          setActionLoading(false);

          setActionOutput((prev) => {
            const finalText = prev || '';
            if (selectedDocId) {
              if (type === 'summary') {
                api.patch(`/rag/documents/${selectedDocId}`, { summary: finalText })
                  .then(() => {
                    setActiveDoc((prevDoc) => prevDoc ? { ...prevDoc, summary: finalText } : null);
                  })
                  .catch(console.error);
              } else {
                const updatedOutputs = { ...actionOutputs, [type]: finalText };
                setActionOutputs(updatedOutputs);
                localStorage.setItem(`doc-action-outputs-${selectedDocId}`, JSON.stringify(updatedOutputs));
              }
            }
            return finalText;
          });
          return;
        }
        setActionOutput((prev) => (prev || '') + event.data);
      };

      eventSource.onerror = () => {
        eventSource.close();
        setActionLoading(false);
        showToast('Stream interrupted', 'error');
      };
    } catch (e) {
      setActionLoading(false);
      showToast('Failed to query assistant', 'error');
    }
  };

  const getActionLabel = (type: string) => {
    const labels: Record<string, string> = {
      summary: 'Executive Summary',
      concepts: 'Core Key Concepts',
      definitions: 'Technical Definitions',
      exam: 'Generate Study Notes',
      revision: 'Last Minute Revision',
      mnemonics: 'Mnemonics & Tricks',
      topics: 'Find Key Topics',
    };
    return labels[type] || 'Study Action';
  };

  // Trigger Sidebar Actions
  const handleTriggerAction = async (type: string) => {
    if (!activeDoc) return;
    const fullText = activeDoc.vectors.map((v) => v.contentChunk).join('\n') || `[Document content of ${activeDoc.name}]`;
    
    if (type === 'summary' && activeDoc.summary) {
      setActionTitle('Executive Summary');
      setActionOutput(activeDoc.summary);
      setActiveTab('actions');
      return;
    }

    if (type !== 'summary' && type !== 'flashcards' && type !== 'quiz' && actionOutputs[type]) {
      setActionTitle(getActionLabel(type));
      setActionOutput(actionOutputs[type]);
      setActiveTab('actions');
      return;
    }

    let title = '';
    let prompt = '';

    switch (type) {
      case 'summary':
        title = 'Executive Summary';
        prompt = `Summarize this text in detail. Context:\n${fullText}`;
        break;
      case 'concepts':
        title = 'Key Concepts';
        prompt = `Extract and detail all core intellectual concepts. Context:\n${fullText}`;
        break;
      case 'definitions':
        title = 'Important Definitions';
        prompt = `List all academic terms, technical vocabulary and definitions. Context:\n${fullText}`;
        break;
      case 'exam':
        title = 'Exam Study Notes';
        prompt = `Generate high-yield exam preparation notes. Context:\n${fullText}`;
        break;
      case 'revision':
        title = 'Last Minute Revision';
        prompt = `Generate quick cheat-sheet bullet summaries. Context:\n${fullText}`;
        break;
      case 'mnemonics':
        title = 'Mnemonics & Memory Tricks';
        prompt = `Provide acronyms and study memory tricks. Context:\n${fullText}`;
        break;
      case 'topics':
        title = 'Find Key Topics';
        prompt = `List the critical syllabus divisions. Context:\n${fullText}`;
        break;
      case 'flashcards':
        setActionLoading(true);
        setActionTitle('Generating Flashcards...');
        setActiveTab('actions');
        try {
          await generateCardsMutation.mutateAsync({
            text: fullText,
            type: 'recall',
            quantity: 5,
          });
          showToast('Generated 5 flashcards successfully! Go to Flashcards tab to review.', 'success');
          setActionOutput('**Flashcard Generation Successful!**\n\nGenerated 5 conceptual flashcards from document context. Head over to the **Flashcards** module to review them.');
        } catch (e) {
          showToast('Failed to generate flashcards', 'error');
          setActionOutput('Failed to generate flashcards. Please check console errors.');
        } finally {
          setActionLoading(false);
        }
        return;
      case 'quiz':
        setActionLoading(true);
        setActionTitle('Generating Quiz...');
        setActiveTab('actions');
        try {
          await generateQuizMutation.mutateAsync({
            text: fullText,
            data: {
              questionCount: 5,
              difficulty: 'MEDIUM',
            },
          });
          showToast('Generated a 5-question Quiz! Go to Quizzes tab to take it.', 'success');
          setActionOutput('**Quiz Generation Successful!**\n\nGenerated a 5-question Multiple Choice Quiz from document content. Head over to the **Quiz Engine** module to start the attempt.');
        } catch (e) {
          showToast('Failed to generate quiz', 'error');
          setActionOutput('Failed to generate quiz. Please check console errors.');
        } finally {
          setActionLoading(false);
        }
        return;
      default:
        return;
    }
    handleAcademicAction(title, prompt, type);
  };

  // Save generated assistant markdown as a new Note
  const saveActionAsNote = async () => {
    if (!actionOutput || !actionTitle) return;
    try {
      await createNoteMutation.mutateAsync({
        title: actionTitle,
        content: actionOutput
      });
      showToast('Saved assistant results to Notes!', 'success');
    } catch (e) {
      showToast('Failed to save note', 'error');
    }
  };

  // Text Rendering with highlights & bookmarks inline decoration helpers
  const renderPageText = (text: string) => {
    if (!text) return '';

    const pageAnns = annotations.filter((a) => a.pageNumber === currentPage);
    let elements: React.ReactNode[] = [];
    let matches: { start: number; end: number; type: 'search' | 'highlight' | 'underline' | 'sticky'; color?: string; note?: string }[] = [];

    if (searchWord.trim().length >= 2) {
      const regex = new RegExp(searchWord.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          type: 'search'
        });
      }
    }

    pageAnns.forEach((ann) => {
      const idx = text.indexOf(ann.text);
      if (idx !== -1) {
        matches.push({
          start: idx,
          end: idx + ann.text.length,
          type: ann.type,
          color: ann.color,
          note: ann.note
        });
      }
    });

    matches.sort((a, b) => a.start - b.start);

    let cursor = 0;
    matches.forEach((m, i) => {
      if (m.start < cursor) return;
      
      if (m.start > cursor) {
        elements.push(<span key={`txt-${cursor}`}>{text.substring(cursor, m.start)}</span>);
      }

      const matchText = text.substring(m.start, m.end);
      if (m.type === 'search') {
        elements.push(
          <mark key={`m-${i}`} className="bg-purple-600/35 text-purple-100 border-b border-purple-500 font-semibold px-0.5">
            {matchText}
          </mark>
        );
      } else if (m.type === 'highlight') {
        const bgColors: Record<string, string> = {
          yellow: 'bg-yellow-500/25 border-b-2 border-yellow-500/40',
          green: 'bg-emerald-500/25 border-b-2 border-emerald-500/40',
          blue: 'bg-blue-500/25 border-b-2 border-blue-500/40'
        };
        elements.push(
          <mark key={`m-${i}`} className={`${bgColors[m.color || 'yellow']} px-0.5`}>
            {matchText}
          </mark>
        );
      } else if (m.type === 'underline') {
        elements.push(
          <span key={`m-${i}`} className="border-b-2 border-violet-500 border-dashed pb-0.5">
            {matchText}
          </span>
        );
      } else if (m.type === 'sticky') {
        elements.push(
          <span key={`m-${i}`} className="relative bg-zinc-800/80 border border-zinc-700/60 rounded px-1.5 py-0.5 group inline-flex items-center gap-1">
            <span className="bg-yellow-500/10 border-b border-yellow-500 text-zinc-200">{matchText}</span>
            <StickyNote className="h-3.5 w-3.5 text-yellow-500 cursor-help" />
            <div className="absolute left-1/2 bottom-full mb-1.5 transform -translate-x-1/2 hidden group-hover:block bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 shadow-2xl z-20 w-48 text-[10px] text-zinc-300">
              <div className="font-bold text-yellow-500 mb-1 flex items-center gap-1">
                <StickyNote className="h-3 w-3" />
                Sticky Note
              </div>
              <p className="italic leading-normal">{m.note}</p>
            </div>
          </span>
        );
      }

      cursor = m.end;
    });

    if (cursor < text.length) {
      elements.push(<span key={`txt-end`}>{text.substring(cursor)}</span>);
    }

    return elements.length > 0 ? elements : text;
  };

  const activePageText = docPages.find((p) => p.pageNumber === currentPage)?.text || '';

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#070708] text-zinc-100 overflow-hidden font-sans select-none w-full">
      
      {/* 1. LEFT COLUMN: LIBRARY & METADATA */}
      <div className="w-80 border-r border-zinc-900 bg-zinc-950/20 flex flex-col h-full shrink-0">
        <div className="p-4 border-b border-zinc-900">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Library Workspace</h2>
          <UploadDropzone onUploadSuccess={handleUploadSuccess} />
        </div>

        {/* Search documents */}
        <div className="px-4 py-2 border-b border-zinc-900 flex items-center bg-zinc-950/20">
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-violet-600/50"
          />
        </div>

        {/* Scrollable File List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {listLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-violet-500" /></div>
          ) : (documents.filter((d) => d.name.toLowerCase().includes(searchQuery.toLowerCase()))).length === 0 ? (
            <div className="text-center py-10 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/10 flex flex-col items-center justify-center p-4 mx-2 select-none">
              <BookOpen className="w-7 h-7 text-zinc-700 mb-2 stroke-[1.25]" />
              <p className="text-xs text-zinc-300 font-semibold">Empty Library</p>
              <p className="text-[9px] text-zinc-500 max-w-xs mt-0.5 leading-relaxed">Drag or select a PDF, Markdown, or Word file in the dropzone above to start analyzing.</p>
            </div>
          ) : (
            documents.filter((d) => d.name.toLowerCase().includes(searchQuery.toLowerCase())).map((doc) => {
              const isSelected = selectedDocId === doc.id;
              const isRenaming = renamingId === doc.id;
              return (
                <div
                  key={doc.id}
                  onClick={() => !isRenaming && setSelectedDocId(doc.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col gap-2 ${
                    isSelected 
                      ? 'bg-violet-600/10 border-violet-500/30 text-violet-400' 
                      : 'bg-transparent border-transparent text-zinc-400 hover:bg-zinc-900/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2.5 w-full">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <FileText className="h-4.5 w-4.5 mt-0.5 shrink-0" />
                      {isRenaming ? (
                        <input
                          type="text"
                          value={renameInput}
                          onChange={(e) => setRenameInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(doc.id);
                            if (e.key === 'Escape') setRenamingId(null);
                          }}
                          onBlur={() => handleSaveRename(doc.id)}
                          autoFocus
                          className="w-full bg-zinc-950 border border-violet-500 rounded px-1.5 py-0.5 text-xs text-zinc-200 focus:outline-none"
                        />
                      ) : (
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-xs font-semibold truncate leading-normal text-zinc-250">{doc.name}</span>
                          <span className="text-[9px] text-zinc-500 uppercase font-bold">{doc.mimeType.split('/').pop() || 'Unknown'}</span>
                        </div>
                      )}
                    </div>
                    
                    {!isRenaming && (
                      <div className="flex items-center gap-1 shrink-0">
                        {doc.status === 'processing' && (
                          <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
                        )}
                        <button
                          onClick={(e) => handleStartRename(doc, e)}
                          title="Rename document"
                          className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-350 cursor-pointer"
                        >
                          <Edit className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => handleConfirmDelete(doc.id, e)}
                          title="Delete document"
                          className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-rose-450 cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Active Doc Metadata Card Panels */}
        {activeDoc && (
          <div className="p-4 border-t border-zinc-900 bg-zinc-950/30 text-[10px] space-y-3 select-text">
            <div className="text-[11px] font-bold text-zinc-400 border-b border-zinc-900 pb-1.5 flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 text-violet-500" />
              Document Properties
            </div>
            
            {/* Custom RAG Intelligence details */}
            <div className="grid grid-cols-2 gap-2.5 text-zinc-500">
              <div className="bg-zinc-900/30 border border-zinc-850 p-2 rounded-xl text-center space-y-0.5">
                <span className="text-[8px] font-bold text-zinc-550 block uppercase">Pages</span>
                <span className="text-zinc-200 text-xs font-black">{docPages.length}</span>
              </div>
              <div className="bg-zinc-900/30 border border-zinc-850 p-2 rounded-xl text-center space-y-0.5">
                <span className="text-[8px] font-bold text-zinc-550 block uppercase">Read Time</span>
                <span className="text-zinc-200 text-xs font-black">{docStats.readTime}m</span>
              </div>
              <div className="bg-zinc-900/30 border border-zinc-850 p-2 rounded-xl text-center space-y-0.5">
                <span className="text-[8px] font-bold text-zinc-550 block uppercase">Complexity</span>
                <span className="text-violet-400 text-xs font-black">Moderate</span>
              </div>
              <div className="bg-zinc-900/30 border border-zinc-850 p-2 rounded-xl text-center space-y-0.5">
                <span className="text-[8px] font-bold text-zinc-550 block uppercase">Exam Weight</span>
                <span className="text-emerald-400 text-xs font-black">High</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. CENTER PANEL: DOCUMENT READER */}
      <div 
        className="flex-1 flex flex-col h-full bg-[#070708] relative select-text"
        onMouseUp={previewMode === 'text' ? handleTextSelection : undefined}
      >
        {loadingDoc ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 select-none">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500 mb-2" />
            <span className="text-zinc-500 text-xs">Loading document pages...</span>
          </div>
        ) : docLoadError ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 select-none text-red-400 gap-1">
            <AlertCircle className="h-10 w-10 text-rose-500 mb-2" />
            <h3 className="text-sm font-bold text-foreground">Failed to Load Preview</h3>
            <p className="text-[11px] text-muted-foreground max-w-xs leading-normal">
              {docLoadError}
            </p>
            <button
              onClick={() => loadDocumentDetail(selectedDocId!)}
              className="mt-4 px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 rounded-xl text-xs font-bold text-zinc-300 transition"
            >
              Retry
            </button>
          </div>
        ) : documents.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 select-none">
            <UploadCloud className="h-14 w-14 stroke-[1.25] text-violet-500/20 mb-3 animate-bounce" />
            <h3 className="text-sm font-bold text-foreground">Upload Your First Document</h3>
            <p className="text-[11px] text-muted-foreground max-w-sm mt-1 mb-4 leading-normal">
              Get started by uploading a PDF, DOCX, TXT, Markdown, or image file in the library workspace dropzone on the left to start analyzing, summarizing, and studying.
            </p>
            <button
              onClick={() => {
                const btn = document.querySelector('input[type="file"]') as HTMLElement;
                btn?.click();
              }}
              className="px-4 py-2.5 bg-violet-600 hover:bg-violet-550 text-white font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Select File to Upload
            </button>
          </div>
        ) : activeDoc ? (
          <>
            {/* Reader Toolbar */}
            <div className="h-12 border-b border-zinc-900 px-4 flex items-center justify-between bg-zinc-950/40 shrink-0 select-none">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1 || previewMode !== 'text'}
                  className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded disabled:opacity-30 cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs font-semibold text-zinc-400">
                  Page <span className="text-zinc-200">{currentPage}</span> of {docPages.length || 1}
                </span>
                <button 
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= docPages.length || previewMode !== 'text'}
                  className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded disabled:opacity-30 cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>

                <div className="h-4 w-[1px] bg-zinc-850 mx-2" />
                
                {/* Bookmarks */}
                <button 
                  onClick={() => toggleBookmark(currentPage)}
                  disabled={previewMode !== 'text'}
                  className="p-1 hover:bg-zinc-805 rounded cursor-pointer disabled:opacity-30"
                >
                  <Bookmark className={`h-4.5 w-4.5 ${bookmarks.includes(currentPage) ? 'text-violet-500 fill-violet-500/20' : 'text-zinc-450'}`} />
                </button>
              </div>

              {/* Preview Mode selector */}
              <div className="flex bg-zinc-950 border border-zinc-900 p-0.5 rounded-lg shrink-0">
                <button
                  onClick={() => setPreviewMode('visual')}
                  className={`px-2.5 py-1 text-[9px] font-bold uppercase rounded ${
                    previewMode === 'visual'
                      ? 'bg-violet-600 text-white'
                      : 'text-zinc-550 hover:text-zinc-350'
                  }`}
                >
                  Visual Preview
                </button>
                <button
                  onClick={() => setPreviewMode('text')}
                  className={`px-2.5 py-1 text-[9px] font-bold uppercase rounded ${
                    previewMode === 'text'
                      ? 'bg-violet-600 text-white'
                      : 'text-zinc-550 hover:text-zinc-350'
                  }`}
                >
                  Text (RAG)
                </button>
              </div>

              {/* Search Inside */}
              <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-900 rounded-lg px-2 py-1 max-w-[180px]">
                <input
                  type="text"
                  placeholder="Find on page..."
                  value={searchWord}
                  onChange={(e) => setSearchWord(e.target.value)}
                  className="bg-transparent text-[10px] text-zinc-250 outline-none w-full placeholder-zinc-700"
                />
              </div>

              {/* Zoom settings */}
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <button onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))} className="p-1 hover:bg-zinc-800 rounded cursor-pointer"><ZoomOut className="h-3.5 w-3.5" /></button>
                <span>{zoomLevel}%</span>
                <button onClick={() => setZoomLevel(Math.min(200, zoomLevel + 10))} className="p-1 hover:bg-zinc-800 rounded cursor-pointer"><ZoomIn className="h-3.5 w-3.5" /></button>
              </div>
            </div>

            {/* Sticky annotation input form */}
            {stickyInput && (
              <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-50 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 w-80 shadow-2xl">
                <div className="text-xs font-bold text-yellow-500 mb-2 flex items-center gap-1">
                  <StickyNote className="h-4 w-4" />
                  Add Sticky Note
                </div>
                <p className="text-[10px] text-zinc-550 italic truncate mb-3">"{stickyInput.text}"</p>
                <textarea
                  placeholder="Type sticky comments here..."
                  className="w-full h-20 bg-zinc-955 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-yellow-500/50 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      saveStickyNote(e.currentTarget.value);
                    }
                  }}
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button onClick={() => setStickyInput(null)} className="px-2.5 py-1 text-[10px] text-zinc-500 font-bold hover:text-zinc-300 cursor-pointer">Cancel</button>
                  <button onClick={(e) => saveStickyNote((e.currentTarget.previousSibling as any).value)} className="px-3 py-1 bg-yellow-500 text-zinc-950 font-bold rounded-lg text-[10px] cursor-pointer">Save</button>
                </div>
              </div>
            )}

            {/* Selection floating toolbar */}
            {floatingSelection && (
              <div 
                style={{ left: floatingSelection.x, top: floatingSelection.y }}
                className="absolute z-50 transform -translate-x-1/2 flex items-center bg-zinc-900 border border-zinc-850 rounded-xl p-1 shadow-2xl space-x-1 text-[10px] font-bold text-zinc-300 select-none"
              >
                <button onClick={handleFloatAskAI} className="px-2.5 py-1 hover:bg-zinc-800 hover:text-white rounded flex items-center gap-1 cursor-pointer"><Brain className="h-3 w-3 text-violet-400" /> Explain</button>
                <div className="h-3.5 w-[1px] bg-zinc-850" />
                <button onClick={() => handleFloatHighlight('yellow')} className="px-1.5 py-1 hover:bg-zinc-800 rounded text-yellow-500 cursor-pointer"><Highlighter className="h-3 w-3" /></button>
                <button onClick={() => handleFloatHighlight('green')} className="px-1.5 py-1 hover:bg-zinc-800 rounded text-emerald-500 cursor-pointer"><Highlighter className="h-3 w-3" /></button>
                <button onClick={() => handleFloatHighlight('blue')} className="px-1.5 py-1 hover:bg-zinc-800 rounded text-blue-500 cursor-pointer"><Highlighter className="h-3 w-3" /></button>
                <button onClick={handleFloatUnderline} className="px-1.5 py-1 hover:bg-zinc-800 rounded text-violet-400 cursor-pointer"><Underline className="h-3 w-3" /></button>
                <button onClick={handleFloatSticky} className="px-1.5 py-1 hover:bg-zinc-800 rounded text-yellow-500 cursor-pointer"><StickyNote className="h-3 w-3" /></button>
                <div className="h-3.5 w-[1px] bg-zinc-850" />
                <button onClick={handleFloatSaveNote} className="px-2 py-1 hover:bg-zinc-800 rounded text-zinc-300 flex items-center gap-1 cursor-pointer"><Plus className="h-3 w-3" /> Save Note</button>
                <button onClick={handleFloatFlashcards} className="px-2 py-1 hover:bg-zinc-800 rounded text-zinc-300 flex items-center gap-1 cursor-pointer"><Plus className="h-3 w-3 text-violet-400" /> Cards</button>
              </div>
            )}

            {/* Main scrollable text reader container */}
            <div 
              ref={readerContainerRef}
              className="flex-1 overflow-y-auto p-8 flex justify-center"
            >
              <div 
                style={{ width: `${zoomLevel}%`, maxWidth: '105%' }}
                className="bg-zinc-900/10 border border-zinc-800/40 rounded-3xl p-8 min-h-[500px] shadow-2xl relative select-text"
              >
                {/* Inline bookmarks check */}
                {previewMode === 'text' && bookmarks.includes(currentPage) && (
                  <div className="absolute top-0 right-8 -mt-1 text-violet-500">
                    <BookmarkCheck className="h-8 w-8 fill-violet-500/20" />
                  </div>
                )}
                
                {previewMode === 'visual' ? (
                  <div className="w-full h-full flex flex-col justify-start min-h-[480px]">
                    {activeDoc.mimeType === 'application/pdf' ? (
                      <div className="w-full h-[620px] rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-900">
                        <iframe
                          src={`${activeDoc.fileUrl}#page=${currentPage}`}
                          className="w-full h-full"
                          style={{ border: 'none' }}
                        />
                      </div>
                    ) : activeDoc.mimeType.startsWith('image/') ? (
                      <div className="w-full flex justify-center items-center py-6 bg-zinc-900/10 border border-zinc-900 rounded-2xl min-h-[450px]">
                        <img
                          src={activeDoc.fileUrl}
                          className="max-w-full max-h-[550px] object-contain rounded-xl shadow-2xl"
                          alt={activeDoc.name}
                        />
                      </div>
                    ) : activeDoc.mimeType === 'text/markdown' ? (
                      <div className="prose prose-invert prose-xs text-zinc-350 max-w-none text-left leading-relaxed whitespace-pre-wrap select-text px-2">
                        <ReactMarkdown>{activePageText || ''}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="text-zinc-300 text-xs leading-relaxed font-sans whitespace-pre-wrap select-text text-left px-2">
                        {activePageText}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="font-semibold text-[10px] text-zinc-600 uppercase tracking-widest mb-6 select-none">Page {currentPage}</div>
                    <p className="text-zinc-300 text-xs leading-relaxed font-sans whitespace-pre-wrap select-text text-left leading-relaxed">
                      {renderPageText(activePageText)}
                    </p>
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 select-none text-zinc-500">
            <BookOpen className="h-16 w-16 stroke-[1.25] text-zinc-700 mb-2" />
            <h3 className="text-sm font-bold text-foreground">No Document Selected</h3>
            <p className="text-[11px] text-muted-foreground max-w-xs mt-1 leading-normal">
              Select an uploaded file from the library workspace list on the left to start viewing, highlighting, and analyzing.
            </p>
          </div>
        )}
      </div>

      {/* 3. RIGHT PANEL: ASSISTANT SIDEBAR */}
      {activeDoc && (
        <div className="w-96 border-l border-zinc-900 bg-zinc-950/20 flex flex-col h-full shrink-0">
          
          {/* Header tabs */}
          <div className="flex border-b border-zinc-900 bg-zinc-950/40 shrink-0">
            {[
              { id: 'chat', label: 'Document Chat', icon: Brain },
              { id: 'actions', label: 'Study Tools', icon: Sparkles },
              { id: 'highlights', label: 'Annotations', icon: BookMarked },
              { id: 'graph', label: 'Concept Graph', icon: Compass }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider flex flex-col items-center gap-1 transition-colors cursor-pointer border-b ${
                    activeTab === tab.id 
                      ? 'border-violet-500 text-violet-400 bg-zinc-900/30' 
                      : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label.split(' ')[1] || tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab content log wrapper */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col min-h-0">
            
            {/* Tab 1: AI Chat */}
            {activeTab === 'chat' && (
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto space-y-4 pr-1.5 min-h-[300px]">
                  {activeDoc.vectors.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-amber-500/80 p-6">
                      <Loader2 className="h-8 w-8 animate-spin text-amber-500 mb-2" />
                      <h4 className="text-xs font-bold text-zinc-300">Document Indexing in Progress</h4>
                      <p className="text-[10px] text-zinc-500 leading-normal max-w-[200px] mt-1">
                        AI grounded chat, active recall cards, and syllabus analysis will be available once indexing is complete.
                      </p>
                    </div>
                  ) : chatLog.length === 0 ? (
                    <div className="h-full flex flex-col items-start gap-4 p-4 text-left select-none">
                      <div className="flex items-center gap-2 text-violet-400">
                        <Brain className="h-5 w-5 animate-pulse" />
                        <span className="text-xs font-bold uppercase tracking-wider">AI Tutor Ready</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Ask questions grounded in the contents of **{activeDoc.name}**. Citations and page references will be automatically appended.
                      </p>
                      
                      {/* Document Executive Summary Panel */}
                      {activeDoc.summary ? (
                        <div className="w-full bg-zinc-900/40 border border-zinc-850 rounded-2xl p-4 space-y-2 select-text">
                          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-zinc-800 pb-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-yellow-500" />
                            Document Executive Summary
                          </div>
                          <div className="prose prose-invert prose-xs text-zinc-350 leading-relaxed max-w-none text-left">
                            <ReactMarkdown>{activeDoc.summary}</ReactMarkdown>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full bg-zinc-900/20 border border-dashed border-zinc-800 rounded-2xl p-4 text-center">
                          <p className="text-[10px] text-zinc-600 italic">No summary generated yet. Select the "Study Tools" tab and run "Summarize Document" to create an executive summary.</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    chatLog.map((msg, idx) => (
                      <div 
                        key={idx}
                        className={`p-3.5 rounded-2xl border text-xs leading-relaxed max-w-[90%] ${
                          msg.role === 'user'
                            ? 'ml-auto bg-violet-600/10 border-violet-500/20 text-zinc-200 text-right'
                            : 'bg-zinc-900/50 border-zinc-800/40 text-zinc-300 text-left'
                        }`}
                      >
                        <div className="font-bold text-[9px] text-zinc-500 uppercase tracking-widest mb-1.5">
                          {msg.role === 'user' ? 'Student' : 'AI Tutor'}
                        </div>
                        <div className="whitespace-pre-wrap">{msg.content}</div>
 
                        {msg.role === 'assistant' && msg.citations && msg.citations.length > 0 && (
                          <div className="mt-3 border-t border-zinc-800/60 pt-2 space-y-1">
                            <span className="text-[9px] font-bold text-zinc-550 block">Cited Sources:</span>
                            <div className="flex flex-wrap gap-1">
                              {msg.citations.map((cite, cIdx) => (
                                <button
                                  key={cIdx}
                                  onClick={() => handlePageChange(cite.pageNumber)}
                                  className="bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded text-[9px] text-violet-400 font-semibold flex items-center gap-1 cursor-pointer transition"
                                >
                                  <span>Page {cite.pageNumber}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  {chatLoading && (
                    <div className="bg-zinc-900/30 border border-zinc-850 p-4 rounded-2xl max-w-[90%] flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-500" />
                      <span className="text-zinc-550 text-[10px] animate-pulse font-semibold">Consulting pages...</span>
                    </div>
                  )}
                </div>
 
                {/* Chat Input form */}
                <form onSubmit={handleAskQuestion} className="mt-4 flex gap-2 shrink-0">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={activeDoc.vectors.length === 0}
                    placeholder={activeDoc.vectors.length === 0 ? "Indexing... Chat disabled" : "Ask questions about this doc..."}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 outline-none focus:border-violet-600/50 disabled:opacity-55"
                  />
                  <button 
                    type="button" 
                    onClick={handleClearChat}
                    disabled={activeDoc.vectors.length === 0}
                    title="Clear history"
                    className="px-2.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition cursor-pointer disabled:opacity-55"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="submit"
                    disabled={chatLoading || !chatInput.trim() || activeDoc.vectors.length === 0}
                    className="bg-violet-600 hover:bg-violet-555 text-white font-bold px-3.5 rounded-xl flex items-center justify-center cursor-pointer transition disabled:opacity-40"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            )}

            {/* Tab 2: Study Actions */}
            {activeTab === 'actions' && (
              <div className="space-y-4">
                {actionOutput ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <h4 className="text-xs font-bold text-violet-400">{actionTitle}</h4>
                      <div className="flex gap-1.5">
                        <button
                          onClick={saveActionAsNote}
                          className="px-2 py-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded text-[9px] font-bold text-zinc-300 flex items-center gap-1 transition cursor-pointer"
                        >
                          <Plus className="h-3 w-3" /> Save Note
                        </button>
                        <button
                          onClick={() => setActionOutput(null)}
                          className="px-2 py-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded text-[9px] font-bold text-zinc-500 hover:text-zinc-350 transition cursor-pointer"
                        >
                          Reset
                        </button>
                      </div>
                    </div>

                    <div className="prose prose-invert prose-xs text-zinc-350 max-w-none text-left leading-relaxed whitespace-pre-wrap select-text">
                      <ReactMarkdown>{actionOutput}</ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-left">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Select Study Operation</div>
                    {[
                      { id: 'summary', label: 'Summarize Document', desc: 'Create structured summaries.' },
                      { id: 'concepts', label: 'Core Key Concepts', desc: 'Identify central syllabus terms.' },
                      { id: 'definitions', label: 'Technical Definitions', desc: 'List glossary technical definitions.' },
                      { id: 'exam', label: 'Generate Study Notes', desc: 'Detailed revision layouts.' },
                      { id: 'revision', label: 'Last Minute Revision', desc: 'Flashcard bullet cheat-sheet summaries.' },
                      { id: 'mnemonics', label: 'Mnemonics & Tricks', desc: 'Acronyms and memory aids.' },
                      { id: 'topics', label: 'Find Key Topics', desc: 'Syllabus division analysis.' },
                      { id: 'flashcards', label: 'Generate AI Flashcards', desc: 'Create active recall cards from document.' },
                      { id: 'quiz', label: 'Generate AI Quiz', desc: 'Generate a 5-question multiple choice quiz.' }
                    ].map((act) => (
                      <button
                        key={act.id}
                        onClick={() => handleTriggerAction(act.id)}
                        disabled={actionLoading}
                        className="w-full p-3 bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-800 rounded-2xl text-left cursor-pointer transition flex items-start justify-between gap-3 disabled:opacity-40"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-semibold text-zinc-300 leading-normal">{act.label}</span>
                          <span className="text-[10px] text-zinc-500 leading-normal">{act.desc}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-zinc-650 mt-1 shrink-0" />
                      </button>
                    ))}
                    {actionLoading && (
                      <div className="flex items-center justify-center gap-2 py-6 bg-zinc-900/20 border border-zinc-850 rounded-2xl">
                        <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                        <span className="text-xs text-zinc-500 animate-pulse font-semibold">Generating Academic Guide...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Highlights Annotations list */}
            {activeTab === 'highlights' && (
              <div className="space-y-4 text-left">
                {/* Bookmarked pages */}
                <div className="space-y-2">
                  <div className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest border-b border-zinc-900 pb-1 flex items-center gap-1.5">
                    <Bookmark className="h-3.5 w-3.5 text-violet-400" />
                    Bookmarked Pages
                  </div>
                  {bookmarks.length === 0 ? (
                    <div className="text-[10px] text-zinc-650 italic">No bookmarks on pages.</div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {bookmarks.map((p) => (
                        <button
                          key={p}
                          onClick={() => handlePageChange(p)}
                          className="px-2.5 py-1 bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/20 text-violet-400 text-[10px] font-bold rounded-lg cursor-pointer transition"
                        >
                          Page {p}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Highlights and Sticky annotation lists */}
                <div className="space-y-2 pt-2">
                  <div className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest border-b border-zinc-900 pb-1 flex items-center gap-1.5">
                    <Highlighter className="h-3.5 w-3.5 text-yellow-500" />
                    Highlights & Sticky Notes
                  </div>
                  {annotations.length === 0 ? (
                    <div className="text-[10px] text-zinc-650 italic">No text selections highlighted yet.</div>
                  ) : (
                    <div className="space-y-1.5">
                      {annotations.map((ann) => (
                        <div
                          key={ann.id}
                          className="p-3 bg-zinc-900/30 border border-zinc-850 hover:border-zinc-800 rounded-xl text-xs space-y-1.5 group relative text-left"
                        >
                          <div className="flex items-center justify-between text-[9px] font-bold text-zinc-500 uppercase">
                            <span 
                              onClick={() => handlePageChange(ann.pageNumber)}
                              className="text-violet-400 hover:underline cursor-pointer"
                            >
                              Page {ann.pageNumber} • {ann.type}
                            </span>
                            <button
                              onClick={() => handleDeleteAnnotation(ann.id)}
                              className="p-1 hover:bg-zinc-850 text-zinc-500 hover:text-red-400 rounded transition cursor-pointer"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                          <p className="text-[11px] text-zinc-350 italic truncate">"{ann.text}"</p>
                          {ann.note && (
                            <div className="bg-yellow-500/5 border-l border-yellow-500 px-2.5 py-1 text-[10px] text-zinc-400 italic">
                              {ann.note}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 4: AI Concept Relationships Graph */}
            {activeTab === 'graph' && (
              <div className="space-y-4 text-left">
                <div className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest border-b border-zinc-900 pb-1.5 flex items-center gap-1.5">
                  <Compass className="h-3.5 w-3.5 text-violet-400" />
                  Knowledge Entity Graph
                </div>
                
                {/* SVG Knowledge Graph */}
                <div className="p-3 bg-zinc-950/60 border border-zinc-900 rounded-2xl flex items-center justify-center min-h-[220px]">
                  <svg className="w-full h-48" viewBox="0 0 200 200">
                    {/* Node lines */}
                    <line x1="100" y1="100" x2="50" y2="60" stroke="#374151" strokeWidth="1" />
                    <line x1="100" y1="100" x2="150" y2="60" stroke="#374151" strokeWidth="1" />
                    <line x1="100" y1="100" x2="100" y2="150" stroke="#374151" strokeWidth="1" />
                    
                    {/* Core Document Node */}
                    <circle cx="100" cy="100" r="16" className="fill-violet-600/80 stroke-violet-400 stroke-[1.5] cursor-pointer hover:r-18 transition" />
                    <text x="100" y="103" className="fill-white text-[8px] font-black text-center" textAnchor="middle">Core</text>
                    
                    {/* Sub Nodes */}
                    <circle cx="50" cy="60" r="12" className="fill-zinc-900 stroke-zinc-700 stroke-1 cursor-pointer" />
                    <text x="50" y="62" className="fill-zinc-300 text-[6px] font-bold" textAnchor="middle">Topic A</text>

                    <circle cx="150" cy="60" r="12" className="fill-zinc-900 stroke-zinc-700 stroke-1 cursor-pointer" />
                    <text x="150" y="62" className="fill-zinc-300 text-[6px] font-bold" textAnchor="middle">Topic B</text>

                    <circle cx="100" cy="150" r="12" className="fill-zinc-900 stroke-zinc-700 stroke-1 cursor-pointer" />
                    <text x="100" y="152" className="fill-zinc-300 text-[6px] font-bold" textAnchor="middle">Glossary</text>
                  </svg>
                </div>
                <p className="text-[10px] text-zinc-500 leading-relaxed font-semibold">
                  This interactive entity map visually connects extracted core concepts with corresponding definitions and citations inside the document pages.
                </p>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-850 rounded-2xl p-6 max-w-sm w-full shadow-2xl flex flex-col gap-4">
            <div className="text-xs font-bold text-rose-500 uppercase tracking-widest flex items-center gap-1.5">
              <Trash2 className="h-4 w-4" />
              Confirm Delete
            </div>
            <p className="text-xs text-zinc-400 leading-normal">
              Are you sure you want to delete this document? This action is permanent and will remove the file from database, storage, and all associated AI representations.
            </p>
            <div className="flex justify-end gap-2.5 mt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-550 text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
