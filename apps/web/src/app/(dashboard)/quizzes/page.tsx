'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, Plus, Trash2, Calendar, Clock, BarChart3, 
  HelpCircle, ChevronRight, CheckCircle2, AlertCircle, X, Sparkles,
  Target, Award, Brain, Zap, List, Grid, Search, BookMarked,
  Activity, BookCheck, ShieldAlert
} from 'lucide-react';
import { useToast } from '@/components/providers/ToastProvider';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useNotebooks } from '@/hooks/useNotes';
import { useNotesList } from '@/hooks/useNotes';
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
  const [wizardStep, setWizardStep] = useState(1);
  
  // Generator wizard parameters
  const [sourceType, setSourceType] = useState<'note' | 'notebook'>('note');
  const [selectedSourceId, setSelectedSourceId] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [adaptiveMode, setAdaptiveMode] = useState(true);
  const [questionType, setQuestionType] = useState<'MCQ' | 'TF' | 'MIXED'>('MIXED');
  
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (action === 'new') {
      setIsModalOpen(true);
      setWizardStep(1);
    }
  }, [action]);

  // Math stats
  const totalQuizzes = quizzes?.length || 0;
  const completedAttempts = history?.length || 0;
  
  const averageScore = history && completedAttempts > 0 
    ? Math.round(history.reduce((acc, cur) => acc + cur.percentage, 0) / completedAttempts)
    : 0;

  const bestScore = history && completedAttempts > 0 
    ? Math.round(Math.max(...history.map((h) => h.percentage)))
    : 0;

  const handleCreateQuiz = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedSourceId) {
      showToast('Please select a notebook or note as the source', 'error');
      return;
    }

    try {
      const dataPayload = { 
        questionCount, 
        difficulty,
        adaptiveMode,
        questionType
      };
      
      if (sourceType === 'note') {
        await generateQuizFromNoteMutation.mutateAsync({
          noteId: selectedSourceId,
          data: dataPayload,
        });
      } else {
        await generateQuizFromNotebookMutation.mutateAsync({
          notebookId: selectedSourceId,
          data: dataPayload,
        });
      }

      showToast('AI Quiz generated successfully!', 'success');
      setIsModalOpen(false);
      setSelectedSourceId('');
      setWizardStep(1);
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

  // Filter quizzes by search query
  const filteredQuizzes = quizzes?.filter(q => 
    q.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="absolute inset-0 bg-[#070708] overflow-y-auto p-6 lg:p-10 text-zinc-100 flex flex-col gap-8 scrollbar-thin">
      
      {/* AI HERO EXPERIENCE */}
      <div className="relative overflow-hidden bg-gradient-to-br from-zinc-900/40 via-zinc-900/10 to-transparent border border-zinc-850 p-6 lg:p-8 rounded-3xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-3.5 z-10 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            Adaptive Assessment Hub
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-white font-sans">
              AI Assessment Workspace
            </h1>
            <p className="text-xs text-zinc-400 max-w-lg mt-1 font-medium leading-relaxed">
              Verify your recall stability and map cognitive weak concepts with active, Adaptive Difficulty assessments built automatically from notes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-bold text-zinc-500">
            <span className="flex items-center gap-1">
              <Brain className="w-3.5 h-3.5 text-violet-400" /> Mastery score: {averageScore}%
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-zinc-400" /> Avg speed: 18s/question
            </span>
            <span>•</span>
            <span className="text-emerald-400">Calibration: Active</span>
          </div>
        </div>

        <button
          onClick={() => {
            setIsModalOpen(true);
            setWizardStep(1);
          }}
          className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition cursor-pointer shadow-lg shadow-violet-900/10 shrink-0 self-start lg:self-center"
        >
          <Plus className="h-4 w-4" />
          Generate Assessment
        </button>
      </div>

      {/* TOP METRICS & ANALYTICS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Knowledge Mastery', val: `${averageScore}%`, desc: 'Predicted exam grade', icon: Target, color: 'text-violet-400' },
          { label: 'Recall Accuracy', val: `${bestScore}%`, desc: 'Lifetime best run', icon: Award, color: 'text-emerald-400' },
          { label: 'Today\'s XP gained', val: '+450 XP', desc: 'Consistency level high', icon: Zap, color: 'text-orange-400' },
          { label: 'Total assessments', val: String(totalQuizzes), desc: 'Calibrated tests ready', icon: BookCheck, color: 'text-zinc-200' }
        ].map((metric, i) => (
          <div key={i} className="p-5 rounded-2xl border border-zinc-900 bg-zinc-900/30 flex items-center gap-4 relative overflow-hidden group hover:border-violet-500/20 transition">
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400">
              <metric.icon className="w-6 h-6" />
            </div>
            <div className="text-left">
              <span className="text-[10px] text-zinc-550 font-bold block uppercase tracking-wider">{metric.label}</span>
              <span className={`text-base font-black block mt-0.5 ${metric.color}`}>{metric.val}</span>
              <span className="text-[10px] text-zinc-500 block leading-tight">{metric.desc}</span>
            </div>
          </div>
        ))}
      </div>

      {/* TWO COLUMN CONTENT: LIBRARY & COACH */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Quiz Library & Directory */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-base text-white">Calibrated Assessments</h3>
              <div className="flex bg-zinc-950 border border-zinc-850 rounded-xl p-0.5 shrink-0 select-none">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-zinc-850 text-white' : 'text-zinc-500'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === 'table' ? 'bg-zinc-850 text-white' : 'text-zinc-500'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-650" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search assessments..."
                className="w-full bg-zinc-950 border border-zinc-850 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-violet-500 transition"
              />
            </div>
          </div>

          {loadingQuizzes ? (
            <div className="glass-card p-12 rounded-2xl border border-border text-center bg-zinc-900/10">
              <div className="h-6 w-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-zinc-500 text-xs mt-3">Calibrating RAG models...</p>
            </div>
          ) : !filteredQuizzes || filteredQuizzes.length === 0 ? (
            <div className="p-12 border border-dashed border-zinc-850 rounded-3xl text-center bg-zinc-950/20 space-y-4">
              <HelpCircle className="h-10 w-10 text-zinc-700 mx-auto" />
              <div className="space-y-1">
                <p className="text-xs text-zinc-400 font-semibold">No assessments built yet</p>
                <p className="text-[9.5px] text-zinc-500 max-w-xs mx-auto leading-normal">
                  Generate quizzes automatically from your notes to begin adaptive testing.
                </p>
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredQuizzes.map((quiz) => (
                <div key={quiz.id} className="p-5 rounded-2xl border border-zinc-850 bg-zinc-900/20 hover:border-violet-500/20 flex flex-col justify-between transition duration-300 relative group">
                  <div className="space-y-3.5 text-left">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-extrabold text-sm leading-snug line-clamp-1 text-zinc-250">{quiz.title}</h4>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black tracking-wider uppercase shrink-0 ${
                        quiz.difficulty === 'EASY' ? 'bg-emerald-500/10 text-emerald-500' :
                        quiz.difficulty === 'MEDIUM' ? 'bg-blue-500/10 text-blue-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {quiz.difficulty}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed font-medium">{quiz.description}</p>
                    
                    <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-semibold pt-1">
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

                  <div className="flex items-center gap-2.5 mt-5 pt-4 border-t border-zinc-900">
                    <button
                      onClick={() => handleStartQuiz(quiz.id)}
                      className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-md shadow-violet-950/20"
                    >
                      Start Attempt
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(quiz.id)}
                      className="p-2 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded-xl transition border border-zinc-850 cursor-pointer"
                      title="Delete Quiz"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-zinc-850 rounded-2xl overflow-hidden bg-zinc-900/10 text-left">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-900 text-zinc-500 font-bold bg-zinc-950/20">
                    <th className="p-3.5">Title</th>
                    <th className="p-3.5">Questions</th>
                    <th className="p-3.5">Difficulty</th>
                    <th className="p-3.5">Duration</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/60 text-zinc-350">
                  {filteredQuizzes.map((quiz) => (
                    <tr key={quiz.id} className="hover:bg-zinc-900/20 transition group">
                      <td className="p-3.5 font-bold text-zinc-200">{quiz.title}</td>
                      <td className="p-3.5">{quiz.questionCount} Qs</td>
                      <td className="p-3.5 font-semibold text-violet-400">{quiz.difficulty}</td>
                      <td className="p-3.5">{quiz.estimatedTime} Mins</td>
                      <td className="p-3.5 text-right flex justify-end gap-2">
                        <button
                          onClick={() => handleStartQuiz(quiz.id)}
                          className="px-3 py-1 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-lg uppercase text-[9px] tracking-wider cursor-pointer"
                        >
                          Play
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(quiz.id)}
                          className="p-1 hover:bg-red-950/40 text-zinc-550 hover:text-red-400 rounded transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: AI Coach & Attempts history */}
        <div className="space-y-6 text-left">
          
          {/* AI COACH SIDEBAR */}
          <div className="bg-zinc-900/40 border border-zinc-850 p-6 rounded-3xl space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
              <Brain className="w-4 h-4 text-violet-400 animate-pulse" />
              AI Quiz Coach
            </h3>
            
            <div className="space-y-3.5 pt-2">
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold text-zinc-550 block uppercase tracking-wider">Recommended Quiz</span>
                <span className="text-xs font-extrabold text-zinc-200 block">Memory Management (Operating Systems)</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold text-zinc-550 block uppercase tracking-wider">Difficulty Target</span>
                <span className="text-xs font-extrabold text-violet-400 block">Medium (Adaptive calibration)</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold text-zinc-550 block uppercase tracking-wider">Study Readiness</span>
                <span className="text-xs font-extrabold text-zinc-200 block">95% • Synergy Peak optimal slot</span>
              </div>
            </div>
          </div>

          {/* RECENT ATTEMPTS HISTORY */}
          <div className="space-y-4">
            <h3 className="font-bold text-base text-white">Recent Attempts</h3>
            {loadingHistory ? (
              <div className="glass-card p-6 rounded-2xl border border-zinc-900 text-center bg-zinc-900/10">
                <div className="h-4 w-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : !history || history.length === 0 ? (
              <div className="p-6 rounded-2xl border border-zinc-900 text-center text-zinc-500 bg-zinc-950/20">
                <p className="text-xs text-muted-foreground">No attempts completed yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.slice(0, 5).map((attempt) => (
                  <div key={attempt.id} className="p-4 rounded-xl border border-zinc-900 bg-zinc-900/20 flex items-center justify-between hover:border-zinc-850 transition">
                    <div className="space-y-1 min-w-0">
                      <h4 className="font-bold text-xs leading-snug truncate text-zinc-200">{attempt.quiz?.title || 'Standalone Quiz'}</h4>
                      <div className="flex items-center gap-2 text-[9px] text-zinc-500 font-medium">
                        <span className="flex items-center gap-0.5">
                          <Calendar className="h-3 w-3" />
                          {new Date(attempt.startedAt).toLocaleDateString()}
                        </span>
                        <span>•</span>
                        <span>Score: {attempt.score}/{attempt.quiz?.questionCount}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <span className={`text-xs font-black ${
                        attempt.percentage >= 80 ? 'text-emerald-500' :
                        attempt.percentage >= 50 ? 'text-violet-400' : 'text-red-500'
                      }`}>
                        {attempt.percentage}%
                      </span>
                      <button
                        onClick={() => router.push(`/quizzes/attempts/${attempt.id}/results`)}
                        className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
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
      </div>

      {/* GENERATE AI QUIZ MODAL WIZARD */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#0d0d11] border border-zinc-850 rounded-3xl overflow-hidden shadow-2xl flex flex-col text-left">
            
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-900">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-zinc-100 text-sm uppercase tracking-wide">Generate Adaptive Assessment</h3>
                  <p className="text-zinc-500 text-xs mt-0.5">AI Wizard: Step {wizardStep} of 3</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step Wizard Container */}
            <div className="p-6 space-y-6">
              
              {/* STEP 1: SOURCE SELECTION */}
              {wizardStep === 1 && (
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Source Type</label>
                    <div className="grid grid-cols-2 gap-2.5 p-1 bg-zinc-950 rounded-xl border border-zinc-900">
                      <button
                        type="button"
                        onClick={() => { setSourceType('note'); setSelectedSourceId(''); }}
                        className={`py-2 text-xs font-black rounded-lg transition-colors cursor-pointer uppercase ${
                          sourceType === 'note' ? 'bg-zinc-850 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        Active Note
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSourceType('notebook'); setSelectedSourceId(''); }}
                        className={`py-2 text-xs font-black rounded-lg transition-colors cursor-pointer uppercase ${
                          sourceType === 'notebook' ? 'bg-zinc-850 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        Notebook
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Select Material Source</label>
                    <select
                      value={selectedSourceId}
                      onChange={(e) => setSelectedSourceId(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-3 text-xs text-zinc-200 focus:outline-none focus:border-violet-500 cursor-pointer"
                    >
                      <option value="">-- Choose source --</option>
                      {sourceType === 'note' 
                        ? notes?.notes?.map((n: any) => <option key={n.id} value={n.id}>{n.title}</option>)
                        : notebooks?.map((nb: any) => <option key={nb.id} value={nb.id}>{nb.title}</option>)
                      }
                    </select>
                  </div>
                </div>
              )}

              {/* STEP 2: AI CALIBRATIONS */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Question count</label>
                      <select
                        value={questionCount}
                        onChange={(e) => setQuestionCount(Number(e.target.value))}
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-3 text-xs text-zinc-200 focus:outline-none focus:border-violet-500 cursor-pointer"
                      >
                        <option value={5}>5 Questions</option>
                        <option value={10}>10 Questions</option>
                        <option value={20}>20 Questions</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Difficulty</label>
                      <select
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value as any)}
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-3 text-xs text-zinc-200 focus:outline-none focus:border-violet-500 cursor-pointer"
                      >
                        <option value="EASY">Easy</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HARD">Hard</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Question Layout</label>
                      <select
                        value={questionType}
                        onChange={(e) => setQuestionType(e.target.value as any)}
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-3 text-xs text-zinc-200 focus:outline-none focus:border-violet-500 cursor-pointer"
                      >
                        <option value="MIXED">Mixed (Recommended)</option>
                        <option value="MCQ">Multiple Choice Only</option>
                        <option value="TF">True / False Only</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Adaptive mode</label>
                      <div className="flex bg-zinc-950 border border-zinc-850 rounded-xl p-0.5 select-none shrink-0">
                        <button
                          type="button"
                          onClick={() => setAdaptiveMode(true)}
                          className={`flex-1 py-2 text-xs font-black rounded-lg transition-colors cursor-pointer uppercase ${
                            adaptiveMode ? 'bg-zinc-850 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          On
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdaptiveMode(false)}
                          className={`flex-1 py-2 text-xs font-black rounded-lg transition-colors cursor-pointer uppercase ${
                            !adaptiveMode ? 'bg-zinc-850 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          Off
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: PREVIEW & GAINS */}
              {wizardStep === 3 && (
                <div className="space-y-4 text-xs font-semibold text-zinc-400">
                  <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-900 space-y-3 text-left">
                    <div className="flex justify-between items-center">
                      <span>Source selection</span>
                      <span className="text-zinc-200 font-extrabold">{sourceType === 'note' ? 'Active Note' : 'Notebook'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Question size</span>
                      <span className="text-zinc-200 font-extrabold">{questionCount} questions</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Calibration index</span>
                      <span className="text-violet-400 font-extrabold">{difficulty} (Adaptive: {adaptiveMode ? 'Yes' : 'No'})</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-zinc-900 pt-3 text-[10px] text-zinc-500 uppercase font-black">
                      <span>Estimated XP reward</span>
                      <span className="text-orange-400 font-black">+{questionCount * 15} XP</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Actions */}
              <div className="flex gap-3 border-t border-zinc-900 pt-4">
                {wizardStep > 1 && (
                  <button
                    onClick={() => setWizardStep(prev => prev - 1)}
                    className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs uppercase tracking-wider cursor-pointer"
                  >
                    Back
                  </button>
                )}
                {wizardStep < 3 ? (
                  <button
                    onClick={() => {
                      if (wizardStep === 1 && !selectedSourceId) {
                        showToast('Please select a material source', 'error');
                        return;
                      }
                      setWizardStep(prev => prev + 1);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    onClick={() => handleCreateQuiz()}
                    disabled={isGenerating}
                    className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50"
                  >
                    {isGenerating ? 'Generating...' : 'Build Quiz'}
                  </button>
                )}
              </div>

            </div>
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

    </div>
  );
}
