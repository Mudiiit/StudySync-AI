'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, XCircle, AlertTriangle, ArrowLeft, 
  HelpCircle, Info, Clock, Award 
} from 'lucide-react';
import { useQuizAttempt } from '@/hooks/useQuizzes';

export default function QuizResultsPage() {
  const params = useParams();
  const router = useRouter();
  const attemptId = params.attemptId as string;

  const { data: attempt, isLoading, error } = useQuizAttempt(attemptId);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-zinc-400">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-sm">Loading results...</p>
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="glass-card p-8 rounded-2xl border border-border text-center max-w-md mx-auto my-12 bg-card/5 text-zinc-400">
        <AlertTriangle className="h-10 w-10 text-orange-500 mx-auto mb-3" />
        <h3 className="font-bold text-lg text-white">Results Unavailable</h3>
        <p className="text-xs text-muted-foreground mt-1">Failed to retrieve results for this attempt.</p>
        <button
          onClick={() => router.push('/quizzes')}
          className="mt-4 px-4 py-2 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-semibold cursor-pointer"
        >
          Go to Quizzes
        </button>
      </div>
    );
  }

  const quiz = attempt.quiz;
  const answers = attempt.answers || [];
  const totalQuestions = quiz?.questionCount || answers.length;
  const score = attempt.score;
  const incorrectCount = Math.max(0, totalQuestions - score);
  const percentage = attempt.percentage;

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-3xl mx-auto space-y-8 text-left"
    >
      {/* Back to Dashboard */}
      <div>
        <button
          onClick={() => router.push('/quizzes')}
          className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Quizzes
        </button>
      </div>

      {/* Hero Score Card */}
      <div className="glass-card p-6 md:p-8 rounded-3xl border border-zinc-800 bg-zinc-900/40 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-3 min-w-0 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-bold tracking-wider uppercase">
            <Award className="w-3.5 h-3.5" />
            Quiz Completed
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white line-clamp-2">
            {quiz?.title || 'Quiz Results'}
          </h2>
          <p className="text-zinc-400 text-xs max-w-md">
            Review your responses and learning explanations to patch up knowledge gaps.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center shrink-0 w-36 h-36 rounded-full border-4 border-violet-500/20 bg-zinc-950 shadow-inner relative">
          <span className={`text-3xl font-extrabold font-sans ${
            percentage >= 80 ? 'text-emerald-500' :
            percentage >= 50 ? 'text-violet-400' : 'text-red-500'
          }`}>
            {percentage}%
          </span>
          <span className="text-[10px] text-zinc-500 font-bold uppercase mt-1">Final Score</span>
        </div>
      </div>

      {/* Attempt Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Score Obtained', value: `${score} / ${totalQuestions}`, color: 'text-zinc-200 bg-zinc-900/40' },
          { label: 'Correct Answers', value: String(score), color: 'text-emerald-500 bg-emerald-500/5 border border-emerald-500/10' },
          { label: 'Incorrect Answers', value: String(incorrectCount), color: 'text-red-500 bg-red-500/5 border border-red-500/10' },
          { label: 'Time Spent', value: formatDuration(attempt.duration), color: 'text-blue-400 bg-blue-500/5 border border-blue-500/10' },
        ].map((stat, i) => (
          <div key={i} className={`p-4 rounded-2xl flex flex-col justify-center text-center ${stat.color}`}>
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">{stat.label}</span>
            <span className="text-base md:text-lg font-bold font-sans mt-1">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Detailed Review Section */}
      <div className="space-y-6">
        <h3 className="font-bold text-lg text-white font-sans">Review Answers</h3>
        
        <div className="space-y-6">
          {answers.map((ans, idx) => {
            const question = ans.question;
            if (!question) return null;

            const selectedChoiceId = ans.selectedChoiceId;
            const isCorrect = ans.isCorrect;

            return (
              <div 
                key={ans.id} 
                className={`glass-card p-5 md:p-6 rounded-2xl border bg-zinc-900/20 text-left ${
                  isCorrect 
                    ? 'border-emerald-500/20 hover:border-emerald-500/30' 
                    : 'border-red-500/20 hover:border-red-500/30'
                }`}
              >
                {/* Question Info */}
                <div className="space-y-1.5 mb-4">
                  <span className="text-[9px] uppercase font-bold tracking-wider text-primary">Question {idx + 1}</span>
                  <h4 className="text-sm font-semibold text-zinc-200 leading-relaxed">
                    {question.question}
                  </h4>
                </div>

                {/* Choices */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {question.choices.map((choice) => {
                    const isSelected = selectedChoiceId === choice.id;
                    const isChoiceCorrect = choice.isCorrect;

                    let bgBorderClass = 'bg-zinc-950/40 border-zinc-800 text-zinc-400';
                    let icon = null;

                    if (isSelected) {
                      if (isChoiceCorrect) {
                        bgBorderClass = 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-medium';
                        icon = <CheckCircle2 className="w-4.5 h-4.5 shrink-0 text-emerald-400" />;
                      } else {
                        bgBorderClass = 'bg-red-500/10 border-red-500 text-red-400 font-medium';
                        icon = <XCircle className="w-4.5 h-4.5 shrink-0 text-red-400" />;
                      }
                    } else if (isChoiceCorrect) {
                      bgBorderClass = 'bg-emerald-500/5 border-emerald-500/30 text-emerald-500 font-medium';
                      icon = <CheckCircle2 className="w-4.5 h-4.5 shrink-0 text-emerald-500 opacity-60" />;
                    }

                    return (
                      <div 
                        key={choice.id}
                        className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${bgBorderClass}`}
                      >
                        <span className="leading-snug">{choice.text}</span>
                        {icon}
                      </div>
                    );
                  })}
                </div>

                {/* AI Explanation Box */}
                {question.explanation && (
                  <div className="mt-4 p-3.5 bg-zinc-950 rounded-xl border border-zinc-850 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">AI Explanation</span>
                      <p className="text-zinc-300 text-xs leading-relaxed">{question.explanation}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
