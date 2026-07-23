'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HelpCircle, ChevronLeft, ChevronRight, CheckSquare, 
  AlertTriangle, Clock, ArrowLeft, Bookmark, Flag, Calculator, PenTool, Sparkles 
} from 'lucide-react';
import { useToast } from '@/components/providers/ToastProvider';
import { useQuiz, useSubmitQuizAttempt } from '@/hooks/useQuizzes';
import ConfirmModal from '@/components/ui/ConfirmModal';

export default function QuizPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const quizId = params.id as string;
  const attemptId = searchParams.get('attemptId');

  // Fetch quiz detail
  const { data: quiz, isLoading, error } = useQuiz(quizId);
  const submitAttemptMutation = useSubmitQuizAttempt();

  // Player States
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({}); // questionId -> selectedChoiceId
  const [timeLeft, setTimeLeft] = useState(0);
  
  // Custom Workspace features
  const [bookmarked, setBookmarked] = useState<Record<string, boolean>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [confidence, setConfidence] = useState<Record<string, 'high' | 'medium' | 'low'>>({});
  const [showHint, setShowHint] = useState(false);
  
  const [scratchpadText, setScratchpadText] = useState('');
  const [showScratchpad, setShowScratchpad] = useState(false);
  
  const [calcInput, setCalcInput] = useState('');
  const [calcResult, setCalcResult] = useState<string | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);

  // Initialize timer
  useEffect(() => {
    if (quiz) {
      setTimeLeft(quiz.estimatedTime * 60);
    }
  }, [quiz]);

  // Decrement timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'n') {
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'p') {
        handlePrev();
      } else if (e.key === 'b') {
        toggleBookmark();
      } else if (e.key === 'f') {
        toggleFlag();
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        const choiceIdx = parseInt(e.key) - 1;
        const currentQuestion = quiz?.questions?.[currentIdx];
        if (currentQuestion && currentQuestion.choices[choiceIdx]) {
          handleSelectChoice(currentQuestion.choices[choiceIdx].id);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIdx, quiz]);

  // Redirect if attemptId is missing
  useEffect(() => {
    if (!attemptId) {
      showToast('No active quiz attempt found. Redirecting...', 'error');
      router.push('/quizzes');
    }
  }, [attemptId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-zinc-400">
        <div className="h-8 w-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-sm">Loading quiz player...</p>
      </div>
    );
  }

  if (error || !quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <div className="glass-card p-8 rounded-2xl border border-zinc-800 text-center max-w-md mx-auto my-12 bg-zinc-950/20 text-zinc-400">
        <AlertTriangle className="h-10 w-10 text-orange-500 mx-auto mb-3 animate-bounce" />
        <h3 className="font-bold text-lg text-white">Quiz Unavailable</h3>
        <p className="text-xs text-muted-foreground mt-1 font-medium">This quiz has no questions or failed to load.</p>
        <button
          onClick={() => router.push('/quizzes')}
          className="mt-4 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
        >
          Go Back
        </button>
      </div>
    );
  }

  const questions = quiz.questions;
  const currentQuestion = questions[currentIdx];

  const handleSelectChoice = (choiceId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: choiceId,
    }));
  };

  const handleNext = () => {
    setShowHint(false);
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setShowHint(false);
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
    }
  };

  const toggleBookmark = () => {
    const qId = currentQuestion.id;
    setBookmarked(prev => ({ ...prev, [qId]: !prev[qId] }));
    showToast(bookmarked[qId] ? 'Removed bookmark' : 'Bookmarked question', 'success');
  };

  const toggleFlag = () => {
    const qId = currentQuestion.id;
    setFlagged(prev => ({ ...prev, [qId]: !prev[qId] }));
    showToast(flagged[qId] ? 'Removed flag' : 'Flagged for review', 'info');
  };

  const setQuestionConfidence = (level: 'high' | 'medium' | 'low') => {
    setConfidence(prev => ({ ...prev, [currentQuestion.id]: level }));
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const runCalculation = () => {
    try {
      // Safe evaluation of simple math expressions
      const cleanExpr = calcInput.replace(/[^0-9+\-*/().\s]/g, '');
      const res = new Function(`return (${cleanExpr})`)();
      setCalcResult(String(res));
    } catch {
      setCalcResult('Error');
    }
  };

  const executeSubmitQuiz = async () => {
    try {
      const payloadAnswers = questions.map((q) => ({
        questionId: q.id,
        selectedChoiceId: answers[q.id] || null,
      }));

      await submitAttemptMutation.mutateAsync({
        attemptId: attemptId!,
        data: { answers: payloadAnswers },
      });

      showToast('Quiz submitted successfully!', 'success');
      router.push(`/quizzes/attempts/${attemptId}/results`);
    } catch (err: any) {
      console.error(err);
      showToast('Failed to submit quiz answers', 'error');
    }
  };

  const handleSubmitQuiz = async () => {
    const answeredCount = Object.keys(answers).length;
    const unansweredCount = questions.length - answeredCount;

    if (unansweredCount > 0) {
      setShowSubmitConfirm(true);
    } else {
      await executeSubmitQuiz();
    }
  };

  const isSubmitting = submitAttemptMutation.isPending;

  return (
    <div className="absolute inset-0 bg-[#070708] overflow-y-auto p-6 lg:p-10 text-zinc-100 flex flex-col gap-6 scrollbar-thin select-text">
      
      {/* Top player header */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
        <button
          onClick={() => setShowExitConfirm(true)}
          className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Exit Player
        </button>

        <div className="flex items-center gap-3">
          {/* Quick calculators & pen tools */}
          <button
            onClick={() => setShowScratchpad(prev => !prev)}
            className={`p-2 rounded-xl border transition cursor-pointer ${showScratchpad ? 'bg-violet-600/10 border-violet-500 text-violet-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300'}`}
            title="Scratchpad"
          >
            <PenTool className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setShowCalculator(prev => !prev)}
            className={`p-2 rounded-xl border transition cursor-pointer ${showCalculator ? 'bg-violet-600/10 border-violet-500 text-violet-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300'}`}
            title="Calculator"
          >
            <Calculator className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-3.5 py-1.5 rounded-full text-zinc-300 text-xs font-bold font-mono">
            <Clock className="w-3.5 h-3.5 text-violet-400" />
            {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      {/* QUESTION NAVIGATOR NODES */}
      <div className="flex flex-wrap gap-2 justify-center py-2 bg-zinc-950/20 border border-zinc-900 rounded-2xl p-4 select-none">
        {questions.map((q, idx) => {
          const isCurrent = idx === currentIdx;
          const isAnswered = !!answers[q.id];
          const isBookmarked = !!bookmarked[q.id];
          const isFlagged = !!flagged[q.id];

          let nodeClass = 'bg-zinc-900 border-zinc-800 text-zinc-550';
          if (isCurrent) {
            nodeClass = 'bg-violet-600 border-violet-500 text-white shadow-md shadow-violet-900/10';
          } else if (isAnswered) {
            nodeClass = 'bg-zinc-800 border-zinc-700 text-violet-400';
          }

          return (
            <button
              key={q.id}
              onClick={() => setCurrentIdx(idx)}
              className={`w-9 h-9 rounded-xl border text-xs font-extrabold flex items-center justify-center transition cursor-pointer relative ${nodeClass}`}
            >
              {idx + 1}
              {(isBookmarked || isFlagged) && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-400 rounded-full border border-zinc-950" />
              )}
            </button>
          );
        })}
      </div>

      {/* THREE COLUMN GRID: WORKSPACE - QUESTION - SIDEBAR TOOLS */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left: Scratchpad & Calculator Workspace */}
        <div className={`space-y-6 ${(!showScratchpad && !showCalculator) ? 'hidden' : 'lg:col-span-1'}`}>
          {showScratchpad && (
            <div className="bg-zinc-900/40 border border-zinc-850 p-5 rounded-3xl space-y-3.5 text-left">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">Workspace Scratchpad</span>
              <textarea
                value={scratchpadText}
                onChange={(e) => setScratchpadText(e.target.value)}
                placeholder="Jot down notes or calculations here..."
                rows={6}
                className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-violet-500 resize-none font-mono"
              />
            </div>
          )}

          {showCalculator && (
            <div className="bg-zinc-900/40 border border-zinc-850 p-5 rounded-3xl space-y-3 text-left">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">Interactive Calculator</span>
              <div className="space-y-2">
                <input
                  type="text"
                  value={calcInput}
                  onChange={(e) => setCalcInput(e.target.value)}
                  placeholder="e.g. 15 * 8"
                  className="w-full bg-zinc-950 border border-zinc-855 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-violet-500 font-mono"
                  onKeyDown={(e) => e.key === 'Enter' && runCalculation()}
                />
                <div className="flex gap-2">
                  <button
                    onClick={runCalculation}
                    className="flex-1 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer"
                  >
                    Solve
                  </button>
                  <button
                    onClick={() => { setCalcInput(''); setCalcResult(null); }}
                    className="px-3 py-1.5 bg-zinc-950 border border-zinc-850 text-zinc-550 rounded-lg text-[10px] font-black uppercase transition cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
                {calcResult && (
                  <div className="p-2.5 bg-zinc-950 border border-zinc-900 rounded-xl text-center text-xs font-mono text-emerald-400 font-black">
                    Result: {calcResult}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Center: Question container */}
        <div className={`space-y-6 ${(!showScratchpad && !showCalculator) ? 'lg:col-span-3' : 'lg:col-span-2'}`}>
          <div className="bg-zinc-900/40 border border-zinc-850 p-6 md:p-8 rounded-3xl space-y-6 text-left relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div className="space-y-0.5">
                <span className="text-[9px] uppercase font-bold tracking-wider text-violet-400">Question {currentIdx + 1} of {questions.length}</span>
                <h3 className="text-base md:text-lg font-black leading-relaxed text-zinc-200">
                  {currentQuestion.question}
                </h3>
              </div>

              {/* Action badges */}
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={toggleBookmark}
                  className={`p-2 rounded-xl transition cursor-pointer ${bookmarked[currentQuestion.id] ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-zinc-950 text-zinc-650'}`}
                >
                  <Bookmark className="w-4 h-4" />
                </button>
                <button
                  onClick={toggleFlag}
                  className={`p-2 rounded-xl transition cursor-pointer ${flagged[currentQuestion.id] ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-zinc-950 text-zinc-650'}`}
                >
                  <Flag className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Answer Choices */}
            <div className="space-y-3 pt-2">
              {currentQuestion.choices.map((choice, cIdx) => {
                const isSelected = answers[currentQuestion.id] === choice.id;
                return (
                  <button
                    key={choice.id}
                    onClick={() => handleSelectChoice(choice.id)}
                    className={`w-full text-left p-4 rounded-xl border text-xs font-semibold transition cursor-pointer flex items-center gap-3.5 ${
                      isSelected 
                        ? 'bg-violet-650/10 border-violet-500 text-violet-400 shadow-md shadow-violet-950/20' 
                        : 'bg-zinc-950/40 border-zinc-850 hover:border-zinc-800 text-zinc-350'
                    }`}
                  >
                    <div className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected ? 'border-violet-500 bg-violet-650 text-white' : 'border-zinc-700 bg-zinc-900/40'
                    }`}>
                      <span className="text-[9.5px] font-black">{cIdx + 1}</span>
                    </div>
                    <span className="leading-relaxed">{choice.text}</span>
                  </button>
                );
              })}
            </div>

            {/* AI Hint Workspace */}
            {currentQuestion.explanation && (
              <div className="border-t border-zinc-900 pt-5">
                {showHint ? (
                  <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-2xl space-y-2">
                    <span className="text-[10px] font-black text-violet-400 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                      AI Dynamic Hint
                    </span>
                    <p className="text-zinc-400 text-xs leading-relaxed font-medium">
                      Look closely at the core process structures mentioned in the prompt text.
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowHint(true)}
                    className="text-[10.5px] font-black text-violet-400 hover:text-violet-300 underline cursor-pointer"
                  >
                    💡 Request AI Hint
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Confidence Selector & Details */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-zinc-900/40 border border-zinc-850 p-6 rounded-3xl space-y-5 text-left select-none">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">Assessment Calibrator</span>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-zinc-550 block uppercase tracking-wider">How confident are you?</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'high', label: 'High', color: 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10' },
                    { key: 'medium', label: 'Med', color: 'border-violet-500/20 text-violet-400 hover:bg-violet-500/10' },
                    { key: 'low', label: 'Low', color: 'border-red-500/20 text-red-400 hover:bg-red-500/10' }
                  ].map(lvl => (
                    <button
                      key={lvl.key}
                      onClick={() => setQuestionConfidence(lvl.key as any)}
                      className={`py-2 text-[10px] font-black uppercase rounded-lg border transition cursor-pointer ${
                        confidence[currentQuestion.id] === lvl.key 
                          ? 'bg-zinc-850 border-zinc-700' 
                          : lvl.color
                      }`}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1 pt-3 border-t border-zinc-900 text-[10px] text-zinc-500 leading-normal font-semibold">
                <p>💡 Keyboard Shortcuts:</p>
                <p>• <kbd className="bg-zinc-950 px-1 rounded">1-4</kbd> : Select choice option</p>
                <p>• <kbd className="bg-zinc-950 px-1 rounded">←</kbd> / <kbd className="bg-zinc-950 px-1 rounded">→</kbd> : Prev / Next</p>
                <p>• <kbd className="bg-zinc-950 px-1 rounded">b</kbd> : Toggle bookmark</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Navigation Footer */}
      <div className="flex justify-between items-center pt-4 border-t border-zinc-900 select-none">
        <button
          onClick={handlePrev}
          disabled={currentIdx === 0}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-850 hover:bg-zinc-900 disabled:opacity-40 disabled:hover:bg-transparent text-zinc-300 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>

        {currentIdx < questions.length - 1 ? (
          <button
            onClick={handleNext}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-zinc-200 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmitQuiz}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider transition shadow-md shadow-violet-950/30 cursor-pointer"
          >
            <CheckSquare className="w-4 h-4" />
            {isSubmitting ? 'Submitting...' : 'Submit Attempt'}
          </button>
        )}
      </div>

      <ConfirmModal
        isOpen={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        onConfirm={() => router.push('/quizzes')}
        title="Exit Quiz Attempt"
        message="Are you sure you want to exit? Your progress in this attempt will not be saved."
        confirmLabel="Exit Attempt"
        cancelLabel="Keep Playing"
        type="danger"
      />

      <ConfirmModal
        isOpen={showSubmitConfirm}
        onClose={() => setShowSubmitConfirm(false)}
        onConfirm={executeSubmitQuiz}
        title="Submit Quiz Answers"
        message={`You have ${questions.length - Object.keys(answers).length} unanswered questions. Are you sure you want to submit?`}
        confirmLabel="Submit Quiz"
        cancelLabel="Review Answers"
        type="warning"
      />
    </div>
  );
}
