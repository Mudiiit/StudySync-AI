'use client';

import React, { useState, useEffect } from 'react';
import { 
  Trophy, Search, Filter, Loader2, Sparkles, AlertCircle, CheckCircle, 
  HelpCircle, Eye, EyeOff, Award, ChevronDown, Flame, BookOpen, Brain, Clock, Upload, Target
} from 'lucide-react';
import achievementsService, { UserAchievement } from '@/services/achievements';
import { useToast } from '@/components/providers/ToastProvider';
import { motion } from 'framer-motion';

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // Search & Filter States
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'UNLOCKED' | 'LOCKED' | 'SECRET'>('ALL');
  const [sortBy, setSortBy] = useState<'RECENT' | 'RARITY' | 'COMPLETION' | 'CATEGORY'>('COMPLETION');

  const fetchAchievements = async () => {
    setLoading(true);
    try {
      const data = await achievementsService.getAchievements();
      setAchievements(data);
    } catch (e: any) {
      console.error('Failed to load achievements:', e);
      showToast(e.response?.data?.message || 'Failed to retrieve achievements', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAchievements();
  }, []);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Streak': return <Flame className="w-4 h-4 text-orange-500" />;
      case 'Study Hours': return <Clock className="w-4 h-4 text-blue-400" />;
      case 'Focus Sessions': return <RotateCcwIcon className="w-4 h-4 text-violet-400" />;
      case 'Notes': return <BookOpen className="w-4 h-4 text-violet-400" />;
      case 'Quizzes': return <Award className="w-4 h-4 text-emerald-400" />;
      case 'Flashcards': return <Brain className="w-4 h-4 text-pink-400" />;
      case 'Goals': return <Target className="w-4 h-4 text-red-400" />;
      case 'Documents': return <Upload className="w-4 h-4 text-zinc-400" />;
      case 'AI Usage': return <Sparkles className="w-4 h-4 text-violet-400 animate-pulse" />;
      default: return <Trophy className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getTierStyles = (tier: string) => {
    switch (tier) {
      case 'COMMON':
        return { text: 'text-zinc-400', border: 'border-zinc-800', bg: 'bg-zinc-950/60', badge: 'bg-zinc-900 border-zinc-800 text-zinc-400' };
      case 'UNCOMMON':
        return { text: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-950/5', badge: 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400' };
      case 'RARE':
        return { text: 'text-blue-400', border: 'border-blue-500/20', bg: 'bg-blue-950/5', badge: 'bg-blue-950/40 border-blue-500/30 text-blue-400' };
      case 'EPIC':
        return { text: 'text-purple-400', border: 'border-purple-500/20', bg: 'bg-purple-950/5', badge: 'bg-purple-950/40 border-purple-500/30 text-purple-400' };
      case 'LEGENDARY':
        return { text: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-950/5', badge: 'bg-amber-950/40 border-amber-500/30 text-amber-400' };
      case 'MYTHIC':
        return { text: 'text-pink-400 animate-pulse', border: 'border-pink-500/30', bg: 'bg-pink-950/5', badge: 'bg-pink-950/40 border-pink-500/30 text-pink-400' };
      default:
        return { text: 'text-zinc-400', border: 'border-zinc-800', bg: 'bg-zinc-900/40', badge: 'bg-zinc-900 border-zinc-800 text-zinc-400' };
    }
  };

  // Filter & Sort Logic
  const filteredAchievements = achievements
    .filter((a) => {
      // 1. Search Query
      const query = search.toLowerCase();
      const matchSearch = a.title.toLowerCase().includes(query) || a.description.toLowerCase().includes(query);
      
      // 2. Category
      const matchCategory = selectedCategory === 'ALL' || a.category === selectedCategory;

      // 3. Status
      let matchStatus = true;
      if (selectedStatus === 'UNLOCKED') matchStatus = a.unlocked;
      else if (selectedStatus === 'LOCKED') matchStatus = !a.unlocked && !a.isSecret;
      else if (selectedStatus === 'SECRET') matchStatus = a.isSecret;

      return matchSearch && matchCategory && matchStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'RECENT') {
        const timeA = a.unlockedAt ? new Date(a.unlockedAt).getTime() : 0;
        const timeB = b.unlockedAt ? new Date(b.unlockedAt).getTime() : 0;
        return timeB - timeA;
      }
      if (sortBy === 'RARITY') {
        return a.rarityPercentage - b.rarityPercentage;
      }
      if (sortBy === 'CATEGORY') {
        return a.category.localeCompare(b.category);
      }
      // COMPLETION (Progress percentage desc)
      const pctA = a.target > 0 ? (a.progress / a.target) : 0;
      const pctB = b.target > 0 ? (b.progress / b.target) : 0;
      return pctB - pctA;
    });

  const totalXP = achievements.filter((a) => a.unlocked).reduce((sum, a) => sum + a.rewardXP, 0);
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const progressPercent = achievements.length > 0 ? Math.round((unlockedCount / achievements.length) * 100) : 0;

  return (
    <div className="h-full overflow-y-auto bg-zinc-950 px-6 py-8 md:px-10 lg:px-16 animate-fadeIn">
      
      {/* Achievements Header Summary cards */}
      <div className="max-w-6xl mx-auto mb-8 grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Left summary details */}
        <div className="md:col-span-1 space-y-1.5 self-center">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <Trophy className="w-6.5 h-6.5 text-violet-400" />
            Achievements Engine
          </h1>
          <p className="text-zinc-500 text-xs">
            Unlock prestige learning badges by maintaining streaks, study logs, and academic excellence.
          </p>
        </div>

        {/* Total XP Earned */}
        <div className="bg-zinc-900/50 border border-zinc-800/80 p-5 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">XP Rewards Pool</span>
            <span className="text-2xl font-extrabold text-violet-400">{totalXP} XP</span>
          </div>
          <div className="p-3.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-xl">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        {/* Completion % */}
        <div className="bg-zinc-900/50 border border-zinc-800/80 p-5 rounded-2xl flex items-center justify-between">
          <div className="space-y-2 flex-1 pr-4">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Badges Unlocked</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-emerald-400">{unlockedCount}</span>
              <span className="text-xs text-zinc-500">/ {achievements.length} ({progressPercent}%)</span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-850">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl self-start">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Filters & Sorting Toolbar */}
      <div className="max-w-6xl mx-auto mb-6 bg-zinc-900/40 border border-zinc-800/60 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search achievements..."
            className="w-full bg-zinc-950 border border-zinc-850 pl-10 pr-4 py-2 rounded-xl text-xs text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-violet-500"
          />
        </div>

        {/* Filters Grid */}
        <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-zinc-500" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-1.5 text-xs text-zinc-300 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {['Streak', 'Study Hours', 'Focus Sessions', 'Notes', 'Quizzes', 'Flashcards', 'AI Usage', 'Goals', 'Documents', 'Special'].map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-1.5 text-xs text-zinc-300 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="UNLOCKED">Unlocked Only</option>
            <option value="LOCKED">Locked Only</option>
            <option value="SECRET">Secret Only</option>
          </select>

          {/* Sorting */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-1.5 text-xs text-zinc-300 focus:outline-none cursor-pointer"
          >
            <option value="COMPLETION">Sort by Completion</option>
            <option value="RECENT">Sort by Recent Unlocks</option>
            <option value="RARITY">Sort by Rarity (Ownership)</option>
            <option value="CATEGORY">Sort by Category</option>
          </select>
        </div>

      </div>

      {/* Main Grid content list */}
      {loading ? (
        <div className="h-60 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        </div>
      ) : (
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAchievements.length === 0 ? (
            <div className="col-span-full h-40 flex flex-col items-center justify-center text-zinc-650 text-xs text-center border border-dashed border-zinc-850 p-6 rounded-3xl bg-zinc-900/10">
              <Trophy className="w-8 h-8 stroke-[1.5] mb-2" />
              <span>No achievements match your query.</span>
            </div>
          ) : (
            filteredAchievements.map((ach) => {
              const styles = getTierStyles(ach.tier);
              const progressPct = ach.target > 0 ? Math.min(100, Math.round((ach.progress / ach.target) * 100)) : 0;
              const isLockedSecret = ach.isSecret && !ach.unlocked;

              return (
                <div
                  key={ach.id}
                  className={`bg-zinc-900/20 border ${styles.border} p-5 rounded-3xl flex flex-col justify-between space-y-4 hover:shadow-lg transition-all duration-300 relative overflow-hidden group ${
                    ach.unlocked ? 'bg-zinc-900/40' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  {/* Decorative glowing gradient inside rare tiers */}
                  {ach.unlocked && (ach.tier === 'LEGENDARY' || ach.tier === 'MYTHIC') && (
                    <div className="absolute -inset-1 bg-gradient-to-r from-violet-650 to-pink-500 opacity-5 blur-xl group-hover:opacity-10 transition duration-300 pointer-events-none" />
                  )}

                  {/* Header info */}
                  <div className="flex gap-4">
                    {/* Badge Icon circle */}
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-md shrink-0 bg-zinc-950 ${styles.border}`}>
                      {isLockedSecret ? (
                        <HelpCircle className="w-5 h-5 text-zinc-600 animate-pulse" />
                      ) : (
                        getCategoryIcon(ach.category)
                      )}
                    </div>

                    {/* Metadata summary */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-xs font-bold text-zinc-200 block truncate" title={ach.title}>
                          {ach.title}
                        </span>
                        
                        {/* Status Check label */}
                        {ach.unlocked && (
                          <CheckCircle className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                        )}
                      </div>
                      <span className="text-[9px] text-zinc-550 block font-semibold mt-0.5">
                        {ach.category} Category
                      </span>
                    </div>
                  </div>

                  {/* Description snippet */}
                  <p className="text-[11px] text-zinc-450 leading-relaxed break-words">
                    {ach.description}
                  </p>

                  {/* Progress values */}
                  <div className="space-y-1.5 pt-2 border-t border-zinc-850">
                    <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500">
                      <span>Progress</span>
                      <span>
                        {ach.progress} / {ach.target} ({progressPct}%)
                      </span>
                    </div>
                    {/* Progress Slider */}
                    <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-850/60">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          ach.unlocked ? 'bg-emerald-500' : 'bg-violet-600'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer Tiers & Rewards details */}
                  <div className="flex items-center justify-between pt-2">
                    <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider ${styles.badge}`}>
                      {ach.tier}
                    </span>

                    {/* Rarity & XP */}
                    <div className="flex items-center gap-2 text-[9px] font-bold text-zinc-550">
                      <span>Rarity: {ach.rarityPercentage}%</span>
                      <span>•</span>
                      <span className="text-violet-400">+{ach.rewardXP} XP</span>
                    </div>
                  </div>

                </div>
              );
            })
          )}
        </div>
      )}

    </div>
  );
}

// Simple placeholder helper for RotateCcw icon
function RotateCcwIcon({ className }: { className?: string }) {
  return <Clock className={className} />;
}
