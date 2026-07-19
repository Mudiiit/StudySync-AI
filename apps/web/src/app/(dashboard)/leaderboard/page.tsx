'use client';

import React, { useState, useEffect, useMemo } from 'react';
import leaderboardService, { LeaderboardUser, ChampionRecord } from '@/services/leaderboard';
import profileService, { UserProfile } from '@/services/profile';
import { useToast } from '@/components/providers/ToastProvider';
import { 
  Trophy, Award, Calendar, Search, Users, BookOpen, Clock, 
  Sparkles, RefreshCw, Flame, ChevronRight, GraduationCap, ShieldAlert 
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

  // Load basic dataset
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Fetch Profile
      const prof = await profileService.getMyProfile();
      setProfile(prof);

      // Fetch weekly
      const weekly = await leaderboardService.getWeekly();
      setWeeklyList(weekly.list);
      setCurrentUserWeekly(weekly.currentUser);
      setWeeklyCountdown(weekly.countdownSeconds);

      // Fetch monthly
      const monthly = await leaderboardService.getMonthly();
      setMonthlyList(monthly.list);
      setCurrentUserMonthly(monthly.currentUser);
      setMonthlyCountdown(monthly.countdownSeconds);

      // Fetch friends
      const friends = await leaderboardService.getFriends(friendsPeriod);
      setFriendsList(friends);

      // Fetch subjects
      const subRes = await leaderboardService.getSubject(selectedSubject);
      setSubjectList(subRes);

      // Fetch champions
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

  // Update friends leaderboard when sub-tab changes
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

  // Update subject list when selected subject changes
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

  // Real-time recalculation
  const handleRecalculate = async () => {
    try {
      setIsRefreshing(true);
      await leaderboardService.recalculate();
      await loadData();
      showToast('Ranks updated and calculated successfully', 'success');
    } catch (err) {
      showToast('Failed to compute rankings', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Timer countdown hook
  useEffect(() => {
    const timer = setInterval(() => {
      setWeeklyCountdown(prev => Math.max(0, prev - 1));
      setMonthlyCountdown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format countdown string helper
  const formatCountdown = (seconds: number) => {
    if (seconds <= 0) return '0d 0h 0m';
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const mins = Math.floor((seconds % (60 * 60)) / 60);
    return `${days}d ${hours}h ${mins}m`;
  };

  // Determine active lists based on tab choice
  const activeList = useMemo(() => {
    switch (activeTab) {
      case 'weekly':
        return weeklyList;
      case 'monthly':
        return monthlyList;
      case 'friends':
        return friendsList;
      case 'subjects':
        return subjectList;
      default:
        return [];
    }
  }, [activeTab, weeklyList, monthlyList, friendsList, subjectList]);

  // Filter list by live user search
  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return activeList;
    return activeList.filter(item => 
      item.username?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [activeList, searchQuery]);

  return (
    <div className="h-full overflow-y-auto bg-zinc-950 px-6 py-8 md:px-10 lg:px-16 animate-fadeIn">
      
      {/* Header section */}
      <div className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-violet-400" />
            Competitive Standings
          </h1>
          <p className="text-zinc-500 text-xs mt-1">
            Healthy weekly and monthly cohorts to keep your study streak consistent.
          </p>
        </div>
        
        <button
          onClick={handleRecalculate}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-300 transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Recalculate
        </button>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Profile Summary card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-zinc-900/30 border border-zinc-850/60 p-5 rounded-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-violet-650/10 border border-violet-500/25 flex items-center justify-center text-violet-400 overflow-hidden">
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <Trophy className="w-6 h-6" />
                )}
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-400 block leading-tight">
                  {profile?.displayName || profile?.firstName}
                </span>
                <span className="text-[10px] text-zinc-500 block mt-0.5">
                  @{profile?.username || 'learner'}
                </span>
              </div>
            </div>

            <hr className="border-zinc-850/40" />

            <div className="space-y-3">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Your Placement</span>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-950/40 border border-zinc-850/70 p-3 rounded-xl">
                  <span className="text-[9px] font-bold text-zinc-500 block">Weekly Rank</span>
                  <span className="text-lg font-extrabold text-zinc-200 mt-1 block">
                    {profile?.weeklyRank && profile.weeklyRank > 0 ? `#${profile.weeklyRank}` : 'Unranked'}
                  </span>
                </div>
                <div className="bg-zinc-950/40 border border-zinc-850/70 p-3 rounded-xl">
                  <span className="text-[9px] font-bold text-zinc-500 block">Monthly Rank</span>
                  <span className="text-lg font-extrabold text-zinc-200 mt-1 block">
                    {profile?.monthlyRank && profile.monthlyRank > 0 ? `#${profile.monthlyRank}` : 'Unranked'}
                  </span>
                </div>
                <div className="bg-zinc-950/40 border border-zinc-850/70 p-3 rounded-xl">
                  <span className="text-[9px] font-bold text-zinc-500 block">Best Rank Ever</span>
                  <span className="text-lg font-extrabold text-violet-400 mt-1 block">
                    {profile?.bestRankEver && profile.bestRankEver > 0 ? `#${profile.bestRankEver}` : 'New'}
                  </span>
                </div>
                <div className="bg-zinc-950/40 border border-zinc-850/70 p-3 rounded-xl">
                  <span className="text-[9px] font-bold text-zinc-500 block">Hall of Wins</span>
                  <span className="text-lg font-extrabold text-emerald-400 mt-1 block">
                    {profile?.winsCount || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Time Reset Counter panel */}
          <div className="bg-zinc-900/30 border border-zinc-850/60 p-5 rounded-2xl space-y-3">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Cohort End Cycles</span>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">Weekly Reset:</span>
                <span className="font-mono text-violet-400 font-bold">{formatCountdown(weeklyCountdown)}</span>
              </div>
              <div className="w-full h-1 bg-zinc-950 rounded-full overflow-hidden">
                <div className="bg-violet-600 h-full w-[65%] rounded-full" />
              </div>
              
              <div className="flex justify-between items-center text-xs pt-1">
                <span className="text-zinc-400">Monthly Reset:</span>
                <span className="font-mono text-violet-400 font-bold">{formatCountdown(monthlyCountdown)}</span>
              </div>
              <div className="w-full h-1 bg-zinc-950 rounded-full overflow-hidden">
                <div className="bg-violet-600 h-full w-[45%] rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Tab lists */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Tabs Navigation */}
          <div className="flex border-b border-zinc-850/60 overflow-x-auto gap-2">
            {[
              { id: 'weekly', label: 'Weekly', icon: Trophy },
              { id: 'monthly', label: 'Monthly', icon: Calendar },
              { id: 'friends', label: 'Buddies', icon: Users },
              { id: 'subjects', label: 'Subjects', icon: BookOpen },
              { id: 'champions', label: 'Hall of Fame', icon: Award }
            ].map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-4 py-3 border-b-2 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    active ? 'border-violet-500 text-zinc-200' : 'border-transparent text-zinc-550 hover:text-zinc-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Filters & Options bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            {activeTab !== 'champions' && (
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-650 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Filter users..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-zinc-900/30 border border-zinc-850 rounded-xl text-xs text-zinc-250 placeholder-zinc-650 focus:outline-none focus:border-violet-500 transition"
                />
              </div>
            )}

            {activeTab === 'friends' && (
              <div className="flex bg-zinc-950 border border-zinc-850 rounded-xl p-1 gap-1">
                {['weekly', 'monthly', 'alltime'].map(p => (
                  <button
                    key={p}
                    onClick={() => setFriendsPeriod(p as any)}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-wider transition cursor-pointer ${
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
                className="px-3.5 py-2.5 bg-zinc-900/40 border border-zinc-850 rounded-xl text-xs font-bold text-zinc-300 focus:outline-none focus:border-violet-500"
              >
                {SUBJECTS.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            )}
          </div>

          {/* Standings list */}
          <div className="space-y-2">
            {loading ? (
              <div className="py-20 text-center text-zinc-550 text-xs flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-violet-500" />
                Retrieving cohort scores...
              </div>
            ) : activeTab === 'champions' ? (
              <div className="space-y-3">
                {championsList.length === 0 ? (
                  <div className="py-16 text-center text-zinc-650 text-xs border border-dashed border-zinc-850 rounded-2xl">
                    No cycle champions recorded yet. Finish first in the weekly standing to get archived here!
                  </div>
                ) : (
                  championsList.map(ch => (
                    <div 
                      key={ch.id} 
                      className="bg-zinc-900/25 border border-zinc-850/60 p-4 rounded-2xl flex items-center justify-between gap-4 animate-fade-in"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-650/10 border border-violet-500/20 flex items-center justify-center text-violet-400 overflow-hidden shrink-0">
                          {ch.avatarUrl ? (
                            <img src={ch.avatarUrl} alt="Champion Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <Award className="w-5 h-5 text-emerald-400" />
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
              <div className="py-16 text-center text-zinc-650 text-xs border border-dashed border-zinc-850 rounded-2xl">
                No students match the search filter.
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredList.map((user, index) => {
                  const isTop3 = index < 3;
                  const rankIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;
                  
                  return (
                    <div 
                      key={user.userId}
                      className={`bg-zinc-905/30 border p-3.5 rounded-2xl flex items-center justify-between gap-4 transition hover:bg-zinc-900/20 ${
                        isTop3 
                          ? 'border-violet-500/20 bg-violet-650/5' 
                          : user.userId === profile?.userId 
                            ? 'border-violet-500/30 bg-violet-500/5'
                            : 'border-zinc-850/65'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Rank placement */}
                        <div className="w-7 text-center text-xs font-black text-zinc-500 shrink-0">
                          {rankIcon || `#${index + 1}`}
                        </div>

                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <GraduationCap className="w-4 h-4 text-violet-400" />
                          )}
                        </div>

                        {/* Text */}
                        <div className="text-left">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-zinc-200 block truncate max-w-[120px]">
                              {user.displayName || user.username}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-zinc-850 border border-zinc-800 text-zinc-500 font-extrabold shrink-0">
                              Lvl {user.level}
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-500 block truncate mt-0.5">
                            @{user.username}
                          </span>
                        </div>
                      </div>

                      {/* Rank changes & XP Stats details */}
                      <div className="flex items-center gap-6">
                        {/* Rank change indicator */}
                        {user.rankChange && (
                          <span className={`text-[10px] font-bold shrink-0 block w-10 text-center ${
                            user.rankChange.includes('▲') 
                              ? 'text-emerald-400' 
                              : user.rankChange.includes('▼') 
                                ? 'text-red-400' 
                                : user.rankChange === 'New' 
                                  ? 'text-violet-400' 
                                  : 'text-zinc-600'
                          }`}>
                            {user.rankChange}
                          </span>
                        )}

                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-violet-400 block">
                            {(user.xp || 0).toLocaleString()} XP
                          </span>
                          <span className="text-[10px] text-zinc-500 block mt-0.5">
                            {(user.studyHours || 0).toFixed(1)}h focus
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
