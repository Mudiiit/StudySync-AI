'use client';

import React, { useEffect, useState } from 'react';
import { useRestoreVersion } from '@/hooks/useNotes';
import api from '@/lib/axios';
import { History, Calendar, CornerUpLeft, Loader2, FileClock } from 'lucide-react';
import { NoteVersion } from '@/services/notes';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface VersionHistoryPanelProps {
  noteId: string;
  onClose: () => void;
}

export default function VersionHistoryPanel({ noteId, onClose }: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoreConfirmId, setRestoreConfirmId] = useState<string | null>(null);
  const restoreVersionMutation = useRestoreVersion();

  const loadVersions = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/notes/${noteId}/versions`);
      setVersions(res.data);
    } catch (e) {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVersions();
  }, [noteId]);

  const handleRestore = async (versionId: string) => {
    try {
      await restoreVersionMutation.mutateAsync({ noteId, versionId });
      onClose();
    } catch (err) {
      // Ignored
    }
  };

  return (
    <div className="w-80 border-l border-border/40 bg-card/5 flex flex-col h-full font-sans text-sm p-4 select-none">
      <div className="flex items-center gap-2 mb-6">
        <History className="h-5 w-5 text-primary" />
        <h3 className="font-bold text-base">Version History</h3>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3">
        {loading ? (
          <div className="py-12 text-center flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Loading versions...</span>
          </div>
        ) : versions.length > 0 ? (
          versions.map((ver) => (
            <div
              key={ver.id}
              className="p-3.5 bg-secondary/15 rounded-lg border border-border/30 text-left hover:border-primary/20 transition-all flex items-center justify-between group"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {new Date(ver.createdAt).toLocaleDateString()}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Saved by {ver.updatedBy?.profile?.firstName || 'User'}
                </div>
                <div className="text-[10px] text-muted-foreground/60 font-mono">
                  {new Date(ver.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              <button
                onClick={() => setRestoreConfirmId(ver.id)}
                disabled={restoreVersionMutation.isPending}
                className="opacity-0 group-hover:opacity-100 p-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground rounded-lg cursor-pointer transition-all disabled:opacity-50"
                title="Restore this version"
              >
                <CornerUpLeft className="h-4 w-4" />
              </button>
            </div>
          ))
        ) : (
          <div className="py-12 text-center flex flex-col items-center justify-center gap-2">
            <FileClock className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">No past checkpoints found</p>
          </div>
        )}
      </div>
      <ConfirmModal
        isOpen={!!restoreConfirmId}
        onClose={() => setRestoreConfirmId(null)}
        onConfirm={() => {
          if (restoreConfirmId) handleRestore(restoreConfirmId);
        }}
        title="Restore Version"
        message="Are you sure you want to restore this version? Your current content will be saved as a new version history checkpoint."
        confirmLabel="Restore"
        cancelLabel="Cancel"
        type="warning"
      />
    </div>
  );
}
