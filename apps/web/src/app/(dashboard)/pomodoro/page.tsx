'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/providers/ToastProvider';
import api from '@/lib/axios';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { 
  Play, Pause, RotateCcw, SkipForward, Clock, 
  Flame, Award, History, Settings, Keyboard, Bell
} from 'lucide-react';

interface SessionLog {
  id: string;
  mode: string;
  duration: number; // in mins
  timestamp: string;
}

export default function PomodoroPage() {
  const { showToast } = useToast();

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

  // Confetti Particle animation state
  const [confettiActive, setConfettiActive] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Audio reference
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load state from local storage on mount
  useEffect(() => {
    // Sound buzzer
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-200.wav');

    const savedStreak = localStorage.getItem('pomo-streak');
    if (savedStreak) setStreak(parseInt(savedStreak, 10));

    const savedFocused = localStorage.getItem('pomo-focused-minutes');
    if (savedFocused) setTotalFocused(parseInt(savedFocused, 10));

    const savedHistory = localStorage.getItem('pomo-history');
    if (savedHistory) setCompletedSessions(JSON.parse(savedHistory));
  }, []);

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
      // Toggle play/pause on Space
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        setIsRunning((prev) => !prev);
      }
      // Reset timer on Esc
      if (e.code === 'Escape') {
        e.preventDefault();
        resetTimer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [timeLeft, activeMode]);

  // Reset timer
  const resetTimer = () => {
    setIsRunning(false);
    const mins = activeMode === 'CUSTOM' ? customMins : MODES[activeMode].minutes;
    setTimeLeft(mins * 60);
  };

  // Complete session
  const handleTimerComplete = () => {
    setIsRunning(false);
    
    // Buzz
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    }

    // Trigger Notification
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('StudySync AI Timer', {
        body: `Timer finished! Great job completing your session.`,
        icon: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-200.wav'
      });
    }

    const modeInfo = MODES[activeMode];
    const duration = activeMode === 'CUSTOM' ? customMins : modeInfo.minutes;

    if (modeInfo.type === 'focus' || activeMode === 'CUSTOM') {
      api.post('/pomodoro', { durationMinutes: duration }).catch(err => {
        console.error('Failed to save focus session to server:', err);
      });

      // Update statistics
      const updatedFocused = totalFocused + duration;
      setTotalFocused(updatedFocused);
      localStorage.setItem('pomo-focused-minutes', updatedFocused.toString());

      // Daily streak check
      const updatedStreak = streak + 1;
      setStreak(updatedStreak);
      localStorage.setItem('pomo-streak', updatedStreak.toString());

      showToast(`Completed a ${duration}m Focus block! Daily Streak: ${updatedStreak} 🔥`, 'success');
    } else {
      showToast('Break time completed! Ready to focus?', 'success');
    }

    // Append to history
    const log: SessionLog = {
      id: Math.random().toString(),
      mode: modeInfo.label,
      duration,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    const updatedHistory = [log, ...completedSessions].slice(0, 10);
    setCompletedSessions(updatedHistory);
    localStorage.setItem('pomo-history', JSON.stringify(updatedHistory));

    // Fire Confetti
    triggerConfetti();
    resetTimer();
  };

  // Skip / Forward
  const handleSkip = () => {
    setShowSkipConfirm(true);
  };

  // Formatter: mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Confetti particles canvas logic
  const triggerConfetti = () => {
    setConfettiActive(true);
    setTimeout(() => setConfettiActive(false), 4000);
  };

  useEffect(() => {
    if (!confettiActive || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#8B5CF6', '#10B981', '#F43F5E', '#F59E0B', '#3B82F6'];
    const particles = Array.from({ length: 150 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 4 + 2,
      d: Math.random() * canvas.height,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 5
    }));

    let animationFrameId: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p, idx) => {
        ctx.beginPath();
        ctx.lineWidth = p.r * 2;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
        ctx.stroke();

        // Physics ticks
        p.y += Math.cos(p.d) + 1 + p.r / 2;
        p.x += Math.sin(p.d) * 0.5;
        p.tilt = Math.sin(idx + p.y) * 1.5;

        // Reset particle on bottom bound
        if (p.y > canvas.height) {
          particles[idx] = {
            x: Math.random() * canvas.width,
            y: -20,
            r: p.r,
            d: p.d,
            color: p.color,
            tilt: p.tilt
          };
        }
      });
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [confettiActive]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 font-sans text-zinc-200 text-center relative min-h-screen">
      
      {/* Canvas for completion confetti particles */}
      {confettiActive && (
        <canvas 
          ref={canvasRef} 
          className="fixed inset-0 pointer-events-none z-50 w-full h-full"
        />
      )}

      {/* Header Banner */}
      <div className="flex flex-col items-center border-b border-zinc-800 pb-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
          <Clock className="h-7 w-7 text-violet-500" />
          Pomodoro Workspace
        </h1>
        <p className="text-zinc-500 text-sm mt-1 max-w-md">
          Improve concentration, segment study milestones, and protect mental clarity using interval structures.
        </p>
      </div>

      {/* Timer Modes Switch */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 bg-zinc-900 border border-zinc-800 p-1 rounded-2xl w-fit mx-auto">
        {(Object.keys(MODES) as Array<keyof typeof MODES>).map((key) => (
          <button
            key={key}
            onClick={() => setActiveMode(key)}
            className={`px-3 py-2 text-xs font-semibold rounded-xl transition cursor-pointer ${
              activeMode === key 
                ? 'bg-violet-600/10 text-violet-400 border border-violet-500/20' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {MODES[key].label}
          </button>
        ))}
      </div>

      {/* Main Core Timer Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start max-w-3xl mx-auto pt-4">
        
        {/* Left Metrics Column */}
        <div className="space-y-4 text-left">
          <div className="glass-card p-5 rounded-2xl border border-zinc-800 space-y-4">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
              <Award className="h-4 w-4 text-violet-500" />
              Focus Metrics
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-zinc-500 font-bold uppercase">Daily Streak</span>
                <span className="text-lg font-extrabold text-zinc-200 flex items-center gap-1">
                  <Flame className="h-4.5 w-4.5 text-orange-500 fill-orange-500/10" />
                  {streak} days
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-zinc-500 font-bold uppercase">Focused Time</span>
                <span className="text-lg font-extrabold text-zinc-200">
                  {totalFocused} min
                </span>
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts helper */}
          <div className="glass-card p-5 rounded-2xl border border-zinc-800 space-y-2 text-[10px] text-zinc-500 font-semibold">
            <h4 className="font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
              <Keyboard className="h-3.5 w-3.5" /> Shortcuts
            </h4>
            <div className="flex justify-between border-b border-zinc-850 pb-1.5">
              <span>Pause / Resume</span>
              <span className="bg-zinc-850 border border-zinc-800 px-1 rounded text-zinc-400">Spacebar</span>
            </div>
            <div className="flex justify-between">
              <span>Reset Timer</span>
              <span className="bg-zinc-850 border border-zinc-800 px-1 rounded text-zinc-400">Escape</span>
            </div>
          </div>
        </div>

        {/* Center Circular Timer View */}
        <div className="flex flex-col items-center gap-6 justify-center">
          {/* Glowing circular display */}
          <div className="h-56 w-56 rounded-full border-4 border-violet-500/25 flex flex-col items-center justify-center relative bg-gradient-to-b from-violet-600/5 to-transparent shadow-[0_0_50px_rgba(139,92,246,0.1)]">
            <span className="text-4xl font-extrabold font-mono tracking-tight text-zinc-100">
              {formatTime(timeLeft)}
            </span>
            <span className="text-[9px] uppercase font-extrabold text-zinc-500 tracking-widest mt-1">
              {isRunning ? 'Engaged' : 'Paused'}
            </span>

            {/* Glowing active outer status border */}
            {isRunning && (
              <div className="absolute inset-0 rounded-full border border-violet-500 animate-ping opacity-10 pointer-events-none" />
            )}
          </div>

          {/* Custom timer options if active */}
          {activeMode === 'CUSTOM' && (
            <div className="flex items-center gap-2.5 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5">
              <span className="text-[10px] font-bold text-zinc-500 uppercase">Minutes:</span>
              <input
                type="number"
                min={1}
                max={180}
                value={customMins}
                onChange={(e) => setCustomMins(Math.max(1, parseInt(e.target.value, 10)))}
                className="w-12 bg-transparent text-center text-xs font-bold text-violet-400 outline-none"
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={resetTimer}
              title="Reset Timer"
              className="p-3 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 rounded-full shadow transition-all cursor-pointer"
            >
              <RotateCcw className="h-4.5 w-4.5" />
            </button>

            <button
              onClick={() => setIsRunning(!isRunning)}
              className="px-8 py-3.5 bg-violet-600 hover:bg-violet-550 text-white font-extrabold text-xs tracking-wider uppercase rounded-full shadow-lg transition-all flex items-center gap-2 cursor-pointer"
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
              className="p-3 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 rounded-full shadow transition-all cursor-pointer"
            >
              <SkipForward className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Right Session History Column */}
        <div className="glass-card p-5 rounded-2xl border border-zinc-800 text-left space-y-4">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-zinc-800 pb-2">
            <History className="h-4 w-4 text-violet-500" />
            Recent Sessions
          </h3>

          <div className="space-y-2">
            {completedSessions.length === 0 ? (
              <div className="text-center py-8 text-zinc-650 text-[10px] italic">No completed sessions logged.</div>
            ) : (
              completedSessions.map((log) => (
                <div 
                  key={log.id}
                  className="flex items-center justify-between p-2.5 bg-zinc-900/40 border border-zinc-850 rounded-xl"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[11px] font-semibold truncate leading-tight">{log.mode}</span>
                    <span className="text-[9px] text-zinc-500 font-medium">At {log.timestamp}</span>
                  </div>
                  <span className="text-[9px] font-bold text-violet-400 bg-violet-600/5 px-2 py-0.5 rounded border border-violet-500/10 shrink-0">
                    +{log.duration}m
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

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
