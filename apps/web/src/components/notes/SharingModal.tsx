'use client';

import React, { useState, useEffect } from 'react';
import { X, UserPlus, Shield, Trash2, Copy, Check, Users } from 'lucide-react';
import api from '@/lib/axios';
import { useToast } from '@/components/providers/ToastProvider';

interface SharingModalProps {
  noteId: string;
  onClose: () => void;
}

interface Collaborator {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  isOwner: boolean;
}

export default function SharingModal({ noteId, onClose }: SharingModalProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'VIEWER' | 'COMMENTER' | 'EDITOR'>('VIEWER');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  const fetchCollaborators = async () => {
    try {
      const res = await api.get(`/collaboration/notes/${noteId}/collaborators`);
      setCollaborators(res.data);
    } catch (e) {
      console.error('Failed to fetch collaborators:', e);
    }
  };

  useEffect(() => {
    fetchCollaborators();
  }, [noteId]);

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      await api.post(`/collaboration/notes/${noteId}/share`, {
        email: email.trim(),
        role,
      });
      setEmail('');
      showToast('Note shared successfully', 'success');
      fetchCollaborators();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to share note';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      await api.delete(`/collaboration/notes/${noteId}/collaborators/${userId}`);
      showToast('Collaborator removed successfully', 'success');
      fetchCollaborators();
    } catch (e) {
      showToast('Failed to remove collaborator', 'error');
    }
  };

  const copyLink = () => {
    const inviteLink = `${window.location.origin}/notes?noteId=${noteId}`;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    showToast('Invite link copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-100 text-base">Share Workspace</h3>
              <p className="text-zinc-500 text-xs mt-0.5">Invite others to collaborate in real-time.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-400 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Add collaborator */}
          <form onSubmit={handleShare} className="flex gap-2">
            <div className="flex-1 flex bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden focus-within:border-violet-500 transition">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address..."
                className="flex-1 bg-transparent px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-650 focus:outline-none"
                required
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="bg-zinc-900 border-l border-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-400 focus:outline-none cursor-pointer"
              >
                <option value="VIEWER">Viewer</option>
                <option value="COMMENTER">Commenter</option>
                <option value="EDITOR">Editor</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 px-4 rounded-xl text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite</span>
            </button>
          </form>

          {/* Share Link */}
          <div className="bg-zinc-950 border border-zinc-850/60 p-4 rounded-2xl flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-semibold text-zinc-300">Invite Link</h4>
              <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                Anyone with access permissions can join via this link.
              </p>
            </div>
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-350 hover:text-zinc-200 rounded-xl border border-zinc-800 text-xs font-semibold transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Members List */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Collaborators</h4>
            <div className="space-y-2.5">
              {collaborators.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-border/5">
                  <div className="flex items-center gap-3">
                    {c.avatarUrl ? (
                      <img src={c.avatarUrl} alt={c.name} className="w-8 h-8 rounded-full object-cover bg-zinc-800" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-violet-650 flex items-center justify-center text-xs font-bold text-white uppercase">
                        {c.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <span className="text-sm font-medium text-zinc-200 block">{c.name}</span>
                      <span className="text-[11px] text-zinc-500 block">{c.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded bg-zinc-950 text-zinc-400 text-[10px] font-bold border border-zinc-850 uppercase tracking-wider flex items-center gap-1">
                      <Shield className="w-3 h-3 text-violet-500" />
                      {c.role}
                    </span>
                    {!c.isOwner && (
                      <button
                        onClick={() => handleRemove(c.id)}
                        className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-850 rounded-lg transition cursor-pointer"
                        title="Remove collaborator"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
