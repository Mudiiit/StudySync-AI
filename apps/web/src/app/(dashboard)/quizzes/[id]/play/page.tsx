'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HelpCircle, ChevronLeft, ChevronRight, CheckSquare, 
  AlertTriangle, Clock, ArrowLeft 
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
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-sm">Loading quiz player...</p>
      </div>
    );
  }

  if (error || !quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <div className="glass-card p-8 rounded-2xl border border-border text-center max-w-md mx-auto my-12 bg-card/5 text-zinc-400">
        <AlertTriangle className="h-10 w-10 text-orange-500 mx-auto mb-3" />
        <h3 className="font-bold text-lg text-white">Quiz Unavailable</h3>
        <p className="text-xs text-muted-foreground mt-1">This quiz has no questions or failed to load.</p>
        <button
          onClick={() => router.push('/quizzes')}
          className="mt-4 px-4 py-2 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-semibold cursor-pointer"
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
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
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
    <div className="max-w-2xl mx-auto space-y-6 text-left">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowExitConfirm(true)}
          className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Exit Player
        </button>

        <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-3.5 py-1.5 rounded-full text-zinc-300 text-xs font-bold font-mono">
          <Clock className="w-3.5 h-3.5 text-violet-400" />
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground font-semibold">
          <span>Question {currentIdx + 1} of {questions.length}</span>
          <span>{Math.round(((currentIdx + 1) / questions.length) * 100)}% Complete</span>
        </div>
        <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-900">
          <div 
            className="bg-primary h-full rounded-full transition-all duration-300"
            style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -15 }}
          transition={{ duration: 0.2 }}
          className="glass-card p-6 md:p-8 rounded-3xl border border-zinc-800 bg-zinc-900/40 relative overflow-hidden"
        >
          <div className="space-y-6">
            {/* Question Text */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-primary">Question text</span>
              <h3 className="text-lg md:text-xl font-medium leading-relaxed text-zinc-100">
                {currentQuestion.question}
              </h3>
            </div>

            {/* Options list */}
            <div className="space-y-3.5">
              {currentQuestion.choices.map((choice) => {
                const isSelected = answers[currentQuestion.id] === choice.id;
                return (
                  <button
                    key={choice.id}
                    onClick={() => handleSelectChoice(choice.id)}
                    className={`w-full text-left p-4 rounded-xl border text-sm font-semibold transition cursor-pointer flex items-center gap-3.5 ${
                      isSelected 
                        ? 'bg-primary/10 border-primary text-primary shadow-sm shadow-primary/5' 
                        : 'bg-zinc-950/40 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                    }`}
                  >
                    <div className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-zinc-700'
                    }`}>
                      {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                    </div>
                    {choice.text}
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Footer */}
      <div className="flex justify-between items-center pt-2">
        <button
          onClick={handlePrev}
          disabled={currentIdx === 0}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-850 hover:bg-zinc-900 disabled:opacity-40 disabled:hover:bg-transparent text-zinc-300 text-xs font-semibold transition cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>

        {currentIdx < questions.length - 1 ? (
          <button
            onClick={handleNext}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold transition cursor-pointer"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmitQuiz}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-semibold transition shadow-md shadow-violet-950/30 cursor-pointer"
          >
            <CheckSquare className="w-4 h-4" />
            {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
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
