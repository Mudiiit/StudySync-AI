'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/providers/ToastProvider';
import api from '@/lib/axios';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { 
  Play, Pause, RotateCcw, SkipForward, Clock, 
  Flame, Award, History, Settings, Keyboard, Bell,
  Sparkles, Brain, ShieldCheck, Activity, Target, Zap,
  Volume2, Eye, Minimize2, CheckCircle2, ChevronRight, AlertCircle
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useFlashcardStats } from '@/hooks/useFlashcards';
import { useAttemptsHistory } from '@/hooks/useQuizzes';
import { useNotebooks, useNotesList } from '@/hooks/useNotes';
import { useTasksList, useWorkspaces } from '@/hooks/useTasks';

interface SessionLog {
  id: string;
  mode: string;
  duration: number; // in mins
  timestamp: string;
  topic: string;
  xpEarned: number;
}

export default function PomodoroPage() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const { data: fcStats } = useFlashcardStats();
  const { data: qStats } = useAttemptsHistory();
  const { data: notebooks } = useNotebooks();
  const { data: notesData } = useNotesList({ archived: false, deleted: false });
  const { data: workspaces } = useWorkspaces();
  const activeWorkspaceId = workspaces?.[0]?.id || null;
  const { data: tasksData } = useTasksList({ workspaceId: activeWorkspaceId });

  // Timer modes
  const MODES = {
    FOCUS_25: { label: 'Focus (25m)', minutes: 25, type: 'focus' },
    SHORT_5: { label: 'Short Break (5m)', minutes: 5, type: 'break' },
    FOCUS_50: { label: 'Extreme Focus (50m)', minutes: 50, type: 'focus' },
    LONG_10: { label: 'Long Break (10m)', minutes: 10, type: 'break' },
    CUSTOM: { label: 'Custom Timer', minutes: 25, type: 'custom' }
  };

  const [activeMode, setActiveMode] = useState<keyof typeof MODES>('FOCUS_25');
  const [customMins, setCustomMins] = useState(25);
  
  // Timer States
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [streak, setStreak] = useState(3);
  const [totalFocused, setTotalFocused] = useState(120); // total focused minutes
  const [completedSessions, setCompletedSessions] = useState<SessionLog[]>([]);

  // Sound and Mode Settings
  const [soundMode, setSoundMode] = useState<'rain' | 'forest' | 'cafe' | 'white' | 'brown' | 'none'>('none');
  const [viewMode, setViewMode] = useState<'standard' | 'zen' | 'minimal'>('standard');
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [ambientVolume, setAmbientVolume] = useState(0.5);

  // Reflection States
  const [showReflection, setShowReflection] = useState(false);
  const [reflectionData, setReflectionData] = useState<{ duration: number; xp: number; topic: string } | null>(null);
  
  // Audio references
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioElementsRef = useRef<{ [key: string]: HTMLAudioElement | null }>({});

  // 1. Load state from local storage & Restore Timer Persistence
  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-200.wav');

    const savedStreak = localStorage.getItem('pomo-streak');
    if (savedStreak) setStreak(parseInt(savedStreak, 10));

    const savedFocused = localStorage.getItem('pomo-focused-minutes');
    if (savedFocused) setTotalFocused(parseInt(savedFocused, 10));

    const savedHistory = localStorage.getItem('pomo-history');
    if (savedHistory) setCompletedSessions(JSON.parse(savedHistory));

    const savedSound = localStorage.getItem('pomo-sound-mode');
    if (savedSound) setSoundMode(savedSound as any);

    const savedVolume = localStorage.getItem('pomo-sound-volume');
    if (savedVolume) setAmbientVolume(parseFloat(savedVolume));

    // Restore timer state
    const savedState = localStorage.getItem('pomo-timer-state');
    if (savedState) {
      const parsed = JSON.parse(savedState);
      if (!parsed.pausedState && parsed.saveTime) {
        const elapsedSeconds = Math.floor((Date.now() - parsed.saveTime) / 1000);
        const remaining = Math.max(0, parsed.timeLeft - elapsedSeconds);
        setTimeLeft(remaining);
        setIsRunning(remaining > 0);
        if (remaining === 0) {
          handleTimerComplete();
        }
      } else {
        setTimeLeft(parsed.timeLeft);
        setIsRunning(false);
      }
      setActiveMode(parsed.activeMode || 'FOCUS_25');
    }
  }, []);

  // Persist timer state to localStorage whenever it ticks
  useEffect(() => {
    const stateToSave = {
      timeLeft,
      pausedState: !isRunning,
      saveTime: Date.now(),
      activeMode
    };
    localStorage.setItem('pomo-timer-state', JSON.stringify(stateToSave));
  }, [timeLeft, isRunning, activeMode]);

  // Update timer on mode change
  useEffect(() => {
    resetTimer();
  }, [activeMode, customMins]);

  // Request notifications permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  const fadeOutAudio = (audio: HTMLAudioElement, duration = 1500) => {
    const startVolume = audio.volume;
    const steps = 15;
    const stepVolume = startVolume / steps;
    const stepDuration = duration / steps;
    
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        audio.volume = 0;
        audio.pause();
        audio.currentTime = 0;
        audio.volume = startVolume; // restore original volume
        clearInterval(interval);
      } else {
        audio.volume = Math.max(0, startVolume - (stepVolume * currentStep));
      }
    }, stepDuration);
  };

  // Ambient Audio Player engine
  const playAmbientSound = (type: string, volume: number) => {
    Object.keys(audioElementsRef.current).forEach((key) => {
      const audio = audioElementsRef.current[key];
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    });

    if (type === 'none') return;

    let path = '';
    if (type === 'rain') path = '/audio/rain.mp3';
    else if (type === 'forest') path = '/audio/forest.mp3';
    else if (type === 'cafe') path = '/audio/cafe.mp3';
    else if (type === 'white') path = '/audio/white-noise.mp3';
    else if (type === 'brown') path = '/audio/brown-noise.mp3';

    if (path) {
      if (!audioElementsRef.current[type]) {
        const audio = new Audio(path);
        audio.loop = true;
        audio.preload = 'metadata';
        audio.addEventListener('error', (e) => {
          showToast('Ambient sound unavailable.', 'error');
          if (process.env.NODE_ENV === 'development') {
            console.error(`[AudioManager Error] Failed to load asset at ${path}:`, e);
          }
        });
        audioElementsRef.current[type] = audio;
      }
      const activeAudio = audioElementsRef.current[type];
      if (activeAudio) {
        activeAudio.volume = volume;
        activeAudio.play().catch((err) => {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[AudioManager Autoplay] Playback was prevented by browser policy:', err);
          }
        });
      }
    }
  };

  // Sync ambient play states
  useEffect(() => {
    if (isRunning) {
      playAmbientSound(soundMode, ambientVolume);
    } else {
      // Pause ambient audio when timer is paused
      Object.keys(audioElementsRef.current).forEach((key) => {
        const audio = audioElementsRef.current[key];
        if (audio) {
          audio.pause();
        }
      });
    }
  }, [soundMode, isRunning]);

  // Adjust volume dynamically
  useEffect(() => {
    Object.keys(audioElementsRef.current).forEach((key) => {
      const audio = audioElementsRef.current[key];
      if (audio) {
        audio.volume = ambientVolume;
      }
    });
    localStorage.setItem('pomo-sound-volume', ambientVolume.toString());
  }, [ambientVolume]);

  // Save sound mode setting
  useEffect(() => {
    localStorage.setItem('pomo-sound-mode', soundMode);
  }, [soundMode]);

  // Clean up audio references on unmount
  useEffect(() => {
    return () => {
      Object.keys(audioElementsRef.current).forEach((key) => {
        const audio = audioElementsRef.current[key];
        if (audio) {
          audio.pause();
          audioElementsRef.current[key] = null;
        }
      });
    };
  }, []);

  // Active Timer Tick
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      handleTimerComplete();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft]);

  // Keyboard shortcut listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsRunning((prev) => !prev);
      }
      if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        resetTimer();
        showToast('Timer Reset', 'info');
      }
      if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSkip();
      }
      if (e.key.toLowerCase() === 'z') {
        e.preventDefault();
        setViewMode((prev) => prev === 'zen' ? 'standard' : 'zen');
      }
      if (e.code === 'Escape') {
        e.preventDefault();
        setViewMode('standard');
      }
      if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setSoundMode((prev) => prev === 'none' ? 'rain' : 'none');
        showToast('Ambient Audio Toggled', 'info');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [timeLeft, activeMode, soundMode]);

  const handleSkip = () => {
    setShowSkipConfirm(true);
  };

  // Reset timer
  const resetTimer = () => {
    setIsRunning(false);
    const mins = activeMode === 'CUSTOM' ? customMins : MODES[activeMode].minutes;
    setTimeLeft(mins * 60);
  };

  // Complete session
  const handleTimerComplete = () => {
    setIsRunning(false);
    
    // Fade out active ambient sound
    Object.keys(audioElementsRef.current).forEach((key) => {
      const audio = audioElementsRef.current[key];
      if (audio && !audio.paused) {
        fadeOutAudio(audio);
      }
    });
    
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    }

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('✅ Focus Session Complete', {
        body: `Timer finished! Great job completing your session.`,
        icon: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-200.wav'
      });
    }

    const modeInfo = MODES[activeMode];
    const duration = activeMode === 'CUSTOM' ? customMins : modeInfo.minutes;
    const earnedXP = duration * 3;

    if (modeInfo.type === 'focus' || activeMode === 'CUSTOM') {
      api.post('/pomodoro', { durationMinutes: duration }).catch(err => {
        console.error('Failed to save focus session to server:', err);
      });

      // Update statistics
      const updatedFocused = totalFocused + duration;
      setTotalFocused(updatedFocused);
      localStorage.setItem('pomo-focused-minutes', updatedFocused.toString());

      const updatedStreak = streak + 1;
      setStreak(updatedStreak);
      localStorage.setItem('pomo-streak', updatedStreak.toString());

      setReflectionData({
        duration,
        xp: earnedXP,
        topic: firstNotebookTitle
      });
      setShowReflection(true);
    } else {
      showToast('Break time completed! Ready to focus?', 'success');
    }

    // Append to history
    const log: SessionLog = {
      id: Math.random().toString(),
      mode: modeInfo.label,
      duration,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      topic: firstNotebookTitle,
      xpEarned: earnedXP
    };
    const updatedHistory = [log, ...completedSessions].slice(0, 10);
    setCompletedSessions(updatedHistory);
    localStorage.setItem('pomo-history', JSON.stringify(updatedHistory));

    resetTimer();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Derived variables
  const userFirstName = user?.profile?.firstName || 'Student';
  const streakDays = fcStats?.streak || streak;
  const retentionAccuracy = fcStats?.accuracy || 95;
  const firstNotebookTitle = notebooks?.[0]?.title || 'Operating Systems';
  const activePlannerTasksCount = tasksData?.tasks?.length || 0;
  const completedAttempts = qStats?.length || 0;

  // Circular progress calculations
  const currentDuration = activeMode === 'CUSTOM' ? customMins * 60 : MODES[activeMode].minutes * 60;
  const strokeDashoffset = 2 * Math.PI * 90 * (1 - timeLeft / currentDuration);

  return (
    <div className="flex-1 flex flex-col gap-8 p-6 max-w-7xl mx-auto w-full font-sans text-xs text-zinc-350 select-none bg-[#070708]/10 min-h-screen">
      
      {/* Zen Mode Floating Exit Button */}
      {viewMode === 'zen' && (
        <button
          onClick={() => setViewMode('standard')}
          className="fixed top-6 right-6 z-40 bg-zinc-900/85 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white px-5 py-2.5 rounded-full flex items-center gap-2 font-bold shadow-xl transition cursor-pointer"
        >
          <Minimize2 className="h-4 w-4" />
          <span>Exit Zen Mode (Esc)</span>
        </button>
      )}

      {/* 1. AI FOCUS HERO */}
      {viewMode === 'standard' && (
        <div className="relative overflow-hidden rounded-3xl border border-zinc-900 bg-zinc-950/20 backdrop-blur-md p-6 sm:p-8 flex flex-col gap-6 text-left">
          <div className="absolute top-0 right-0 w-80 h-80 bg-violet-650/5 rounded-full blur-3xl -z-10 pointer-events-none" />
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5 text-violet-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-violet-400">Deep Work Protocol</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-sans">
                AI Focus Operating System
              </h1>
              <p className="text-zinc-400 max-w-2xl text-[11px] leading-relaxed font-medium">
                Optimize deep work sessions using AI-powered productivity intelligence, adaptive focus scheduling, cognitive load prediction, and planner synchronization.
              </p>
            </div>

            {/* Timer View mode switcher */}
            <div className="flex bg-zinc-900/60 border border-zinc-800 p-1 rounded-xl shrink-0 self-end md:self-auto">
              <button 
                onClick={() => setViewMode('standard')} 
                className={`px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider transition cursor-pointer ${(viewMode as string) === 'standard' ? 'bg-violet-600 text-white shadow-sm' : 'text-zinc-555 hover:text-zinc-350'}`}
              >
                Dashboard
              </button>
              <button 
                onClick={() => setViewMode('zen')} 
                className={`px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider transition cursor-pointer ${(viewMode as string) === 'zen' ? 'bg-violet-600 text-white shadow-sm' : 'text-zinc-555 hover:text-zinc-350'}`}
              >
                Zen
              </button>
            </div>
          </div>

          {/* Productivity metrics indicators */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-zinc-900">
            {[
              { label: "Today's Focus Score", val: '94/100', trend: 'Optimal', color: 'text-violet-400', desc: 'Focus continuity & consistency' },
              { label: 'Weekly Focus Hours', val: `${(totalFocused / 60).toFixed(1)} hrs`, trend: '▲ +2.4h', color: 'text-emerald-400', desc: 'Deep work time duration' },
              { label: 'Current Focus Streak', val: `${streakDays} Days`, trend: 'Stable 🔥', color: 'text-orange-400', desc: 'Daily Pomodoro streaks' },
              { label: 'AI Burnout Risk', val: 'Low', trend: '95% stability', color: 'text-cyan-400', desc: 'Predicted fatigue levels' }
            ].map((metric, idx) => (
              <div key={idx} className="p-4 rounded-2xl border border-zinc-900 bg-zinc-950/40 flex flex-col justify-between gap-1 shadow-sm hover:border-zinc-800 transition">
                <span className="text-[9.5px] uppercase font-black tracking-widest text-zinc-550 block">{metric.label}</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className={`text-xl font-black tracking-tight ${metric.color}`}>{metric.val}</span>
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{metric.trend}</span>
                </div>
                <span className="text-[9px] text-zinc-500 mt-1 block leading-tight font-medium">{metric.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid Workspace */}
      <div className={`grid grid-cols-1 ${viewMode === 'standard' ? 'lg:grid-cols-12' : 'max-w-2xl mx-auto w-full'} gap-6 text-left`}>
        
        {/* Left / Center Column: Session engine timer and sound settings */}
        <div className={`${viewMode === 'standard' ? 'lg:col-span-8' : 'w-full'} flex flex-col gap-6`}>
          
          {/* Main Focus Center Timer Card */}
          <div className="border border-zinc-900 bg-zinc-950/20 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-lg flex flex-col items-center gap-6 justify-center relative overflow-hidden">
            {/* Reflection completed session screen overlay */}
            {showReflection && reflectionData && (
              <div className="absolute inset-0 bg-[#070708]/95 z-35 flex flex-col justify-center p-6 text-center max-w-xl mx-auto w-full animate-fade-in">
                <div className="space-y-4">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-450">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-black text-white tracking-tight">Session Focus Reflection</h3>
                  <p className="text-zinc-400 text-xs">You have completed a {reflectionData.duration}m Deep Work session on {reflectionData.topic}!</p>
                  
                  <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto pt-3 pb-3">
                    <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col gap-0.5">
                      <span className="text-[9px] text-zinc-500 font-bold uppercase">XP Earned</span>
                      <span className="text-sm font-black text-emerald-400">+{reflectionData.xp} XP</span>
                    </div>
                    <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col gap-0.5">
                      <span className="text-[9px] text-zinc-500 font-bold uppercase">Focus Score</span>
                      <span className="text-sm font-black text-violet-400">96/100</span>
                    </div>
                    <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col gap-0.5">
                      <span className="text-[9px] text-zinc-500 font-bold uppercase">Retention</span>
                      <span className="text-sm font-black text-cyan-400">+12%</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-center gap-3">
                    <button 
                      onClick={() => setShowReflection(false)} 
                      className="px-6 py-2.5 bg-violet-600 hover:bg-violet-550 text-white font-extrabold text-[10.5px] uppercase tracking-wider rounded-xl transition cursor-pointer"
                    >
                      Continue study session
                    </button>
                    <button 
                      onClick={() => {
                        setShowReflection(false);
                        window.location.href = '/planner';
                      }}
                      className="px-6 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold text-[10.5px] uppercase tracking-wider rounded-xl hover:bg-zinc-850 transition cursor-pointer"
                    >
                      Update planner milestones
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Timer Modes Switch */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 bg-zinc-900/60 border border-zinc-855 p-1 rounded-2xl w-fit">
              {(Object.keys(MODES) as Array<keyof typeof MODES>).map((key) => (
                <button
                  key={key}
                  onClick={() => setActiveMode(key)}
                  className={`px-3 py-2 text-[10px] uppercase tracking-wider font-extrabold rounded-xl transition cursor-pointer ${
                    activeMode === key 
                      ? 'bg-violet-655/10 text-violet-400 border border-violet-500/10' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {MODES[key].label}
                </button>
              ))}
            </div>

            {/* SVG Circular Timer Progress Engine */}
            <div className="relative h-60 w-60 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                <circle 
                  cx="100" 
                  cy="100" 
                  r="90" 
                  fill="none" 
                  stroke="#121214" 
                  strokeWidth="5" 
                />
                <circle 
                  cx="100" 
                  cy="100" 
                  r="90" 
                  fill="none" 
                  stroke="url(#timerGrad)" 
                  strokeWidth="5.5" 
                  strokeDasharray="565.48" 
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />
                
                <defs>
                  <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#d946ef" />
                  </linearGradient>
                </defs>
              </svg>

              <div className="flex flex-col items-center justify-center z-10">
                <span className="text-5xl font-black font-mono tracking-tight text-white select-all">
                  {formatTime(timeLeft)}
                </span>
                <span className="text-[9px] uppercase font-black text-zinc-500 tracking-widest mt-2 flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-500 animate-ping' : 'bg-zinc-650'}`} />
                  {isRunning ? 'Engaged' : 'Paused'}
                </span>
              </div>
            </div>

            {/* Active session indicators details */}
            <div className="flex items-center gap-4 text-[10px] text-zinc-500 font-bold font-mono py-1 border-t border-zinc-900 w-full max-w-sm justify-between">
              <span>Goal: {firstNotebookTitle}</span>
              <span>XP Yield: +{activeMode === 'CUSTOM' ? customMins * 3 : MODES[activeMode].minutes * 3} XP</span>
              <span>Stability: {retentionAccuracy}%</span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={resetTimer}
                title="Reset Timer"
                className="p-3.5 bg-zinc-900 border border-zinc-800 text-zinc-455 hover:text-zinc-200 hover:bg-zinc-850 rounded-full shadow transition-all cursor-pointer focus:outline-none"
              >
                <RotateCcw className="h-4.5 w-4.5" />
              </button>

              <button
                onClick={() => setIsRunning(!isRunning)}
                className="px-10 py-4 bg-violet-600 hover:bg-violet-550 text-white font-black text-xs tracking-widest uppercase rounded-full shadow-lg shadow-violet-900/10 transition-all flex items-center gap-2 cursor-pointer focus:outline-none"
              >
                {isRunning ? (
                  <>
                    <Pause className="h-4 w-4" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" /> Start
                  </>
                )}
              </button>

              <button
                onClick={handleSkip}
                title="Skip Session"
                className="p-3.5 bg-zinc-900 border border-zinc-800 text-zinc-455 hover:text-zinc-200 hover:bg-zinc-850 rounded-full shadow transition-all cursor-pointer focus:outline-none"
              >
                <SkipForward className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* Ambient sound and Zen controls */}
          <div className="border border-zinc-900 bg-zinc-950/20 backdrop-blur-md rounded-3xl p-5 shadow-lg flex flex-col gap-4 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-900 pb-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-violet-400" />
                Ambient Focus Controls
              </h3>
              
              {/* Volume Slider controller */}
              <div className="flex items-center gap-2 max-w-xs w-full sm:w-48">
                <span className="text-[9px] font-bold text-zinc-550 uppercase">Vol:</span>
                <input 
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={ambientVolume}
                  onChange={(e) => setAmbientVolume(parseFloat(e.target.value))}
                  className="w-full h-1 bg-zinc-905 rounded-lg appearance-none cursor-pointer accent-violet-500"
                />
                <span className="text-[9.5px] font-bold text-zinc-400 font-mono w-8 text-right">{Math.round(ambientVolume * 100)}%</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {[
                { type: 'none', label: 'Silence' },
                { type: 'rain', label: 'Rain' },
                { type: 'forest', label: 'Forest' },
                { type: 'cafe', label: 'Cafe' },
                { type: 'white', label: 'White noise' },
                { type: 'brown', label: 'Brown noise' }
              ].map((sound) => (
                <button
                  key={sound.type}
                  onClick={() => {
                    setSoundMode(sound.type as any);
                    showToast(`Ambient audio calibration: ${sound.label}`, 'info');
                  }}
                  className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                    soundMode === sound.type 
                      ? 'bg-violet-650/15 border-violet-500/25 text-violet-400 font-extrabold shadow-sm' 
                      : 'border-zinc-900 bg-zinc-950/30 hover:border-zinc-800 text-zinc-500 font-bold hover:text-zinc-300'
                  }`}
                >
                  {sound.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar Columns */}
        {viewMode === 'standard' && (
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* AI Focus Briefing & Recommendations */}
            <div className="border border-zinc-900 bg-zinc-950/20 backdrop-blur-md rounded-3xl p-5 shadow-lg flex flex-col gap-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 border-b border-zinc-900 pb-3">
                <Brain className="w-4 h-4 text-violet-400 animate-pulse" />
                AI Focus Briefing
              </h3>
              
              <div className="space-y-4">
                <div className="p-4 bg-zinc-900/30 border border-zinc-850 rounded-2xl text-[10.5px] leading-relaxed text-zinc-400 font-semibold">
                  "Optimizing focus schedule calibration. Recommended study blocks: 50 minutes extreme focus on {firstNotebookTitle}. Expected memory retention stability curve will increase +12% post-session."
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-555 block">Next Action Insights</span>
                  <div className="space-y-2">
                    {[
                      { title: `Revise ${firstNotebookTitle} Notes`, xp: '+40 XP', duration: '15m', icon: ShieldCheck, color: 'text-violet-400' },
                      { title: 'Update Spaced Repetitions', xp: '+30 XP', duration: '10m', icon: Clock, color: 'text-orange-400' }
                    ].map((item, idx) => (
                      <div key={idx} className="p-3 border border-zinc-900 bg-zinc-950/40 rounded-xl flex items-center justify-between gap-2 hover:border-zinc-850 transition duration-300">
                        <div className="flex items-center gap-2">
                          <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                          <div className="flex flex-col">
                            <span className="text-[10px] font-extrabold text-zinc-200">{item.title}</span>
                            <span className="text-[8.5px] text-zinc-550">{item.duration} recommended</span>
                          </div>
                        </div>
                        <span className="text-[9.5px] font-black text-emerald-450">{item.xp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Distraction Intelligence & Cognitive Load monitoring */}
            <div className="border border-zinc-900 bg-zinc-950/20 backdrop-blur-md rounded-3xl p-5 shadow-lg flex flex-col gap-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 border-b border-zinc-900 pb-3">
                <Activity className="w-4 h-4 text-violet-400" />
                Distraction Intelligence
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Distraction risk rate', val: 'Low', score: '12% risk' },
                  { label: 'Streak stability', val: '96%', score: 'High quality' },
                  { label: 'Cognitive load', val: 'Medium', score: 'Fatigue forecast' },
                  { label: 'Recommended break', val: '5 mins', score: 'Adherence optimal' }
                ].map((stat, idx) => (
                  <div key={idx} className="p-3 bg-zinc-955/30 border border-zinc-900 rounded-xl flex flex-col justify-between gap-1 shadow-sm">
                    <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider leading-tight">{stat.label}</span>
                    <span className="text-xs font-extrabold text-zinc-200 mt-0.5">{stat.val}</span>
                    <span className="text-[9px] text-zinc-500 font-semibold">{stat.score}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Study Timeline history */}
            <div className="border border-zinc-900 bg-zinc-950/20 backdrop-blur-md rounded-3xl p-5 shadow-lg flex flex-col gap-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 border-b border-zinc-900 pb-3">
                <History className="h-4 w-4 text-violet-400" />
                Focus Timeline
              </h3>
              <div className="space-y-3">
                {completedSessions.length === 0 ? (
                  <div className="text-center py-6 text-zinc-650 text-[10px] italic">
                    No focus sessions logged. Start your first session to build timeline.
                  </div>
                ) : (
                  completedSessions.slice(0, 4).map((log) => (
                    <div 
                      key={log.id}
                      className="flex items-center justify-between p-2.5 bg-zinc-900/40 border border-zinc-850 rounded-xl"
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-[10px] font-extrabold text-zinc-200 truncate leading-tight">{log.mode}</span>
                        <span className="text-[9px] text-zinc-500 font-semibold">At {log.timestamp} • {log.topic}</span>
                      </div>
                      <span className="text-[9px] font-bold text-violet-400 bg-violet-650/5 px-2 py-0.5 rounded border border-violet-500/10 shrink-0">
                        +{log.duration}m
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

      </div>

      <ConfirmModal
        isOpen={showSkipConfirm}
        onClose={() => setShowSkipConfirm(false)}
        onConfirm={resetTimer}
        title="Skip Active Session"
        message="Are you sure you want to skip the active timer session block?"
        confirmLabel="Skip Session"
        cancelLabel="Keep Going"
        type="warning"
      />
    </div>
  );
}
