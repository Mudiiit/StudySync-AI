'use client';

import React, { useState, useEffect } from 'react';
import { 
  Trophy, Search, Filter, Loader2, Sparkles, CheckCircle, 
  HelpCircle, Award, Flame, BookOpen, Brain, Clock, Upload, Target, ArrowRight, Eye
} from 'lucide-react';
import achievementsService, { UserAchievement } from '@/services/achievements';
import { useToast } from '@/components/providers/ToastProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { BADGE_ASSETS, Streak7Badge } from '@/components/achievements/badge-assets';

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

  // 3D Card Hover Tilt Effects
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rx = ((y - rect.height / 2) / rect.height) * -12; // tilt angle limit
    const ry = ((x - rect.width / 2) / rect.width) * 12;
    card.style.setProperty('--rx', `${rx}deg`);
    card.style.setProperty('--ry', `${ry}deg`);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
  };

  // Get Rarity theme assets & styling classes
  const getRarityTheme = (tier: string) => {
    switch (tier) {
      case 'COMMON':
        return {
          bg: 'bg-gradient-to-b from-zinc-900/40 via-zinc-950/20 to-zinc-950/80 border-zinc-800/80 hover:border-zinc-700/60',
          glow: 'rgba(156, 163, 175, 0.08)',
          text: 'text-zinc-400',
          badge: 'bg-zinc-900/80 border-zinc-800 text-zinc-400',
          glowHover: 'group-hover:shadow-[0_0_30px_rgba(156,163,175,0.15)]',
          bar: 'from-zinc-500 to-zinc-700',
          particles: 'none',
        };
      case 'UNCOMMON':
        return {
          bg: 'bg-gradient-to-b from-emerald-950/20 via-zinc-950/15 to-zinc-950/80 border-emerald-500/20 hover:border-emerald-400/55',
          glow: 'rgba(16, 185, 129, 0.25)',
          text: 'text-emerald-400',
          badge: 'bg-emerald-950/60 border-emerald-800/40 text-emerald-400',
          glowHover: 'group-hover:shadow-[0_0_40px_rgba(16,185,129,0.45)]',
          bar: 'from-emerald-500 to-teal-500',
          particles: 'bg-emerald-500/10',
        };
      case 'RARE':
        return {
          bg: 'bg-gradient-to-b from-blue-950/25 via-zinc-950/15 to-zinc-950/80 border-blue-500/20 hover:border-blue-400/65',
          glow: 'rgba(59, 130, 246, 0.35)',
          text: 'text-blue-400',
          badge: 'bg-blue-950/60 border-blue-800/40 text-blue-400',
          glowHover: 'group-hover:shadow-[0_0_45px_rgba(59,130,246,0.55)]',
          bar: 'from-blue-500 to-cyan-500',
          particles: 'bg-blue-500/10',
        };
      case 'EPIC':
        return {
          bg: 'bg-gradient-to-b from-purple-950/30 via-zinc-950/15 to-zinc-950/80 border-purple-900/40 hover:border-purple-500/60',
          glow: 'rgba(168, 85, 247, 0.28)',
          text: 'text-purple-400',
          badge: 'bg-purple-950/60 border-purple-800/40 text-purple-400',
          glowHover: 'group-hover:shadow-[0_0_45px_rgba(168,85,247,0.45)]',
          bar: 'from-purple-500 to-fuchsia-500',
          particles: 'bg-purple-500/15',
        };
      case 'LEGENDARY':
        return {
          bg: 'bg-gradient-to-b from-amber-950/35 via-zinc-950/15 to-zinc-950/80 border-amber-900/40 hover:border-amber-500/70',
          glow: 'rgba(245, 158, 11, 0.35)',
          text: 'text-amber-400',
          badge: 'bg-amber-950/60 border-amber-800/40 text-amber-400',
          glowHover: 'group-hover:shadow-[0_0_55px_rgba(245,158,11,0.55)]',
          bar: 'from-amber-500 to-yellow-500',
          particles: 'bg-amber-500/20',
        };
      case 'MYTHIC':
        return {
          bg: 'bg-gradient-to-b from-pink-950/40 via-violet-950/15 to-zinc-950/90 border-pink-900/50 hover:border-pink-500/85',
          glow: 'rgba(236, 72, 153, 0.45)',
          text: 'text-pink-400',
          badge: 'bg-pink-950/60 border-pink-800/40 text-pink-400 animate-pulse',
          glowHover: 'group-hover:shadow-[0_0_65px_rgba(236,72,153,0.75)]',
          bar: 'from-pink-500 to-violet-500',
          particles: 'bg-pink-500/25',
        };
      default:
        return {
          bg: 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-700',
          glow: 'none',
          text: 'text-zinc-400',
          badge: 'bg-zinc-900 border-zinc-800 text-zinc-400',
          glowHover: '',
          bar: 'from-zinc-500 to-zinc-700',
          particles: 'none',
        };
    }
  };

  // Filter & Sort Logic
  const getFilteredAchievements = () => {
    return achievements
      .filter((a) => {
        const query = search.toLowerCase();
        const matchSearch = a.title.toLowerCase().includes(query) || a.description.toLowerCase().includes(query);
        const matchCategory = selectedCategory === 'ALL' || a.category === selectedCategory;
        
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
        const pctA = a.target > 0 ? (a.progress / a.target) : 0;
        const pctB = b.target > 0 ? (b.progress / b.target) : 0;
        return pctB - pctA;
      });
  };

  const filteredList = getFilteredAchievements();

  // Dynamic calculations for stats & feature banners
  const totalXP = achievements.filter((a) => a.unlocked).reduce((sum, a) => sum + a.rewardXP, 0);
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const progressPercent = achievements.length > 0 ? Math.round((unlockedCount / achievements.length) * 100) : 0;

  // Determine highest rarity unlocked
  const rarityWeights = { COMMON: 1, UNCOMMON: 2, RARE: 3, EPIC: 4, LEGENDARY: 5, MYTHIC: 6 };
  const unlockedBadges = achievements.filter(a => a.unlocked);
  let highestRarity = 'NONE';
  if (unlockedBadges.length > 0) {
    highestRarity = unlockedBadges.reduce((highest, cur) => {
      const wCur = rarityWeights[cur.tier] || 0;
      const wHigh = rarityWeights[highest as keyof typeof rarityWeights] || 0;
      return wCur > wHigh ? cur.tier : highest;
    }, 'COMMON');
  }

  // Calculate Streak progress (highest streak unlocked)
  const currentStreakRecord = achievements.find(a => a.category === 'Streak' && a.unlocked);
  const currentStreakVal = currentStreakRecord ? currentStreakRecord.progress : 0;

  // Dynamically select the Featured Achievement:
  // 1. Closest uncompleted achievement (highest progress percent < 100%)
  // 2. Or if all are completed, highest rarity unlocked
  const getFeaturedAchievement = (): UserAchievement | null => {
    if (achievements.length === 0) return null;
    const incomplete = achievements.filter(a => !a.unlocked && a.target > 0);
    if (incomplete.length > 0) {
      return incomplete.reduce((prev, cur) => {
        const pctPrev = prev.progress / prev.target;
        const pctCur = cur.progress / cur.target;
        return pctCur > pctPrev ? cur : prev;
      }, incomplete[0]);
    }
    return achievements[0]; // fallback
  };

  const featured = getFeaturedAchievement();

  // Category Shelf sections configuration
  const SHELF_SECTIONS = [
    { title: '🔥 Streak & Focus Collection', filter: (a: UserAchievement) => a.category === 'Streak' || a.category === 'Focus Sessions' },
    { title: '⏰ Study Logs & Time keeping', filter: (a: UserAchievement) => a.category === 'Study Hours' },
    { title: '🧠 Knowledge & Core Notes', filter: (a: UserAchievement) => a.category === 'Notes' || a.category === 'Flashcards' },
    { title: '🏆 Academic Quizzes & Goals', filter: (a: UserAchievement) => a.category === 'Quizzes' || a.category === 'Goals' },
    { title: '🤖 AI Summaries & Files', filter: (a: UserAchievement) => a.category === 'AI Usage' || a.category === 'Documents' },
    { title: '🕵️‍♂️ Secret & Special Relics', filter: (a: UserAchievement) => a.isSecret },
  ];

  return (
    <div className="h-full overflow-y-auto bg-zinc-950 px-6 py-10 md:px-12 lg:px-20 text-zinc-100 scrollbar-thin select-none">
      
      {/* 1. Header & Dynamic Statistics Showcase */}
      <div className="max-w-6xl mx-auto mb-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-zinc-900 pb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-violet-650/10 border border-violet-600/30 text-violet-400 rounded-2xl">
              <Trophy className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                Trophy Gallery
              </h1>
              <p className="text-zinc-500 text-xs">
                Unlock prestigious learning artifacts and medals to showcase your academic journey.
              </p>
            </div>
          </div>
        </div>

        {/* Dashboard Stat Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full lg:w-auto">
          {/* XP Pool */}
          <div className="bg-zinc-900/30 border border-zinc-900 p-4 rounded-2xl flex flex-col justify-between min-w-[120px] backdrop-blur-sm">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">XP Pool</span>
            <span className="text-xl font-extrabold text-violet-400 mt-1 flex items-center gap-1">
              {totalXP} <Sparkles className="w-4 h-4 text-violet-400 animate-pulse" />
            </span>
          </div>

          {/* Badges Count */}
          <div className="bg-zinc-900/30 border border-zinc-900 p-4 rounded-2xl flex flex-col justify-between min-w-[120px] backdrop-blur-sm">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Unlocked</span>
            <span className="text-xl font-extrabold text-emerald-400 mt-1">
              {unlockedCount} <span className="text-xs text-zinc-600">/ {achievements.length}</span>
            </span>
          </div>

          {/* Completion Rate */}
          <div className="bg-zinc-900/30 border border-zinc-900 p-4 rounded-2xl flex flex-col justify-between min-w-[120px] backdrop-blur-sm">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Progress</span>
            <span className="text-xl font-extrabold text-zinc-300 mt-1">{progressPercent}%</span>
          </div>

          {/* Highest Rarity */}
          <div className="bg-zinc-900/30 border border-zinc-900 p-4 rounded-2xl flex flex-col justify-between min-w-[120px] backdrop-blur-sm">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Highest Tier</span>
            <span className="text-xl font-extrabold text-pink-400 mt-1 uppercase tracking-tight text-[13px] truncate">
              {highestRarity}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Featured Achievement Hero banner */}
      {featured && (
        <div className="max-w-6xl mx-auto mb-10">
          <div className="relative group overflow-hidden bg-gradient-to-r from-zinc-900/40 via-zinc-950/20 to-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-8 shadow-xl">
            {/* Outer space atmospheric glows */}
            <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 opacity-10 blur-2xl group-hover:opacity-15 transition duration-500 pointer-events-none" />
            
            {/* Featured Badge Left Display */}
            <div className="relative shrink-0 flex items-center justify-center p-6 bg-zinc-950/60 border border-zinc-800/70 rounded-full">
              <div className="absolute inset-0 bg-violet-600/20 blur-xl rounded-full" />
              {(() => {
                const BadgeComp = BADGE_ASSETS[featured.id] || Streak7Badge;
                return <BadgeComp size={144} unlocked={featured.unlocked} />;
              })()}
            </div>

            {/* Featured Content Right Display */}
            <div className="flex-1 space-y-3 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-extrabold bg-violet-500/10 border border-violet-500/20 text-violet-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Featured Target
                </span>
                <span className="text-zinc-550 text-xs">
                  Rarity: {featured.rarityPercentage}% Unlocked
                </span>
              </div>

              <h2 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-zinc-150 via-zinc-300 to-zinc-500 bg-clip-text text-transparent truncate tracking-tight">
                {featured.title}
              </h2>
              <p className="text-zinc-400 text-xs leading-relaxed max-w-2xl">
                {featured.description}
              </p>

              {/* Progress Slider */}
              <div className="space-y-1.5 max-w-md pt-2">
                <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500">
                  <span>Current Progress</span>
                  <span>{featured.progress} / {featured.target} ({Math.round((featured.progress / featured.target) * 100)}%)</span>
                </div>
                <div className="w-full h-2.5 bg-zinc-950 rounded-full border border-zinc-850 overflow-hidden relative">
                  <div 
                    className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full transition-all duration-500" 
                    style={{ width: `${(featured.progress / featured.target) * 100}%` }}
                  />
                </div>
              </div>

              {/* XP reward display */}
              <div className="flex items-center gap-4 pt-2">
                <span className="text-xs text-zinc-400 flex items-center gap-1 font-bold">
                  Reward: <span className="text-violet-400">+{featured.rewardXP} XP</span>
                </span>
                <span className="text-zinc-650">•</span>
                <span className="text-xs text-zinc-500 font-medium">
                  {featured.category} Category
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Toolbar: Search and Filter Control Board */}
      <div className="max-w-6xl mx-auto mb-8 bg-zinc-950 border border-zinc-900 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search credentials..."
            className="w-full bg-zinc-900/40 border border-zinc-850 pl-10 pr-4 py-2 rounded-xl text-xs text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-violet-500 transition-all duration-300"
          />
        </div>

        <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
          {/* Category Selector */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-zinc-500" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-zinc-900/50 border border-zinc-850 rounded-xl px-3 py-1.5 text-xs text-zinc-300 focus:outline-none cursor-pointer hover:border-zinc-700 transition"
            >
              <option value="ALL">All Categories</option>
              {['Streak', 'Study Hours', 'Focus Sessions', 'Notes', 'Quizzes', 'Flashcards', 'AI Usage', 'Goals', 'Documents', 'Special'].map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="bg-zinc-900/50 border border-zinc-850 rounded-xl px-3 py-1.5 text-xs text-zinc-300 focus:outline-none cursor-pointer hover:border-zinc-700 transition"
          >
            <option value="ALL">All Status</option>
            <option value="UNLOCKED">Unlocked Only</option>
            <option value="LOCKED">Locked Only</option>
            <option value="SECRET">Secret Only</option>
          </select>

          {/* Sort selection */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-zinc-900/50 border border-zinc-850 rounded-xl px-3 py-1.5 text-xs text-zinc-300 focus:outline-none cursor-pointer hover:border-zinc-700 transition"
          >
            <option value="COMPLETION">Sort by Completion</option>
            <option value="RECENT">Sort by Recent Unlocks</option>
            <option value="RARITY">Sort by Rarity</option>
            <option value="CATEGORY">Sort by Category</option>
          </select>
        </div>
      </div>

      {/* 4. Curated Shelf Grid Collections */}
      <div className="max-w-6xl mx-auto space-y-12">
        {loading ? (
          <div className="h-60 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          </div>
        ) : filteredList.length === 0 ? (
          // Inspirational Premium Empty State
          <div className="py-16 text-center border border-dashed border-zinc-900 rounded-3xl bg-zinc-950/40 p-8 max-w-md mx-auto space-y-4">
            <Trophy className="w-12 h-12 text-zinc-650 mx-auto" />
            <h3 className="text-lg font-bold text-zinc-200">Your Collection Begins Here</h3>
            <p className="text-zinc-500 text-xs leading-relaxed">
              Complete study focus periods, create summary guides, or play quizzes to claim your first physical-weight digital reward.
            </p>
            <button 
              onClick={() => window.location.href = '/dashboard'}
              className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 mx-auto"
            >
              Start Learning <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          SHELF_SECTIONS.map((shelf) => {
            const shelfAchievements = filteredList.filter(shelf.filter);
            if (shelfAchievements.length === 0) return null;

            return (
              <div key={shelf.title} className="space-y-4 animate-fadeIn">
                <h3 className="text-sm font-extrabold text-zinc-400 tracking-wider uppercase border-b border-zinc-900 pb-2">
                  {shelf.title} ({shelfAchievements.length})
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
                  {shelfAchievements.map((ach) => {
                    const themeStyles = getRarityTheme(ach.tier);
                    const progressPct = ach.target > 0 ? Math.min(100, Math.round((ach.progress / ach.target) * 100)) : 0;

                    return (
                      <div
                        key={ach.id}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeave}
                        className={`group p-6 rounded-[28px] border transition-all duration-300 relative overflow-hidden flex flex-col justify-between space-y-5 cursor-default ${themeStyles.bg} ${themeStyles.glowHover}`}
                        style={{
                          transform: 'perspective(1000px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))',
                          transition: 'transform 0.15s ease-out, border-color 0.3s, shadow 0.3s',
                        }}
                      >
                        {/* Layered Rarity particle mesh overlay */}
                        <div className={`absolute inset-0 ${themeStyles.particles} opacity-30 pointer-events-none`} />

                        {/* Top: Large centered Medal Emblem */}
                        <div className="relative w-full aspect-[4/3] flex items-center justify-center bg-zinc-950/40 rounded-2xl border border-zinc-900/60 p-4 overflow-hidden">
                          {/* Inner back glow radial spotlight */}
                          <div 
                            className="absolute w-24 h-24 rounded-full blur-xl opacity-20 pointer-events-none group-hover:scale-125 transition-all duration-300"
                            style={{ backgroundColor: themeStyles.glow }}
                          />
                          {/* Centerpiece Asset */}
                          <div className="relative transform group-hover:scale-110 group-hover:-translate-y-1.5 transition-all duration-300">
                            {(() => {
                              const BadgeComponent = BADGE_ASSETS[ach.id] || Streak7Badge;
                              return <BadgeComponent size={96} unlocked={ach.unlocked} />;
                            })()}
                          </div>

                          {/* Checkmark overlay */}
                          {ach.unlocked && (
                            <div className="absolute top-3 right-3 p-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full">
                              <CheckCircle className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>

                        {/* Middle: Title & Category Description */}
                        <div className="space-y-1.5 text-center">
                          <span className="text-[9px] font-extrabold text-zinc-550 block uppercase tracking-wider">
                            {ach.category} Category
                          </span>
                          <h4 className="text-sm font-bold text-zinc-200 leading-tight truncate px-1">
                            {ach.title}
                          </h4>
                          <p className="text-[11px] text-zinc-450 leading-relaxed line-clamp-2 px-1">
                            {ach.description}
                          </p>
                        </div>

                        {/* Bottom: Progress Bar & Rarity Metadata */}
                        <div className="space-y-4 pt-3 border-t border-zinc-900/80">
                          {/* Thick Progress bar with glow tip */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[9px] font-bold text-zinc-500">
                              <span>Progress</span>
                              <span>{ach.progress} / {ach.target}</span>
                            </div>
                            <div className="w-full h-2.5 bg-zinc-950/80 border border-zinc-900 rounded-full overflow-hidden relative">
                              <div
                                className={`h-full bg-gradient-to-r ${themeStyles.bar} rounded-full transition-all duration-350`}
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>

                          {/* Bottom metadata tags */}
                          <div className="flex items-center justify-between pt-1">
                            <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wider ${themeStyles.badge}`}>
                              {ach.tier}
                            </span>
                            <div className="flex items-center gap-2 text-[9px] font-bold text-zinc-550">
                              <span>{ach.rarityPercentage}% rare</span>
                              <span>•</span>
                              <span className="text-violet-400">+{ach.rewardXP} XP</span>
                            </div>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
