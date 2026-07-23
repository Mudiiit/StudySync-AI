'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  User, Shield, Sparkles, Image as ImageIcon, Check, Loader2, AlertCircle, 
  Globe, Trophy, Flame, Target, Award, Activity, History, 
  Compass, Share2, GraduationCap, TrendingUp, Settings, Sparkle, Plus, Trash2, ArrowUp, ArrowDown,
  Key, Lock, Smartphone, LogOut, RefreshCw, ShieldAlert, FileText, Fingerprint
} from 'lucide-react';
import profileService, { UserProfile } from '@/services/profile';
import achievementsService, { UserAchievement } from '@/services/achievements';
import xpService, { XpLog, XpStatistics } from '@/services/xp';
import { useToast } from '@/components/providers/ToastProvider';
import AvatarPicker from '@/components/profile/AvatarPicker';
import { motion, AnimatePresence } from 'framer-motion';
import { BADGE_ASSETS, Streak7Badge } from '@/components/achievements/badge-assets';
import StudyCardModal from '@/components/social/StudyCardModal';

type TabType = 'overview' | 'analytics' | 'social' | 'customize' | 'identity' | 'privacy' | 'security';


const SUGGESTED_SPECIALIZATIONS = [
  'Algorithms', 'Machine Learning', 'Artificial Intelligence', 'Data Science', 
  'Cyber Security', 'Web Development', 'Cloud Computing', 'Blockchain', 
  'Operating Systems', 'Computer Networks', 'DSA', 'Competitive Programming', 
  'Database Systems', 'UI Design', 'Backend Development', 'Frontend Development', 
  'Mobile Development', 'Generative AI', 'Deep Learning', 'NLP'
];

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

  // Local Customization States
  const [accentColor, setAccentColor] = useState('violet');
  const [bannerStyle, setBannerStyle] = useState('deep-space');
  const [avatarFrame, setAvatarFrame] = useState('none');
  const [statusMessage, setStatusMessage] = useState('');
  const [learningTitle, setLearningTitle] = useState('Knowledge Explorer');

  // Academic Standing & Profile States
  const [university, setUniversity] = useState('Massachusetts Institute of Technology');
  const [degree, setDegree] = useState('Computer Science & Engineering');
  const [department, setDepartment] = useState('EECS');
  const [branch, setBranch] = useState('Software Engineering');
  const [program, setProgram] = useState('Undergraduate');
  const [campus, setCampus] = useState('Main Campus');
  const [admissionYear, setAdmissionYear] = useState(2024);
  const [expectedGraduationYear, setExpectedGraduationYear] = useState(2028);
  const [currentSemester, setCurrentSemester] = useState(1);
  const [currentAcademicYear, setCurrentAcademicYear] = useState(1);
  const [currentSession, setCurrentSession] = useState('Spring 2026');
  const [totalSemesters, setTotalSemesters] = useState(8);
  const [specializations, setSpecializations] = useState<string[]>(['Algorithms', 'Artificial Intelligence', 'Data Science']);

  // Specialization Search State
  const [specInput, setSpecInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

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

  // Security Center configurations
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [showMfaQr, setShowMfaQr] = useState(false);
  const [mfaCodeInput, setMfaCodeInput] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>(['ABCD-1234', 'EFGH-5678', 'IJKL-9012', 'MNOP-3456']);
  const [activeSessions, setActiveSessions] = useState([
    { id: 'sess-1', device: 'MacBook Pro 16"', browser: 'Chrome', os: 'macOS 14.4', location: 'Bengaluru, India', activeNow: true, lastActive: 'Active now' },
    { id: 'sess-2', device: 'Windows Desktop', browser: 'Edge', os: 'Windows 11', location: 'New Delhi, India', activeNow: false, lastActive: '2 hours ago' },
    { id: 'sess-3', device: 'iPhone 15 Pro', browser: 'Safari', os: 'iOS 17.2', location: 'Mumbai, India', activeNow: false, lastActive: '1 day ago' },
  ]);
  const [googleConnected, setGoogleConnected] = useState(true);
  const [githubConnected, setGithubConnected] = useState(true);
  const [securityEvents, setSecurityEvents] = useState([
    { id: 'ev-1', event: 'Password updated', date: 'July 23, 2026 10:15 AM', ip: '157.45.12.9' },
    { id: 'ev-2', event: 'MFA configuration checked', date: 'July 23, 2026 10:12 AM', ip: '157.45.12.9' },
    { id: 'ev-3', event: 'Login from Chrome on macOS', date: 'July 23, 2026 09:00 AM', ip: '157.45.12.9' },
    { id: 'ev-4', event: 'GitHub OAuth account linked', date: 'July 22, 2026 04:30 PM', ip: '157.45.12.9' },
  ]);
  const [stepUpPassword, setStepUpPassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Share Study Card modal state
  const [showCard, setShowCard] = useState(false);

  // Validation states
  const semesterValidationError = currentSemester > totalSemesters;
  const graduationValidationError = expectedGraduationYear < admissionYear;

  // Load customizations from LocalStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('studysync_profile_customization');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.accentColor) setAccentColor(parsed.accentColor);
        if (parsed.bannerStyle) setBannerStyle(parsed.bannerStyle);
        if (parsed.avatarFrame) setAvatarFrame(parsed.avatarFrame);
        if (parsed.learningTitle) setLearningTitle(parsed.learningTitle);
        if (parsed.statusMessage) setStatusMessage(parsed.statusMessage);
      }
    } catch (e) {
      console.error('Error loading customization settings:', e);
    }
  }, []);

  // Save customizations to LocalStorage
  const saveCustomization = (updated: Partial<any>) => {
    try {
      const stored = localStorage.getItem('studysync_profile_customization');
      const current = stored ? JSON.parse(stored) : {};
      const newSettings = {
        accentColor, bannerStyle, avatarFrame, learningTitle, statusMessage,
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

      // Populate database education values if present, else keep defaults
      if (data.institution) setUniversity(data.institution);
      if (data.degree) setDegree(data.degree);
      if (data.department) setDepartment(data.department);
      if (data.branch) setBranch(data.branch);
      if (data.program) setProgram(data.program);
      if (data.campus) setCampus(data.campus);
      if (data.admissionYear) setAdmissionYear(data.admissionYear);
      if (data.expectedGraduationYear) setExpectedGraduationYear(data.expectedGraduationYear);
      if (data.currentSemester) setCurrentSemester(data.currentSemester);
      if (data.currentAcademicYear) setCurrentAcademicYear(data.currentAcademicYear);
      if (data.currentSession) setCurrentSession(data.currentSession);
      if (data.totalSemesters) setTotalSemesters(data.totalSemesters);
      if (data.specializations && data.specializations.length > 0) setSpecializations(data.specializations);

      try {
        const achs = await achievementsService.getAchievements();
        setAchievements(achs);
      } catch (err) {
        console.error('Failed to load achievements in profile:', err);
      }

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

  useEffect(() => {
    const validTabs: TabType[] = ['overview', 'analytics', 'social', 'customize', 'identity', 'privacy', 'security'];
    if (initialTab && validTabs.includes(initialTab)) {
      setActiveTab(initialTab);
    } else {
      setActiveTab('overview');
    }
  }, [initialTab]);

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

  // Derived Fields & AI Academic Insights
  const degreeCompletionPct = useMemo(() => {
    if (totalSemesters <= 0) return 0;
    return Math.round(((currentSemester - 1) / totalSemesters) * 100);
  }, [currentSemester, totalSemesters]);

  const academicYearName = useMemo(() => {
    if (currentSemester >= totalSemesters - 1) return 'Final Year';
    const year = Math.ceil(currentSemester / 2);
    return `Year ${year}`;
  }, [currentSemester, totalSemesters]);

  const aiInsights = useMemo(() => {
    const isFinal = currentSemester >= totalSemesters - 1;
    const recommendations = [];
    if (isFinal) {
      recommendations.push("Recommended focus: Placement Preparation & Capstone Engineering.");
      recommendations.push("Recommended Goal: Strengthen DSA roadmap and System Architecture designs.");
    } else {
      recommendations.push("Recommended focus: Core subjects foundations & Internship sourcing.");
      recommendations.push("Recommended Goal: Build fullstack side projects and maintain study streak.");
    }

    return {
      insights: [
        `You are currently in Semester ${currentSemester}.`,
        `You are entering your ${academicYearName.toLowerCase()}.`,
        `Estimated graduation is scheduled for ${expectedGraduationYear}.`,
        `You have completed ${degreeCompletionPct}% of your degree.`
      ],
      recommendations
    };
  }, [currentSemester, totalSemesters, academicYearName, expectedGraduationYear, degreeCompletionPct]);

  // Specialization suggestions filter
  const filteredSuggestions = useMemo(() => {
    if (!specInput.trim()) return SUGGESTED_SPECIALIZATIONS.filter(s => !specializations.includes(s));
    const input = specInput.toLowerCase();
    return SUGGESTED_SPECIALIZATIONS.filter(
      s => s.toLowerCase().includes(input) && !specializations.includes(s)
    );
  }, [specInput, specializations]);

  const handleAddSpecialization = (spec: string) => {
    if (!spec.trim() || specializations.includes(spec.trim())) return;
    setSpecializations([...specializations, spec.trim()]);
    setSpecInput('');
    setShowSuggestions(false);
  };

  const handleRemoveSpecialization = (spec: string) => {
    setSpecializations(specializations.filter(s => s !== spec));
  };

  const handleMoveSpecialization = (index: number, direction: 'up' | 'down') => {
    const newSpecs = [...specializations];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newSpecs.length) return;
    
    // Swap
    const temp = newSpecs[index];
    newSpecs[index] = newSpecs[targetIdx];
    newSpecs[targetIdx] = temp;
    setSpecializations(newSpecs);
  };

  const handleUpdateBasicProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (semesterValidationError || graduationValidationError) {
      showToast('Please fix form validation errors before saving.', 'error');
      return;
    }

    try {
      const res = await profileService.updateProfile({
        displayName,
        bio,
        timezone,
        institution: university,
        degree,
        department,
        branch,
        program,
        campus,
        admissionYear,
        expectedGraduationYear,
        currentSemester,
        currentAcademicYear,
        currentSession,
        totalSemesters,
        specializations
      });
      setProfile(res);
      saveCustomization({
        displayName,
        bio,
        timezone
      });
      showToast('Profile and academic credentials updated!', 'success');
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

  const handleSelectBuiltInAvatar = async (url: string) => {
    try {
      const res = await profileService.selectBuiltInAvatar(url);
      setProfile(res);
      showToast('Built-in avatar applied', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Avatar update failed', 'error');
    }
  };

  if (loading || !profile) {
    return (
      <div className="h-full min-h-screen bg-[#070708] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  // Level progress math
  const level = profile.level || 1;
  const xp = profile.xp || 0;
  const nextThreshold = 25 * level * (level + 3);
  const currentThreshold = level === 1 ? 0 : 25 * (level - 1) * (level + 2);
  const totalInLevel = nextThreshold - currentThreshold;
  const earnedInLevel = Math.max(0, xp - currentThreshold);
  const xpPercentage = Math.max(0, Math.min(100, Math.round((earnedInLevel / totalInLevel) * 100)));
  const xpUntilNext = Math.max(0, nextThreshold - xp);

  const accentClasses: Record<string, { text: string; border: string; bg: string; ring: string; glow: string }> = {
    violet: { text: 'text-violet-405', border: 'border-violet-500/20', bg: 'bg-gradient-to-r from-violet-600 to-indigo-650', ring: 'stroke-violet-500', glow: 'shadow-[0_0_30px_rgba(139,92,246,0.15)]' },
    emerald: { text: 'text-emerald-450', border: 'border-emerald-500/20', bg: 'bg-gradient-to-r from-emerald-600 to-teal-650', ring: 'stroke-emerald-500', glow: 'shadow-[0_0_30px_rgba(16,185,129,0.15)]' },
    sky: { text: 'text-sky-400', border: 'border-sky-500/20', bg: 'bg-gradient-to-r from-sky-500 to-blue-650', ring: 'stroke-sky-400', glow: 'shadow-[0_0_30px_rgba(56,189,248,0.15)]' },
    rose: { text: 'text-rose-455', border: 'border-rose-500/20', bg: 'bg-gradient-to-r from-rose-600 to-pink-650', ring: 'stroke-rose-500', glow: 'shadow-[0_0_30px_rgba(244,63,94,0.15)]' },
    amber: { text: 'text-amber-450', border: 'border-amber-500/20', bg: 'bg-gradient-to-r from-amber-500 to-orange-650', ring: 'stroke-amber-500', glow: 'shadow-[0_0_30px_rgba(245,158,11,0.15)]' },
    fuchsia: { text: 'text-fuchsia-400', border: 'border-fuchsia-500/20', bg: 'bg-gradient-to-r from-fuchsia-600 to-purple-650', ring: 'stroke-fuchsia-500', glow: 'shadow-[0_0_30px_rgba(217,70,239,0.15)]' }
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
    none: 'border-[3px] border-zinc-900 shadow-lg',
    'scholar-gold': 'border-[3px] border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)] animate-pulse',
    'cyberpunk-neon': 'border-[3px] border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.4)] animate-pulse',
    'amethyst-void': 'border-[3px] border-fuchsia-500 shadow-[0_0_25px_rgba(217,70,239,0.4)] animate-pulse',
    'emerald-leaf': 'border-[3px] border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-pulse'
  };

  return (
    <div className="h-full overflow-y-auto bg-[#070708]/10 text-zinc-150 min-h-screen relative font-sans text-xs">
      
      {/* Background bloom glows */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-violet-600/5 rounded-full blur-[160px] pointer-events-none -z-10" />
      
      {/* Living Banner */}
      <div className={`w-full h-48 relative overflow-hidden transition-all duration-700 ${bannerClasses[bannerStyle] || bannerClasses['deep-space']}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_60%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-zinc-950 to-transparent" />
        
        {/* Profile Action Overlays */}
        <div className="absolute top-6 right-6 flex gap-2.5 z-20">
          {usernameParam && (
            <button
              onClick={() => router.push('/profile')}
              className="px-4.5 py-2.5 bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-200 text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 backdrop-blur-md"
            >
              ← Hub
            </button>
          )}
          <button 
            onClick={() => setShowCard(true)}
            className="p-2.5 bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-zinc-200 transition cursor-pointer backdrop-blur-md"
            title="Share Profile Card"
          >
            <Share2 className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pb-16 relative z-10 -mt-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: HERO IDENTITY & PREVIEW */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Living Hero Card */}
            <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-[32px] shadow-2xl backdrop-blur-xl relative overflow-hidden text-center flex flex-col items-center">
              <div className="absolute top-0 right-0 w-32 h-32 bg-violet-650/5 rounded-full blur-2xl pointer-events-none" />
              
              {/* Level XP Ring */}
              <div className="relative w-32 h-32 flex items-center justify-center mb-4 group transition duration-300">
                <div className="absolute inset-4 rounded-full blur-xl opacity-20 bg-violet-500 animate-pulse pointer-events-none" />
                
                {/* SVG Progress Ring */}
                <svg className="absolute w-full h-full -rotate-90 filter drop-shadow-[0_0_8px_rgba(0,0,0,0.6)]" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="43" className="stroke-zinc-955 fill-none" strokeWidth="4" />
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="43" 
                    className={`fill-none ${currentAccent.ring}`} 
                    strokeWidth="4" 
                    strokeDasharray="270"
                    strokeDashoffset={270 - (270 * xpPercentage) / 100}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
                  />
                </svg>

                <div className={`relative w-22 h-22 rounded-full overflow-hidden bg-zinc-950 flex items-center justify-center ${frameClasses[avatarFrame] || frameClasses.none} transition-all duration-300`}>
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="Profile Avatar" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center text-lg font-black uppercase text-zinc-300">
                      {displayName.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="absolute -bottom-1 bg-zinc-950 border border-zinc-905 px-3 py-0.5 rounded-full text-[9px] font-black text-zinc-100 shadow-lg select-none uppercase tracking-widest">
                  Lvl {level}
                </div>
              </div>

              {/* Identity Details */}
              <div className="space-y-2.5 w-full">
                <h2 className="text-base font-black text-zinc-100 tracking-tight flex items-center justify-center gap-1.5">
                  {displayName}
                  <Sparkle className={`w-4 h-4 ${currentAccent.text}`} />
                </h2>
                
                {statusMessage ? (
                  <span className="inline-block text-[9.5px] font-black text-zinc-400 bg-zinc-950 border border-zinc-900 px-3 py-1 rounded-xl uppercase tracking-wider">
                    💬 {statusMessage}
                  </span>
                ) : (
                  <span className="text-[10px] text-zinc-550 italic block font-semibold">"No status set"</span>
                )}

                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
                  <span className="text-[8.5px] font-black uppercase tracking-wider bg-zinc-950 border border-zinc-900 text-zinc-450 px-2.5 py-1 rounded-lg">
                    Level {level}
                  </span>
                  <span className={`text-[8.5px] font-black uppercase tracking-wider bg-zinc-950 border border-zinc-900 ${currentAccent.text} px-2.5 py-1 rounded-lg`}>
                    {xp.toLocaleString()} XP ({xpPercentage}%)
                  </span>
                  <span className="text-[8.5px] font-black uppercase tracking-wider bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2.5 py-1 rounded-lg">
                    Diamond League
                  </span>
                  <span className="text-[8.5px] font-black uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    ONLINE
                  </span>
                </div>
              </div>
            </div>

            {/* Credentials Card */}
            <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-[32px] shadow-2xl space-y-5">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-450 pb-2.5 border-b border-zinc-900 flex items-center justify-between">
                <span>Learning Identity Credentials</span>
                <Award className={`w-4.5 h-4.5 ${currentAccent.text}`} />
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Lifetime XP', value: (profile.lifetimeXp || xp).toLocaleString(), color: 'text-zinc-200' },
                  { label: 'Daily Streak', value: `${profile.stats?.streak || 0} Days`, color: 'text-orange-400', streak: true },
                  { label: 'Focus Duration', value: `${profile.stats?.studyHours || 0} Hours`, color: 'text-zinc-200' },
                  { label: 'XP to Next Lvl', value: xpUntilNext.toLocaleString(), color: 'text-zinc-200' },
                  { label: 'Quizzes Taken', value: profile.stats?.quizzesCompletedCount || 0, color: 'text-emerald-400' },
                  { label: 'Notes Logged', value: profile.stats?.notesCount || 0, color: 'text-violet-400' }
                ].map((item, idx) => (
                  <div key={idx} className="bg-zinc-950/40 border border-zinc-900 p-3 rounded-2xl hover:border-zinc-800 transition duration-300">
                    <span className="text-[8.5px] font-black text-zinc-550 block uppercase tracking-widest">{item.label}</span>
                    <span className={`text-xs font-black mt-1 block ${item.color} flex items-center gap-1`}>
                      {item.streak && <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-505" />}
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Progress metrics sliders */}
              <div className="space-y-4 pt-3.5 border-t border-zinc-900">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                    <span>Consistency Score</span>
                    <span className={currentAccent.text}>88%</span>
                  </div>
                  <div className="h-1.5 bg-zinc-950 border border-zinc-900 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${currentAccent.bg}`} style={{ width: '88%' }} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                    <span>AI Productivity Level</span>
                    <span className="text-pink-400">76%</span>
                  </div>
                  <div className="h-1.5 bg-zinc-950 border border-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full bg-pink-500 rounded-full" style={{ width: '76%' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Smart Academic Standing Card (Behavioring as Live Preview) */}
            <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-[32px] shadow-2xl space-y-4 text-left relative overflow-hidden group hover:border-violet-500/25 transition duration-350">
              <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full blur-xl pointer-events-none" />
              
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-455 pb-2.5 border-b border-zinc-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5"><GraduationCap className="w-4.5 h-4.5 text-zinc-500" /> Academic Standing</span>
                <span className="text-[8px] font-black bg-zinc-950 border border-zinc-900 text-zinc-400 px-2 py-0.5 rounded uppercase tracking-wider">
                  {academicYearName}
                </span>
              </h3>
              
              <div className="space-y-4 text-xs">
                <div className="flex gap-3">
                  <div className="p-2.5 bg-zinc-950 border border-zinc-900 rounded-2xl text-violet-405 flex items-center justify-center shrink-0">
                    <Compass className="w-4.5 h-4.5" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[8.5px] font-black text-zinc-550 block uppercase tracking-widest">Institution</span>
                    <span className="font-extrabold text-zinc-200 block leading-tight">{university || 'No university set'}</span>
                    <span className="text-[9px] text-zinc-500 block leading-snug">
                      {department || 'N/A'} • {degree || 'N/A'}
                    </span>
                    {branch && <span className="text-[8.5px] text-zinc-500 font-bold block">{branch} ({program})</span>}
                  </div>
                </div>

                <div className="space-y-1.5 pt-1.5 border-t border-zinc-900">
                  <div className="flex justify-between items-center text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                    <span>Degree Completion</span>
                    <span className={currentAccent.text}>{degreeCompletionPct}%</span>
                  </div>
                  <div className="h-1.5 bg-zinc-950 border border-zinc-900 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${currentAccent.bg} transition-all duration-500`} 
                      style={{ width: `${degreeCompletionPct}%` }} 
                    />
                  </div>
                  <div className="flex justify-between items-center text-[8px] text-zinc-550 font-bold uppercase tracking-widest mt-1">
                    <span>Semester {currentSemester}</span>
                    <span>Total {totalSemesters} Semesters</span>
                  </div>
                </div>

                {expectedGraduationYear && (
                  <div className="text-[8.5px] font-black uppercase text-zinc-500 tracking-wider">
                    🎓 expected graduation: <span className="text-zinc-350">{expectedGraduationYear}</span>
                  </div>
                )}

                <div className="space-y-2 pt-2 border-t border-zinc-900">
                  <span className="text-[8.5px] font-black text-zinc-550 block uppercase tracking-widest">Learning Specializations</span>
                  {specializations.length === 0 ? (
                    <span className="text-[9px] text-zinc-650 italic font-semibold">No specializations specified.</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {specializations.map(sub => (
                        <span key={sub} className="text-[8.5px] font-black bg-zinc-950 border border-zinc-900 text-zinc-400 px-2 py-0.5 rounded-lg uppercase tracking-wider transition-all hover:scale-105 duration-200">
                          📘 {sub}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT SIDE: PREMIUM SETTINGS & LIVE PREVIEW TABS */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Unified Nav Tab Selector */}
            <div className="flex overflow-x-auto gap-1 bg-zinc-900/40 p-1.5 rounded-[24px] border border-zinc-900/60 scrollbar-none">
              {[
                { id: 'overview', label: 'Identity Hub', icon: User },
                { id: 'analytics', label: 'Analytics', icon: Activity },
                { id: 'social', label: 'Social & Partner', icon: Compass },
                { id: 'customize', label: 'Customize', icon: ImageIcon },
                { id: 'identity', label: 'Identity Settings', icon: Settings },
                { id: 'privacy', label: 'Privacy', icon: Shield },
                { id: 'security', label: 'Security Center', icon: Lock }
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
                    className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-2 shrink-0 cursor-pointer focus:outline-none ${
                      isSelected 
                        ? 'bg-zinc-900 text-white shadow border border-zinc-800' 
                        : 'text-zinc-500 hover:text-zinc-300'
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
                      
                      {/* Top Achievements Showcase */}
                      <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-[32px] space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                            <Trophy className="w-4 h-4 text-amber-400" /> Featured Achievements
                          </h3>
                          <button
                            onClick={() => router.push('/achievements')}
                            className="text-[9px] font-black text-violet-405 hover:text-violet-300 uppercase tracking-widest"
                          >
                            Explore Gallery →
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {achievements.filter(a => a.unlocked).slice(0, 4).length === 0 ? (
                            <div className="col-span-full py-10 text-center border border-dashed border-zinc-900 rounded-3xl p-6 bg-zinc-950/20 flex flex-col items-center justify-center gap-3">
                              <div className="p-3 bg-zinc-900/40 border border-zinc-900 rounded-2xl">
                                <Trophy className="w-8 h-8 text-zinc-700" />
                              </div>
                              <div className="max-w-xs space-y-1">
                                <p className="text-xs font-black text-zinc-350">Unlock your first badge</p>
                                <p className="text-[10px] text-zinc-550 leading-relaxed font-semibold">Complete quizzes, generate notes, and log hours to earn museum-quality credentials.</p>
                              </div>
                            </div>
                          ) : (
                            achievements.filter(a => a.unlocked).slice(0, 4).map(ach => {
                              const BadgeComp = BADGE_ASSETS[ach.id] || Streak7Badge;
                              const unlockDate = ach.unlockedAt ? new Date(ach.unlockedAt).toLocaleDateString() : 'Jul 15, 2026';
                              return (
                                <div key={ach.id} className="bg-zinc-950/60 border border-zinc-900/80 p-4 rounded-[20px] flex flex-col items-center text-center space-y-2 hover:border-violet-500/20 transition duration-350 group hover:scale-[1.02]">
                                  <BadgeComp size={48} unlocked={true} />
                                  <span className="text-[10px] font-black text-zinc-200 block truncate w-full">{ach.title}</span>
                                  <span className="text-[8.5px] font-black text-zinc-550 block">Unlocked {unlockDate}</span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* AI Scholar Productivity Insights */}
                      <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-[32px] space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5 pb-2.5 border-b border-zinc-900">
                          <Sparkles className="w-4 h-4 text-violet-400" /> Scholar Insights
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Insight Card 1 */}
                          <div className="bg-zinc-950/40 border border-zinc-900 p-4.5 rounded-[24px] flex flex-col justify-between gap-4 text-left relative overflow-hidden group hover:border-emerald-500/20 transition duration-300">
                            <div className="flex gap-3">
                              <TrendingUp className="w-4.5 h-4.5 text-emerald-450 shrink-0 mt-0.5" />
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black text-zinc-250">Academic Progress</span>
                                  <span className="text-[8px] font-black bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded uppercase">Dynamic Insight</span>
                                </div>
                                <span className="text-[10.5px] text-zinc-500 block leading-relaxed font-semibold">
                                  {aiInsights.insights[3]} {aiInsights.recommendations[0]}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between pt-2 border-t border-zinc-900/80 text-[8.5px] font-bold text-zinc-555">
                              <span>Confidence: 96%</span>
                              <button onClick={() => router.push('/goals')} className="text-[8.5px] font-black text-emerald-405 hover:text-emerald-300 uppercase tracking-widest">
                                Manage Goals →
                              </button>
                            </div>
                          </div>

                          {/* Insight Card 2 */}
                          <div className="bg-zinc-950/40 border border-zinc-900 p-4.5 rounded-[24px] flex flex-col justify-between gap-4 text-left relative overflow-hidden group hover:border-violet-500/20 transition duration-300">
                            <div className="flex gap-3">
                              <Target className="w-4.5 h-4.5 text-violet-400 shrink-0 mt-0.5" />
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black text-zinc-250">Syllabus Targeting</span>
                                  <span className="text-[8px] font-black bg-violet-500/10 border border-violet-500/20 text-violet-405 px-1.5 py-0.5 rounded uppercase">Focus point</span>
                                </div>
                                <span className="text-[10.5px] text-zinc-500 block leading-relaxed font-semibold">
                                  {aiInsights.insights[1]} {aiInsights.recommendations[1]}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between pt-2 border-t border-zinc-900/80 text-[8.5px] font-bold text-zinc-555">
                              <span>Confidence: 98%</span>
                              <button onClick={() => router.push('/quizzes')} className="text-[8.5px] font-black text-violet-400 hover:text-violet-305 uppercase tracking-widest">
                                Play Quiz →
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Learning Journey Timeline */}
                      <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-[32px] space-y-5 text-left">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5 pb-2.5 border-b border-zinc-900">
                          <History className="w-4.5 h-4.5 text-pink-400" /> Learning Timeline Journey
                        </h3>

                        <div className="relative border-l border-dashed border-zinc-900 pl-6 ml-3 space-y-6">
                          {[
                            { title: 'Joined StudySync AI Workspace', desc: 'Initialized learning metrics tracking', date: 'Jul 01, 2026', color: 'bg-blue-500 border-blue-400/20', icon: Globe },
                            { title: 'Completed First Practice Quiz', desc: 'Scored 90% in Computer Systems quiz', date: 'Jul 06, 2026', color: 'bg-emerald-500 border-emerald-400/20', icon: Check },
                            { title: 'Unlocked Streak Master Badge', desc: 'Achieved 7 consecutive study days', date: 'Jul 13, 2026', color: 'bg-amber-500 border-amber-400/20', icon: Flame },
                            { title: 'Reached Diamond League Arena', desc: 'Earned 3,500 weekly XP points', date: 'Yesterday', color: 'bg-violet-500 border-violet-400/20', icon: Trophy }
                          ].map((item, idx) => {
                            const IconComp = item.icon;
                            return (
                              <div key={idx} className="relative text-xs group transition duration-200">
                                <div className={`absolute -left-[36px] top-1 w-6 h-6 rounded-full border border-zinc-900 flex items-center justify-center text-white shrink-0 ${item.color} group-hover:scale-105 transition duration-300`}>
                                  <IconComp className="w-3 h-3 text-zinc-100" />
                                </div>
                                <div className="bg-zinc-950/40 border border-zinc-900 p-4 rounded-2xl space-y-1 hover:border-zinc-800 transition duration-300">
                                  <span className="text-[8.5px] font-black text-zinc-550 uppercase tracking-widest block font-mono">{item.date}</span>
                                  <span className="font-extrabold text-zinc-200 block">{item.title}</span>
                                  <span className="text-[10px] text-zinc-500 block leading-relaxed">{item.desc}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  )}

                  {/* ANALYTICS PANEL */}
                  {activeTab === 'analytics' && (
                    <div className="space-y-6">
                      
                      <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-[32px] space-y-5 text-left">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pb-2.5 border-b border-zinc-900">
                          Weekly Focus Heatmap
                        </h3>
                        
                        <div className="grid grid-cols-7 gap-2 max-w-sm mx-auto">
                          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                            <div key={idx} className="text-center text-[10px] font-black text-zinc-555 uppercase">
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
                              mins === 0 ? 'bg-zinc-950 border border-zinc-900/60' :
                              mins < 45 ? 'bg-violet-950/60 border border-violet-900/40 text-violet-405' :
                              mins < 100 ? 'bg-violet-800/80 text-white' : 'bg-violet-550 text-white font-bold';
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
                          <div className="flex gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-zinc-950 border border-zinc-900" />
                            <span className="w-2.5 h-2.5 rounded bg-violet-950/60" />
                            <span className="w-2.5 h-2.5 rounded bg-violet-800/80" />
                            <span className="w-2.5 h-2.5 rounded bg-violet-500" />
                          </div>
                          <span>200+ mins</span>
                        </div>
                      </div>

                      {/* Radar Subject distribution & Growth stats */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-[32px] space-y-4 text-left">
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Subject Distribution</h3>
                          
                          <div className="relative h-44 flex items-center justify-center">
                            <svg className="w-full h-full max-w-[180px]" viewBox="0 0 100 100">
                              <polygon points="50,10 90,40 75,85 25,85 10,40" fill="none" className="stroke-zinc-850" strokeWidth="1" />
                              <polygon points="50,25 80,48 68,80 32,80 20,48" fill="none" className="stroke-zinc-850" strokeWidth="1" />
                              <polygon points="50,15 88,42 70,70 30,82 15,48" fill="rgba(139,92,246,0.15)" stroke="rgba(139,92,246,0.7)" strokeWidth="1.5" />
                              
                              <text x="50" y="8" className="fill-zinc-550 font-bold text-[6px]" textAnchor="middle">CS</text>
                              <text x="94" y="42" className="fill-zinc-550 font-bold text-[6px]" textAnchor="start">MATH</text>
                              <text x="78" y="91" className="fill-zinc-550 font-bold text-[6px]" textAnchor="middle">PHYS</text>
                              <text x="22" y="91" className="fill-zinc-550 font-bold text-[6px]" textAnchor="middle">CHEM</text>
                              <text x="6" y="42" className="fill-zinc-550 font-bold text-[6px]" textAnchor="end">LIT</text>
                            </svg>
                          </div>
                        </div>

                        <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-[32px] space-y-4 text-left">
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">XP Progress History</h3>
                          
                          <div className="bg-zinc-950/40 border border-zinc-905 rounded-2xl p-4 h-40 overflow-y-auto space-y-2">
                            {xpLogs.slice(0, 5).map(log => (
                              <div key={log.id} className="flex justify-between items-center text-[11px] pb-1.5 border-b border-zinc-900 last:border-0 last:pb-0">
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
                      
                      <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-[32px] space-y-4 text-left">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pb-2.5 border-b border-zinc-900">
                          Active Companions ({profile.stats?.friendsCount || 4})
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[
                            { name: 'Aryan Mehta', status: 'IN_POMODORO', title: 'Calculus Champion', color: 'bg-amber-500' },
                            { name: 'Priya Sharma', status: 'ONLINE', title: 'Writing Virtuoso', color: 'bg-emerald-500' },
                            { name: 'Rohan Verma', status: 'TAKING_QUIZ', title: 'Database Specialist', color: 'bg-pink-500' },
                            { name: 'Neha Kapoor', status: 'IDLE', title: 'Product Manager', color: 'bg-yellow-500' }
                          ].map((friend, idx) => (
                            <div key={idx} className="bg-zinc-950/60 border border-zinc-900 p-4 rounded-[20px] flex justify-between items-center hover:border-zinc-800 transition duration-200">
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <div className="w-10 h-10 rounded-full bg-zinc-900 overflow-hidden flex items-center justify-center border border-zinc-800">
                                    <span className="text-xs font-bold text-zinc-400">{friend.name.charAt(0)}</span>
                                  </div>
                                  <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-zinc-950 ${friend.color}`} />
                                </div>
                                <div className="space-y-0.5">
                                  <span className="font-extrabold text-zinc-200 block text-xs">{friend.name}</span>
                                  <span className="text-[9px] text-zinc-550 block">{friend.title}</span>
                                </div>
                              </div>

                              <span className="text-[8.5px] font-black bg-zinc-900 border border-zinc-800 text-zinc-505 px-2 py-0.5 rounded-lg uppercase tracking-wider select-none">
                                {friend.status.replace('_', ' ').toLowerCase()}
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
                      
                      <div className="bg-zinc-900/30 border border-zinc-900 p-4 rounded-[24px] flex gap-3 text-left">
                        <Sparkles className={`w-5 h-5 ${currentAccent.text} shrink-0 mt-0.5 animate-pulse`} />
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-zinc-250 block">Identity Card Live Preview</span>
                          <span className="text-[10px] text-zinc-500 block">All accent updates, frame modifications, and banner presets selected below reflect instantly on the preview.</span>
                        </div>
                      </div>

                      {/* Accent colors selection */}
                      <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-[32px] space-y-4 text-left">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Card Accent Theme</h3>
                        
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
                                className={`px-4 py-2 border rounded-xl text-xs font-black uppercase tracking-wider capitalize transition duration-205 cursor-pointer focus:outline-none ${
                                  active 
                                    ? `bg-zinc-900 text-white ${properties.border} ${properties.glow}` 
                                    : 'bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-zinc-300'
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
                      <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-[32px] space-y-4 text-left">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Profile Banner Theme</h3>
                        
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
                                className={`h-16 rounded-2xl border relative overflow-hidden transition duration-200 cursor-pointer text-left p-3 flex flex-col justify-between focus:outline-none ${
                                  active ? 'border-violet-500 shadow-md' : 'border-zinc-900 hover:border-zinc-800'
                                }`}
                              >
                                <div className={`absolute inset-0 opacity-80 ${bannerClasses[banner]}`} />
                                <div className="absolute inset-0 bg-black/30" />
                                <span className="relative z-10 text-[9.5px] font-black text-white uppercase tracking-wider">{banner.replace('-', ' ')}</span>
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

                      {/* Avatar border frame selection */}
                      <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-[32px] space-y-4 text-left">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Avatar Border Frame</h3>
                        
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
                                className={`p-4 rounded-2xl border transition duration-200 cursor-pointer text-center space-y-2 flex flex-col items-center justify-center focus:outline-none ${
                                  active ? 'bg-zinc-900 border-violet-500' : 'bg-zinc-950 border-zinc-900 hover:border-zinc-800'
                                }`}
                              >
                                <div className={`w-12 h-12 rounded-full bg-zinc-900 ${frameClasses[item.frame]} flex items-center justify-center text-[10px] text-zinc-550 font-bold uppercase`}>
                                  A
                                </div>
                                <span className="text-[9.5px] font-black text-zinc-300 block uppercase tracking-wider">{item.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* custom Built-In Library pickers */}
                      <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-[32px] space-y-4 text-left">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Gamer Gallery Avatars</h3>
                        <AvatarPicker
                          currentAvatarUrl={profile.avatarUrl}
                          onSelectAvatar={handleSelectBuiltInAvatar}
                        />
                      </div>

                    </div>
                  )}

                  {/* IDENTITY FORM PANEL (Academic Profile Editor System 2.0) */}
                  {activeTab === 'identity' && (
                    <form onSubmit={handleUpdateBasicProfile} className="space-y-6">
                      
                      {/* Personal Section */}
                      <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-[32px] space-y-5 text-left">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pb-2 border-b border-zinc-900">
                          Personal Details
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[9.5px] font-black text-zinc-500 uppercase tracking-widest">Display Name</label>
                            <input
                              type="text"
                              value={displayName}
                              onChange={(e) => setDisplayName(e.target.value)}
                              maxLength={50}
                              className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-violet-500 transition"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[9.5px] font-black text-zinc-500 uppercase tracking-widest">Timezone</label>
                            <select
                              value={timezone}
                              onChange={(e) => setTimezone(e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3 text-xs text-zinc-200 focus:outline-none focus:border-violet-500 cursor-pointer"
                            >
                              {['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Kolkata', 'Asia/Tokyo', 'Asia/Singapore', 'Australia/Sydney'].map(tz => (
                                <option key={tz} value={tz}>{tz}</option>
                              ))}
                            </select>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[9.5px] font-black text-zinc-500 uppercase tracking-widest">Learning Title</label>
                            <input
                              type="text"
                              value={learningTitle}
                              onChange={(e) => setLearningTitle(e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-violet-500 transition"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[9.5px] font-black text-zinc-500 uppercase tracking-widest">Status Message</label>
                            <input
                              type="text"
                              value={statusMessage}
                              onChange={(e) => setStatusMessage(e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-violet-500 transition"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5 pt-2">
                          <div className="flex justify-between text-[9.5px] font-black text-zinc-500 uppercase tracking-widest">
                            <label>Biography Summary</label>
                            <span className={bio.length > 130 ? 'text-amber-500' : 'text-zinc-650'}>
                              {bio.length} / 150
                            </span>
                          </div>
                          <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            maxLength={150}
                            rows={3}
                            className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-violet-500 resize-none transition"
                          />
                        </div>
                      </div>

                      {/* Educational Institution & Academic Fields */}
                      <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-[32px] space-y-5 text-left">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pb-2 border-b border-zinc-900">
                          Education & Academic Profile Settings
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[9.5px] font-black text-zinc-500 uppercase tracking-widest">University Name (Institution)</label>
                            <input
                              type="text"
                              value={university}
                              onChange={(e) => setUniversity(e.target.value)}
                              placeholder="e.g. Stanford University"
                              className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-violet-500 transition"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[9.5px] font-black text-zinc-500 uppercase tracking-widest">Degree (e.g. B.Tech, M.S.)</label>
                            <input
                              type="text"
                              value={degree}
                              onChange={(e) => setDegree(e.target.value)}
                              placeholder="e.g. B.Tech"
                              className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-violet-500 transition"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[9.5px] font-black text-zinc-500 uppercase tracking-widest">Department</label>
                            <input
                              type="text"
                              value={department}
                              onChange={(e) => setDepartment(e.target.value)}
                              placeholder="e.g. EECS"
                              className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-violet-500 transition"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[9.5px] font-black text-zinc-500 uppercase tracking-widest">Branch</label>
                            <input
                              type="text"
                              value={branch}
                              onChange={(e) => setBranch(e.target.value)}
                              placeholder="e.g. Software Engineering"
                              className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-violet-500 transition"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[9.5px] font-black text-zinc-500 uppercase tracking-widest">Program Type</label>
                            <input
                              type="text"
                              value={program}
                              onChange={(e) => setProgram(e.target.value)}
                              placeholder="e.g. Undergraduate"
                              className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-violet-500 transition"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[9.5px] font-black text-zinc-500 uppercase tracking-widest">Campus location (optional)</label>
                            <input
                              type="text"
                              value={campus}
                              onChange={(e) => setCampus(e.target.value)}
                              placeholder="e.g. Main Campus"
                              className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-violet-500 transition"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[9.5px] font-black text-zinc-500 uppercase tracking-widest">Admission Year</label>
                            <input
                              type="number"
                              value={admissionYear}
                              onChange={(e) => setAdmissionYear(Number(e.target.value))}
                              className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3 text-xs text-zinc-200 focus:outline-none focus:border-violet-500 transition"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[9.5px] font-black text-zinc-500 uppercase tracking-widest">Expected Graduation Year</label>
                            <input
                              type="number"
                              value={expectedGraduationYear}
                              onChange={(e) => setExpectedGraduationYear(Number(e.target.value))}
                              className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3 text-xs text-zinc-200 focus:outline-none focus:border-violet-500 transition"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[9.5px] font-black text-zinc-500 uppercase tracking-widest">Current Session / Term</label>
                            <input
                              type="text"
                              value={currentSession}
                              onChange={(e) => setCurrentSession(e.target.value)}
                              placeholder="e.g. Spring 2026"
                              className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3 text-xs text-zinc-200 focus:outline-none focus:border-violet-500 transition"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[9.5px] font-black text-zinc-500 uppercase tracking-widest">Current Academic Year</label>
                            <select
                              value={currentAcademicYear}
                              onChange={(e) => setCurrentAcademicYear(Number(e.target.value))}
                              className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3 text-xs text-zinc-200 focus:outline-none focus:border-violet-500 cursor-pointer"
                            >
                              {[1, 2, 3, 4, 5].map(y => (
                                <option key={y} value={y}>Academic Year {y}</option>
                              ))}
                            </select>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[9.5px] font-black text-zinc-500 uppercase tracking-widest">Current Semester</label>
                            <select
                              value={currentSemester}
                              onChange={(e) => setCurrentSemester(Number(e.target.value))}
                              className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3 text-xs text-zinc-200 focus:outline-none focus:border-violet-500 cursor-pointer"
                            >
                              {Array.from({ length: totalSemesters }, (_, i) => i + 1).map(sem => (
                                <option key={sem} value={sem}>Semester {sem}</option>
                              ))}
                            </select>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[9.5px] font-black text-zinc-500 uppercase tracking-widest">Total Semesters</label>
                            <select
                              value={totalSemesters}
                              onChange={(e) => setTotalSemesters(Number(e.target.value))}
                              className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3 text-xs text-zinc-200 focus:outline-none focus:border-violet-500 cursor-pointer"
                            >
                              {[4, 6, 8, 10, 12].map(t => (
                                <option key={t} value={t}>{t} Semesters</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Validation Errors block */}
                        {(semesterValidationError || graduationValidationError) && (
                          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-455 text-[10px] font-bold space-y-1">
                            <div className="flex items-center gap-1.5">
                              <AlertCircle className="w-4.5 h-4.5" />
                              <span>Smart validations active:</span>
                            </div>
                            {semesterValidationError && <p>• Current semester cannot exceed total semesters.</p>}
                            {graduationValidationError && <p>• Expected graduation year cannot be prior to admission year.</p>}
                          </div>
                        )}
                      </div>

                      {/* Dynamic Learning Specializations Manager */}
                      <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-[32px] space-y-5 text-left">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pb-2 border-b border-zinc-900">
                          Learning Specializations Manager
                        </h3>

                        <div className="space-y-4">
                          {/* Specializations list with re-order and remove buttons */}
                          {specializations.length === 0 ? (
                            <p className="text-zinc-650 italic text-[10px] font-semibold">No specializations added yet. Use the selector below.</p>
                          ) : (
                            <div className="space-y-2">
                              {specializations.map((spec, index) => (
                                <div key={spec} className="flex justify-between items-center p-3 bg-zinc-950 border border-zinc-900 rounded-2xl">
                                  <span className="font-extrabold text-zinc-200 text-xs">📘 {spec}</span>
                                  
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      disabled={index === 0}
                                      onClick={() => handleMoveSpecialization(index, 'up')}
                                      className="p-1.5 hover:bg-zinc-900 disabled:opacity-30 rounded-lg text-zinc-400 cursor-pointer focus:outline-none"
                                    >
                                      <ArrowUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={index === specializations.length - 1}
                                      onClick={() => handleMoveSpecialization(index, 'down')}
                                      className="p-1.5 hover:bg-zinc-900 disabled:opacity-30 rounded-lg text-zinc-400 cursor-pointer focus:outline-none"
                                    >
                                      <ArrowDown className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveSpecialization(spec)}
                                      className="p-1.5 hover:bg-zinc-905 text-rose-455 rounded-lg cursor-pointer focus:outline-none"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Autocomplete Input Search Suggestions box */}
                          <div className="relative">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={specInput}
                                onChange={(e) => {
                                  setSpecInput(e.target.value);
                                  setShowSuggestions(true);
                                }}
                                onFocus={() => setShowSuggestions(true)}
                                placeholder="Add custom or search suggested specializations..."
                                className="flex-1 bg-zinc-950 border border-zinc-905 rounded-xl px-4 py-3 text-xs text-zinc-200 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddSpecialization(specInput)}
                                className="px-4 py-3 bg-zinc-950 border border-zinc-900 hover:border-zinc-800 rounded-xl text-zinc-300 focus:outline-none flex items-center justify-center cursor-pointer"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>

                            {showSuggestions && filteredSuggestions.length > 0 && (
                              <div className="absolute top-full left-0 right-0 mt-1.5 bg-zinc-900 border border-zinc-850 rounded-2xl shadow-xl z-20 max-h-40 overflow-y-auto p-1.5 divide-y divide-zinc-955">
                                {filteredSuggestions.map(s => (
                                  <button
                                    key={s}
                                    type="button"
                                    onClick={() => handleAddSpecialization(s)}
                                    className="w-full text-left px-4 py-2 hover:bg-zinc-950 text-zinc-300 rounded-xl transition font-medium"
                                  >
                                    {s}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* AI Academic standing recommendations */}
                      <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-[32px] space-y-4 text-left">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5 pb-2.5 border-b border-zinc-900">
                          <Sparkles className="w-4 h-4 text-violet-400 animate-pulse" /> AI Academic Recommendations
                        </h3>

                        <div className="space-y-3">
                          <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-2xl space-y-2">
                            <span className="text-[8.5px] font-black uppercase text-violet-405 tracking-wider block">AI INSIGHT CHECKS</span>
                            <div className="space-y-1 font-semibold text-zinc-400 text-[10.5px]">
                              {aiInsights.insights.map((insight, idx) => (
                                <p key={idx}>• {insight}</p>
                              ))}
                            </div>
                          </div>

                          <div className="p-4 bg-zinc-950/40 border border-violet-500/10 rounded-2xl space-y-2">
                            <span className="text-[8.5px] font-black uppercase text-amber-500 tracking-wider block font-sans">RECOMMENDED FOCUS</span>
                            <div className="space-y-1 font-semibold text-zinc-350 text-[10.5px]">
                              {aiInsights.recommendations.map((rec, idx) => (
                                <p key={idx}>• {rec}</p>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={semesterValidationError || graduationValidationError}
                          className="px-5 py-3 bg-violet-650 hover:bg-violet-600 disabled:opacity-40 rounded-xl text-xs font-black text-white uppercase tracking-wider transition cursor-pointer shadow-lg focus:outline-none"
                        >
                          Save Academic Profile
                        </button>
                      </div>

                      {/* Username checker/change block */}
                      <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-[32px] space-y-4 text-left">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Change Username (@name)</h3>
                        
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
                              className="w-full bg-zinc-950 border border-zinc-900 rounded-xl pl-8 pr-4 py-3 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-violet-500 transition"
                            />
                          </div>
                          
                          <button
                            type="button"
                            onClick={handleUpdateUsername}
                            disabled={usernameStatus !== 'available'}
                            className="px-5 py-3 bg-violet-650 hover:bg-violet-600 disabled:bg-zinc-900/50 disabled:text-zinc-600 border border-transparent disabled:border-zinc-900 rounded-xl text-xs font-black text-white uppercase tracking-wider transition cursor-pointer focus:outline-none"
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
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" />
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
                      
                      <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-[32px] space-y-4 text-left">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Profile Visibility Settings</h3>
                        
                        <select
                          value={privacyLevel}
                          onChange={(e) => setPrivacyLevel(e.target.value as any)}
                          className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3 text-xs text-zinc-200 focus:outline-none focus:border-violet-500 cursor-pointer"
                        >
                          <option value="PUBLIC">🌐 Public (Visible to all students & search results)</option>
                          <option value="FRIENDS_ONLY">👥 Friends Only (Restricted to accepted peers)</option>
                          <option value="PRIVATE">🔒 Private (Hidden from search & general catalog)</option>
                        </select>
                      </div>

                      <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-[32px] space-y-4 text-left">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pb-2.5 border-b border-zinc-900">
                          Individual Statistics Visibility toggles
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <label className="flex items-center gap-3 bg-zinc-950/40 p-4 border border-zinc-900 rounded-[20px] cursor-pointer hover:bg-zinc-900/10 transition">
                            <input
                              type="checkbox"
                              checked={showStreak}
                              onChange={(e) => setShowStreak(e.target.checked)}
                              className="w-4 h-4 rounded accent-violet-650 bg-zinc-950 border-zinc-900"
                            />
                            <div>
                              <span className="text-xs font-black text-zinc-200 block uppercase tracking-wider">Show Learning Streaks</span>
                              <span className="text-[10px] text-zinc-550 font-semibold mt-0.5 block">Display consecutive days counters</span>
                            </div>
                          </label>

                          <label className="flex items-center gap-3 bg-zinc-950/40 p-4 border border-zinc-900 rounded-[20px] cursor-pointer hover:bg-zinc-900/10 transition">
                            <input
                              type="checkbox"
                              checked={showStudyHours}
                              onChange={(e) => setShowStudyHours(e.target.checked)}
                              className="w-4 h-4 rounded accent-violet-650 bg-zinc-950 border-zinc-900"
                            />
                            <div>
                              <span className="text-xs font-black text-zinc-200 block uppercase tracking-wider">Show Study Duration</span>
                              <span className="text-[10px] text-zinc-550 font-semibold mt-0.5 block">Display hours spent focusing</span>
                            </div>
                          </label>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="px-5 py-3 bg-violet-650 hover:bg-violet-600 rounded-xl text-xs font-black text-white uppercase tracking-wider transition cursor-pointer shadow-lg focus:outline-none"
                      >
                        Save Privacy Settings
                      </button>

                    </form>
                  )}

                  {/* SECURITY CENTER DASHBOARD PANEL */}
                  {activeTab === 'security' && (
                    <div className="space-y-6 text-left">
                      
                      {/* MFA Section */}
                      <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-[32px] space-y-4">
                        <div className="flex justify-between items-center pb-2.5 border-b border-zinc-900">
                          <div className="space-y-0.5">
                            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Multi-Factor Authentication (MFA)</h3>
                            <p className="text-[10px] text-zinc-550 font-semibold">Secure your account with a Google Authenticator TOTP factor.</p>
                          </div>
                          <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border ${
                            mfaEnabled 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                              : 'bg-zinc-950 border-zinc-900 text-zinc-500'
                          }`}>
                            {mfaEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>

                        {!mfaEnabled ? (
                          <div className="space-y-4">
                            {!showMfaQr ? (
                              <button
                                type="button"
                                onClick={() => setShowMfaQr(true)}
                                className="px-4 py-2.5 bg-violet-650 hover:bg-violet-600 rounded-xl text-[10px] font-black uppercase tracking-wider text-white transition cursor-pointer"
                              >
                                Enable TOTP Authenticator
                              </button>
                            ) : (
                              <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-2xl flex flex-col md:flex-row items-center gap-6">
                                {/* SVG mock QR Code */}
                                <div className="w-28 h-28 bg-white p-2 rounded-xl shrink-0 flex items-center justify-center">
                                  <svg viewBox="0 0 100 100" className="w-full h-full text-zinc-950">
                                    <path fill="currentColor" d="M10,10 h30 v30 h-30 z M20,20 v10 h10 v-10 z M60,10 h30 v30 h-30 z M70,20 v10 h10 v-10 z M10,60 h30 v30 h-30 z M20,70 v10 h10 v-10 z M50,50 h10 v10 h-10 z M70,60 h10 v10 h-10 z M80,80 h10 v10 h-10 z" />
                                  </svg>
                                </div>
                                <div className="space-y-3 flex-1 text-left">
                                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Scan QR & Enter verification code</span>
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      placeholder="000 000"
                                      value={mfaCodeInput}
                                      onChange={(e) => setMfaCodeInput(e.target.value)}
                                      className="bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 placeholder-zinc-700 w-28 text-center focus:outline-none"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (mfaCodeInput.trim().length >= 4) {
                                          setMfaEnabled(true);
                                          setShowMfaQr(false);
                                          showToast('MFA protection enabled successfully!', 'success');
                                        } else {
                                          showToast('Please enter a valid OTP code', 'info');
                                        }
                                      }}
                                      className="px-4 bg-violet-650 hover:bg-violet-600 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition cursor-pointer"
                                    >
                                      Verify
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="bg-zinc-950 p-4 border border-zinc-900 rounded-2xl space-y-3">
                              <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest block">MFA Active Recovery Codes</span>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {recoveryCodes.map(code => (
                                  <code key={code} className="bg-zinc-900 border border-zinc-855 py-1.5 px-3 rounded-lg text-zinc-350 text-[10px] text-center select-all">{code}</code>
                                ))}
                              </div>
                              <div className="flex gap-2 justify-end pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRecoveryCodes(['WXYS-8839', 'QRTS-9021', 'PLMK-1122', 'ZMXN-4832']);
                                    showToast('Recovery codes rotated successfully.', 'success');
                                  }}
                                  className="px-3 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 rounded-xl text-[9px] font-black uppercase tracking-wider transition cursor-pointer"
                                >
                                  Regenerate Codes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMfaEnabled(false);
                                    showToast('MFA disabled.', 'info');
                                  }}
                                  className="px-3 py-2 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-455 rounded-xl text-[9px] font-black uppercase tracking-wider transition cursor-pointer"
                                >
                                  Disable MFA
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Active Sessions */}
                      <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-[32px] space-y-4">
                        <div className="flex justify-between items-center pb-2.5 border-b border-zinc-900">
                          <div className="space-y-0.5">
                            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Active Device Sessions</h3>
                            <p className="text-[10px] text-zinc-550 font-semibold">Verify active login locations and devices accessing your profile.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSessions(prev => prev.filter(s => s.activeNow));
                              showToast('All other sessions terminated successfully.', 'success');
                            }}
                            className="px-3 py-1.5 bg-zinc-950 border border-zinc-900 hover:border-zinc-800 text-[9px] font-black uppercase text-zinc-400 rounded-xl transition cursor-pointer"
                          >
                            Revoke All Other Sessions
                          </button>
                        </div>

                        <div className="space-y-2">
                          {activeSessions.map(s => (
                            <div key={s.id} className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-[20px] flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400">
                                  <Smartphone className="w-4.5 h-4.5" />
                                </div>
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-extrabold text-zinc-200">{s.device} ({s.browser})</span>
                                    {s.activeNow && <span className="text-[7.5px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-black uppercase">Current</span>}
                                  </div>
                                  <p className="text-[9.5px] text-zinc-550 font-semibold">{s.os} • {s.location} • {s.lastActive}</p>
                                </div>
                              </div>
                              {!s.activeNow && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveSessions(prev => prev.filter(sess => sess.id !== s.id));
                                    showToast('Session terminated successfully.', 'success');
                                  }}
                                  className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-rose-500 transition cursor-pointer"
                                >
                                  <LogOut className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* OAuth Providers */}
                      <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-[32px] space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 pb-2.5 border-b border-zinc-900">Connected OAuth Accounts</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Google */}
                          <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-[20px] flex items-center justify-between">
                            <div className="space-y-0.5">
                              <span className="text-xs font-black text-zinc-200 block">Google Identity</span>
                              <span className={`text-[9.5px] font-semibold block ${googleConnected ? 'text-emerald-500' : 'text-zinc-550'}`}>
                                {googleConnected ? 'Connected' : 'Disconnected'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setGoogleConnected(!googleConnected);
                                showToast(googleConnected ? 'Google account unlinked' : 'Google account linked', 'info');
                              }}
                              className="px-3 py-1.5 bg-zinc-950 border border-zinc-900 hover:border-zinc-800 rounded-xl text-[9px] font-black uppercase text-zinc-455 transition cursor-pointer"
                            >
                              {googleConnected ? 'Disconnect' : 'Connect'}
                            </button>
                          </div>

                          {/* GitHub */}
                          <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-[20px] flex items-center justify-between">
                            <div className="space-y-0.5">
                              <span className="text-xs font-black text-zinc-200 block">GitHub Identity</span>
                              <span className={`text-[9.5px] font-semibold block ${githubConnected ? 'text-emerald-500' : 'text-zinc-550'}`}>
                                {githubConnected ? 'Connected' : 'Disconnected'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setGithubConnected(!githubConnected);
                                showToast(githubConnected ? 'GitHub account unlinked' : 'GitHub account linked', 'info');
                              }}
                              className="px-3 py-1.5 bg-zinc-950 border border-zinc-900 hover:border-zinc-800 rounded-xl text-[9px] font-black uppercase text-zinc-455 transition cursor-pointer"
                            >
                              {githubConnected ? 'Disconnect' : 'Connect'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Recent Security Log Events */}
                      <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-[32px] space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 pb-2.5 border-b border-zinc-900">Security Audit Logs</h3>
                        <div className="space-y-2 text-[10px]">
                          {securityEvents.map(ev => (
                            <div key={ev.id} className="flex justify-between items-center py-1.5 border-b border-zinc-950 text-zinc-400">
                              <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                                <span className="font-extrabold text-zinc-300">{ev.event}</span>
                              </div>
                              <span className="text-zinc-550">{ev.date} • IP: {ev.ip}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Data Ownership Privacy Rights */}
                      <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-[32px] space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-405 pb-2.5 border-b border-zinc-900">Privacy & Data Export Settings</h3>
                        <div className="flex flex-col md:flex-row gap-4">
                          <button
                            type="button"
                            onClick={() => {
                              showToast('Generating user details export package...', 'info');
                              setTimeout(() => {
                                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ profile, activeSessions, securityEvents }));
                                const downloadAnchor = document.createElement('a');
                                downloadAnchor.setAttribute("href", dataStr);
                                downloadAnchor.setAttribute("download", "studysync_user_data_export.json");
                                document.body.appendChild(downloadAnchor);
                                downloadAnchor.click();
                                downloadAnchor.remove();
                                showToast('Export completed successfully.', 'success');
                              }, 1000);
                            }}
                            className="px-4 py-3 bg-zinc-950 border border-zinc-900 hover:border-zinc-800 text-xs font-black text-zinc-300 rounded-xl transition cursor-pointer text-center uppercase tracking-wider flex items-center justify-center gap-1.5 focus:outline-none"
                          >
                            <FileText className="w-4 h-4 text-violet-405" /> Download My Data
                          </button>

                          <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            className="px-4 py-3 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-455 text-xs font-black rounded-xl transition cursor-pointer text-center uppercase tracking-wider flex items-center justify-center gap-1.5 focus:outline-none"
                          >
                            <ShieldAlert className="w-4 h-4" /> Delete My Account
                          </button>
                        </div>
                      </div>

                      {/* Delete confirmation modal */}
                      <AnimatePresence>
                        {showDeleteConfirm && (
                          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <motion.div
                              initial={{ scale: 0.95, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.95, opacity: 0 }}
                              className="bg-zinc-950 border border-zinc-900 max-w-md w-full p-6 rounded-[32px] space-y-4 text-left"
                            >
                              <div className="flex items-center gap-2 text-rose-500">
                                <ShieldAlert className="w-5 h-5" />
                                <h3 className="text-sm font-black uppercase tracking-wider">Confirm Account Deletion</h3>
                              </div>
                              <p className="text-[10.5px] text-zinc-400 leading-relaxed font-semibold">
                                This action is irreversible. All of your flashcards, notes, analytics data, goals, and academic credentials will be permanently erased.
                              </p>
                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-zinc-555 uppercase tracking-widest block">Type your current password to proceed</label>
                                <input
                                  type="password"
                                  value={stepUpPassword}
                                  onChange={(e) => setStepUpPassword(e.target.value)}
                                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-rose-500"
                                />
                              </div>
                              <div className="flex gap-2 justify-end pt-2 text-[10px] font-black">
                                <button
                                  type="button"
                                  onClick={() => setShowDeleteConfirm(false)}
                                  className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-455 hover:text-zinc-250 cursor-pointer uppercase tracking-wider"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (stepUpPassword.trim().length >= 4) {
                                      showToast('Deleting account...', 'info');
                                      setTimeout(() => {
                                        window.location.href = '/login';
                                      }, 1500);
                                    } else {
                                      showToast('Invalid confirmation password', 'info');
                                    }
                                  }}
                                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl cursor-pointer uppercase tracking-wider"
                                >
                                  Delete Permanently
                                </button>
                              </div>
                            </motion.div>
                          </div>
                        )}
                      </AnimatePresence>

                    </div>
                  )}

                </motion.div>
              </AnimatePresence>
            </div>

          </div>

        </div>
      </div>

      {/* Shareable Study Card Modal */}
      {profile && (
        <StudyCardModal
          isOpen={showCard}
          onClose={() => setShowCard(false)}
          displayName={profile.displayName || profile.firstName || 'Learner'}
          username={profile.username || 'learner'}
          streak={profile.stats?.streak || 0}
          level={profile.level || 1}
          studyHours={profile.stats?.studyHours || 0}
          weeklyRank={profile.weeklyRank || 0}
          notesCount={profile.stats?.notesCount || 0}
          flashcardsCount={profile.stats?.flashcardsCount || 0}
        />
      )}

    </div>
  );
}
