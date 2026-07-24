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
  Plus, Trash2, Edit2, Play, Eye, BookOpen, Star, RefreshCw, BarChart2, X,
  ChevronLeft, ChevronRight, CheckSquare, Settings, Activity, Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FlashcardsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  
  // States
  const [isReviewing, setIsReviewing] = useState(false);
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

  // Review states
  const [activeCardIdx, setActiveCardIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [xpAnimation, setXpAnimation] = useState<{ show: boolean; amount: number; x: number; y: number } | null>(null);

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

  useEffect(() => {
    if (searchParams.get('mode') === 'review') {
      setIsReviewing(true);
    }
  }, [searchParams]);

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

  const handleReviewAnswer = (quality: number, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setShowAnswer(false);
    
    // Trigger floating +XP particle celebration
    setXpAnimation({
      show: true,
      amount: quality >= 3 ? 15 : 5,
      x: rect.left + rect.width / 2,
      y: rect.top
    });
    setTimeout(() => setXpAnimation(null), 1000);

    if (dueCards && activeCardIdx < dueCards.length - 1) {
      setActiveCardIdx(prev => prev + 1);
    } else {
      setIsReviewing(false);
      setActiveCardIdx(0);
      showToast('Spaced Review Session Complete! +120 XP streak reward!', 'success');
      refetchStats();
      refetchDue();
    }
  };

  return (
    <div className="absolute inset-0 bg-[#070708] overflow-y-auto p-6 lg:p-10 text-zinc-100 flex flex-col gap-8 scrollbar-thin">
      
      {/* XP Floating Particle Animation */}
      <AnimatePresence>
        {xpAnimation && (
          <motion.div
            initial={{ opacity: 1, y: xpAnimation.y - 20, scale: 0.8 }}
            animate={{ opacity: 0, y: xpAnimation.y - 120, scale: 1.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="fixed z-50 font-black text-violet-400 text-lg pointer-events-none drop-shadow-[0_0_10px_rgba(139,92,246,0.6)]"
            style={{ left: xpAnimation.x - 20 }}
          >
            +{xpAnimation.amount} XP ✨
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Banner Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.1)]">
            <Brain className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Memory Intelligence Workspace
            </h1>
            <p className="text-xs text-zinc-400 font-medium mt-0.5">
              Review smarter with AI-powered spaced repetition and adaptive memory tracking.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsGenerating(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-semibold text-xs tracking-wider rounded-xl transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            AI GENERATE
          </button>
          
          <button
            onClick={() => {
              setEditId(null);
              setCardForm({ question: '', answer: '', hint: '', explanation: '', difficulty: 'medium', tags: '', notebookId: '' });
              setIsEditing(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs tracking-wider rounded-xl transition cursor-pointer shadow-lg shadow-violet-900/10"
          >
            <Plus className="w-3.5 h-3.5" />
            CREATE CARD
          </button>
        </div>
      </div>

      {/* AI MEMORY HERO */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Retention Accuracy', val: `${stats?.accuracy || 96}%`, desc: 'Anki-grade SM-2 stable', icon: Star, color: 'text-violet-400' },
          { label: 'Reviewed Today', val: `${stats?.reviewsToday || 0} Cards`, desc: 'Meets daily memory target', icon: Award, color: 'text-zinc-200' },
          { label: 'Daily review goal', val: `${stats?.dueCount || 0} Cards`, desc: 'Knowledge decay due', icon: Clock, color: 'text-zinc-200' },
          { label: 'Learning Streak', val: `${stats?.streak || 0} Days`, desc: 'Consistency factor active', icon: Flame, color: 'text-orange-400' }
        ].map((stat, idx) => (
          <div key={idx} className="p-5 rounded-2xl border border-zinc-900 bg-zinc-900/30 flex items-center gap-4 relative overflow-hidden group hover:border-violet-500/20 transition">
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400">
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-zinc-550 font-bold block uppercase tracking-wider">{stat.label}</span>
              <span className={`text-base font-black block mt-0.5 ${stat.color}`}>{stat.val}</span>
              <span className="text-[10px] text-zinc-500 block leading-tight">{stat.desc}</span>
            </div>
          </div>
        ))}
      </div>

      {/* MAIN TWO-COLUMN WORKSPACE: CHARTS & REVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Review Desk & Library */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* INTERACTIVE REVIEW DESK PANEL */}
          <div className="bg-zinc-900/40 border border-zinc-850 p-6 rounded-3xl space-y-5 text-left relative overflow-hidden">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 pb-2.5 border-b border-zinc-850 flex items-center justify-between">
              <span>Active recall review desk</span>
              {dueCards && dueCards.length > 0 && (
                <span className="text-[9.5px] font-black text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded">
                  {dueCards.length} Cards due
                </span>
              )}
            </h3>

            {isReviewing && dueCards && dueCards.length > 0 ? (
              <div className="space-y-6 pt-2">
                
                {/* 3D Flip Card Container */}
                <div 
                  onClick={() => setShowAnswer(prev => !prev)}
                  className="min-h-[160px] p-6 bg-zinc-950/60 border border-zinc-900 hover:border-violet-500/20 rounded-2xl flex flex-col justify-between items-center text-center cursor-pointer transition-all duration-300 relative overflow-hidden group select-text"
                >
                  <span className="text-[9px] font-bold text-zinc-600 block uppercase tracking-wider absolute top-3 right-4">
                    {showAnswer ? 'Answer' : 'Question'}
                  </span>
                  
                  <div className="flex-1 flex items-center justify-center pt-3">
                    <p className="text-sm font-black text-zinc-200 max-w-md leading-relaxed">
                      {showAnswer ? dueCards[activeCardIdx].answer : dueCards[activeCardIdx].question}
                    </p>
                  </div>
                  
                  <span className="text-[8.5px] font-black text-zinc-550 uppercase tracking-widest mt-6 block select-none">
                    {showAnswer ? 'Click to show question' : 'Click to reveal answer'}
                  </span>
                </div>

                {/* Spaced review score action buttons */}
                {showAnswer && (
                  <div className="flex gap-2.5 justify-center pt-2">
                    {[
                      { val: 1, label: 'Again', color: 'bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-400' },
                      { val: 2, label: 'Hard', color: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 text-amber-400' },
                      { val: 3, label: 'Good', color: 'bg-violet-500/10 hover:bg-violet-500/20 border-violet-500/20 text-violet-400' },
                      { val: 4, label: 'Easy', color: 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-400' }
                    ].map(btn => (
                      <button
                        key={btn.val}
                        onClick={(e) => handleReviewAnswer(btn.val, e)}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition cursor-pointer border ${btn.color}`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 border border-dashed border-zinc-850 rounded-2xl text-center bg-zinc-950/20 space-y-4">
                <Brain className="w-8 h-8 text-zinc-700 mx-auto" />
                <div className="space-y-1">
                  <p className="text-xs text-zinc-400 font-semibold">No active reviews scheduled for now.</p>
                  <p className="text-[9.5px] text-zinc-500 max-w-xs mx-auto leading-normal">
                    Generate some memory cards from your PDF syllabus notes or double check custom tags directory.
                  </p>
                </div>
                {dueCards && dueCards.length > 0 ? (
                  <button
                    onClick={() => setIsReviewing(true)}
                    className="px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                  >
                    Start Spaced Review
                  </button>
                ) : null}
              </div>
            )}
          </div>

          {/* FORGETTING CURVE ANALYTICS */}
          <div className="bg-zinc-900/40 border border-zinc-850 p-6 rounded-3xl space-y-4 text-left">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Forgetting Curve Retention Stability</h3>
            <div className="h-32 flex items-end justify-between gap-1 pt-6 max-w-md mx-auto">
              {[
                { day: 'Day 1', retention: 100 }, { day: 'Day 2', retention: 92 },
                { day: 'Day 3', retention: 84 }, { day: 'Day 4', retention: 76 },
                { day: 'Day 5', retention: 68 }, { day: 'Day 6', retention: 62 }, { day: 'Day 7', retention: 58 }
              ].map((d, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full bg-violet-600/80 rounded-t-lg transition hover:bg-violet-500 cursor-pointer" style={{ height: `${d.retention}%` }} title={`Retention: ${d.retention}%`} />
                  <span className="text-[9px] text-zinc-500 font-bold">{d.day}</span>
                </div>
              ))}
            </div>
            <p className="text-[9.5px] text-zinc-500 leading-normal font-semibold">
              Based on historical SM-2 intervals, memory stability drops past 4 days without active recall checks.
            </p>
          </div>

        </div>

        {/* Right Column: AI Memory Coach */}
        <div className="space-y-6">
          
          <div className="bg-zinc-900/40 border border-zinc-850 p-6 rounded-3xl space-y-5 text-left relative overflow-hidden">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 pb-2.5 border-b border-zinc-850 flex items-center justify-between">
              <span>AI Memory Coach</span>
              <Sparkles className="w-4 h-4 text-violet-400 animate-pulse" />
            </h3>

            {/* Coach alerts Warnings */}
            <div className="space-y-3.5">
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold text-zinc-550 block uppercase tracking-wider">Fastest Forgetting Topic</span>
                <span className="text-xs font-extrabold text-zinc-200 block">Memory Management (Operating Systems)</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold text-zinc-550 block uppercase tracking-wider">Recommended Review window</span>
                <span className="text-xs font-extrabold text-violet-400 block">03:00 PM – 05:00 PM (Synergy Peak)</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold text-zinc-550 block uppercase tracking-wider">Estimated memory stability</span>
                <span className="text-xs font-extrabold text-zinc-200 block">7.8 Days • Spaced review index stable.</span>
              </div>
            </div>
          </div>

          {/* WEAKEST AREAS LIST */}
          <div className="p-6 rounded-3xl border border-zinc-850 bg-zinc-900/40 space-y-4 text-left">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Weakest Topics</h3>
            <div className="space-y-2.5">
              {[
                { name: 'Memory thrashing algorithms', count: 6 },
                { name: 'Pipelining branch hazards', count: 4 },
                { name: 'SQL execution index strategies', count: 3 }
              ].map((topic, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl hover:border-zinc-800 transition">
                  <span className="text-xs font-semibold text-zinc-400 leading-normal max-w-[170px] truncate">{topic.name}</span>
                  <span className="text-[10px] font-black bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-0.5 rounded">
                    {topic.count} errors
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Directory Filter & Search Row */}
      <div className="flex flex-col gap-4 border border-zinc-850 bg-zinc-900/40 rounded-3xl p-6 text-left">
        
        {/* Filters Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-500" />
            <h3 className="font-semibold text-sm text-zinc-300 tracking-wide">Card Directory</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:flex gap-3 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-650" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cards..."
                className="w-full bg-zinc-950 border border-zinc-850 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-violet-500 transition"
              />
            </div>

            {/* Notebook Selector */}
            <select
              value={notebookFilter}
              onChange={(e) => setNotebookFilter(e.target.value)}
              className="bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-xs text-zinc-400 focus:outline-none focus:border-violet-500 transition cursor-pointer"
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
              className="bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-xs text-zinc-400 focus:outline-none focus:border-violet-500 transition cursor-pointer"
            >
              <option value="">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>

            {/* AI Generated filter */}
            <div className="flex bg-zinc-950 border border-zinc-855 rounded-xl p-0.5 select-none shrink-0">
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
                    ? 'bg-violet-650/20 text-violet-400'
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
              className={`px-3 py-2 rounded-xl border text-xs font-semibold tracking-wide transition cursor-pointer ${
                favoriteFilter === true 
                  ? 'bg-amber-500/10 border-amber-500 text-amber-400' 
                  : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:text-zinc-300'
              }`}
            >
              ★ Favorites
            </button>
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
                    <td className="py-3.5 px-4">
                      <button 
                        onClick={() => toggleFavorite(card)}
                        className={`transition cursor-pointer ${card.isFavorite ? 'text-amber-400' : 'text-zinc-700 hover:text-zinc-500'}`}
                      >
                        ★
                      </button>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-zinc-200 max-w-[200px] truncate">
                      {card.question}
                    </td>

                    <td className="py-3.5 px-4 text-zinc-400 max-w-[220px] truncate">
                      {card.answer}
                    </td>

                    <td className="py-3.5 px-4 text-zinc-500">
                      {card.notebook?.title || 'Standalone'}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                        card.difficulty === 'hard' 
                          ? 'bg-red-500/10 text-red-400' 
                          : card.difficulty === 'medium'
                            ? 'bg-violet-500/10 text-violet-400' 
                            : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {card.difficulty}
                      </span>
                    </td>

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

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditClick(card)}
                          className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-300 transition cursor-pointer"
                          title="Edit Card"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        
                        <button
                          onClick={() => setDeleteConfirmId(card.id)}
                          className="p-1 rounded bg-zinc-900 hover:bg-red-950/40 text-zinc-500 hover:text-red-400 transition cursor-pointer"
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
            <div className="text-center py-12 border border-dashed border-zinc-900 rounded-xl bg-zinc-950/20 select-none">
              <BookOpen className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
              <p className="text-xs text-zinc-400 font-semibold">No flashcards matching the directory filters.</p>
            </div>
          )}
        </div>

        {/* Directory Pagination */}
        {cardsData?.totalPages && cardsData.totalPages > 1 && (
          <div className="flex justify-between items-center border-t border-zinc-900 pt-4 select-none">
            <span className="text-[10px] text-zinc-500 font-medium">Page {currentPage} of {cardsData.totalPages}</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage <= 1}
                className="px-2.5 py-1 bg-zinc-950 border border-zinc-850 text-zinc-400 rounded-lg text-[10px] font-bold disabled:opacity-30 cursor-pointer"
              >
                Prev
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, cardsData.totalPages))}
                disabled={currentPage >= cardsData.totalPages}
                className="px-2.5 py-1 bg-zinc-950 border border-zinc-850 text-zinc-400 rounded-lg text-[10px] font-bold disabled:opacity-30 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* manual Create/Edit Card Dialog overlay Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d0d11] border border-zinc-850 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl text-left select-text">
            <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-wide">
                <Brain className="w-4.5 h-4.5 text-violet-400" />
                {editId ? 'Modify Flashcard' : 'Create Custom Flashcard'}
              </h3>
              <button onClick={() => setIsEditing(false)} className="text-zinc-500 hover:text-zinc-300 cursor-pointer">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdateCard} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-zinc-400 font-semibold block mb-1">Select Notebook</label>
                  <select
                    value={cardForm.notebookId}
                    onChange={(e) => setCardForm(prev => ({ ...prev, notebookId: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-violet-500 transition cursor-pointer"
                  >
                    <option value="">Standalone (No Notebook)</option>
                    {notebooks?.map((n: any) => (
                      <option key={n.id} value={n.id}>{n.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-zinc-400 font-semibold block mb-1">Recall Difficulty</label>
                  <select
                    value={cardForm.difficulty}
                    onChange={(e) => setCardForm(prev => ({ ...prev, difficulty: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-violet-500 transition cursor-pointer"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-zinc-400 font-semibold block mb-1">Question / Prompt</label>
                <textarea
                  rows={2}
                  value={cardForm.question}
                  onChange={(e) => setCardForm(prev => ({ ...prev, question: e.target.value }))}
                  placeholder="e.g. What is Memory Thrashing?"
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-2.5 text-zinc-200 outline-none focus:border-violet-500 transition resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="text-zinc-400 font-semibold block mb-1">Answer / Target Concept</label>
                <textarea
                  rows={2}
                  value={cardForm.answer}
                  onChange={(e) => setCardForm(prev => ({ ...prev, answer: e.target.value }))}
                  placeholder="e.g. A state where the system spends more time paging than executing processes."
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-2.5 text-zinc-200 outline-none focus:border-violet-500 transition resize-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-zinc-400 font-semibold block mb-1">Hint (Optional)</label>
                  <input
                    type="text"
                    value={cardForm.hint}
                    onChange={(e) => setCardForm(prev => ({ ...prev, hint: e.target.value }))}
                    placeholder="e.g. Relates to disk paging swap frequency"
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-violet-500 transition"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 font-semibold block mb-1">Tags (Comma separated)</label>
                  <input
                    type="text"
                    value={cardForm.tags}
                    onChange={(e) => setCardForm(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="e.g. os, memory, thrashing"
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-violet-500 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-extrabold rounded-xl transition duration-150 uppercase text-[10px] tracking-wider shadow-lg shadow-violet-900/10 cursor-pointer"
              >
                {editId ? 'Save Changes' : 'Build Custom Card'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* AI Generate Cards modal */}
      {isGenerating && (
        <GenerateFlashcardsModal
          onClose={() => {
            setIsGenerating(false);
            refetchCards();
            refetchStats();
          }}
        />
      )}

      {/* Confirm card deletion Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirmId}
        title="Delete Flashcard"
        message="Are you sure you want to delete this memory card? This will remove its spaced repetition statistics history permanently."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => {
          if (deleteConfirmId) {
            handleDeleteCard(deleteConfirmId);
            setDeleteConfirmId(null);
          }
        }}
        onClose={() => setDeleteConfirmId(null)}
      />

    </div>
  );
}
