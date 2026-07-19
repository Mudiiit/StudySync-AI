'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  BookOpen, Plus, Trash2, Calendar, Clock, BarChart3, 
  HelpCircle, ChevronRight, CheckCircle2, AlertCircle, X, Sparkles 
} from 'lucide-react';
import { useToast } from '@/components/providers/ToastProvider';
import { useSearchParams } from 'next/navigation';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useEffect } from 'react';
import { useNotebooks, useNotesList } from '@/hooks/useNotes';
import { 
  useQuizzesList, 
  useAttemptsHistory, 
  useDeleteQuiz, 
  useGenerateQuizFromNote, 
  useGenerateQuizFromNotebook,
  useStartQuizAttempt 
} from '@/hooks/useQuizzes';

export default function QuizzesDashboardPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const action = searchParams?.get('action');
  
  // Queries
  const { data: quizzes, isLoading: loadingQuizzes } = useQuizzesList();
  const { data: history, isLoading: loadingHistory } = useAttemptsHistory();
  const { data: notebooks } = useNotebooks();
  const { data: notes } = useNotesList({ archived: false, deleted: false });

  // Mutations
  const deleteQuizMutation = useDeleteQuiz();
  const generateQuizFromNoteMutation = useGenerateQuizFromNote();
  const generateQuizFromNotebookMutation = useGenerateQuizFromNotebook();
  const startAttemptMutation = useStartQuizAttempt();

  // Modal / Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sourceType, setSourceType] = useState<'note' | 'notebook'>('note');
  const [selectedSourceId, setSelectedSourceId] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (action === 'new') {
      setIsModalOpen(true);
    }
  }, [action]);
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');

  // Math stats
  const totalQuizzes = quizzes?.length || 0;
  const completedAttempts = history?.length || 0;
  
  const averageScore = history && completedAttempts > 0 
    ? Math.round(history.reduce((acc, cur) => acc + cur.percentage, 0) / completedAttempts)
    : 0;

  const bestScore = history && completedAttempts > 0 
    ? Math.round(Math.max(...history.map((h) => h.percentage)))
    : 0;

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSourceId) {
      showToast('Please select a notebook or note as the source', 'error');
      return;
    }

    try {
      const dataPayload = { questionCount, difficulty };
      let newQuiz;

      if (sourceType === 'note') {
        newQuiz = await generateQuizFromNoteMutation.mutateAsync({
          noteId: selectedSourceId,
          data: dataPayload,
        });
      } else {
        newQuiz = await generateQuizFromNotebookMutation.mutateAsync({
          notebookId: selectedSourceId,
          data: dataPayload,
        });
      }

      showToast('Quiz generated successfully!', 'success');
      setIsModalOpen(false);
      setSelectedSourceId('');
    } catch (err: any) {
      console.error(err);
      const userMessage = err.response?.data?.message || 'Something went wrong while generating your quiz.';
      showToast(userMessage, 'error');
    }
  };

  const handleStartQuiz = async (quizId: string) => {
    try {
      const attempt = await startAttemptMutation.mutateAsync(quizId);
      router.push(`/quizzes/${quizId}/play?attemptId=${attempt.id}`);
    } catch (err: any) {
      showToast('Failed to start quiz attempt', 'error');
    }
  };

  const handleDeleteQuiz = async (id: string) => {
    try {
      await deleteQuizMutation.mutateAsync(id);
      showToast('Quiz deleted successfully', 'success');
    } catch (err) {
      showToast('Failed to delete quiz', 'error');
    }
  };

  const isGenerating = generateQuizFromNoteMutation.isPending || generateQuizFromNotebookMutation.isPending;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 text-left"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-sans">AI Quiz Engine</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Test your knowledge by generating intelligent quizzes directly from your notes or notebooks.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary/95 text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer shadow-[0_4px_14px_rgba(139,92,246,0.2)] transition-all shrink-0"
        >
          <Plus className="h-4.5 w-4.5" />
          Create New Quiz
        </button>
      </div>

      {/* Metrics Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: 'Total Quizzes', value: String(totalQuizzes), desc: 'Available for play', icon: HelpCircle, color: 'text-primary bg-primary/10' },
          { label: 'Attempts Completed', value: String(completedAttempts), desc: 'Total quiz runs', icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-500/10' },
          { label: 'Average Score', value: `${averageScore}%`, desc: 'Across all attempts', icon: BarChart3, color: 'text-blue-500 bg-blue-500/10' },
          { label: 'Best Score', value: `${bestScore}%`, desc: 'Personal best attempt', icon: Sparkles, color: 'text-orange-500 bg-orange-500/10' },
        ].map((metric, i) => {
          const Icon = metric.icon;
          return (
            <div key={i} className="glass-card p-6 rounded-2xl border border-border flex items-center justify-between bg-card/10 backdrop-blur-md">
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{metric.label}</span>
                <h3 className="text-2xl font-bold font-sans">{metric.value}</h3>
                <p className="text-xs text-muted-foreground">{metric.desc}</p>
              </div>
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${metric.color}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid of Quizzes and History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: AI Quizzes */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-xl tracking-tight text-foreground font-sans">Generated Quizzes</h2>
          </div>

          {loadingQuizzes ? (
            <div className="glass-card p-8 rounded-2xl border border-border text-center">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-muted-foreground text-xs mt-2">Loading quizzes...</p>
            </div>
          ) : !quizzes || quizzes.length === 0 ? (
            <div className="glass-card p-8 rounded-2xl border border-border text-center flex flex-col items-center justify-center text-zinc-500 bg-card/5">
              <HelpCircle className="h-10 w-10 text-zinc-600 mb-2" />
              <p className="text-sm font-semibold">No quizzes found</p>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-xs">
                Click "+ Create New Quiz" to generate your first AI study test.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {quizzes.map((quiz) => (
                <div key={quiz.id} className="glass-card p-5 rounded-2xl border border-border bg-card/10 flex flex-col justify-between hover:border-primary/20 transition duration-300">
                  <div className="space-y-2 text-left">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-bold text-sm leading-snug line-clamp-1 text-foreground">{quiz.title}</h4>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase shrink-0 ${
                        quiz.difficulty === 'EASY' ? 'bg-emerald-500/10 text-emerald-500' :
                        quiz.difficulty === 'MEDIUM' ? 'bg-blue-500/10 text-blue-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {quiz.difficulty}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{quiz.description}</p>
                    
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1">
                      <span className="flex items-center gap-1">
                        <HelpCircle className="h-3.5 w-3.5" />
                        {quiz.questionCount} Questions
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {quiz.estimatedTime} Mins
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/20">
                    <button
                      onClick={() => handleStartQuiz(quiz.id)}
                      className="flex-1 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer"
                    >
                      Start Quiz
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(quiz.id)}
                      className="p-1.5 hover:bg-red-500/10 text-zinc-400 hover:text-red-500 rounded-lg transition border border-border/50 cursor-pointer"
                      title="Delete Quiz"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Quiz Attempts History */}
        <div className="space-y-6">
          <h2 className="font-bold text-xl tracking-tight text-foreground font-sans">Recent Attempts</h2>
          
          {loadingHistory ? (
            <div className="glass-card p-8 rounded-2xl border border-border text-center">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : !history || history.length === 0 ? (
            <div className="glass-card p-6 rounded-2xl border border-border text-center text-zinc-500 bg-card/5">
              <p className="text-xs text-muted-foreground">No attempts logged yet. Start a quiz to log scores.</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {history.map((attempt) => (
                <div key={attempt.id} className="glass-card p-4 rounded-xl border border-border/60 bg-card/5 text-left flex items-center justify-between">
                  <div className="space-y-1 min-w-0">
                    <h4 className="font-bold text-xs leading-snug truncate text-zinc-200">{attempt.quiz?.title}</h4>
                    <div className="flex items-center gap-2.5 text-[9px] text-muted-foreground font-medium">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(attempt.startedAt).toLocaleDateString()}
                      </span>
                      <span>•</span>
                      <span>Score: {attempt.score}/{attempt.quiz?.questionCount}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    <span className={`text-xs font-bold font-sans ${
                      attempt.percentage >= 80 ? 'text-emerald-500' :
                      attempt.percentage >= 50 ? 'text-blue-500' : 'text-red-500'
                    }`}>
                      {attempt.percentage}%
                    </span>
                    <button
                      onClick={() => router.push(`/quizzes/attempts/${attempt.id}/results`)}
                      className="p-1 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition cursor-pointer"
                      title="Review Answers"
                    >
                      <ChevronRight className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Quiz Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col text-left">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-100 text-base">Generate AI Quiz</h3>
                  <p className="text-zinc-500 text-xs mt-0.5">Generate a quiz using Gemini from your materials.</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-400 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateQuiz} className="p-6 flex flex-col gap-5">
              {/* Source Type Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Source Material</label>
                <div className="grid grid-cols-2 gap-2.5 p-1 bg-zinc-950 rounded-xl border border-zinc-850">
                  <button
                    type="button"
                    onClick={() => { setSourceType('note'); setSelectedSourceId(''); }}
                    className={`py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      sourceType === 'note' ? 'bg-zinc-850 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Note
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSourceType('notebook'); setSelectedSourceId(''); }}
                    className={`py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      sourceType === 'notebook' ? 'bg-zinc-850 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Notebook
                  </button>
                </div>
              </div>

              {/* Source Select Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Select {sourceType === 'note' ? 'Note' : 'Notebook'}</label>
                <select
                  value={selectedSourceId}
                  onChange={(e) => setSelectedSourceId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-violet-500 cursor-pointer"
                  required
                >
                  <option value="">-- Select --</option>
                  {sourceType === 'note' 
                    ? notes?.notes?.map((n: any) => <option key={n.id} value={n.id}>{n.title}</option>)
                    : notebooks?.map((nb: any) => <option key={nb.id} value={nb.id}>{nb.title}</option>)
                  }
                </select>
              </div>

              {/* Options */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Question Count</label>
                  <select
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-violet-500 cursor-pointer"
                  >
                    <option value={5}>5 Questions</option>
                    <option value={10}>10 Questions</option>
                    <option value={20}>20 Questions</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-violet-500 cursor-pointer"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-4 border-t border-border/10 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isGenerating}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 font-semibold text-zinc-300 transition text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 font-semibold text-white transition text-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? 'Generating...' : 'Generate Quiz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) handleDeleteQuiz(deleteConfirmId);
        }}
        title="Delete Quiz"
        message="Are you sure you want to delete this quiz? This action will permanently remove it from your records."
      />
    </motion.div>
  );
}
