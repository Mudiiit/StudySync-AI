'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, CheckCircle, Send, X, CornerDownRight, Edit3, Trash2 } from 'lucide-react';
import api from '@/lib/axios';
import { useToast } from '@/components/providers/ToastProvider';

interface Reply {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    profile?: {
      firstName: string;
      lastName: string;
      avatarUrl?: string;
    };
  };
}

interface Comment {
  id: string;
  content: string;
  resolved: boolean;
  highlightStart: number | null;
  highlightEnd: number | null;
  highlightText: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    profile?: {
      firstName: string;
      lastName: string;
      avatarUrl?: string;
    };
  };
  replies: Reply[];
}

interface CommentsSidebarProps {
  noteId: string;
  onClose: () => void;
  onJumpToHighlight?: (start: number, end: number) => void;
  activeSelection?: { from: number; to: number; text: string } | null;
  onCommentAdded?: () => void;
}

export default function CommentsSidebar({
  noteId,
  onClose,
  onJumpToHighlight,
  activeSelection,
  onCommentAdded,
}: CommentsSidebarProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'active' | 'resolved'>('active');
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionTargetId, setMentionTargetId] = useState<'new' | string | null>(null); // comment id or 'new'
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const { showToast } = useToast();

  const fetchComments = async () => {
    try {
      const res = await api.get(`/collaboration/notes/${noteId}/comments`);
      setComments(res.data);
    } catch (e) {
      console.error('Failed to load comments:', e);
    }
  };

  const fetchCollaborators = async () => {
    try {
      const res = await api.get(`/collaboration/notes/${noteId}/collaborators`);
      setCollaborators(res.data);
    } catch (e) {
      console.error('Failed to load collaborators:', e);
    }
  };

  useEffect(() => {
    fetchComments();
    fetchCollaborators();
  }, [noteId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await api.post(`/collaboration/notes/${noteId}/comments`, {
        content: newComment.trim(),
        highlightStart: activeSelection?.from || null,
        highlightEnd: activeSelection?.to || null,
        highlightText: activeSelection?.text || null,
      });
      setNewComment('');
      showToast('Comment added', 'success');
      fetchComments();
      if (onCommentAdded) onCommentAdded();
    } catch (e) {
      showToast('Failed to post comment', 'error');
    }
  };

  const handlePostReply = async (commentId: string) => {
    const replyText = replyInputs[commentId] || '';
    if (!replyText.trim()) return;

    try {
      await api.post(`/collaboration/notes/${noteId}/comments`, {
        content: replyText.trim(),
        parentId: commentId,
      });
      setReplyInputs((prev) => ({ ...prev, [commentId]: '' }));
      showToast('Reply posted', 'success');
      fetchComments();
    } catch (e) {
      showToast('Failed to post reply', 'error');
    }
  };

  const handleResolve = async (commentId: string, resolved: boolean) => {
    try {
      await api.patch(`/collaboration/notes/${noteId}/comments/${commentId}`, {
        resolved,
      });
      showToast(resolved ? 'Thread resolved' : 'Thread reopened', 'success');
      fetchComments();
    } catch (e) {
      showToast('Action failed', 'error');
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await api.delete(`/collaboration/notes/${noteId}/comments/${commentId}`);
      showToast('Comment deleted', 'success');
      fetchComments();
    } catch (e) {
      showToast('Failed to delete comment', 'error');
    }
  };

  // Autocomplete Mentions Handler
  const handleInputChange = (val: string, target: 'new' | string) => {
    if (target === 'new') {
      setNewComment(val);
    } else {
      setReplyInputs((prev) => ({ ...prev, [target]: val }));
    }

    const lastChar = val.substring(val.length - 1);
    const words = val.split(' ');
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith('@')) {
      setShowMentions(true);
      setMentionQuery(lastWord.substring(1));
      setMentionTargetId(target);
    } else {
      setShowMentions(false);
      setMentionTargetId(null);
    }
  };

  const handleSelectMention = (name: string) => {
    const formattedName = `@${name.replace(/\s+/g, '')} `;
    
    if (mentionTargetId === 'new') {
      const words = newComment.split(' ');
      words[words.length - 1] = formattedName;
      setNewComment(words.join(' '));
    } else if (mentionTargetId) {
      const currentVal = replyInputs[mentionTargetId] || '';
      const words = currentVal.split(' ');
      words[words.length - 1] = formattedName;
      setReplyInputs((prev) => ({ ...prev, [mentionTargetId]: words.join(' ') }));
    }

    setShowMentions(false);
    setMentionTargetId(null);
  };

  const filteredCollaborators = collaborators.filter((c) =>
    c.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const activeComments = comments.filter((c) => c.resolved === (activeTab === 'resolved'));

  return (
    <div className="w-80 h-full bg-zinc-950 border-l border-zinc-800 flex flex-col relative z-25">
      {/* Header */}
      <div className="h-14 border-b border-border/10 px-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-zinc-200">
          <MessageSquare className="w-4.5 h-4.5 text-violet-400" />
          <span className="font-semibold text-xs tracking-wide">Discussion ({comments.length})</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded bg-zinc-900 hover:bg-zinc-850 text-zinc-400 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-zinc-900 border-b border-border/5 p-1 m-3 rounded-lg text-[11px] font-semibold">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-1.5 rounded transition ${
            activeTab === 'active' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Active Threads
        </button>
        <button
          onClick={() => setActiveTab('resolved')}
          className={`flex-1 py-1.5 rounded transition ${
            activeTab === 'resolved' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Resolved
        </button>
      </div>

      {/* Main Comment Scroller */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {activeComments.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-zinc-650 text-xs text-center select-none space-y-1">
            <MessageSquare className="w-6 h-6 stroke-[1.5]" />
            <span>No {activeTab} comments.</span>
          </div>
        ) : (
          activeComments.map((c) => (
            <div key={c.id} className="bg-zinc-900/50 border border-zinc-800 p-3.5 rounded-2xl space-y-3">
              {/* Highlight selection snippet */}
              {c.highlightText && (
                <div 
                  onClick={() => onJumpToHighlight && c.highlightStart !== null && c.highlightEnd !== null && onJumpToHighlight(c.highlightStart, c.highlightEnd)}
                  className="bg-violet-950/25 border-l-2 border-violet-500/50 p-2 rounded-r-lg text-[11px] italic text-violet-350 cursor-pointer hover:bg-violet-950/40 transition truncate"
                  title="Jump to highlighted position"
                >
                  "{c.highlightText}"
                </div>
              )}

              {/* Author header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-violet-650 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                    {c.user.profile?.firstName.charAt(0) || c.user.email.charAt(0)}
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-zinc-200 block">
                      {c.user.profile ? `${c.user.profile.firstName} ${c.user.profile.lastName}` : 'Collaborator'}
                    </span>
                    <span className="text-[9px] text-zinc-550 block">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleResolve(c.id, !c.resolved)}
                    className={`p-1 rounded hover:bg-zinc-800 transition ${c.resolved ? 'text-zinc-500' : 'text-emerald-500 hover:text-emerald-400'}`}
                    title={c.resolved ? 'Reopen thread' : 'Resolve thread'}
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-red-400 transition"
                    title="Delete thread"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Content body */}
              <p className="text-xs text-zinc-300 leading-relaxed break-words">{c.content}</p>

              {/* Replies Thread */}
              {c.replies && c.replies.length > 0 && (
                <div className="pl-3 border-l border-zinc-800 space-y-2 mt-2">
                  {c.replies.map((reply) => (
                    <div key={reply.id} className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <CornerDownRight className="w-3 h-3 text-zinc-600" />
                        <span className="text-[10px] font-bold text-zinc-400">
                          {reply.user.profile ? `${reply.user.profile.firstName} ${reply.user.profile.lastName}` : 'Collaborator'}
                        </span>
                        <span className="text-[9px] text-zinc-600">
                          {new Date(reply.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-300 pl-4 break-words">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply Form */}
              {!c.resolved && (
                <div className="flex gap-1.5 pt-1.5 border-t border-zinc-850">
                  <input
                    type="text"
                    value={replyInputs[c.id] || ''}
                    onChange={(e) => handleInputChange(e.target.value, c.id)}
                    placeholder="Reply to thread..."
                    className="flex-1 bg-zinc-950 border border-zinc-850 rounded-lg px-2.5 py-1 text-[11px] text-zinc-200 focus:outline-none focus:border-violet-500"
                  />
                  <button
                    onClick={() => handlePostReply(c.id)}
                    className="p-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-350 hover:text-zinc-200 rounded-lg border border-zinc-800 transition cursor-pointer"
                  >
                    <Send className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Floating Mentions List Auto-complete */}
      {showMentions && filteredCollaborators.length > 0 && (
        <div className="absolute bottom-24 left-4 right-4 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl z-30 max-h-40 overflow-y-auto">
          {filteredCollaborators.map((c) => (
            <button
              key={c.id}
              onClick={() => handleSelectMention(c.name)}
              className="w-full text-left px-3.5 py-2 hover:bg-zinc-850 text-zinc-300 hover:text-white text-xs font-semibold transition cursor-pointer border-b border-border/5"
            >
              {c.name} ({c.email})
            </button>
          ))}
        </div>
      )}

      {/* Add New Comment Form Footer */}
      {activeTab === 'active' && (
        <div className="p-4 border-t border-border/10 bg-zinc-950 flex flex-col gap-2">
          {activeSelection && (
            <div className="text-[10px] font-medium text-zinc-500 flex items-center justify-between border border-dashed border-zinc-800 p-2 rounded-lg bg-zinc-900/40">
              <span className="truncate">Commenting highlight: "{activeSelection.text}"</span>
            </div>
          )}
          <form onSubmit={handleAddComment} className="flex gap-2">
            <textarea
              ref={inputRef}
              value={newComment}
              onChange={(e) => handleInputChange(e.target.value, 'new')}
              placeholder={activeSelection ? "Comment on selected text..." : "Add a public comment..."}
              rows={2}
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 placeholder-zinc-550 focus:outline-none focus:border-violet-500 resize-none"
            />
            <button
              type="submit"
              className="p-3 bg-violet-650 hover:bg-violet-600 rounded-xl text-white flex items-center justify-center transition cursor-pointer self-end"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
