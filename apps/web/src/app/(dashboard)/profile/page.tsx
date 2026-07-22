'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  User, Shield, Sparkles, Image as ImageIcon, Check, Loader2, AlertCircle, 
  HelpCircle, Calendar, MapPin, Eye, Lock, Globe, MessageSquare
} from 'lucide-react';
import profileService, { UserProfile } from '@/services/profile';
import achievementsService, { UserAchievement } from '@/services/achievements';
import xpService, { XpLog, XpStatistics } from '@/services/xp';
import { useToast } from '@/components/providers/ToastProvider';
import ProfileCard, { getRankTitle } from '@/components/profile/ProfileCard';
import AvatarPicker from '@/components/profile/AvatarPicker';
import { motion } from 'framer-motion';
import { Trophy, Flame, BookOpen, Brain, Clock, Upload, Target, Award, Activity, History } from 'lucide-react';
import BadgeEmblem from '@/components/achievements/BadgeEmblem';

export default function ProfilePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
  const usernameParam = searchParams?.get('u');

  // Core Data States
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'customize' | 'identity' | 'privacy' | 'achievements'>('customize');
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [xpStats, setXpStats] = useState<XpStatistics | null>(null);
  const [xpLogs, setXpLogs] = useState<XpLog[]>([]);

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
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [username, profile?.username]);

  // Profile Form Submissions
  const handleUpdateBasicProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await profileService.updateProfile({ displayName, bio, timezone });
      setProfile(res);
      showToast('Profile updated successfully', 'success');
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
        <div className="flex flex-col items-center gap-3 text-zinc-500">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          <span className="text-xs font-semibold uppercase tracking-wider">Retrieving Profile...</span>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-950">
        <div className="text-zinc-650 text-center space-y-2">
          <AlertCircle className="w-10 h-10 mx-auto stroke-[1.5]" />
          <span className="block text-sm font-semibold">Profile could not be loaded</span>
        </div>
      </div>
    );
  }

  const isOwner = profile.isOwner;

  return (
    <div className="h-full overflow-y-auto bg-zinc-950 px-6 py-8 md:px-10 lg:px-16 animate-fadeIn">
      
      {/* Page Header */}
      <div className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <User className="w-6 h-6 text-violet-400" />
            {isOwner ? 'Your StudySync Profile' : `${profile.displayName || profile.firstName}'s Learning Card`}
          </h1>
          <p className="text-zinc-500 text-xs mt-1">
            {isOwner 
              ? 'Customize your unique learning identity, avatars, and check statistics.' 
              : 'Browse accomplishments, study statistics, and streaks.'}
          </p>
        </div>
        
        {/* Quick Back button if viewing someone else */}
        {usernameParam && (
          <button
            onClick={() => router.push('/profile')}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-805 rounded-xl text-zinc-300 text-xs font-bold transition cursor-pointer"
          >
            ← Back to My Profile
          </button>
        )}
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Dynamic Learning Card & Achievements List */}
        <div className="lg:col-span-1 space-y-6">
          <ProfileCard
            displayName={profile.displayName || `${profile.firstName} ${profile.lastName}`}
            username={profile.username}
            streak={profile.stats?.streak || 0}
            notesCount={profile.stats?.notesCount || 0}
            flashcardsCount={profile.stats?.flashcardsCount || 0}
            quizzesCompletedCount={profile.stats?.quizzesCompletedCount || 0}
            studyHours={profile.stats?.studyHours || 0}
            avatarUrl={profile.avatarUrl}
            xp={profile.xp || 0}
            level={profile.level || 1}
            weeklyRank={profile.weeklyRank}
            monthlyRank={profile.monthlyRank}
            bestRankEver={profile.bestRankEver}
            highestSubjectRank={profile.highestSubjectRank}
            winsCount={profile.winsCount}
          />

          {/* Dynamic Learning Metadata Block */}
          <div className="bg-zinc-900/50 border border-zinc-800/80 p-5 rounded-3xl space-y-4">
            <h4 className="text-[11px] font-bold text-zinc-450 uppercase tracking-widest pb-2 border-b border-zinc-850">
              Learning Profile
            </h4>
            
            <div className="space-y-3.5 text-xs">
              {/* Joined Date */}
              <div className="flex items-center justify-between text-zinc-300">
                <span className="text-zinc-500 flex items-center gap-1.5 font-semibold">
                  <Calendar className="w-3.5 h-3.5" />
                  Joined Sync
                </span>
                <span className="font-semibold">{new Date(profile.createdAt).toLocaleDateString()}</span>
              </div>

              {/* Timezone */}
              <div className="flex items-center justify-between text-zinc-300">
                <span className="text-zinc-500 flex items-center gap-1.5 font-semibold">
                  <MapPin className="w-3.5 h-3.5" />
                  Timezone
                </span>
                <span className="font-semibold">{profile.timezone}</span>
              </div>

              {/* Bio */}
              <div className="space-y-1.5 pt-2 border-t border-zinc-850">
                <span className="text-zinc-500 block font-semibold">Biography</span>
                <p className="text-zinc-350 leading-relaxed italic text-[11px] bg-zinc-950/40 p-3 rounded-xl border border-zinc-850/30">
                  {profile.bio || 'No bio written yet. Introduce yourself!'}
                </p>
              </div>

              {/* Future Placeholders Grid */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-850 text-center">
                <div className="bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-850/40">
                  <span className="text-[9px] font-bold text-zinc-550 block uppercase">Level</span>
                  <span className="text-xs font-extrabold text-violet-400 mt-0.5 block">{profile.stats?.currentLevel || 1}</span>
                </div>
                <div className="bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-850/40">
                  <span className="text-[9px] font-bold text-zinc-550 block uppercase">Badges</span>
                  <span className="text-xs font-extrabold text-pink-400 mt-0.5 block">{profile.stats?.badgesCount || 0}</span>
                </div>
                <div className="bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-850/40">
                  <span className="text-[9px] font-bold text-zinc-550 block uppercase">Friends</span>
                  <span className="text-xs font-extrabold text-blue-400 mt-0.5 block">{profile.stats?.friendsCount || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Configuration & Settings Tabs (Owner-Only) */}
        <div className="lg:col-span-2">
          {isOwner ? (
            <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-3xl overflow-hidden flex flex-col h-full min-h-[500px]">
              
              {/* Tab Header bar */}
              <div className="flex bg-zinc-950/50 border-b border-border/10 p-1.5 gap-1">
                <button
                  onClick={() => setActiveTab('customize')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'customize' ? 'bg-zinc-900 text-white border border-zinc-800' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  Customize Card
                </button>
                
                <button
                  onClick={() => setActiveTab('identity')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'identity' ? 'bg-zinc-900 text-white border border-zinc-800' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  Identity & Timezone
                </button>

                <button
                  onClick={() => setActiveTab('privacy')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'privacy' ? 'bg-zinc-900 text-white border border-zinc-800' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  Privacy & Data
                </button>

                <button
                  onClick={() => setActiveTab('achievements')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'achievements' ? 'bg-zinc-900 text-white border border-zinc-800' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5" />
                  Achievements
                </button>
              </div>

              {/* Tab Content body */}
              <div className="p-6 flex-1 bg-zinc-950/20">
                {activeTab === 'customize' && (
                  <div className="space-y-6">
                    {/* Avatar Upload Panel */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-zinc-200">Custom Avatar Upload</h3>
                      <div className="flex items-center gap-4 bg-zinc-900/40 p-4 border border-zinc-850 rounded-2xl">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleAvatarFileChange}
                          accept="image/*"
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="px-4 py-2.5 bg-violet-650 hover:bg-violet-600 disabled:bg-violet-850 text-white rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <ImageIcon className="w-3.5 h-3.5" />
                              Upload Image File
                            </>
                          )}
                        </button>
                        <p className="text-[10px] text-zinc-500 font-semibold leading-relaxed">
                          Supported sizes: JPG, PNG, WEBP. Max 2MB limit. Files will be cropped to square.
                        </p>
                      </div>
                    </div>

                    {/* Premium Built-In Library */}
                    <div className="space-y-3 pt-2">
                      <h3 className="text-sm font-semibold text-zinc-200">Select built-in library avatar</h3>
                      <AvatarPicker
                        currentAvatarUrl={profile.avatarUrl}
                        onSelectAvatar={handleSelectBuiltInAvatar}
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'identity' && (
                  <form onSubmit={handleUpdateBasicProfile} className="space-y-6">
                    {/* Display name */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Display Name</label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        maxLength={50}
                        placeholder="Your full display name"
                        className="w-full bg-zinc-950 border border-zinc-805 rounded-xl px-4 py-3 text-xs text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-violet-500"
                      />
                    </div>

                    {/* Bio */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        <label>Bio Summary</label>
                        <span className={bio.length > 130 ? 'text-amber-500' : 'text-zinc-500'}>
                          {bio.length} / 150
                        </span>
                      </div>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        maxLength={150}
                        rows={3}
                        placeholder="Write a short summary about your study goals..."
                        className="w-full bg-zinc-950 border border-zinc-805 rounded-xl px-4 py-3 text-xs text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-violet-500 resize-none"
                      />
                    </div>

                    {/* Timezone */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Timezone</label>
                      <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-805 rounded-xl px-4 py-3 text-xs text-zinc-200 focus:outline-none focus:border-violet-500 cursor-pointer"
                      >
                        {['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Kolkata', 'Asia/Tokyo', 'Asia/Singapore', 'Australia/Sydney'].map(tz => (
                          <option key={tz} value={tz}>{tz}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="px-4 py-2.5 bg-violet-650 hover:bg-violet-600 rounded-xl text-xs font-bold text-white transition cursor-pointer self-start"
                    >
                      Save Profile Details
                    </button>

                    {/* Username Update separate form */}
                    <div className="pt-6 border-t border-zinc-850 space-y-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Change Username (@username)</label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500 text-xs font-bold select-none">
                              @
                            </span>
                            <input
                              type="text"
                              value={username}
                              onChange={(e) => setUsername(e.target.value)}
                              placeholder="e.g. mudit"
                              className="w-full bg-zinc-950 border border-zinc-805 rounded-xl pl-8 pr-4 py-3 text-xs text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-violet-500"
                            />
                          </div>
                          
                          <button
                            type="button"
                            onClick={handleUpdateUsername}
                            disabled={usernameStatus !== 'available'}
                            className="px-4 py-3 bg-violet-650 hover:bg-violet-600 disabled:bg-zinc-900 disabled:text-zinc-650 border border-transparent disabled:border-zinc-805 rounded-xl text-xs font-bold text-white transition cursor-pointer"
                          >
                            Apply Username
                          </button>
                        </div>

                        {/* Live availability alerts */}
                        {usernameStatus !== 'idle' && (
                          <div className={`text-[10px] font-semibold flex items-center gap-1.5 mt-1.5 ${
                            usernameStatus === 'available' ? 'text-emerald-500' : 'text-rose-500'
                          }`}>
                            {usernameStatus === 'checking' ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin text-zinc-500" />
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

                        <p className="text-[10px] text-zinc-550 leading-relaxed font-semibold mt-1">
                          ⚠️ Username can only be updated once every 30 days. Character restrictions apply.
                        </p>
                      </div>
                    </div>
                  </form>
                )}

                {activeTab === 'privacy' && (
                  <form onSubmit={handleUpdatePrivacy} className="space-y-6">
                    {/* Privacy Visibility */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Profile Visibility</label>
                      <div className="relative">
                        <select
                          value={privacyLevel}
                          onChange={(e) => setPrivacyLevel(e.target.value as any)}
                          className="w-full bg-zinc-950 border border-zinc-805 rounded-xl px-4 py-3 text-xs text-zinc-200 focus:outline-none focus:border-violet-500 cursor-pointer"
                        >
                          <option value="PUBLIC">🌐 Public (Visible to search & community)</option>
                          <option value="FRIENDS_ONLY">👥 Friends Only (Restricted to accepted peers)</option>
                          <option value="PRIVATE">🔒 Private (Hidden from search engines & public)</option>
                        </select>
                      </div>
                    </div>

                    {/* Checkbox settings */}
                    <div className="space-y-4 pt-2">
                      <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Individual Statistics Toggles</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Streak */}
                        <label className="flex items-center gap-3 bg-zinc-950/40 p-4 border border-zinc-850 rounded-2xl cursor-pointer hover:bg-zinc-900/40 transition">
                          <input
                            type="checkbox"
                            checked={showStreak}
                            onChange={(e) => setShowStreak(e.target.checked)}
                            className="w-4 h-4 rounded accent-violet-650 bg-zinc-950 border-zinc-800"
                          />
                          <div>
                            <span className="text-xs font-bold text-zinc-200 block">Show Streaks</span>
                            <span className="text-[10px] text-zinc-550 font-semibold mt-0.5 block">Display daily consecutive study counts</span>
                          </div>
                        </label>

                        {/* Study Hours */}
                        <label className="flex items-center gap-3 bg-zinc-950/40 p-4 border border-zinc-850 rounded-2xl cursor-pointer hover:bg-zinc-900/40 transition">
                          <input
                            type="checkbox"
                            checked={showStudyHours}
                            onChange={(e) => setShowStudyHours(e.target.checked)}
                            className="w-4 h-4 rounded accent-violet-650 bg-zinc-950 border-zinc-800"
                          />
                          <div>
                            <span className="text-xs font-bold text-zinc-200 block">Show Study Hours</span>
                            <span className="text-[10px] text-zinc-550 font-semibold mt-0.5 block">Display duration of focus sessions completed</span>
                          </div>
                        </label>

                        {/* Notes Count */}
                        <label className="flex items-center gap-3 bg-zinc-950/40 p-4 border border-zinc-850 rounded-2xl cursor-pointer hover:bg-zinc-900/40 transition">
                          <input
                            type="checkbox"
                            checked={showNotes}
                            onChange={(e) => setShowNotes(e.target.checked)}
                            className="w-4 h-4 rounded accent-violet-650 bg-zinc-950 border-zinc-800"
                          />
                          <div>
                            <span className="text-xs font-bold text-zinc-200 block">Show Notes Count</span>
                            <span className="text-[10px] text-zinc-550 font-semibold mt-0.5 block">Display the total number of notes written</span>
                          </div>
                        </label>

                        {/* Badges */}
                        <label className="flex items-center gap-3 bg-zinc-950/40 p-4 border border-zinc-850 rounded-2xl cursor-pointer hover:bg-zinc-900/40 transition">
                          <input
                            type="checkbox"
                            checked={showBadges}
                            onChange={(e) => setShowBadges(e.target.checked)}
                            className="w-4 h-4 rounded accent-violet-650 bg-zinc-950 border-zinc-800"
                          />
                          <div>
                            <span className="text-xs font-bold text-zinc-200 block">Show Badges</span>
                            <span className="text-[10px] text-zinc-550 font-semibold mt-0.5 block">Display achievements levels earned</span>
                          </div>
                        </label>

                        {/* Flashcards & Documents */}
                        <label className="flex items-center gap-3 bg-zinc-950/40 p-4 border border-zinc-850 rounded-2xl cursor-pointer hover:bg-zinc-900/40 transition md:col-span-2">
                          <input
                            type="checkbox"
                            checked={showAchievements}
                            onChange={(e) => setShowAchievements(e.target.checked)}
                            className="w-4 h-4 rounded accent-violet-650 bg-zinc-950 border-zinc-800"
                          />
                          <div>
                            <span className="text-xs font-bold text-zinc-200 block">Show Quiz and Document Achievements</span>
                            <span className="text-[10px] text-zinc-550 font-semibold mt-0.5 block">Display count of flashcards, completed quizzes, and uploaded documents</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="px-4 py-2.5 bg-violet-650 hover:bg-violet-600 rounded-xl text-xs font-bold text-white transition cursor-pointer self-start"
                    >
                      Save Privacy Settings
                    </button>
                  </form>
                )}

                {activeTab === 'achievements' && (
                  <div className="space-y-6">
                    {/* XP Statistics Grid */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-1.5 animate-fade-in">
                        <Activity className="w-4 h-4 text-violet-400" />
                        XP & Activity Statistics
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="bg-zinc-950/40 border border-zinc-850 p-4 rounded-2xl">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Daily XP</span>
                          <span className="text-lg font-extrabold text-zinc-250 block mt-1">{(xpStats?.dailyXp || 0).toLocaleString()} XP</span>
                        </div>
                        <div className="bg-zinc-950/40 border border-zinc-850 p-4 rounded-2xl">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Weekly XP</span>
                          <span className="text-lg font-extrabold text-zinc-250 block mt-1">{(xpStats?.weeklyXp || 0).toLocaleString()} XP</span>
                        </div>
                        <div className="bg-zinc-950/40 border border-zinc-850 p-4 rounded-2xl">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Monthly XP</span>
                          <span className="text-lg font-extrabold text-zinc-250 block mt-1">{(xpStats?.monthlyXp || 0).toLocaleString()} XP</span>
                        </div>
                        <div className="bg-zinc-950/40 border border-zinc-850 p-4 rounded-2xl">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Lifetime XP</span>
                          <span className="text-lg font-extrabold text-violet-400 block mt-1">{(profile?.lifetimeXp || 0).toLocaleString()} XP</span>
                        </div>
                        <div className="bg-zinc-950/40 border border-zinc-850 p-4 rounded-2xl">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Avg XP/Day</span>
                          <span className="text-lg font-extrabold text-zinc-250 block mt-1">{(xpStats?.averageXpPerDay || 0).toLocaleString()} XP</span>
                        </div>
                        <div className="bg-zinc-950/40 border border-zinc-850 p-4 rounded-2xl">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Highest Day</span>
                          <span className="text-lg font-extrabold text-emerald-400 block mt-1">{(xpStats?.highestXpDay || 0).toLocaleString()} XP</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Left Column: Badges & Showcase */}
                      <div className="space-y-6">
                        {/* Badge Showcase section */}
                        <div className="space-y-3">
                          <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-1.5">
                            <Award className="w-4 h-4 text-violet-400" />
                            Badge Showcase
                          </h3>
                          <div className="grid grid-cols-3 gap-3">
                            {achievements.filter(a => a.unlocked && (a.tier === 'LEGENDARY' || a.tier === 'MYTHIC' || a.tier === 'EPIC')).slice(0, 3).length === 0 ? (
                              <div className="col-span-full py-6 text-center text-zinc-600 text-xs border border-dashed border-zinc-850 rounded-2xl bg-zinc-950/20">
                                No high-tier showcase badges unlocked yet. Keep studying!
                              </div>
                            ) : (
                              achievements.filter(a => a.unlocked && (a.tier === 'LEGENDARY' || a.tier === 'MYTHIC' || a.tier === 'EPIC')).slice(0, 3).map(ach => (
                                <div key={ach.id} className="bg-zinc-950/40 border border-zinc-850 p-3 rounded-2xl text-center space-y-1.5 flex flex-col items-center animate-fade-in">
                                  <BadgeEmblem
                                    category={ach.category}
                                    tier={ach.tier as any}
                                    unlocked={ach.unlocked}
                                    isSecret={ach.isSecret}
                                    size={36}
                                  />
                                  <span className="text-[9px] font-extrabold text-zinc-300 block truncate w-full">{ach.title}</span>
                                  <span className="text-[7px] font-extrabold text-violet-400 uppercase tracking-wider">{ach.tier}</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Category progress metrics */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <h3 className="text-sm font-bold text-zinc-200">Category Progress</h3>
                            <button
                              type="button"
                              onClick={() => router.push('/achievements')}
                              className="text-[10px] font-extrabold text-violet-400 hover:text-violet-300 transition cursor-pointer font-sans"
                            >
                              View All Badges →
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            {['Streak', 'Study Hours', 'Notes', 'Quizzes', 'Flashcards', 'AI Usage'].map(cat => {
                              const catAchs = achievements.filter(a => a.category === cat);
                              const unlockedCat = catAchs.filter(a => a.unlocked).length;
                              const pct = catAchs.length > 0 ? Math.round((unlockedCat / catAchs.length) * 100) : 0;
                              
                              return (
                                <div key={cat} className="bg-zinc-950/40 border border-zinc-850/80 p-3 rounded-2xl space-y-1.5">
                                  <div className="flex items-center justify-between text-[10px] font-semibold">
                                    <span className="text-zinc-350">{cat}</span>
                                    <span className="text-zinc-550">{unlockedCat} / {catAchs.length}</span>
                                  </div>
                                  <div className="w-full h-1 bg-zinc-900 border border-zinc-850/40 rounded-full overflow-hidden">
                                    <div className="bg-violet-650 h-full rounded-full" style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Right Column: XP Timeline History */}
                      <div className="space-y-3">
                        <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-1.5">
                          <History className="w-4 h-4 text-pink-400" />
                          XP Activity History
                        </h3>
                        <div className="bg-zinc-950/30 border border-zinc-850 rounded-2xl p-4 h-[240px] overflow-y-auto space-y-3 scrollbar-thin">
                          {xpLogs.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-zinc-650 text-xs">
                              No XP logs in timeline yet.
                            </div>
                          ) : (
                            xpLogs.map(log => (
                              <div key={log.id} className="flex justify-between items-center text-xs pb-2.5 border-b border-zinc-850/50 last:border-b-0 last:pb-0">
                                <div className="space-y-0.5 text-left">
                                  <span className="font-semibold text-zinc-250 block leading-tight">{log.description}</span>
                                  <span className="text-[10px] text-zinc-500 block">{new Date(log.createdAt).toLocaleDateString()}</span>
                                </div>
                                <span className="text-xs font-extrabold text-violet-400 block shrink-0">+{log.amount} XP</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </div>

            </div>
          ) : (
            /* Restricted Profile View screen when not owner */
            <div className="bg-zinc-900/30 border border-zinc-800/80 p-8 rounded-3xl h-full flex flex-col items-center justify-center text-center space-y-4">
              {profile.privacyLevel === 'PRIVATE' ? (
                <>
                  <Lock className="w-10 h-10 text-zinc-650 stroke-[1.5]" />
                  <div>
                    <h3 className="font-bold text-zinc-200 text-base">This Profile is Private</h3>
                    <p className="text-zinc-500 text-xs mt-1">This user restricts profile visibility settings.</p>
                  </div>
                </>
              ) : (
                <>
                  <Globe className="w-10 h-10 text-violet-400/80 stroke-[1.5] animate-pulse" />
                  <div>
                    <h3 className="font-bold text-zinc-250 text-sm">StudySync Community learning metrics</h3>
                    <p className="text-zinc-550 text-xs mt-1">Streaks, hours, and notes are displayed on the learning card.</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
