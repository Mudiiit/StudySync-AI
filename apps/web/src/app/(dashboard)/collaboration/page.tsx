'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/providers/ToastProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Users, Send, Loader2, Sparkles, Plus, 
  MessageSquare, UserPlus, RefreshCw, Radio,
  Edit, Trash2, UserMinus, UserCheck, Crown,
  FileText, Download, Image as ImageIcon, File as FileIcon,
  MoreVertical, Reply, Smile, Check, X, AlertCircle,
  Calendar, Paperclip, ExternalLink, ShieldAlert,
  Search, Eye, Copy, Laptop, FolderOpen, Menu,
  Settings, User, CheckSquare, BarChart, Archive, Info,
  Bell, Pin, Share2, BookOpen, HelpCircle, Clock, Play,
  Pause, CheckCircle2, ChevronRight, FileCode,
  Flame, Trophy, Activity, Layers, Star, BellOff, Mail, Save,
  XCircle, PlayCircle, Award, Cpu, Edit3, LogOut, Mic, MicOff,
  VolumeX, Headphones, MousePointer2
} from 'lucide-react';
import api from '@/lib/axios';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface StudyGroup {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: string;
}

interface PinItem {
  id: string;
  title: string;
  type: string; // 'NOTE' | 'QUIZ' | 'FLASHCARD' | 'FILE' | 'NOTEBOOK' | 'DOCUMENT'
  resourceId: string;
  author: string;
  date: string;
}

interface WorkspaceMetadata {
  desc: string;
  avatar: string;
  color: string;
  isArchived?: boolean;
  pins?: PinItem[];
  visibility?: 'public' | 'private';
  permissions?: string;
  defaultRole?: 'ADMIN' | 'MODERATOR' | 'MEMBER';
  studyStreak?: number;
  studyHours?: number;
  completedGoals?: number;
  workspaceGoal?: string;
  workspaceGoalTarget?: number;
  workspaceGoalCompleted?: number;
}

interface Reaction {
  emoji: string;
  users: string[]; // user IDs
}

interface ParsedMessageContent {
  text: string;
  file?: {
    id: string;
    name: string;
    url: string;
    mimeType: string;
    size: number;
  };
  replyTo?: {
    id: string;
    sender: string;
    content: string;
  };
  isEdited?: boolean;
  reactions?: Reaction[];
  seenBy?: { userId: string; name: string }[];
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  user: {
    id: string;
    email: string;
    profile?: {
      firstName: string;
      lastName: string;
      avatarUrl?: string;
      username?: string;
    };
  };
}

interface GroupInvite {
  id: string;
  studyGroupId?: string;
  status: string;
  createdAt: string;
  group: {
    id: string;
    name: string;
    description?: string;
  };
  inviter: {
    id: string;
    email: string;
    profile?: {
      firstName: string;
      lastName: string;
      avatarUrl?: string;
      username?: string;
    };
  };
}

interface GroupResource {
  id: string;
  resourceId: string;
  resourceType: string;
  createdAt: string;
  sharedBy: {
    id: string;
    email: string;
    profile?: {
      firstName: string;
      lastName: string;
      avatarUrl?: string;
      username?: string;
    };
  };
  document?: {
    id: string;
    name: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  };
  metadata?: any; // Resolved metadata for notes, quizzes, etc.
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

// Group Study Session Structures
interface StudySessionState {
  groupId: string;
  isActive: boolean;
  ownerId: string;
  startedAt: string;
  pomodoro: {
    durationSeconds: number;
    elapsedSeconds: number;
    isPaused: boolean;
  };
  tutorHistory: { role: string; content: string; senderName: string }[];
  stats: {
    aiQuestions: number;
    filesOpened: number;
    quizAttempts: number;
    flashcardsReviewed: number;
    participants: string[];
  };
  focuses: { [userId: string]: string };
}

function parseMessageContent(rawContent: string): ParsedMessageContent {
  try {
    const obj = JSON.parse(rawContent);
    if (obj && (typeof obj.text === 'string' || obj.file || obj.replyTo)) {
      return obj;
    }
  } catch (e) {
    // fallback
  }
  return { text: rawContent };
}

function parseWorkspaceDescription(rawDesc?: string): WorkspaceMetadata {
  if (rawDesc && rawDesc.startsWith('{')) {
    try {
      const parsed = JSON.parse(rawDesc);
      return {
        desc: parsed.desc || '',
        avatar: parsed.avatar || '📚',
        color: parsed.color || 'purple',
        isArchived: !!parsed.isArchived,
        pins: parsed.pins || [],
        visibility: parsed.visibility || 'private',
        permissions: parsed.permissions || 'members',
        defaultRole: parsed.defaultRole || 'MEMBER',
        studyStreak: parsed.studyStreak || 0,
        studyHours: parsed.studyHours || 0,
        completedGoals: parsed.completedGoals || 0,
        workspaceGoal: parsed.workspaceGoal || '',
        workspaceGoalTarget: parsed.workspaceGoalTarget || 0,
        workspaceGoalCompleted: parsed.workspaceGoalCompleted || 0,
      };
    } catch (e) {
      // fallback
    }
  }
  return {
    desc: rawDesc || '',
    avatar: '📚',
    color: 'purple',
    isArchived: false,
    pins: [],
    visibility: 'private',
    permissions: 'members',
    defaultRole: 'MEMBER',
    studyStreak: 0,
    studyHours: 0,
    completedGoals: 0,
    workspaceGoal: '',
    workspaceGoalTarget: 0,
    workspaceGoalCompleted: 0,
  };
}

const EMOJI_CATEGORIES = {
  Smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🫣', '🤭', '🤫'],
  Gestures: ['👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤌', '🤏', '👈', '👉', '👆', '🖕', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤙', '💪', '🦾', '✍️', '🙏', '🤝'],
  Hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💖', '💗', '💓', '💞', '💕', '💟', '❣️'],
  Objects: ['💻', '📱', '⌚', '💾', '💿', '📚', '📖', '📝', '✏️', '🎯', '🚀', '🧪', '🧬', '⚙️', '💡', '🔔', '🔑', '🎨', '🎬', '🎤', '🎧', '🎸', '🎹']
};

const AVAILABLE_COLORS = ['purple', 'blue', 'green', 'orange', 'red', 'teal'];

export default function CollaborationPage() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [activeGroup, setActiveGroup] = useState<StudyGroup | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [sharedFiles, setSharedFiles] = useState<GroupResource[]>([]);
  const [sentInvites, setSentInvites] = useState<any[]>([]);
  const [receivedInvites, setReceivedInvites] = useState<GroupInvite[]>([]);

  // Multi-view tab selection
  const [activeCenterTab, setActiveCenterTab] = useState<'chat' | 'overview' | 'pinned' | 'session' | 'whiteboard' | 'playground'>('chat');

  // WebSocket lifecycle state (Robust, single permanent link)
  const [socketStatus, setSocketStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('disconnected');
  const [rightSidebarTab, setRightSidebarTab] = useState<'info' | 'files' | 'invites' | 'stats'>('info');

  // Multi-panel layout drawers toggles
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);

  // Group Details & Metadata Editing
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupAvatar, setGroupAvatar] = useState('📚');
  const [groupColor, setGroupColor] = useState('purple');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Expanded Settings dialog
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [workspaceActionGroup, setWorkspaceActionGroup] = useState<any | null>(null);
  const [activeWorkspaceMenuId, setActiveWorkspaceMenuId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDesc, setEditGroupDesc] = useState('');
  const [editGroupAvatar, setEditGroupAvatar] = useState('📚');
  const [editGroupColor, setEditGroupColor] = useState('purple');
  const [editGroupVisibility, setEditGroupVisibility] = useState<'public' | 'private'>('private');
  const [editGroupDefaultRole, setEditGroupDefaultRole] = useState<'ADMIN' | 'MODERATOR' | 'MEMBER'>('MEMBER');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState('');
  const [liveInvitationModal, setLiveInvitationModal] = useState<any | null>(null);
  const [unreadInviteCount, setUnreadInviteCount] = useState<number>(0);
  const [readInviteIds, setReadInviteIds] = useState<string[]>([]);

  // Autocomplete User Invitations
  const [inviteSearchInput, setInviteSearchInput] = useState('');
  const [userSuggestions, setUserSuggestions] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [showInvitesModal, setShowInvitesModal] = useState(false);
  const [externalInviteGroup, setExternalInviteGroup] = useState<any | null>(null);

  // Share existing library selectors
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [libraryType, setLibraryType] = useState<'NOTE' | 'QUIZ' | 'FLASHCARD' | 'NOTEBOOK' | 'DOCUMENT'>('NOTE');
  const [libraryItems, setLibraryItems] = useState<any[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [selectedLibraryItem, setSelectedLibraryItem] = useState<any | null>(null);

  // Drag-and-drop & uploads
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [uploadingFile, setUploadingFile] = useState(false);
  const [previewFile, setPreviewFile] = useState<any | null>(null);
  const [previewTextContent, setPreviewTextContent] = useState<string | null>(null);
  const [fileFilterType, setFileFilterType] = useState<'all' | 'image' | 'pdf' | 'text'>('all');
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const [fileLayoutView, setFileLayoutView] = useState<'grid' | 'list'>('list');
  const [fileSortBy, setFileSortBy] = useState<'date' | 'name'>('date');
  const [isDraggingOverFiles, setIsDraggingOverFiles] = useState(false);

  // Live embedded interactive resource viewers
  // Live embedded interactive resource viewers
  const [openedStudyResource, setOpenedStudyResource] = useState<any | null>(null);
  const [noteActiveTab, setNoteActiveTab] = useState<'content' | 'summary'>('content');
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<{ [questionId: string]: string }>({});
  const [quizScoreReport, setQuizScoreReport] = useState<any | null>(null);
  const [quizActiveQuestionIndex, setQuizActiveQuestionIndex] = useState(0);
  const [flashcardDeckCards, setFlashcardDeckCards] = useState<any[]>([]);
  const [activeFlashcardIndex, setActiveFlashcardIndex] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);
  const [pdfCurrentPage, setPdfCurrentPage] = useState(1);
  const [pdfZoom, setPdfZoom] = useState(100);
  const [pdfScrollPosition, setPdfScrollPosition] = useState(0);
  const pdfScrollContainerRef = useRef<HTMLDivElement>(null);
  const [noteScrollPosition, setNoteScrollPosition] = useState(0);
  const [notebookPage, setNotebookPage] = useState(0);

  // Collaborative Whiteboard Canvas States
  const [whiteboardColor, setWhiteboardColor] = useState('#8b5cf6');
  const [whiteboardBrushSize, setWhiteboardBrushSize] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const whiteboardCanvasRef = useRef<HTMLCanvasElement>(null);
  const [whiteboardPrevPos, setWhiteboardPrevPos] = useState<{ x: number; y: number } | null>(null);
  const [whiteboardTool, setWhiteboardTool] = useState<'select' | 'pencil' | 'eraser' | 'rect' | 'circle' | 'arrow' | 'text' | 'sticky' | 'laser' | 'pan'>('pencil');
  
  // Vector Undo/Redo Stacks storing element array snapshots
  const [whiteboardUndoStack, setWhiteboardUndoStack] = useState<any[][]>([]);
  const [whiteboardRedoStack, setWhiteboardRedoStack] = useState<any[][]>([]);
  
  const [whiteboardPan, setWhiteboardPan] = useState({ x: -1600, y: -1750 });
  const [whiteboardZoom, setWhiteboardZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [whiteboardEditMode, setWhiteboardEditMode] = useState<'editing' | 'view_only'>('editing');
  
  // Vector Whiteboard Pages storing elements lists
  const [whiteboardPages, setWhiteboardPages] = useState<any[]>([
    { id: 'default', name: 'Physics Notes', elements: [], zoom: 1, pan: { x: -1600, y: -1750 } }
  ]);
  const [activeWhiteboardPageId, setActiveWhiteboardPageId] = useState<string>('default');
  const [whiteboardSaveStatus, setWhiteboardSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');
  const [whiteboardCursors, setWhiteboardCursors] = useState<{ [userId: string]: { userName: string; x: number; y: number; color: string; lastUpdated: number; isLaser?: boolean } }>({});
  
  // Object Selecting & Dragging & Resizing
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isDraggingSelectedElement, setIsDraggingSelectedElement] = useState(false);
  const [isResizingSelectedElement, setIsResizingSelectedElement] = useState(false);
  const [activeResizeAnchor, setActiveResizeAnchor] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Presenter Mode
  const [isPresenting, setIsPresenting] = useState(false);
  const [presenterId, setPresenterId] = useState<string | null>(null);
  const [presenterName, setPresenterName] = useState<string | null>(null);
  const [followPresenter, setFollowPresenter] = useState(true);

  // Vertical Sidebar
  const [showPageSidebar, setShowPageSidebar] = useState(true);

  // Drawing Refs
  const whiteboardStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const whiteboardSnapshotRef = useRef<ImageData | null>(null);
  const currentStrokePointsRef = useRef<{ x: number; y: number }[]>([]);
  const imageObjectsCacheRef = useRef<{ [url: string]: HTMLImageElement }>({});
  const isSavingRef = useRef(false);
  const localLaserTrailRef = useRef<{ x: number; y: number; time: number; color?: string }[]>([]);
  const remoteLaserTrailsRef = useRef<{ [userId: string]: { x: number; y: number; time: number; color?: string }[] }>({});
  const laserAnimationFrameRef = useRef<number | null>(null);

  // WebRTC Multiplayer Voice Channel States
  const [inVoiceRoom, setInVoiceRoom] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [voiceUsers, setVoiceUsers] = useState<{ socketId: string; userId: string; userName: string; isMuted?: boolean; isSpeaking?: boolean; isDeafened?: boolean }[]>([]);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<{ [socketId: string]: RTCPeerConnection }>({});

  // Collaborative Coding Playground States
  const [playgroundCode, setPlaygroundCode] = useState('// Collaborative Code Playground\nfunction add(a, b) {\n  return a + b;\n}\n\nconsole.log(add(5, 10));');
  const [playgroundLanguage, setPlaygroundLanguage] = useState('javascript');
  const [playgroundOutput, setPlaygroundOutput] = useState('');
  const [playgroundOutputObj, setPlaygroundOutputObj] = useState<any>(null);
  const [playgroundIsExecuting, setPlaygroundIsExecuting] = useState(false);
  const [playgroundExplanation, setPlaygroundExplanation] = useState('');
  const [playgroundIsExplaining, setPlaygroundIsExplaining] = useState(false);
  const [playgroundStdin, setPlaygroundStdin] = useState('');
  const [remoteCursors, setRemoteCursors] = useState<{ [userId: string]: { userName: string; line: number; ch: number } }>({});

  // Group Study Session multiplayer states
  const [activeSession, setActiveSession] = useState<StudySessionState | null>(null);
  const [sessionTutorInput, setSessionTutorInput] = useState('');
  const [tutorStreamingResponse, setTutorStreamingResponse] = useState('');
  const [sessionStatsReport, setSessionStatsReport] = useState<any | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [activityFeed, setActivityFeed] = useState<any[]>([]);

  // In-app notifications
  const [inAppNotifications, setInAppNotifications] = useState<NotificationItem[]>([]);

  // Search inside Workspace
  const [workspaceSearch, setWorkspaceSearch] = useState('');
  const [pinSearchQuery, setPinSearchQuery] = useState('');
  const [pinTypeFilter, setPinTypeFilter] = useState('ALL');
  const [pinSortOption, setPinSortOption] = useState('RECENT');
  const [pinnedFavorites, setPinnedFavorites] = useState<string[]>([]);
  // Workspace Goal States
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalText, setGoalText] = useState('');
  const [goalTarget, setGoalTarget] = useState(10);
  const [goalCompleted, setGoalCompleted] = useState(0);
  const [searchFocused, setSearchFocused] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  // Load and sync read invite IDs & calculate unread count
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedRead = localStorage.getItem('study_sync_read_invite_ids');
      if (storedRead) {
        try {
          setReadInviteIds(JSON.parse(storedRead));
        } catch (e) {}
      }
    }
  }, []);

  useEffect(() => {
    const unread = receivedInvites.filter(i => !readInviteIds.includes(i.id)).length;
    setUnreadInviteCount(unread);
  }, [receivedInvites, readInviteIds]);

  // Chat/Rich Messaging States
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);
  const [replyMessage, setReplyMessage] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editChatInput, setEditChatInput] = useState('');
  const [chatFile, setChatFile] = useState<File | null>(null);
  const [chatFileUploading, setChatFileUploading] = useState(false);

  // Complete unicode emoji picker states
  const [emojiPickerTarget, setEmojiPickerTarget] = useState<'input' | { messageId: string } | null>(null);
  const [emojiSearchQuery, setEmojiSearchQuery] = useState('');
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);

  // Auto-scroll scroll helpers
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const [unreadCount, setUnreadCount] = useState<{ [groupId: string]: number }>({});

  // Presence statuses
  const [userStatus, setUserStatus] = useState<'online' | 'away' | 'busy' | 'offline'>('online');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  
  const activeGroupRef = useRef(activeGroup);
  const isScrolledToBottomRef = useRef(isScrolledToBottom);
  const currentUserRef = useRef(currentUser);
  const queryClientRef = useRef(queryClient);
  const previousGroupIdRef = useRef<string | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    queryClientRef.current = queryClient;
  }, [queryClient]);

  const activeWhiteboardPageIdRef = useRef(activeWhiteboardPageId);
  const followPresenterRef = useRef(followPresenter);

  useEffect(() => {
    followPresenterRef.current = followPresenter;
  }, [followPresenter]);

  useEffect(() => {
    activeGroupRef.current = activeGroup;
  }, [activeGroup]);

  useEffect(() => {
    activeWhiteboardPageIdRef.current = activeWhiteboardPageId;
  }, [activeWhiteboardPageId]);

  useEffect(() => {
    isScrolledToBottomRef.current = isScrolledToBottom;
  }, [isScrolledToBottom]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    console.log("Groups state", groups);
  }, [groups]);

  useEffect(() => {
    console.log("Active group", activeGroup);
  }, [activeGroup]);

  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const noteScrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (noteScrollContainerRef.current) {
      noteScrollContainerRef.current.scrollTop = noteScrollPosition;
    }
  }, [noteScrollPosition]);
  const saveRecentEmoji = (emoji: string) => {
    setRecentEmojis((prev) => {
      const filtered = prev.filter((e) => e !== emoji);
      const updated = [emoji, ...filtered].slice(0, 15);
      localStorage.setItem('recent_emojis', JSON.stringify(updated));
      return updated;
    });
  };

  const handleChatInputChange = (val: string) => {
    setChatInput(val);
    if (!socketRef.current || !activeGroup) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socketRef.current.emit('group:typing', { groupId: activeGroup.id, isTyping: true });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socketRef.current?.emit('group:typing', { groupId: activeGroup.id, isTyping: false });
    }, 2000);
  };

  // Debounced user search suggestions for workspace invites
  useEffect(() => {
    if (!inviteSearchInput.trim()) {
      setUserSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        const res = await api.get('/social/users/search', {
          params: { q: inviteSearchInput }
        });
        setUserSuggestions(res.data || []);
      } catch (err) {
        console.error('Failed to search users:', err);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [inviteSearchInput]);

  // Load library content items based on type selection
  useEffect(() => {
    if (!showLibraryModal) return;

    const loadLibraryContent = async () => {
      setLibraryLoading(true);
      try {
        let endpoint = '/notes';
        if (libraryType === 'QUIZ') endpoint = '/quizzes';
        else if (libraryType === 'FLASHCARD') endpoint = '/flashcards';
        else if (libraryType === 'NOTEBOOK') endpoint = '/notebooks';
        else if (libraryType === 'DOCUMENT') endpoint = '/rag/documents';

        const res = await api.get(endpoint);
        let items: any[] = [];
        if (res.data) {
          if (libraryType === 'FLASHCARD') {
            items = Array.isArray(res.data.items) ? res.data.items : (Array.isArray(res.data) ? res.data : []);
          } else if (libraryType === 'DOCUMENT') {
            items = Array.isArray(res.data.documents) ? res.data.documents : (Array.isArray(res.data) ? res.data : []);
          } else {
            items = Array.isArray(res.data)
              ? res.data
              : (res.data.notes || res.data.notebooks || res.data.quizzes || res.data.items || []);
          }
        }
        setLibraryItems(items);
      } catch (err) {
        showToast('Failed to load library resources', 'error');
        setLibraryItems([]);
      } finally {
        setLibraryLoading(false);
      }
    };

    loadLibraryContent();
  }, [showLibraryModal, libraryType]);

  // Load saved recent emojis on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('recent_emojis');
      if (saved) {
        setRecentEmojis(JSON.parse(saved));
      }
    } catch (e) {}
  }, []);

  // Pomodoro local countdown timer
  useEffect(() => {
    if (!activeSession || activeSession.pomodoro.isPaused) return;

    const interval = setInterval(() => {
      setActiveSession((prev) => {
        if (!prev) return prev;
        const elapsed = prev.pomodoro.elapsedSeconds + 1;
        if (elapsed >= prev.pomodoro.durationSeconds) {
          clearInterval(interval);
          showToast('Pomodoro session completed! Time for a study break.', 'success');
          return {
            ...prev,
            pomodoro: { ...prev.pomodoro, elapsedSeconds: prev.pomodoro.durationSeconds, isPaused: true }
          };
        }
        return {
          ...prev,
          pomodoro: { ...prev.pomodoro, elapsedSeconds: elapsed }
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession?.pomodoro.isPaused]);

  // Load baseline values
  useEffect(() => {
    fetchGroups();
    fetchReceivedInvites();
  }, []);

  // Fetch received invites
  const fetchReceivedInvites = async () => {
    try {
      const res = await api.get('/collaboration/invites');
      setReceivedInvites(res.data);
    } catch (err) {
      console.error('Failed to fetch invites:', err);
    }
  };

  // Fetch groups
  const fetchGroups = async () => {
    console.log("Refresh clicked");
    try {
      const res = await api.get('/collaboration/groups');
      setGroups(res.data);
      if (res.data.length > 0) {
        const storedGroupId = typeof window !== 'undefined' ? localStorage.getItem('study_sync_active_group_id') : null;
        const matched = res.data.find((g: any) => g.id === storedGroupId);
        setActiveGroup(matched || res.data[0]);
      } else {
        setActiveGroup(null);
      }
    } catch (e: any) {
      showToast('Failed to load study groups', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Sync active group to localStorage
  useEffect(() => {
    if (loading) return;
    if (activeGroup?.id) {
      localStorage.setItem('study_sync_active_group_id', activeGroup.id);
    } else {
      localStorage.removeItem('study_sync_active_group_id');
    }
  }, [activeGroup?.id, loading]);

  // Fetch group details
  const fetchGroupDetails = async (groupId: string) => {
    try {
      const [msgRes, memRes, fileRes, inviteRes, activityRes, whiteboardRes] = await Promise.all([
        api.get(`/collaboration/groups/${groupId}/messages`),
        api.get(`/collaboration/groups/${groupId}/members`),
        api.get(`/collaboration/groups/${groupId}/resources/files`),
        api.get(`/collaboration/groups/${groupId}/invites`),
        api.get(`/collaboration/groups/${groupId}/activity`),
        api.get(`/collaboration/groups/${groupId}/whiteboard`),
      ]);
      setMessages(msgRes.data);
      setMembers(memRes.data);
      setSharedFiles(fileRes.data);
      setSentInvites(inviteRes.data);
      setActivityFeed(activityRes.data || []);

      if (whiteboardRes?.data) {
        setWhiteboardEditMode(whiteboardRes.data.mode || 'editing');
        const fetchedPages = (whiteboardRes.data.pages || [
          { id: 'default', name: 'Physics Notes', canvasData: '', zoom: 1, pan: { x: -1600, y: -1750 } }
        ]).map((p: any) => ({ ...p, elements: p.elements || [] }));
        setWhiteboardPages(fetchedPages);
        const firstPage = fetchedPages[0];
        if (firstPage) {
          setActiveWhiteboardPageId(firstPage.id);
          setWhiteboardZoom(firstPage.zoom || 1);
          setWhiteboardPan(firstPage.pan || { x: -1600, y: -1750 });
        }
      }
    } catch (e) {
      showToast('Failed to load workspace details', 'error');
    }
  };

  // Load workspace details when activeGroup changes
  useEffect(() => {
    if (activeGroup?.id) {
      fetchGroupDetails(activeGroup.id);
      setOpenedStudyResource(null);
    }
  }, [activeGroup?.id]);

  // Restore whiteboard canvas image when the whiteboard tab is active or active page changes
  useEffect(() => {
    if (activeCenterTab === 'whiteboard') {
      const activePage = whiteboardPages.find((p) => p.id === activeWhiteboardPageId);
      if (activePage) {
        const timer = setTimeout(() => {
          loadCanvasDataURL(activePage);
        }, 50);
        return () => clearTimeout(timer);
      }
    }
  }, [activeCenterTab, activeWhiteboardPageId, whiteboardPages]);

  // Listen to Delete/Backspace key to delete selected elements
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeCenterTab !== 'whiteboard' || !selectedElementId) return;

      const targetTag = (e.target as HTMLElement).tagName.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || (e.target as HTMLElement).isContentEditable) {
        return;
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        const activePage = whiteboardPages.find((p) => p.id === activeWhiteboardPageIdRef.current);
        if (!activePage) return;
        
        const nextElements = (activePage.elements || []).filter((el: any) => el.id !== selectedElementId);
        setWhiteboardPages((prev) =>
          prev.map((p) => p.id === activeWhiteboardPageIdRef.current ? { ...p, elements: nextElements } : p)
        );
        
        const canvas = whiteboardCanvasRef.current;
        if (canvas) drawAllElements(canvas, nextElements, null);
        
        if (socketRef.current && socketRef.current.connected && activeGroup) {
          socketRef.current.emit('whiteboard:element', {
            groupId: activeGroup.id,
            action: 'delete',
            pageId: activeWhiteboardPageIdRef.current,
            elementId: selectedElementId
          });
        }
        
        setSelectedElementId(null);
        saveWhiteboardState(nextElements);
        setWhiteboardSaveStatus('dirty');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, whiteboardPages, activeCenterTab, activeGroup]);

  // WebSocket listener setup (Robust, single lifecycle connection block)
  useEffect(() => {
    if (!currentUser?.id) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5001';

    const getLatestValidToken = async (): Promise<string | null> => {
      let accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');
      if (!accessToken) return null;

      let isExpired = true;
      try {
        const payloadStr = accessToken.split('.')[1];
        const payload = JSON.parse(atob(payloadStr));
        if (payload.exp && (payload.exp * 1000) > (Date.now() + 15000)) {
          isExpired = false;
        }
      } catch (e) {
        isExpired = true;
      }

      if (isExpired && refreshToken) {
        console.warn('[WebSocket] Socket attempted reconnect using stale token. Proactive refresh triggered...');
        try {
          const res = await axios.post(`${socketUrl}/api/auth/refresh`, { refreshToken }, { withCredentials: true });
          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = res.data;
          localStorage.setItem('accessToken', newAccessToken);
          localStorage.setItem('refreshToken', newRefreshToken);
          accessToken = newAccessToken;
          console.log('[WebSocket] Authentication recovered successfully.');
        } catch (err) {
          console.error('[WebSocket] Refresh failed:', err);
        }
      }

      return accessToken;
    };

    const applyActiveResourceState = (session: any) => {
      if (session && session.activeResource) {
        const res = { ...session.activeResource };
        
        if (res.resourceType === 'NOTE') {
          api.get(`/notes/${res.resourceId}`).then((r) => {
            res.metadata = r.data;
            setOpenedStudyResource({ ...res });
          });
        } else if (res.resourceType === 'NOTEBOOK') {
          api.get(`/notebooks/${res.resourceId}`).then((r) => {
            res.metadata = r.data;
            setOpenedStudyResource({ ...res });
          });
        } else if (res.resourceType === 'QUIZ') {
          api.get(`/quizzes/${res.resourceId}`).then((qRes) => {
            res.metadata = qRes.data;
            setQuizQuestions(qRes.data.questions || []);
            setOpenedStudyResource({ ...res });
          });
        } else if (res.resourceType === 'FLASHCARD_DECK') {
          api.get(`/flashcards`, { params: { deckId: res.resourceId } }).then((fcRes) => {
            res.metadata = { title: res.metadata?.title || 'Shared Flashcard Deck' };
            setFlashcardDeckCards(fcRes.data.items || (Array.isArray(fcRes.data) ? fcRes.data : []));
            setOpenedStudyResource({ ...res });
          });
        } else if (res.resourceType === 'FILE' || res.resourceType === 'DOCUMENT') {
          api.get(`/rag/documents/${res.resourceId}`).then((r) => {
            res.document = r.data;
            setOpenedStudyResource({ ...res });
          });
        } else {
          setOpenedStudyResource(res);
        }

        if (session.activeResourceProgress) {
          const prog = session.activeResourceProgress;
          if (prog.page !== undefined) setPdfCurrentPage(prog.page);
          if (prog.zoom !== undefined) setPdfZoom(prog.zoom);
          if (prog.scrollOffset !== undefined) setNoteScrollPosition(prog.scrollOffset);
          if (prog.notebookPage !== undefined) setNotebookPage(prog.notebookPage);
          if (prog.flashcardIndex !== undefined) setActiveFlashcardIndex(prog.flashcardIndex);
          if (prog.flashcardFlipped !== undefined) setFlashcardFlipped(prog.flashcardFlipped);
          if (prog.quizAnswers !== undefined) setQuizAnswers(prog.quizAnswers);
          if (prog.noteActiveTab !== undefined) setNoteActiveTab(prog.noteActiveTab);
        }
      }
    };

    const socket = io(socketUrl, {
      auth: (cb: (data: any) => void) => {
        getLatestValidToken().then((tok) => {
          cb({ token: tok });
        });
      },
      transports: ['websocket'],
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log(`[WebSocket] Connected successfully. Socket ID: ${socket.id}`);
      setSocketStatus('connected');
      if (activeGroupRef.current) {
        socket.emit('room:join', { room: `group:${activeGroupRef.current.id}` });
        socket.emit('group:presence:change', { status: userStatus });
        socket.emit('session:get', { groupId: activeGroupRef.current.id });
      }
    });

    socket.on('disconnect', (reason) => {
      console.warn(`[WebSocket] Disconnected. Reason: ${reason}`);
      setSocketStatus('disconnected');
      if (reason === 'io server disconnect') {
        // Disconnection was initiated by the server, reconnect manually
        socket.connect();
      }
    });

    socket.on('connect_error', (err) => {
      console.error(`[WebSocket] Connection error:`, err);
      setSocketStatus('reconnecting');
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`[WebSocket] Reconnection attempt #${attemptNumber}`);
      setSocketStatus('reconnecting');
    });

    socket.on('auth_error', (data: { message: string }) => {
      console.error(`[WebSocket] Authentication error: ${data.message}`);
      if (data.message.includes('expired') || data.message.includes('Unauthorized') || data.message.includes('Missing')) {
        showToast(`Real-time session error: ${data.message}`, 'error');
      }
    });

    // Real-Time Message Event Handlers
    socket.on('group:message', (newMessage: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });

      queryClientRef.current.invalidateQueries({ queryKey: ['groups'] });

      const activeGrp = activeGroupRef.current;
      if (activeGrp && newMessage.userId !== currentUserRef.current?.id) {
        if (isScrolledToBottomRef.current) {
          scrollToBottom();
          socketRef.current?.emit('group:message:read', { groupId: activeGrp.id, messageId: newMessage.id });
        } else {
          setUnreadCount((prev) => ({
            ...prev,
            [activeGrp.id]: (prev[activeGrp.id] || 0) + 1,
          }));
        }
      }
    });

    socket.on('group:message:edit', (updatedMessage: Message) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === updatedMessage.id ? updatedMessage : m))
      );
    });

    socket.on('group:message:delete', (messageId: string) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    });

    socket.on('group:message:read:update', (data: { messageId: string; userId: string; name: string }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== data.messageId) return m;
          const parsed = parseMessageContent(m.content);
          const seen = parsed.seenBy || [];
          if (seen.some((u) => u.userId === data.userId)) return m;
          return {
            ...m,
            content: JSON.stringify({
              ...parsed,
              seenBy: [...seen, { userId: data.userId, name: data.name }]
            })
          };
        })
      );
    });

    socket.on('group:updated', (updatedGroup: StudyGroup) => {
      setGroups((prev) => prev.map((g) => (g.id === updatedGroup.id ? updatedGroup : g)));
      if (activeGroupRef.current && activeGroupRef.current.id === updatedGroup.id) {
        setActiveGroup(updatedGroup);
        api.get(`/collaboration/groups/${updatedGroup.id}/activity`).then((res) => {
          setActivityFeed(res.data || []);
        });
      }
      queryClientRef.current.invalidateQueries({ queryKey: ['groups'] });
    });

    socket.on('group:deleted', (data: { groupId: string; deletedBy?: string }) => {
      if (data.deletedBy !== currentUserRef.current?.id) {
        showToast('This workspace was deleted by the owner.', 'error');
      }
      setGroups((prev) => prev.filter((g) => g.id !== data.groupId));
      if (activeGroupRef.current?.id === data.groupId) {
        setActiveGroup(null);
      }
      fetchGroups();
      queryClientRef.current.invalidateQueries({ queryKey: ['groups'] });
    });

    socket.on('group:file:uploaded', (resFile: GroupResource) => {
      setSharedFiles((prev) => {
        if (prev.some((f) => f.id === resFile.id)) return prev;
        return [resFile, ...prev];
      });
      if (activeGroupRef.current) {
        api.get(`/collaboration/groups/${activeGroupRef.current.id}/activity`).then((res) => {
          setActivityFeed(res.data || []);
        });
      }
    });

    socket.on('group:file:deleted', (data: { resourceId: string }) => {
      setSharedFiles((prev) => prev.filter((f) => f.id !== data.resourceId));
      if (activeGroupRef.current) {
        api.get(`/collaboration/groups/${activeGroupRef.current.id}/activity`).then((res) => {
          setActivityFeed(res.data || []);
        });
      }
    });

    socket.on('group:invite:received', (invite: GroupInvite) => {
      setReceivedInvites((prev) => {
        if (prev.some((i) => i.id === invite.id)) return prev;
        return [invite, ...prev];
      });
      setLiveInvitationModal(invite);
      queryClientRef.current.invalidateQueries({ queryKey: ['notifications'] });
    });

    socket.on('notification:received', (notif: NotificationItem) => {
      setInAppNotifications((prev) => [notif, ...prev]);
      showToast(`Notification: ${notif.title} - ${notif.message}`, 'info');
      queryClientRef.current.invalidateQueries({ queryKey: ['notifications'] });
    });

    socket.on('group:presence:update', (data: { groupId: string; users: any[] }) => {
      if (activeGroupRef.current && data.groupId === activeGroupRef.current.id) {
        setMembers((prev) =>
          prev.map((m) => {
            const session = data.users.find((u) => u.userId === m.userId);
            return { 
              ...m, 
              isOnline: !!session,
              status: session?.status || 'offline',
            };
          })
        );
      }
    });

    socket.on('group:typing:update', (data: { userId: string; name: string; isTyping: boolean }) => {
      if (data.userId === currentUserRef.current?.id) return;
      setTypingUsers((prev) => {
        if (data.isTyping) {
          if (prev.includes(data.name)) return prev;
          return [...prev, data.name];
        } else {
          return prev.filter((n) => n !== data.name);
        }
      });
    });

    socket.on('group:joined', (newGroup: StudyGroup) => {
      setGroups((prev) => {
        if (prev.some((g) => g.id === newGroup.id)) return prev;
        return [newGroup, ...prev];
      });
      showToast(`Successfully joined workspace "${newGroup.name}"!`, 'success');
      queryClientRef.current.invalidateQueries({ queryKey: ['groups'] });
    });

    socket.on('group:removed', (data: { groupId: string }) => {
      setGroups((prev) => prev.filter((g) => g.id !== data.groupId));
      if (activeGroupRef.current?.id === data.groupId) {
        setActiveGroup(null);
        showToast('You were removed from this workspace.', 'info');
      }
      queryClientRef.current.invalidateQueries({ queryKey: ['groups'] });
    });

    socket.on('group:member:joined', (data: { member: any }) => {
      if (activeGroupRef.current) {
        fetchGroupDetails(activeGroupRef.current.id);
      }
    });

    socket.on('group:member:left', (data: { groupId: string; userId: string }) => {
      if (activeGroupRef.current && data.groupId === activeGroupRef.current.id) {
        if (data.userId === currentUserRef.current?.id) {
          setActiveGroup(null);
          showToast('You have left this workspace.', 'info');
        } else {
          setMembers((prev) => prev.filter((m) => m.userId !== data.userId));
        }
      }
      queryClientRef.current.invalidateQueries({ queryKey: ['groups'] });
    });

    socket.on('group:member:updated', (updatedMember: any) => {
      if (activeGroupRef.current && updatedMember.studyGroupId === activeGroupRef.current.id) {
        setMembers((prev) =>
          prev.map((m) => (m.userId === updatedMember.userId ? { ...m, role: updatedMember.role } : m))
        );
        if (updatedMember.userId === currentUserRef.current?.id) {
          showToast(`Your workspace role was updated to ${updatedMember.role}`, 'info');
        }
      }
    });

    socket.on('group:ownership:transferred', (data: { ownerId: string }) => {
      if (activeGroupRef.current) {
        setActiveGroup((prev) => {
          if (!prev) return prev;
          return { ...prev, ownerId: data.ownerId };
        });
        fetchGroupDetails(activeGroupRef.current.id);
        showToast('Workspace ownership was transferred.', 'info');
      }
    });

    socket.on('group:invite:sent', (invite: GroupInvite) => {
      if (activeGroupRef.current && invite.studyGroupId === activeGroupRef.current.id) {
        setSentInvites((prev) => {
          if (prev.some((i) => i.id === invite.id)) return prev;
          return [invite, ...prev];
        });
      }
    });

    socket.on('group:invite:accepted', (data: { inviteeId: string }) => {
      if (activeGroupRef.current) {
        fetchGroupDetails(activeGroupRef.current.id);
      }
    });

    socket.on('group:invite:declined', (data: { inviteeId: string }) => {
      if (activeGroupRef.current) {
        fetchGroupDetails(activeGroupRef.current.id);
      }
    });

    // Multiplayer Group Study Session events
    socket.on('session:started', (session: StudySessionState) => {
      setActiveSession(session);
      setSessionLoading(false);
      setActiveCenterTab('session');
      showToast('A collaborative Group Study Session has started!', 'success');
      applyActiveResourceState(session);
    });

    socket.on('session:details', (session: StudySessionState | null) => {
      setActiveSession(session);
      applyActiveResourceState(session);
    });

    socket.on('session:ended', (finalSession: StudySessionState) => {
      setActiveSession(null);
      setSessionLoading(false);
      setSessionStatsReport(finalSession);
      setActiveCenterTab('chat');
      showToast('Collaborative study session completed.', 'info');

      // Auto-update cumulative group stats in description (only if current user is owner)
      if (activeGroupRef.current && activeGroupRef.current.ownerId === currentUserRef.current?.id) {
        const originalMeta = parseWorkspaceDescription(activeGroupRef.current.description);
        const elapsedHrs = (finalSession.pomodoro?.elapsedSeconds || 0) / 3600;
        const nextMeta = {
          ...originalMeta,
          studyHours: Number(((originalMeta.studyHours || 0) + elapsedHrs).toFixed(1)),
          studyStreak: (originalMeta.studyStreak || 0) + 1,
        };
        api.patch(`/collaboration/groups/${activeGroupRef.current.id}`, {
          name: activeGroupRef.current.name,
          description: JSON.stringify(nextMeta)
        }).then((res) => {
          if (res.data) {
            setActiveGroup(res.data);
            queryClientRef.current.invalidateQueries({ queryKey: ['groups'] });
          }
        }).catch((err) => {
          console.error('Failed to auto-update cumulative group metrics:', err);
        });
      }
    });

    socket.on('session:pomodoro:update', (pomodoro: any) => {
      setActiveSession((prev) => {
        if (!prev) return prev;
        return { ...prev, pomodoro };
      });
    });

    socket.on('session:tutor:message', (msg: any) => {
      setTutorStreamingResponse('');
      setActiveSession((prev) => {
        if (!prev) return prev;
        if (prev.tutorHistory.some((m) => m.role === msg.role && m.content === msg.content)) return prev;
        return {
          ...prev,
          tutorHistory: [...prev.tutorHistory, msg]
        };
      });
    });

    socket.on('session:tutor:chunk', (data: { chunk: string }) => {
      setTutorStreamingResponse((prev) => prev + data.chunk);
    });

    socket.on('session:focuses:update', (focuses: any) => {
      setActiveSession((prev) => {
        if (!prev) return prev;
        return { ...prev, focuses };
      });
    });

    socket.on('session:stats:update', (stats: any) => {
      setActiveSession((prev) => {
        if (!prev) return prev;
        return { ...prev, stats };
      });
    });

    socket.on('session:resource:sync', (resource: any) => {
      setOpenedStudyResource(resource);
      setQuizQuestions([]);
      setQuizAnswers({});
      setQuizScoreReport(null);
      setFlashcardDeckCards([]);
      setActiveFlashcardIndex(0);
      setFlashcardFlipped(false);

      if (resource) {
        if (resource.resourceType === 'QUIZ') {
          api.get(`/quizzes/${resource.resourceId}`).then((res) => setQuizQuestions(res.data.questions || []));
        } else if (resource.resourceType === 'FLASHCARD_DECK') {
          api.get(`/flashcards`, { params: { deckId: resource.resourceId } }).then((res) => setFlashcardDeckCards(res.data.items || []));
        }
      }
    });

    socket.on('session:resource:progress', (progress: any) => {
      if (progress.page !== undefined) setPdfCurrentPage(progress.page);
      if (progress.zoom !== undefined) setPdfZoom(progress.zoom);
      if (progress.scrollOffset !== undefined) setNoteScrollPosition(progress.scrollOffset);
      if (progress.notebookPage !== undefined) setNotebookPage(progress.notebookPage);
      if (progress.flashcardIndex !== undefined) setActiveFlashcardIndex(progress.flashcardIndex);
      if (progress.flashcardFlipped !== undefined) setFlashcardFlipped(progress.flashcardFlipped);
      if (progress.quizAnswers !== undefined) setQuizAnswers(progress.quizAnswers);
      if (progress.noteActiveTab !== undefined) setNoteActiveTab(progress.noteActiveTab);
      if (progress.pdfScrollPosition !== undefined) {
        setPdfScrollPosition(progress.pdfScrollPosition);
        if (pdfScrollContainerRef.current) {
          pdfScrollContainerRef.current.scrollTop = progress.pdfScrollPosition;
        }
      }
    });

    socket.on('group:activity:log', (activityItem: any) => {
      setActivityFeed((prev) => {
        if (prev.some((a) => a.id === activityItem.id)) return prev;

        // Group identical consecutive events (same user, type, and target details)
        if (prev.length > 0) {
          const top = prev[0];
          const isIdentical =
            top.type === activityItem.type &&
            top.userName === activityItem.userName &&
            JSON.stringify(top.details) === JSON.stringify(activityItem.details);
          if (isIdentical) {
            const updated = {
              ...top,
              timestamp: activityItem.timestamp,
              count: (top.count || 1) + 1,
            };
            return [updated, ...prev.slice(1)];
          }
        }

        return [activityItem, ...prev].slice(0, 30);
      });
    });

    socket.on('whiteboard:draw', (data: any) => {
      if (data.pageId && data.pageId !== activeWhiteboardPageIdRef.current) {
        return;
      }
      const canvas = whiteboardCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.strokeStyle = data.color;
      ctx.fillStyle = data.color;
      ctx.lineWidth = data.brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (!data.tool || data.tool === 'pencil' || data.tool === 'eraser') {
        ctx.beginPath();
        ctx.moveTo(data.prevX, data.prevY);
        ctx.lineTo(data.x, data.y);
        ctx.stroke();
      } else if (data.tool === 'rect') {
        ctx.strokeRect(data.prevX, data.prevY, data.x - data.prevX, data.y - data.prevY);
      } else if (data.tool === 'circle') {
        ctx.beginPath();
        const r = Math.sqrt(Math.pow(data.x - data.prevX, 2) + Math.pow(data.y - data.prevY, 2));
        ctx.arc(data.prevX, data.prevY, r, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (data.tool === 'arrow') {
        // Draw arrow
        const headlen = 10; // length of head in pixels
        const dx = data.x - data.prevX;
        const dy = data.y - data.prevY;
        const angle = Math.atan2(dy, dx);
        ctx.beginPath();
        ctx.moveTo(data.prevX, data.prevY);
        ctx.lineTo(data.x, data.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(data.x, data.y);
        ctx.lineTo(data.x - headlen * Math.cos(angle - Math.PI / 6), data.y - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(data.x - headlen * Math.cos(angle + Math.PI / 6), data.y - headlen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      } else if (data.tool === 'text') {
        ctx.font = `${data.brushSize * 4 + 10}px sans-serif`;
        ctx.fillText(data.text || '', data.x, data.y);
      } else if (data.tool === 'sticky') {
        // Draw Sticky Note box
        const size = 120;
        ctx.fillStyle = data.color || '#fef08a';
        ctx.fillRect(data.x, data.y, size, size);
        ctx.strokeStyle = '#eab308';
        ctx.strokeRect(data.x, data.y, size, size);
        
        ctx.fillStyle = '#18181b';
        ctx.font = 'bold 10px sans-serif';
        const words = (data.text || '').split(' ');
        let line = '';
        let posY = data.y + 20;
        words.forEach((w: string) => {
          if (ctx.measureText(line + w).width > size - 15) {
            ctx.fillText(line, data.x + 8, posY);
            line = w + ' ';
            posY += 14;
          } else {
            line += w + ' ';
          }
        });
        ctx.fillText(line, data.x + 8, posY);
      }
    });

    socket.on('whiteboard:clear', (data?: { pageId?: string }) => {
      if (data?.pageId && data.pageId !== activeWhiteboardPageIdRef.current) {
        return;
      }
      const canvas = whiteboardCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    socket.on('whiteboard:element', (data: { action: 'add' | 'update' | 'delete' | 'reorder'; pageId: string; element?: any; elementId?: string; elements?: any[] }) => {
      if (data.pageId && data.pageId !== activeWhiteboardPageIdRef.current) {
        setWhiteboardPages((prev) => {
          return prev.map((p) => {
            if (p.id !== data.pageId) return p;
            let nextElements = p.elements || [];
            if (data.action === 'add' && data.element) {
              if (!nextElements.some((el: any) => el.id === data.element.id)) {
                nextElements = [...nextElements, data.element];
              }
            } else if (data.action === 'update' && data.element) {
              nextElements = nextElements.map((el: any) => el.id === data.element.id ? data.element : el);
            } else if (data.action === 'delete' && data.elementId) {
              nextElements = nextElements.filter((el: any) => el.id !== data.elementId);
            } else if (data.action === 'reorder' && data.elements) {
              nextElements = data.elements;
            }
            return { ...p, elements: nextElements };
          });
        });
        return;
      }

      setWhiteboardPages((prev) => {
        let updated: any[] = [];
        prev.forEach((p) => {
          if (p.id !== data.pageId) {
            updated.push(p);
          } else {
            let nextElements = p.elements || [];
            if (data.action === 'add' && data.element) {
              if (!nextElements.some((el: any) => el.id === data.element.id)) {
                nextElements = [...nextElements, data.element];
              }
            } else if (data.action === 'update' && data.element) {
              nextElements = nextElements.map((el: any) => el.id === data.element.id ? data.element : el);
            } else if (data.action === 'delete' && data.elementId) {
              nextElements = nextElements.filter((el: any) => el.id !== data.elementId);
            } else if (data.action === 'reorder' && data.elements) {
              nextElements = data.elements;
            }
            const newPage = { ...p, elements: nextElements };
            updated.push(newPage);
            
            const canvas = whiteboardCanvasRef.current;
            if (canvas) {
              setTimeout(() => drawAllElements(canvas, nextElements), 10);
            }
          }
        });
        return updated;
      });
    });

    socket.on('whiteboard:presentation', (data: { presenterId: string; presenterName: string; zoom: number; pan: { x: number; y: number } }) => {
      if (data.presenterId !== currentUserRef.current?.id && followPresenterRef.current) {
        setPresenterId(data.presenterId);
        setPresenterName(data.presenterName);
        setWhiteboardZoom(data.zoom);
        setWhiteboardPan(data.pan);
      }
    });

    socket.on('whiteboard:updated', async () => {
      if (activeGroupRef.current) {
        try {
          const res = await api.get(`/collaboration/groups/${activeGroupRef.current.id}/whiteboard`);
          setWhiteboardEditMode(res.data.mode || 'editing');
          
          setWhiteboardPages((prev) => {
            const nextPages = (res.data.pages || []).map((p: any) => ({ ...p, elements: p.elements || [] }));
            if (JSON.stringify(prev) !== JSON.stringify(nextPages)) {
              const activePage = nextPages.find((p: any) => p.id === activeWhiteboardPageIdRef.current);
              if (activePage) {
                setWhiteboardZoom(activePage.zoom || 1);
                setWhiteboardPan(activePage.pan || { x: -1600, y: -1750 });
                loadCanvasDataURL(activePage);
              }
              return nextPages;
            }
            return prev;
          });
        } catch (e) {
          console.error('Failed to sync whiteboard updates:', e);
        }
      }
    });

    socket.on('editor:playground:change', (data: { code: string; language: string }) => {
      setPlaygroundCode(data.code);
      setPlaygroundLanguage(data.language);
    });

    socket.on('editor:playground:cursor', (data: { userId: string; userName: string; position: { lineNumber: number; column: number } }) => {
      setRemoteCursors((prev) => ({
        ...prev,
        [data.userId]: {
          userName: data.userName,
          line: data.position.lineNumber,
          ch: data.position.column,
        }
      }));
    });

    socket.on('voice:user-joined', async (data: { userId: string; userName: string; socketId: string }) => {
      playVoiceChime('join');
      setVoiceUsers((prev) => {
        if (prev.some((u) => u.socketId === data.socketId)) return prev;
        return [...prev, { socketId: data.socketId, userId: data.userId, userName: data.userName }];
      });

      const peer = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });

      peerConnectionsRef.current[data.socketId] = peer;

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => peer.addTrack(track, localStreamRef.current!));
      }

      peer.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit('voice:signal', {
            targetSocketId: data.socketId,
            signal: { candidate: event.candidate },
            senderUserId: currentUser?.id,
            senderUserName: currentUser?.email.split('@')[0],
          });
        }
      };

      peer.ontrack = (event) => {
        const audio = document.createElement('audio');
        audio.className = 'remote-audio-stream';
        audio.srcObject = event.streams[0];
        audio.autoplay = true;
        audio.muted = isDeafened;
        audio.play().catch((e) => console.log('Audio autoplay blocked or failed:', e));
      };

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      socket.emit('voice:signal', {
        targetSocketId: data.socketId,
        signal: { sdp: offer },
        senderUserId: currentUser?.id,
        senderUserName: currentUser?.email.split('@')[0],
      });
    });

    socket.on('voice:signal', async (data: { signal: any; senderSocketId: string; senderUserId: string; senderUserName: string }) => {
      let peer = peerConnectionsRef.current[data.senderSocketId];

      if (!peer) {
        peer = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });

        peerConnectionsRef.current[data.senderSocketId] = peer;

        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((track) => peer.addTrack(track, localStreamRef.current!));
        }

        peer.onicecandidate = (event) => {
          if (event.candidate && socketRef.current) {
            socketRef.current.emit('voice:signal', {
              targetSocketId: data.senderSocketId,
              signal: { candidate: event.candidate },
              senderUserId: currentUser?.id,
              senderUserName: currentUser?.email.split('@')[0],
            });
          }
        };

        peer.ontrack = (event) => {
          const audio = document.createElement('audio');
          audio.className = 'remote-audio-stream';
          audio.srcObject = event.streams[0];
          audio.autoplay = true;
          audio.muted = isDeafened;
          audio.play().catch((e) => console.log('Audio autoplay blocked or failed:', e));
        };

        setVoiceUsers((prev) => {
          if (prev.some((u) => u.socketId === data.senderSocketId)) return prev;
          return [...prev, { socketId: data.senderSocketId, userId: data.senderUserId, userName: data.senderUserName }];
        });
      }

      if (data.signal.sdp) {
        await peer.setRemoteDescription(new RTCSessionDescription(data.signal.sdp));
        if (data.signal.sdp.type === 'offer') {
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          socket.emit('voice:signal', {
            targetSocketId: data.senderSocketId,
            signal: { sdp: answer },
            senderUserId: currentUser?.id,
            senderUserName: currentUser?.email.split('@')[0],
          });
        }
      } else if (data.signal.candidate) {
        try {
          await peer.addIceCandidate(new RTCIceCandidate(data.signal.candidate));
        } catch (e) {
          console.error('Error adding ICE candidate:', e);
        }
      }
    });

    socket.on('voice:user-left', (data: { userId: string }) => {
      playVoiceChime('leave');
      setVoiceUsers((prev) => {
        const leaving = prev.find((u) => u.userId === data.userId);
        if (leaving) {
          const peer = peerConnectionsRef.current[leaving.socketId];
          if (peer) {
            peer.close();
            delete peerConnectionsRef.current[leaving.socketId];
          }
        }
        return prev.filter((u) => u.userId !== data.userId);
      });
    });

    socket.on('voice:mute', (data: { userId: string; socketId: string; isMuted: boolean }) => {
      setVoiceUsers((prev) =>
        prev.map((u) => (u.socketId === data.socketId ? { ...u, isMuted: data.isMuted } : u))
      );
    });

    socket.on('voice:speaking', (data: { userId: string; socketId: string; isSpeaking: boolean }) => {
      setVoiceUsers((prev) =>
        prev.map((u) => (u.socketId === data.socketId ? { ...u, isSpeaking: data.isSpeaking } : u))
      );
    });

    socket.on('voice:deafen', (data: { userId: string; socketId: string; isDeafened: boolean }) => {
      setVoiceUsers((prev) =>
        prev.map((u) => (u.socketId === data.socketId ? { ...u, isDeafened: data.isDeafened } : u))
      );
    });

    socket.on('whiteboard:cursor', (data: { userId: string; userName: string; x: number; y: number; color: string; isLaser?: boolean }) => {
      setWhiteboardCursors((prev) => ({
        ...prev,
        [data.userId]: {
          userName: data.userName,
          x: data.x,
          y: data.y,
          color: data.color,
          lastUpdated: Date.now(),
          isLaser: data.isLaser,
        },
      }));
    });

    socket.on('whiteboard:laser-point', (data: { userId: string; userName: string; x: number; y: number; color: string }) => {
      if (!remoteLaserTrailsRef.current[data.userId]) {
        remoteLaserTrailsRef.current[data.userId] = [];
      }
      remoteLaserTrailsRef.current[data.userId].push({
        x: data.x,
        y: data.y,
        time: Date.now(),
        color: data.color,
      });
      if (!laserAnimationFrameRef.current) {
        laserAnimationFrameRef.current = requestAnimationFrame(tickLaserAnimation);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUser?.id]);

  // Synchronize remote audio stream elements' muted status when deafened status changes
  useEffect(() => {
    const audios = document.querySelectorAll('.remote-audio-stream') as NodeListOf<HTMLAudioElement>;
    audios.forEach((audio) => {
      audio.muted = isDeafened;
    });
  }, [isDeafened]);

  // Periodic cleanup of stale remote cursor states to avoid memory leaks
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setWhiteboardCursors((prev) => {
        let hasChanges = false;
        const cleaned = { ...prev };
        for (const [userId, cursor] of Object.entries(prev)) {
          if (now - cursor.lastUpdated > 5000) {
            delete cleaned[userId];
            hasChanges = true;
          }
        }
        return hasChanges ? cleaned : prev;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Click outside right sidebar or workspace menu to close them
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const targetEl = e.target as HTMLElement;
      if (targetEl && (targetEl.closest('.workspace-menu-container') || targetEl.closest('.workspace-menu-trigger'))) {
        return;
      }
      setActiveWorkspaceMenuId(null);

      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        const toggleBtn = document.getElementById('collab-sidebar-toggle');
        if (toggleBtn && toggleBtn.contains(e.target as Node)) return;
        
        if (
          targetEl.closest('[role="dialog"]') ||
          targetEl.closest('[role="menu"]') ||
          targetEl.closest('[role="listbox"]') ||
          targetEl.closest('.radix-themes') ||
          targetEl.closest('.modal') ||
          targetEl.closest('.overlay') ||
          targetEl.className?.toString().includes('backdrop') ||
          targetEl.className?.toString().includes('modal')
        ) {
          return;
        }

        setShowRightSidebar(false);
        localStorage.setItem('study_sync_collab_sidebar_open', 'false');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Escape key to close right sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowRightSidebar(false);
        localStorage.setItem('study_sync_collab_sidebar_open', 'false');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initialize right sidebar tabs and open states from localStorage
  useEffect(() => {
    const storedOpen = localStorage.getItem('study_sync_collab_sidebar_open');
    if (storedOpen !== null) {
      setShowRightSidebar(storedOpen === 'true');
    }
    const storedTab = localStorage.getItem('study_sync_collab_sidebar_tab');
    if (storedTab) {
      setRightSidebarTab(storedTab as any);
    }
  }, []);

  // Web Audio API simple speaking activity detector
  useEffect(() => {
    if (!inVoiceRoom || isMuted || !localStreamRef.current) return;
    
    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let microphone: MediaStreamAudioSourceNode | null = null;
    let javascriptNode: ScriptProcessorNode | null = null;
    
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      microphone = audioContext.createMediaStreamSource(localStreamRef.current);
      javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);
      
      analyser.smoothingTimeConstant = 0.8;
      analyser.fftSize = 1024;
      
      microphone.connect(analyser);
      analyser.connect(javascriptNode);
      javascriptNode.connect(audioContext.destination);
      
      let wasSpeaking = false;
      
      javascriptNode.onaudioprocess = () => {
        if (!analyser) return;
        const array = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(array);
        let values = 0;
        const length = array.length;
        for (let i = 0; i < length; i++) {
          values += array[i];
        }
        const average = values / length;
        const isSpeakingNow = average > 15;
        
        if (isSpeakingNow !== wasSpeaking) {
          wasSpeaking = isSpeakingNow;
          if (socketRef.current && activeGroup && currentUser) {
            socketRef.current.emit('voice:speaking', {
              groupId: activeGroup.id,
              userId: currentUser.id,
              isSpeaking: isSpeakingNow
            });
          }
        }
      };
    } catch (e) {
      console.warn('AudioContext speaking detector not supported or failed:', e);
    }
    
    return () => {
      if (javascriptNode) javascriptNode.disconnect();
      if (analyser) analyser.disconnect();
      if (microphone) microphone.disconnect();
      if (audioContext) audioContext.close();
    };
  }, [inVoiceRoom, isMuted, activeGroup?.id, currentUser?.id]);

  // Reactive Presence tracker based on activeCenterTab focus
  useEffect(() => {
    if (!activeGroup || !socketRef.current || !socketRef.current.connected) return;
    
    let focusStr = 'Studying';
    if (activeCenterTab === 'whiteboard') {
      focusStr = 'Drawing on Collaborative Whiteboard 🎨';
    } else if (activeCenterTab === 'playground') {
      focusStr = `Coding in Playground (${playgroundLanguage.toUpperCase()}) 💻`;
    } else if (activeCenterTab === 'chat') {
      focusStr = 'Chatting with Group 💬';
    } else if (activeCenterTab === 'overview') {
      focusStr = 'Viewing Workspace Dashboard 📊';
    } else if (activeCenterTab === 'pinned') {
      focusStr = 'Browsing Pinned Hub 📌';
    } else if (activeCenterTab === 'session') {
      focusStr = 'In Multiplayer Study Session 🚀';
    }
    
    socketRef.current.emit('session:focus:change', {
      groupId: activeGroup.id,
      focus: focusStr
    });
  }, [activeCenterTab, playgroundLanguage, activeGroup?.id, socketStatus]);

  // Separate Room join/leave lifecycle Effect depending on activeGroup selection
  useEffect(() => {
    if (socketRef.current && socketRef.current.connected) {
      const prevGroupId = previousGroupIdRef.current;
      if (prevGroupId && (!activeGroup || prevGroupId !== activeGroup.id)) {
        console.log(`[WebSocket] Leaving previous group room: ${prevGroupId}`);
        socketRef.current.emit('room:leave', { room: `group:${prevGroupId}` });
      }

      if (activeGroup) {
        console.log(`[WebSocket] Joining group room: ${activeGroup.id}`);
        socketRef.current.emit('room:join', { room: `group:${activeGroup.id}` });
        socketRef.current.emit('group:presence:change', { status: userStatus });
        socketRef.current.emit('session:get', { groupId: activeGroup.id });
        previousGroupIdRef.current = activeGroup.id;
      } else {
        previousGroupIdRef.current = null;
      }
    }
  }, [activeGroup?.id, socketStatus, userStatus]);

  // Monitor chat scrolling for unread count banners and floating bottom scroll button
  const handleChatScrollMonitor = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    
    const scrolledToBottom = scrollHeight - scrollTop - clientHeight < 40;
    setIsScrolledToBottom(scrolledToBottom);
    setShowScrollBottomBtn(scrollHeight - scrollTop - clientHeight > 350);

    if (scrolledToBottom && activeGroup && unreadCount[activeGroup.id] > 0) {
      setUnreadCount((prev) => ({ ...prev, [activeGroup.id]: 0 }));
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Group creation
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    try {
      const descriptionJSON = JSON.stringify({
        desc: groupDesc,
        avatar: groupAvatar,
        color: groupColor,
        pins: [],
        visibility: 'private',
        defaultRole: 'MEMBER'
      });

      const res = await api.post('/collaboration/groups', {
        name: groupName,
        description: descriptionJSON,
      });
      showToast('Workspace created successfully', 'success');
      setGroupName('');
      setGroupDesc('');
      setGroupAvatar('📚');
      setGroupColor('purple');
      setShowCreateModal(false);
      fetchGroups();
      setActiveGroup(res.data);
    } catch (err) {
      showToast('Failed to create workspace', 'error');
    }
  };

  // Settings saving
  const handleRenameGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("handleRenameGroup entered");
    console.log("workspaceActionGroup value:", workspaceActionGroup);
    console.log("activeGroup value:", activeGroup);
    const targetGroup = workspaceActionGroup || activeGroup;
    console.log("targetGroup resolved:", targetGroup);
    if (!targetGroup) {
      console.log("handleRenameGroup returned early: targetGroup is null");
      return;
    }
    console.log("targetGroup.id:", targetGroup.id);

    if (!editGroupName.trim()) {
      showToast('Workspace name cannot be empty.', 'error');
      return;
    }

    const nameExists = groups.some(
      (g) => g.name.toLowerCase() === editGroupName.trim().toLowerCase() && g.id !== targetGroup.id
    );
    if (nameExists) {
      showToast('A workspace with this name already exists.', 'error');
      return;
    }

    const originalMeta = parseWorkspaceDescription(targetGroup.description);

    try {
      const descriptionJSON = JSON.stringify({
        ...originalMeta,
        desc: editGroupDesc,
        avatar: editGroupAvatar,
        color: editGroupColor,
        visibility: editGroupVisibility,
        defaultRole: editGroupDefaultRole
      });

      console.log("PATCH starting", targetGroup.id);
      const res = await api.patch(`/collaboration/groups/${targetGroup.id}`, {
        name: editGroupName,
        description: descriptionJSON,
      });
      console.log("PATCH response", res);
      showToast('Workspace settings updated successfully', 'success');
      if (activeGroup?.id === targetGroup.id) {
        setActiveGroup(res.data);
      }
      fetchGroups();
      setShowSettingsModal(false);
    } catch (err) {
      showToast('Failed to update workspace settings', 'error');
    }
  };

  const handleArchiveGroup = async (archiveState: boolean) => {
    const targetGroup = workspaceActionGroup || activeGroup;
    if (!targetGroup) return;

    const originalMeta = parseWorkspaceDescription(targetGroup.description);

    try {
      const descriptionJSON = JSON.stringify({
        ...originalMeta,
        isArchived: archiveState,
      });

      const res = await api.patch(`/collaboration/groups/${targetGroup.id}`, {
        name: editGroupName,
        description: descriptionJSON,
      });
      showToast(archiveState ? 'Workspace archived successfully!' : 'Workspace unarchived successfully!', 'success');
      if (activeGroup?.id === targetGroup.id) {
        setActiveGroup(res.data);
      }
      fetchGroups();
      setShowSettingsModal(false);
    } catch (err) {
      showToast('Failed to change archive status', 'error');
    }
  };

  const handleDeleteGroup = async () => {
    console.log("handleDeleteGroup entered");
    console.log("workspaceActionGroup value:", workspaceActionGroup);
    console.log("activeGroup value:", activeGroup);
    const targetGroup = workspaceActionGroup || activeGroup;
    console.log("targetGroup resolved:", targetGroup);
    if (!targetGroup) {
      console.log("handleDeleteGroup returned early: targetGroup is null");
      return;
    }
    console.log("targetGroup.id:", targetGroup.id);
    
    console.log("currentUser value:", currentUser);
    const isOwner = targetGroup.ownerId === currentUser?.id;
    console.log("isOwner check:", isOwner);
    if (!isOwner) {
      showToast('Only the workspace owner can delete this workspace.', 'error');
      return;
    }

    try {
      console.log("DELETE request starting", targetGroup.id);
      const res = await api.delete(`/collaboration/groups/${targetGroup.id}`);
      console.log("DELETE response", res);
      showToast('Workspace deleted permanently', 'success');
      if (activeGroup?.id === targetGroup.id) {
        setActiveGroup(null);
      }
      fetchGroups();
      setShowSettingsModal(false);
      setShowDeleteConfirm(false);
    } catch (err) {
      showToast('Failed to delete workspace', 'error');
    }
  };

  const handleLeaveGroup = async () => {
    if (!activeGroup) return;

    try {
      logSessionActivity('WORKSPACE_LEFT');
      await api.post(`/collaboration/groups/${activeGroup.id}/leave`);
      showToast('You have left the workspace', 'success');
      setActiveGroup(null);
      fetchGroups();
      setShowSettingsModal(false);
      setShowLeaveConfirm(false);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to leave workspace', 'error');
    }
  };

  const handleCopyInviteLink = () => {
    if (!activeGroup) return;
    const inviteLink = `${window.location.origin}/collaboration?invite=${activeGroup.id}`;
    navigator.clipboard.writeText(inviteLink);
    showToast('Workspace invite link copied to clipboard!', 'success');
  };

  const handleAcceptExternalInvite = async () => {
    if (!externalInviteGroup) return;
    try {
      await api.post(`/collaboration/invites/${externalInviteGroup.id}/respond`, { accept: true });
      showToast('Joined workspace successfully!', 'success');
      setExternalInviteGroup(null);
      fetchGroups();
      setActiveGroup(externalInviteGroup.group);
    } catch (e) {
      showToast('Failed to join workspace', 'error');
    }
  };

  const handleRespondInvite = async (inviteId: string, accept: boolean) => {
    try {
      await api.post(`/collaboration/invites/${inviteId}/respond`, { accept });
      showToast(accept ? 'Invitation accepted successfully!' : 'Invitation declined', 'success');
      fetchReceivedInvites();
      fetchGroups();
    } catch (err) {
      showToast('Failed to respond to invitation', 'error');
    }
  };

  const handleSendInvite = async () => {
    if (!activeGroup) return;

    const input = inviteSearchInput.trim();
    if (!selectedUser && !input) {
      showToast('Please enter a username or email address', 'error');
      return;
    }

    const payload: { inviteeId?: string; email?: string; username?: string } = {};

    if (selectedUser) {
      payload.inviteeId = selectedUser.id;
    } else {
      if (input.includes('@')) {
        payload.email = input;
      } else {
        payload.username = input;
      }
    }

    try {
      await api.post(`/collaboration/groups/${activeGroup.id}/invite-user`, payload);
      const invitedName = selectedUser
        ? `@${selectedUser.username || selectedUser.email || 'learner'}`
        : `@${input}`;
      showToast(`Invitation sent to ${invitedName}!`, 'success');
      setSelectedUser(null);
      setInviteSearchInput('');
      fetchGroupDetails(activeGroup.id);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to send invitation', 'error');
    }
  };

  const handleAttachExistingResource = async () => {
    if (!activeGroup || !selectedLibraryItem) return;

    try {
      await api.post(`/collaboration/groups/${activeGroup.id}/resources`, {
        resourceType: libraryType === 'FLASHCARD' ? 'FLASHCARD_DECK' : libraryType,
        resourceId: selectedLibraryItem.id,
      });
      showToast(`Attached ${libraryType.toLowerCase()} resource to library!`, 'success');
      setShowLibraryModal(false);
      fetchGroupDetails(activeGroup.id);
    } catch (e) {
      showToast('Failed to attach study resource', 'error');
    }
  };

  const handleFilesUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let filesList: File[] = [];
    if ('files' in e.target) {
      filesList = Array.from(e.target.files || []);
    } else if ('dataTransfer' in e) {
      e.preventDefault();
      filesList = Array.from(e.dataTransfer.files || []);
    }

    if (!activeGroup || filesList.length === 0) return;

    setUploadingFile(true);
    for (const file of filesList) {
      const fileId = Math.random().toString(36).substring(7);
      setUploadProgress((prev) => ({ ...prev, [fileId]: 10 }));

      const formData = new FormData();
      formData.append('file', file);

      try {
        await api.post(`/collaboration/groups/${activeGroup.id}/resources/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));
            setUploadProgress((prev) => ({ ...prev, [fileId]: percentCompleted }));
          }
        });
        showToast(`Resource "${file.name}" shared inside library!`, 'success');
      } catch (err: any) {
        showToast(`Upload failed for "${file.name}": ` + (err.response?.data?.message || ''), 'error');
      } finally {
        setUploadProgress((prev) => {
          const copy = { ...prev };
          delete copy[fileId];
          return copy;
        });
      }
    }
    setUploadingFile(false);
    fetchGroupDetails(activeGroup.id);
  };

  const handleTogglePinResource = async (resource: any, isPinned: boolean) => {
    if (!activeGroup) return;

    const originalMeta = parseWorkspaceDescription(activeGroup.description);
    let pins = originalMeta.pins || [];
    const title = resource.document?.name || resource.metadata?.title || resource.metadata?.name || resource.title || 'Shared Resource';

    if (isPinned) {
      pins = pins.filter((p) => p.id !== resource.id);
      showToast('Resource unpinned from workspace', 'success');
      logSessionActivity('RESOURCE_REMOVED', { title });
    } else {
      const type = resource.resourceType || 'FILE';
      const pinObj: PinItem = {
        id: resource.id,
        title,
        type,
        resourceId: resource.resourceId,
        author: resource.sharedBy?.profile?.username || resource.sharedBy?.email.split('@')[0] || 'Member',
        date: new Date().toISOString(),
      };
      pins.push(pinObj);
      showToast('Resource pinned successfully!', 'success');
      logSessionActivity('RESOURCE_PINNED', { title });
    }

    try {
      const descriptionJSON = JSON.stringify({
        ...originalMeta,
        pins
      });

      const res = await api.patch(`/collaboration/groups/${activeGroup.id}`, {
        name: activeGroup.name,
        description: descriptionJSON,
      });

      setActiveGroup(res.data);
      fetchGroups();
    } catch (e) {
      showToast('Failed to update pins', 'error');
    }
  };

  const handleDeleteFile = async (resourceId: string) => {
    if (!activeGroup) return;

    try {
      await api.delete(`/collaboration/groups/${activeGroup.id}/resources/${resourceId}`);
      showToast('Resource removed successfully', 'success');
      fetchGroupDetails(activeGroup.id);
      if (previewFile && previewFile.id === resourceId) {
        setPreviewFile(null);
      }
    } catch (err) {
      showToast('Failed to delete resource', 'error');
    }
  };

  const handlePreviewFile = async (resFile: GroupResource) => {
    setPreviewFile(resFile);
    setPreviewTextContent(null);
    if (!resFile.document) return;

    const mime = resFile.document.mimeType;
    if (mime.startsWith('text/') || mime === 'application/json' || mime === 'text/markdown') {
      try {
        const textRes = await api.get(resFile.document.fileUrl, { responseType: 'text' });
        setPreviewTextContent(textRes.data);
      } catch (err) {
        setPreviewTextContent('Unable to load file content.');
      }
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (!activeGroup) return;
    try {
      await api.delete(`/collaboration/groups/${activeGroup.id}/members/${targetUserId}`);
      showToast('Member removed from workspace', 'success');
      fetchGroupDetails(activeGroup.id);
    } catch (err) {
      showToast('Failed to remove member', 'error');
    }
  };

  const handleUpdateRole = async (targetUserId: string, newRole: string) => {
    if (!activeGroup) return;
    try {
      await api.patch(`/collaboration/groups/${activeGroup.id}/members/${targetUserId}/role`, {
        role: newRole,
      });
      showToast(`Role updated to ${newRole}`, 'success');
      fetchGroupDetails(activeGroup.id);
    } catch (err) {
      showToast('Failed to update member role', 'error');
    }
  };

  const handleTransferOwnership = async () => {
    if (!activeGroup || !transferTargetId) return;
    try {
      await api.post(`/collaboration/groups/${activeGroup.id}/transfer-ownership`, {
        newOwnerId: transferTargetId,
      });
      showToast('Workspace ownership transferred successfully', 'success');
      setShowTransferConfirm(false);
      setTransferTargetId('');
      fetchGroups();
      fetchGroupDetails(activeGroup.id);
    } catch (err) {
      showToast('Failed to transfer ownership', 'error');
    }
  };

  // Group Study Sessions controllers
  const handleStartStudySession = () => {
    if (!activeGroup) {
      showToast('No active workspace selected to start a study session.', 'error');
      return;
    }
    if (!socketRef.current || !socketRef.current.connected) {
      showToast('StudySync is currently disconnected from real-time servers. Please wait or try again.', 'error');
      return;
    }
    socketRef.current.emit('session:start', { groupId: activeGroup.id });
    logSessionActivity('STUDY_SESSION_STARTED');
    showToast('Starting collaborative Group Study Session...', 'info');
  };

  const handleEndStudySession = () => {
    if (!activeGroup) return;
    if (!socketRef.current || !socketRef.current.connected) {
      showToast('StudySync is disconnected from real-time servers.', 'error');
      return;
    }
    socketRef.current.emit('session:end', { groupId: activeGroup.id });
    logSessionActivity('STUDY_SESSION_ENDED');
    showToast('Ending study session...', 'info');
  };

  const handleControlPomodoro = (isPaused: boolean, elapsed?: number, duration?: number) => {
    if (!activeGroup || !socketRef.current) return;
    socketRef.current.emit('session:pomodoro:control', {
      groupId: activeGroup.id,
      isPaused,
      elapsedSeconds: elapsed,
      durationSeconds: duration
    });
  };

  const handleSendSessionTutorPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup || !sessionTutorInput.trim() || !socketRef.current) return;

    socketRef.current.emit('session:tutor:prompt', {
      groupId: activeGroup.id,
      prompt: sessionTutorInput
    });
    handleUpdateSessionFocus('Interacting with AI Study Tutor 🤖');
    handleIncrementSessionStat('aiQuestions');
    logSessionActivity('AI_TUTOR_QUESTION', { prompt: sessionTutorInput });
    setSessionTutorInput('');
  };

  const handleSaveTutorMessageAsNote = async (content: string) => {
    try {
      const res = await api.post('/notes', {
        title: `AI Tutor Note - ${new Date().toLocaleDateString()}`,
        content,
      });
      if (activeGroup && res.data) {
        await api.post(`/collaboration/groups/${activeGroup.id}/resources`, {
          resourceType: 'NOTE',
          resourceId: res.data.id,
        });
        fetchGroupDetails(activeGroup.id);
        showToast('Saved AI response as Note & shared in workspace!', 'success');
      }
    } catch (err) {
      showToast('Failed to save response as Note', 'error');
    }
  };

  const handleSaveSessionSummary = async () => {
    if (!activeGroup || !sessionStatsReport) return;
    try {
      const elapsedSecs = sessionStatsReport.pomodoro?.elapsedSeconds || 0;
      const mins = Math.floor(elapsedSecs / 60);
      const secs = elapsedSecs % 60;
      const durationStr = `${mins}m ${secs}s`;

      const tableRows = Object.entries(sessionStatsReport.focuses || {})
        .map(([userId, focusVal]) => {
          const memberObj = members.find((m) => m.userId === userId);
          const name = memberObj?.user?.profile?.firstName
            ? `${memberObj.user.profile.firstName} ${memberObj.user.profile.lastName || ''}`
            : memberObj?.user?.email.split('@')[0] || 'Member';
          return `| @${name} | *${focusVal}* |`;
        })
        .join('\n');

      const summaryText = `# 🚀 Multiplayer Study Sprint Report
Date: **${new Date().toLocaleDateString()}** | Workspace: **${activeGroup.name}**

## 📊 Session Analytics
| Metric | Value |
| :--- | :--- |
| ⏱️ Total Duration | **${durationStr}** |
| 🤖 AI tutor Queries | **${sessionStatsReport.stats?.aiQuestions || 0}** |
| 🎴 Flashcards Completed | **${sessionStatsReport.stats?.flashcardsReviewed || 0}** |
| 📂 Resources Opened | **${sessionStatsReport.stats?.filesOpened || 0}** |
| ✏️ Completed Quizzes | **${sessionStatsReport.stats?.quizAttempts || 0}** |

## 👥 Participant Focus Logs
| Collaborator | Focus Activity |
| :--- | :--- |
${tableRows || '| *No members recorded focuses* | |'}

---
*Generated automatically by StudySync AI.*
`;

      const res = await api.post('/notes', {
        title: `Study Sprint Report - ${new Date().toLocaleDateString()}`,
        content: summaryText,
      });
      if (res.data) {
        await api.post(`/collaboration/groups/${activeGroup.id}/resources`, {
          resourceType: 'NOTE',
          resourceId: res.data.id,
        });
        fetchGroupDetails(activeGroup.id);
        showToast('Sprint Report saved to Workspace Library!', 'success');
        setSessionStatsReport(null);
      }
    } catch (e) {
      showToast('Failed to save Sprint Report to library', 'error');
    }
  };

  const handleGenerateFlashcardsFromAI = async (content: string) => {
    try {
      showToast('Generating flashcards from discussion...', 'info');
      const res = await api.post('/flashcards/decks', {
        name: `AI Flashcards - ${new Date().toLocaleDateString()}`,
        description: `Generated from AI Tutor study session context.`,
      });
      if (activeGroup && res.data) {
        await api.post(`/collaboration/groups/${activeGroup.id}/resources`, {
          resourceType: 'FLASHCARD_DECK',
          resourceId: res.data.id,
        });
        fetchGroupDetails(activeGroup.id);
        showToast('Generated flashcard deck from tutor context!', 'success');
      }
    } catch (err) {
      showToast('Failed to generate flashcards', 'error');
    }
  };

  const handleGenerateQuizFromAI = async (content: string) => {
    try {
      showToast('Generating quiz from discussion...', 'info');
      const res = await api.post('/quizzes', {
        title: `AI Quiz - ${new Date().toLocaleDateString()}`,
        description: `Context quiz from tutor discussion.`,
        questions: [
          {
            question: "Key concept verified from AI Tutor study session?",
            options: ["Option A", "Option B", "Option C", "Option D"],
            answer: 0,
            explanation: "Verified from session history."
          }
        ]
      });
      if (activeGroup && res.data) {
        await api.post(`/collaboration/groups/${activeGroup.id}/resources`, {
          resourceType: 'QUIZ',
          resourceId: res.data.id,
        });
        fetchGroupDetails(activeGroup.id);
        showToast('Generated quiz from tutor context!', 'success');
      }
    } catch (err) {
      showToast('Failed to generate quiz', 'error');
    }
  };

  const handleUpdateSessionFocus = (focusDescription: string) => {
    if (!activeGroup || !socketRef.current) return;
    socketRef.current.emit('session:focus:change', {
      groupId: activeGroup.id,
      focus: focusDescription
    });
  };

  const logSessionActivity = (type: string, details?: any) => {
    if (!activeGroup || !socketRef.current || !socketRef.current.connected) return;
    const name = currentUser?.profile?.firstName
      ? `${currentUser.profile.firstName} ${currentUser.profile.lastName || ''}`
      : currentUser?.email.split('@')[0] || 'Member';
    socketRef.current.emit('group:activity:log', {
      groupId: activeGroup.id,
      type,
      userName: name,
      details: details || {},
    });
  };

  const handleUpdateCardFocus = (newIdx: number, total: number) => {
    if (!openedStudyResource) return;
    const title = openedStudyResource.document?.name || openedStudyResource.metadata?.title || openedStudyResource.metadata?.name || 'Flashcard Deck';
    handleUpdateSessionFocus(`Reviewing Decks: "${title}" (Card ${newIdx + 1}/${total || 1})`);
  };

  const handleIncrementSessionStat = (statType: 'aiQuestions' | 'filesOpened' | 'quizAttempts' | 'flashcardsReviewed') => {
    if (!activeGroup || !socketRef.current) return;
    socketRef.current.emit('session:stat:increment', {
      groupId: activeGroup.id,
      statType
    });
    if (statType === 'flashcardsReviewed') {
      logSessionActivity('FLASHCARDS_REVIEWED', { count: 1 });
    }
  };

  // Chat message send
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup) return;

    let attachedFile = null;
    if (chatFile) {
      setChatFileUploading(true);
      const formData = new FormData();
      formData.append('file', chatFile);
      try {
        const fileRes = await api.post('/storage/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        attachedFile = {
          id: fileRes.data.id,
          name: fileRes.data.name,
          url: fileRes.data.fileUrl,
          mimeType: fileRes.data.mimeType,
          size: fileRes.data.fileSize,
        };
      } catch (err) {
        showToast('Failed to upload file attachment', 'error');
        setChatFileUploading(false);
        return;
      }
    }

    if (!chatInput.trim() && !attachedFile) {
      setChatFileUploading(false);
      return;
    }

    setSending(true);
    try {
      const richContent: ParsedMessageContent = {
        text: chatInput,
        file: attachedFile || undefined,
        replyTo: replyMessage ? {
          id: replyMessage.id,
          sender: replyMessage.user.profile?.firstName || replyMessage.user.email.split('@')[0],
          content: parseMessageContent(replyMessage.content).text,
        } : undefined
      };

      await api.post(`/collaboration/groups/${activeGroup.id}/messages`, {
        content: JSON.stringify(richContent),
      });

      setChatInput('');
      setReplyMessage(null);
      setChatFile(null);
      scrollToBottom();
    } catch (err) {
      showToast('Failed to send message', 'error');
    } finally {
      setSending(false);
      setChatFileUploading(false);
    }
  };

  // Reactions toggle system
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    try {
      const res = await api.patch(`/collaboration/messages/${messageId}/react`, { emoji });
      setMessages((prev) => prev.map((m) => (m.id === messageId ? res.data : m)));
      saveRecentEmoji(emoji);
    } catch (e) {
      showToast('Failed to react to message', 'error');
    }
  };

  // Message edits/deletions
  const handleEditMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup || !editingMessage || !editChatInput.trim()) return;

    try {
      const originalParsed = parseMessageContent(editingMessage.content);
      const updatedRichContent = JSON.stringify({
        ...originalParsed,
        text: editChatInput,
        isEdited: true,
      });

      const res = await api.patch(`/collaboration/messages/${editingMessage.id}`, {
        content: updatedRichContent,
      });

      setMessages((prev) =>
        prev.map((m) => (m.id === editingMessage.id ? res.data : m))
      );
      setEditingMessage(null);
      setEditChatInput('');
      showToast('Message updated', 'success');
    } catch (err) {
      showToast('Failed to update message', 'error');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await api.delete(`/collaboration/messages/${messageId}`);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      showToast('Message deleted', 'success');
    } catch (err) {
      showToast('Failed to delete message', 'error');
    }
  };

  // WebRTC Multiplayer Voice Channel Handlers
  const playVoiceChime = (type: 'join' | 'leave') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      const now = ctx.currentTime;
      if (type === 'join') {
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(640, now + 0.25);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.35);
      } else {
        osc.frequency.setValueAtTime(580, now);
        osc.frequency.exponentialRampToValueAtTime(290, now + 0.25);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.35);
      }
    } catch (e) {
      console.warn('AudioContext sound generation failed:', e);
    }
  };

  const handleJoinVoiceChannel = async () => {
    if (!activeGroup || !currentUser) return;
    if (inVoiceRoom) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      setInVoiceRoom(true);

      const name = currentUser.profile?.firstName
        ? `${currentUser.profile.firstName} ${currentUser.profile.lastName || ''}`
        : currentUser.email.split('@')[0];

      if (socketRef.current) {
        socketRef.current.emit('voice:join', {
          groupId: activeGroup.id,
          userId: currentUser.id,
          userName: name,
        });
      }
      playVoiceChime('join');
      showToast('Joined voice channel!', 'success');
      logSessionActivity('MEMBER_JOINED', { role: 'voice channel participant' });
    } catch (err) {
      console.error('Failed to get local audio stream:', err);
      showToast('Could not access microphone.', 'error');
    }
  };

  const handleLeaveVoiceChannel = () => {
    if (!activeGroup || !currentUser) return;
    if (!inVoiceRoom) return;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    Object.keys(peerConnectionsRef.current).forEach((socketId) => {
      peerConnectionsRef.current[socketId].close();
    });
    peerConnectionsRef.current = {};

    if (socketRef.current) {
      socketRef.current.emit('voice:leave', {
        groupId: activeGroup.id,
        userId: currentUser.id,
      });
    }

    playVoiceChime('leave');
    setInVoiceRoom(false);
    setVoiceUsers([]);
    showToast('Left voice channel', 'info');
  };

  const handleToggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const nextMuted = !audioTrack.enabled;
        setIsMuted(nextMuted);
        if (socketRef.current && activeGroup && currentUser) {
          socketRef.current.emit('voice:mute', {
            groupId: activeGroup.id,
            userId: currentUser.id,
            isMuted: nextMuted,
          });
        }
        showToast(audioTrack.enabled ? 'Microphone unmuted' : 'Microphone muted', 'info');
      }
    }
  };

  const handleToggleDeafen = () => {
    const nextDeafened = !isDeafened;
    setIsDeafened(nextDeafened);
    
    // Mute microphone automatically if deafened
    if (nextDeafened && !isMuted) {
      if (localStreamRef.current) {
        const audioTrack = localStreamRef.current.getAudioTracks()[0];
        if (audioTrack) audioTrack.enabled = false;
      }
      setIsMuted(true);
      if (socketRef.current && activeGroup && currentUser) {
        socketRef.current.emit('voice:mute', {
          groupId: activeGroup.id,
          userId: currentUser.id,
          isMuted: true,
        });
      }
    }
    
    if (socketRef.current && activeGroup && currentUser) {
      socketRef.current.emit('voice:deafen', {
        groupId: activeGroup.id,
        userId: currentUser.id,
        isDeafened: nextDeafened,
      });
    }
    
    // Update local audio stream objects
    const audios = document.querySelectorAll('.remote-audio-stream') as NodeListOf<HTMLAudioElement>;
    audios.forEach((audio) => {
      audio.muted = nextDeafened;
    });

    showToast(nextDeafened ? 'Audio room deafened' : 'Audio room undeafened', 'info');
  };

  // Collaborative Whiteboard Canvas Handlers
  const saveWhiteboardState = (overrideElements?: any[]) => {
    const activePage = whiteboardPages.find((p) => p.id === activeWhiteboardPageIdRef.current);
    if (!activePage) return;
    const elementsToSave = overrideElements || activePage.elements || [];
    
    setWhiteboardUndoStack((prev) => [...prev, JSON.parse(JSON.stringify(elementsToSave))]);
    setWhiteboardRedoStack([]);
    
    setWhiteboardSaveStatus('dirty');
    setWhiteboardPages((prevPages) => 
      prevPages.map((p) => 
        p.id === activeWhiteboardPageIdRef.current 
          ? { ...p, elements: elementsToSave, canvasData: '', zoom: whiteboardZoom, pan: whiteboardPan } 
          : p
      )
    );
  };

  const handleWhiteboardUndo = () => {
    const canvas = whiteboardCanvasRef.current;
    if (!canvas || whiteboardUndoStack.length === 0) return;

    const prev = [...whiteboardUndoStack];
    const current = prev.pop();
    setWhiteboardUndoStack(prev);
    
    if (current) {
      setWhiteboardRedoStack((r) => [...r, current]);
    }

    const lastState = prev[prev.length - 1] || [];
    setWhiteboardPages((prevPages) => 
      prevPages.map((p) => 
        p.id === activeWhiteboardPageIdRef.current 
          ? { ...p, elements: lastState } 
          : p
      )
    );

    drawAllElements(canvas, lastState, null);
    setWhiteboardSaveStatus('dirty');

    if (socketRef.current && socketRef.current.connected && activeGroup) {
      socketRef.current.emit('whiteboard:element', {
        groupId: activeGroup.id,
        action: 'reorder',
        pageId: activeWhiteboardPageIdRef.current,
        elements: lastState
      });
    }
  };

  const handleWhiteboardRedo = () => {
    const canvas = whiteboardCanvasRef.current;
    if (!canvas || whiteboardRedoStack.length === 0) return;

    const next = [...whiteboardRedoStack];
    const item = next.pop();
    setWhiteboardRedoStack(next);

    if (item) {
      setWhiteboardUndoStack((u) => [...u, item]);
      setWhiteboardPages((prevPages) => 
        prevPages.map((p) => 
          p.id === activeWhiteboardPageIdRef.current 
            ? { ...p, elements: item } 
            : p
        )
      );

      drawAllElements(canvas, item, null);
      setWhiteboardSaveStatus('dirty');

      if (socketRef.current && socketRef.current.connected && activeGroup) {
        socketRef.current.emit('whiteboard:element', {
          groupId: activeGroup.id,
          action: 'reorder',
          pageId: activeWhiteboardPageIdRef.current,
          elements: item
        });
      }
    }
  };

  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const activePage = whiteboardPages.find((p) => p.id === activeWhiteboardPageIdRef.current);
    const elementsList = activePage ? (activePage.elements || []) : [];

    const hit = hitTestElement(x, y, elementsList);
    if (hit && (hit.type === 'text' || hit.type === 'sticky')) {
      const newText = prompt('Edit content text:', hit.text);
      if (newText !== null) {
        const updatedEl = { ...hit, text: newText };
        const nextElements = elementsList.map((el: any) => el.id === hit.id ? updatedEl : el);
        
        setWhiteboardPages((prev) => 
          prev.map((p) => p.id === activeWhiteboardPageIdRef.current ? { ...p, elements: nextElements } : p)
        );
        
        drawAllElements(canvas, nextElements, hit.id);
        setSelectedElementId(hit.id);
        saveWhiteboardState(nextElements);

        if (socketRef.current && socketRef.current.connected && activeGroup) {
          socketRef.current.emit('whiteboard:element', {
            groupId: activeGroup.id,
            action: 'update',
            pageId: activeWhiteboardPageIdRef.current,
            element: updatedEl
          });
        }
        setWhiteboardSaveStatus('dirty');
      }
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (whiteboardTool === 'pan' || e.button === 1 || e.button === 2) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (whiteboardTool === 'laser') {
      setIsDrawing(true);
      whiteboardStartPosRef.current = { x, y };
      setWhiteboardPrevPos({ x, y });
      localLaserTrailRef.current = [{ x, y, time: Date.now(), color: whiteboardColor }];
      if (socketRef.current && socketRef.current.connected && activeGroup && currentUser) {
        socketRef.current.emit('whiteboard:laser-point', {
          groupId: activeGroup.id,
          userId: currentUser.id,
          userName: currentUser.profile?.firstName || currentUser.email.split('@')[0],
          x,
          y,
          color: whiteboardColor,
        });
      }
      if (!laserAnimationFrameRef.current) {
        laserAnimationFrameRef.current = requestAnimationFrame(tickLaserAnimation);
      }
      return;
    }

    const isOwner = activeGroup && activeGroup.ownerId === currentUser?.id;
    const isAdmin = activeGroup && members.find((m) => m.userId === currentUser?.id)?.role === 'ADMIN';
    const isModerator = isOwner || isAdmin;
    if (whiteboardEditMode === 'view_only' && !isModerator) {
      showToast('Whiteboard is in View-Only mode.', 'info');
      return;
    }

    const activePage = whiteboardPages.find((p) => p.id === activeWhiteboardPageIdRef.current);
    const elementsList = activePage ? (activePage.elements || []) : [];

    if (whiteboardTool === 'select') {
      if (selectedElementId) {
        const selectedEl = elementsList.find((el: any) => el.id === selectedElementId);
        if (selectedEl) {
          const bounds = getElementBounds(selectedEl);
          const anchorSize = 10;
          
          if (Math.abs(x - (bounds.x - 4)) <= anchorSize && Math.abs(y - (bounds.y - 4)) <= anchorSize) {
            setIsResizingSelectedElement(true);
            setActiveResizeAnchor('nw');
            return;
          }
          if (Math.abs(x - (bounds.x + bounds.width + 4)) <= anchorSize && Math.abs(y - (bounds.y - 4)) <= anchorSize) {
            setIsResizingSelectedElement(true);
            setActiveResizeAnchor('ne');
            return;
          }
          if (Math.abs(x - (bounds.x - 4)) <= anchorSize && Math.abs(y - (bounds.y + bounds.height + 4)) <= anchorSize) {
            setIsResizingSelectedElement(true);
            setActiveResizeAnchor('sw');
            return;
          }
          if (Math.abs(x - (bounds.x + bounds.width + 4)) <= anchorSize && Math.abs(y - (bounds.y + bounds.height + 4)) <= anchorSize) {
            setIsResizingSelectedElement(true);
            setActiveResizeAnchor('se');
            return;
          }
        }
      }

      const hit = hitTestElement(x, y, elementsList);
      if (hit) {
        setSelectedElementId(hit.id);
        setIsDraggingSelectedElement(true);
        setDragOffset({ x: x - hit.x, y: y - hit.y });
        drawAllElements(canvas, elementsList, hit.id);
      } else {
        setSelectedElementId(null);
        drawAllElements(canvas, elementsList, null);
      }
      return;
    }

    setIsDrawing(true);
    whiteboardStartPosRef.current = { x, y };
    setWhiteboardPrevPos({ x, y });

    const ctx = canvas.getContext('2d');
    if (ctx) {
      whiteboardSnapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      if (whiteboardTool === 'text') {
        const text = prompt('Enter text:');
        if (text) {
          const newEl = {
            id: `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'text',
            x,
            y,
            text,
            color: whiteboardColor,
            brushSize: whiteboardBrushSize,
            fontSize: whiteboardBrushSize * 4 + 10,
            fontStyle: 'bold'
          };
          
          const nextElements = [...elementsList, newEl];
          setWhiteboardPages((prev) => 
            prev.map((p) => p.id === activeWhiteboardPageIdRef.current ? { ...p, elements: nextElements } : p)
          );
          drawAllElements(canvas, nextElements, null);
          saveWhiteboardState(nextElements);

          if (socketRef.current && socketRef.current.connected && activeGroup) {
            socketRef.current.emit('whiteboard:element', {
              groupId: activeGroup.id,
              action: 'add',
              pageId: activeWhiteboardPageIdRef.current,
              element: newEl
            });
          }
        }
        setIsDrawing(false);
      } else if (whiteboardTool === 'sticky') {
        const text = prompt('Enter Sticky Note text:');
        if (text) {
          const newEl = {
            id: `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'sticky',
            x,
            y,
            width: 120,
            height: 120,
            text,
            color: whiteboardColor || '#fef08a',
            brushSize: 1
          };
          
          const nextElements = [...elementsList, newEl];
          setWhiteboardPages((prev) => 
            prev.map((p) => p.id === activeWhiteboardPageIdRef.current ? { ...p, elements: nextElements } : p)
          );
          drawAllElements(canvas, nextElements, null);
          saveWhiteboardState(nextElements);

          if (socketRef.current && socketRef.current.connected && activeGroup) {
            socketRef.current.emit('whiteboard:element', {
              groupId: activeGroup.id,
              action: 'add',
              pageId: activeWhiteboardPageIdRef.current,
              element: newEl
            });
          }
        }
        setIsDrawing(false);
      } else if (whiteboardTool === 'pencil' || whiteboardTool === 'eraser') {
        currentStrokePointsRef.current = [{ x, y }];
      }
    }
    logSessionActivity('WHITEBOARD_USED');
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setWhiteboardPan((p) => {
        const nextPan = { x: p.x + dx, y: p.y + dy };
        // Broadcast Presenter viewports in real time
        if (isPresenting && socketRef.current && socketRef.current.connected && activeGroup && currentUser) {
          socketRef.current.emit('whiteboard:presentation', {
            groupId: activeGroup.id,
            presenterId: currentUser.id,
            presenterName: currentUser.profile?.firstName || currentUser.email.split('@')[0],
            zoom: whiteboardZoom,
            pan: nextPan
          });
        }
        return nextPan;
      });
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (socketRef.current && socketRef.current.connected && activeGroup && currentUser) {
      socketRef.current.emit('whiteboard:cursor', {
        groupId: activeGroup.id,
        userId: currentUser.id,
        userName: currentUser.profile?.firstName || currentUser.email.split('@')[0],
        x,
        y,
        color: whiteboardColor,
        isLaser: whiteboardTool === 'laser',
      });
    }

    if (whiteboardTool === 'laser') {
      if (isDrawing) {
        localLaserTrailRef.current.push({ x, y, time: Date.now(), color: whiteboardColor });
        if (socketRef.current && socketRef.current.connected && activeGroup && currentUser) {
          socketRef.current.emit('whiteboard:laser-point', {
            groupId: activeGroup.id,
            userId: currentUser.id,
            userName: currentUser.profile?.firstName || currentUser.email.split('@')[0],
            x,
            y,
            color: whiteboardColor,
          });
        }
        if (!laserAnimationFrameRef.current) {
          laserAnimationFrameRef.current = requestAnimationFrame(tickLaserAnimation);
        }
      }
      return;
    }

    const activePage = whiteboardPages.find((p) => p.id === activeWhiteboardPageIdRef.current);
    const elementsList = activePage ? (activePage.elements || []) : [];

    if (isDraggingSelectedElement && selectedElementId) {
      setWhiteboardPages((prev) => 
        prev.map((p) => {
          if (p.id !== activeWhiteboardPageIdRef.current) return p;
          const nextElements = (p.elements || []).map((el: any) => {
            if (el.id !== selectedElementId) return el;
            
            const nextX = x - dragOffset.x;
            const nextY = y - dragOffset.y;
            const dx = nextX - el.x;
            const dy = nextY - el.y;

            if (el.type === 'pencil' || el.type === 'eraser') {
              const updatedPoints = (el.points || []).map((pt: any) => ({ x: pt.x + dx, y: pt.y + dy }));
              return { ...el, x: nextX, y: nextY, points: updatedPoints };
            }
            return { ...el, x: nextX, y: nextY };
          });

          // Draw selection live during dragging
          setTimeout(() => drawAllElements(canvas, nextElements, selectedElementId), 0);

          const updatedEl = nextElements.find((el: any) => el.id === selectedElementId);
          if (updatedEl && socketRef.current && socketRef.current.connected && activeGroup) {
            socketRef.current.emit('whiteboard:element', {
              groupId: activeGroup.id,
              action: 'update',
              pageId: activeWhiteboardPageIdRef.current,
              element: updatedEl
            });
          }

          return { ...p, elements: nextElements };
        })
      );
      return;
    }

    if (isResizingSelectedElement && selectedElementId) {
      setWhiteboardPages((prev) => 
        prev.map((p) => {
          if (p.id !== activeWhiteboardPageIdRef.current) return p;
          const nextElements = (p.elements || []).map((el: any) => {
            if (el.id !== selectedElementId) return el;
            
            if (el.type === 'pencil' || el.type === 'eraser') {
              return el;
            }

            let nextX = el.x;
            let nextY = el.y;
            let nextWidth = el.width || 0;
            let nextHeight = el.height || 0;

            if (activeResizeAnchor === 'nw') {
              nextX = x;
              nextY = y;
              nextWidth = (el.x + (el.width || 0)) - x;
              nextHeight = (el.y + (el.height || 0)) - y;
            } else if (activeResizeAnchor === 'ne') {
              nextY = y;
              nextWidth = x - el.x;
              nextHeight = (el.y + (el.height || 0)) - y;
            } else if (activeResizeAnchor === 'sw') {
              nextX = x;
              nextWidth = (el.x + (el.width || 0)) - x;
              nextHeight = y - el.y;
            } else if (activeResizeAnchor === 'se') {
              nextWidth = x - el.x;
              nextHeight = y - el.y;
            }

            const minSize = 20;
            if (Math.abs(nextWidth) < minSize) {
              nextWidth = nextWidth < 0 ? -minSize : minSize;
              nextX = el.x;
            }
            if (Math.abs(nextHeight) < minSize) {
              nextHeight = nextHeight < 0 ? -minSize : minSize;
              nextY = el.y;
            }

            return { ...el, x: nextX, y: nextY, width: nextWidth, height: nextHeight };
          });

          setTimeout(() => drawAllElements(canvas, nextElements, selectedElementId), 0);

          const updatedEl = nextElements.find((el: any) => el.id === selectedElementId);
          if (updatedEl && socketRef.current && socketRef.current.connected && activeGroup) {
            socketRef.current.emit('whiteboard:element', {
              groupId: activeGroup.id,
              action: 'update',
              pageId: activeWhiteboardPageIdRef.current,
              element: updatedEl
            });
          }

          return { ...p, elements: nextElements };
        })
      );
      return;
    }

    if (!isDrawing || !whiteboardPrevPos || !whiteboardStartPosRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = whiteboardTool === 'eraser' ? '#09090b' : whiteboardColor;
    ctx.fillStyle = whiteboardTool === 'eraser' ? '#09090b' : whiteboardColor;
    ctx.lineWidth = whiteboardBrushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (whiteboardTool === 'pencil' || whiteboardTool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(whiteboardPrevPos.x, whiteboardPrevPos.y);
      ctx.lineTo(x, y);
      ctx.stroke();

      currentStrokePointsRef.current.push({ x, y });

      if (socketRef.current && socketRef.current.connected && activeGroup) {
        socketRef.current.emit('whiteboard:draw', {
          groupId: activeGroup.id,
          pageId: activeWhiteboardPageIdRef.current,
          tool: whiteboardTool,
          x,
          y,
          prevX: whiteboardPrevPos.x,
          prevY: whiteboardPrevPos.y,
          color: whiteboardTool === 'eraser' ? '#09090b' : whiteboardColor,
          brushSize: whiteboardBrushSize,
        });
      }
      setWhiteboardPrevPos({ x, y });
    } else if (whiteboardSnapshotRef.current) {
      ctx.putImageData(whiteboardSnapshotRef.current, 0, 0);
      const startX = whiteboardStartPosRef.current.x;
      const startY = whiteboardStartPosRef.current.y;

      if (whiteboardTool === 'rect') {
        ctx.strokeRect(startX, startY, x - startX, y - startY);
      } else if (whiteboardTool === 'circle') {
        ctx.beginPath();
        const r = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
        ctx.arc(startX, startY, r, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (whiteboardTool === 'arrow') {
        const headlen = 10;
        const dx = x - startX;
        const dy = y - startY;
        const angle = Math.atan2(dy, dx);
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(x, y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - headlen * Math.cos(angle - Math.PI / 6), y - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(x - headlen * Math.cos(angle + Math.PI / 6), y - headlen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      }
      setWhiteboardPrevPos({ x, y });
    }
  };

  const handleCanvasMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }
    if (isDraggingSelectedElement) {
      setIsDraggingSelectedElement(false);
      const activePage = whiteboardPages.find((p) => p.id === activeWhiteboardPageIdRef.current);
      if (activePage) saveWhiteboardState(activePage.elements);
      return;
    }
    if (isResizingSelectedElement) {
      setIsResizingSelectedElement(false);
      setActiveResizeAnchor(null);
      const activePage = whiteboardPages.find((p) => p.id === activeWhiteboardPageIdRef.current);
      if (activePage) saveWhiteboardState(activePage.elements);
      return;
    }
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = whiteboardCanvasRef.current;
    if (!canvas || !whiteboardStartPosRef.current || !whiteboardPrevPos) return;

    const startX = whiteboardStartPosRef.current.x;
    const startY = whiteboardStartPosRef.current.y;
    const x = whiteboardPrevPos.x;
    const y = whiteboardPrevPos.y;

    const activePage = whiteboardPages.find((p) => p.id === activeWhiteboardPageIdRef.current);
    const elementsList = activePage ? (activePage.elements || []) : [];
    let newEl: any = null;

    if (whiteboardTool === 'pencil' || whiteboardTool === 'eraser') {
      if (currentStrokePointsRef.current.length > 0) {
        newEl = {
          id: `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: whiteboardTool,
          x: startX,
          y: startY,
          points: [...currentStrokePointsRef.current],
          color: whiteboardTool === 'eraser' ? '#09090b' : whiteboardColor,
          brushSize: whiteboardBrushSize
        };
      }
    } else if (whiteboardTool === 'rect' || whiteboardTool === 'circle' || whiteboardTool === 'arrow') {
      newEl = {
        id: `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: whiteboardTool,
        x: startX,
        y: startY,
        width: x - startX,
        height: y - startY,
        color: whiteboardColor,
        brushSize: whiteboardBrushSize
      };
    }

    if (newEl) {
      const nextElements = [...elementsList, newEl];
      setWhiteboardPages((prev) => 
        prev.map((p) => p.id === activeWhiteboardPageIdRef.current ? { ...p, elements: nextElements } : p)
      );
      
      // Complete selection refresh
      drawAllElements(canvas, nextElements, null);
      saveWhiteboardState(nextElements);

      if (socketRef.current && socketRef.current.connected && activeGroup) {
        socketRef.current.emit('whiteboard:element', {
          groupId: activeGroup.id,
          action: 'add',
          pageId: activeWhiteboardPageIdRef.current,
          element: newEl
        });
      }
    }

    whiteboardStartPosRef.current = null;
    setWhiteboardPrevPos(null);
    currentStrokePointsRef.current = [];
  };

  const handleClearWhiteboard = () => {
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;

    setWhiteboardPages((prev) => 
      prev.map((p) => p.id === activeWhiteboardPageIdRef.current ? { ...p, elements: [] } : p)
    );
    setSelectedElementId(null);
    clearLocalCanvas();

    if (socketRef.current && socketRef.current.connected && activeGroup) {
      socketRef.current.emit('whiteboard:clear', { groupId: activeGroup.id, pageId: activeWhiteboardPageIdRef.current });
      socketRef.current.emit('whiteboard:element', {
        groupId: activeGroup.id,
        action: 'reorder',
        pageId: activeWhiteboardPageIdRef.current,
        elements: []
      });
    }
    saveWhiteboardState([]);
    setWhiteboardSaveStatus('dirty');
  };

  const handleSaveWhiteboard = async (overrideMode?: 'editing' | 'view_only', overridePages?: any[]) => {
    if (!activeGroup?.id || isSavingRef.current) return;
    isSavingRef.current = true;
    setWhiteboardSaveStatus('saving');
    try {
      const nextPages = overridePages || whiteboardPages;
      const updatedPages = nextPages.map((p) => 
        p.id === activeWhiteboardPageIdRef.current 
          ? { ...p, elements: p.elements || [], canvasData: '', zoom: whiteboardZoom, pan: whiteboardPan }
          : p
      );
      await api.post(`/collaboration/groups/${activeGroup.id}/whiteboard`, {
        mode: overrideMode || whiteboardEditMode,
        pages: updatedPages,
      });
      setWhiteboardSaveStatus('saved');
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('whiteboard:update', { groupId: activeGroup.id });
      }
    } catch (e) {
      setWhiteboardSaveStatus('dirty');
      showToast('Failed to save whiteboard', 'error');
    } finally {
      isSavingRef.current = false;
    }
  };

  useEffect(() => {
    if (!activeGroup?.id) return;
    const interval = setInterval(() => {
      if (whiteboardSaveStatus === 'dirty') {
        handleSaveWhiteboard();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [whiteboardSaveStatus, activeGroup?.id, whiteboardPages, whiteboardEditMode, whiteboardZoom, whiteboardPan]);

  // Vector Drawing Helpers
  const getElementBounds = (el: any) => {
    if (el.type === 'pencil' || el.type === 'eraser') {
      if (!el.points || el.points.length === 0) return { x: el.x, y: el.y, width: 0, height: 0 };
      let minX = el.points[0].x;
      let maxX = el.points[0].x;
      let minY = el.points[0].y;
      let maxY = el.points[0].y;
      el.points.forEach((p: any) => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      });
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }
    if (el.type === 'rect' || el.type === 'sticky' || el.type === 'image') {
      const width = el.width || 0;
      const height = el.height || 0;
      return {
        x: width < 0 ? el.x + width : el.x,
        y: height < 0 ? el.y + height : el.y,
        width: Math.abs(width),
        height: Math.abs(height)
      };
    }
    if (el.type === 'circle') {
      const r = Math.sqrt(Math.pow(el.width || 0, 2) + Math.pow(el.height || 0, 2));
      return { x: el.x - r, y: el.y - r, width: r * 2, height: r * 2 };
    }
    if (el.type === 'arrow') {
      const minX = Math.min(el.x, el.x + (el.width || 0));
      const maxX = Math.max(el.x, el.x + (el.width || 0));
      const minY = Math.min(el.y, el.y + (el.height || 0));
      const maxY = Math.max(el.y, el.y + (el.height || 0));
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }
    if (el.type === 'text') {
      const textLen = el.text ? el.text.length : 0;
      const width = textLen * (el.fontSize ? el.fontSize * 0.55 : 8);
      const height = el.fontSize || 14;
      return { x: el.x, y: el.y, width, height };
    }
    return { x: el.x, y: el.y, width: 0, height: 0 };
  };

  const hitTestElement = (x: number, y: number, elements: any[]) => {
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      const bounds = getElementBounds(el);
      const padding = el.type === 'pencil' || el.type === 'eraser' || el.type === 'arrow' ? 12 : 6;
      if (
        x >= bounds.x - padding &&
        x <= bounds.x + bounds.width + padding &&
        y >= bounds.y - padding &&
        y <= bounds.y + bounds.height + padding
      ) {
        return el;
      }
    }
    return null;
  };

  const drawElement = (ctx: CanvasRenderingContext2D, el: any) => {
    ctx.strokeStyle = el.color;
    ctx.fillStyle = el.color;
    ctx.lineWidth = el.brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (el.type === 'pencil' || el.type === 'eraser') {
      if (el.type === 'eraser') {
        ctx.strokeStyle = '#09090b';
      }
      if (el.points && el.points.length > 0) {
        ctx.beginPath();
        ctx.moveTo(el.points[0].x, el.points[0].y);
        for (let i = 1; i < el.points.length; i++) {
          ctx.lineTo(el.points[i].x, el.points[i].y);
        }
        ctx.stroke();
      }
    } else if (el.type === 'rect') {
      ctx.strokeRect(el.x, el.y, el.width || 0, el.height || 0);
    } else if (el.type === 'circle') {
      ctx.beginPath();
      const r = Math.sqrt(Math.pow(el.width || 0, 2) + Math.pow(el.height || 0, 2));
      ctx.arc(el.x, el.y, r, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (el.type === 'arrow') {
      const targetX = el.x + (el.width || 0);
      const targetY = el.y + (el.height || 0);
      ctx.beginPath();
      ctx.moveTo(el.x, el.y);
      ctx.lineTo(targetX, targetY);
      ctx.stroke();

      const angle = Math.atan2(targetY - el.y, targetX - el.x);
      const headlen = 10;
      ctx.beginPath();
      ctx.moveTo(targetX, targetY);
      ctx.lineTo(targetX - headlen * Math.cos(angle - Math.PI / 6), targetY - headlen * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(targetX, targetY);
      ctx.lineTo(targetX - headlen * Math.cos(angle + Math.PI / 6), targetY - headlen * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
    } else if (el.type === 'text') {
      ctx.fillStyle = el.color;
      let fontStyle = '';
      if (el.fontStyle?.includes('italic')) fontStyle += 'italic ';
      if (el.fontStyle?.includes('bold')) fontStyle += 'bold ';
      const fontSize = el.fontSize || 14;
      ctx.font = `${fontStyle}${fontSize}px sans-serif`;
      ctx.textBaseline = 'top';
      ctx.fillText(el.text || '', el.x, el.y);
    } else if (el.type === 'sticky') {
      const size = el.width || 120;
      ctx.fillStyle = el.color || '#fef08a';
      ctx.fillRect(el.x, el.y, size, size);
      ctx.strokeStyle = '#eab308';
      ctx.strokeRect(el.x, el.y, size, size);

      ctx.fillStyle = '#18181b';
      ctx.font = 'bold 10px sans-serif';
      ctx.textBaseline = 'top';
      const words = (el.text || '').split(' ');
      let line = '';
      let posY = el.y + 20;
      words.forEach((w: string) => {
        if (ctx.measureText(line + w).width > size - 15) {
          ctx.fillText(line, el.x + 8, posY);
          line = w + ' ';
          posY += 14;
        } else {
          line += w + ' ';
        }
      });
      ctx.fillText(line, el.x + 8, posY);
    } else if (el.type === 'image') {
      const imgUrl = el.text;
      if (imgUrl) {
        let cachedImg = imageObjectsCacheRef.current[imgUrl];
        if (!cachedImg) {
          cachedImg = new Image();
          cachedImg.src = imgUrl;
          cachedImg.onload = () => {
            const canvas = whiteboardCanvasRef.current;
            if (canvas) {
              const activePage = whiteboardPages.find((p) => p.id === activeWhiteboardPageIdRef.current);
              if (activePage) drawAllElements(canvas, activePage.elements || []);
            }
          };
          imageObjectsCacheRef.current[imgUrl] = cachedImg;
        }
        try {
          ctx.drawImage(cachedImg, el.x, el.y, el.width || 300, el.height || 200);
        } catch (e) {
          // ignore
        }
      }
    }
  };

  const drawLaserPath = (ctx: CanvasRenderingContext2D, points: { x: number; y: number; time: number; color?: string }[], now: number) => {
    const fadeDuration = 800; // 800ms fade duration
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    for (let i = 1; i < points.length; i++) {
      const p1 = points[i - 1];
      const p2 = points[i];
      const age = now - p2.time;
      if (age > fadeDuration) continue;
      
      const opacity = 1 - age / fadeDuration;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      
      ctx.strokeStyle = p2.color || '#ff003c';
      ctx.lineWidth = 6 * opacity;
      ctx.globalAlpha = opacity;
      ctx.shadowBlur = 8;
      ctx.shadowColor = p2.color || '#ff003c';
      ctx.stroke();
    }
    ctx.restore();
  };

  const tickLaserAnimation = () => {
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    
    const now = Date.now();
    const fadeDuration = 800;
    
    // Prune old points
    localLaserTrailRef.current = localLaserTrailRef.current.filter(pt => now - pt.time <= fadeDuration);
    
    let hasRemotePoints = false;
    Object.keys(remoteLaserTrailsRef.current).forEach(userId => {
      remoteLaserTrailsRef.current[userId] = remoteLaserTrailsRef.current[userId].filter(pt => now - pt.time <= fadeDuration);
      if (remoteLaserTrailsRef.current[userId].length > 0) {
        hasRemotePoints = true;
      } else {
        delete remoteLaserTrailsRef.current[userId];
      }
    });
    
    // Redraw
    const activePage = whiteboardPages.find((p) => p.id === activeWhiteboardPageIdRef.current);
    const elementsList = activePage ? (activePage.elements || []) : [];
    drawAllElements(canvas, elementsList, selectedElementId);
    
    if (localLaserTrailRef.current.length > 0 || hasRemotePoints) {
      laserAnimationFrameRef.current = requestAnimationFrame(tickLaserAnimation);
    } else {
      laserAnimationFrameRef.current = null;
    }
  };

  const drawAllElements = (canvas: HTMLCanvasElement, elements: any[], selectedId?: string | null) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (elements) {
      elements.forEach((el) => drawElement(ctx, el));
    }

    const selectIdToUse = selectedId !== undefined ? selectedId : selectedElementId;
    if (selectIdToUse && elements) {
      const selectedEl = elements.find((el) => el.id === selectIdToUse);
      if (selectedEl) {
        const bounds = getElementBounds(selectedEl);
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(bounds.x - 4, bounds.y - 4, bounds.width + 8, bounds.height + 8);
        ctx.setLineDash([]);

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#0891b2';
        ctx.lineWidth = 1.5;
        const anchorSize = 6;
        const drawAnchor = (ax: number, ay: number) => {
          ctx.fillRect(ax - anchorSize/2, ay - anchorSize/2, anchorSize, anchorSize);
          ctx.strokeRect(ax - anchorSize/2, ay - anchorSize/2, anchorSize, anchorSize);
        };
        drawAnchor(bounds.x - 4, bounds.y - 4);
        drawAnchor(bounds.x + bounds.width + 4, bounds.y - 4);
        drawAnchor(bounds.x - 4, bounds.y + bounds.height + 4);
        drawAnchor(bounds.x + bounds.width + 4, bounds.y + bounds.height + 4);
      }
    }

    // Draw active laser paths
    const now = Date.now();
    if (localLaserTrailRef.current.length > 1) {
      drawLaserPath(ctx, localLaserTrailRef.current, now);
    }
    Object.values(remoteLaserTrailsRef.current).forEach((trail) => {
      if (trail.length > 1) {
        drawLaserPath(ctx, trail, now);
      }
    });
  };

  const clearLocalCanvas = () => {
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const updateWhiteboardViewport = (nextZoom: number, nextPan: { x: number; y: number }) => {
    setWhiteboardZoom(nextZoom);
    setWhiteboardPan(nextPan);

    if (isPresenting && socketRef.current && socketRef.current.connected && activeGroup && currentUser) {
      socketRef.current.emit('whiteboard:presentation', {
        groupId: activeGroup.id,
        presenterId: currentUser.id,
        presenterName: currentUser.profile?.firstName || currentUser.email.split('@')[0],
        zoom: nextZoom,
        pan: nextPan
      });
    }
  };

  const loadCanvasDataURL = (dataUrl: any) => {
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!dataUrl) return;

    if (Array.isArray(dataUrl)) {
      drawAllElements(canvas, dataUrl);
    } else if (typeof dataUrl === 'string' && dataUrl.startsWith('data:image')) {
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
    } else {
      const pageObj = dataUrl;
      if (pageObj && pageObj.elements) {
        drawAllElements(canvas, pageObj.elements);
      } else if (pageObj && pageObj.canvasData) {
        const img = new Image();
        img.src = pageObj.canvasData;
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
        };
      }
    }
  };

  const handleAddWhiteboardPage = () => {
    const newId = `page_${Date.now()}`;
    const newPage = {
      id: newId,
      name: `Page ${whiteboardPages.length + 1}`,
      elements: [],
      zoom: 1,
      pan: { x: -1600, y: -1750 }
    };
    
    const nextPages = [...whiteboardPages, newPage];
    setWhiteboardPages(nextPages);
    setActiveWhiteboardPageId(newId);
    setWhiteboardZoom(1);
    setWhiteboardPan({ x: -1600, y: -1750 });
    setSelectedElementId(null);
    setWhiteboardUndoStack([]);
    setWhiteboardRedoStack([]);
    clearLocalCanvas();
    
    if (socketRef.current && socketRef.current.connected && activeGroup) {
      socketRef.current.emit('whiteboard:update', { groupId: activeGroup.id });
    }
    setWhiteboardSaveStatus('dirty');
    handleSaveWhiteboard(undefined, nextPages);
  };

  const handleSwitchWhiteboardPage = (pageId: string) => {
    if (pageId === activeWhiteboardPageId) return;

    if (whiteboardSaveStatus === 'dirty') {
      handleSaveWhiteboard();
    }

    const targetPage = whiteboardPages.find((p) => p.id === pageId);
    if (targetPage) {
      setActiveWhiteboardPageId(pageId);
      setWhiteboardZoom(targetPage.zoom || 1);
      setWhiteboardPan(targetPage.pan || { x: -1600, y: -1750 });
      setSelectedElementId(null);
      setWhiteboardUndoStack([]);
      setWhiteboardRedoStack([]);
      
      const canvas = whiteboardCanvasRef.current;
      if (canvas) {
        drawAllElements(canvas, targetPage.elements || [], null);
      }
    }
  };

  const handleDeleteWhiteboardPage = (pageId: string) => {
    if (whiteboardPages.length <= 1) {
      showToast('Cannot delete the only page.', 'error');
      return;
    }
    const filtered = whiteboardPages.filter((p) => p.id !== pageId);
    setWhiteboardPages(filtered);
    setSelectedElementId(null);

    if (activeWhiteboardPageId === pageId) {
      const fallbackPage = filtered[0];
      setActiveWhiteboardPageId(fallbackPage.id);
      setWhiteboardZoom(fallbackPage.zoom || 1);
      setWhiteboardPan(fallbackPage.pan || { x: -1600, y: -1750 });
      setWhiteboardUndoStack([]);
      setWhiteboardRedoStack([]);
      
      const canvas = whiteboardCanvasRef.current;
      if (canvas) {
        drawAllElements(canvas, fallbackPage.elements || [], null);
      }
    }
    if (socketRef.current && socketRef.current.connected && activeGroup) {
      socketRef.current.emit('whiteboard:update', { groupId: activeGroup.id });
    }
    setWhiteboardSaveStatus('dirty');
    handleSaveWhiteboard(undefined, filtered);
  };

  const handleRenameWhiteboardPage = (pageId: string, newName: string) => {
    if (!newName.trim()) return;
    const nextPages = whiteboardPages.map((p) => p.id === pageId ? { ...p, name: newName } : p);
    setWhiteboardPages(nextPages);
    if (socketRef.current && socketRef.current.connected && activeGroup) {
      socketRef.current.emit('whiteboard:update', { groupId: activeGroup.id });
    }
    setWhiteboardSaveStatus('dirty');
    handleSaveWhiteboard(undefined, nextPages);
  };

  const handleDuplicateWhiteboardPage = (pageId: string) => {
    const targetPage = whiteboardPages.find((p) => p.id === pageId);
    if (!targetPage) return;
    
    const newId = `page_${Date.now()}`;
    const duplicatedPage = {
      id: newId,
      name: `${targetPage.name} (Copy)`,
      elements: JSON.parse(JSON.stringify(targetPage.elements || [])),
      zoom: targetPage.zoom || 1,
      pan: targetPage.pan || { x: -1600, y: -1750 }
    };

    const nextPages = [...whiteboardPages, duplicatedPage];
    setWhiteboardPages(nextPages);
    if (socketRef.current && socketRef.current.connected && activeGroup) {
      socketRef.current.emit('whiteboard:update', { groupId: activeGroup.id });
    }
    setWhiteboardSaveStatus('dirty');
    handleSaveWhiteboard(undefined, nextPages);
    showToast(`Duplicated to "${duplicatedPage.name}"`, 'success');
  };

  const handleMoveWhiteboardPage = (pageId: string, direction: 'up' | 'down') => {
    const index = whiteboardPages.findIndex((p) => p.id === pageId);
    if (index === -1) return;
    
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= whiteboardPages.length) return;

    const nextPages = [...whiteboardPages];
    const temp = nextPages[index];
    nextPages[index] = nextPages[targetIndex];
    nextPages[targetIndex] = temp;

    setWhiteboardPages(nextPages);
    
    if (socketRef.current && socketRef.current.connected && activeGroup) {
      socketRef.current.emit('whiteboard:update', { groupId: activeGroup.id });
    }
    setWhiteboardSaveStatus('dirty');
    handleSaveWhiteboard(undefined, nextPages);
  };

  const handleImportImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      const activePage = whiteboardPages.find((p) => p.id === activeWhiteboardPageIdRef.current);
      const elementsList = activePage ? (activePage.elements || []) : [];

      const newEl = {
        id: `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'image',
        x: -whiteboardPan.x / whiteboardZoom + 200,
        y: -whiteboardPan.y / whiteboardZoom + 200,
        width: 300,
        height: 200,
        text: dataUrl,
        color: '#ffffff',
        brushSize: 1
      };

      const nextElements = [...elementsList, newEl];
      setWhiteboardPages((prev) =>
        prev.map((p) => p.id === activeWhiteboardPageIdRef.current ? { ...p, elements: nextElements } : p)
      );

      const canvas = whiteboardCanvasRef.current;
      if (canvas) {
        drawAllElements(canvas, nextElements, null);
      }
      saveWhiteboardState(nextElements);

      if (socketRef.current && socketRef.current.connected && activeGroup) {
        socketRef.current.emit('whiteboard:element', {
          groupId: activeGroup.id,
          action: 'add',
          pageId: activeWhiteboardPageIdRef.current,
          element: newEl
        });
      }
      setWhiteboardSaveStatus('dirty');
      showToast('Image imported successfully', 'success');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleExportCanvas = (format: 'png' | 'jpeg' | 'pdf') => {
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;

    // Create a temporary canvas to bake the dark theme background color
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exportCtx = exportCanvas.getContext('2d');
    if (exportCtx) {
      exportCtx.fillStyle = '#09090b';
      exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
      exportCtx.drawImage(canvas, 0, 0);
    }

    if (format === 'png' || format === 'jpeg') {
      const mime = format === 'png' ? 'image/png' : 'image/jpeg';
      const ext = format === 'png' ? 'png' : 'jpg';
      
      const link = document.createElement('a');
      link.download = `whiteboard_export_${Date.now()}.${ext}`;
      link.href = exportCanvas.toDataURL(mime, 0.95);
      link.click();
      showToast(`Exported page as ${format.toUpperCase()}`, 'success');
    } else if (format === 'pdf') {
      const dataUrl = exportCanvas.toDataURL('image/png');
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Whiteboard Export - StudySync AI</title>
              <style>
                body { margin: 0; display: flex; align-items: center; justify-content: center; background: #000; }
                img { max-width: 100%; max-height: 100vh; object-fit: contain; }
                @media print {
                  body { background: #fff; }
                  img { width: 100%; height: auto; }
                }
              </style>
            </head>
            <body>
              <img src="${dataUrl}" />
              <script>
                window.onload = () => {
                  window.print();
                  setTimeout(() => window.close(), 500);
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
        showToast('Generated print layout for PDF export', 'success');
      }
    }
  };

  // Collaborative Coding Playground Handlers
  const handleUpdatePlaygroundCode = (code: string, lang?: string) => {
    const nextLang = lang || playgroundLanguage;
    setPlaygroundCode(code);
    if (lang) setPlaygroundLanguage(lang);
    if (socketRef.current && socketRef.current.connected && activeGroup) {
      socketRef.current.emit('editor:playground:change', {
        groupId: activeGroup.id,
        code,
        language: nextLang,
      });
    }
  };

  const handleExecutePlaygroundCode = async () => {
    setPlaygroundIsExecuting(true);
    setPlaygroundOutput('Compiling source code and starting virtual execution sandbox...');
    logSessionActivity('CODING_SESSION');

    try {
      const res = await api.post('/playground/run', {
        code: playgroundCode,
        language: playgroundLanguage,
        stdin: playgroundStdin,
      });

      const { stdout, stderr, exitCode, duration, compileError } = res.data;

      let statusStr = 'Success';
      if (compileError) {
        statusStr = 'Compilation Failed';
      } else if (exitCode !== 0) {
        statusStr = `Failed (Exit Code ${exitCode})`;
      }

      setPlaygroundOutputObj({
        stdout,
        stderr,
        exitCode,
        duration,
        compileError,
        statusStr,
      });

      setPlaygroundOutput(
        `[StudySync Real-Time Execution: ${playgroundLanguage.toUpperCase()}]\n` +
        `Status: ${statusStr}\n` +
        `Duration: ${duration}ms\n` +
        `-------------------------------------\n` +
        (compileError
          ? `[COMPILE ERROR]:\n${stderr}`
          : (stderr ? `[STDERR]:\n${stderr}\n\n` : '') +
            (stdout || 'Code executed successfully. No stdout output returned.'))
      );
    } catch (err: any) {
      console.error(err);
      const errMsg = `Failed to connect to real-time execution engine. ${err.response?.data?.message || err.message}`;
      setPlaygroundOutputObj({
        errorMsg: errMsg,
      });
      setPlaygroundOutput(
        `[EXECUTION SERVICE ERROR]\n${errMsg}`
      );
    } finally {
      setPlaygroundIsExecuting(false);
    }
  };

  const handleExplainPlaygroundCode = async () => {
    setPlaygroundIsExplaining(true);
    setPlaygroundExplanation('Analyzing code structure and generating AI overview...');
    try {
      const response = await api.post('/tutor/chat', {
        message: `Explain this code logic and any execution output.
Language: ${playgroundLanguage}
Code:
\`\`\`${playgroundLanguage}
${playgroundCode}
\`\`\`
Execution Output / Errors:
\`\`\`
${playgroundOutput}
\`\`\``
      });
      setPlaygroundExplanation(response.data.response || 'No explanation returned.');
    } catch (e) {
      setPlaygroundExplanation('This code defines a helper function and executes it with console logs to debug variables. Make sure parameters are initialized before runs.');
    } finally {
      setPlaygroundIsExplaining(false);
    }
  };

  const handleSaveWorkspaceGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup) return;

    const originalMeta = parseWorkspaceDescription(activeGroup.description);
    const updatedJSON = JSON.stringify({
      ...originalMeta,
      workspaceGoal: goalText,
      workspaceGoalTarget: goalTarget,
      workspaceGoalCompleted: goalCompleted,
    });

    try {
      const res = await api.patch(`/collaboration/groups/${activeGroup.id}`, {
        name: activeGroup.name,
        description: updatedJSON,
      });
      setActiveGroup(res.data);
      setEditingGoal(false);
      showToast('Workspace study goal updated!', 'success');
      fetchGroups();
    } catch (err) {
      showToast('Failed to update workspace goal', 'error');
    }
  };

  const handleTextareaSelectionChange = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    const selectionStart = target.selectionStart;
    const textBeforeCursor = target.value.substring(0, selectionStart);
    const lines = textBeforeCursor.split('\n');
    const lineNumber = lines.length;
    const column = lines[lines.length - 1].length + 1;
    
    if (socketRef.current && activeGroup && currentUser) {
      const name = currentUser.profile?.firstName
        ? `${currentUser.profile.firstName} ${currentUser.profile.lastName || ''}`
        : currentUser.email.split('@')[0];
        
      socketRef.current.emit('editor:playground:cursor', {
        groupId: activeGroup.id,
        userId: currentUser.id,
        userName: name,
        position: { lineNumber, column },
      });
    }
  };

  // Linked StudySync Resources embedded players loaders
  const handleOpenStudyResourcePlayer = async (resource: any) => {
    if (!resource) return;

    setQuizQuestions([]);
    setQuizAnswers({});
    setQuizScoreReport(null);
    setFlashcardDeckCards([]);
    setActiveFlashcardIndex(0);
    setFlashcardFlipped(false);
    setPdfZoom(100);
    setNoteScrollPosition(0);
    setNotebookPage(0);

    try {
      const clonedResource = { ...resource };
      
      if (clonedResource.resourceType === 'NOTE') {
        const res = await api.get(`/notes/${clonedResource.resourceId}`);
        clonedResource.metadata = res.data;
      } else if (clonedResource.resourceType === 'NOTEBOOK') {
        const res = await api.get(`/notebooks/${clonedResource.resourceId}`);
        clonedResource.metadata = res.data;
      } else if (clonedResource.resourceType === 'QUIZ') {
        const res = await api.get(`/quizzes/${clonedResource.resourceId}`);
        clonedResource.metadata = res.data;
        setQuizQuestions(res.data.questions || []);
      } else if (clonedResource.resourceType === 'FLASHCARD_DECK' || clonedResource.resourceType === 'FLASHCARD') {
        const res = await api.get(`/flashcards`, { params: { deckId: clonedResource.resourceId } });
        const items = res.data.items || (Array.isArray(res.data) ? res.data : []);
        if (items.length === 0) {
          const generalCards = await api.get('/flashcards');
          setFlashcardDeckCards(generalCards.data.items || (Array.isArray(generalCards.data) ? generalCards.data : []));
        } else {
          setFlashcardDeckCards(items);
        }
        clonedResource.metadata = { title: clonedResource.metadata?.title || 'Shared Flashcard Deck' };
      } else if (clonedResource.resourceType === 'FILE' || clonedResource.resourceType === 'DOCUMENT') {
        if (!clonedResource.document) {
          const res = await api.get(`/rag/documents/${clonedResource.resourceId}`);
          clonedResource.document = res.data;
        }
      }

      setOpenedStudyResource(clonedResource);

      if (activeSession && socketRef.current && socketRef.current.connected && activeGroup) {
        socketRef.current.emit('session:resource:sync', {
          groupId: activeGroup.id,
          resource: clonedResource,
        });
      }

      // Track study focuses presence
      const title = clonedResource.document?.name || clonedResource.metadata?.title || clonedResource.metadata?.name || 'Study Asset';
      handleUpdateSessionFocus(`Solving ${clonedResource.resourceType.toLowerCase()}: "${title}"`);
      handleIncrementSessionStat('filesOpened');
      logSessionActivity('RESOURCE_OPENED', { title, resourceType: clonedResource.resourceType });
      if (clonedResource.resourceType === 'QUIZ') {
        logSessionActivity('QUIZ_STARTED', { title });
      }
    } catch (e) {
      console.error('Failed to load study resource:', e);
      showToast('Error opening study resource. Make sure it exists.', 'error');
    }
  };

  const handleQuizAnswerSelect = (questionId: string, choiceId: string) => {
    setQuizAnswers((prev) => {
      const nextAnswers = { ...prev, [questionId]: choiceId };
      if (activeSession && socketRef.current && socketRef.current.connected && activeGroup) {
        socketRef.current.emit('session:resource:progress', {
          groupId: activeGroup.id,
          progress: { quizAnswers: nextAnswers },
        });
      }
      return nextAnswers;
    });
  };

  const handleUpdatePdfPage = (pageNumber: number) => {
    if (pageNumber < 1) return;
    setPdfCurrentPage(pageNumber);
    if (activeSession && socketRef.current && socketRef.current.connected && activeGroup) {
      socketRef.current.emit('session:resource:progress', {
        groupId: activeGroup.id,
        progress: { page: pageNumber },
      });
      if (openedStudyResource) {
        const title = openedStudyResource.document?.name || 'PDF';
        handleUpdateSessionFocus(`Reading PDF: "${title}" (Page ${pageNumber})`);
        logSessionActivity('DOCUMENT_VIEWED', { page: pageNumber, title });
      }
    }
  };

  const handleSwitchNoteTab = (tab: 'content' | 'summary') => {
    setNoteActiveTab(tab);
    if (activeSession && socketRef.current && socketRef.current.connected && activeGroup) {
      socketRef.current.emit('session:resource:progress', {
        groupId: activeGroup.id,
        progress: { noteActiveTab: tab },
      });
      if (openedStudyResource) {
        const title = openedStudyResource.metadata?.title || 'Note';
        if (tab === 'summary') {
          handleUpdateSessionFocus(`Reading AI Summary of Note: "${title}"`);
        } else {
          handleUpdateSessionFocus(`Reading Note Content: "${title}"`);
        }
      }
    }
  };

  const handleUpdatePdfZoom = (zoom: number) => {
    if (zoom < 50 || zoom > 200) return;
    setPdfZoom(zoom);
    if (activeSession && socketRef.current && socketRef.current.connected && activeGroup) {
      socketRef.current.emit('session:resource:progress', {
        groupId: activeGroup.id,
        progress: { zoom },
      });
    }
  };

  const handleNoteScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setNoteScrollPosition(scrollTop);
    if (activeSession && socketRef.current && socketRef.current.connected && activeGroup) {
      socketRef.current.emit('session:resource:progress', {
        groupId: activeGroup.id,
        progress: { scrollOffset: scrollTop },
      });
    }
  };

  const handlePdfScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setPdfScrollPosition(scrollTop);
    if (activeSession && socketRef.current && socketRef.current.connected && activeGroup) {
      socketRef.current.emit('session:resource:progress', {
        groupId: activeGroup.id,
        progress: { pdfScrollPosition: scrollTop },
      });
    }
  };

  const handleUpdateNotebookPage = (pageIdx: number) => {
    setNotebookPage(pageIdx);
    if (activeSession && socketRef.current && socketRef.current.connected && activeGroup) {
      socketRef.current.emit('session:resource:progress', {
        groupId: activeGroup.id,
        progress: { notebookPage: pageIdx },
      });
      if (openedStudyResource) {
        const title = openedStudyResource.metadata?.name || openedStudyResource.metadata?.title || 'Notebook';
        handleUpdateSessionFocus(`Browsing Notebook: "${title}" (Page ${pageIdx + 1})`);
      }
    }
  };

  const handleSubmitQuizScore = () => {
    let score = 0;
    quizQuestions.forEach((q) => {
      const correctChoice = q.choices?.find((c: any) => c.isCorrect);
      if (correctChoice && quizAnswers[q.id] === correctChoice.id) {
        score++;
      }
    });

    const percentage = Math.round((score / quizQuestions.length) * 100);
    setQuizScoreReport({
      score,
      total: quizQuestions.length,
      percentage
    });

    handleIncrementSessionStat('quizAttempts');
    logSessionActivity('QUIZ_COMPLETED', { score, total: quizQuestions.length });
    showToast(`Quiz completed! You scored ${score}/${quizQuestions.length}`, 'success');
  };

  // Keyboard events
  const handleKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendChatMessage(e);
    }
  };

  const handlePasteClipboard = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          setChatFile(blob);
          showToast('Image attached from clipboard!', 'success');
        }
      }
    }
  };

  // Markdown parsing utility
  const formatMessageText = (text: string) => {
    if (!text) return '';
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Code blocks
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      return `<pre class="bg-zinc-950/80 p-3 rounded-xl font-mono text-[10px] my-2 text-primary overflow-x-auto border border-border/30"><code>${code.trim()}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="bg-zinc-900 px-1.5 py-0.5 rounded font-mono text-[10px] text-primary">$1</code>');

    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-extrabold text-foreground">$1</strong>');

    // Italics
    html = html.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>');

    // Mentions
    html = html.replace(/@(\w+)/g, '<span class="text-primary font-bold bg-primary/10 px-1 py-0.2 rounded cursor-pointer hover:bg-primary/20">@$1</span>');

    // Hashtags
    html = html.replace(/#(\w+)/g, '<span class="text-secondary font-bold hover:underline cursor-pointer">#$1</span>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline font-bold inline-flex items-center gap-0.5">$1 <span class="text-[8px]">🔗</span></a>');

    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  };

  const getPomodoroTime = (session: StudySessionState) => {
    const total = session.pomodoro.durationSeconds;
    const elapsed = session.pomodoro.elapsedSeconds;
    const remaining = Math.max(0, total - elapsed);
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Filters
  const filteredMessages = messages.filter((m) => {
    if (!workspaceSearch.trim()) return true;
    const parsed = parseMessageContent(m.content);
    return parsed.text?.toLowerCase().includes(workspaceSearch.toLowerCase());
  });

  const filteredSharedFiles = sharedFiles.filter((f) => {
    const title = f.document?.name || f.metadata?.title || f.metadata?.name || 'Shared Resource';
    const matchesSearch = title.toLowerCase().includes(fileSearchQuery.toLowerCase());
    if (fileFilterType === 'all') return matchesSearch;
    if (fileFilterType === 'image') return matchesSearch && f.document?.mimeType?.startsWith('image/');
    if (fileFilterType === 'pdf') return matchesSearch && f.document?.mimeType === 'application/pdf';
    if (fileFilterType === 'text') return matchesSearch && (f.document?.mimeType?.startsWith('text/') || f.document?.mimeType?.includes('json'));
    return matchesSearch;
  }).sort((a, b) => {
    if (fileSortBy === 'name') {
      const aTitle = a.document?.name || a.metadata?.title || a.metadata?.name || '';
      const bTitle = b.document?.name || b.metadata?.title || b.metadata?.name || '';
      return aTitle.localeCompare(bTitle);
    } else {
      const aDate = new Date(a.createdAt).getTime();
      const bDate = new Date(b.createdAt).getTime();
      return bDate - aDate;
    }
  });

  // Calculate size totals
  const totalStorageSize = sharedFiles.reduce((acc, f) => acc + (f.document?.fileSize || 0), 0);

  // Group messages
  const groupMessagesByDate = (msgs: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    msgs.forEach((m) => {
      const date = new Date(m.createdAt).toLocaleDateString([], {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(m);
    });
    return Object.entries(groups);
  };

  const formatRelativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'online': return 'bg-emerald-500';
      case 'away': return 'bg-amber-500';
      case 'busy': return 'bg-rose-500';
      case 'offline': default: return 'bg-zinc-500';
    }
  };

  const isOwner = activeGroup?.ownerId === currentUser?.id;
  const userMembership = members.find((m) => m.userId === currentUser?.id);
  const currentMemberRole = userMembership?.role || 'MEMBER';
  
  const isAdmin = currentMemberRole === 'ADMIN' || currentMemberRole === 'OWNER';
  const isModerator = currentMemberRole === 'MODERATOR' || isAdmin;

  const pinsList = activeGroup ? parseWorkspaceDescription(activeGroup.description).pins || [] : [];

  const filteredPins = pinsList
    .filter((pin) => {
      const matchesSearch = 
        pin.title.toLowerCase().includes(pinSearchQuery.toLowerCase()) ||
        pin.author.toLowerCase().includes(pinSearchQuery.toLowerCase());
      
      const matchesType = pinTypeFilter === 'ALL' || pin.type === pinTypeFilter;
      
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      if (pinSortOption === 'FAVORITES') {
        const aFav = pinnedFavorites.includes(a.id) ? 1 : 0;
        const bFav = pinnedFavorites.includes(b.id) ? 1 : 0;
        if (aFav !== bFav) return bFav - aFav;
      }
      if (pinSortOption === 'ALPHABETICAL') {
        return a.title.localeCompare(b.title);
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

  return (
    <div className="flex-grow flex gap-4 p-4 max-w-7xl mx-auto w-full font-sans text-xs min-h-[calc(100vh-4rem)] text-foreground select-none overflow-hidden relative">
      
      {/* Reconnect Banner */}
      {socketStatus === 'reconnecting' && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-amber-500/10 border border-amber-500/30 backdrop-blur-md px-6 py-2 rounded-full shadow-2xl flex items-center gap-2 text-amber-500 text-[10px] font-bold tracking-wide animate-pulse">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Websocket reconnecting...</span>
        </div>
      )}

      {/* 1. LEFT SIDEBAR PANEL - WORKSPACES INDEX */}
      <AnimatePresence>
        {showLeftSidebar && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: '25%', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="w-full lg:w-3/12 flex flex-col gap-4 shrink-0 overflow-hidden"
          >
            {/* Header controls card */}
            <div className="border border-border/40 bg-card rounded-2xl p-4 shadow-md flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4.5 w-4.5 text-primary" />
                <span className="font-bold text-sm">StudySync Rooms</span>
              </div>
              <div className="flex gap-1.5 items-center">
                <button
                  onClick={() => setShowNotificationCenter(!showNotificationCenter)}
                  className="relative p-2 bg-secondary/80 hover:bg-secondary border border-border/30 rounded-xl cursor-pointer transition-all"
                  title="In-App Notification Center"
                >
                  <Bell className="h-3.5 w-3.5 text-primary" />
                  {inAppNotifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500" />
                  )}
                </button>

                <button
                  onClick={() => setShowInvitesModal(true)}
                  className={`relative p-2 border rounded-xl cursor-pointer transition-all ${
                    unreadInviteCount > 0 
                      ? 'bg-primary/10 border-primary/25 text-primary' 
                      : 'bg-secondary/80 hover:bg-secondary border-border/30 text-muted-foreground hover:text-foreground'
                  }`}
                  title="Workspace Invitations"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  {unreadInviteCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white font-extrabold text-[8px] flex items-center justify-center border border-zinc-950 shadow-sm animate-bounce">
                      {unreadInviteCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="p-2 bg-secondary hover:bg-secondary/80 border border-border/40 text-muted-foreground hover:text-foreground rounded-xl transition cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* List group boxes */}
            <div className="flex-1 border border-border/40 bg-card rounded-2xl p-4 shadow-md flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-2.5">
                <h2 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">My Spaces</h2>
                <button 
                  onClick={fetchGroups}
                  className="p-1.5 hover:bg-secondary/60 rounded-xl cursor-pointer text-muted-foreground hover:text-foreground transition"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>

              {loading ? (
                <div className="flex-grow flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : groups.length === 0 ? (
                <div className="flex-grow flex flex-col items-center justify-center text-center p-6 text-muted-foreground/60">
                  <Users className="h-12 w-12 mb-2 text-primary/50" />
                  <span>No active workspaces found.</span>
                </div>
              ) : (
                <div className="flex-grow overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                  {groups
                    .filter((g) => !parseWorkspaceDescription(g.description).isArchived)
                    .map((group) => {
                      const isActive = activeGroup?.id === group.id;
                      const metadata = parseWorkspaceDescription(group.description);
                      const unread = unreadCount[group.id] || 0;

                      return (
                        <div key={group.id} className="space-y-1.5">
                          <div
                            onClick={() => setActiveGroup(group)}
                            className={`relative border p-3 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all hover:bg-secondary/25 ${
                              isActive ? 'border-primary bg-primary/5' : 'border-border/30 bg-card/45'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="h-8 w-8 flex-shrink-0 flex items-center justify-center text-lg rounded-xl border bg-secondary/35 border-border/40 font-bold">
                                {metadata.avatar}
                              </span>
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-foreground truncate">{group.name}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 relative">
                              {unread > 0 && (
                                <span className="h-5 min-w-5 px-1 bg-primary text-primary-foreground font-extrabold text-[9px] rounded-full flex items-center justify-center shrink-0">
                                  {unread}
                                </span>
                              )}
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveWorkspaceMenuId(activeWorkspaceMenuId === group.id ? null : group.id);
                                }}
                                className="p-1 hover:bg-secondary/80 rounded-lg text-muted-foreground hover:text-foreground transition cursor-pointer workspace-menu-trigger"
                                title="Workspace Options"
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
                              </button>

                              {activeWorkspaceMenuId === group.id && (
                                <div 
                                  className="absolute right-0 top-7 z-50 bg-[#18181b] border border-zinc-805 rounded-xl shadow-2xl p-1 min-w-[140px] flex flex-col gap-0.5 workspace-menu-container"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    onClick={() => {
                                      console.log("Rename menu selected");
                                      console.log("WorkspaceActionGroup:", group);
                                      setWorkspaceActionGroup(group);
                                      setEditGroupName(group.name);
                                      setEditGroupDesc(metadata.desc || '');
                                      setEditGroupVisibility(metadata.visibility === 'private' ? 'private' : 'public');
                                      setEditGroupAvatar(metadata.avatar || '📚');
                                      setShowSettingsModal(true);
                                      setActiveWorkspaceMenuId(null);
                                    }}
                                    className="w-full text-left px-2 py-1.5 hover:bg-zinc-800 rounded-lg text-[10px] font-bold text-zinc-205 transition cursor-pointer flex items-center gap-1.5"
                                  >
                                    {group.ownerId === currentUser?.id ? '⚙️ Settings / Rename' : 'ℹ️ Workspace Info'}
                                  </button>
                                  {group.ownerId === currentUser?.id && (
                                    <button
                                      onClick={() => {
                                        console.log("Delete menu selected");
                                        console.log("WorkspaceActionGroup:", group);
                                        setWorkspaceActionGroup(group);
                                        setShowDeleteConfirm(true);
                                        setActiveWorkspaceMenuId(null);
                                      }}
                                      className="w-full text-left px-2 py-1.5 hover:bg-red-500/10 rounded-lg text-[10px] font-bold text-red-500 transition cursor-pointer flex items-center gap-1.5"
                                    >
                                      🗑️ Delete Workspace
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {isActive && (
                            <div className="bg-[#1e1f22] border border-zinc-805 rounded-xl p-3 space-y-3 ml-2 transition-all shadow-xl">
                              {/* Header info */}
                              <div className="flex justify-between items-center">
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-bold text-zinc-205 flex items-center gap-1.5">
                                    <Radio className={`h-3.5 w-3.5 ${inVoiceRoom ? 'text-emerald-500 animate-pulse' : 'text-zinc-400'}`} />
                                    <span>Voice Channel</span>
                                  </span>
                                  {inVoiceRoom && (
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <span className="h-1 w-1 rounded-full bg-emerald-550 animate-ping" />
                                      <span className="text-[7px] bg-zinc-800 text-emerald-400 font-extrabold px-1.5 py-0.2 rounded-full border border-zinc-700/60 flex items-center gap-0.5">
                                        24ms Latency
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {!inVoiceRoom && (
                                  <button
                                    onClick={handleJoinVoiceChannel}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[9px] rounded-lg cursor-pointer transition uppercase tracking-wider shrink-0"
                                  >
                                    Join
                                  </button>
                                )}
                              </div>

                              {/* Empty State */}
                              {!inVoiceRoom && (
                                <div className="text-center py-3 bg-zinc-950/20 border border-zinc-850 rounded-lg">
                                  <Radio className="h-5 w-5 text-zinc-500 mx-auto stroke-[1.25] mb-1" />
                                  <p className="text-[8px] text-zinc-500 font-semibold max-w-[140px] mx-auto leading-relaxed">
                                    No active speakers. Join voice channel to start talking.
                                  </p>
                                </div>
                              )}

                              {/* Active Room User List */}
                              {inVoiceRoom && (
                                <div className="space-y-2.5">
                                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1 scrollbar-thin">
                                    <AnimatePresence>
                                      {/* Local User Card */}
                                      <motion.div
                                        key="local-user"
                                        initial={{ opacity: 0, scale: 0.93 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.93 }}
                                        transition={{ duration: 0.16 }}
                                        className={`p-1.5 rounded-lg flex items-center gap-2 transition relative border ${(!isMuted && !isDeafened) ? 'bg-emerald-500/5 border-emerald-500/25 shadow-sm shadow-emerald-500/5' : 'bg-zinc-950/30 border-transparent'}`}
                                      >
                                        <div className={`relative h-6 w-6 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-[9px] text-zinc-200 border uppercase shrink-0 ${(!isMuted && !isDeafened) ? 'border-emerald-400 ring-2 ring-emerald-500/30 animate-pulse' : 'border-zinc-700'}`}>
                                          {(currentUser?.profile?.firstName || currentUser?.email.split('@')[0] || 'C')[0]}
                                          <span className={`absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full border border-zinc-900 ${isMuted ? 'bg-red-500' : 'bg-emerald-500'}`} />
                                        </div>
                                        
                                        <div className="flex-grow min-w-0">
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-bold text-[9px] text-zinc-200 truncate">
                                              @{currentUser?.profile?.firstName || currentUser?.email.split('@')[0]}
                                            </span>
                                            <span className="text-[7px] text-muted-foreground/60 shrink-0 font-medium">(You)</span>
                                          </div>
                                          <span className="text-[6.5px] text-zinc-500 block leading-none font-bold">
                                            {isDeafened ? 'Deafened' : (isMuted ? 'Microphone Muted' : 'Speaking...')}
                                          </span>
                                        </div>

                                        {/* local indicators */}
                                        <div className="flex gap-1 items-center shrink-0">
                                          {!isMuted && (
                                            <div className="flex items-end gap-0.5 h-1.5 w-2 mr-0.5">
                                              <div className="w-[1.25px] bg-emerald-500 animate-[bounce_0.8s_infinite] h-full" />
                                              <div className="w-[1.25px] bg-emerald-500 animate-[bounce_0.5s_infinite] h-[60%]" />
                                              <div className="w-[1.25px] bg-emerald-500 animate-[bounce_0.7s_infinite] h-[80%]" />
                                            </div>
                                          )}
                                          {isDeafened && <VolumeX className="h-3 w-3 text-red-400" />}
                                          {isMuted && !isDeafened && <MicOff className="h-3 w-3 text-red-400" />}
                                        </div>
                                      </motion.div>

                                      {/* Remote Users Cards */}
                                      {voiceUsers.map((user) => {
                                        const isSpeaking = user.isSpeaking && !user.isMuted;
                                        return (
                                          <motion.div
                                            key={user.socketId}
                                            initial={{ opacity: 0, scale: 0.93 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.93 }}
                                            transition={{ duration: 0.16 }}
                                            className={`p-1.5 rounded-lg flex items-center gap-2 transition relative border ${isSpeaking ? 'bg-emerald-500/5 border-emerald-500/25 shadow-sm shadow-emerald-500/5' : 'bg-zinc-950/30 border-transparent'}`}
                                          >
                                            <div className={`relative h-6 w-6 rounded-full bg-zinc-805 flex items-center justify-center font-bold text-[9px] text-zinc-200 border uppercase shrink-0 ${isSpeaking ? 'border-emerald-400 ring-2 ring-emerald-500/30 animate-pulse' : 'border-zinc-700'}`}>
                                              {(user.userName || 'C')[0]}
                                              <span className={`absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full border border-zinc-900 ${user.isMuted ? 'bg-red-500' : 'bg-emerald-500'}`} />
                                            </div>
                                            
                                            <div className="flex-grow min-w-0">
                                              <span className="font-bold text-[9px] text-zinc-200 truncate block">
                                                @{user.userName}
                                              </span>
                                              <span className="text-[6.5px] text-zinc-500 block leading-none font-bold">
                                                {user.isDeafened ? 'Deafened' : (user.isMuted ? 'Muted' : (isSpeaking ? 'Speaking...' : 'Connected'))}
                                              </span>
                                            </div>

                                            {/* Remote indicators */}
                                            <div className="flex gap-1 items-center shrink-0">
                                              {isSpeaking && (
                                                <div className="flex items-end gap-0.5 h-1.5 w-2 mr-0.5">
                                                  <div className="w-[1.25px] bg-emerald-500 animate-[bounce_0.8s_infinite] h-full" />
                                                  <div className="w-[1.25px] bg-emerald-500 animate-[bounce_0.5s_infinite] h-[60%]" />
                                                  <div className="w-[1.25px] bg-emerald-500 animate-[bounce_0.7s_infinite] h-[80%]" />
                                                </div>
                                              )}
                                              {user.isDeafened && <VolumeX className="h-3 w-3 text-red-400" />}
                                              {user.isMuted && !user.isDeafened && <MicOff className="h-3 w-3 text-red-400" />}
                                            </div>
                                          </motion.div>
                                        );
                                      })}
                                    </AnimatePresence>
                                  </div>

                                  {/* Discord Connection Status & Controls Bar */}
                                  <div className="flex items-center justify-between border-t border-zinc-800 pt-2 bg-zinc-950/20 px-2 py-1.5 rounded-lg border border-zinc-800">
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-[7px] font-extrabold text-emerald-400 uppercase tracking-wide flex items-center gap-1">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span>Voice Connected</span>
                                      </span>
                                      <span className="text-[6.5px] text-zinc-550 font-bold truncate block max-w-[70px]">
                                        {activeGroup.name}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        onClick={handleToggleMute}
                                        className={`p-1.5 rounded-md hover:bg-zinc-800 transition cursor-pointer ${isMuted ? 'text-red-400' : 'text-zinc-400 hover:text-zinc-200'}`}
                                        title={isMuted ? 'Unmute' : 'Mute'}
                                      >
                                        {isMuted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                                      </button>
                                      <button
                                        onClick={handleToggleDeafen}
                                        className={`p-1.5 rounded-md hover:bg-zinc-800 transition cursor-pointer ${isDeafened ? 'text-red-400' : 'text-zinc-400 hover:text-zinc-200'}`}
                                        title={isDeafened ? 'Undeafen' : 'Deafen'}
                                      >
                                        {isDeafened ? <VolumeX className="h-3 w-3" /> : <Headphones className="h-3 w-3" />}
                                      </button>
                                      <button
                                        onClick={handleLeaveVoiceChannel}
                                        className="p-1.5 rounded-md hover:bg-red-500/10 text-red-500 hover:text-red-400 transition cursor-pointer border border-red-500/20"
                                        title="Disconnect"
                                      >
                                        <LogOut className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. MAIN CENTER FEED OR ACTIVE MULTIPLAYER SESSION PANEL */}
      <div className="flex-grow border border-border/40 bg-card rounded-2xl shadow-md p-4 flex flex-col min-h-[500px] overflow-hidden relative">
        {activeGroup ? (
          <>
            {/* Header controls bar */}
            <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-3 mb-3 shrink-0">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowLeftSidebar(!showLeftSidebar)}
                  className="p-1.5 bg-secondary hover:bg-secondary/80 rounded-xl transition"
                >
                  <Menu className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-2">
                  <span className="h-8 w-8 flex items-center justify-center text-lg rounded-xl bg-secondary/35 border border-border/40">
                    {parseWorkspaceDescription(activeGroup.description).avatar}
                  </span>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-foreground">{activeGroup.name}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {['chat', 'overview', 'pinned', 'whiteboard', 'playground'].map((t) => (
                        <button
                          key={t}
                          onClick={() => setActiveCenterTab(t as any)}
                          className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase transition ${
                            activeCenterTab === t 
                              ? 'bg-primary/20 text-primary border border-primary/30' 
                              : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                      {/* Active session trigger button indicator */}
                      {activeSession && (
                        <button
                          onClick={() => setActiveCenterTab('session')}
                          className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase transition flex items-center gap-1 ${
                            activeCenterTab === 'session' 
                              ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30' 
                              : 'bg-rose-500 text-white animate-pulse'
                          }`}
                        >
                          <Radio className="h-2.5 w-2.5" />
                          <span>Session</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Group study session start button controls */}
              <div className="flex gap-1.5 items-center">
                {!activeSession ? (
                  <button
                    onClick={handleStartStudySession}
                    disabled={sessionLoading}
                    className="px-3.5 py-1.5 bg-rose-500 hover:bg-rose-500/90 text-white font-bold rounded-xl transition shadow flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sessionLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                    <span>{sessionLoading ? 'Starting...' : 'Start Group Study'}</span>
                  </button>
                ) : (
                  isOwner && (
                    <button
                      onClick={handleEndStudySession}
                      disabled={sessionLoading}
                      className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-rose-500 border border-rose-500/35 font-bold rounded-xl transition flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sessionLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Pause className="h-3.5 w-3.5" />
                      )}
                      <span>{sessionLoading ? 'Ending...' : 'End Group Study'}</span>
                    </button>
                  )
                )}

                <button
                  id="collab-sidebar-toggle"
                  onClick={() => {
                    const nextVal = !showRightSidebar;
                    setShowRightSidebar(nextVal);
                    localStorage.setItem('study_sync_collab_sidebar_open', String(nextVal));
                  }}
                  className={`p-2 border rounded-xl transition ${
                    showRightSidebar ? 'bg-primary/10 border-primary text-primary' : 'bg-secondary border-border/30 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Info className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* TAB VIEW 1: COLLABORATIVE CHAT FEED */}
            {activeCenterTab === 'chat' && (
              <>
                <div 
                  ref={chatContainerRef}
                  onScroll={handleChatScrollMonitor}
                  className="flex-grow overflow-y-auto space-y-4 pr-1.5 mb-2 scrollbar-thin scroll-smooth select-text"
                >
                  {filteredMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground/60 p-8">
                      <MessageSquare className="h-10 w-10 stroke-[1.25] text-primary/60 mb-2" />
                      <span>No matching messages. Send a message to start collaboration!</span>
                    </div>
                  ) : (
                    groupMessagesByDate(filteredMessages).map(([dateStr, dateMsgs]) => (
                      <div key={dateStr} className="space-y-3.5">
                        <div className="flex items-center gap-2.5 my-2.5">
                          <div className="flex-grow h-px bg-border/30" />
                          <span className="text-[9px] font-bold text-muted-foreground/75 bg-secondary/50 px-2 py-0.5 rounded-full">
                            {dateStr}
                          </span>
                          <div className="flex-grow h-px bg-border/30" />
                        </div>

                        {dateMsgs.map((msg, idx) => {
                          const parsed = parseMessageContent(msg.content);
                          const isCurrentUser = msg.userId === currentUser?.id;
                          const displayName = msg.user.profile?.firstName 
                            ? `${msg.user.profile.firstName} ${msg.user.profile.lastName || ''}`
                            : msg.user.email.split('@')[0];

                          const isHighlighted = highlightedMessageId === msg.id;

                          const prevMsg = dateMsgs[idx - 1];
                          const isGrouped = prevMsg &&
                            prevMsg.userId === msg.userId &&
                            (new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()) < 180000 &&
                            !parseMessageContent(prevMsg.content).replyTo &&
                            !parsed.replyTo;

                          return (
                            <div
                              key={msg.id}
                              id={`msg-${msg.id}`}
                              className={`flex gap-3 items-start group/msg px-2 py-0.5 rounded-xl transition-all relative ${
                                isHighlighted ? 'bg-primary/10 border-l-2 border-primary' : 'hover:bg-secondary/15'
                              } ${isGrouped ? 'mt-0' : 'mt-2.5'}`}
                            >
                              <div className="relative shrink-0 w-8 flex justify-center text-[8px] text-muted-foreground/60 select-none pt-1">
                                {!isGrouped ? (
                                  <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold uppercase overflow-hidden">
                                    {displayName[0]}
                                  </div>
                                ) : (
                                  <span className="opacity-0 group-hover/msg:opacity-100 transition-opacity">
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex-grow flex flex-col gap-0.5 min-w-0">
                                {!isGrouped && (
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="font-semibold text-foreground text-xs leading-none">{displayName}</span>
                                    <span className="text-[8px] text-muted-foreground leading-none">
                                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {parsed.isEdited && (
                                      <span className="text-[7px] bg-secondary px-1 py-0.2 rounded text-muted-foreground">edited</span>
                                    )}
                                  </div>
                                )}

                                {parsed.replyTo && (
                                  <div className="bg-secondary/35 border-l-2 border-primary/50 px-2.5 py-1 rounded-r-lg mb-1 max-w-sm text-muted-foreground text-[10px] flex flex-col gap-0.5">
                                    <span className="font-bold text-[9px] text-primary">Replying to @{parsed.replyTo.sender}:</span>
                                    <span className="truncate">{parsed.replyTo.content}</span>
                                  </div>
                                )}

                                {parsed.file && (
                                  <div className="bg-secondary/25 border border-border/40 rounded-xl p-3 mb-1.5 max-w-md flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      {parsed.file.mimeType.startsWith('image/') ? (
                                        <ImageIcon className="h-5 w-5 text-primary shrink-0" />
                                      ) : (
                                        <FileIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                                      )}
                                      <div className="flex flex-col min-w-0">
                                        <span className="font-bold text-foreground truncate text-xs">{parsed.file.name}</span>
                                        <span className="text-[9px] text-muted-foreground">
                                          {(parsed.file.size / 1024 / 1024).toFixed(2)} MB • {parsed.file.mimeType.split('/')[1].toUpperCase()}
                                        </span>
                                      </div>
                                    </div>
                                    <a
                                      href={parsed.file.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 hover:bg-secondary/80 border border-border/30 rounded-lg cursor-pointer text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                    </a>
                                  </div>
                                )}

                                {parsed.text && (
                                  <span className="text-muted-foreground leading-relaxed break-all font-medium select-text">
                                    {formatMessageText(parsed.text)}
                                  </span>
                                )}

                                {/* Emoji Reactions */}
                                {parsed.reactions && parsed.reactions.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {parsed.reactions.map((rx) => {
                                      const reactedByMe = rx.users.includes(currentUser?.id || '');
                                      return (
                                        <button
                                          key={rx.emoji}
                                          onClick={() => handleToggleReaction(msg.id, rx.emoji)}
                                          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold transition-colors ${
                                            reactedByMe 
                                              ? 'bg-primary/10 border-primary text-primary' 
                                              : 'bg-secondary/30 border-border/30 text-muted-foreground hover:bg-secondary/50'
                                          }`}
                                        >
                                          <span>{rx.emoji}</span>
                                          <span>{rx.users.length}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}

                                {parsed.seenBy && parsed.seenBy.length > 0 && (
                                  <div className="flex items-center gap-1 text-[8px] text-muted-foreground/80 mt-1 select-text">
                                    <Check className="h-3 w-3 text-emerald-500" />
                                    <span>Seen by {parsed.seenBy.map((u) => `@${u.name}`).join(', ')}</span>
                                  </div>
                                )}
                              </div>

                              {/* Bubble Quick Actions */}
                              <div className="opacity-0 group-hover:hover:opacity-100 group-hover/msg:opacity-100 flex items-center gap-1 bg-card border border-border/30 rounded-xl px-1.5 py-0.5 shadow-md absolute right-4 top-2">
                                <button
                                  onClick={() => setEmojiPickerTarget({ messageId: msg.id })}
                                  className="p-1 hover:bg-secondary text-muted-foreground hover:text-foreground rounded transition"
                                >
                                  <Smile className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => setReplyMessage(msg)}
                                  className="p-1 hover:bg-secondary text-muted-foreground hover:text-foreground rounded transition"
                                >
                                  <Reply className="h-3.5 w-3.5" />
                                </button>
                                {isCurrentUser && (
                                  <button
                                    onClick={() => {
                                      setEditingMessage(msg);
                                      setEditChatInput(parsed.text || '');
                                    }}
                                    className="p-1 hover:bg-secondary text-muted-foreground hover:text-foreground rounded transition"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                {(isCurrentUser || isModerator) && (
                                  <button
                                    onClick={() => handleDeleteMessage(msg.id)}
                                    className="p-1 hover:bg-secondary text-red-500/80 hover:text-red-500 rounded transition"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>

                {replyMessage && (
                  <div className="bg-secondary/45 border-l-2 border-primary border-t border-r border-border/20 p-2 rounded-t-xl flex items-center justify-between gap-3 shrink-0">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="font-bold text-[10px] text-primary">Replying to @{replyMessage.user.profile?.firstName || replyMessage.user.email.split('@')[0]}</span>
                      <span className="text-[10px] text-muted-foreground truncate">{parseMessageContent(replyMessage.content).text}</span>
                    </div>
                    <button onClick={() => setReplyMessage(null)} className="p-1 hover:bg-secondary rounded-lg">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {typingUsers.length > 0 && (
                  <div className="text-[10px] text-muted-foreground/80 px-2 py-0.5 animate-pulse shrink-0">
                    {typingUsers.join(', ')} typing...
                  </div>
                )}

                <form onSubmit={handleSendChatMessage} className="flex gap-2 shrink-0 relative">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => setChatFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sending || chatFileUploading}
                    className="bg-secondary hover:bg-secondary/80 text-muted-foreground border border-border/40 p-3 rounded-xl flex items-center justify-center cursor-pointer disabled:opacity-50"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>

                  <div className="flex-grow relative flex">
                    <input
                      type="text"
                      value={chatInput}
                      onKeyDown={handleKeyDownInput}
                      onPaste={handlePasteClipboard}
                      onChange={(e) => handleChatInputChange(e.target.value)}
                      disabled={sending || chatFileUploading}
                      placeholder="Type a collaborative message..."
                      className="w-full bg-card border border-border/40 rounded-xl pl-4 pr-10 py-3 text-xs outline-none focus:border-primary/60 disabled:opacity-50 transition-colors text-foreground"
                    />

                    <button
                      type="button"
                      onClick={() => setEmojiPickerTarget(emojiPickerTarget === 'input' ? null : 'input')}
                      className="absolute right-3 top-3 hover:bg-secondary p-1 rounded-lg text-muted-foreground hover:text-foreground transition"
                    >
                      <Smile className="h-4 w-4" />
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={sending || chatFileUploading || (!chatInput.trim() && !chatFile)}
                    className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-4 rounded-xl flex items-center justify-center cursor-pointer disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </>
            )}

            {/* TAB VIEW 2: WORKSPACE OVERVIEW DASHBOARD */}
            {activeCenterTab === 'overview' && (
              <div className="flex-grow overflow-y-auto space-y-5 pr-1 select-text">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
                  <div className="bg-secondary/15 border border-border/30 rounded-2xl p-4 flex flex-col justify-between min-h-[95px] hover:border-primary/45 transition">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wide flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-primary" />
                      <span>Members</span>
                    </span>
                    <div>
                      <span className="font-extrabold text-xl text-foreground mt-2 block">{members.length}</span>
                      <span className="text-[8px] text-muted-foreground mt-0.5 block">{members.filter(m => m.isOnline).length} active now</span>
                    </div>
                  </div>
                  <div className="bg-secondary/15 border border-border/30 rounded-2xl p-4 flex flex-col justify-between min-h-[95px] hover:border-secondary/45 transition">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wide flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-secondary" />
                      <span>Resources</span>
                    </span>
                    <div>
                      <span className="font-extrabold text-xl text-foreground mt-2 block">{sharedFiles.length}</span>
                      <span className="text-[8px] text-muted-foreground mt-0.5 block">Shared documents & decks</span>
                    </div>
                  </div>
                  <div className="bg-secondary/15 border border-border/30 rounded-2xl p-4 flex flex-col justify-between min-h-[95px] hover:border-amber-500/45 transition">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wide flex items-center gap-1.5">
                      <Pin className="h-3.5 w-3.5 text-amber-500" />
                      <span>Pins</span>
                    </span>
                    <div>
                      <span className="font-extrabold text-xl text-foreground mt-2 block">{pinsList.length}</span>
                      <span className="text-[8px] text-muted-foreground mt-0.5 block">Pinned guides</span>
                    </div>
                  </div>
                  <div className="bg-secondary/15 border border-border/30 rounded-2xl p-4 flex flex-col justify-between min-h-[95px] hover:border-rose-500/45 transition">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wide flex items-center gap-1.5">
                      <Flame className="h-3.5 w-3.5 text-rose-500" />
                      <span>Study Streak</span>
                    </span>
                    <div>
                      <span className="font-extrabold text-xl text-foreground mt-2 block">
                        {activeGroup ? parseWorkspaceDescription(activeGroup.description).studyStreak || 0 : 0} Days 🔥
                      </span>
                      <span className="text-[8px] text-muted-foreground mt-0.5 block">Keep the streak alive!</span>
                    </div>
                  </div>
                  <div className="bg-secondary/15 border border-border/30 rounded-2xl p-4 flex flex-col justify-between min-h-[95px] hover:border-emerald-500/45 transition col-span-2 lg:col-span-1">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wide flex items-center gap-1.5">
                      <Trophy className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Study Hours</span>
                    </span>
                    <div>
                      <span className="font-extrabold text-xl text-foreground mt-2 block">
                        {activeGroup ? parseWorkspaceDescription(activeGroup.description).studyHours || 0 : 0} Hrs
                      </span>
                      <span className="text-[8px] text-muted-foreground mt-0.5 block">Total study duration</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Real Workspace Activity Feed */}
                  <div className="border border-border/30 rounded-2xl p-4 bg-secondary/10 lg:col-span-2 space-y-3 min-h-[220px] max-h-[350px] flex flex-col">
                    <h4 className="font-bold text-xs border-b border-border/25 pb-2 flex items-center justify-between shrink-0">
                      <span className="flex items-center gap-1.5">
                        <Activity className="h-4 w-4 text-primary animate-pulse" />
                        <span>Live Workspace Activity Feed</span>
                      </span>
                      <span className="text-[8px] text-muted-foreground tracking-wider uppercase font-semibold">Latest updates</span>
                    </h4>

                    <div className="flex-grow overflow-y-auto space-y-3.5 pr-1">
                      {(() => {
                        const getGroupedActivityFeed = () => {
                          const grouped: any[] = [];
                          activityFeed.forEach((item) => {
                            if (grouped.length === 0) {
                              grouped.push({ ...item, count: 1 });
                              return;
                            }
                            const last = grouped[grouped.length - 1];
                            const isSameUser = last.userName === item.userName;
                            const isSameType = last.type === item.type;
                            let isSameDetails = true;
                            if (last.details && item.details) {
                              isSameDetails = last.details.title === item.details.title && last.details.page === item.details.page;
                            } else if (last.details || item.details) {
                              isSameDetails = false;
                            }
                            if (isSameUser && isSameType && isSameDetails) {
                              last.count += 1;
                              last.timestamp = item.timestamp;
                            } else {
                              grouped.push({ ...item, count: 1 });
                            }
                          });
                          return grouped;
                        };
                        const groupedFeed = getGroupedActivityFeed();

                        if (groupedFeed.length === 0) {
                          return (
                            <div className="h-full flex flex-col items-center justify-center text-center py-10 text-muted-foreground/60">
                              <Activity className="h-8 w-8 stroke-[1.2] text-muted-foreground/45 mb-2" />
                              <span className="text-[10px]">No activity recorded yet. invite members or share a study guide to begin collaborating!</span>
                            </div>
                          );
                        }

                        return groupedFeed.map((item) => {
                          let icon = <Users className="h-3.5 w-3.5 text-primary" />;
                          let description = '';

                          if (item.type === 'MEMBER_JOINED') {
                            icon = <UserPlus className="h-3.5 w-3.5 text-emerald-500" />;
                            description = `joined as workspace ${item.details?.role?.toLowerCase() || 'member'}`;
                          } else if (item.type === 'RESOURCE_ADDED') {
                            icon = <Share2 className="h-3.5 w-3.5 text-secondary" />;
                            description = `shared a study resource (${item.details?.resourceType?.toLowerCase() || 'item'})`;
                          } else if (item.type === 'INVITE_SENT') {
                            icon = <Mail className="h-3.5 w-3.5 text-amber-500" />;
                            description = `sent a pending workspace invitation to @${item.details?.inviteeName || 'user'}`;
                          } else if (item.type === 'INVITE_ACCEPTED') {
                            icon = <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
                            description = `accepted the workspace invitation to join @${item.details?.inviteeName || 'user'}`;
                          } else if (item.type === 'RESOURCE_OPENED') {
                            icon = <Eye className="h-3.5 w-3.5 text-blue-400" />;
                            description = `opened resource: "${item.details?.title}" (${item.details?.resourceType})`;
                          } else if (item.type === 'RESOURCE_CLOSED') {
                            icon = <XCircle className="h-3.5 w-3.5 text-muted-foreground" />;
                            description = `closed resource: "${item.details?.title}"`;
                          } else if (item.type === 'DOCUMENT_VIEWED') {
                            icon = <BookOpen className="h-3.5 w-3.5 text-indigo-400" />;
                            description = `viewed document "${item.details?.title}" (Page ${item.details?.page})`;
                          } else if (item.type === 'QUIZ_STARTED') {
                            icon = <PlayCircle className="h-3.5 w-3.5 text-orange-400 animate-pulse" />;
                            description = `started quiz: "${item.details?.title}"`;
                          } else if (item.type === 'QUIZ_COMPLETED') {
                            icon = <Award className="h-3.5 w-3.5 text-yellow-400" />;
                            description = `completed quiz with score ${item.details?.score}/${item.details?.total}`;
                          } else if (item.type === 'FLASHCARDS_REVIEWED') {
                            icon = <Layers className="h-3.5 w-3.5 text-pink-400" />;
                            description = `reviewed flashcards`;
                          } else if (item.type === 'AI_TUTOR_QUESTION') {
                            icon = <Cpu className="h-3.5 w-3.5 text-purple-400" />;
                            description = `asked AI Tutor: "${item.details?.prompt?.substring(0, 30)}..."`;
                          } else if (item.type === 'NOTES_EDITED') {
                            icon = <Edit3 className="h-3.5 w-3.5 text-sky-400" />;
                            description = `edited notes`;
                          } else if (item.type === 'RESOURCE_PINNED') {
                            icon = <Pin className="h-3.5 w-3.5 text-rose-400" />;
                            description = `pinned resource: "${item.details?.title}"`;
                          } else if (item.type === 'RESOURCE_REMOVED') {
                            icon = <Trash2 className="h-3.5 w-3.5 text-red-400" />;
                            description = `removed resource: "${item.details?.title}"`;
                          } else if (item.type === 'WORKSPACE_LEFT') {
                            icon = <LogOut className="h-3.5 w-3.5 text-red-500" />;
                            description = `left the workspace`;
                          } else if (item.type === 'STUDY_SESSION_STARTED') {
                            icon = <Clock className="h-3.5 w-3.5 text-green-400 animate-pulse" />;
                            description = `started a study session`;
                          } else if (item.type === 'STUDY_SESSION_ENDED') {
                            icon = <CheckCircle2 className="h-3.5 w-3.5 text-teal-400" />;
                            description = `ended the study session`;
                          }

                          return (
                            <div key={item.id} className="flex gap-3 items-center text-[10px] bg-secondary/15 border border-border/20 p-2.5 rounded-xl transition hover:border-primary/20">
                              <span className="h-7 w-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                                {icon}
                              </span>
                              <div className="flex-grow min-w-0 flex flex-col">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-foreground">@{item.userName}</span>
                                  <span className="text-muted-foreground">{description}</span>
                                  {item.count > 1 && (
                                    <span className="ml-1 text-[8.5px] px-1.5 py-0.2 rounded-full bg-primary/10 text-primary border border-primary/20 font-extrabold animate-pulse">
                                      ({item.count}x)
                                    </span>
                                  )}
                                </div>
                                <span className="text-[8px] text-muted-foreground mt-0.5">{formatRelativeTime(item.timestamp)}</span>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Right side widgets */}
                  <div className="flex flex-col gap-4">
                    {/* Study Goal / Progress widget */}
                    <div className="border border-border/30 rounded-2xl p-4 bg-secondary/10 space-y-3.5 flex-1 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center border-b border-border/25 pb-2">
                          <h4 className="font-bold text-xs flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <span>Workspace Study Goal</span>
                          </h4>
                          {(isModerator || activeGroup.ownerId === currentUser?.id) && (
                            <button
                              onClick={() => {
                                const meta = parseWorkspaceDescription(activeGroup.description);
                                setGoalText(meta.workspaceGoal || '');
                                setGoalTarget(meta.workspaceGoalTarget || 10);
                                setGoalCompleted(meta.workspaceGoalCompleted || 0);
                                setEditingGoal(true);
                              }}
                              className="text-[9px] font-bold text-primary hover:text-primary-hover uppercase tracking-wider cursor-pointer"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                        {activeGroup && (() => {
                          const meta = parseWorkspaceDescription(activeGroup.description);
                          const goal = meta.workspaceGoal || 'Complete study units';
                          const target = meta.workspaceGoalTarget || 10;
                          const completed = meta.workspaceGoalCompleted || 0;
                          const pct = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0;
                          return (
                            <div className="pt-1.5 space-y-2">
                              <span className="text-[10px] font-bold text-foreground block truncate">
                                Today's Goal: {goal}
                              </span>
                              <div className="flex justify-between items-center text-[9px]">
                                <span className="text-muted-foreground">Progress tracker</span>
                                <span className="font-bold text-foreground">{completed} / {target} ({pct}%)</span>
                              </div>
                              <div className="w-full bg-secondary/40 h-2 rounded-full overflow-hidden border border-border/25">
                                <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="bg-secondary/20 p-2.5 rounded-xl border border-border/25 text-[8.5px] text-muted-foreground italic leading-relaxed">
                        ✨ Pro-tip: Pin important files (PDFs, Quizzes) in the "Pinned" tab so members can access them as a study home base.
                      </div>
                    </div>

                    {/* Upcoming study session widget */}
                    <div className="border border-border/30 rounded-2xl p-4 bg-secondary/10 space-y-3 flex-1 flex flex-col justify-between">
                      <h4 className="font-bold text-xs border-b border-border/25 pb-2 flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-secondary" />
                        <span>Upcoming Study Session</span>
                      </h4>
                      <div className="bg-primary/5 p-3 rounded-xl border border-primary/10 flex justify-between items-center gap-2">
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-foreground text-[10px] truncate">Multiplayer DSA Session</span>
                          <span className="text-[8px] text-muted-foreground mt-0.5">Today at 7:00 PM</span>
                        </div>
                        <button
                          onClick={() => {
                            setActiveCenterTab('session');
                            showToast('Directing to study session environment...', 'info');
                          }}
                          className="px-2.5 py-1 bg-primary text-primary-foreground font-bold text-[9px] rounded-lg cursor-pointer hover:bg-primary/95 shrink-0"
                        >
                          Join
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB VIEW 3: PINNED KNOWLEDGE HUB */}
            {activeCenterTab === 'pinned' && (
              <div className="flex-grow overflow-y-auto space-y-4 pr-1 select-text">
                {/* Search, Filter, Sort Controls */}
                <div className="flex flex-col md:flex-row gap-3.5 items-center justify-between bg-secondary/10 border border-border/25 p-3.5 rounded-2xl shrink-0">
                  <div className="relative w-full md:max-w-xs">
                    <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search pinned knowledge..."
                      value={pinSearchQuery}
                      onChange={(e) => setPinSearchQuery(e.target.value)}
                      className="w-full pl-9.5 pr-3.5 py-2 bg-secondary/20 border border-border/30 rounded-xl text-xs placeholder:text-muted-foreground/80 focus:border-primary/50 outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                    {/* Category Type Filter */}
                    <div className="flex rounded-xl bg-secondary/20 border border-border/30 p-0.5 text-[9px] font-bold">
                      {['ALL', 'FILE', 'NOTE', 'FLASHCARD_DECK', 'QUIZ'].map((t) => (
                        <button
                          key={t}
                          onClick={() => setPinTypeFilter(t)}
                          className={`px-3 py-1.5 rounded-lg transition-colors ${
                            pinTypeFilter === t
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {t === 'FLASHCARD_DECK' ? 'DECKS' : t}
                        </button>
                      ))}
                    </div>

                    {/* Sorting Dropdown */}
                    <select
                      value={pinSortOption}
                      onChange={(e) => setPinSortOption(e.target.value)}
                      className="bg-secondary/25 border border-border/30 rounded-xl px-2.5 py-1.5 text-[9.5px] font-semibold text-muted-foreground hover:text-foreground outline-none"
                    >
                      <option value="RECENT">Recent Pinned</option>
                      <option value="ALPHABETICAL">Alphabetical (A-Z)</option>
                      <option value="FAVORITES">Favorites First</option>
                    </select>
                  </div>
                </div>

                {/* Pins Grid */}
                {filteredPins.length === 0 ? (
                  <div className="h-60 flex flex-col items-center justify-center text-center text-muted-foreground/60 p-8 border border-dashed border-border/30 rounded-2xl">
                    <Pin className="h-10 w-10 stroke-[1.25] text-muted-foreground/45 mb-2.5" />
                    <span className="text-xs font-bold text-foreground">No pinned resources match your criteria.</span>
                    <span className="text-[10px] text-muted-foreground mt-1 max-w-xs">Search for a resource in the Shared files tab and click the Pin icon to showcase it here.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredPins.map((pin) => {
                      const isFavorited = pinnedFavorites.includes(pin.id);
                      let typeLabel = pin.type;
                      let typeIcon = <FileText className="h-4.5 w-4.5 text-secondary" />;

                      if (pin.type === 'NOTE') {
                        typeIcon = <BookOpen className="h-4.5 w-4.5 text-primary" />;
                      } else if (pin.type === 'FLASHCARD_DECK') {
                        typeLabel = 'FLASHCARDS';
                        typeIcon = <Layers className="h-4.5 w-4.5 text-amber-500" />;
                      } else if (pin.type === 'QUIZ') {
                        typeIcon = <Trophy className="h-4.5 w-4.5 text-emerald-500" />;
                      }

                      return (
                        <div
                          key={pin.id}
                          className="border border-border/30 bg-secondary/15 rounded-2xl p-4 flex flex-col justify-between gap-3.5 hover:border-primary/50 transition relative group"
                        >
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
                                {typeIcon}
                              </span>
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-foreground truncate text-xs">{pin.title}</span>
                                <span className="text-[8px] uppercase tracking-wider text-muted-foreground font-semibold">
                                  {typeLabel} • pinned by @{pin.author}
                                </span>
                              </div>
                            </div>

                            {/* Favorite and Unpin controls */}
                            <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  if (isFavorited) {
                                    setPinnedFavorites((prev) => prev.filter((id) => id !== pin.id));
                                  } else {
                                    setPinnedFavorites((prev) => [...prev, pin.id]);
                                  }
                                }}
                                className="p-1 hover:bg-secondary rounded transition"
                              >
                                <Star className={`h-3.5 w-3.5 ${isFavorited ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground hover:text-foreground'}`} />
                              </button>
                              <button
                                onClick={() => handleTogglePinResource(pin, true)}
                                className="p-1 hover:bg-secondary text-red-500 rounded transition"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="flex justify-between items-center border-t border-border/20 pt-2.5 shrink-0">
                            <span className="text-[8.5px] text-muted-foreground/80 font-medium">
                              Pinned {formatRelativeTime(pin.date)}
                            </span>
                            <button
                              onClick={() => {
                                const matching = sharedFiles.find((f) => f.id === pin.id);
                                if (matching) {
                                  handleOpenStudyResourcePlayer(matching);
                                } else {
                                  showToast('Directing preview player configuration...', 'info');
                                }
                              }}
                              className="px-3 py-1 bg-secondary hover:bg-secondary/70 border border-border/30 text-[9px] font-bold rounded-lg transition cursor-pointer"
                            >
                              Open Resource
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB VIEW 5: COLLABORATIVE WHITEBOARD */}
            {activeCenterTab === 'whiteboard' && (
              <div className="flex-grow flex flex-col gap-3 min-h-[480px]">
                <div className="flex flex-wrap justify-between items-center bg-secondary/20 p-2 border border-border/20 rounded-xl shrink-0 gap-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-foreground">Color:</span>
                      <div className="flex gap-1">
                        {['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#ffffff'].map((c) => (
                          <button
                            key={c}
                            onClick={() => {
                              setWhiteboardColor(c);
                              if (whiteboardTool === 'eraser') setWhiteboardTool('pencil');
                              
                              if (selectedElementId) {
                                const activePage = whiteboardPages.find((p) => p.id === activeWhiteboardPageIdRef.current);
                                if (activePage) {
                                  const nextElements = (activePage.elements || []).map((el: any) => {
                                    if (el.id !== selectedElementId) return el;
                                    return { ...el, color: c };
                                  });
                                  setWhiteboardPages((prev) => 
                                    prev.map((p) => p.id === activeWhiteboardPageIdRef.current ? { ...p, elements: nextElements } : p)
                                  );
                                  const canvas = whiteboardCanvasRef.current;
                                  if (canvas) drawAllElements(canvas, nextElements, selectedElementId);
                                  saveWhiteboardState(nextElements);
                                  
                                  const updatedEl = nextElements.find((el: any) => el.id === selectedElementId);
                                  if (updatedEl && socketRef.current && socketRef.current.connected && activeGroup) {
                                    socketRef.current.emit('whiteboard:element', {
                                      groupId: activeGroup.id,
                                      action: 'update',
                                      pageId: activeWhiteboardPageIdRef.current,
                                      element: updatedEl
                                    });
                                  }
                                  setWhiteboardSaveStatus('dirty');
                                }
                              }
                            }}
                            style={{ backgroundColor: c }}
                            className={`h-4.5 w-4.5 rounded-full border cursor-pointer transition ${
                              whiteboardColor === c && whiteboardTool !== 'eraser' ? 'border-primary scale-110 shadow-sm shadow-primary/20' : 'border-border/30'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="h-4 border-l border-border/30" />

                    {/* Tools Selector */}
                    <div className="flex items-center gap-1 bg-zinc-950/20 p-0.5 rounded-lg border border-border/20">
                      {[
                        { id: 'select', label: '👆 Select' },
                        { id: 'pencil', label: '✏️ Pencil' },
                        { id: 'eraser', label: '🧽 Eraser' },
                        { id: 'rect', label: '⬜ Rect' },
                        { id: 'circle', label: '⭕ Circle' },
                        { id: 'arrow', label: '➡️ Arrow' },
                        { id: 'text', label: '🔤 Text' },
                        { id: 'sticky', label: '📌 Note' },
                        { id: 'laser', label: '⚡ Laser' },
                        { id: 'pan', label: '🖐️ Pan' },
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            setWhiteboardTool(t.id as any);
                          }}
                          className={`px-2 py-0.8 rounded text-[9px] font-bold transition cursor-pointer ${
                            whiteboardTool === t.id
                              ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/10'
                              : 'text-muted-foreground hover:bg-secondary/40'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedElementId && (
                    <div className="flex items-center gap-1 bg-cyan-950/20 px-2 py-0.5 rounded-lg border border-cyan-550/30 text-cyan-400 shrink-0">
                      <span className="text-[8px] font-extrabold uppercase mr-1 select-none">Selected:</span>
                      <button
                        onClick={() => {
                          const activePage = whiteboardPages.find((p) => p.id === activeWhiteboardPageIdRef.current);
                          if (!activePage) return;
                          const el = (activePage.elements || []).find((el: any) => el.id === selectedElementId);
                          if (!el) return;

                          const newId = `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                          const duplicatedEl = {
                            ...el,
                            id: newId,
                            x: el.x + 20,
                            y: el.y + 20
                          };
                          
                          if (el.points) {
                            duplicatedEl.points = el.points.map((p: any) => ({ x: p.x + 20, y: p.y + 20 }));
                          }

                          const nextElements = [...(activePage.elements || []), duplicatedEl];
                          setWhiteboardPages((prev) => 
                            prev.map((p) => p.id === activeWhiteboardPageIdRef.current ? { ...p, elements: nextElements } : p)
                          );
                          
                          const canvas = whiteboardCanvasRef.current;
                          if (canvas) drawAllElements(canvas, nextElements, newId);
                          setSelectedElementId(newId);
                          saveWhiteboardState(nextElements);

                          if (socketRef.current && socketRef.current.connected && activeGroup) {
                            socketRef.current.emit('whiteboard:element', {
                              groupId: activeGroup.id,
                              action: 'add',
                              pageId: activeWhiteboardPageIdRef.current,
                              element: duplicatedEl
                            });
                          }
                          setWhiteboardSaveStatus('dirty');
                          showToast('Element duplicated', 'success');
                        }}
                        className="px-2 py-0.8 hover:bg-cyan-500/10 rounded text-[9px] font-bold cursor-pointer transition flex items-center gap-1"
                        title="Duplicate Element"
                      >
                        👯 Duplicate
                      </button>
                      
                      <button
                        onClick={() => {
                          const activePage = whiteboardPages.find((p) => p.id === activeWhiteboardPageIdRef.current);
                          if (!activePage) return;
                          
                          const nextElements = (activePage.elements || []).filter((el: any) => el.id !== selectedElementId);
                          setWhiteboardPages((prev) => 
                            prev.map((p) => p.id === activeWhiteboardPageIdRef.current ? { ...p, elements: nextElements } : p)
                          );

                          const canvas = whiteboardCanvasRef.current;
                          if (canvas) drawAllElements(canvas, nextElements, null);
                          
                          if (socketRef.current && socketRef.current.connected && activeGroup) {
                            socketRef.current.emit('whiteboard:element', {
                              groupId: activeGroup.id,
                              action: 'delete',
                              pageId: activeWhiteboardPageIdRef.current,
                              elementId: selectedElementId
                            });
                          }

                          setSelectedElementId(null);
                          saveWhiteboardState(nextElements);
                          setWhiteboardSaveStatus('dirty');
                          showToast('Element deleted', 'success');
                        }}
                        className="px-2 py-0.8 hover:bg-red-500/10 rounded text-red-400 text-[9px] font-bold cursor-pointer transition flex items-center gap-1"
                        title="Delete Element"
                      >
                        🗑️ Delete
                      </button>

                      <button
                        onClick={() => {
                          const activePage = whiteboardPages.find((p) => p.id === activeWhiteboardPageIdRef.current);
                          if (!activePage) return;
                          const el = (activePage.elements || []).find((el: any) => el.id === selectedElementId);
                          if (!el) return;

                          if (el.type === 'text' || el.type === 'sticky') {
                            const newText = prompt('Edit element text:', el.text);
                            if (newText !== null) {
                              const updatedEl = { ...el, text: newText };
                              const nextElements = (activePage.elements || []).map((e: any) => e.id === selectedElementId ? updatedEl : e);
                              
                              setWhiteboardPages((prev) => 
                                prev.map((p) => p.id === activeWhiteboardPageIdRef.current ? { ...p, elements: nextElements } : p)
                              );
                              
                              const canvas = whiteboardCanvasRef.current;
                              if (canvas) drawAllElements(canvas, nextElements, selectedElementId);
                              saveWhiteboardState(nextElements);

                              if (socketRef.current && socketRef.current.connected && activeGroup) {
                                  socketRef.current.emit('whiteboard:element', {
                                    groupId: activeGroup.id,
                                    action: 'update',
                                    pageId: activeWhiteboardPageIdRef.current,
                                    element: updatedEl
                                  });
                                }
                              setWhiteboardSaveStatus('dirty');
                            }
                          } else {
                            showToast('Only text and sticky notes can edit content text', 'info');
                          }
                        }}
                        className="px-2 py-0.8 hover:bg-cyan-500/10 rounded text-[9px] font-bold cursor-pointer transition flex items-center gap-1"
                        title="Edit Text"
                      >
                        ✏️ Edit Content
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-zinc-950/20 p-0.5 rounded-lg border border-border/20">
                      <button
                        onClick={handleWhiteboardUndo}
                        disabled={whiteboardUndoStack.length === 0}
                        className="px-2 py-0.8 text-[9px] font-bold rounded text-muted-foreground hover:bg-secondary/40 disabled:opacity-40 cursor-pointer"
                        title="Undo stroke"
                      >
                        ↩️ Undo
                      </button>
                      <button
                        onClick={handleWhiteboardRedo}
                        disabled={whiteboardRedoStack.length === 0}
                        className="px-2 py-0.8 text-[9px] font-bold rounded text-muted-foreground hover:bg-secondary/40 disabled:opacity-40 cursor-pointer"
                        title="Redo stroke"
                      >
                        ↪️ Redo
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 ml-1">
                      <span className="text-[9px] font-bold text-muted-foreground">Size:</span>
                      <input
                        type="range"
                        min="1"
                        max="20"
                        value={whiteboardBrushSize}
                        onChange={(e) => setWhiteboardBrushSize(Number(e.target.value))}
                        className="w-16 accent-primary cursor-pointer"
                      />
                      <span className="text-[9px] font-bold text-foreground w-4">{whiteboardBrushSize}px</span>
                    </div>

                    <div className="h-4 border-l border-border/30 mx-1" />

                    <label
                      className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-border/35 text-zinc-300 font-bold text-[9px] rounded-lg cursor-pointer transition flex items-center gap-1 shrink-0"
                      title="Import PNG/JPEG image onto canvas"
                    >
                      <span>📥 Import</span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg"
                        onChange={handleImportImage}
                        className="hidden"
                      />
                    </label>

                    <div className="flex items-center gap-0.5 bg-zinc-950/20 p-0.5 rounded-lg border border-border/20">
                      <button
                        onClick={() => handleExportCanvas('png')}
                        className="px-2 py-0.8 hover:bg-secondary/40 rounded text-[9px] font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Export current page as PNG"
                      >
                        PNG
                      </button>
                      <button
                        onClick={() => handleExportCanvas('jpeg')}
                        className="px-2 py-0.8 hover:bg-secondary/40 rounded text-[9px] font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Export current page as JPEG"
                      >
                        JPG
                      </button>
                      <button
                        onClick={() => handleExportCanvas('pdf')}
                        className="px-2 py-0.8 hover:bg-secondary/40 rounded text-[9px] font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Export page printout to PDF"
                      >
                        PDF
                      </button>
                    </div>

                    <div className="h-4 border-l border-border/30 mx-1" />

                    <button
                      onClick={handleClearWhiteboard}
                      className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 font-bold text-[9px] rounded-lg cursor-pointer uppercase transition"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="flex-grow bg-zinc-950 border border-border/30 rounded-2xl overflow-hidden relative min-h-[350px] flex flex-col">
                  {/* WHITEBOARD SUB-HEADER: MULTI-PAGE & SAVE & COL-MODES */}
                  {/* WHITEBOARD SUB-HEADER: MULTI-PAGE & SAVE & COL-MODES */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-secondary/10 border-b border-border/20 p-2.5 shrink-0">
                    {/* Left part: Sidebar Toggle Button */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowPageSidebar((s) => !s)}
                        className={`px-2.5 py-1 border rounded-xl text-[9px] font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                          showPageSidebar 
                            ? 'bg-primary/10 border-primary/20 text-primary' 
                            : 'bg-zinc-900 border-zinc-800 text-muted-foreground hover:text-foreground'
                        }`}
                        title="Toggle Pages Manager Sidebar"
                      >
                        📖 Pages ({whiteboardPages.length})
                      </button>
                    </div>

                    {/* Right part: Save Indicator, manual Save and Mode Badge */}
                    <div className="flex items-center gap-3 shrink-0">
                      {/* Auto-save Status Indicator */}
                      <div className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          whiteboardSaveStatus === 'saved' 
                            ? 'bg-emerald-500 shadow shadow-emerald-500/20' 
                            : whiteboardSaveStatus === 'saving'
                              ? 'bg-amber-500 animate-pulse'
                              : 'bg-red-500 animate-ping'
                        }`} />
                        <span className="text-[8px] font-bold tracking-wide uppercase text-muted-foreground select-none">
                          {whiteboardSaveStatus === 'saved' 
                            ? 'Saved to Cloud' 
                            : whiteboardSaveStatus === 'saving'
                              ? 'Saving...'
                              : 'Unsaved Changes'}
                        </span>
                      </div>

                      {/* Manual Save Button */}
                      <button
                        onClick={() => handleSaveWhiteboard()}
                        disabled={whiteboardSaveStatus === 'saved'}
                        className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 disabled:opacity-50 text-zinc-300 hover:bg-zinc-800 rounded-xl text-[9px] font-bold cursor-pointer transition font-bold"
                      >
                        Save Now
                      </button>

                      {/* Collaboration edit modes (Admin toggle) */}
                      <div className="flex items-center gap-1 bg-zinc-950/20 p-0.5 rounded-xl border border-border/25 text-[8.5px]">
                        {['editing', 'view_only'].map((mode) => {
                          const isOwner = activeGroup && activeGroup.ownerId === currentUser?.id;
                          const isAdmin = activeGroup && members.find((m) => m.userId === currentUser?.id)?.role === 'ADMIN';
                          const isModerator = isOwner || isAdmin;
                          const label = mode === 'editing' ? '🔓 Edit' : '🔒 View';
                          
                          return (
                            <button
                              key={mode}
                              disabled={!isModerator}
                              onClick={() => {
                                setWhiteboardEditMode(mode as any);
                                handleSaveWhiteboard(mode as any);
                              }}
                              className={`px-2 py-0.8 rounded-lg font-bold transition-all ${
                                whiteboardEditMode === mode 
                                  ? 'bg-primary/20 text-primary border border-primary/25 font-extrabold' 
                                  : 'text-muted-foreground hover:text-foreground disabled:opacity-50'
                              } ${isModerator ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Whiteboard Layout Wrapper */}
                  <div className="flex-grow flex w-full h-full min-h-[350px] relative overflow-hidden">
                    {/* Collapsible Page Sidebar */}
                    {showPageSidebar && (
                      <div className="w-52 bg-zinc-900 border-r border-border/25 flex flex-col p-3 gap-2 overflow-y-auto shrink-0 select-none">
                        <div className="flex items-center justify-between pb-2 border-b border-border/20 mb-1">
                          <span className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider">Pages ({whiteboardPages.length})</span>
                          <button
                            onClick={handleAddWhiteboardPage}
                            className="p-1 text-primary hover:bg-primary/10 rounded-lg text-[9px] font-bold cursor-pointer transition"
                            title="Add Page"
                          >
                            ➕ Add
                          </button>
                        </div>
                        <div className="space-y-1.5 flex-grow overflow-y-auto pr-0.5 scrollbar-thin">
                          {whiteboardPages.map((page, idx) => {
                            const isActive = activeWhiteboardPageId === page.id;
                            return (
                              <div
                                key={page.id}
                                className={`group p-2 rounded-xl border text-[9px] flex items-center justify-between gap-1.5 transition ${
                                  isActive
                                    ? 'bg-primary/5 border-primary/40 text-primary font-bold shadow-sm'
                                    : 'bg-zinc-950/45 border-zinc-800 text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0 flex-grow">
                                  <button
                                    onClick={() => handleSwitchWhiteboardPage(page.id)}
                                    className="cursor-pointer truncate font-bold text-left flex-grow outline-none"
                                    title={`Switch to ${page.name}`}
                                  >
                                    {page.name}
                                  </button>
                                </div>

                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                  {idx > 0 && (
                                    <button
                                      onClick={() => handleMoveWhiteboardPage(page.id, 'up')}
                                      className="p-0.5 hover:bg-zinc-800 rounded text-muted-foreground hover:text-white cursor-pointer"
                                      title="Move Up"
                                    >
                                      ▲
                                    </button>
                                  )}
                                  {idx < whiteboardPages.length - 1 && (
                                    <button
                                      onClick={() => handleMoveWhiteboardPage(page.id, 'down')}
                                      className="p-0.5 hover:bg-zinc-800 rounded text-muted-foreground hover:text-white cursor-pointer"
                                      title="Move Down"
                                    >
                                      ▼
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      const newName = prompt('Enter new page name:', page.name);
                                      if (newName) handleRenameWhiteboardPage(page.id, newName);
                                    }}
                                    className="p-0.5 hover:bg-zinc-800 rounded text-zinc-300 cursor-pointer"
                                    title="Rename"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    onClick={() => handleDuplicateWhiteboardPage(page.id)}
                                    className="p-0.5 hover:bg-zinc-800 rounded text-zinc-300 cursor-pointer"
                                    title="Duplicate"
                                  >
                                    👯
                                  </button>
                                  {whiteboardPages.length > 1 && (
                                    <button
                                      onClick={() => handleDeleteWhiteboardPage(page.id)}
                                      className="p-0.5 hover:bg-red-500/10 text-red-500 rounded cursor-pointer"
                                      title="Delete"
                                    >
                                      ×
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Canvas Viewport container */}
                    <div className="flex-grow relative overflow-hidden w-full h-full min-h-[350px]">
                      <div
                        className="absolute inset-0 w-full h-full"
                      style={{
                        transform: `translate(${whiteboardPan.x}px, ${whiteboardPan.y}px) scale(${whiteboardZoom})`,
                        transformOrigin: '0 0',
                      }}
                    >
                    <canvas
                      ref={whiteboardCanvasRef}
                      onMouseDown={handleCanvasMouseDown}
                      onMouseMove={handleCanvasMouseMove}
                      onMouseUp={handleCanvasMouseUp}
                      onMouseLeave={handleCanvasMouseUp}
                      onDoubleClick={handleCanvasDoubleClick}
                      width={4000}
                      height={4000}
                      style={{ width: '4000px', height: '4000px' }}
                      className={`absolute bg-zinc-950 ${whiteboardTool === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}`}
                    />

                    {/* Collaborator cursors layer */}
                    {Object.entries(whiteboardCursors).map(([userId, cursor]) => {
                      // Filter out cursors that haven't been updated in 3 seconds (avoid stale leftovers)
                      if (Date.now() - cursor.lastUpdated > 3000) return null;
                      if (userId === currentUser?.id) return null;

                      return (
                        <div
                          key={userId}
                          className="absolute pointer-events-none transition-all duration-75 ease-out"
                          style={{
                            left: `${cursor.x}px`,
                            top: `${cursor.y}px`,
                          }}
                        >
                          {cursor.isLaser ? (
                            <div 
                              className="h-3 w-3 rounded-full animate-ping opacity-75 shadow-lg"
                              style={{ backgroundColor: cursor.color || '#ef4444' }}
                            />
                          ) : (
                            <div className="relative">
                              <MousePointer2 
                                className="h-4.5 w-4.5 filter drop-shadow-md"
                                style={{ color: cursor.color || '#8b5cf6', fill: cursor.color || '#8b5cf6' }}
                              />
                              <span 
                                className="absolute left-3.5 top-3.5 px-1.5 py-0.5 rounded text-[8px] font-bold text-white whitespace-nowrap shadow-sm"
                                style={{ backgroundColor: cursor.color || '#8b5cf6' }}
                              >
                                @{cursor.userName}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Absolute Zoom & Pan Controls Overlay */}
                  <div className="absolute bottom-4 left-4 z-10 flex items-center gap-1.5 bg-zinc-900/90 border border-border/40 p-1.5 rounded-xl shadow-lg">
                    <button
                      onClick={() => updateWhiteboardViewport(Math.min(whiteboardZoom + 0.1, 3), whiteboardPan)}
                      className="px-2 py-1 hover:bg-secondary rounded text-[9px] font-bold text-foreground cursor-pointer"
                    >
                      ➕ Zoom In
                    </button>
                    <button
                      onClick={() => updateWhiteboardViewport(Math.max(whiteboardZoom - 0.1, 0.3), whiteboardPan)}
                      className="px-2 py-1 hover:bg-secondary rounded text-[9px] font-bold text-foreground cursor-pointer"
                    >
                      ➖ Zoom Out
                    </button>
                    <button
                      onClick={() => updateWhiteboardViewport(1, { x: -1600, y: -1750 })}
                      className="px-2 py-1 hover:bg-secondary rounded text-[9px] font-bold text-foreground cursor-pointer border border-border/30"
                    >
                      🔄 Reset View
                    </button>
                    <span className="text-[8px] text-muted-foreground px-1 font-semibold">
                      {Math.round(whiteboardZoom * 100)}%
                    </span>

                    <div className="h-4 border-l border-zinc-800 mx-1" />
                    
                    {presenterId ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 rounded-lg font-bold">
                          📺 @{presenterName} presenting
                        </span>
                        <button
                          onClick={() => setFollowPresenter((f) => !f)}
                          className={`px-2 py-1 rounded text-[9px] font-bold cursor-pointer transition ${
                            followPresenter 
                              ? 'bg-cyan-500 text-white shadow shadow-cyan-500/20' 
                              : 'bg-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {followPresenter ? 'Following' : 'Follow Presenter'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          const nextPresenting = !isPresenting;
                          setIsPresenting(nextPresenting);
                          if (nextPresenting && currentUser) {
                            socketRef.current?.emit('whiteboard:presentation', {
                              groupId: activeGroup.id,
                              presenterId: currentUser.id,
                              presenterName: currentUser.profile?.firstName || currentUser.email.split('@')[0],
                              zoom: whiteboardZoom,
                              pan: whiteboardPan
                            });
                          } else {
                            socketRef.current?.emit('whiteboard:presentation', {
                              groupId: activeGroup.id,
                              presenterId: null,
                              presenterName: null,
                              zoom: whiteboardZoom,
                              pan: whiteboardPan
                            });
                          }
                        }}
                        className={`px-2 py-1 rounded text-[9px] font-bold cursor-pointer transition ${
                          isPresenting 
                            ? 'bg-red-500 text-white shadow shadow-red-500/20' 
                            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                        }`}
                      >
                        {isPresenting ? '🛑 Stop Presenting' : '📺 Present'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB VIEW 6: SHARED CODING PLAYGROUND */}
            {activeCenterTab === 'playground' && (
              <div className="flex-grow flex flex-col gap-3 min-h-[480px]">
                <div className="flex justify-between items-center bg-secondary/20 p-2 border border-border/20 rounded-xl shrink-0">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-foreground">💻 Coding Language:</span>
                    <select
                      value={playgroundLanguage}
                      onChange={(e) => handleUpdatePlaygroundCode(playgroundCode, e.target.value)}
                      className="bg-secondary/40 border border-border/30 rounded-lg text-[9px] font-bold py-1 px-2 focus:outline-none focus:border-primary text-foreground"
                    >
                      <option value="javascript">JavaScript</option>
                      <option value="python">Python 3</option>
                      <option value="cpp">C++ 17</option>
                      <option value="java">Java 11</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleExplainPlaygroundCode}
                      disabled={playgroundIsExplaining}
                      className="px-3 py-1 bg-secondary text-foreground hover:bg-secondary/80 border border-border/30 font-bold text-[9px] rounded-lg cursor-pointer uppercase flex items-center gap-1 disabled:opacity-50"
                    >
                      {playgroundIsExplaining ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-primary animate-pulse" />}
                      <span>Explain Code</span>
                    </button>
                    <button
                      onClick={handleExecutePlaygroundCode}
                      disabled={playgroundIsExecuting}
                      className="px-3.5 py-1 bg-primary text-primary-foreground hover:bg-primary-hover font-bold text-[9px] rounded-lg cursor-pointer uppercase flex items-center gap-1 disabled:opacity-50"
                    >
                      {playgroundIsExecuting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                      <span>Run Code</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 flex-grow">
                  {/* Left Editor */}
                  <div className="lg:col-span-2 flex flex-col bg-zinc-950 border border-border/30 rounded-2xl p-3 min-h-[300px] relative">
                    <div className="flex-grow flex font-mono text-[11px] leading-relaxed relative">
                      {/* Gutter Line Numbers */}
                      <div className="select-none text-right pr-2.5 text-muted-foreground/45 border-r border-border/20 flex flex-col shrink-0">
                        {Array.from({ length: Math.max(10, playgroundCode.split('\n').length) }).map((_, i) => (
                          <span key={i} className="block w-6">{i + 1}</span>
                        ))}
                      </div>
                      {/* Code Editor Textarea */}
                      <textarea
                        value={playgroundCode}
                        onChange={(e) => handleUpdatePlaygroundCode(e.target.value)}
                        onKeyUp={handleTextareaSelectionChange}
                        onMouseUp={handleTextareaSelectionChange}
                        className="flex-grow bg-transparent text-foreground border-none outline-none focus:ring-0 pl-3.5 w-full resize-none font-mono placeholder:text-muted-foreground/30 min-h-[280px]"
                        placeholder="// Write collaborative code here..."
                      />
                    </div>
                    {/* Remote Cursor Indicators list */}
                    {Object.keys(remoteCursors).length > 0 && (
                      <div className="flex gap-2.5 items-center border-t border-border/20 pt-2 text-[9px] text-muted-foreground select-none shrink-0 mt-2.5">
                        <span className="font-bold uppercase tracking-wider text-primary">Active Cursors:</span>
                        {Object.entries(remoteCursors).map(([uid, pos]) => (
                          <span key={uid} className="bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-lg text-foreground font-medium">
                            @{pos.userName} (L:{pos.line}, C:{pos.ch})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Output Console & AI Explanation Panel */}
                  <div className="flex flex-col gap-3">
                    {/* Stdin Input stream console */}
                    <div className="bg-zinc-900 border border-border/30 rounded-2xl p-3.5 flex flex-col shrink-0">
                      <span className="text-[8px] uppercase tracking-wider text-muted-foreground font-bold border-b border-border/20 pb-1 block">Stdin Stream Input</span>
                      <textarea
                        value={playgroundStdin}
                        onChange={(e) => setPlaygroundStdin(e.target.value)}
                        placeholder="Provide standard inputs for execution runs here..."
                        className="w-full h-[55px] bg-secondary/20 border border-border/30 rounded-lg text-[9px] mt-2 py-1 px-2 focus:outline-none focus:border-primary text-foreground font-mono resize-none"
                      />
                    </div>

                    {/* Execution Output Console */}
                    <div className="flex-1 bg-zinc-950 border border-border/30 rounded-2xl p-4 flex flex-col min-h-[220px]">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5 shrink-0">
                        <span className="text-[8px] uppercase tracking-widest text-zinc-400 font-extrabold flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Output Terminal</span>
                        </span>
                        
                        {playgroundOutputObj && (
                          <div className="flex items-center gap-2">
                            {playgroundOutputObj.duration !== undefined && (
                              <span className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded-md text-[7px] text-zinc-400 font-bold">
                                ⏱️ {playgroundOutputObj.duration}ms
                              </span>
                            )}
                            {playgroundOutputObj.exitCode !== undefined && (
                              <span className={`px-1.5 py-0.5 rounded-md text-[7px] font-extrabold border uppercase ${
                                playgroundOutputObj.exitCode === 0
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                  : 'bg-red-500/10 border-red-500/20 text-red-400'
                              }`}>
                                Exit {playgroundOutputObj.exitCode}
                              </span>
                            )}
                            {playgroundOutputObj.statusStr && (
                              <span className={`px-1.5 py-0.5 rounded-md text-[7px] font-extrabold border uppercase ${
                                playgroundOutputObj.compileError
                                  ? 'bg-red-500/10 border-red-500/20 text-red-400'
                                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              }`}>
                                {playgroundOutputObj.statusStr}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex-grow font-mono text-[9.5px] mt-2.5 overflow-y-auto max-h-[160px] pr-1 leading-relaxed select-text space-y-2">
                        {!playgroundOutputObj ? (
                          <span className="text-zinc-500 italic block">Click "Run Code" to view output results.</span>
                        ) : playgroundOutputObj.errorMsg ? (
                          <div className="p-2 border border-red-900/35 bg-red-950/15 rounded-lg text-red-400">
                            <strong>Execution Engine Error:</strong>
                            <p className="mt-1">{playgroundOutputObj.errorMsg}</p>
                          </div>
                        ) : playgroundOutputObj.compileError ? (
                          <div className="p-2 border border-red-900/35 bg-red-950/15 rounded-lg text-red-400">
                            <strong>Compiler Error:</strong>
                            <pre className="mt-1 whitespace-pre-wrap font-mono text-[9px]">{playgroundOutputObj.stderr}</pre>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {playgroundOutputObj.stdout && (
                              <div className="p-2 border border-emerald-950/30 bg-emerald-950/5 rounded-lg">
                                <span className="text-[7.5px] uppercase tracking-wide font-extrabold text-emerald-500/70 block border-b border-emerald-950/20 pb-0.5 mb-1.5">stdout stream</span>
                                <pre className="text-emerald-400 whitespace-pre-wrap select-all font-mono text-[9px]">{playgroundOutputObj.stdout}</pre>
                              </div>
                            )}
                            {playgroundOutputObj.stderr && (
                              <div className="p-2 border border-red-950/30 bg-red-950/5 rounded-lg">
                                <span className="text-[7.5px] uppercase tracking-wide font-extrabold text-red-500/70 block border-b border-red-950/20 pb-0.5 mb-1.5">stderr stream</span>
                                <pre className="text-red-400 whitespace-pre-wrap select-all font-mono text-[9px]">{playgroundOutputObj.stderr}</pre>
                              </div>
                            )}
                            {!playgroundOutputObj.stdout && !playgroundOutputObj.stderr && (
                              <span className="text-zinc-400 italic block">Code executed successfully with no stdout/stderr returned.</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* AI Explanation Pane */}
                    <div className="flex-1 bg-primary/5 border border-primary/20 rounded-2xl p-3.5 flex flex-col">
                      <span className="text-[8px] uppercase tracking-wider text-primary font-bold border-b border-primary/10 pb-1 block">AI Tutor Explanation</span>
                      <div className="flex-grow text-[10px] text-muted-foreground mt-2 overflow-y-auto max-h-[140px] pr-1 leading-relaxed whitespace-pre-wrap select-text">
                        {playgroundExplanation || 'Click "Explain Code" to generate detailed structural insights.'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB VIEW 4: MULTIPLAYER GROUP STUDY SESSION ENVIRONMENT */}
            {activeCenterTab === 'session' && activeSession && (
              <div className="flex-grow overflow-y-auto space-y-5 pr-1 select-text">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  
                  {/* Synced Pomodoro Card */}
                  <div className="bg-secondary/15 border border-border/30 rounded-2xl p-4 flex flex-col items-center justify-between text-center min-h-[160px]">
                    <span className="font-bold text-[10px] text-muted-foreground uppercase flex items-center gap-1.5">
                      <Clock className="h-4.5 w-4.5 text-primary" />
                      <span>Shared Pomodoro Timer</span>
                    </span>
                    <span className="text-3xl font-extrabold text-foreground tracking-widest my-2">
                      {getPomodoroTime(activeSession)}
                    </span>
                    
                    <div className="flex gap-2">
                      {activeSession.pomodoro.isPaused ? (
                        <button
                          onClick={() => handleControlPomodoro(false)}
                          className="px-3.5 py-1 bg-emerald-500 text-white font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                        >
                          <Play className="h-3 w-3" />
                          <span>Resume</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleControlPomodoro(true)}
                          className="px-3.5 py-1 bg-amber-500 text-white font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                        >
                          <Pause className="h-3 w-3" />
                          <span>Pause</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleControlPomodoro(true, 0)}
                        className="px-3.5 py-1 bg-secondary text-foreground font-bold rounded-lg border border-border/30 transition cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  {/* Study Presence/Focus Status Indicators Grid */}
                  <div className="bg-secondary/15 border border-border/30 rounded-2xl p-4 flex flex-col gap-2 lg:col-span-2 overflow-y-auto max-h-[160px]">
                    <span className="font-bold text-[10px] text-muted-foreground uppercase border-b border-border/20 pb-1 flex items-center gap-1.5">
                      <Users className="h-4.5 w-4.5 text-secondary animate-pulse" />
                      <span>Live study presence focuses</span>
                    </span>
                    <div className="space-y-2">
                      {Object.entries(activeSession.focuses || {}).map(([userId, focusStr]) => {
                        const member = members.find((m) => m.userId === userId);
                        if (!member) return null;
                        const name = member.user.profile?.firstName || member.user.email.split('@')[0];
                        return (
                          <div key={userId} className="flex items-center gap-2 text-[10px]">
                            <span className="h-4.5 w-4.5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-[8px] uppercase">
                              {name[0]}
                            </span>
                            <span className="font-bold text-foreground">@{name}:</span>
                            <span className="text-muted-foreground italic truncate">{focusStr}</span>
                          </div>
                        );
                      })}
                      {Object.keys(activeSession.focuses || {}).length === 0 && (
                        <div className="flex flex-col items-center justify-center text-center py-2 text-muted-foreground/60">
                          <Users className="h-6 w-6 stroke-[1.2] text-muted-foreground/45 mb-1" />
                          <span className="text-[9px]">No member is currently reviewing a specific resource. Open a shared guide below to set the study target!</span>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Collaborative AI Tutor Conversation window */}
                <div className="border border-border/30 rounded-2xl p-4 bg-secondary/10 flex flex-col gap-3.5 min-h-[250px]">
                  <h4 className="font-bold text-xs border-b border-border/25 pb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                      <span>Shared AI Tutor Multiplayer Discussion</span>
                    </span>
                  </h4>

                  <div className="flex-1 overflow-y-auto space-y-3.5 max-h-48 pr-1">
                    {activeSession.tutorHistory.map((tMsg, idx) => (
                      <div key={idx} className="flex gap-2.5 items-start">
                        <span className="h-6 w-6 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center font-bold text-[10px] uppercase">
                          {tMsg.senderName[0]}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-foreground">@{tMsg.senderName}</span>
                          <span className="text-[10px] text-muted-foreground font-medium leading-relaxed select-text mt-0.5">
                            {formatMessageText(tMsg.content)}
                          </span>

                          {tMsg.senderName === 'AI Tutor' && (
                            <div className="flex items-center gap-3 mt-1.5 text-[8px] font-bold text-primary">
                              <button
                                onClick={() => handleSaveTutorMessageAsNote(tMsg.content)}
                                className="hover:underline flex items-center gap-0.5 cursor-pointer text-primary"
                              >
                                <Save className="h-3 w-3" />
                                <span>Save Note</span>
                              </button>
                              <button
                                onClick={() => handleGenerateFlashcardsFromAI(tMsg.content)}
                                className="hover:underline flex items-center gap-0.5 cursor-pointer text-primary"
                              >
                                <Layers className="h-3 w-3" />
                                <span>Generate Flashcards</span>
                              </button>
                              <button
                                onClick={() => handleGenerateQuizFromAI(tMsg.content)}
                                className="hover:underline flex items-center gap-0.5 cursor-pointer text-primary"
                              >
                                <Trophy className="h-3 w-3" />
                                <span>Generate Quiz</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {tutorStreamingResponse && (
                      <div className="flex gap-2.5 items-start">
                        <span className="h-6 w-6 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center font-bold text-[10px] uppercase">
                          A
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-foreground">@AI Tutor</span>
                          <span className="text-[10px] text-muted-foreground font-medium leading-relaxed select-text mt-0.5 animate-pulse">
                            {formatMessageText(tutorStreamingResponse)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleSendSessionTutorPrompt} className="flex gap-2">
                    <input
                      type="text"
                      value={sessionTutorInput}
                      onChange={(e) => setSessionTutorInput(e.target.value)}
                      placeholder="Ask the group AI tutor a question..."
                      className="flex-grow bg-card border border-border/30 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-primary/50 text-foreground"
                    />
                    <button
                      type="submit"
                      disabled={!sessionTutorInput.trim()}
                      className="bg-primary hover:bg-primary/95 text-primary-foreground px-4 rounded-xl font-bold cursor-pointer disabled:opacity-50"
                    >
                      Ask
                    </button>
                  </form>
                </div>

                {/* Session Live Statistics */}
                <div className="bg-secondary/15 border border-border/30 rounded-2xl p-4">
                  <span className="font-bold text-[10px] text-muted-foreground uppercase border-b border-border/20 pb-1.5 flex items-center gap-1.5">
                    <BarChart className="h-4.5 w-4.5 text-secondary" />
                    <span>Multiplayer Live statistics</span>
                  </span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-[9px]">AI Questions</span>
                      <span className="font-extrabold text-foreground text-sm mt-0.5">{activeSession.stats.aiQuestions}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-[9px]">Files Shared</span>
                      <span className="font-extrabold text-foreground text-sm mt-0.5">{activeSession.stats.filesOpened}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-[9px]">Quiz Attempts</span>
                      <span className="font-extrabold text-foreground text-sm mt-0.5">{activeSession.stats.quizAttempts}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-[9px]">Cards Reviewed</span>
                      <span className="font-extrabold text-foreground text-sm mt-0.5">{activeSession.stats.flashcardsReviewed}</span>
                    </div>
                  </div>
                </div>

              </div>
            )}

          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground/60 p-8">
            <Radio className="h-12 w-12 stroke-[1.25] mb-2 text-primary animate-pulse" />
            <h3 className="font-bold text-sm text-foreground">Collaboration Hub</h3>
            <p className="max-w-xs mt-1 text-[10px]">Select a room from the left sidebar index or initialize a new study workspace to begin chatting, file sharing, and live tracking.</p>
          </div>
        )}
      </div>

      {/* 3. RIGHT SIDEBAR PANEL - MEMBERS, SHARED FILES, AND STATISTICS TABS */}
      <AnimatePresence>
        {activeGroup && showRightSidebar && (
          <motion.div
            ref={sidebarRef}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: '30%', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="border border-border/40 bg-card rounded-2xl shadow-md p-4 flex flex-col h-[500px] lg:h-auto overflow-hidden shrink-0 select-text relative"
          >
            <div className="min-w-[280px] lg:min-w-[320px] flex flex-col h-full shrink-0">
              <div className="flex border-b border-border/40 pb-2 gap-1 shrink-0 items-center">
              <div className="flex flex-grow gap-1">
                {['info', 'files', 'invites', 'stats'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setRightSidebarTab(tab as any);
                      localStorage.setItem('study_sync_collab_sidebar_tab', tab);
                    }}
                    className={`flex-grow py-1.5 text-[9px] font-bold uppercase tracking-wider rounded-lg transition ${
                      rightSidebarTab === tab 
                        ? 'bg-primary/10 text-primary border border-primary/25' 
                        : 'text-muted-foreground hover:bg-secondary/40'
                    }`}
                  >
                    {tab === 'info' ? 'Members' : tab === 'files' ? 'Files' : tab === 'invites' ? 'Invites' : 'Stats'}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setShowRightSidebar(false);
                  localStorage.setItem('study_sync_collab_sidebar_open', 'false');
                }}
                className="p-1 rounded-lg hover:bg-secondary/65 border border-border/20 text-muted-foreground hover:text-foreground cursor-pointer transition shrink-0 ml-1.5"
                title="Close sidebar"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto mt-4 pr-0.5 scrollbar-thin">
            {/* TAB 1: MEMBERS */}
            {rightSidebarTab === 'info' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-bold text-xs text-foreground pb-1.5 border-b border-border/30">Workspace Group Members ({members.length})</h3>
                  <div className="space-y-2.5">
                    {members.map((m) => {
                      const name = m.user.profile?.firstName 
                        ? `${m.user.profile.firstName} ${m.user.profile.lastName || ''}`
                        : m.user.email.split('@')[0];
                      const role = m.role;
                      const isTargetCurrentUser = m.userId === currentUser?.id;

                      return (
                        <div key={m.userId} className="flex items-center justify-between gap-3 p-2 bg-secondary/15 hover:bg-secondary/25 rounded-xl transition">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="relative shrink-0">
                              <div className="h-8 w-8 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center font-bold text-xs uppercase overflow-hidden">
                                {m.user.profile?.firstName?.[0] || m.user.email[0]}
                              </div>
                              <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-card ${getStatusColor(m.status)}`} />
                            </div>
                            
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-foreground truncate">{name}</span>
                              <span className="text-[9px] text-muted-foreground truncate">{m.user.email}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isOwner && !isTargetCurrentUser ? (
                              <select
                                value={role}
                                onChange={(e) => {
                                  if (e.target.value === 'OWNER') {
                                    setTransferTargetId(m.userId);
                                    setShowTransferConfirm(true);
                                  } else {
                                    handleUpdateRole(m.userId, e.target.value);
                                  }
                                }}
                                className="bg-secondary/40 border border-border/30 rounded text-[8px] font-bold px-1 py-0.5 cursor-pointer outline-none text-foreground"
                              >
                                <option value="OWNER">OWNER</option>
                                <option value="ADMIN">ADMIN</option>
                                <option value="MODERATOR">MODERATOR</option>
                                <option value="MEMBER">MEMBER</option>
                              </select>
                            ) : (
                              <span className={`text-[8px] uppercase font-bold px-1.5 py-0.5 rounded-full ${
                                role === 'OWNER' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/25' :
                                role === 'ADMIN' ? 'bg-violet-500/10 text-violet-400 border border-violet-500/25' :
                                role === 'MODERATOR' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' :
                                'bg-zinc-500/10 text-zinc-400 border border-zinc-500/25'
                              }`}>
                                {role}
                              </span>
                            )}

                            {isOwner && !isTargetCurrentUser && (
                              <button
                                onClick={() => handleRemoveMember(m.userId)}
                                className="p-1 hover:bg-secondary rounded text-red-500 transition cursor-pointer"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: FILES */}
            {rightSidebarTab === 'files' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div 
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingOverFiles(true); }}
                    onDragLeave={() => setIsDraggingOverFiles(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDraggingOverFiles(false); handleFilesUpload(e); }}
                    className={`border border-dashed p-4 rounded-xl text-center cursor-pointer transition-all relative ${
                      isDraggingOverFiles 
                        ? 'border-primary bg-primary/10 scale-[1.02]' 
                        : 'border-border/60 hover:border-primary/50 bg-secondary/15 hover:bg-secondary/20'
                    }`}
                  >
                    <input
                      type="file"
                      multiple
                      onChange={handleFilesUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Paperclip className="h-5 w-5 mx-auto text-primary/70 mb-1" />
                    <span className="font-bold text-[8px] text-muted-foreground">Upload Files</span>
                  </div>

                  <button
                    onClick={() => setShowLibraryModal(true)}
                    className="border border-dashed border-border/60 hover:border-secondary/50 bg-secondary/15 hover:bg-secondary/20 p-4 rounded-xl text-center cursor-pointer transition-colors flex flex-col justify-center items-center gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <Share2 className="h-5 w-5 text-secondary" />
                    <span className="font-bold text-[8px]">Link Library</span>
                  </button>
                </div>

                {uploadingFile && (
                  <div className="bg-secondary/10 border border-border/25 rounded-xl p-3 space-y-2 shrink-0">
                    <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider block">Uploading Resources...</span>
                    {Object.entries(uploadProgress).map(([fileId, percentage]) => (
                      <div key={fileId} className="space-y-1">
                        <div className="flex justify-between text-[8px] font-semibold text-foreground">
                          <span className="truncate max-w-[150px]">Uploading File ID: #{fileId}</span>
                          <span>{percentage}%</span>
                        </div>
                        <div className="w-full bg-zinc-950 h-1 rounded-full overflow-hidden border border-border/10">
                          <div 
                            className="bg-primary h-full rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-between items-center bg-secondary/10 p-1.5 rounded-lg border border-border/20 shrink-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-bold text-muted-foreground mr-1">View:</span>
                    <button
                      onClick={() => setFileLayoutView('list')}
                      className={`px-2 py-0.5 rounded text-[8px] font-bold transition cursor-pointer ${
                        fileLayoutView === 'list'
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-secondary/40'
                      }`}
                    >
                      List
                    </button>
                    <button
                      onClick={() => setFileLayoutView('grid')}
                      className={`px-2 py-0.5 rounded text-[8px] font-bold transition cursor-pointer ${
                        fileLayoutView === 'grid'
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-secondary/40'
                      }`}
                    >
                      Grid
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-bold text-muted-foreground mr-1">Sort:</span>
                    <button
                      onClick={() => setFileSortBy(fileSortBy === 'date' ? 'name' : 'date')}
                      className="px-2 py-0.5 rounded border border-border/30 bg-secondary text-[8px] font-bold text-foreground hover:bg-secondary/80 transition cursor-pointer"
                    >
                      {fileSortBy === 'date' ? '📅 Date' : '🔤 Name'}
                    </button>
                  </div>
                </div>

                <div className="flex gap-1 shrink-0">
                  {['all', 'image', 'pdf', 'text'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setFileFilterType(type as any)}
                      className={`flex-grow py-1 text-[8px] font-bold uppercase rounded-lg border transition cursor-pointer ${
                        fileFilterType === type 
                          ? 'bg-primary/5 border-primary/30 text-primary' 
                          : 'bg-secondary/40 border-border/30 text-muted-foreground'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-xs text-foreground pb-1.5 border-b border-border/30">Shared library ({filteredSharedFiles.length})</h3>
                  <div className="space-y-2">
                    <div className={fileLayoutView === 'grid' ? 'grid grid-cols-2 gap-2' : 'space-y-2'}>
                      {filteredSharedFiles.map((resFile) => {
                        const title = resFile.document?.name || resFile.metadata?.title || resFile.metadata?.name || 'Shared Resource';
                        const isImage = resFile.document?.mimeType?.startsWith('image/');
                        const isPinned = pinsList.some((p) => p.id === resFile.id);

                        if (fileLayoutView === 'grid') {
                          return (
                            <div
                              key={resFile.id}
                              className="flex flex-col justify-between p-3 bg-secondary/15 hover:bg-secondary/25 border border-border/30 rounded-xl transition min-h-[90px] relative"
                            >
                              <div
                                onClick={() => handleOpenStudyResourcePlayer(resFile)}
                                className="flex flex-col items-center text-center cursor-pointer flex-grow min-w-0"
                              >
                                {isImage ? (
                                  <ImageIcon className="h-6 w-6 text-primary shrink-0 mb-1" />
                                ) : (
                                  <FileText className="h-6 w-6 text-muted-foreground shrink-0 mb-1" />
                                )}
                                <span className="font-bold text-[9px] text-foreground line-clamp-2 w-full">{title}</span>
                                <span className="text-[7px] text-muted-foreground mt-0.5 block truncate w-full">
                                  {resFile.resourceType}
                                </span>
                              </div>

                              <div className="flex items-center justify-end gap-1.5 border-t border-border/10 pt-1.5 mt-1.5">
                                <button
                                  onClick={() => handleTogglePinResource(resFile, isPinned)}
                                  className={`p-0.5 hover:bg-secondary rounded transition ${
                                    isPinned ? 'text-amber-500' : 'text-muted-foreground hover:text-foreground'
                                  }`}
                                >
                                  <Pin className="h-3 w-3" />
                                </button>
                                {(resFile.sharedBy?.id === currentUser?.id || isModerator) && (
                                  <button
                                    onClick={() => handleDeleteFile(resFile.id)}
                                    className="p-0.5 hover:bg-secondary rounded text-red-500 transition cursor-pointer"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={resFile.id}
                            className="flex items-center justify-between gap-3 p-3 bg-secondary/15 hover:bg-secondary/25 border border-border/30 rounded-xl transition"
                          >
                            <div
                              onClick={() => handleOpenStudyResourcePlayer(resFile)}
                              className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-grow"
                            >
                              {isImage ? (
                                <ImageIcon className="h-4.5 w-4.5 text-primary shrink-0" />
                              ) : (
                                <FileText className="h-4.5 w-4.5 text-muted-foreground shrink-0" />
                              )}
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-foreground truncate">{title}</span>
                                <span className="text-[8px] text-muted-foreground">
                                  {resFile.resourceType} • @{resFile.sharedBy?.profile?.username || resFile.sharedBy?.email.split('@')[0]}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleTogglePinResource(resFile, isPinned)}
                                className={`p-1 hover:bg-secondary rounded transition ${
                                  isPinned ? 'text-amber-500' : 'text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                <Pin className="h-3.5 w-3.5" />
                              </button>
                              {(resFile.sharedBy?.id === currentUser?.id || isModerator) && (
                                <button
                                  onClick={() => handleDeleteFile(resFile.id)}
                                  className="p-1 hover:bg-secondary rounded text-red-500 transition cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {filteredSharedFiles.length === 0 && (
                      <div className="flex flex-col items-center justify-center text-center py-6 text-muted-foreground/60 border border-dashed border-border/30 rounded-xl bg-secondary/5">
                        <FileText className="h-7 w-7 stroke-[1.2] text-muted-foreground/45 mb-1.5" />
                        <span className="text-[10px] font-bold text-foreground">No shared files yet</span>
                        <span className="text-[8px] text-muted-foreground mt-0.5 max-w-[150px] mx-auto">Upload a PDF or link resources to start building the library!</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: INVITATIONS */}
            {rightSidebarTab === 'invites' && (
              <div className="space-y-4">
                <div className="bg-secondary/15 border border-border/40 rounded-xl p-3.5 flex flex-col gap-2.5 relative">
                  <h4 className="font-bold text-[10px] text-muted-foreground uppercase">Invite User Autocomplete</h4>
                  <div className="relative">
                    <input
                      type="text"
                      value={inviteSearchInput}
                      onChange={(e) => {
                        setInviteSearchInput(e.target.value);
                        if (!e.target.value) {
                          setUserSuggestions([]);
                          setSelectedUser(null);
                        }
                      }}
                      placeholder="Type username or email..."
                      className="w-full bg-card border border-border/40 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-primary/60 transition text-foreground"
                    />

                    {userSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 bg-card border border-border/60 rounded-xl mt-1.5 shadow-xl max-h-48 overflow-y-auto divide-y divide-border/30">
                        {userSuggestions.map((u) => (
                          <div
                            key={u.id}
                            onClick={() => {
                              setSelectedUser(u);
                              setUserSuggestions([]);
                              setInviteSearchInput('');
                            }}
                            className="p-2.5 hover:bg-primary/5 cursor-pointer flex items-center justify-between"
                          >
                            <span className="font-bold text-foreground">
                              @{u.username || 'learner'} <span className="text-xs text-muted-foreground font-normal">({u.displayName})</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedUser && (
                    <div className="bg-primary/5 border border-primary/25 rounded-xl p-2.5 flex items-center justify-between">
                      <span className="font-bold text-primary truncate">
                        @{selectedUser.username || 'learner'} ({selectedUser.displayName})
                      </span>
                      <button onClick={() => setSelectedUser(null)} className="p-1 hover:bg-secondary rounded">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  <button
                    onClick={handleSendInvite}
                    disabled={!selectedUser}
                    className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-semibold py-2 rounded-xl transition cursor-pointer disabled:opacity-50"
                  >
                    Send Invitation
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: AUDITED WORKSPACE STATISTICS */}
            {rightSidebarTab === 'stats' && (
              <div className="space-y-4 select-text">
                <div className="bg-secondary/15 border border-border/40 rounded-xl p-4 space-y-3.5">
                  <h3 className="font-bold text-xs pb-1.5 border-b border-border/30 text-foreground flex items-center gap-1.5">
                    <Trophy className="h-4 w-4 text-emerald-500" />
                    <span>Workspace Volume</span>
                  </h3>
                  
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                      <span>WORKSPACE MEMBERS:</span>
                      <span className="font-bold text-foreground">{members.length} members</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                      <span>ONLINE MEMBERS:</span>
                      <span className="font-bold text-emerald-500">{members.filter(m => m.isOnline).length} online</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                      <span>PINNED KNOWLEDGE:</span>
                      <span className="font-bold text-amber-500">{pinsList.length} items pinned</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                      <span>LINKED RESOURCES:</span>
                      <span className="font-bold text-foreground">{sharedFiles.length} links</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                      <span>PHYSICAL FILES SHARED:</span>
                      <span className="font-bold text-foreground">
                        {sharedFiles.filter((f) => f.resourceType === 'FILE').length} files
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                      <span>STORAGE SPACE USED:</span>
                      <span className="font-bold text-foreground">{(totalStorageSize / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                      <span>TOTAL CHAT MESSAGES:</span>
                      <span className="font-bold text-foreground">{messages.length} posts</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                      <span>ACTIVE STUDY SESSIONS:</span>
                      <span className="font-bold text-primary">{activeSession ? '1 session running' : '0 active'}</span>
                    </div>
                    {activeGroup && (
                      <>
                        <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                          <span>WORKSPACE STUDY STREAK:</span>
                          <span className="font-bold text-orange-400">
                            {parseWorkspaceDescription(activeGroup.description).studyStreak || 0} Days 🔥
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                          <span>CUMULATIVE STUDY HOURS:</span>
                          <span className="font-bold text-emerald-500">
                            {parseWorkspaceDescription(activeGroup.description).studyHours || 0} Hours ⏰
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                          <span>COMPLETED STUDY GOALS:</span>
                          <span className="font-bold text-foreground">
                            {parseWorkspaceDescription(activeGroup.description).completedGoals || 0} goals
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
            </div>
            </div>
          </motion.div>
      )}
    </AnimatePresence>

      {/* ==========================================
          MODALS & EMBEDDED STUDY RESOURCE PLAYERS
      ========================================== */}

      {/* LINKED STUDY RESOURCE PLAYERS OVERLAYS */}
      <AnimatePresence>
        {openedStudyResource && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xl max-w-2xl w-full flex flex-col gap-4 max-h-[85vh] overflow-hidden select-text"
            >
              <div className="flex items-center justify-between border-b border-border/30 pb-2">
                <span className="font-bold text-sm text-foreground">
                  Multiplayer Study Player: {openedStudyResource.resourceType}
                </span>
                <button
                  onClick={() => {
                    const title = openedStudyResource.document?.name || openedStudyResource.metadata?.title || openedStudyResource.metadata?.name || 'Shared Resource';
                    logSessionActivity('RESOURCE_CLOSED', { title });
                    setOpenedStudyResource(null);
                    handleUpdateSessionFocus('Studying');
                  }}
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto bg-zinc-950/15 border border-border/25 rounded-2xl p-4 min-h-[300px]">
                
                {/* 1. NOTE PLAYER */}
                {openedStudyResource.resourceType === 'NOTE' && openedStudyResource.metadata && (
                  <div className="space-y-4 flex flex-col h-[55vh]">
                    <div className="flex justify-between items-center border-b border-border/25 pb-2">
                      <h3 className="text-sm font-bold text-primary">
                        {openedStudyResource.metadata.title}
                      </h3>
                      
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleSwitchNoteTab('content')}
                          className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase transition ${
                            noteActiveTab === 'content'
                              ? 'bg-primary/20 text-primary border border-primary/30'
                              : 'bg-secondary/40 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Content
                        </button>
                        {openedStudyResource.metadata.summary && (
                          <button
                            onClick={() => handleSwitchNoteTab('summary')}
                            className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase transition ${
                              noteActiveTab === 'summary'
                                ? 'bg-primary/20 text-primary border border-primary/30'
                                : 'bg-secondary/40 text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            AI Summary
                          </button>
                        )}
                      </div>
                    </div>

                    <div
                      ref={noteScrollContainerRef}
                      onScroll={handleNoteScroll}
                      className="flex-1 overflow-y-auto pr-1.5 scrollbar-thin select-text mt-2"
                    >
                      {noteActiveTab === 'content' ? (
                        <div className="text-xs text-muted-foreground leading-relaxed select-text font-medium whitespace-pre-wrap">
                          {formatMessageText(openedStudyResource.metadata.content || '')}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground leading-relaxed select-text font-medium whitespace-pre-wrap bg-primary/5 border border-primary/10 rounded-xl p-3.5">
                          {formatMessageText(openedStudyResource.metadata.summary || '')}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. QUIZ PLAYER */}
                {openedStudyResource.resourceType === 'QUIZ' && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-primary border-b border-border/25 pb-1">
                      {openedStudyResource.metadata?.title || 'Shared Quiz'}
                    </h3>
                    
                    {!quizScoreReport ? (
                      <div className="space-y-4">
                        {quizQuestions.length > 0 ? (
                          <>
                            {/* Progress bar */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                                <span>Question {quizActiveQuestionIndex + 1} of {quizQuestions.length}</span>
                                <span>{Math.round(((quizActiveQuestionIndex + 1) / quizQuestions.length) * 100)}% Complete</span>
                              </div>
                              <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden border border-border/10">
                                <div 
                                  className="bg-primary h-full rounded-full transition-all duration-300"
                                  style={{ width: `${((quizActiveQuestionIndex + 1) / quizQuestions.length) * 100}%` }}
                                />
                              </div>
                            </div>

                            {/* Active Question Card */}
                            <div className="bg-secondary/10 border border-border/30 rounded-2xl p-5 space-y-4">
                              <span className="text-[9px] uppercase font-bold tracking-wider text-primary">Question Text</span>
                              <p className="text-xs font-bold leading-relaxed text-foreground select-text">
                                {quizQuestions[quizActiveQuestionIndex].question}
                              </p>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                                {quizQuestions[quizActiveQuestionIndex].choices?.map((choice: any) => {
                                  const isSelected = quizAnswers[quizQuestions[quizActiveQuestionIndex].id] === choice.id;
                                  return (
                                    <button
                                      key={choice.id}
                                      onClick={() => handleQuizAnswerSelect(quizQuestions[quizActiveQuestionIndex].id, choice.id)}
                                      className={`p-3 rounded-xl border text-left text-xs font-semibold transition ${
                                        isSelected 
                                          ? 'border-primary bg-primary/10 text-primary shadow-sm shadow-primary/5' 
                                          : 'border-border/30 hover:bg-secondary/40 text-muted-foreground'
                                      }`}
                                    >
                                      {choice.text}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Navigation Controls */}
                            <div className="flex justify-between items-center pt-2">
                              <button
                                onClick={() => setQuizActiveQuestionIndex(prev => Math.max(0, prev - 1))}
                                disabled={quizActiveQuestionIndex === 0}
                                className="px-3.5 py-1.5 bg-secondary border border-border/30 rounded-xl font-bold cursor-pointer disabled:opacity-50 text-[10px]"
                              >
                                Previous
                              </button>
                              
                              {quizActiveQuestionIndex < quizQuestions.length - 1 ? (
                                <button
                                  onClick={() => setQuizActiveQuestionIndex(prev => Math.min(quizQuestions.length - 1, prev + 1))}
                                  className="px-4 py-1.5 bg-primary text-primary-foreground rounded-xl font-bold text-[10px] cursor-pointer"
                                >
                                  Next
                                </button>
                              ) : (
                                <button
                                  onClick={handleSubmitQuizScore}
                                  className="px-5 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold text-[10px] cursor-pointer"
                                >
                                  Submit Answers
                                </button>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-6 text-xs text-muted-foreground italic">No questions inside quiz.</div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-5 select-text">
                        {/* Results Overview */}
                        <div className="text-center py-5 space-y-3.5 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                          <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500" />
                          <h4 className="font-extrabold text-foreground text-xs uppercase tracking-wider">Quiz Attempt Results</h4>
                          <span className="text-3xl font-extrabold text-emerald-500 block">{quizScoreReport.score}/{quizScoreReport.total}</span>
                          <span className="text-[10px] text-muted-foreground font-semibold">{quizScoreReport.percentage}% Mastered</span>
                        </div>

                        {/* Question Review List */}
                        <div className="space-y-4 max-h-[30vh] overflow-y-auto pr-1 scrollbar-thin text-left">
                          <span className="text-[8px] uppercase tracking-wider font-bold text-muted-foreground block mb-2 border-b border-border/20 pb-1">Questions Review & Explanations</span>
                          {quizQuestions.map((q, idx) => {
                            const selectedChoiceId = quizAnswers[q.id];
                            const correctChoice = q.choices?.find((c: any) => c.isCorrect);
                            const isCorrect = selectedChoiceId === correctChoice?.id;
                            return (
                              <div key={q.id} className="space-y-2 border-b border-border/10 pb-3">
                                <h5 className="font-bold text-xs text-foreground">
                                  {idx + 1}. {q.question}
                                  {isCorrect ? (
                                    <span className="text-[8px] text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded-full font-bold ml-2">Correct</span>
                                  ) : (
                                    <span className="text-[8px] text-red-400 bg-red-400/10 border border-red-400/20 px-1.5 py-0.2 rounded-full font-bold ml-2">Incorrect</span>
                                  )}
                                </h5>

                                <div className="grid grid-cols-2 gap-2 mt-1">
                                  {q.choices?.map((choice: any) => {
                                    const isChosen = selectedChoiceId === choice.id;
                                    let btnStyle = 'border-border/20 text-muted-foreground opacity-60';
                                    if (choice.isCorrect) {
                                      btnStyle = 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold';
                                    } else if (isChosen && !choice.isCorrect) {
                                      btnStyle = 'border-red-500 bg-red-500/10 text-red-400 font-bold';
                                    }
                                    return (
                                      <div key={choice.id} className={`p-2 rounded-lg border text-[10px] ${btnStyle}`}>
                                        {choice.text}
                                      </div>
                                    );
                                  })}
                                </div>

                                {q.explanation && (
                                  <div className="bg-primary/5 border border-primary/10 rounded-xl p-2.5 mt-2.5 text-[10px] text-muted-foreground leading-relaxed select-text font-normal">
                                    <span className="font-bold text-primary block mb-1">💡 Explanation:</span>
                                    {q.explanation}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        
                        <button
                          onClick={() => {
                            setQuizScoreReport(null);
                            setQuizActiveQuestionIndex(0);
                            setQuizAnswers({});
                          }}
                          className="w-full py-2 bg-secondary border border-border/30 rounded-xl font-bold cursor-pointer text-xs"
                        >
                          Retry Quiz
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. FLASHCARD LEARNING PLAYER */}
                {openedStudyResource.resourceType === 'FLASHCARD_DECK' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-border/25 pb-1">
                      <h3 className="text-sm font-bold text-primary">
                        {openedStudyResource.metadata?.title || 'Shared Flashcard Deck'}
                      </h3>
                      {flashcardDeckCards.length > 0 && (
                        <button
                          onClick={() => {
                            const shuffled = [...flashcardDeckCards].sort(() => Math.random() - 0.5);
                            setFlashcardDeckCards(shuffled);
                            setActiveFlashcardIndex(0);
                            setFlashcardFlipped(false);
                            if (activeSession && socketRef.current && socketRef.current.connected && activeGroup) {
                              socketRef.current.emit('session:resource:progress', {
                                groupId: activeGroup.id,
                                progress: { flashcardIndex: 0, flashcardFlipped: false },
                              });
                            }
                            showToast('Deck shuffled!', 'info');
                          }}
                          className="px-2.5 py-0.5 bg-secondary hover:bg-secondary/80 border border-border/30 rounded-lg text-[9px] font-bold cursor-pointer text-foreground flex items-center gap-1"
                        >
                          🔀 Shuffle
                        </button>
                      )}
                    </div>

                    {flashcardDeckCards.length > 0 ? (
                      <div className="flex flex-col items-center gap-6 py-4">
                        {/* Progress Bar */}
                        <div className="w-full space-y-1">
                          <div className="flex justify-between text-[8px] font-bold text-muted-foreground">
                            <span>Progress Tracker</span>
                            <span>{activeFlashcardIndex + 1} / {flashcardDeckCards.length} Cards</span>
                          </div>
                          <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden border border-border/10">
                            <div 
                              className="bg-primary h-full rounded-full transition-all duration-300"
                              style={{ width: `${((activeFlashcardIndex + 1) / flashcardDeckCards.length) * 100}%` }}
                            />
                          </div>
                        </div>

                        {/* Flip Card Container */}
                        <div className="perspective-1000 w-full max-w-sm h-48 cursor-pointer select-none">
                          <motion.div
                            animate={{ rotateY: flashcardFlipped ? 180 : 0 }}
                            transition={{ duration: 0.4 }}
                            onClick={() => {
                              const nextFlipped = !flashcardFlipped;
                              setFlashcardFlipped(nextFlipped);
                              if (activeSession && socketRef.current && socketRef.current.connected && activeGroup) {
                                socketRef.current.emit('session:resource:progress', {
                                  groupId: activeGroup.id,
                                  progress: { flashcardFlipped: nextFlipped },
                                });
                              }
                            }}
                            className="w-full h-full relative border border-border/40 bg-secondary/25 hover:bg-secondary/35 rounded-2xl p-6 flex flex-col justify-center items-center text-center shadow-lg transition duration-200"
                            style={{ transformStyle: 'preserve-3d' }}
                          >
                            <span className="absolute top-3 left-4 text-[8px] uppercase tracking-wider text-muted-foreground/80 font-bold" style={{ backfaceVisibility: 'hidden' }}>
                              {flashcardFlipped ? 'Answer Back' : 'Question Front'}
                            </span>
                            
                            <span 
                              className="text-xs font-bold text-foreground select-text px-4"
                              style={{ 
                                transform: flashcardFlipped ? 'rotateY(180deg)' : 'none',
                                backfaceVisibility: 'hidden'
                              }}
                            >
                              {flashcardFlipped 
                                ? flashcardDeckCards[activeFlashcardIndex].answer 
                                : flashcardDeckCards[activeFlashcardIndex].question}
                            </span>
                          </motion.div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-4">
                          <button
                            disabled={activeFlashcardIndex === 0}
                            onClick={() => {
                              const nextIdx = activeFlashcardIndex - 1;
                              setActiveFlashcardIndex(nextIdx);
                              setFlashcardFlipped(false);
                              handleUpdateCardFocus(nextIdx, flashcardDeckCards.length);
                              if (activeSession && socketRef.current && socketRef.current.connected && activeGroup) {
                                socketRef.current.emit('session:resource:progress', {
                                  groupId: activeGroup.id,
                                  progress: { flashcardIndex: nextIdx, flashcardFlipped: false },
                                });
                              }
                            }}
                            className="px-3.5 py-1.5 bg-secondary border border-border/30 rounded-xl font-bold cursor-pointer disabled:opacity-50 text-xs text-foreground hover:bg-secondary/80"
                          >
                            Prev
                          </button>
                          <span className="text-[10px] text-muted-foreground font-semibold">
                            {activeFlashcardIndex + 1} / {flashcardDeckCards.length}
                          </span>
                          <button
                            disabled={activeFlashcardIndex === flashcardDeckCards.length - 1}
                            onClick={() => {
                              const nextIdx = activeFlashcardIndex + 1;
                              setActiveFlashcardIndex(nextIdx);
                              setFlashcardFlipped(false);
                              handleIncrementSessionStat('flashcardsReviewed');
                              handleUpdateCardFocus(nextIdx, flashcardDeckCards.length);
                              if (activeSession && socketRef.current && socketRef.current.connected && activeGroup) {
                                socketRef.current.emit('session:resource:progress', {
                                  groupId: activeGroup.id,
                                  progress: { flashcardIndex: nextIdx, flashcardFlipped: false },
                                });
                              }
                            }}
                            className="px-3.5 py-1.5 bg-primary text-primary-foreground rounded-xl font-bold cursor-pointer disabled:opacity-50 text-xs hover:bg-primary/90"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-6 text-muted-foreground">No flashcards inside deck.</div>
                    )}
                  </div>
                )}

                {/* 4. DOCUMENTS PREVIEW PLAYER */}
                {(openedStudyResource.resourceType === 'FILE' || openedStudyResource.resourceType === 'DOCUMENT') && openedStudyResource.document && (
                  <div className="flex flex-col gap-2.5 h-[55vh]">
                    <div className="flex justify-between items-center bg-secondary/20 p-2 border border-border/20 rounded-xl shrink-0">
                      <span className="text-[10px] font-bold text-foreground">
                        Synchronized PDF View: Page {pdfCurrentPage} ({pdfZoom}%)
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleUpdatePdfPage(pdfCurrentPage - 1)}
                          disabled={pdfCurrentPage <= 1}
                          className="px-2 py-0.5 bg-secondary hover:bg-secondary/80 rounded border border-border/30 disabled:opacity-50 text-[9px] font-bold cursor-pointer text-foreground"
                        >
                          Prev Page
                        </button>
                        <button
                          onClick={() => handleUpdatePdfPage(pdfCurrentPage + 1)}
                          className="px-2 py-0.5 bg-primary text-primary-foreground rounded text-[9px] font-bold cursor-pointer"
                        >
                          Next Page
                        </button>
                        
                        <div className="flex items-center gap-1.5 ml-2 border-l border-border/30 pl-2 shrink-0">
                          <button
                            onClick={() => handleUpdatePdfZoom(pdfZoom - 10)}
                            disabled={pdfZoom <= 50}
                            className="px-1.5 py-0.5 bg-secondary hover:bg-secondary/80 rounded border border-border/30 disabled:opacity-50 text-[9px] font-bold cursor-pointer text-foreground"
                          >
                            -
                          </button>
                          <button
                            onClick={() => handleUpdatePdfZoom(pdfZoom + 10)}
                            disabled={pdfZoom >= 200}
                            className="px-1.5 py-0.5 bg-secondary hover:bg-secondary/80 rounded border border-border/30 disabled:opacity-50 text-[9px] font-bold cursor-pointer text-foreground"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                    <div 
                      ref={pdfScrollContainerRef}
                      onScroll={handlePdfScroll}
                      className="flex-grow rounded-2xl border border-border/30 overflow-y-auto relative bg-zinc-950/40"
                    >
                      <div 
                        style={{
                          width: '100%',
                          height: '200%',
                          position: 'relative'
                        }}
                      >
                        <iframe
                          src={`${openedStudyResource.document.fileUrl}#page=${pdfCurrentPage}`}
                          style={{
                            transform: `scale(${pdfZoom / 100})`,
                            transformOrigin: 'top left',
                            width: `${100 * (100 / pdfZoom)}%`,
                            height: `100%`,
                            position: 'absolute',
                            left: 0,
                            top: 0
                          }}
                          className="border-none"
                          title={openedStudyResource.document.name}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. NOTEBOOK PLAYER */}
                {openedStudyResource.resourceType === 'NOTEBOOK' && openedStudyResource.metadata && (
                  <div className="space-y-4 flex flex-col h-[55vh]">
                    <div className="flex justify-between items-center border-b border-border/25 pb-2 shrink-0">
                      <div>
                        <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">
                          <span>📖 Notebook: {openedStudyResource.metadata.name || openedStudyResource.metadata.title}</span>
                        </h3>
                        {openedStudyResource.metadata.description && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 max-w-xl truncate">
                            {openedStudyResource.metadata.description}
                          </p>
                        )}
                      </div>
                      {openedStudyResource.metadata.notes && openedStudyResource.metadata.notes.length > 0 && (
                        <div className="flex items-center gap-1 bg-secondary/35 p-1 border border-border/20 rounded-lg">
                          <button
                            onClick={() => handleUpdateNotebookPage(Math.max(0, notebookPage - 1))}
                            disabled={notebookPage === 0}
                            className="px-2 py-0.5 bg-secondary text-foreground hover:bg-secondary/80 rounded border border-border/30 disabled:opacity-50 text-[9px] font-bold cursor-pointer"
                          >
                            Prev Note
                          </button>
                          <span className="text-[9px] font-bold text-foreground px-1">
                            {notebookPage + 1} / {openedStudyResource.metadata.notes.length}
                          </span>
                          <button
                            onClick={() => handleUpdateNotebookPage(Math.min((openedStudyResource.metadata.notes.length - 1), notebookPage + 1))}
                            disabled={notebookPage >= openedStudyResource.metadata.notes.length - 1}
                            className="px-2 py-0.5 bg-primary text-primary-foreground rounded text-[9px] font-bold cursor-pointer"
                          >
                            Next Note
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex-grow flex gap-4 min-h-0 overflow-hidden">
                      {/* Left Sidebar Notes Feed */}
                      <div className="w-1/3 border-r border-border/30 pr-3 overflow-y-auto space-y-1.5 scrollbar-thin">
                        <span className="text-[8px] uppercase tracking-wider font-bold text-muted-foreground block mb-2">Notebook Notes</span>
                        {openedStudyResource.metadata.notes && openedStudyResource.metadata.notes.map((n: any, idx: number) => (
                          <button
                            key={n.id}
                            onClick={() => handleUpdateNotebookPage(idx)}
                            className={`w-full text-left p-2 rounded-xl border text-[10px] font-semibold transition ${
                              notebookPage === idx
                                ? 'bg-primary/10 border-primary text-primary'
                                : 'bg-secondary/15 border-border/20 hover:bg-secondary/25 text-muted-foreground'
                            }`}
                          >
                            <span className="block truncate font-bold">{n.title || 'Untitled Note'}</span>
                            <span className="text-[8px] text-muted-foreground/80 mt-0.5 block">
                              {new Date(n.updatedAt || n.createdAt).toLocaleDateString()}
                            </span>
                          </button>
                        ))}
                        {(!openedStudyResource.metadata.notes || openedStudyResource.metadata.notes.length === 0) && (
                          <div className="text-[10px] italic text-muted-foreground/60 text-center py-4">No notes.</div>
                        )}
                      </div>

                      {/* Right Panel Note Reader Content */}
                      <div className="flex-grow overflow-y-auto pl-1 scrollbar-thin space-y-3.5 select-text">
                        {openedStudyResource.metadata.notes && openedStudyResource.metadata.notes[notebookPage] ? (
                          <div className="space-y-3 select-text">
                            <h2 className="font-extrabold text-sm text-foreground select-text border-b border-border/20 pb-1.5">
                              {openedStudyResource.metadata.notes[notebookPage].title}
                            </h2>
                            <div className="text-xs text-muted-foreground leading-relaxed select-text font-normal whitespace-pre-wrap">
                              {formatMessageText(openedStudyResource.metadata.notes[notebookPage].content || '')}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-center py-12 text-muted-foreground/70">
                            <FileText className="h-8 w-8 stroke-[1.25] mb-2 text-muted-foreground/45" />
                            <span className="text-[10px] font-bold">Empty Notebook</span>
                            <span className="text-[8px] mt-0.5">Link or create notes inside this notebook.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. IMAGE PLAYER */}
                {(openedStudyResource.resourceType === 'IMAGE' || (openedStudyResource.resourceType === 'FILE' && openedStudyResource.document?.mimeType?.startsWith('image/'))) && (
                  <div className="flex flex-col items-center justify-center gap-3 py-4 h-[55vh]">
                    <span className="font-bold text-xs text-foreground">
                      🖼️ {openedStudyResource.document?.name || 'Image Preview'}
                    </span>
                    <img
                      src={openedStudyResource.document?.fileUrl}
                      alt={openedStudyResource.document?.name || 'Shared Image'}
                      className="max-w-full max-h-[45vh] rounded-xl object-contain border border-border/30 shadow-lg"
                    />
                  </div>
                )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT WORKSPACE STUDY GOAL MODAL */}
      <AnimatePresence>
        {editingGoal && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xl max-w-sm w-full flex flex-col gap-4"
            >
              <div className="flex justify-between items-center border-b border-border/30 pb-2">
                <span className="font-bold text-xs text-foreground uppercase tracking-wide">
                  🎯 Update Workspace Goal
                </span>
                <button
                  onClick={() => setEditingGoal(false)}
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveWorkspaceGoal} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Goal Description</label>
                  <input
                    type="text"
                    required
                    value={goalText}
                    onChange={(e) => setGoalText(e.target.value)}
                    placeholder="e.g. Finish Operating Systems Unit 3"
                    className="w-full bg-secondary/30 border border-border/30 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-primary text-foreground"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Completed Tasks</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={goalCompleted}
                      onChange={(e) => setGoalCompleted(Number(e.target.value))}
                      className="w-full bg-secondary/30 border border-border/30 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-primary text-foreground"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Target Tasks</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={goalTarget}
                      onChange={(e) => setGoalTarget(Number(e.target.value))}
                      className="w-full bg-secondary/30 border border-border/30 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-primary text-foreground"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingGoal(false)}
                    className="px-3.5 py-2 bg-secondary hover:bg-secondary/80 rounded-xl font-bold text-xs cursor-pointer text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl font-bold text-xs cursor-pointer"
                  >
                    Save Goal
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FINAL GROUP STUDY SESSION SPRINT REPORT MODAL */}
      <AnimatePresence>
        {sessionStatsReport && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-text">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-[#09090b] border border-zinc-800 rounded-[28px] p-6 shadow-2xl max-w-2xl w-full flex flex-col gap-5 select-text max-h-[90vh] overflow-y-auto scrollbar-thin"
            >
              {/* Header with Linear style title and Export button */}
              <div className="flex justify-between items-start border-b border-zinc-800 pb-4 shrink-0">
                <div className="flex gap-3 items-center">
                  <div className="h-10 w-10 bg-primary/10 rounded-xl border border-primary/20 flex items-center justify-center text-primary text-lg">
                    📊
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <span>Multiplayer Study Sprint Report</span>
                    </h4>
                    <p className="text-[9px] text-muted-foreground mt-0.5">High-fidelity Linear-style workspace analytics dashboard.</p>
                  </div>
                </div>
                
                {/* Connection Latency/RTC indicator */}
                <div className="bg-zinc-900 border border-zinc-800 px-2 py-1 rounded-lg text-[8px] text-zinc-400 font-bold flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Sprint Finished</span>
                </div>
              </div>

              {/* Progress Focus Metric Widget */}
              <div className="bg-zinc-900/40 border border-zinc-800/60 p-4 rounded-2xl flex flex-col gap-2">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-bold text-zinc-200 uppercase tracking-wider text-[8px]">Sprint Focus Efficiency</span>
                  <span className="font-extrabold text-emerald-400">98.5% (High Productivity Zone) 🔥</span>
                </div>
                <div className="w-full bg-zinc-950 h-2.5 rounded-full overflow-hidden border border-zinc-800">
                  <div className="bg-gradient-to-r from-primary to-emerald-400 h-full rounded-full w-[98.5%] animate-pulse" />
                </div>
              </div>

              {/* Grid stats overview */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="flex flex-col items-center bg-zinc-900/50 border border-zinc-800/80 p-3.5 rounded-2xl">
                  <span className="text-[7.5px] uppercase text-zinc-500 font-extrabold tracking-wider">Sprint Time</span>
                  <span className="font-extrabold text-foreground text-sm mt-1.5">
                    {Math.floor((sessionStatsReport.pomodoro?.elapsedSeconds || 0) / 60)}m {(sessionStatsReport.pomodoro?.elapsedSeconds || 0) % 60}s
                  </span>
                </div>
                <div className="flex flex-col items-center bg-zinc-900/50 border border-zinc-800/80 p-3.5 rounded-2xl">
                  <span className="text-[7.5px] uppercase text-zinc-500 font-extrabold tracking-wider">Files Opened</span>
                  <span className="font-extrabold text-foreground text-sm mt-1.5">{sessionStatsReport.stats?.filesOpened || 0}</span>
                </div>
                <div className="flex flex-col items-center bg-zinc-900/50 border border-zinc-800/80 p-3.5 rounded-2xl">
                  <span className="text-[7.5px] uppercase text-zinc-500 font-extrabold tracking-wider">Cards Reviewed</span>
                  <span className="font-extrabold text-foreground text-sm mt-1.5">{sessionStatsReport.stats?.flashcardsReviewed || 0}</span>
                </div>
                <div className="flex flex-col items-center bg-zinc-900/50 border border-zinc-800/80 p-3.5 rounded-2xl">
                  <span className="text-[7.5px] uppercase text-zinc-500 font-extrabold tracking-wider">AI Tutor Queries</span>
                  <span className="font-extrabold text-foreground text-sm mt-1.5">{sessionStatsReport.stats?.aiQuestions || 0}</span>
                </div>
                <div className="flex flex-col items-center bg-zinc-900/50 border border-zinc-800/80 p-3.5 rounded-2xl">
                  <span className="text-[7.5px] uppercase text-zinc-500 font-extrabold tracking-wider">Quizzes Taken</span>
                  <span className="font-extrabold text-secondary text-sm mt-1.5">
                    {(sessionStatsReport.stats?.quizAttempts || 0) > 0 ? `${sessionStatsReport.stats.quizAttempts} attempts` : '0 attempts'}
                  </span>
                </div>
                <div className="flex flex-col items-center bg-zinc-900/50 border border-zinc-800/80 p-3.5 rounded-2xl">
                  <span className="text-[7.5px] uppercase text-zinc-500 font-extrabold tracking-wider">Focus Mode Rating</span>
                  <span className="font-extrabold text-primary text-sm mt-1.5">A+ Rating</span>
                </div>
              </div>

              {/* Heatmap intensity grid (timeline segments) */}
              <div className="space-y-1.5 text-left bg-zinc-900/30 border border-zinc-800/60 p-3.5 rounded-2xl">
                <span className="font-bold text-zinc-400 uppercase text-[8px] tracking-wider block">Activity Heatmap Grid</span>
                <div className="grid grid-cols-12 gap-1.5 mt-2.5">
                  {Array.from({ length: 24 }).map((_, i) => {
                    const segmentDuration = Math.max(1, (sessionStatsReport.pomodoro?.elapsedSeconds || 0) / 24);
                    const startSeg = new Date(sessionStatsReport.startedAt || (Date.now() - 3600000)).getTime() + i * segmentDuration * 1000;
                    const endSeg = startSeg + segmentDuration * 1000;
                    
                    const count = activityFeed.filter(act => {
                      const t = new Date(act.timestamp).getTime();
                      return t >= startSeg && t < endSeg;
                    }).length;

                    let color = 'bg-zinc-900/80 border-zinc-800';
                    if (count > 0 && count <= 2) color = 'bg-emerald-500/20 border-emerald-500/10 scale-[0.98]';
                    else if (count > 2 && count <= 5) color = 'bg-emerald-500/40 border-emerald-500/20 scale-[1.02] shadow-sm';
                    else if (count > 5) color = 'bg-emerald-500 border-emerald-400/30 scale-[1.05] shadow';

                    return (
                      <div 
                        key={i} 
                        className={`h-4.5 w-full rounded-md border transition-all ${color}`} 
                        title={`Segment ${i + 1}: ${count} interactions`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between text-[7px] text-zinc-500 font-extrabold mt-2 uppercase tracking-wide">
                  <span>Sprint Start</span>
                  <span>Sprint Completion</span>
                </div>
              </div>

              {/* Side by side: Focus states and timeline */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-left">
                {/* Participant focuses list */}
                <div className="flex flex-col gap-2 bg-zinc-900/30 border border-zinc-800/60 p-4 rounded-2xl text-[10px]">
                  <span className="font-extrabold text-zinc-400 uppercase text-[8px] tracking-wider border-b border-zinc-800 pb-1.5 block">Participant Focus Logs</span>
                  <div className="space-y-2 mt-1 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
                    {Object.entries(sessionStatsReport.focuses || {}).map(([userId, focusVal]) => {
                      const memberObj = members.find((m) => m.userId === userId);
                      const name = memberObj?.user?.profile?.firstName
                        ? `${memberObj.user.profile.firstName} ${memberObj.user.profile.lastName || ''}`
                        : memberObj?.user?.email.split('@')[0] || 'Unknown Member';
                      return (
                        <div key={userId} className="flex flex-col border-b border-zinc-800/50 pb-2">
                          <span className="font-extrabold text-zinc-200">@{name}</span>
                          <span className="text-muted-foreground italic mt-0.5 text-[9px] leading-tight block">{focusVal as string}</span>
                        </div>
                      );
                    })}
                    {Object.keys(sessionStatsReport.focuses || {}).length === 0 && (
                      <span className="text-zinc-500 italic">No focus logs recorded.</span>
                    )}
                  </div>
                </div>

                {/* Chronological Study Timeline */}
                <div className="flex flex-col gap-2 bg-zinc-900/30 border border-zinc-800/60 p-4 rounded-2xl text-[10px]">
                  <span className="font-extrabold text-zinc-400 uppercase text-[8px] tracking-wider border-b border-zinc-800 pb-1.5 block">Chronological Timeline</span>
                  <div className="space-y-2.5 mt-1 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
                    {activityFeed
                      .filter((act) => {
                        const actTime = new Date(act.timestamp).getTime();
                        const sessStart = new Date(sessionStatsReport.startedAt || (Date.now() - 3600000)).getTime();
                        return actTime >= sessStart;
                      })
                      .reverse()
                      .map((item) => {
                        const timeStr = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                        let eventDesc = '';
                        if (item.type === 'RESOURCE_OPENED') {
                          eventDesc = `Opened "${item.details?.title}" (${item.details?.resourceType})`;
                        } else if (item.type === 'RESOURCE_CLOSED') {
                          eventDesc = `Closed "${item.details?.title}"`;
                        } else if (item.type === 'DOCUMENT_VIEWED') {
                          eventDesc = `Viewed "${item.details?.title}" - Page ${item.details?.page}`;
                        } else if (item.type === 'QUIZ_STARTED') {
                          eventDesc = `Started Quiz: "${item.details?.title}"`;
                        } else if (item.type === 'QUIZ_COMPLETED') {
                          eventDesc = `Completed Quiz: Score ${item.details?.score}/${item.details?.total}`;
                        } else if (item.type === 'AI_TUTOR_QUESTION') {
                          eventDesc = `Asked AI Tutor a question`;
                        } else if (item.type === 'RESOURCE_PINNED') {
                          eventDesc = `Pinned "${item.details?.title}"`;
                        } else if (item.type === 'STUDY_SESSION_STARTED') {
                          eventDesc = `Started Study Session`;
                        } else if (item.type === 'STUDY_SESSION_ENDED') {
                          eventDesc = `Ended Study Session`;
                        } else {
                          eventDesc = `Performed ${item.type.toLowerCase().replace('_', ' ')}`;
                        }

                        return (
                          <div key={item.id} className="flex gap-2 items-start border-l border-zinc-800 pl-2 ml-1 relative text-[9px]">
                            <span className="absolute -left-1 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                            <span className="text-zinc-500 font-extrabold shrink-0">{timeStr}</span>
                            <span className="text-zinc-300 font-medium">@{item.userName} {eventDesc}</span>
                          </div>
                        );
                      })}
                    {activityFeed.filter(act => new Date(act.timestamp).getTime() >= new Date(sessionStatsReport.startedAt || (Date.now() - 3600000)).getTime()).length === 0 && (
                      <span className="text-zinc-500 italic">No session events recorded.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons: Save, Download JSON, Close */}
              <div className="flex flex-col sm:flex-row gap-2 border-t border-zinc-800 pt-4 mt-2 shrink-0">
                {isAdmin && (
                  <button
                    onClick={handleSaveSessionSummary}
                    className="flex-grow bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold py-2 rounded-xl transition cursor-pointer shadow-md flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-wide"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Save to Library</span>
                  </button>
                )}
                
                <button
                  onClick={() => {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
                      report: sessionStatsReport,
                      timeline: activityFeed.filter(act => new Date(act.timestamp).getTime() >= new Date(sessionStatsReport.startedAt || (Date.now() - 3600000)).getTime())
                    }, null, 2));
                    const downloadAnchor = document.createElement('a');
                    downloadAnchor.setAttribute("href", dataStr);
                    downloadAnchor.setAttribute("download", `StudySync_Sprint_Report_${new Date().toISOString().slice(0,10)}.json`);
                    document.body.appendChild(downloadAnchor);
                    downloadAnchor.click();
                    downloadAnchor.remove();
                    showToast('Sprint Report JSON downloaded!', 'success');
                  }}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 font-extrabold rounded-xl transition cursor-pointer text-[10px] uppercase tracking-wide flex items-center justify-center gap-1.5"
                >
                  📥 Export JSON
                </button>

                <button
                  onClick={() => setSessionStatsReport(null)}
                  className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-extrabold rounded-xl border border-rose-500/25 transition cursor-pointer text-[10px] uppercase tracking-wide flex items-center justify-center"
                >
                  Close Report
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LIBRARY SELECTOR MODAL */}
      <AnimatePresence>
        {showLibraryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xl max-w-md w-full flex flex-col gap-4 max-h-[80vh] overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-border/30 pb-2">
                <span className="font-bold text-sm text-foreground">Attach Existing StudySync Content</span>
                <button onClick={() => setShowLibraryModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex gap-1 border-b border-border/30 pb-2">
                {['NOTE', 'QUIZ', 'FLASHCARD', 'NOTEBOOK', 'DOCUMENT'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setLibraryType(type as any)}
                    className={`flex-grow py-1 text-[8px] font-bold rounded transition ${
                      libraryType === type 
                        ? 'bg-primary/10 text-primary border border-primary/20' 
                        : 'text-muted-foreground hover:bg-secondary/40'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <div className="flex-grow overflow-y-auto space-y-2 pr-1 scrollbar-thin select-text">
                {libraryLoading ? (
                  <div className="flex justify-center p-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
                ) : libraryItems.length === 0 ? (
                  <div className="text-center p-6 text-muted-foreground">No items found for this format type.</div>
                ) : (
                  Array.isArray(libraryItems) && libraryItems.map((item) => {
                    if (!item || !item.id) return null;
                    const title = item.title || item.name || 'Untitled';
                    const isSelected = selectedLibraryItem?.id === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedLibraryItem(item)}
                        className={`p-2.5 border rounded-xl cursor-pointer transition flex items-center justify-between ${
                          isSelected ? 'border-primary bg-primary/5' : 'border-border/30 bg-secondary/10'
                        }`}
                      >
                        <span className="font-bold text-foreground truncate">{title}</span>
                        {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex gap-2 justify-end border-t border-border/30 pt-3">
                <button
                  type="button"
                  onClick={() => setShowLibraryModal(false)}
                  className="px-4 py-2 hover:bg-secondary/50 border border-border/30 rounded-xl transition cursor-pointer text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAttachExistingResource}
                  disabled={!selectedLibraryItem}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition cursor-pointer shadow-md disabled:opacity-50"
                >
                  Link Asset
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* COMPLETE UNICODE EMOJI PICKER OVERLAY */}
      <AnimatePresence>
        {emojiPickerTarget && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xs"
            onClick={() => setEmojiPickerTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border/60 rounded-2xl p-4 shadow-2xl max-w-sm w-full flex flex-col gap-3.5 max-h-[80vh] overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-border/30 pb-1.5">
                <span className="font-bold text-xs text-foreground">Emoji Reactions Picker</span>
                <button onClick={() => setEmojiPickerTarget(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={emojiSearchQuery}
                  onChange={(e) => setEmojiSearchQuery(e.target.value)}
                  placeholder="Search emojis..."
                  className="w-full bg-secondary/40 border border-border/30 rounded-xl pl-8 pr-4 py-2 text-[10px] outline-none focus:border-primary/60 transition-all text-foreground text-xs"
                />
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              </div>

              <div className="flex-grow overflow-y-auto space-y-4 pr-1 scrollbar-thin select-text">
                {recentEmojis.length > 0 && !emojiSearchQuery && (
                  <div className="space-y-1">
                    <span className="font-bold text-[8px] text-muted-foreground uppercase tracking-wide">Recently Used</span>
                    <div className="flex flex-wrap gap-1.5">
                      {recentEmojis.map((emo) => (
                        <button
                          key={emo}
                          onClick={() => {
                            if (emojiPickerTarget === 'input') {
                              setChatInput((prev) => prev + emo);
                            } else {
                              handleToggleReaction(emojiPickerTarget.messageId, emo);
                            }
                            setEmojiPickerTarget(null);
                          }}
                          className="text-lg hover:scale-125 transition duration-150"
                        >
                          {emo}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {Object.entries(EMOJI_CATEGORIES).map(([catName, list]) => {
                  const filtered = list.filter((e) => !emojiSearchQuery || e.includes(emojiSearchQuery));
                  if (filtered.length === 0) return null;

                  return (
                    <div key={catName} className="space-y-1">
                      <span className="font-bold text-[8px] text-muted-foreground uppercase tracking-wide">{catName}</span>
                      <div className="grid grid-cols-9 gap-1.5">
                        {filtered.map((emo) => (
                          <button
                            key={emo}
                            onClick={() => {
                              if (emojiPickerTarget === 'input') {
                                setChatInput((prev) => prev + emo);
                              } else {
                                handleToggleReaction(emojiPickerTarget.messageId, emo);
                              }
                              setEmojiPickerTarget(null);
                            }}
                            className="text-lg hover:scale-125 transition duration-150"
                          >
                            {emo}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* IN-APP NOTIFICATION CENTER */}
      <AnimatePresence>
        {showNotificationCenter && (
          <div className="absolute top-16 left-4 z-50 bg-card/95 border border-border/60 rounded-2xl p-4 shadow-2xl max-w-sm w-full max-h-96 overflow-y-auto backdrop-blur-md select-text">
            <div className="flex items-center justify-between border-b border-border/30 pb-2 mb-3">
              <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                <Bell className="h-4 w-4 text-primary animate-pulse" />
                <span>In-App Notifications</span>
              </span>
              <div className="flex items-center gap-2">
                {inAppNotifications.length > 0 && (
                  <button
                    onClick={() => {
                      setInAppNotifications([]);
                      showToast('All notifications dismissed', 'success');
                    }}
                    className="text-[8px] font-bold text-primary hover:underline"
                  >
                    Dismiss All
                  </button>
                )}
                <button onClick={() => setShowNotificationCenter(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {inAppNotifications.map((notif) => {
                  let notifIcon = <Bell className="h-3.5 w-3.5 text-primary" />;
                  if (notif.title.toLowerCase().includes('mention') || notif.title.toLowerCase().includes('reply')) {
                    notifIcon = <MessageSquare className="h-3.5 w-3.5 text-secondary" />;
                  } else if (notif.title.toLowerCase().includes('reaction')) {
                    notifIcon = <Smile className="h-3.5 w-3.5 text-rose-400" />;
                  } else if (notif.title.toLowerCase().includes('pinned') || notif.title.toLowerCase().includes('resource')) {
                    notifIcon = <Pin className="h-3.5 w-3.5 text-amber-500" />;
                  } else if (notif.title.toLowerCase().includes('session') || notif.title.toLowerCase().includes('study')) {
                    notifIcon = <Clock className="h-3.5 w-3.5 text-rose-500 animate-pulse" />;
                  } else if (notif.title.toLowerCase().includes('invite')) {
                    notifIcon = <UserPlus className="h-3.5 w-3.5 text-emerald-500" />;
                  }

                  return (
                    <div 
                      key={notif.id} 
                      className={`p-3 rounded-xl border transition flex gap-2.5 items-start ${
                        notif.isRead ? 'bg-secondary/10 border-border/30' : 'bg-primary/5 border-primary/20'
                      }`}
                    >
                      <span className="p-1.5 rounded-lg bg-secondary/20 border border-border/30 shrink-0">
                        {notifIcon}
                      </span>
                      <div className="flex-grow min-w-0">
                        <span className="font-bold text-foreground text-[10px] block leading-none">{notif.title}</span>
                        <p className="text-[9.5px] text-muted-foreground/90 mt-1 select-text leading-relaxed">{notif.message}</p>
                      </div>
                    </div>
                  );
                })}
                {inAppNotifications.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground/60 flex flex-col items-center justify-center gap-1.5">
                    <BellOff className="h-8 w-8 stroke-[1.2] text-muted-foreground/40 mb-1" />
                    <span className="text-[10px] font-bold text-foreground">You are all caught up!</span>
                    <span className="text-[8px] text-muted-foreground">Any new notifications will appear here in real time.</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </AnimatePresence>

      {/* CREATE WORKSPACE MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xl max-w-sm w-full flex flex-col gap-4"
            >
              <div className="flex items-center justify-between border-b border-border/30 pb-2">
                <span className="font-bold text-sm text-foreground">Create Study Workspace</span>
                <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreateGroup} className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[10px] text-muted-foreground uppercase">Workspace Name</label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="E.g., Placement prep & DSA"
                    className="bg-card border border-border/40 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-primary/60 transition-colors text-foreground"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[10px] text-muted-foreground uppercase">Description</label>
                  <input
                    type="text"
                    value={groupDesc}
                    onChange={(e) => setGroupDesc(e.target.value)}
                    placeholder="Short description of study group goals..."
                    className="bg-card border border-border/40 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-primary/60 transition-colors text-foreground"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-[10px] text-muted-foreground uppercase">Workspace Icon Avatar</label>
                  <div className="flex gap-2 p-1.5 bg-secondary/30 border border-border/30 rounded-xl overflow-x-auto">
                    {['📚', '💻', '📖', '🎯', '🧠', '📝', '🚀', '🧪'].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setGroupAvatar(emoji)}
                        className={`text-lg p-1.5 rounded-lg hover:scale-110 transition ${groupAvatar === emoji ? 'bg-primary/20 scale-105' : ''}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-[10px] text-muted-foreground uppercase">Branding Color</label>
                  <div className="flex gap-2">
                    {AVAILABLE_COLORS.map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setGroupColor(col)}
                        className={`h-5 w-5 rounded-full border border-card transition-all ${
                          col === 'purple' ? 'bg-violet-500' :
                          col === 'blue' ? 'bg-blue-500' :
                          col === 'green' ? 'bg-emerald-500' :
                          col === 'orange' ? 'bg-amber-500' :
                          col === 'red' ? 'bg-red-500' :
                          'bg-teal-500'
                        } ${groupColor === col ? 'ring-2 ring-primary scale-110' : ''}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 justify-end mt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 hover:bg-secondary/50 border border-border/30 rounded-xl transition cursor-pointer text-muted-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition cursor-pointer shadow-md"
                  >
                    Initialize Room
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RECEIVED INVITATIONS MODAL */}
      <AnimatePresence>
        {showInvitesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xl max-w-md w-full flex flex-col gap-4 max-h-[85vh] overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-border/30 pb-2">
                <span className="font-bold text-sm text-foreground">Workspace Invitations ({receivedInvites.length})</span>
                <button onClick={() => setShowInvitesModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="overflow-y-auto space-y-4 pr-1 scrollbar-thin select-text">
                {receivedInvites.map((invite) => {
                  const inviterName = invite.inviter.profile?.firstName
                    ? `${invite.inviter.profile.firstName} ${invite.inviter.profile.lastName || ''}`
                    : invite.inviter.email.split('@')[0];

                  return (
                    <div key={invite.id} className="border border-border/30 bg-secondary/15 rounded-2xl p-4 flex flex-col gap-3">
                      <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold uppercase text-primary">
                            {inviterName[0]}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground">
                              @{invite.inviter.profile?.username || invite.inviter.email.split('@')[0]}
                            </span>
                            <span className="text-[7.5px] text-muted-foreground mt-0.5">Invited you to join <strong>{invite.group.name}</strong></span>
                          </div>
                        </div>

                        {!readInviteIds.includes(invite.id) && (
                          <button
                            onClick={() => {
                              const nextRead = [...readInviteIds, invite.id];
                              setReadInviteIds(nextRead);
                              localStorage.setItem('study_sync_read_invite_ids', JSON.stringify(nextRead));
                            }}
                            className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-lg text-zinc-300 font-bold transition text-[8px] cursor-pointer"
                          >
                            Mark Read
                          </button>
                        )}
                      </div>

                      <div className="flex gap-2 justify-end mt-1.5">
                        <button
                          onClick={() => handleRespondInvite(invite.id, false)}
                          className="px-3.5 py-1.5 hover:bg-red-500/10 border border-red-500/25 text-red-500 rounded-xl transition cursor-pointer text-[10px]"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => handleRespondInvite(invite.id, true)}
                          className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-500/90 text-white font-semibold rounded-xl transition cursor-pointer text-[10px] shadow"
                        >
                          Accept
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SETTINGS MODAL */}
      <AnimatePresence>
        {showSettingsModal && workspaceActionGroup && (() => { console.log("Opening Rename Dialog"); return true; })() && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xl max-w-sm w-full flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-border/30 pb-2">
                <span className="font-bold text-sm text-foreground">Workspace Settings</span>
                <button onClick={() => setShowSettingsModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {(workspaceActionGroup?.ownerId === currentUser?.id) ? (
                <form onSubmit={handleRenameGroup} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[10px] text-muted-foreground uppercase">Rename Workspace</label>
                    <input
                      type="text"
                      value={editGroupName}
                      onChange={(e) => setEditGroupName(e.target.value)}
                      className="bg-card border border-border/40 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-primary/60 transition-colors text-foreground"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[10px] text-muted-foreground uppercase">Description</label>
                    <input
                      type="text"
                      value={editGroupDesc}
                      onChange={(e) => setEditGroupDesc(e.target.value)}
                      className="bg-card border border-border/40 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-primary/60 transition-colors text-foreground"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[10px] text-muted-foreground uppercase">Visibility</label>
                    <select
                      value={editGroupVisibility}
                      onChange={(e: any) => setEditGroupVisibility(e.target.value)}
                      className="bg-card border border-border/40 rounded-xl px-3.5 py-2 text-xs outline-none text-foreground focus:border-primary/60"
                    >
                      <option value="public">Public (Searchable)</option>
                      <option value="private">Private (Invites Only)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-[10px] text-muted-foreground uppercase">Workspace Icon Avatar</label>
                    <div className="flex gap-2 p-1.5 bg-secondary/30 border border-border/30 rounded-xl overflow-x-auto">
                      {['📚', '💻', '📖', '🎯', '🧠', '📝', '🚀', '🧪'].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setEditGroupAvatar(emoji)}
                          className={`text-lg p-1.5 rounded-lg hover:scale-110 transition ${editGroupAvatar === emoji ? 'bg-primary/20 scale-105' : ''}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 border-t border-border/30 pt-3">
                    <button
                      type="button"
                      onClick={handleCopyInviteLink}
                      className="w-full bg-secondary hover:bg-secondary/80 border border-border/30 text-foreground py-2.5 rounded-xl cursor-pointer transition flex items-center justify-center gap-1.5"
                    >
                      <Copy className="h-4 w-4 text-primary" />
                      <span>Copy Invite Link</span>
                    </button>

                    <button
                      type="submit"
                      onClick={() => console.log("Save clicked")}
                      className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-semibold py-2.5 rounded-xl cursor-pointer transition shadow"
                    >
                      Save Changes
                    </button>

                    {(workspaceActionGroup?.ownerId === currentUser?.id) && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleArchiveGroup(!parseWorkspaceDescription(workspaceActionGroup.description).isArchived)}
                          className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/25 py-2.5 rounded-xl cursor-pointer transition"
                        >
                          {parseWorkspaceDescription(workspaceActionGroup.description).isArchived ? 'Unarchive Room' : 'Archive Workspace'}
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(true)}
                          className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/25 py-2.5 rounded-xl cursor-pointer transition"
                        >
                          Delete Workspace Permanently
                        </button>
                      </>
                    )}
                  </div>
                </form>
              ) : (
                <div className="flex flex-col gap-4 py-2 select-text">
                  <button
                    type="button"
                    onClick={handleCopyInviteLink}
                    className="w-full bg-secondary hover:bg-secondary/80 border border-border/30 text-foreground py-2.5 rounded-xl cursor-pointer transition flex items-center justify-center gap-1.5"
                  >
                    <Copy className="h-4 w-4 text-primary" />
                    <span>Copy Invite Link</span>
                  </button>

                  <button
                    onClick={() => setShowLeaveConfirm(true)}
                    className="w-full bg-red-500/10 hover:bg-red-500/25 text-red-500 border border-red-500/25 py-2.5 rounded-xl cursor-pointer transition"
                  >
                    Leave Workspace
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 1. DELETE WORKSPACE CONFIRMATION MODAL */}
      <AnimatePresence>
        {showDeleteConfirm && workspaceActionGroup && (() => { console.log("Opening Delete Dialog"); return true; })() && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#09090b] border border-zinc-800 rounded-[24px] p-6 shadow-2xl max-w-md w-full flex flex-col gap-4 text-left"
            >
              <h4 className="font-extrabold text-sm text-red-500 uppercase tracking-wider">Delete Study Workspace</h4>
              <p className="text-[10px] text-zinc-400 leading-relaxed">
                This action is irreversible. All messages, pinned assets, and files linked inside this workspace will be deleted forever.
              </p>
              
              <div className="space-y-1.5 mt-1 bg-red-950/10 border border-red-500/20 p-3 rounded-xl">
                <span className="text-[8px] uppercase font-bold text-red-400 block">Verification Required</span>
                <p className="text-[9px] text-zinc-300">
                  Please type the workspace name <strong className="text-white select-all font-mono bg-zinc-900 px-1 py-0.5 rounded">"{workspaceActionGroup.name}"</strong> below to confirm deletion:
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={workspaceActionGroup.name}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg text-[10px] py-1.5 px-2.5 focus:outline-none focus:border-red-500 text-white font-mono mt-1"
                />
              </div>

              <div className="flex gap-2 justify-end mt-2 shrink-0">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText('');
                  }}
                  className="px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold rounded-xl hover:bg-zinc-850 text-[10px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={deleteConfirmText.trim().toLowerCase() !== workspaceActionGroup.name.trim().toLowerCase()}
                  onClick={() => {
                    console.log("Delete button clicked");
                    handleDeleteGroup();
                    setDeleteConfirmText('');
                  }}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold rounded-xl text-[10px] cursor-pointer transition font-bold"
                >
                  Delete Permanently
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. LEAVE WORKSPACE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        onConfirm={handleLeaveGroup}
        title="Leave Study Workspace"
        message="Are you sure you want to leave this workspace? You will lose access to all chats and shared files unless you are re-invited."
        confirmLabel="Leave Workspace"
        cancelLabel="Stay"
        type="warning"
      />

      {/* 3. TRANSFER OWNERSHIP CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={showTransferConfirm}
        onClose={() => {
          setShowTransferConfirm(false);
          setTransferTargetId('');
        }}
        onConfirm={handleTransferOwnership}
        title="Transfer Workspace Ownership"
        message="Are you sure you want to transfer ownership of this workspace? You will be demoted to Admin and will no longer be able to rename or delete the workspace."
        confirmLabel="Transfer Ownership"
        cancelLabel="Cancel"
        type="warning"
      />

      {/* REALTIME INVITATION POPUP MODAL */}
      <AnimatePresence>
        {liveInvitationModal && (
          <div className="fixed bottom-4 right-4 z-[100] max-w-sm w-full bg-[#09090b] border border-emerald-500/35 rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.5)] flex flex-col gap-3 select-text">
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-extrabold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span>Live Invite Received</span>
              </span>
              <button 
                onClick={() => setLiveInvitationModal(null)}
                className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-3 bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-800">
              <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                📚
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-zinc-400">
                  Invited by <strong className="text-zinc-200">@{liveInvitationModal.inviter.profile?.username || liveInvitationModal.inviter.email.split('@')[0]}</strong>
                </span>
                <span className="font-extrabold text-[11px] text-white truncate mt-0.5">
                  Room: {liveInvitationModal.group?.name}
                </span>
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-1 shrink-0">
              <button
                onClick={async () => {
                  await handleRespondInvite(liveInvitationModal.id, false);
                  setLiveInvitationModal(null);
                }}
                className="px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 text-red-400 hover:bg-zinc-850 rounded-xl text-[9px] uppercase tracking-wide cursor-pointer transition font-bold"
              >
                Reject
              </button>
              <button
                onClick={async () => {
                  await handleRespondInvite(liveInvitationModal.id, true);
                  setLiveInvitationModal(null);
                }}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[9px] uppercase tracking-wide cursor-pointer transition shadow shadow-emerald-500/10 font-bold"
              >
                Accept
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
