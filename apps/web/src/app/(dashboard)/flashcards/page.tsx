'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  useFlashcardsList, 
  useDueCards, 
  useFlashcardStats, 
  useDeleteFlashcard,
  useCreateFlashcard,
  useUpdateFlashcard
} from '@/hooks/useFlashcards';
import { useNotebooks } from '@/hooks/useNotes';
import { useToast } from '@/components/providers/ToastProvider';
import ReviewSessionModal from '@/components/flashcards/ReviewSessionModal';
import GenerateFlashcardsModal from '@/components/flashcards/GenerateFlashcardsModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { 
  Sparkles, Brain, Clock, Award, Flame, Search, Filter, 
  Plus, Trash2, Edit2, Play, Eye, BookOpen, Star, RefreshCw, BarChart2, X 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FlashcardsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  
  // States
  const [isReviewing, setIsReviewing] = useState(false);

  useEffect(() => {
    if (searchParams.get('mode') === 'review') {
      setIsReviewing(true);
    }
  }, [searchParams]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notebookFilter, setNotebookFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [aiFilter, setAiFilter] = useState<boolean | undefined>(undefined);
  const [favoriteFilter, setFavoriteFilter] = useState<boolean | undefined>(undefined);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Manual Card Creation / Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [cardForm, setCardForm] = useState({
    question: '',
    answer: '',
    hint: '',
    explanation: '',
    difficulty: 'medium',
    tags: '',
    notebookId: ''
  });

  // Queries
  const { data: stats, isLoading: loadingStats, refetch: refetchStats } = useFlashcardStats();
  const { data: dueCards, isLoading: loadingDue, refetch: refetchDue } = useDueCards();
  const { data: notebooks } = useNotebooks();
  
  const { data: cardsData, isLoading: loadingCards, refetch: refetchCards } = useFlashcardsList({
    search: searchQuery || undefined,
    notebookId: notebookFilter || undefined,
    difficulty: difficultyFilter || undefined,
    aiGenerated: aiFilter,
    isFavorite: favoriteFilter,
    tag: selectedTag || undefined,
    page: currentPage,
    limit: 10
  });

  // Mutations
  const createMutation = useCreateFlashcard();
  const updateMutation = useUpdateFlashcard();
  const deleteMutation = useDeleteFlashcard();

  const handleCreateOrUpdateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardForm.question.trim() || !cardForm.answer.trim()) {
      showToast('Question and Answer are required', 'info');
      return;
    }

    const payload = {
      question: cardForm.question,
      answer: cardForm.answer,
      hint: cardForm.hint || undefined,
      explanation: cardForm.explanation || undefined,
      difficulty: cardForm.difficulty,
      tags: cardForm.tags.split(',').map(t => t.trim()).filter(Boolean),
      notebookId: cardForm.notebookId || undefined
    };

    try {
      if (editId) {
        await updateMutation.mutateAsync({ id: editId, data: payload });
        showToast('Flashcard updated successfully', 'success');
      } else {
        await createMutation.mutateAsync(payload);
        showToast('Flashcard created successfully', 'success');
      }
      setIsEditing(false);
      setEditId(null);
      setCardForm({ question: '', answer: '', hint: '', explanation: '', difficulty: 'medium', tags: '', notebookId: '' });
      refetchCards();
      refetchStats();
      refetchDue();
    } catch (err: any) {
      showToast(err.message || 'Failed to save card', 'error');
    }
  };

  const handleEditClick = (card: any) => {
    setEditId(card.id);
    setCardForm({
      question: card.question,
      answer: card.answer,
      hint: card.hint || '',
      explanation: card.explanation || '',
      difficulty: card.difficulty,
      tags: card.tags?.join(', ') || '',
      notebookId: card.notebookId || ''
    });
    setIsEditing(true);
  };

  const handleDeleteCard = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      showToast('Flashcard deleted', 'success');
      refetchCards();
      refetchStats();
      refetchDue();
    } catch (err: any) {
      showToast('Failed to delete card', 'error');
    }
  };

  const toggleFavorite = async (card: any) => {
    try {
      await updateMutation.mutateAsync({
        id: card.id,
        data: { isFavorite: !card.isFavorite }
      });
      showToast(card.isFavorite ? 'Removed from favorites' : 'Added to favorites', 'success');
      refetchCards();
    } catch (err: any) {
      showToast('Failed to update favorite', 'error');
    }
  };

  return (
    <div className="absolute inset-0 bg-zinc-950 overflow-y-auto p-8 text-zinc-100 flex flex-col gap-8 scrollbar-thin">
      
      {/* Top Banner Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent flex items-center gap-2.5">
            <Brain className="w-8 h-8 text-indigo-400" />
            Enterprise AI Flashcards
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Intelligent spaced repetition workspace fueled by Anki-grade SM-2 & Gemini AI.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsGenerating(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-semibold text-xs tracking-wider rounded-xl transition shadow"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            AI GENERATE
          </button>
          
          <button
            onClick={() => {
              setEditId(null);
              setCardForm({ question: '', answer: '', hint: '', explanation: '', difficulty: 'medium', tags: '', notebookId: '' });
              setIsEditing(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs tracking-wider rounded-xl transition shadow shadow-indigo-600/10"
          >
            <Plus className="w-3.5 h-3.5" />
            CREATE CARD
          </button>
        </div>
      </div>

      {/* Spaced Repetition Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Daily Streak */}
        <div className="p-5 rounded-2xl border border-zinc-900 bg-zinc-900/30 flex items-center gap-4 relative overflow-hidden group hover:border-orange-500/20 transition">
          <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-xs text-zinc-500 font-medium block">Daily Streak</span>
            <span className="text-2xl font-bold tracking-tight text-zinc-200 mt-0.5">
              {loadingStats ? '...' : `${stats?.streak || 0} Days`}
            </span>
          </div>
        </div>

        {/* Reviewed Today */}
        <div className="p-5 rounded-2xl border border-zinc-900 bg-zinc-900/30 flex items-center gap-4 relative overflow-hidden group hover:border-emerald-500/20 transition">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-zinc-500 font-medium block">Reviewed Today</span>
            <span className="text-2xl font-bold tracking-tight text-zinc-200 mt-0.5">
              {loadingStats ? '...' : `${stats?.reviewsToday || 0} Cards`}
            </span>
          </div>
        </div>

        {/* Due Count */}
        <div className="p-5 rounded-2xl border border-zinc-900 bg-zinc-900/30 flex items-center justify-between gap-4 relative overflow-hidden group hover:border-indigo-500/20 transition">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-zinc-500 font-medium block">Cards Due</span>
              <span className="text-2xl font-bold tracking-tight text-zinc-200 mt-0.5">
                {loadingStats ? '...' : stats?.dueCount || 0}
              </span>
            </div>
          </div>
          
          {dueCards && dueCards.length > 0 && (
            <button
              onClick={() => setIsReviewing(true)}
              className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1 text-xs font-semibold px-3.5 py-2 shadow"
            >
              <Play className="w-3 h-3 fill-current" />
              REVIEW
            </button>
          )}
        </div>

        {/* Retention Accuracy */}
        <div className="p-5 rounded-2xl border border-zinc-900 bg-zinc-900/30 flex items-center gap-4 relative overflow-hidden group hover:border-amber-500/20 transition">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Star className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-zinc-500 font-medium block">Retention Accuracy</span>
            <span className="text-2xl font-bold tracking-tight text-zinc-200 mt-0.5">
              {loadingStats ? '...' : `${stats?.accuracy || 100}%`}
            </span>
          </div>
        </div>
      </div>

      {/* Analytics Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Weekly Reviews Projections Bar Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl border border-zinc-900 bg-zinc-900/10 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
            <h3 className="font-semibold text-sm tracking-wide text-zinc-300 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-400" />
              Due Schedule Projections
            </h3>
            <span className="text-[10px] text-zinc-500 font-medium">Upcoming 7 Days</span>
          </div>
          
          <div className="flex-1 min-h-[160px] flex items-end justify-between gap-2 pt-6">
            {loadingStats ? (
              <div className="w-full flex items-center justify-center text-zinc-600 text-xs">Loading statistics...</div>
            ) : (
              stats?.upcomingReviews?.map((day: any, idx: number) => {
                const max = Math.max(...stats.upcomingReviews.map((d: any) => d.count), 1);
                const heightPercentage = Math.max((day.count / max) * 100, 8);
                
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2.5 group">
                    <span className="text-[10px] font-semibold text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      {day.count}
                    </span>
                    <div className="w-full bg-zinc-900 rounded-lg overflow-hidden h-32 flex items-end">
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${heightPercentage}%` }}
                        transition={{ duration: 0.5, delay: idx * 0.05 }}
                        className={`w-full rounded-t-md bg-gradient-to-t ${
                          day.count > 0 
                            ? 'from-indigo-600 to-indigo-400' 
                            : 'from-zinc-800 to-zinc-700'
                        }`}
                      />
                    </div>
                    <span className="text-[10px] text-zinc-500 font-medium">{day.label}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Weakest Topics List */}
        <div className="p-6 rounded-2xl border border-zinc-900 bg-zinc-900/10 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
            <h3 className="font-semibold text-sm tracking-wide text-zinc-300 flex items-center gap-2">
              <Brain className="w-4 h-4 text-orange-400" />
              Weak Areas
            </h3>
            <span className="text-[10px] text-zinc-500 font-medium">By "Again" counts</span>
          </div>

          <div className="flex-1 flex flex-col gap-3 justify-center">
            {loadingStats ? (
              <div className="text-zinc-600 text-xs text-center">Loading topics...</div>
            ) : stats?.weakTopics && stats.weakTopics.length > 0 ? (
              stats.weakTopics.map((topic: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-zinc-900/40 border border-zinc-900/60 rounded-xl hover:border-zinc-855 transition">
                  <span className="text-xs font-semibold text-zinc-400">#{topic.topic}</span>
                  <span className="text-[10px] font-bold bg-orange-500/10 border border-orange-500/20 text-orange-400 px-2.5 py-0.5 rounded-full">
                    {topic.count} errors
                  </span>
                </div>
              ))
            ) : (
              <div className="text-zinc-500 text-xs text-center py-6">
                All study topics are performing excellently!
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Main Flashcard Management Panel */}
      <div className="flex flex-col gap-4 border border-zinc-900 bg-zinc-900/10 rounded-3xl p-6">
        
        {/* Filters Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-500" />
            <h3 className="font-semibold text-sm text-zinc-300 tracking-wide">Card Directory</h3>
          </div>

          {/* Controls Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:flex gap-3 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-600" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search question, answer..."
                className="w-full bg-zinc-950 border border-zinc-850 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Notebook Selector */}
            <select
              value={notebookFilter}
              onChange={(e) => setNotebookFilter(e.target.value)}
              className="bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-xs text-zinc-400 focus:outline-none focus:border-indigo-500 transition"
            >
              <option value="">All Notebooks</option>
              {notebooks?.map((n: any) => (
                <option key={n.id} value={n.id}>{n.title}</option>
              ))}
            </select>

            {/* Difficulty Selector */}
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-xs text-zinc-400 focus:outline-none focus:border-indigo-500 transition"
            >
              <option value="">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>

            {/* AI Generated filter */}
            <div className="flex bg-zinc-950 border border-zinc-850 rounded-xl p-0.5 select-none shrink-0">
              <button
                type="button"
                onClick={() => setAiFilter(undefined)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  aiFilter === undefined
                    ? 'bg-zinc-850 text-zinc-200'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setAiFilter(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  aiFilter === true
                    ? 'bg-indigo-650/20 text-indigo-400'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                AI Generated
              </button>
              <button
                type="button"
                onClick={() => setAiFilter(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  aiFilter === false
                    ? 'bg-zinc-850 text-zinc-200'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Manual
              </button>
            </div>

            {/* Favorites filter */}
            <button
              onClick={() => setFavoriteFilter(prev => prev === undefined ? true : undefined)}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold tracking-wide transition ${
                favoriteFilter === true 
                  ? 'bg-amber-500/10 border-amber-500 text-amber-400' 
                  : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:text-zinc-300'
              }`}
            >
              ★ Favorites
            </button>

            {/* Clear Filters */}
            {(searchQuery || notebookFilter || difficultyFilter || aiFilter !== undefined || favoriteFilter !== undefined || selectedTag) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setNotebookFilter('');
                  setDifficultyFilter('');
                  setAiFilter(undefined);
                  setFavoriteFilter(undefined);
                  setSelectedTag(null);
                }}
                className="text-[10px] text-zinc-500 hover:text-zinc-400 underline font-semibold tracking-wide"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Directory List Table */}
        <div className="overflow-x-auto min-h-[300px]">
          {loadingCards ? (
            <div className="flex items-center justify-center py-20 text-zinc-500 text-xs">Loading cards directory...</div>
          ) : cardsData?.items && cardsData.items.length > 0 ? (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-900 text-zinc-500 font-semibold">
                  <th className="py-3 px-4 w-6"></th>
                  <th className="py-3 px-4">Question</th>
                  <th className="py-3 px-4">Answer</th>
                  <th className="py-3 px-4">Notebook</th>
                  <th className="py-3 px-4">Difficulty</th>
                  <th className="py-3 px-4">Tags</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/60">
                {cardsData.items.map((card) => (
                  <tr key={card.id} className="hover:bg-zinc-900/20 group transition">
                    {/* Favorite toggle icon */}
                    <td className="py-3.5 px-4">
                      <button 
                        onClick={() => toggleFavorite(card)}
                        className={`transition ${card.isFavorite ? 'text-amber-400' : 'text-zinc-700 hover:text-zinc-500'}`}
                      >
                        ★
                      </button>
                    </td>

                    {/* Question */}
                    <td className="py-3.5 px-4 font-semibold text-zinc-200 max-w-[200px] truncate">
                      {card.question}
                    </td>

                    {/* Answer */}
                    <td className="py-3.5 px-4 text-zinc-400 max-w-[220px] truncate">
                      {card.answer}
                    </td>

                    {/* Notebook Label */}
                    <td className="py-3.5 px-4 text-zinc-500">
                      {card.notebook?.title || 'Standalone'}
                    </td>

                    {/* Difficulty */}
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                        card.difficulty === 'hard' 
                          ? 'bg-red-500/10 text-red-400' 
                          : card.difficulty === 'medium'
                            ? 'bg-indigo-500/10 text-indigo-400' 
                            : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {card.difficulty}
                      </span>
                    </td>

                    {/* Tags */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {card.tags?.map((t, idx) => (
                          <span 
                            key={idx} 
                            onClick={() => setSelectedTag(t)}
                            className="bg-zinc-900 text-zinc-500 px-1.5 py-0.5 rounded text-[9px] cursor-pointer hover:bg-zinc-800 transition"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Action Row */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditClick(card)}
                          className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-300 transition"
                          title="Edit Card"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        
                        <button
                          onClick={() => setDeleteConfirmId(card.id)}
                          className="p-1 rounded bg-zinc-900 hover:bg-red-950/40 text-zinc-500 hover:text-red-400 transition"
                          title="Delete Card"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4 border border-dashed border-border/60 rounded-2xl bg-card/10 select-none text-center">
              <BookOpen className="h-10 w-10 text-muted-foreground/30 mb-3 stroke-[1.25]" />
              <h3 className="font-bold text-xs text-foreground mb-1">No flashcards found</h3>
              <p className="text-[11px] text-muted-foreground max-w-xs leading-relaxed mb-4">
                Create cards manually or let the AI generate flashcards from your study notes automatically.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1 bg-secondary hover:bg-secondary/80 border border-border text-foreground px-3 py-1.5 rounded-lg text-[10px] font-semibold transition cursor-pointer shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Card</span>
                </button>
                <button
                  onClick={() => setIsGenerating(true)}
                  className="flex items-center gap-1 bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-lg text-[10px] font-semibold transition cursor-pointer shadow-sm shadow-primary/20"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>AI Generate</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        {cardsData && cardsData.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-zinc-900 pt-4 text-xs">
            <span className="text-zinc-500">Showing page {currentPage} of {cardsData.totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={currentPage === cardsData.totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Spaced Repetition Active Review Session Modal Overlay */}
      {isReviewing && dueCards && dueCards.length > 0 && (
        <ReviewSessionModal
          cards={dueCards}
          onClose={() => {
            setIsReviewing(false);
            router.push('/flashcards');
            refetchDue();
            refetchStats();
            refetchCards();
          }}
          onFinish={() => {
            setIsReviewing(false);
            router.push('/flashcards');
            refetchDue();
            refetchStats();
            refetchCards();
          }}
        />
      )}

      {/* Flashcard Generation Modal Setup */}
      {isGenerating && (
        <GenerateFlashcardsModal
          onClose={() => {
            setIsGenerating(false);
            refetchDue();
            refetchStats();
            refetchCards();
          }}
          onSuccess={() => {
            setIsGenerating(false);
            refetchDue();
            refetchStats();
            refetchCards();
          }}
        />
      )}

      {/* Manual Creation / Editing Modal Panel */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between p-6 border-b border-zinc-800">
                <h3 className="font-semibold text-zinc-200 text-base">{editId ? 'Edit Flashcard' : 'Create New Flashcard'}</h3>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="p-1 rounded bg-zinc-850 hover:bg-zinc-800 text-zinc-400 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateOrUpdateCard} className="p-6 flex flex-col gap-4 text-xs">
                
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-zinc-400 uppercase tracking-wide">Question</label>
                  <input
                    type="text"
                    value={cardForm.question}
                    onChange={(e) => setCardForm(prev => ({ ...prev, question: e.target.value }))}
                    placeholder="Enter study question..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-200 focus:outline-none focus:border-indigo-500 transition"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-zinc-400 uppercase tracking-wide">Answer</label>
                  <textarea
                    value={cardForm.answer}
                    onChange={(e) => setCardForm(prev => ({ ...prev, answer: e.target.value }))}
                    placeholder="Enter study answer..."
                    rows={3}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-200 focus:outline-none focus:border-indigo-500 transition resize-none"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-zinc-400 uppercase tracking-wide">Hint (Optional)</label>
                  <input
                    type="text"
                    value={cardForm.hint}
                    onChange={(e) => setCardForm(prev => ({ ...prev, hint: e.target.value }))}
                    placeholder="E.g. Think of architectural layers..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-200 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-zinc-400 uppercase tracking-wide">Explanation (Optional)</label>
                  <textarea
                    value={cardForm.explanation}
                    onChange={(e) => setCardForm(prev => ({ ...prev, explanation: e.target.value }))}
                    placeholder="E.g. Detailed context why this occurs..."
                    rows={2}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-200 focus:outline-none focus:border-indigo-500 transition resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-zinc-400 uppercase tracking-wide">Notebook (Optional)</label>
                    <select
                      value={cardForm.notebookId}
                      onChange={(e) => setCardForm(prev => ({ ...prev, notebookId: e.target.value }))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-400 focus:outline-none focus:border-indigo-500 transition"
                    >
                      <option value="">None</option>
                      {notebooks?.map((n: any) => (
                        <option key={n.id} value={n.id}>{n.title}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-zinc-400 uppercase tracking-wide">Difficulty</label>
                    <select
                      value={cardForm.difficulty}
                      onChange={(e) => setCardForm(prev => ({ ...prev, difficulty: e.target.value }))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-400 focus:outline-none focus:border-indigo-500 transition"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-zinc-400 uppercase tracking-wide">Tags (Comma Separated)</label>
                  <input
                    type="text"
                    value={cardForm.tags}
                    onChange={(e) => setCardForm(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="e.g. math, science, algorithms"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-200 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 py-2.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 font-semibold text-zinc-300 transition text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-white transition text-xs"
                  >
                    {editId ? 'Save Changes' : 'Create Card'}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) handleDeleteCard(deleteConfirmId);
        }}
        title="Delete Flashcard"
        message="Are you sure you want to delete this flashcard? This action cannot be undone."
      />
    </div>
  );
}
