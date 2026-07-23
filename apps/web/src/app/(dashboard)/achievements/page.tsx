'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Trophy, Search, Filter, Loader2, Sparkles, CheckCircle, 
  HelpCircle, Award, Flame, BookOpen, Brain, Clock, Upload, Target, ArrowRight, Eye,
  Lock, AlertTriangle, ShieldCheck, ChevronRight, X, Sparkle, Zap, RefreshCw, BarChart2
} from 'lucide-react';
import achievementsService, { UserAchievement } from '@/services/achievements';
import { useToast } from '@/components/providers/ToastProvider';
import { BADGE_ASSETS, Streak7Badge } from '@/components/achievements/badge-assets';

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // Search & Filter States
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'UNLOCKED' | 'LOCKED' | 'SECRET'>('ALL');
  const [selectedRarity, setSelectedRarity] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'RECENT' | 'RARITY' | 'COMPLETION' | 'CATEGORY' | 'NEAREST'>('COMPLETION');

  // Modal State
  const [selectedBadge, setSelectedBadge] = useState<UserAchievement | null>(null);

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
    const rx = ((y - rect.height / 2) / rect.height) * -12;
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
          bg: 'bg-gradient-to-b from-zinc-900/40 via-zinc-950/20 to-zinc-950/80 border-zinc-900 hover:border-zinc-800',
          glow: 'rgba(156, 163, 175, 0.08)',
          text: 'text-zinc-400',
          badge: 'bg-zinc-900 border-zinc-800 text-zinc-450',
          glowHover: 'hover:shadow-[0_0_30px_rgba(156,163,175,0.05)]',
          bar: 'from-zinc-550 to-zinc-700',
          particles: 'none',
        };
      case 'UNCOMMON':
        return {
          bg: 'bg-gradient-to-b from-emerald-950/20 via-zinc-950/15 to-zinc-950/80 border-emerald-500/10 hover:border-emerald-500/30',
          glow: 'rgba(16, 185, 129, 0.2)',
          text: 'text-emerald-450',
          badge: 'bg-emerald-950/30 border-emerald-800/20 text-emerald-450',
          glowHover: 'hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]',
          bar: 'from-emerald-555 to-teal-500',
          particles: 'bg-emerald-500/5',
        };
      case 'RARE':
        return {
          bg: 'bg-gradient-to-b from-blue-950/25 via-zinc-950/15 to-zinc-950/80 border-blue-500/10 hover:border-blue-500/30',
          glow: 'rgba(59, 130, 246, 0.25)',
          text: 'text-blue-450',
          badge: 'bg-blue-950/30 border-blue-800/20 text-blue-450',
          glowHover: 'hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]',
          bar: 'from-blue-555 to-cyan-500',
          particles: 'bg-blue-500/5',
        };
      case 'EPIC':
        return {
          bg: 'bg-gradient-to-b from-purple-950/30 via-zinc-950/15 to-zinc-950/80 border-purple-500/10 hover:border-purple-500/30',
          glow: 'rgba(168, 85, 247, 0.25)',
          text: 'text-purple-455',
          badge: 'bg-purple-950/30 border-purple-800/20 text-purple-455',
          glowHover: 'hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]',
          bar: 'from-purple-555 to-fuchsia-500',
          particles: 'bg-purple-500/5',
        };
      case 'LEGENDARY':
        return {
          bg: 'bg-gradient-to-b from-amber-950/35 via-zinc-950/15 to-zinc-950/80 border-amber-500/10 hover:border-amber-500/30',
          glow: 'rgba(245, 158, 11, 0.25)',
          text: 'text-amber-450',
          badge: 'bg-amber-950/30 border-amber-800/20 text-amber-450',
          glowHover: 'hover:shadow-[0_0_35px_rgba(245,158,11,0.2)]',
          bar: 'from-amber-555 to-yellow-500',
          particles: 'bg-amber-500/5',
        };
      case 'MYTHIC':
        return {
          bg: 'bg-gradient-to-b from-pink-950/40 via-violet-950/15 to-zinc-950/90 border-pink-500/15 hover:border-pink-500/35',
          glow: 'rgba(236, 72, 153, 0.35)',
          text: 'text-pink-450',
          badge: 'bg-pink-950/30 border-pink-850/30 text-pink-450 animate-pulse',
          glowHover: 'hover:shadow-[0_0_40px_rgba(236,72,153,0.25)]',
          bar: 'from-pink-555 to-violet-500',
          particles: 'bg-pink-500/10',
        };
      default:
        return {
          bg: 'bg-zinc-900/30 border-zinc-900 hover:border-zinc-800',
          glow: 'none',
          text: 'text-zinc-450',
          badge: 'bg-zinc-900 border-zinc-800 text-zinc-450',
          glowHover: '',
          bar: 'from-zinc-555 to-zinc-700',
          particles: 'none',
        };
    }
  };

  // Filter & Sort Logic
  const filteredList = useMemo(() => {
    return achievements
      .filter((a) => {
        const query = search.toLowerCase();
        const matchSearch = a.title.toLowerCase().includes(query) || a.description.toLowerCase().includes(query);
        const matchCategory = selectedCategory === 'ALL' || a.category === selectedCategory;
        const matchRarity = selectedRarity === 'ALL' || a.tier === selectedRarity;
        
        let matchStatus = true;
        if (selectedStatus === 'UNLOCKED') matchStatus = a.unlocked;
        else if (selectedStatus === 'LOCKED') matchStatus = !a.unlocked && !a.isSecret;
        else if (selectedStatus === 'SECRET') matchStatus = a.isSecret;

        return matchSearch && matchCategory && matchStatus && matchRarity;
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
        if (sortBy === 'NEAREST') {
          const progressPctA = a.target > 0 ? (a.progress / a.target) : 0;
          const progressPctB = b.target > 0 ? (b.progress / b.target) : 0;
          // Filter out completed ones, sorting nearest first
          if (a.unlocked && !b.unlocked) return 1;
          if (!a.unlocked && b.unlocked) return -1;
          return progressPctB - progressPctA;
        }
        const pctA = a.target > 0 ? (a.progress / a.target) : 0;
        const pctB = b.target > 0 ? (b.progress / b.target) : 0;
        return pctB - pctA;
      });
  }, [achievements, search, selectedCategory, selectedStatus, selectedRarity, sortBy]);

  // Statistics summaries
  const totalXP = useMemo(() => achievements.filter((a) => a.unlocked).reduce((sum, a) => sum + a.rewardXP, 0), [achievements]);
  const unlockedCount = useMemo(() => achievements.filter((a) => a.unlocked).length, [achievements]);
  const progressPercent = useMemo(() => achievements.length > 0 ? Math.round((unlockedCount / achievements.length) * 100) : 0, [achievements, unlockedCount]);

  // Rarity counters
  const rareCount = useMemo(() => achievements.filter((a) => a.unlocked && a.tier === 'RARE').length, [achievements]);
  const epicCount = useMemo(() => achievements.filter((a) => a.unlocked && a.tier === 'EPIC').length, [achievements]);
  const legendaryCount = useMemo(() => achievements.filter((a) => a.unlocked && (a.tier === 'LEGENDARY' || a.tier === 'MYTHIC')).length, [achievements]);

  // Next easiest badge
  const nextEasiest = useMemo(() => {
    const incomplete = achievements.filter((a) => !a.unlocked && a.target > 0);
    if (incomplete.length === 0) return null;
    return incomplete.reduce((prev, cur) => {
      const pctPrev = prev.progress / prev.target;
      const pctCur = cur.progress / cur.target;
      return pctCur > pctPrev ? cur : prev;
    });
  }, [achievements]);

  // Featured target achievement definition
  const featured = nextEasiest || achievements[0] || null;

  // AI recommendations based on real progress
  const aiRecommendations = useMemo(() => {
    const active = achievements.filter((a) => !a.unlocked && a.target > 0);
    if (active.length === 0) {
      return ['All credentials unlocked! You are academic legend.'];
    }
    // Sort by nearest completion
    const sorted = [...active].sort((a, b) => (b.progress / b.target) - (a.progress / a.target));
    return sorted.slice(0, 3).map((a) => {
      const remaining = a.target - a.progress;
      return `Complete ${remaining} more for "${a.title}" (${a.category} category). Expected XP: +${a.rewardXP} XP.`;
    });
  }, [achievements]);

  // Category Shelf configurations
  const SHELF_SECTIONS = [
    { title: '🔥 Streak & Focus Collection', filter: (a: UserAchievement) => a.category === 'Streak' || a.category === 'Focus Sessions' },
    { title: '⏰ Study Logs & Time keeping', filter: (a: UserAchievement) => a.category === 'Study Hours' },
    { title: '🧠 Knowledge & Core Notes', filter: (a: UserAchievement) => a.category === 'Notes' || a.category === 'Flashcards' },
    { title: '🏆 Academic Quizzes & Goals', filter: (a: UserAchievement) => a.category === 'Quizzes' || a.category === 'Goals' },
    { title: '🤖 AI Summaries & Files', filter: (a: UserAchievement) => a.category === 'AI Usage' || a.category === 'Documents' },
    { title: '🕵️‍♂️ Secret & Special Relics', filter: (a: UserAchievement) => a.isSecret },
  ];

  return (
    <div className="flex-1 flex flex-col gap-8 p-6 max-w-7xl mx-auto w-full font-sans text-xs text-zinc-350 select-none bg-[#070708]/10 min-h-screen">
      
      {/* 1. Header & Dynamic Statistics Showcase */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-900 bg-zinc-950/20 backdrop-blur-md p-6 sm:p-8 flex flex-col gap-6 text-left">
        <div className="absolute top-0 right-0 w-80 h-80 bg-violet-650/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Trophy className="h-4.5 w-4.5 text-violet-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-violet-400">Medals & Credentials</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-sans">
              StudySync Trophy Gallery
            </h1>
            <p className="text-zinc-400 max-w-2xl text-[11px] leading-relaxed font-medium">
              Unlock prestigious learning badges, academic relics, and focus milestones dynamically. Track your profile velocity and showcase your accomplishments.
            </p>
          </div>
        </div>

        {/* Dashboard Stat Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-zinc-900">
          {[
            { label: 'Overall Completion', val: `${progressPercent}%`, trend: `${unlockedCount}/${achievements.length} Badges`, color: 'text-violet-400', desc: 'Total unlocked credentials index' },
            { label: 'Earned Medal XP', val: `+${totalXP} XP`, trend: '▲ +240', color: 'text-emerald-400', desc: 'Bonus points awarded from milestones' },
            { label: 'High Rarity Badges', val: `${rareCount + epicCount + legendaryCount}`, trend: 'Active', color: 'text-orange-400', desc: 'Rare, Epic, and Legendary counts' },
            { label: 'Completion Velocity', val: '1.6x', trend: 'Optimal', color: 'text-cyan-400', desc: 'Badges progression rate velocity' }
          ].map((item, idx) => (
            <div key={idx} className="p-4 rounded-2xl border border-zinc-900 bg-zinc-950/40 flex flex-col justify-between gap-1 shadow-sm hover:border-zinc-800 transition">
              <span className="text-[9.5px] uppercase font-black tracking-widest text-zinc-550 block">{item.label}</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-xl font-black tracking-tight ${item.color}`}>{item.val}</span>
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{item.trend}</span>
              </div>
              <span className="text-[9px] text-zinc-500 mt-1 block leading-tight font-medium">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
        
        {/* Left column: Filters & Badge grids */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Featured Achievement card */}
          {featured && (
            <div className="relative group overflow-hidden bg-zinc-950/30 border border-zinc-900 rounded-3xl p-5 md:p-6 flex flex-col sm:flex-row items-center gap-6 shadow-xl">
              <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 opacity-5 blur-2xl group-hover:opacity-10 transition duration-500 pointer-events-none" />
              
              <div className="relative shrink-0 flex items-center justify-center p-4 bg-zinc-900 border border-zinc-850 rounded-full">
                {(() => {
                  const BadgeComp = BADGE_ASSETS[featured.id] || Streak7Badge;
                  return <BadgeComp size={100} unlocked={featured.unlocked} />;
                })()}
              </div>

              <div className="flex-1 space-y-2 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black bg-violet-650/15 border border-violet-500/20 text-violet-405 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Next Easiest Target
                  </span>
                  <span className="text-zinc-550 font-bold text-[9px] uppercase tracking-wider">
                    Rarity: {featured.rarityPercentage}% Unlocked
                  </span>
                </div>

                <h3 className="text-lg font-black text-white truncate tracking-tight">{featured.title}</h3>
                <p className="text-zinc-450 text-[10.5px] leading-normal">{featured.description}</p>

                {/* Progress bar */}
                <div className="space-y-1.5 max-w-sm pt-1">
                  <div className="flex items-center justify-between text-[9px] font-bold text-zinc-550">
                    <span>Progress</span>
                    <span>{featured.progress} / {featured.target} ({Math.round((featured.progress / featured.target) * 100)}%)</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-950 rounded-full border border-zinc-900 overflow-hidden relative">
                    <div 
                      className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full transition-all duration-500" 
                      style={{ width: `${(featured.progress / featured.target) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters board */}
          <div className="bg-zinc-950/20 border border-zinc-900 p-4 rounded-3xl flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-60">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-550" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search credentials..."
                className="w-full bg-zinc-950/50 border border-zinc-850 pl-10 pr-4 py-2 rounded-xl text-xs text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-violet-500 transition-all duration-300"
              />
            </div>

            <div className="flex flex-wrap gap-2.5 items-center w-full md:w-auto">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-zinc-950/50 border border-zinc-850 rounded-xl px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none cursor-pointer hover:border-zinc-700 transition"
              >
                <option value="ALL">All Categories</option>
                {['Streak', 'Study Hours', 'Focus Sessions', 'Notes', 'Quizzes', 'Flashcards', 'AI Usage', 'Goals', 'Documents', 'Special'].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <select
                value={selectedRarity}
                onChange={(e) => setSelectedRarity(e.target.value)}
                className="bg-zinc-950/50 border border-zinc-850 rounded-xl px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none cursor-pointer hover:border-zinc-700 transition"
              >
                <option value="ALL">All Tiers</option>
                {['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'].map(rarity => (
                  <option key={rarity} value={rarity}>{rarity}</option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as any)}
                className="bg-zinc-950/50 border border-zinc-850 rounded-xl px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none cursor-pointer hover:border-zinc-700 transition"
              >
                <option value="ALL">All Status</option>
                <option value="UNLOCKED">Unlocked Only</option>
                <option value="LOCKED">Locked Only</option>
                <option value="SECRET">Secret Only</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-zinc-950/50 border border-zinc-850 rounded-xl px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none cursor-pointer hover:border-zinc-700 transition"
              >
                <option value="COMPLETION">Sort by Completion</option>
                <option value="NEAREST">Sort by Nearest Completion</option>
                <option value="RECENT">Sort by Recent Unlocks</option>
                <option value="RARITY">Sort by Rarity</option>
              </select>
            </div>
          </div>

          {/* Shelf Lists */}
          <div className="space-y-10">
            {loading ? (
              <div className="h-60 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
              </div>
            ) : filteredList.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-zinc-900 rounded-3xl bg-zinc-950/40 p-8 max-w-md mx-auto space-y-4">
                <Trophy className="w-12 h-12 text-zinc-650 mx-auto" />
                <h3 className="text-lg font-bold text-zinc-200">Your Collection Begins Here</h3>
                <p className="text-zinc-500 text-xs leading-relaxed">
                  Complete study focus periods, create summary guides, or play quizzes to claim your first physical-weight digital reward.
                </p>
                <button 
                  onClick={() => window.location.href = '/dashboard'}
                  className="px-6 py-2.5 bg-violet-650 hover:bg-violet-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 mx-auto cursor-pointer"
                >
                  Start Learning <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              SHELF_SECTIONS.map((shelf) => {
                const shelfAchievements = filteredList.filter(shelf.filter);
                if (shelfAchievements.length === 0) return null;

                return (
                  <div key={shelf.title} className="space-y-4">
                    <h3 className="text-xs font-black text-zinc-500 tracking-widest uppercase border-b border-zinc-900 pb-2">
                      {shelf.title} ({shelfAchievements.length})
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {shelfAchievements.map((ach) => {
                        const themeStyles = getRarityTheme(ach.tier);
                        const progressPct = ach.target > 0 ? Math.min(100, Math.round((ach.progress / ach.target) * 100)) : 0;

                        return (
                          <div
                            key={ach.id}
                            onMouseMove={handleMouseMove}
                            onMouseLeave={handleMouseLeave}
                            onClick={() => setSelectedBadge(ach)}
                            className={`group p-4 rounded-3xl border transition-all duration-300 relative overflow-hidden flex flex-col justify-between space-y-4 cursor-pointer ${themeStyles.bg} ${themeStyles.glowHover}`}
                            style={{
                              transform: 'perspective(1000px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))',
                              transition: 'transform 0.15s ease-out, border-color 0.3s, shadow 0.3s',
                            }}
                          >
                            <div className={`absolute inset-0 ${themeStyles.particles} opacity-30 pointer-events-none`} />

                            <div className="relative w-full aspect-[4/3] flex items-center justify-center bg-zinc-950/40 rounded-2xl border border-zinc-900 p-4 overflow-hidden">
                              <div 
                                className="absolute w-20 h-20 rounded-full blur-xl opacity-20 pointer-events-none group-hover:scale-125 transition-all duration-300"
                                style={{ backgroundColor: themeStyles.glow }}
                              />
                              <div className="relative transform group-hover:scale-105 transition-all duration-300">
                                {(() => {
                                  const BadgeComponent = BADGE_ASSETS[ach.id] || Streak7Badge;
                                  return <BadgeComponent size={80} unlocked={ach.unlocked} />;
                                })()}
                              </div>

                              {ach.unlocked && (
                                <div className="absolute top-2.5 right-2.5 p-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 rounded-full">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                </div>
                              )}
                            </div>

                            <div className="space-y-1 text-center">
                              <span className="text-[8.5px] font-black text-zinc-550 block uppercase tracking-wider">
                                {ach.category} Category
                              </span>
                              <h4 className="text-xs font-black text-zinc-200 leading-tight truncate px-1">
                                {ach.title}
                              </h4>
                              <p className="text-[10px] text-zinc-500 leading-normal line-clamp-2 px-1 font-semibold">
                                {ach.description}
                              </p>
                            </div>

                            <div className="space-y-3 pt-3 border-t border-zinc-900">
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[8.5px] font-bold text-zinc-555">
                                  <span>Progress</span>
                                  <span>{ach.progress} / {ach.target}</span>
                                </div>
                                <div className="w-full h-1.5 bg-zinc-950 border border-zinc-900 rounded-full overflow-hidden relative">
                                  <div
                                    className={`h-full bg-gradient-to-r ${themeStyles.bar} rounded-full`}
                                    style={{ width: `${progressPct}%` }}
                                  />
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-0.5">
                                <span className={`text-[8px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${themeStyles.badge}`}>
                                  {ach.tier}
                                </span>
                                <div className="flex items-center gap-2 text-[9px] font-bold text-zinc-550 font-mono">
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

        {/* Right Sidebar: AI recommendations & Chains */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* AI Advisor Recommendations */}
          <div className="border border-zinc-900 bg-zinc-950/20 backdrop-blur-md rounded-3xl p-5 shadow-lg flex flex-col gap-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 border-b border-zinc-900 pb-3">
              <Brain className="w-4 h-4 text-violet-400 animate-pulse" />
              AI Recommendations
            </h3>
            
            <div className="space-y-4">
              <div className="p-4 bg-zinc-900/30 border border-zinc-850 rounded-2xl text-[10.5px] leading-relaxed text-zinc-450 font-semibold">
                "AI calibration forecast: Targeted actions below will yield optimal XP milestones completions."
              </div>

              <div className="space-y-3">
                {aiRecommendations.map((rec, idx) => (
                  <div key={idx} className="flex gap-2.5 items-start p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl hover:border-zinc-850 transition duration-300">
                    <Sparkle className="w-4.5 h-4.5 text-violet-405 shrink-0 mt-0.5" />
                    <span className="text-[10px] leading-relaxed text-zinc-400 font-semibold">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Badge Progression chains */}
          <div className="border border-zinc-900 bg-zinc-950/20 backdrop-blur-md rounded-3xl p-5 shadow-lg flex flex-col gap-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 border-b border-zinc-900 pb-3">
              <Award className="w-4 h-4 text-violet-400" />
              Badge Chains
            </h3>

            <div className="space-y-5">
              {[
                { title: 'Study Progression', steps: ['Study Beginner', 'Study Expert', 'Master Scholar'] },
                { title: 'Focus Streak', steps: ['First Target', '7 Day Focus Streak', 'Consistency Legend'] }
              ].map((chain, idx) => (
                <div key={idx} className="space-y-3 p-3 bg-zinc-950/30 border border-zinc-900 rounded-2xl text-left">
                  <span className="text-[8.5px] font-black text-zinc-550 uppercase tracking-widest block">{chain.title}</span>
                  
                  <div className="flex flex-col gap-2 pt-1 pl-1">
                    {chain.steps.map((step, sIdx) => (
                      <div key={sIdx} className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-violet-650/15 border border-violet-500/25 flex items-center justify-center text-[9px] font-black text-violet-400">
                          {sIdx + 1}
                        </div>
                        <span className="text-[10.5px] font-bold text-zinc-350">{step}</span>
                        {sIdx < chain.steps.length - 1 && <ChevronRight className="w-3 h-3 text-zinc-650 shrink-0 ml-auto" />}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Badge Details Modal Overlay */}
      {selectedBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/85 backdrop-blur-sm">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4 relative">
            <button 
              onClick={() => setSelectedBadge(null)}
              className="absolute top-4 right-4 p-1.5 hover:bg-zinc-800 text-zinc-500 hover:text-white rounded-xl transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center text-center gap-4">
              <div className="p-5 bg-zinc-950 border border-zinc-850 rounded-full shadow-inner relative overflow-hidden">
                <div className="absolute inset-0 bg-violet-600/10 blur-xl rounded-full" />
                {(() => {
                  const BadgeComponent = BADGE_ASSETS[selectedBadge.id] || Streak7Badge;
                  return <BadgeComponent size={120} unlocked={selectedBadge.unlocked} />;
                })()}
              </div>

              <div className="space-y-1">
                <span className="text-[8.5px] font-black text-violet-405 uppercase tracking-widest">{selectedRarity} Category Badge</span>
                <h3 className="text-lg font-black text-white tracking-tight">{selectedBadge.title}</h3>
                <p className="text-zinc-400 text-[10.5px] leading-relaxed max-w-sm">{selectedBadge.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full pt-2">
                <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-2xl flex flex-col gap-0.5 text-left">
                  <span className="text-[8.5px] font-bold text-zinc-550 uppercase">Rarity level</span>
                  <span className="text-xs font-black text-zinc-250 uppercase tracking-tight">{selectedBadge.tier} ({selectedBadge.rarityPercentage}% unlocked)</span>
                </div>
                <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-2xl flex flex-col gap-0.5 text-left">
                  <span className="text-[8.5px] font-bold text-zinc-550 uppercase">Milestone reward</span>
                  <span className="text-xs font-black text-emerald-450">+{selectedBadge.rewardXP} XP Points</span>
                </div>
              </div>

              {/* Progress Slider */}
              <div className="w-full text-left space-y-1.5 pt-2">
                <div className="flex justify-between items-center text-[9px] font-bold text-zinc-500">
                  <span>Current Milestone Target progress</span>
                  <span>{selectedBadge.progress} / {selectedBadge.target}</span>
                </div>
                <div className="w-full h-2.5 bg-zinc-950 rounded-full border border-zinc-850 overflow-hidden relative">
                  <div 
                    className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full" 
                    style={{ width: `${selectedBadge.target > 0 ? (selectedBadge.progress / selectedBadge.target) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="flex gap-2 items-start bg-zinc-950/30 p-3 rounded-2xl border border-zinc-850 text-left text-zinc-500 leading-normal w-full mt-2">
                <Brain className="w-4 h-4 text-violet-400 mt-0.5 shrink-0 animate-pulse" />
                <span>AI Advice: Focus on completing {selectedBadge.target - selectedBadge.progress} more counts to unlock this credential and boost consistency scores by 1.6x.</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
