'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  User, Shield, Sparkles, Image as ImageIcon, Check, Loader2, AlertCircle, 
  Calendar, MapPin, Eye, Lock, Globe, MessageSquare, Trophy, Flame, 
  BookOpen, Brain, Clock, Upload, Target, Award, Activity, History, 
  Compass, Heart, Share2, Search, Briefcase, GraduationCap, TrendingUp,
  Settings, LogOut
} from 'lucide-react';
import profileService, { UserProfile } from '@/services/profile';
import achievementsService, { UserAchievement } from '@/services/achievements';
import xpService, { XpLog, XpStatistics } from '@/services/xp';
import { useToast } from '@/components/providers/ToastProvider';
import AvatarPicker from '@/components/profile/AvatarPicker';
import { motion, AnimatePresence } from 'framer-motion';
import { BADGE_ASSETS, Streak7Badge } from '@/components/achievements/badge-assets';

type TabType = 'overview' | 'analytics' | 'social' | 'customize' | 'identity' | 'privacy';

interface CustomizationSettings {
  accentColor: string;
  bannerStyle: string;
  avatarFrame: string;
  learningTitle: string;
  statusMessage: string;
  university: string;
  course: string;
  department: string;
  favoriteSubjects: string[];
  learningInterests: string[];
}

export default function ProfilePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
  const usernameParam = searchParams?.get('u');
  const initialTab = searchParams?.get('tab') as TabType || 'overview';

  // Core Data States
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [xpStats, setXpStats] = useState<XpStatistics | null>(null);
  const [xpLogs, setXpLogs] = useState<XpLog[]>([]);

  // Local Customization States (Persisted in LocalStorage)
  const [accentColor, setAccentColor] = useState('violet');
  const [bannerStyle, setBannerStyle] = useState('deep-space');
  const [avatarFrame, setAvatarFrame] = useState('none');
  const [statusMessage, setStatusMessage] = useState('');
  const [learningTitle, setLearningTitle] = useState('Knowledge Explorer');
  const [university, setUniversity] = useState('Massachusetts Institute of Technology');
  const [course, setCourse] = useState('Computer Science & Engineering');
  const [department, setDepartment] = useState('EECS');
  const [favoriteSubjects, setFavoriteSubjects] = useState<string[]>(['Algorithms', 'Artificial Intelligence', 'Data Science']);
  const [learningInterests, setLearningInterests] = useState<string[]>(['Machine Learning', 'UX Design', 'SaaS Architectures']);

  // Input Form States
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [username, setUsername] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Username validation helper states
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [usernameMessage, setUsernameMessage] = useState('');

  // Privacy configuration states
  const [privacyLevel, setPrivacyLevel] = useState<'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE'>('PUBLIC');
  const [showStudyHours, setShowStudyHours] = useState(true);
  const [showStreak, setShowStreak] = useState(true);
  const [showBadges, setShowBadges] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  const [showAchievements, setShowAchievements] = useState(true);

  // Load customizations from LocalStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('studysync_profile_customization');
      if (stored) {
        const parsed = JSON.parse(stored) as CustomizationSettings;
        if (parsed.accentColor) setAccentColor(parsed.accentColor);
        if (parsed.bannerStyle) setBannerStyle(parsed.bannerStyle);
        if (parsed.avatarFrame) setAvatarFrame(parsed.avatarFrame);
        if (parsed.learningTitle) setLearningTitle(parsed.learningTitle);
        if (parsed.statusMessage) setStatusMessage(parsed.statusMessage);
        if (parsed.university) setUniversity(parsed.university);
        if (parsed.course) setCourse(parsed.course);
        if (parsed.department) setDepartment(parsed.department);
        if (parsed.favoriteSubjects) setFavoriteSubjects(parsed.favoriteSubjects);
        if (parsed.learningInterests) setLearningInterests(parsed.learningInterests);
      }
    } catch (e) {
      console.error('Error loading customization settings:', e);
    }
  }, []);

  // Save customizations to LocalStorage
  const saveCustomization = (updated: Partial<CustomizationSettings>) => {
    try {
      const stored = localStorage.getItem('studysync_profile_customization');
      const current = stored ? JSON.parse(stored) : {};
      const newSettings = {
        accentColor, bannerStyle, avatarFrame, learningTitle, statusMessage,
        university, course, department, favoriteSubjects, learningInterests,
        ...current, ...updated
      };
      localStorage.setItem('studysync_profile_customization', JSON.stringify(newSettings));
    } catch (e) {
      console.error('Error saving customization settings:', e);
    }
  };

  const fetchProfile = async () => {
    setLoading(true);
    try {
      let data: UserProfile;
      if (usernameParam) {
        data = await profileService.getProfile(usernameParam);
      } else {
        data = await profileService.getMyProfile();
      }
      setProfile(data);

      // Pre-populate states if owner
      setDisplayName(data.displayName || `${data.firstName} ${data.lastName}`);
      setBio(data.bio || '');
      setTimezone(data.timezone);
      setUsername(data.username || '');
      setPrivacyLevel(data.privacyLevel);
      setShowStudyHours(data.showStudyHours);
      setShowStreak(data.showStreak);
      setShowBadges(data.showBadges);
      setShowNotes(data.showNotes);
      setShowAchievements(data.showAchievements);

      // Fetch achievements for statistics summary
      try {
        const achs = await achievementsService.getAchievements();
        setAchievements(achs);
      } catch (err) {
        console.error('Failed to load achievements in profile:', err);
      }

      // Fetch XP stats & timeline
      try {
        const [statsData, logsData] = await Promise.all([
          xpService.getXpStatistics(),
          xpService.getXpTimeline(),
        ]);
        setXpStats(statsData);
        setXpLogs(logsData);
      } catch (err) {
        console.error('Failed to load XP stats and logs in profile:', err);
      }
    } catch (e: any) {
      console.error('Failed to fetch profile:', e);
      showToast(e.response?.data?.message || 'Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [usernameParam]);

  // Sync tab change from query param
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Username live-availability checker
  useEffect(() => {
    if (!username || username === profile?.username) {
      setUsernameStatus('idle');
      setUsernameMessage('');
      return;
    }

    const cleanName = username.trim().toLowerCase().replace(/^@/, '');
    const regex = /^[a-z0-9_]+$/;
    if (!regex.test(cleanName)) {
      setUsernameStatus('invalid');
      setUsernameMessage('Lowercase letters, numbers, and underscores only.');
      return;
    }

    setUsernameStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const res = await profileService.checkUsernameAvailability(cleanName);
        if (res.available) {
          setUsernameStatus('available');
          setUsernameMessage('Username is available!');
        } else {
          setUsernameStatus('taken');
          setUsernameMessage(res.reason || 'Username is already taken');
        }
      } catch (err) {
        setUsernameStatus('invalid');
        setUsernameMessage('Check failed');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username, profile?.username]);

  // Profile Form Submissions
  const handleUpdateBasicProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await profileService.updateProfile({ displayName, bio, timezone });
      setProfile(res);
      saveCustomization({ university, course, department, favoriteSubjects, learningInterests });
      showToast('Profile details updated successfully', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Update failed', 'error');
    }
  };

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameStatus !== 'available') return;
    try {
      const res = await profileService.updateUsername(username);
      setProfile(res);
      showToast('Username changed successfully', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update username', 'error');
    }
  };

  const handleUpdatePrivacy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await profileService.updatePrivacy({
        privacyLevel,
        showStudyHours,
        showStreak,
        showBadges,
        showNotes,
        showAchievements,
      });
      setProfile(res);
      showToast('Privacy preferences saved', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to save settings', 'error');
    }
  };

  // Avatar Upload Handlers
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const res = await profileService.uploadAvatar(file);
      setProfile(res);
      showToast('Avatar uploaded successfully', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Avatar upload failed', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectBuiltInAvatar = async (url: string) => {
    try {
      const res = await profileService.selectBuiltInAvatar(url);
      setProfile(res);
      showToast('Built-in avatar applied', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Avatar update failed', 'error');
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-3 text-zinc-550">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          <span className="text-xs font-semibold uppercase tracking-wider">Loading Learning Identity...</span>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-950">
        <div className="text-zinc-600 text-center space-y-2">
          <AlertCircle className="w-10 h-10 mx-auto stroke-[1.5]" />
          <span className="block text-sm font-semibold">Profile not found</span>
        </div>
      </div>
    );
  }

  const isOwner = profile.isOwner;

  // Level Progression Math
  const level = profile.level || 1;
  const xp = profile.xp || 0;
  const currentThreshold = level === 1 ? 0 : 25 * (level - 1) * (level + 2);
  const nextThreshold = 25 * level * (level + 3);
  const totalInLevel = nextThreshold - currentThreshold;
  const earnedInLevel = Math.max(0, xp - currentThreshold);
  const xpPercentage = Math.max(0, Math.min(100, Math.round((earnedInLevel / totalInLevel) * 100)));
  const xpUntilNext = Math.max(0, nextThreshold - xp);

  // Dynamic Theme Styling configurations
  const accentClasses: Record<string, { text: string; border: string; bg: string; ring: string; glow: string }> = {
    violet: { text: 'text-violet-400', border: 'border-violet-500/30', bg: 'bg-violet-650', ring: 'stroke-violet-500', glow: 'shadow-[0_0_20px_rgba(139,92,246,0.3)]' },
    emerald: { text: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-600', ring: 'stroke-emerald-500', glow: 'shadow-[0_0_20px_rgba(16,185,129,0.3)]' },
    sky: { text: 'text-sky-400', border: 'border-sky-500/30', bg: 'bg-sky-500', ring: 'stroke-sky-400', glow: 'shadow-[0_0_20px_rgba(56,189,248,0.3)]' },
    rose: { text: 'text-rose-400', border: 'border-rose-500/30', bg: 'bg-rose-600', ring: 'stroke-rose-500', glow: 'shadow-[0_0_20px_rgba(244,63,94,0.3)]' },
    amber: { text: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500', ring: 'stroke-amber-500', glow: 'shadow-[0_0_20px_rgba(245,158,11,0.3)]' },
    fuchsia: { text: 'text-fuchsia-400', border: 'border-fuchsia-500/30', bg: 'bg-fuchsia-600', ring: 'stroke-fuchsia-500', glow: 'shadow-[0_0_20px_rgba(217,70,239,0.3)]' }
  };

  const currentAccent = accentClasses[accentColor] || accentClasses.violet;

  const bannerClasses: Record<string, string> = {
    dark: 'bg-gradient-to-r from-zinc-900 to-zinc-950',
    sunset: 'bg-gradient-to-r from-orange-600 via-rose-600 to-violet-600',
    aurora: 'bg-gradient-to-r from-teal-500 via-emerald-600 to-indigo-600',
    'deep-space': 'bg-gradient-to-r from-zinc-950 via-violet-950/80 to-zinc-950',
    'neon-glow': 'bg-gradient-to-r from-fuchsia-600 via-violet-600 to-cyan-500'
  };

  const frameClasses: Record<string, string> = {
    none: 'border-2 border-zinc-900',
    'scholar-gold': 'border-2 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.6)]',
    'cyberpunk-neon': 'border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.6)] animate-pulse',
    'amethyst-void': 'border-2 border-fuchsia-500 shadow-[0_0_20px_rgba(217,70,239,0.5)]',
    'emerald-leaf': 'border-2 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
  };

  return (
    <div className="h-full overflow-y-auto bg-zinc-950 text-zinc-100 min-h-screen">
      
      {/* Living Banner */}
      <div className={`w-full h-44 relative overflow-hidden transition-all duration-700 ${bannerClasses[bannerStyle] || bannerClasses['deep-space']}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_60%)]" />
        {/* Particle/Glow Effect */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-zinc-950 to-transparent" />
        
        {/* Premium Profile Actions Overlay */}
        <div className="absolute top-6 right-6 flex gap-2">
          {usernameParam && (
            <button
              onClick={() => router.push('/profile')}
              className="px-4 py-2 bg-zinc-900/80 hover:bg-zinc-800 backdrop-blur-md border border-zinc-800 rounded-xl text-zinc-200 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
            >
              ← My learning identity
            </button>
          )}
          <button 
            onClick={() => showToast('Profile sharing card generated!', 'success')}
            className="p-2.5 bg-zinc-900/80 hover:bg-zinc-800 backdrop-blur-md border border-zinc-800 rounded-xl text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
            title="Share Profile Card"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pb-16 relative z-10 -mt-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT SIDE: HERO IDENTITY SECTION */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Living Hero Card */}
            <div className="bg-zinc-900/90 border border-zinc-850 p-6 rounded-3xl shadow-2xl backdrop-blur-xl relative overflow-hidden text-center flex flex-col items-center">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.03),transparent_40%)]" />
              
              {/* Level XP Ring & Avatar Frame */}
              <div className="relative w-32 h-32 flex items-center justify-center mb-4">
                {/* SVG Progress Ring */}
                <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="44" 
                    className="stroke-zinc-800 fill-none" 
                    strokeWidth="3.5" 
                  />
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="44" 
                    className={`fill-none transition-all duration-1000 ${currentAccent.ring}`} 
                    strokeWidth="3.8" 
                    strokeDasharray="276"
                    strokeDashoffset={276 - (276 * xpPercentage) / 100}
                    strokeLinecap="round"
                  />
                </svg>

                {/* Avatar with selected frame wrapper */}
                <div className={`relative w-24 h-24 rounded-full overflow-hidden bg-zinc-950 flex items-center justify-center ${frameClasses[avatarFrame] || frameClasses.none} transition-all duration-500`}>
                  {profile.avatarUrl ? (
                    <img 
                      src={profile.avatarUrl} 
                      alt="Profile Avatar" 
                      className="w-full h-full object-cover rounded-full" 
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center text-xl font-bold uppercase text-zinc-300">
                      {displayName.charAt(0)}
                    </div>
                  )}
                </div>

                {/* Level badge indicator */}
                <div className="absolute -bottom-1 bg-zinc-950 border border-zinc-800/80 px-2.5 py-0.5 rounded-full text-[10px] font-black text-zinc-100 shadow-md">
                  Lvl {level}
                </div>
              </div>

              {/* Identity Details */}
              <div className="space-y-1.5 w-full">
                <h2 className="text-lg font-black text-zinc-100 tracking-tight flex items-center justify-center gap-1.5">
                  {displayName}
                  <Sparkles className={`w-4 h-4 ${currentAccent.text}`} />
                </h2>
                
                {/* Custom status message preview */}
                {statusMessage ? (
                  <span className="inline-block text-[10px] font-bold text-zinc-400 bg-zinc-950/60 border border-zinc-850 px-3 py-1 rounded-xl">
                    💬 {statusMessage}
                  </span>
                ) : (
                  <span className="text-[10px] text-zinc-500 italic block font-semibold">"Introduce yourself under Identity tab..."</span>
                )}

                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                  <span className="text-[9px] font-black uppercase tracking-wider bg-violet-500/10 border border-violet-500/20 text-violet-400 px-2.5 py-0.5 rounded-md">
                    {learningTitle}
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-wider bg-zinc-850 border border-zinc-800 text-zinc-300 px-2.5 py-0.5 rounded-md">
                    {timezone}
                  </span>
                </div>
              </div>

              {/* Custom Gradients/Accents Ambient Lighting */}
              <div className={`w-36 h-36 rounded-full absolute -right-20 -bottom-20 blur-3xl opacity-20 pointer-events-none ${currentAccent.bg}`} />
            </div>

            {/* Living Learning Gamer Card Stats */}
            <div className="bg-zinc-900/90 border border-zinc-850 p-6 rounded-3xl shadow-2xl space-y-5">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 pb-2.5 border-b border-zinc-850 flex items-center justify-between">
                <span>Learning Identity Credentials</span>
                <Award className={`w-4 h-4 ${currentAccent.text}`} />
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-950/50 border border-zinc-850/60 p-3 rounded-2xl">
                  <span className="text-[9px] font-bold text-zinc-550 block uppercase tracking-wider">Lifetime XP</span>
                  <span className="text-sm font-black text-zinc-200 mt-0.5 block">{(profile.lifetimeXp || xp).toLocaleString()}</span>
                </div>

                <div className="bg-zinc-950/50 border border-zinc-850/60 p-3 rounded-2xl">
                  <span className="text-[9px] font-bold text-zinc-550 block uppercase tracking-wider">Daily Streak</span>
                  <span className="text-sm font-black text-orange-500 mt-0.5 block flex items-center gap-1">
                    <Flame className="w-4 h-4 fill-orange-500" />
                    {profile.stats?.streak || 0} Days
                  </span>
                </div>

                <div className="bg-zinc-950/50 border border-zinc-850/60 p-3 rounded-2xl">
                  <span className="text-[9px] font-bold text-zinc-550 block uppercase tracking-wider">Focus Duration</span>
                  <span className="text-sm font-black text-zinc-200 mt-0.5 block">{profile.stats?.studyHours || 0} Hours</span>
                </div>

                <div className="bg-zinc-950/50 border border-zinc-850/60 p-3 rounded-2xl">
                  <span className="text-[9px] font-bold text-zinc-550 block uppercase tracking-wider">XP to Next Lvl</span>
                  <span className="text-sm font-black text-zinc-200 mt-0.5 block">{xpUntilNext.toLocaleString()}</span>
                </div>

                <div className="bg-zinc-950/50 border border-zinc-850/60 p-3 rounded-2xl">
                  <span className="text-[9px] font-bold text-zinc-550 block uppercase tracking-wider">Quizzes Taken</span>
                  <span className="text-sm font-black text-emerald-400 mt-0.5 block">{profile.stats?.quizzesCompletedCount || 0}</span>
                </div>

                <div className="bg-zinc-950/50 border border-zinc-850/60 p-3 rounded-2xl">
                  <span className="text-[9px] font-bold text-zinc-550 block uppercase tracking-wider">Notes Logged</span>
                  <span className="text-sm font-black text-violet-400 mt-0.5 block">{profile.stats?.notesCount || 0}</span>
                </div>
              </div>

              {/* Progress metrics sliders */}
              <div className="space-y-3.5 pt-3.5 border-t border-zinc-850/60">
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400">
                    <span>Consistency Score</span>
                    <span className={currentAccent.text}>88%</span>
                  </div>
                  <div className="h-1.5 bg-zinc-950 border border-zinc-850 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${currentAccent.bg}`} style={{ width: '88%' }} />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400">
                    <span>AI Productivity Level</span>
                    <span className="text-pink-400">76%</span>
                  </div>
                  <div className="h-1.5 bg-zinc-950 border border-zinc-850 rounded-full overflow-hidden">
                    <div className="h-full bg-pink-500 rounded-full" style={{ width: '76%' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* University & Academic Credentials */}
            <div className="bg-zinc-900/90 border border-zinc-850 p-6 rounded-3xl shadow-2xl space-y-4 text-left">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 pb-2 border-b border-zinc-850 flex items-center gap-1.5">
                <GraduationCap className="w-4.5 h-4.5 text-zinc-400" /> Academic Standing
              </h3>
              
              <div className="space-y-3 text-xs">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-zinc-550 block uppercase">Institution</span>
                  <span className="font-extrabold text-zinc-350">{university}</span>
                </div>
                
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-zinc-550 block uppercase">Course focus</span>
                  <span className="font-extrabold text-zinc-350">{course}</span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-zinc-550 block uppercase">Department</span>
                  <span className="font-extrabold text-zinc-350">{department}</span>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT SIDE: PREMIUM SETTINGS & LIVE PREVIEW TABS */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Unified Nav Tab Selector */}
            <div className="flex overflow-x-auto gap-1 bg-zinc-900/60 p-1 rounded-2xl border border-zinc-850/80 scrollbar-none">
              {[
                { id: 'overview', label: 'Identity Hub', icon: User },
                { id: 'analytics', label: 'Analytics', icon: Activity },
                { id: 'social', label: 'Social & Partner', icon: Compass },
                { id: 'customize', label: 'Customize', icon: ImageIcon },
                { id: 'identity', label: 'Identity Settings', icon: Settings },
                { id: 'privacy', label: 'Privacy', icon: Shield }
              ].map(tab => {
                const IconComp = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as TabType);
                      router.replace(`/profile?tab=${tab.id}`);
                    }}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
                      isSelected 
                        ? 'bg-zinc-800 text-white shadow border border-zinc-700/80' 
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <IconComp className={`w-3.5 h-3.5 ${isSelected ? currentAccent.text : 'text-zinc-500'}`} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Unified Tab Area Panels */}
            <div className="min-h-[500px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  
                  {/* OVERVIEW PANEL */}
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      
                      {/* Top Achievements Spotlight */}
                      <div className="bg-zinc-900/50 border border-zinc-850 p-6 rounded-3xl space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-zinc-850/50">
                          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                            <Trophy className="w-4 h-4 text-amber-400" /> Featured Achievements Showcase
                          </h3>
                          <button
                            onClick={() => router.push('/achievements')}
                            className="text-[10px] font-black text-violet-400 hover:text-violet-300 uppercase tracking-wider"
                          >
                            Explore Gallery →
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {achievements.filter(a => a.unlocked).slice(0, 4).length === 0 ? (
                            <div className="col-span-full py-8 text-center border border-dashed border-zinc-850 rounded-2xl text-xs text-zinc-550 bg-zinc-950/20">
                              Start study sessions to unlock high-tier badges.
                            </div>
                          ) : (
                            achievements.filter(a => a.unlocked).slice(0, 4).map(ach => {
                              const BadgeComp = BADGE_ASSETS[ach.id] || Streak7Badge;
                              return (
                                <div key={ach.id} className="bg-zinc-950/40 border border-zinc-850/60 p-4 rounded-2xl flex flex-col items-center text-center space-y-2 hover:border-violet-500/40 hover:shadow-lg transition">
                                  <BadgeComp size={40} unlocked={true} />
                                  <span className="text-[10px] font-extrabold text-zinc-200 block truncate w-full">{ach.title}</span>
                                  <span className="text-[7.5px] font-black text-violet-400 uppercase tracking-wider bg-violet-500/5 px-2 py-0.5 rounded border border-violet-500/10">
                                    {ach.tier}
                                  </span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* AI Productivity Insights */}
                      <div className="bg-zinc-900/50 border border-zinc-850 p-6 rounded-3xl space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5 pb-2 border-b border-zinc-850/50">
                          <Sparkles className="w-4 h-4 text-violet-400" /> AI Scholar Insights & Recommendations
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-zinc-950/60 border border-zinc-850 p-4 rounded-2xl flex gap-3 text-left">
                            <TrendingUp className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <span className="text-xs font-bold text-zinc-250 block">Focus Consistency High</span>
                              <span className="text-[10px] text-zinc-550 block">Your daily study duration has increased 27% compared to last week. Maintain today's focus to unlock the <b>Focus Master</b> tier!</span>
                            </div>
                          </div>

                          <div className="bg-zinc-950/60 border border-zinc-850 p-4 rounded-2xl flex gap-3 text-left">
                            <Target className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <span className="text-xs font-bold text-zinc-250 block">Level Up Imminent</span>
                              <span className="text-[10px] text-zinc-550 block">You are only <b>{xpUntilNext.toLocaleString()} XP</b> away from Level {level + 1}. complete a quick practice quiz to level up.</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Learning Journey Timeline */}
                      <div className="bg-zinc-900/50 border border-zinc-850 p-6 rounded-3xl space-y-5 text-left">
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5 pb-2 border-b border-zinc-850/50">
                          <History className="w-4.5 h-4.5 text-pink-400" /> Learning Timeline Journey
                        </h3>

                        <div className="relative border-l border-zinc-850 pl-5 ml-2.5 space-y-6">
                          {[
                            { title: 'Joined StudySync AI Workspace', desc: 'Initialized learning metrics tracking', date: 'Jul 01, 2026', color: 'bg-blue-400' },
                            { title: 'Completed First Practice Quiz', desc: 'Scored 90% in Computer Systems quiz', date: 'Jul 06, 2026', color: 'bg-emerald-400' },
                            { title: 'Unlocked Streak Master Badge', desc: 'Achieved 7 consecutive study days', date: 'Jul 13, 2026', color: 'bg-amber-400' },
                            { title: 'Reached Diamond League Arena', desc: 'Earned 3,500 weekly XP points', date: 'Yesterday', color: 'bg-violet-400' }
                          ].map((item, idx) => (
                            <div key={idx} className="relative text-xs">
                              <div className={`absolute -left-[26px] top-1 w-3 h-3 rounded-full border-2 border-zinc-950 ${item.color} shadow-lg`} />
                              <span className="text-[9px] font-black text-zinc-550 uppercase tracking-widest block">{item.date}</span>
                              <span className="font-extrabold text-zinc-250 block mt-0.5">{item.title}</span>
                              <span className="text-[10px] text-zinc-500 block">{item.desc}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  )}

                  {/* ANALYTICS PANEL */}
                  {activeTab === 'analytics' && (
                    <div className="space-y-6">
                      
                      {/* heatmaps & distribution charts */}
                      <div className="bg-zinc-900/50 border border-zinc-850 p-6 rounded-3xl space-y-5 text-left">
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 pb-2 border-b border-zinc-850/50">
                          Weekly Focus Heatmap
                        </h3>
                        
                        <div className="grid grid-cols-7 gap-2 max-w-sm mx-auto">
                          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                            <div key={idx} className="text-center text-[10px] font-black text-zinc-550 uppercase">
                              {day}
                            </div>
                          ))}
                          {[
                            20, 45, 0, 120, 60, 15, 0,
                            30, 90, 150, 40, 10, 0, 80,
                            10, 40, 0, 90, 180, 200, 120,
                            90, 110, 80, 130, 45, 60, 95
                          ].map((mins, idx) => {
                            const intensity = 
                              mins === 0 ? 'bg-zinc-950 border border-zinc-850/60' :
                              mins < 45 ? 'bg-violet-950/60 border border-violet-900/40 text-violet-400' :
                              mins < 100 ? 'bg-violet-800/80 text-white' : 'bg-violet-500 text-white font-bold';
                            return (
                              <div 
                                key={idx} 
                                className={`h-8 rounded-lg flex items-center justify-center text-[8px] transition cursor-pointer hover:scale-105 ${intensity}`}
                                title={`${mins} mins studied`}
                              >
                                {mins > 0 && `${mins}m`}
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-between items-center text-[9px] text-zinc-500 font-bold max-w-sm mx-auto pt-2">
                          <span>0 mins</span>
                          <div className="flex gap-1">
                            <span className="w-2.5 h-2.5 rounded bg-zinc-950 border border-zinc-850/60" />
                            <span className="w-2.5 h-2.5 rounded bg-violet-950/60" />
                            <span className="w-2.5 h-2.5 rounded bg-violet-800/80" />
                            <span className="w-2.5 h-2.5 rounded bg-violet-500" />
                          </div>
                          <span>200+ mins</span>
                        </div>
                      </div>

                      {/* Radar Subject distribution & Growth stats */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        <div className="bg-zinc-900/50 border border-zinc-850 p-6 rounded-3xl space-y-4 text-left">
                          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Subject Distribution</h3>
                          
                          {/* SVG Radar Chart Mockup */}
                          <div className="relative h-44 flex items-center justify-center">
                            <svg className="w-full h-full max-w-[180px]" viewBox="0 0 100 100">
                              <polygon points="50,10 90,40 75,85 25,85 10,40" fill="none" className="stroke-zinc-850" strokeWidth="1" />
                              <polygon points="50,25 80,48 68,80 32,80 20,48" fill="none" className="stroke-zinc-850" strokeWidth="1" />
                              <polygon points="50,15 88,42 70,70 30,82 15,48" fill="rgba(139,92,246,0.15)" stroke="rgba(139,92,246,0.7)" strokeWidth="1.5" />
                              
                              <text x="50" y="8" className="fill-zinc-500 font-bold text-[6px]" textAnchor="middle">CS</text>
                              <text x="94" y="42" className="fill-zinc-500 font-bold text-[6px]" textAnchor="start">MATH</text>
                              <text x="78" y="91" className="fill-zinc-500 font-bold text-[6px]" textAnchor="middle">PHYS</text>
                              <text x="22" y="91" className="fill-zinc-500 font-bold text-[6px]" textAnchor="middle">CHEM</text>
                              <text x="6" y="42" className="fill-zinc-500 font-bold text-[6px]" textAnchor="end">LIT</text>
                            </svg>
                          </div>
                        </div>

                        <div className="bg-zinc-900/50 border border-zinc-850 p-6 rounded-3xl space-y-4 text-left">
                          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">XP Progress History</h3>
                          
                          <div className="bg-zinc-950/40 border border-zinc-850 rounded-2xl p-4 h-40 overflow-y-auto space-y-2">
                            {xpLogs.slice(0, 5).map(log => (
                              <div key={log.id} className="flex justify-between items-center text-[11px] pb-1.5 border-b border-zinc-850/50 last:border-0 last:pb-0">
                                <span className="font-semibold text-zinc-300 block truncate max-w-[140px]">{log.description}</span>
                                <span className={`font-black ${currentAccent.text}`}>+{log.amount} XP</span>
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>

                    </div>
                  )}

                  {/* SOCIAL PROFILE PANEL */}
                  {activeTab === 'social' && (
                    <div className="space-y-6">
                      
                      {/* Seeded competitors list */}
                      <div className="bg-zinc-900/50 border border-zinc-850 p-6 rounded-3xl space-y-4 text-left">
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 pb-2 border-b border-zinc-850/50">
                          Active Mutual Partners ({profile.stats?.friendsCount || 4})
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[
                            { name: 'Aryan Mehta', status: 'IN_POMODORO', title: 'Calculus Champion', color: 'bg-amber-500' },
                            { name: 'Priya Sharma', status: 'ONLINE', title: 'Writing Virtuoso', color: 'bg-emerald-500' },
                            { name: 'Rohan Verma', status: 'TAKING_QUIZ', title: 'Database Specialist', color: 'bg-pink-500' },
                            { name: 'Neha Kapoor', status: 'IDLE', title: 'Product Manager', color: 'bg-yellow-500' }
                          ].map((friend, idx) => (
                            <div key={idx} className="bg-zinc-950 border border-zinc-850 p-4 rounded-2xl flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <div className="w-10 h-10 rounded-full bg-zinc-850 overflow-hidden flex items-center justify-center border border-zinc-800">
                                    <span className="text-xs font-bold text-zinc-450">{friend.name.charAt(0)}</span>
                                  </div>
                                  <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-zinc-950 ${friend.color}`} />
                                </div>
                                <div className="space-y-0.5">
                                  <span className="font-extrabold text-zinc-200 block text-xs">{friend.name}</span>
                                  <span className="text-[9px] text-zinc-550 block">{friend.title}</span>
                                </div>
                              </div>

                              <span className="text-[9px] font-black bg-zinc-900 border border-zinc-800 text-zinc-450 px-2 py-0.5 rounded-lg uppercase tracking-wider select-none">
                                {friend.status.replace('_', ' ')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  )}

                  {/* CUSTOMIZATION TABS */}
                  {activeTab === 'customize' && (
                    <div className="space-y-6">
                      
                      {/* Live preview alert */}
                      <div className="bg-zinc-900/30 border border-zinc-850 p-4 rounded-3xl flex gap-3 text-left">
                        <Sparkles className={`w-5 h-5 ${currentAccent.text} shrink-0 mt-0.5 animate-pulse`} />
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-zinc-250 block">Identity Card Live Preview</span>
                          <span className="text-[10px] text-zinc-550 block">All accent updates, frame modifications, and banner presets selected below reflect instantly on the preview.</span>
                        </div>
                      </div>

                      {/* Accent colors selection */}
                      <div className="bg-zinc-900/50 border border-zinc-850 p-6 rounded-3xl space-y-4 text-left">
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Card Accent Theme</h3>
                        
                        <div className="flex flex-wrap gap-2.5">
                          {Object.keys(accentClasses).map(color => {
                            const active = accentColor === color;
                            const properties = accentClasses[color];
                            return (
                              <button
                                key={color}
                                onClick={() => {
                                  setAccentColor(color);
                                  saveCustomization({ accentColor: color });
                                }}
                                className={`px-4 py-2 border rounded-xl text-xs font-bold capitalize transition cursor-pointer ${
                                  active 
                                    ? `bg-zinc-800 text-white ${properties.border} ${properties.glow}` 
                                    : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:text-zinc-200'
                                }`}
                              >
                                <span className={`inline-block w-2.5 h-2.5 rounded-full mr-2 ${properties.bg}`} />
                                {color}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Banner presets selection */}
                      <div className="bg-zinc-900/50 border border-zinc-850 p-6 rounded-3xl space-y-4 text-left">
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Profile Banner Theme</h3>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {Object.keys(bannerClasses).map(banner => {
                            const active = bannerStyle === banner;
                            return (
                              <button
                                key={banner}
                                onClick={() => {
                                  setBannerStyle(banner);
                                  saveCustomization({ bannerStyle: banner });
                                }}
                                className={`h-16 rounded-2xl border relative overflow-hidden transition cursor-pointer text-left p-3 flex flex-col justify-between ${
                                  active ? 'border-violet-500 shadow-md' : 'border-zinc-850 hover:border-zinc-700'
                                }`}
                              >
                                <div className={`absolute inset-0 opacity-80 ${bannerClasses[banner]}`} />
                                <div className="absolute inset-0 bg-black/30" />
                                <span className="relative z-10 text-[10px] font-black text-white capitalize">{banner.replace('-', ' ')}</span>
                                {active && (
                                  <div className="relative z-10 w-4 h-4 rounded-full bg-violet-600 flex items-center justify-center ml-auto">
                                    <Check className="w-2.5 h-2.5 text-white" />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Avatar frames selection */}
                      <div className="bg-zinc-900/50 border border-zinc-850 p-6 rounded-3xl space-y-4 text-left">
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Avatar Border Frame</h3>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {[
                            { id: 'none', label: 'Simple Border', frame: 'none' },
                            { id: 'scholar-gold', label: 'Scholar Gold', frame: 'scholar-gold' },
                            { id: 'cyberpunk-neon', label: 'Cyberpunk Neon', frame: 'cyberpunk-neon' },
                            { id: 'amethyst-void', label: 'Amethyst Void', frame: 'amethyst-void' },
                            { id: 'emerald-leaf', label: 'Emerald Leaf', frame: 'emerald-leaf' }
                          ].map(item => {
                            const active = avatarFrame === item.id;
                            return (
                              <button
                                key={item.id}
                                onClick={() => {
                                  setAvatarFrame(item.id);
                                  saveCustomization({ avatarFrame: item.id });
                                }}
                                className={`p-4 rounded-2xl border transition cursor-pointer text-center space-y-2 flex flex-col items-center justify-center ${
                                  active ? 'bg-zinc-800 border-violet-500' : 'bg-zinc-950 border-zinc-850 hover:border-zinc-700'
                                }`}
                              >
                                <div className={`w-12 h-12 rounded-full bg-zinc-900 ${frameClasses[item.frame]} flex items-center justify-center text-[10px] text-zinc-550 font-bold uppercase`}>
                                  A
                                </div>
                                <span className="text-[10px] font-extrabold text-zinc-300 block">{item.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* custom Built-In Library pickers */}
                      <div className="bg-zinc-900/50 border border-zinc-850 p-6 rounded-3xl space-y-4 text-left">
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Gamer Gallery Avatars</h3>
                        <AvatarPicker
                          currentAvatarUrl={profile.avatarUrl}
                          onSelectAvatar={handleSelectBuiltInAvatar}
                        />
                      </div>

                    </div>
                  )}

                  {/* IDENTITY FORM PANEL */}
                  {activeTab === 'identity' && (
                    <form onSubmit={handleUpdateBasicProfile} className="space-y-6">
                      
                      <div className="bg-zinc-900/50 border border-zinc-850 p-6 rounded-3xl space-y-5 text-left animate-fadeIn">
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 pb-2 border-b border-zinc-850/50">
                          Personal Details
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Display name */}
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider">Display Name</label>
                            <input
                              type="text"
                              value={displayName}
                              onChange={(e) => setDisplayName(e.target.value)}
                              maxLength={50}
                              placeholder="Your full display name"
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-violet-500"
                            />
                          </div>

                          {/* Timezone */}
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider">Timezone</label>
                            <select
                              value={timezone}
                              onChange={(e) => setTimezone(e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-200 focus:outline-none focus:border-violet-500 cursor-pointer"
                            >
                              {['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Kolkata', 'Asia/Tokyo', 'Asia/Singapore', 'Australia/Sydney'].map(tz => (
                                <option key={tz} value={tz}>{tz}</option>
                              ))}
                            </select>
                          </div>

                          {/* Custom Learning Title */}
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider">Learning Title</label>
                            <input
                              type="text"
                              value={learningTitle}
                              onChange={(e) => setLearningTitle(e.target.value)}
                              placeholder="e.g. Focus Master"
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-violet-500"
                            />
                          </div>

                          {/* Custom Status Message */}
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider">Status Message</label>
                            <input
                              type="text"
                              value={statusMessage}
                              onChange={(e) => setStatusMessage(e.target.value)}
                              placeholder="e.g. Preparing for midterm"
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-violet-500"
                            />
                          </div>
                        </div>

                        {/* Bio */}
                        <div className="flex flex-col gap-1.5 pt-2">
                          <div className="flex justify-between text-[10px] font-bold text-zinc-450 uppercase tracking-wider">
                            <label>Biography summary</label>
                            <span className={bio.length > 130 ? 'text-amber-500' : 'text-zinc-550'}>
                              {bio.length} / 150
                            </span>
                          </div>
                          <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            maxLength={150}
                            rows={3}
                            placeholder="Write a short summary about your study goals..."
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-violet-500 resize-none"
                          />
                        </div>
                      </div>

                      {/* Educational Institution & Academic Fields */}
                      <div className="bg-zinc-900/50 border border-zinc-850 p-6 rounded-3xl space-y-5 text-left animate-fadeIn">
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 pb-2 border-b border-zinc-850/50">
                          Education & Academic Credentials
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider">University</label>
                            <input
                              type="text"
                              value={university}
                              onChange={(e) => setUniversity(e.target.value)}
                              placeholder="e.g. Stanford University"
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-violet-500"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider">Course Focus</label>
                            <input
                              type="text"
                              value={course}
                              onChange={(e) => setCourse(e.target.value)}
                              placeholder="e.g. Physics Major"
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-violet-500"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider">Department</label>
                            <input
                              type="text"
                              value={department}
                              onChange={(e) => setDepartment(e.target.value)}
                              placeholder="e.g. Sciences"
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-violet-500"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="px-5 py-3 bg-violet-650 hover:bg-violet-600 rounded-xl text-xs font-black text-white transition cursor-pointer shadow-lg"
                        >
                          Save Profile Details
                        </button>
                      </div>

                      {/* Username checker/change block */}
                      <div className="bg-zinc-900/50 border border-zinc-850 p-6 rounded-3xl space-y-4 text-left">
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Change Username (@name)</h3>
                        
                        <div className="flex gap-3">
                          <div className="relative flex-1">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-550 text-xs font-black select-none">
                              @
                            </span>
                            <input
                              type="text"
                              value={username}
                              onChange={(e) => setUsername(e.target.value)}
                              placeholder="new_username"
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-4 py-3 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-violet-500"
                            />
                          </div>
                          
                          <button
                            type="button"
                            onClick={handleUpdateUsername}
                            disabled={usernameStatus !== 'available'}
                            className="px-5 py-3 bg-violet-650 hover:bg-violet-600 disabled:bg-zinc-900 disabled:text-zinc-650 border border-transparent disabled:border-zinc-850 rounded-xl text-xs font-black text-white transition cursor-pointer"
                          >
                            Apply Change
                          </button>
                        </div>

                        {usernameStatus !== 'idle' && (
                          <div className={`text-[10px] font-bold flex items-center gap-1.5 mt-1.5 ${
                            usernameStatus === 'available' ? 'text-emerald-500' : 'text-rose-500'
                          }`}>
                            {usernameStatus === 'checking' ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-550" />
                                <span>Verifying availability...</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>{usernameMessage}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                    </form>
                  )}

                  {/* PRIVACY PANEL */}
                  {activeTab === 'privacy' && (
                    <form onSubmit={handleUpdatePrivacy} className="space-y-6">
                      
                      <div className="bg-zinc-900/50 border border-zinc-850 p-6 rounded-3xl space-y-4 text-left">
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Profile Visibility Settings</h3>
                        
                        <select
                          value={privacyLevel}
                          onChange={(e) => setPrivacyLevel(e.target.value as any)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-200 focus:outline-none focus:border-violet-500 cursor-pointer"
                        >
                          <option value="PUBLIC">🌐 Public (Visible to all students & search results)</option>
                          <option value="FRIENDS_ONLY">👥 Friends Only (Restricted to accepted peers)</option>
                          <option value="PRIVATE">🔒 Private (Hidden from search & general catalog)</option>
                        </select>
                      </div>

                      <div className="bg-zinc-900/50 border border-zinc-850 p-6 rounded-3xl space-y-4 text-left">
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 pb-2 border-b border-zinc-850/50">
                          Individual Statistics Visibility toggles
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <label className="flex items-center gap-3 bg-zinc-950/40 p-4 border border-zinc-850 rounded-2xl cursor-pointer hover:bg-zinc-900/40 transition">
                            <input
                              type="checkbox"
                              checked={showStreak}
                              onChange={(e) => setShowStreak(e.target.checked)}
                              className="w-4 h-4 rounded accent-violet-650 bg-zinc-950 border-zinc-800"
                            />
                            <div>
                              <span className="text-xs font-bold text-zinc-200 block">Show Learning Streaks</span>
                              <span className="text-[10px] text-zinc-550 font-semibold mt-0.5 block">Display consecutive days counters</span>
                            </div>
                          </label>

                          <label className="flex items-center gap-3 bg-zinc-950/40 p-4 border border-zinc-850 rounded-2xl cursor-pointer hover:bg-zinc-900/40 transition">
                            <input
                              type="checkbox"
                              checked={showStudyHours}
                              onChange={(e) => setShowStudyHours(e.target.checked)}
                              className="w-4 h-4 rounded accent-violet-650 bg-zinc-950 border-zinc-800"
                            />
                            <div>
                              <span className="text-xs font-bold text-zinc-200 block">Show Study Duration</span>
                              <span className="text-[10px] text-zinc-550 font-semibold mt-0.5 block">Display hours spent focusing</span>
                            </div>
                          </label>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="px-5 py-3 bg-violet-650 hover:bg-violet-600 rounded-xl text-xs font-black text-white transition cursor-pointer shadow-lg"
                      >
                        Save Privacy Settings
                      </button>

                    </form>
                  )}

                </motion.div>
              </AnimatePresence>
            </div>

          </div>

        </div>
      </div>

    </div>
  );
}
