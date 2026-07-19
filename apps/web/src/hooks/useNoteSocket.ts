import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface Collaborator {
  noteId: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  cursorColor: string;
  lastActive: string;
  cursor?: { from: number; to: number };
}

interface SocketHookProps {
  noteId: string | null;
  onRemoteEdit?: (data: { userId: string; change: { from: number; to: number; insert: string }; fullContent?: string }) => void;
  onRemoteCursor?: (data: { userId: string; email: string; name: string; cursorColor: string; avatarUrl?: string; cursor?: { from: number; to: number } }) => void;
  onRemotePresence?: (users: Collaborator[]) => void;
  onRemoteTyping?: (data: { userId: string; email: string; name: string; isTyping: boolean }) => void;
}

export function useNoteSocket({
  noteId,
  onRemoteEdit,
  onRemoteCursor,
  onRemotePresence,
  onRemoteTyping,
}: SocketHookProps) {
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<'synced' | 'saving' | 'dirty' | 'offline'>('synced');
  const [activeUsers, setActiveUsers] = useState<Collaborator[]>([]);
  const socketRef = useRef<Socket | null>(null);
  
  // Offline edits queue to support seamless offline writing
  const offlineQueueRef = useRef<{ change: { from: number; to: number; insert: string }; fullContent: string }[]>([]);

  useEffect(() => {
    if (!noteId) {
      setConnected(false);
      setActiveUsers([]);
      return;
    }

    const token = localStorage.getItem('accessToken');
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5001';
    
    console.log('[useNoteSocket] Connecting to Collaboration gateway:', socketUrl);
    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[useNoteSocket] Connected, joining room:', `note:${noteId}`);
      setConnected(true);
      setStatus('synced');
      
      socket.emit('room:join', { room: `note:${noteId}` });

      // Flush offline queue upon reconnection
      if (offlineQueueRef.current.length > 0) {
        console.log(`[useNoteSocket] Flushing ${offlineQueueRef.current.length} queued offline changes...`);
        setStatus('saving');
        offlineQueueRef.current.forEach((item) => {
          socket.emit('editor:edit', {
            noteId,
            change: item.change,
            fullContent: item.fullContent,
          });
        });
        offlineQueueRef.current = [];
        setStatus('synced');
      }
    });

    socket.on('disconnect', () => {
      console.warn('[useNoteSocket] Disconnected from collaboration server');
      setConnected(false);
      setStatus('offline');
    });

    socket.on('presence:update', (data: { noteId: string; users: Collaborator[] }) => {
      console.log('[useNoteSocket] Received presence:update:', data.users);
      if (data.noteId === noteId) {
        setActiveUsers(data.users);
        if (onRemotePresence) onRemotePresence(data.users);
      }
    });

    socket.on('editor:edit:update', (data: { userId: string; change: { from: number; to: number; insert: string }; fullContent?: string }) => {
      if (onRemoteEdit) {
        onRemoteEdit(data);
      }
    });

    socket.on('editor:cursor:update', (data: any) => {
      if (onRemoteCursor) {
        onRemoteCursor(data);
      }
    });

    socket.on('editor:typing:update', (data: any) => {
      if (onRemoteTyping) {
        onRemoteTyping(data);
      }
    });

    socket.on('error', (errMsg: string) => {
      console.error('[useNoteSocket] Error from socket server:', errMsg);
    });

    return () => {
      console.log('[useNoteSocket] Leaving room and disconnecting:', `note:${noteId}`);
      socket.emit('room:leave', { room: `note:${noteId}` });
      socket.disconnect();
    };
  }, [noteId, onRemoteEdit, onRemoteCursor, onRemotePresence, onRemoteTyping]);

  const sendEdit = useCallback((change: { from: number; to: number; insert: string }, fullContent: string) => {
    if (!noteId) return;

    if (connected && socketRef.current) {
      setStatus('saving');
      socketRef.current.emit('editor:edit', {
        noteId,
        change,
        fullContent,
      });
      // Debounce synced state indicator
      setTimeout(() => setStatus('synced'), 300);
    } else {
      console.log('[useNoteSocket] Offline, queueing edit change:', change);
      setStatus('offline');
      offlineQueueRef.current.push({ change, fullContent });
    }
  }, [noteId, connected]);

  const sendCursor = useCallback((cursor: { from: number; to: number }) => {
    if (noteId && connected && socketRef.current) {
      socketRef.current.emit('editor:cursor', { noteId, cursor });
    }
  }, [noteId, connected]);

  const sendTyping = useCallback((isTyping: boolean) => {
    if (noteId && connected && socketRef.current) {
      socketRef.current.emit('editor:typing', { noteId, isTyping });
    }
  }, [noteId, connected]);

  return {
    connected,
    status,
    activeUsers,
    sendEdit,
    sendCursor,
    sendTyping,
  };
}
