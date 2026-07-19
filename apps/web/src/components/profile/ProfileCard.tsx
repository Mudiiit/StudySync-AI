'use client';

import React from 'react';
import { Flame, BookOpen, Brain, Award, Clock, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

interface ProfileCardProps {
  displayName: string;
  username: string | null;
  streak: number;
  notesCount: number;
  flashcardsCount: number;
  quizzesCompletedCount: number;
  studyHours: number;
  avatarUrl: string | null;
  xp: number;
  level: number;
  weeklyRank?: number;
  monthlyRank?: number;
  bestRankEver?: number;
  highestSubjectRank?: number;
  winsCount?: number;
}

export function getRankTitle(level: number): string {
  if (level >= 100) return 'StudySync Legend';
  if (level >= 75) return 'Grandmaster';
  if (level >= 50) return 'Master Scholar';
  if (level >= 35) return 'Researcher';
  if (level >= 20) return 'Scholar';
  if (level >= 10) return 'Knowledge Seeker';
  if (level >= 5) return 'Study Explorer';
  return 'Fresh Learner';
}

export default function ProfileCard({
  displayName,
  username,
  streak,
  notesCount,
  flashcardsCount,
  quizzesCompletedCount,
  studyHours,
  avatarUrl,
  xp,
  level,
  weeklyRank,
  monthlyRank,
  bestRankEver,
  highestSubjectRank,
  winsCount,
}: ProfileCardProps) {
  // Level threshold calculation: 25 * L * (L + 3)
  const currentThreshold = level === 1 ? 0 : 25 * (level - 1) * (level + 2);
  const nextThreshold = 25 * level * (level + 3);
  const totalInLevel = nextThreshold - currentThreshold;
  const earnedInLevel = Math.max(0, xp - currentThreshold);
  const pct = Math.max(0, Math.min(100, Math.round((earnedInLevel / totalInLevel) * 100)));
  const title = getRankTitle(level);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-zinc-800/80 bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 p-6 shadow-2xl backdrop-blur-md"
    >
      {/* Decorative neon background blur */}
      <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 h-36 w-36 rounded-full bg-emerald-600/5 blur-3xl pointer-events-none" />
  
      {/* Profile Header */}
      <div className="flex flex-col items-center text-center space-y-3 pb-4 border-b border-border/10">
        <div className="relative group">
          <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-violet-600 to-pink-500 opacity-30 blur group-hover:opacity-60 transition duration-300" />
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="relative w-20 h-20 rounded-full object-cover border-2 border-zinc-900 bg-zinc-850 shadow-md"
            />
          ) : (
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-violet-650 to-indigo-750 flex items-center justify-center text-2xl font-bold text-white uppercase border-2 border-zinc-900 shadow-md">
              {displayName.charAt(0)}
            </div>
          )}
        </div>
  
        <div>
          <h3 className="font-bold text-lg text-zinc-100 tracking-tight flex items-center justify-center gap-1.5 animate-fade-in">
            {displayName}
          </h3>
          <span className="text-xs font-semibold text-zinc-500 block">
            {username ? `@${username}` : 'No username set'}
          </span>
          <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-violet-650/15 border border-violet-500/25 text-violet-400">
            {title}
          </span>
        </div>
      </div>
  
      {/* Level & XP Progression Bar */}
      <div className="my-4 space-y-1.5">
        <div className="flex justify-between items-end text-xs">
          <span className="font-extrabold text-zinc-300">Level {level}</span>
          <span className="font-bold text-zinc-500 text-[10px]">
            {xp.toLocaleString()} / {nextThreshold.toLocaleString()} XP
          </span>
        </div>
        <div className="relative w-full h-2.5 bg-zinc-950 border border-zinc-850/60 rounded-full overflow-hidden">
          <div 
            className="bg-gradient-to-r from-violet-650 to-indigo-600 h-full rounded-full transition-all duration-500 ease-out" 
            style={{ width: `${pct}%` }} 
          />
        </div>
      </div>
  
      {/* Streak Banner */}
      <div className="my-4 py-2 px-4 rounded-xl bg-zinc-950/60 border border-zinc-850/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500 fill-orange-500 animate-pulse" />
          <span className="text-xs font-bold text-zinc-350">Daily Learning Streak</span>
        </div>
        <span className="text-sm font-extrabold text-orange-500">{streak} Days</span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        {/* Study Hours */}
        <div className="bg-zinc-950/40 border border-zinc-850/40 p-3 rounded-2xl flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Hours</span>
            <span className="text-sm font-extrabold text-zinc-200">{studyHours} h</span>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-zinc-950/40 border border-zinc-850/40 p-3 rounded-2xl flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Notes</span>
            <span className="text-sm font-extrabold text-zinc-200">{notesCount}</span>
          </div>
        </div>

        {/* Flashcards */}
        <div className="bg-zinc-950/40 border border-zinc-850/40 p-3 rounded-2xl flex items-center gap-3">
          <div className="p-2 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Cards</span>
            <span className="text-sm font-extrabold text-zinc-200">{flashcardsCount}</span>
          </div>
        </div>

        {/* Quizzes completed */}
        <div className="bg-zinc-950/40 border border-zinc-850/40 p-3 rounded-2xl flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Quizzes</span>
            <span className="text-sm font-extrabold text-zinc-200">{quizzesCompletedCount}</span>
          </div>
        </div>
      </div>

      {/* Placements block */}
      {(weeklyRank !== undefined || monthlyRank !== undefined || bestRankEver !== undefined || winsCount !== undefined) && (
        <div className="mt-4 pt-3.5 border-t border-zinc-850/45 grid grid-cols-2 gap-2.5">
          <div className="bg-zinc-950/20 border border-zinc-850/30 p-2 rounded-xl text-center">
            <span className="text-[9px] font-bold text-zinc-500 block uppercase tracking-wider">Weekly Rank</span>
            <span className="text-xs font-extrabold text-zinc-300 mt-0.5 block">
              {weeklyRank && weeklyRank > 0 ? `#${weeklyRank}` : 'Unranked'}
            </span>
          </div>
          <div className="bg-zinc-950/20 border border-zinc-850/30 p-2 rounded-xl text-center">
            <span className="text-[9px] font-bold text-zinc-500 block uppercase tracking-wider">Monthly Rank</span>
            <span className="text-xs font-extrabold text-zinc-300 mt-0.5 block">
              {monthlyRank && monthlyRank > 0 ? `#${monthlyRank}` : 'Unranked'}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
