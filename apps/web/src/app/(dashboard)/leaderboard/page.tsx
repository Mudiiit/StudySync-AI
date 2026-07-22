'use client';

import React, { useState, useEffect, useMemo } from 'react';
import leaderboardService, { LeaderboardUser, ChampionRecord } from '@/services/leaderboard';
import profileService, { UserProfile } from '@/services/profile';
import { useToast } from '@/components/providers/ToastProvider';
import { 
  Trophy, Award, Calendar, Search, Users, BookOpen, Clock, 
  Sparkles, RefreshCw, Flame, ChevronUp, ChevronDown, Minus, 
  GraduationCap, Target, ShieldAlert, Award as MedalIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SUBJECTS = [
  'Operating Systems',
  'DBMS',
  'Computer Networks',
  'DSA',
  'AI',
  'Machine Learning',
  'Cyber Security'
];

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly' | 'friends' | 'subjects' | 'champions'>('weekly');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Weekly/Monthly State
  const [weeklyList, setWeeklyList] = useState<LeaderboardUser[]>([]);
  const [currentUserWeekly, setCurrentUserWeekly] = useState<LeaderboardUser | null>(null);
  const [weeklyCountdown, setWeeklyCountdown] = useState(0);

  const [monthlyList, setMonthlyList] = useState<LeaderboardUser[]>([]);
  const [currentUserMonthly, setCurrentUserMonthly] = useState<LeaderboardUser | null>(null);
  const [monthlyCountdown, setMonthlyCountdown] = useState(0);

  // Friends State
  const [friendsPeriod, setFriendsPeriod] = useState<'weekly' | 'monthly' | 'alltime'>('weekly');
  const [friendsList, setFriendsList] = useState<LeaderboardUser[]>([]);

  // Subject State
  const [selectedSubject, setSelectedSubject] = useState('Operating Systems');
  const [subjectList, setSubjectList] = useState<any[]>([]);

  // Champions State
  const [championsList, setChampionsList] = useState<ChampionRecord[]>([]);

  // Profile data for stats integration
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { showToast } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      const prof = await profileService.getMyProfile();
      setProfile(prof);

      const weekly = await leaderboardService.getWeekly();
      setWeeklyList(weekly.list);
      setCurrentUserWeekly(weekly.currentUser);
      setWeeklyCountdown(weekly.countdownSeconds);

      const monthly = await leaderboardService.getMonthly();
      setMonthlyList(monthly.list);
      setCurrentUserMonthly(monthly.currentUser);
      setMonthlyCountdown(monthly.countdownSeconds);

      const friends = await leaderboardService.getFriends(friendsPeriod);
      setFriendsList(friends);

      const subRes = await leaderboardService.getSubject(selectedSubject);
      setSubjectList(subRes);

      const champs = await leaderboardService.getChampions();
      setChampionsList(champs);
    } catch (err) {
      console.error('Failed to load leaderboard data:', err);
      showToast('Error syncing rankings with database', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const res = await leaderboardService.getFriends(friendsPeriod);
        setFriendsList(res);
      } catch (e) {
        console.error(e);
      }
    };
    fetchFriends();
  }, [friendsPeriod]);

  useEffect(() => {
    const fetchSubject = async () => {
      try {
        const res = await leaderboardService.getSubject(selectedSubject);
        setSubjectList(res);
      } catch (e) {
        console.error(e);
      }
    };
    fetchSubject();
  }, [selectedSubject]);

  const handleRecalculate = async () => {
    try {
      setIsRefreshing(true);
      await leaderboardService.recalculate();
      await loadData();
      showToast('Rankings recalculated successfully', 'success');
    } catch (err) {
      showToast('Failed to compute rankings', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setWeeklyCountdown(prev => Math.max(0, prev - 1));
      setMonthlyCountdown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (seconds: number) => {
    if (seconds <= 0) return '0d 0h 0m';
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const mins = Math.floor((seconds % (60 * 60)) / 60);
    return `${days}d ${hours}h ${mins}m`;
  };

  // Active Lists Mapping
  const activeList = useMemo(() => {
    switch (activeTab) {
      case 'weekly': return weeklyList;
      case 'monthly': return monthlyList;
      case 'friends': return friendsList;
      case 'subjects': return subjectList;
      default: return [];
    }
  }, [activeTab, weeklyList, monthlyList, friendsList, subjectList]);

  // Search Filter
  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return activeList;
    return activeList.filter(item => 
      item.username?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [activeList, searchQuery]);

  // Total XP/Completion counters
  const totalXP = weeklyList.reduce((sum, u) => sum + u.xp, 0);
  const activeCompetitors = weeklyList.length;

  // Active user data based on currently selected tab
  const selectedCurrentUser = useMemo(() => {
    if (activeTab === 'weekly') return currentUserWeekly;
    if (activeTab === 'monthly') return currentUserMonthly;
    
    // Find current user in friends/subject list
    if (profile) {
      return activeList.find(u => u.userId === profile.userId) || null;
    }
    return null;
  }, [activeTab, currentUserWeekly, currentUserMonthly, activeList, profile]);

  // Dynamic division classification system based on ranks
  const getDivisionByRank = (rank: number) => {
    if (rank === 0 || !rank) return { name: 'Unranked', text: 'text-zinc-550', border: 'border-zinc-800/80', bg: 'bg-zinc-950/60' };
    if (rank === 1) return { name: 'Legend', text: 'text-pink-400 font-extrabold animate-pulse', border: 'border-pink-500/50', bg: 'bg-pink-950/20' };
    if (rank <= 3) return { name: 'Grandmaster', text: 'text-amber-400 font-extrabold', border: 'border-amber-500/40', bg: 'bg-amber-950/20' };
    if (rank <= 10) return { name: 'Master', text: 'text-purple-400 font-bold', border: 'border-purple-400/55', bg: 'bg-purple-950/25' };
    if (rank <= 25) return { name: 'Diamond', text: 'text-blue-400 font-bold', border: 'border-blue-400/50', bg: 'bg-blue-950/25' };
    if (rank <= 50) return { name: 'Gold', text: 'text-yellow-500 font-bold', border: 'border-yellow-500/30', bg: 'bg-yellow-950/15' };
    if (rank <= 100) return { name: 'Silver', text: 'text-zinc-300 font-semibold', border: 'border-zinc-700/30', bg: 'bg-zinc-900/40' };
    return { name: 'Bronze', text: 'text-orange-500 font-medium', border: 'border-orange-950/40', bg: 'bg-orange-950/10' };
  };

  // Top 3 Podium Winners
  const podiumWinners = useMemo(() => {
    if (filteredList.length === 0) return [];
    const top3 = filteredList.slice(0, 3);
    const result: (LeaderboardUser | null)[] = [null, null, null];
    
    top3.forEach((user, index) => {
      if (index === 0) result[0] = user; // 1st Place (Center)
      else if (index === 1) result[1] = user; // 2nd Place (Left)
      else if (index === 2) result[2] = user; // 3rd Place (Right)
    });
    return result;
  }, [filteredList]);

  // Standings list starting after the Top 3
  const listStandings = useMemo(() => {
    return filteredList.slice(3);
  }, [filteredList]);

  // Dynamic AI study insights summary
  const getAIInsights = () => {
    if (!selectedCurrentUser) {
      return ['Complete your first study session to join the competitive arena!'];
    }
    const insights = [];
    const nextTargetUser = filteredList.find(u => u.rank === selectedCurrentUser.rank - 1);
    
    if (nextTargetUser) {
      const xpDifference = nextTargetUser.xp - selectedCurrentUser.xp;
      insights.push(`Only ${xpDifference.toLocaleString()} XP to overtake Rank #${nextTargetUser.rank} (@${nextTargetUser.username}).`);
    } else if (selectedCurrentUser.rank === 1) {
      insights.push('🏆 Crown Champion: You are holding the Rank #1 spot. Stay active to defend your title!');
    }

    if (selectedCurrentUser.streak >= 7) {
      insights.push(`Strong Momentum: You have maintained a solid ${selectedCurrentUser.streak}-day streak!`);
    } else {
      insights.push('Consistency check: Log a focus session today to build up your streak multiplier.');
    }

    // Benchmark ranking
    const pct = Math.round((1 - selectedCurrentUser.rank / Math.max(1, filteredList.length)) * 100);
    if (pct > 50) {
      insights.push(`Outperforming ${pct}% of active competitors in this cohort.`);
    }

    return insights;
  };

  return (
    <div className="h-full overflow-y-auto bg-zinc-950 px-6 py-10 md:px-12 lg:px-20 text-zinc-100 scrollbar-thin select-none">
      
      {/* 1. Premium Competitive Hero Section */}
      <div className="max-w-6xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-zinc-900 pb-8 relative">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-violet-650/15 border border-violet-500/25 text-violet-400 rounded-2xl">
              <Trophy className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                Competitive Standings
              </h1>
              <p className="text-zinc-500 text-xs">
                Climb visual leagues, beat your buddies, and win cycle titles.
              </p>
            </div>
          </div>
        </div>

        {/* Action toolbar controls */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex bg-zinc-900/30 border border-zinc-800 rounded-xl p-3 text-xs gap-6 backdrop-blur-sm">
            <div>
              <span className="text-[9px] font-bold text-zinc-550 block uppercase tracking-wider">competitors</span>
              <span className="text-sm font-black text-zinc-300 block mt-0.5">{activeCompetitors} active</span>
            </div>
            <div className="border-l border-zinc-850" />
            <div>
              <span className="text-[9px] font-bold text-zinc-550 block uppercase tracking-wider">XP Pool</span>
              <span className="text-sm font-black text-violet-400 block mt-0.5">{totalXP.toLocaleString()} XP</span>
            </div>
          </div>

          <button
            onClick={handleRecalculate}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-300 transition cursor-pointer disabled:opacity-50 h-[46px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Recalculate
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Player Card Dashboard & Cycles */}
        <div className="lg:col-span-4 space-y-6">
          {/* Upgrade User Dashboard Card */}
          <div className="bg-gradient-to-b from-zinc-900/40 via-zinc-950/20 to-zinc-950/80 border border-zinc-850/70 p-6 rounded-3xl space-y-5 shadow-xl relative overflow-hidden group">
            {/* Glowing background halo */}
            <div className="absolute -inset-1 bg-gradient-to-r from-violet-650 to-pink-500 opacity-5 blur-xl group-hover:opacity-10 transition duration-300 pointer-events-none" />

            <div className="flex items-center gap-4 relative">
              {/* Animated level avatar ring */}
              <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0">
                <div className="w-full h-full rounded-full bg-zinc-950 overflow-hidden border border-zinc-950 p-0.5">
                  {profile?.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 font-bold text-lg">
                      {profile?.firstName?.charAt(0) || 'L'}
                    </div>
                  )}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-extrabold text-zinc-200 block truncate leading-tight">
                    {profile?.displayName || profile?.firstName}
                  </span>
                  <span className="text-[8px] font-black bg-violet-650/10 border border-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                    Lvl {selectedCurrentUser?.level || profile?.level || 1}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-550 block mt-0.5 truncate">
                  @{profile?.username || 'learner'}
                </span>
              </div>
            </div>

            <hr className="border-zinc-900" />

            {/* Placement stats */}
            <div className="space-y-3">
              <span className="text-[9px] font-extrabold text-zinc-550 uppercase tracking-wider block">Competitive Standings</span>
              <div className="grid grid-cols-2 gap-3.5">
                <div className="bg-zinc-950/60 border border-zinc-900 p-3 rounded-2xl">
                  <span className="text-[9px] font-bold text-zinc-500 block">Weekly Rank</span>
                  <span className="text-lg font-black text-zinc-200 mt-1 block">
                    {selectedCurrentUser?.rank && selectedCurrentUser.rank > 0 ? `#${selectedCurrentUser.rank}` : 'Unranked'}
                  </span>
                </div>
                <div className="bg-zinc-950/60 border border-zinc-900 p-3 rounded-2xl">
                  <span className="text-[9px] font-bold text-zinc-500 block">Division</span>
                  <span className={`text-xs mt-1 block uppercase tracking-wider font-extrabold ${getDivisionByRank(selectedCurrentUser?.rank || 0).text}`}>
                    {getDivisionByRank(selectedCurrentUser?.rank || 0).name}
                  </span>
                </div>
                <div className="bg-zinc-950/60 border border-zinc-900 p-3 rounded-2xl">
                  <span className="text-[9px] font-bold text-zinc-500 block">Streak</span>
                  <span className="text-lg font-black text-orange-500 mt-1 block flex items-center gap-1">
                    {selectedCurrentUser?.streak || 0}d <Flame className="w-4 h-4 text-orange-500" />
                  </span>
                </div>
                <div className="bg-zinc-950/60 border border-zinc-900 p-3 rounded-2xl">
                  <span className="text-[9px] font-bold text-zinc-500 block">Focus Hours</span>
                  <span className="text-lg font-black text-emerald-400 mt-1 block">
                    {selectedCurrentUser?.studyHours.toFixed(1) || '0.0'}h
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Insights Card */}
          <div className="bg-zinc-900/30 border border-zinc-850/60 p-5 rounded-3xl space-y-4">
            <span className="text-[9px] font-extrabold text-zinc-550 uppercase tracking-wider block">AI Arena Insights</span>
            <div className="space-y-3">
              {getAIInsights().map((insight, idx) => (
                <div key={idx} className="flex gap-2.5 items-start text-xs text-zinc-400 leading-relaxed bg-zinc-950/40 p-3 rounded-xl border border-zinc-900">
                  <Sparkles className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                  <span>{insight}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Reset countdown timers */}
          <div className="bg-zinc-900/30 border border-zinc-850/60 p-5 rounded-3xl space-y-4">
            <span className="text-[9px] font-extrabold text-zinc-550 uppercase tracking-wider block">Cohort Reset Timers</span>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400">Weekly Standing:</span>
                  <span className="font-mono text-violet-400 font-bold">{formatCountdown(weeklyCountdown)}</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                  <div className="bg-violet-600 h-full w-[65%] rounded-full" />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400">Monthly Cycle:</span>
                  <span className="font-mono text-violet-400 font-bold">{formatCountdown(monthlyCountdown)}</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                  <div className="bg-violet-600 h-full w-[40%] rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Tab navigation & Podium & Standings list */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Sub Navigation Tabs */}
          <div className="flex border-b border-zinc-900 overflow-x-auto gap-2 scrollbar-none">
            {[
              { id: 'weekly', label: 'Weekly Cohort', icon: Trophy },
              { id: 'monthly', label: 'Monthly Cycle', icon: Calendar },
              { id: 'friends', label: 'Buddies Arena', icon: Users },
              { id: 'subjects', label: 'Subject Tracks', icon: BookOpen },
              { id: 'champions', label: 'Hall of Fame', icon: Award }
            ].map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setSearchQuery('');
                  }}
                  className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    active ? 'border-violet-500 text-zinc-200' : 'border-transparent text-zinc-550 hover:text-zinc-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Inline filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            {activeTab !== 'champions' && (
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-650 absolute left-3 top-3.5" />
                <input
                  type="text"
                  placeholder="Search competitor..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-zinc-900/30 border border-zinc-850 rounded-xl text-xs text-zinc-250 placeholder-zinc-650 focus:outline-none focus:border-violet-500 transition duration-300"
                />
              </div>
            )}

            {activeTab === 'friends' && (
              <div className="flex bg-zinc-950 border border-zinc-850 p-1 rounded-xl gap-1 shrink-0">
                {['weekly', 'monthly', 'alltime'].map(p => (
                  <button
                    key={p}
                    onClick={() => setFriendsPeriod(p as any)}
                    className={`px-3 py-1.5 text-[9px] font-black rounded-lg uppercase tracking-wider transition cursor-pointer ${
                      friendsPeriod === p ? 'bg-zinc-900 text-zinc-200' : 'text-zinc-600 hover:text-zinc-300'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'subjects' && (
              <select
                value={selectedSubject}
                onChange={e => setSelectedSubject(e.target.value)}
                className="px-3.5 py-2.5 bg-zinc-900/40 border border-zinc-850 rounded-xl text-xs font-bold text-zinc-300 focus:outline-none focus:border-violet-500 cursor-pointer"
              >
                {SUBJECTS.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            )}
          </div>

          {/* 2. Elite Top 3 Podium Winners Grid (🥇 Center, 🥈 Left, 🥉 Right) */}
          {activeTab !== 'champions' && filteredList.length > 0 && !loading && (
            <div className="bg-gradient-to-b from-zinc-900/25 via-zinc-950/10 to-zinc-950/80 border border-zinc-900 rounded-3xl p-6 md:p-8">
              <div className="text-center mb-6">
                <span className="text-[9px] font-extrabold bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Top 3 Podium
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-end justify-center gap-6 sm:gap-4 md:gap-8 pt-4 overflow-x-auto sm:overflow-visible">
                
                {/* 🥈 Second Place (Left Column) */}
                {podiumWinners[1] ? (
                  <div className="flex flex-col items-center w-full sm:w-1/3 min-w-[150px] md:min-w-[170px] order-2 sm:order-1 space-y-3">
                    <div className="relative group">
                      <div className="absolute inset-0 bg-zinc-300/10 blur-xl rounded-full" />
                      <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-zinc-400 to-zinc-600 flex items-center justify-center relative">
                        <div className="w-full h-full rounded-full bg-zinc-950 p-0.5">
                          <img src={podiumWinners[1].avatarUrl || '/placeholder.png'} alt="2nd" className="w-full h-full object-cover rounded-full" />
                        </div>
                        <span className="absolute -top-2 -right-2 text-xl">🥈</span>
                      </div>
                    </div>
                    <div className="text-center space-y-1">
                      <span className="text-xs font-extrabold text-zinc-200 block truncate max-w-[120px] mx-auto">
                        {podiumWinners[1].displayName || podiumWinners[1].username}
                      </span>
                      <span className="text-[10px] text-zinc-500 block">Lvl {podiumWinners[1].level}</span>
                      <span className="text-xs font-black text-zinc-400 block mt-1">{podiumWinners[1].xp.toLocaleString()} XP</span>
                    </div>
                    {/* Podium pillar */}
                    <div className="w-full h-12 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl flex items-center justify-center text-xs font-bold text-zinc-500">
                      2nd Place
                    </div>
                  </div>
                ) : (
                  <div className="w-full sm:w-1/3 min-w-[150px] md:min-w-[170px] order-2 sm:order-1 h-32 border border-dashed border-zinc-900 rounded-2xl flex items-center justify-center text-[10px] text-zinc-650">Empty</div>
                )}

                {/* 🥇 First Place (Center Column) */}
                {podiumWinners[0] ? (
                  <div className="flex flex-col items-center w-full sm:w-1/3 min-w-[160px] md:min-w-[180px] order-1 sm:order-2 space-y-3 -translate-y-4">
                    <div className="relative group">
                      <div className="absolute inset-0 bg-yellow-500/20 blur-2xl rounded-full" />
                      {/* Floating glow animation */}
                      <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-yellow-400 via-amber-500 to-yellow-300 flex items-center justify-center relative shadow-[0_0_20px_rgba(245,158,11,0.25)]">
                        <div className="w-full h-full rounded-full bg-zinc-950 p-0.5">
                          <img src={podiumWinners[0].avatarUrl || '/placeholder.png'} alt="1st" className="w-full h-full object-cover rounded-full" />
                        </div>
                        <span className="absolute -top-3 -right-2 text-2xl animate-bounce" style={{ animationDuration: '2s' }}>🥇</span>
                      </div>
                    </div>
                    <div className="text-center space-y-1">
                      <span className="text-sm font-extrabold text-zinc-100 block truncate max-w-[140px] mx-auto">
                        {podiumWinners[0].displayName || podiumWinners[0].username}
                      </span>
                      <span className="text-[10px] text-zinc-500 block">Lvl {podiumWinners[0].level}</span>
                      <span className="text-sm font-black text-yellow-400 block mt-1">{podiumWinners[0].xp.toLocaleString()} XP</span>
                    </div>
                    {/* Podium pillar */}
                    <div className="w-full h-20 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex flex-col items-center justify-center text-xs font-bold text-yellow-400 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                      <span>CHAMPION</span>
                      <span className="text-[9px] text-yellow-500/60 font-medium">1st Place</span>
                    </div>
                  </div>
                ) : (
                  <div className="w-full sm:w-1/3 min-w-[160px] md:min-w-[180px] order-1 sm:order-2 h-40 border border-dashed border-zinc-900 rounded-2xl flex items-center justify-center text-[10px] text-zinc-650">Empty</div>
                )}

                {/* 🥉 Third Place (Right Column) */}
                {podiumWinners[2] ? (
                  <div className="flex flex-col items-center w-full sm:w-1/3 min-w-[150px] md:min-w-[170px] order-3 space-y-3">
                    <div className="relative group">
                      <div className="absolute inset-0 bg-orange-700/10 blur-xl rounded-full" />
                      <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-orange-400 to-orange-700 flex items-center justify-center relative">
                        <div className="w-full h-full rounded-full bg-zinc-950 p-0.5">
                          <img src={podiumWinners[2].avatarUrl || '/placeholder.png'} alt="3rd" className="w-full h-full object-cover rounded-full" />
                        </div>
                        <span className="absolute -top-2 -right-2 text-xl">🥉</span>
                      </div>
                    </div>
                    <div className="text-center space-y-1">
                      <span className="text-xs font-extrabold text-zinc-200 block truncate max-w-[120px] mx-auto">
                        {podiumWinners[2].displayName || podiumWinners[2].username}
                      </span>
                      <span className="text-[10px] text-zinc-500 block">Lvl {podiumWinners[2].level}</span>
                      <span className="text-xs font-black text-orange-400 block mt-1">{podiumWinners[2].xp.toLocaleString()} XP</span>
                    </div>
                    {/* Podium pillar */}
                    <div className="w-full h-10 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl flex items-center justify-center text-xs font-bold text-zinc-500">
                      3rd Place
                    </div>
                  </div>
                ) : (
                  <div className="w-full sm:w-1/3 min-w-[150px] md:min-w-[170px] order-3 h-32 border border-dashed border-zinc-900 rounded-2xl flex items-center justify-center text-[10px] text-zinc-650">Empty</div>
                )}

              </div>
            </div>
          )}

          {/* 3. Standings Leaderboard list */}
          <div className="space-y-2.5">
            {loading ? (
              // Shimmer Skeletons loading
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-16 w-full bg-zinc-900/40 border border-zinc-900 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : activeTab === 'champions' ? (
              <div className="space-y-3">
                {championsList.length === 0 ? (
                  <div className="py-16 text-center text-zinc-650 text-xs border border-dashed border-zinc-900 rounded-3xl p-8 bg-zinc-950/20">
                    No cycle champions recorded yet. Finish first in the weekly standing to get archived here!
                  </div>
                ) : (
                  championsList.map(ch => (
                    <div 
                      key={ch.id} 
                      className="bg-zinc-900/25 border border-zinc-850/60 p-4 rounded-3xl flex items-center justify-between gap-4 animate-fade-in hover:border-zinc-700/50 transition-all duration-300"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-650/10 border border-violet-500/20 flex items-center justify-center text-violet-400 overflow-hidden shrink-0">
                          {ch.avatarUrl ? (
                            <img src={ch.avatarUrl} alt="Champion Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <MedalIcon className="w-5 h-5 text-emerald-400" />
                          )}
                        </div>
                        <div className="text-left">
                          <span className="text-xs font-bold text-zinc-200 block">@{ch.username}</span>
                          <span className="text-[10px] text-zinc-550 block mt-0.5">
                            {ch.type === 'WEEKLY' ? 'Weekly Champion' : 'Monthly Champion'} • Period: {ch.period}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <span className="text-xs font-bold text-violet-400 block">+{ch.xp} XP</span>
                          <span className="text-[10px] text-zinc-500 block mt-0.5">{ch.studyHours.toFixed(1)} hrs focused</span>
                        </div>
                        <div className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                          <Trophy className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : filteredList.length === 0 ? (
              <div className="py-16 text-center text-zinc-650 text-xs border border-dashed border-zinc-900 rounded-3xl p-8 bg-zinc-950/20">
                No students match the search filter.
              </div>
            ) : (
              <div className="space-y-3">
                {/* Renders full list including podium values in row formatting if needed, but here we render remaining listStandings if we showed podium */}
                {filteredList.map((user, index) => {
                  const isTop3 = index < 3;
                  const rankIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;
                  const isSelf = user.userId === profile?.userId;
                  const league = getDivisionByRank(index + 1);

                  return (
                    <div 
                      key={user.userId}
                      className={`group p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between gap-4 hover:shadow-lg relative overflow-hidden ${
                        isSelf 
                          ? 'border-violet-500/40 bg-violet-650/5 shadow-[0_0_15px_rgba(139,92,246,0.1)]' 
                          : `${league.border} ${league.bg}`
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Rank placement */}
                        <div className="w-8 text-center text-xs font-black text-zinc-500 shrink-0">
                          {rankIcon || `#${index + 1}`}
                        </div>

                        {/* Avatar container with dynamic level ring border */}
                        <div className={`w-9 h-9 rounded-full p-0.5 flex items-center justify-center overflow-hidden shrink-0 ${isSelf ? 'bg-gradient-to-tr from-violet-500 to-fuchsia-500' : 'bg-zinc-800'}`}>
                          <div className="w-full h-full rounded-full bg-zinc-950 p-0.5 overflow-hidden">
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                            ) : (
                              <GraduationCap className="w-4 h-4 text-violet-400" />
                            )}
                          </div>
                        </div>

                        {/* User Metadata */}
                        <div className="text-left min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-extrabold text-zinc-200 block truncate max-w-[120px]">
                              {user.displayName || user.username}
                            </span>
                            <span className="text-[8px] font-black bg-zinc-850 border border-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                              Lvl {user.level}
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-550 block truncate mt-0.5">
                            @{user.username}
                          </span>
                        </div>
                      </div>

                      {/* Rank Movement Indicator, League Tag and XP */}
                      <div className="flex items-center gap-5 shrink-0">
                        {/* League Tag */}
                        <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wider shrink-0 hidden sm:inline-block ${league.bg} ${league.border} ${league.text}`}>
                          {league.name}
                        </span>

                        {/* Rank movement indicators */}
                        {user.rankChange && (
                          <div className="w-12 flex justify-center items-center shrink-0">
                            {user.rankChange.includes('▲') ? (
                              <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5">
                                <ChevronUp className="w-3.5 h-3.5" /> {user.rankChange.replace('▲', '')}
                              </span>
                            ) : user.rankChange.includes('▼') ? (
                              <span className="text-[10px] font-bold text-red-400 flex items-center gap-0.5">
                                <ChevronDown className="w-3.5 h-3.5" /> {user.rankChange.replace('▼', '')}
                              </span>
                            ) : user.rankChange === 'New' ? (
                              <span className="text-[9px] font-extrabold text-violet-400 uppercase tracking-wide">
                                NEW
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold text-zinc-650 flex items-center justify-center">
                                <Minus className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>
                        )}

                        {/* XP and focus hours */}
                        <div className="text-right w-20 shrink-0">
                          <span className="text-xs font-black text-violet-400 block">
                            {user.xp.toLocaleString()} XP
                          </span>
                          <span className="text-[10px] text-zinc-550 block mt-0.5">
                            {user.studyHours.toFixed(1)}h focus
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
