'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Sparkles, Brain, HelpCircle, BookOpen, FileText } from 'lucide-react';
import { 
  useGenerateFlashcardsFromNote, 
  useGenerateFlashcardsFromSelection, 
  useGenerateFlashcardsFromNotebook 
} from '@/hooks/useFlashcards';
import { useToast } from '../providers/ToastProvider';

interface GenerateFlashcardsModalProps {
  noteId?: string;
  notebookId?: string;
  selectedText?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function GenerateFlashcardsModal({ 
  noteId, 
  notebookId, 
  selectedText,
  onClose, 
  onSuccess 
}: GenerateFlashcardsModalProps) {
  const [type, setType] = useState<'recall' | 'conceptual' | 'scenario' | 'interview'>('recall');
  const [quantity, setQuantity] = useState<number>(5);
  const [manualText, setManualText] = useState<string>('');

  const generateNoteMutation = useGenerateFlashcardsFromNote();
  const generateSelectionMutation = useGenerateFlashcardsFromSelection();
  const generateNotebookMutation = useGenerateFlashcardsFromNotebook();

  const { showToast } = useToast();
  const router = useRouter();

  const isLoading = 
    generateNoteMutation.isPending || 
    generateSelectionMutation.isPending || 
    generateNotebookMutation.isPending;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (selectedText) {
        showToast('Generating AI flashcards from selection...', 'info');
        await generateSelectionMutation.mutateAsync({ 
          text: selectedText, 
          noteId, 
          type, 
          quantity 
        });
      } else if (noteId) {
        showToast('Generating AI flashcards from note...', 'info');
        await generateNoteMutation.mutateAsync({ noteId, type, quantity });
      } else if (notebookId) {
        showToast('Generating AI flashcards from notebook...', 'info');
        await generateNotebookMutation.mutateAsync({ notebookId, type, quantity });
      } else {
        if (!manualText.trim()) {
          showToast('Please enter text to generate flashcards', 'info');
          return;
        }
        showToast('Generating AI flashcards from text...', 'info');
        await generateSelectionMutation.mutateAsync({ 
          text: manualText, 
          type, 
          quantity 
        });
      }

      showToast(`AI successfully generated ${quantity} flashcards!`, 'success');
      if (onSuccess) onSuccess();
      onClose();
      router.push('/flashcards?mode=review');
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Failed to generate flashcards', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-100 text-base">AI Flashcards Creator</h3>
              <p className="text-zinc-500 text-xs mt-0.5">
                {noteId ? 'Generating from note content' : notebookId ? 'Generating from notebook contents' : 'Create cards from custom text input'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-400 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleGenerate} className="p-6 flex flex-col gap-5">
          
          {/* Custom Text input if no noteId or notebookId is passed */}
          {!noteId && !notebookId && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Source Content</label>
              <textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Paste paragraph, study guide, or lecture text here..."
                rows={4}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition resize-none"
                required
              />
            </div>
          )}

          {/* Flashcard Generation Format Style */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Flashcard Style</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'recall', label: 'Basic Recall', desc: 'Facts, terms, & definitions' },
                { id: 'conceptual', label: 'Conceptual', desc: 'Relationships & principles' },
                { id: 'scenario', label: 'Scenario-Based', desc: 'Case applications' },
                { id: 'interview', label: 'Interview Prep', desc: 'Walkthroughs & trade-offs' },
              ].map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setType(style.id as any)}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col gap-1 transition ${
                    type === style.id
                      ? 'bg-indigo-500/10 border-indigo-500 text-indigo-300'
                      : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:border-zinc-800'
                  }`}
                >
                  <span className="text-xs font-semibold">{style.label}</span>
                  <span className="text-[10px] text-zinc-500 leading-tight">{style.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quantity Selector */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Number of Cards</label>
            <div className="flex gap-2">
              {[5, 10, 15, 20].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setQuantity(num)}
                  className={`flex-1 py-2.5 rounded-xl border font-semibold text-xs tracking-wider transition ${
                    quantity === num
                      ? 'bg-indigo-500/10 border-indigo-500 text-indigo-300'
                      : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:border-zinc-800'
                  }`}
                >
                  {num} Cards
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-4 border-t border-zinc-800/50 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 font-semibold text-zinc-300 transition text-sm disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-white transition text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {isLoading ? 'Generating...' : 'Generate Flashcards'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
