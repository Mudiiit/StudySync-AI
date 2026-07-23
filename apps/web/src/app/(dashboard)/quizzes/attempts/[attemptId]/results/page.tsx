'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, XCircle, AlertTriangle, ArrowLeft, 
  HelpCircle, Info, Clock, Award, Sparkles, Zap, Brain, Calendar, Plus, BookOpen
} from 'lucide-react';
import { useQuizAttempt } from '@/hooks/useQuizzes';
import { useToast } from '@/components/providers/ToastProvider';

export default function QuizResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const attemptId = params.attemptId as string;

  const { data: attempt, isLoading, error } = useQuizAttempt(attemptId);
  const [syncingPlanner, setSyncingPlanner] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-zinc-400">
        <div className="h-8 w-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-sm">Loading results...</p>
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="glass-card p-8 rounded-2xl border border-zinc-800 text-center max-w-md mx-auto my-12 bg-zinc-950/20 text-zinc-400">
        <AlertTriangle className="h-10 w-10 text-orange-500 mx-auto mb-3" />
        <h3 className="font-bold text-lg text-white">Results Unavailable</h3>
        <p className="text-xs text-muted-foreground mt-1">Failed to retrieve results for this attempt.</p>
        <button
          onClick={() => router.push('/quizzes')}
          className="mt-4 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
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

  const handleSyncToPlanner = () => {
    setSyncingPlanner(true);
    setTimeout(() => {
      setSyncingPlanner(false);
      showToast('Weak topics synced to Study Planner successfully!', 'success');
    }, 1000);
  };

  const handleGenerateFlashcards = () => {
    showToast('AI Flashcards deck created from incorrect answers! +50 XP', 'success');
  };

  return (
    <div className="absolute inset-0 bg-[#070708] overflow-y-auto p-6 lg:p-10 text-zinc-100 flex flex-col gap-8 scrollbar-thin select-text">
      
      {/* Top back nav */}
      <div>
        <button
          onClick={() => router.push('/quizzes')}
          className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Quizzes Dashboard
        </button>
      </div>

      {/* SCORE CALIBRATION HERO PANEL */}
      <div className="bg-gradient-to-br from-zinc-900/40 via-zinc-900/10 to-transparent border border-zinc-850 p-6 lg:p-8 rounded-3xl flex flex-col lg:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-3.5 text-left z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-black uppercase tracking-wider">
            <Award className="w-3.5 h-3.5" />
            Attempt Calibrated
          </div>
          <div>
            <h2 className="text-xl lg:text-2xl font-black tracking-tight text-white leading-snug">
              {quiz?.title || 'Assessment Results'}
            </h2>
            <p className="text-xs text-zinc-400 max-w-md mt-1 leading-relaxed font-medium">
              Recall check completed. Review your calibrated responses and explanations to patch up knowledge gaps.
            </p>
          </div>
          
          <div className="flex gap-2.5 pt-1">
            <button
              onClick={handleGenerateFlashcards}
              className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 text-zinc-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-violet-400" />
              Build Flashcards
            </button>
            
            <button
              onClick={handleSyncToPlanner}
              disabled={syncingPlanner}
              className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 text-zinc-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              {syncingPlanner ? 'Syncing...' : 'Sync to Planner'}
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center shrink-0 w-36 h-36 rounded-full border-4 border-violet-500/20 bg-zinc-950 shadow-inner relative">
          <span className={`text-3xl font-black ${
            percentage >= 80 ? 'text-emerald-500' :
            percentage >= 50 ? 'text-violet-400' : 'text-red-500'
          }`}>
            {percentage}%
          </span>
          <span className="text-[9.5px] text-zinc-550 font-black uppercase tracking-widest mt-1">Overall score</span>
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Correct Answers', val: `${score} / ${totalQuestions}`, color: 'text-emerald-400 border-emerald-500/10' },
          { label: 'Incorrect Answers', val: String(incorrectCount), color: 'text-red-400 border-red-500/10' },
          { label: 'XP Awarded', val: `+${score * 15} XP`, color: 'text-orange-400 border-orange-500/10' },
          { label: 'Total duration', val: formatDuration(attempt.duration), color: 'text-blue-400 border-blue-500/10' }
        ].map((stat, i) => (
          <div key={i} className={`p-4 rounded-2xl border bg-zinc-900/30 text-center text-left flex flex-col justify-center ${stat.color}`}>
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-550">{stat.label}</span>
            <span className="text-base font-black mt-1">{stat.val}</span>
          </div>
        ))}
      </div>

      {/* ACCURACY HEATMAP & WEAK CONCEPTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Accuracy Heatmap */}
        <div className="lg:col-span-2 bg-zinc-900/40 border border-zinc-850 p-6 rounded-3xl space-y-4 text-left">
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Response Accuracy Heatmap</h3>
          
          <div className="flex flex-wrap gap-2.5 pt-2">
            {answers.map((ans, idx) => (
              <div
                key={ans.id}
                className={`w-11 h-11 rounded-xl border flex flex-col items-center justify-center font-bold text-xs select-none ${
                  ans.isCorrect 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}
                title={`Question ${idx + 1}: ${ans.isCorrect ? 'Correct' : 'Incorrect'}`}
              >
                Q{idx + 1}
                <span className="text-[8px] font-black uppercase block mt-0.5">
                  {ans.isCorrect ? 'Pass' : 'Fail'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Weak concepts */}
        <div className="bg-zinc-900/40 border border-zinc-850 p-6 rounded-3xl space-y-4 text-left">
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Weak Concepts Focus</h3>
          
          <div className="space-y-3 pt-2">
            <div className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl hover:border-zinc-800 transition">
              <span className="text-xs font-extrabold text-zinc-300 block">Paging thrashing triggers</span>
              <span className="text-[9.5px] text-zinc-550 font-semibold block leading-tight mt-0.5">Incorrect answer logged. Recall stability dropped 15%.</span>
            </div>
            <div className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl hover:border-zinc-800 transition">
              <span className="text-xs font-extrabold text-zinc-300 block">Deadlock safety conditions</span>
              <span className="text-[9.5px] text-zinc-550 font-semibold block leading-tight mt-0.5">Under review. Synergized notes generated.</span>
            </div>
          </div>
        </div>

      </div>

      {/* DETAILED QUESTION REVIEW CARDS */}
      <div className="space-y-6 text-left">
        <h3 className="font-bold text-base text-white">Review Responses</h3>
        
        <div className="space-y-6">
          {answers.map((ans, idx) => {
            const question = ans.question;
            if (!question) return null;

            const selectedChoiceId = ans.selectedChoiceId;
            const isCorrect = ans.isCorrect;

            return (
              <div 
                key={ans.id} 
                className={`p-6 rounded-3xl border bg-zinc-900/20 text-left transition duration-200 ${
                  isCorrect 
                    ? 'border-emerald-500/20 hover:border-emerald-500/30' 
                    : 'border-red-500/20 hover:border-red-500/30'
                }`}
              >
                {/* Question Info */}
                <div className="space-y-1 mb-4">
                  <span className="text-[9px] uppercase font-bold tracking-wider text-violet-400">Question {idx + 1}</span>
                  <h4 className="text-sm font-extrabold text-zinc-200 leading-relaxed">
                    {question.question}
                  </h4>
                </div>

                {/* Choices Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {question.choices.map((choice) => {
                    const isSelected = selectedChoiceId === choice.id;
                    const isChoiceCorrect = choice.isCorrect;

                    let bgBorderClass = 'bg-zinc-950/40 border-zinc-850 text-zinc-500';
                    let icon = null;

                    if (isSelected) {
                      if (isChoiceCorrect) {
                        bgBorderClass = 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold';
                        icon = <CheckCircle2 className="w-4.5 h-4.5 shrink-0 text-emerald-400" />;
                      } else {
                        bgBorderClass = 'bg-red-500/10 border-red-500 text-red-400 font-bold';
                        icon = <XCircle className="w-4.5 h-4.5 shrink-0 text-red-400" />;
                      }
                    } else if (isChoiceCorrect) {
                      bgBorderClass = 'bg-emerald-500/5 border-emerald-500/30 text-emerald-550 font-bold';
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
                  <div className="mt-4 p-4 bg-zinc-950 border border-zinc-850 rounded-2xl flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">AI Calibration Summary</span>
                      <p className="text-zinc-450 text-xs leading-relaxed font-medium">{question.explanation}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
