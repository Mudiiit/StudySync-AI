'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/components/providers/ToastProvider';
import { 
  Calendar as CalendarIcon, Sparkles, Loader2, Plus, 
  Trash2, Check, Clock, ShieldAlert,
  Zap, Flame, Award, ChevronLeft, ChevronRight, BarChart3, Settings,
  RefreshCw, Layers, Sparkle, HelpCircle, AlertTriangle, CalendarDays, Brain, Activity, User, Compass
} from 'lucide-react';
import api from '@/lib/axios';
import { motion, AnimatePresence } from 'framer-motion';

interface CalendarEventItem {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  category: 'STUDY' | 'EXAM' | 'ASSIGNMENT' | 'PERSONAL' | 'HOLIDAY' | 'POMODORO' | 'REVISION' | 'QUIZ' | 'MEETING';
  difficulty?: 'HARD' | 'MEDIUM' | 'EASY';
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  energyRequired?: 'HIGH' | 'MEDIUM' | 'LOW';
  xpReward?: number;
  aiReason?: string;
  isCompleted?: boolean;
  durationMins?: number;
  focusScore?: number;
  expectedRetention?: number;
  energyCost?: number;
}

type ViewMode = 'month' | 'week' | 'day' | 'agenda';

export default function CalendarPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2026, 6, 23)); // Local timezone context (July 2026)
  
  // Navigation states
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);

  // Optimization before/after state
  const [isOptimized, setIsOptimized] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  // Form States
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [category, setCategory] = useState<CalendarEventItem['category']>('STUDY');
  const [difficulty, setDifficulty] = useState<'HARD' | 'MEDIUM' | 'EASY'>('MEDIUM');
  const [priority, setPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');
  const [preferredEnergy, setPreferredEnergy] = useState<'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT'>('AFTERNOON');
  const [repeatRule, setRepeatRule] = useState('NONE');
  const [eventColor, setEventColor] = useState('#8b5cf6');

  // Floating celebration XP state
  const [xpAnimation, setXpAnimation] = useState<{ show: boolean; amount: number; x: number; y: number } | null>(null);

  // Default Mock Events Database representing a busy student schedule
  const [events, setEvents] = useState<CalendarEventItem[]>([
    {
      id: 'evt-1',
      title: 'Operating Systems Exam Prep',
      description: 'Review memory management, thrashing, and paging algorithms.',
      startTime: '2026-07-23T09:00:00.000Z',
      endTime: '2026-07-23T10:30:00.000Z',
      category: 'STUDY',
      difficulty: 'HARD',
      priority: 'HIGH',
      energyRequired: 'HIGH',
      xpReward: 120,
      aiReason: 'Scheduled because OS Exam is approaching and spaced repetition window is optimal.',
      isCompleted: false,
      durationMins: 90,
      focusScore: 92,
      expectedRetention: 88,
      energyCost: 80
    },
    {
      id: 'evt-2',
      title: 'Computer Architecture Quiz Drill',
      description: 'Practice pipelining hazard mitigation questions.',
      startTime: '2026-07-23T11:00:00.000Z',
      endTime: '2026-07-23T12:00:00.000Z',
      category: 'QUIZ',
      difficulty: 'HARD',
      priority: 'HIGH',
      energyRequired: 'HIGH',
      xpReward: 100,
      aiReason: 'Low architecture quiz performance logged. Re-evaluating pipelining.',
      isCompleted: false,
      durationMins: 60,
      focusScore: 85,
      expectedRetention: 82,
      energyCost: 90
    },
    {
      id: 'evt-3',
      title: 'Database Systems Revision',
      description: 'Review B-Tree indexes and execution plan optimization.',
      startTime: '2026-07-23T14:00:00.000Z',
      endTime: '2026-07-23T15:00:00.000Z',
      category: 'REVISION',
      difficulty: 'MEDIUM',
      priority: 'MEDIUM',
      energyRequired: 'MEDIUM',
      xpReward: 80,
      aiReason: 'Memory stability dropped below 70% for indexing structures.',
      isCompleted: true,
      durationMins: 60,
      focusScore: 95,
      expectedRetention: 90,
      energyCost: 50
    },
    {
      id: 'evt-4',
      title: 'Linear Algebra Homework',
      description: 'Compute eigenvectors and solve diagonal matrices.',
      startTime: '2026-07-23T22:30:00.000Z',
      endTime: '2026-07-23T23:30:00.000Z',
      category: 'ASSIGNMENT',
      difficulty: 'EASY',
      priority: 'LOW',
      energyRequired: 'LOW',
      xpReward: 50,
      aiReason: 'Assigned to avoid late night penalty on the homework server.',
      isCompleted: false,
      durationMins: 60,
      focusScore: 70,
      expectedRetention: 65,
      energyCost: 35
    },
    // Other days mock events
    {
      id: 'evt-5',
      title: 'Machine Learning Seminar',
      startTime: '2026-07-24T10:00:00.000Z',
      endTime: '2026-07-24T11:30:00.000Z',
      category: 'MEETING',
      difficulty: 'MEDIUM',
      priority: 'MEDIUM',
      xpReward: 90,
      isCompleted: false,
      durationMins: 90
    },
    {
      id: 'evt-6',
      title: 'Compiler Design Lab',
      startTime: '2026-07-22T14:00:00.000Z',
      endTime: '2026-07-22T16:00:00.000Z',
      category: 'STUDY',
      difficulty: 'HARD',
      priority: 'HIGH',
      xpReward: 140,
      isCompleted: true,
      durationMins: 120
    }
  ]);

  // Conflict state
  const [conflicts, setConflicts] = useState([
    { id: 'conf-1', type: '🌙 Sleep Conflict', message: 'Linear Algebra homework scheduled past 10:00 PM blocks essential recovery.', severity: 'high', confidence: '96%', actionText: 'Reschedule to Morning' },
    { id: 'conf-2', type: '⚠ Burnout', message: 'No break buffer allocated between OS Prep and Architecture Quiz.', severity: 'medium', confidence: '92%', actionText: 'Insert Buffer' }
  ]);

  // Keyboard Navigation shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside form inputs
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'SELECT') {
        return;
      }
      
      switch (e.key.toLowerCase()) {
        case 'arrowleft':
          setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
          showToast('Navigated to previous month', 'info');
          break;
        case 'arrowright':
          setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
          showToast('Navigated to next month', 'info');
          break;
        case 't':
          setSelectedDate(new Date(2026, 6, 23));
          showToast('Jumped to Today', 'info');
          break;
        case 'm':
          setViewMode('month');
          break;
        case 'w':
          setViewMode('week');
          break;
        case 'd':
          setViewMode('day');
          break;
        case 'a':
          setViewMode('agenda');
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startTime || !endTime) {
      showToast('Title and timestamps are required', 'info');
      return;
    }

    try {
      const startISO = new Date(startTime).toISOString();
      const endISO = new Date(endTime).toISOString();

      const newEvt: CalendarEventItem = {
        id: `evt-${Date.now()}`,
        title,
        description,
        startTime: startISO,
        endTime: endISO,
        category,
        difficulty,
        priority,
        energyRequired: priority === 'HIGH' ? 'HIGH' : priority === 'MEDIUM' ? 'MEDIUM' : 'LOW',
        xpReward: priority === 'HIGH' ? 120 : priority === 'MEDIUM' ? 80 : 50,
        aiReason: 'Custom scheduled according to student energy patterns.',
        isCompleted: false,
        durationMins: Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000),
        focusScore: difficulty === 'HARD' ? 90 : difficulty === 'MEDIUM' ? 80 : 70,
        expectedRetention: difficulty === 'HARD' ? 85 : 78
      };

      setEvents(prev => [...prev, newEvt]);
      showToast('Event created successfully', 'success');

      // Reset
      setTitle('');
      setDescription('');
      setStartTime('');
      setEndTime('');
    } catch (err: any) {
      showToast('Failed to create calendar event', 'error');
    }
  };

  const handleDeleteEvent = (id: string) => {
    setEvents(prev => prev.filter(evt => evt.id !== id));
    showToast('Event removed', 'success');
  };

  const handleToggleComplete = (id: string, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const target = events.find(evt => evt.id === id);
    if (!target) return;

    const isFinishing = !target.isCompleted;

    setEvents(prev =>
      prev.map(evt => evt.id === id ? { ...evt, isCompleted: !evt.isCompleted } : evt)
    );

    if (isFinishing) {
      setXpAnimation({
        show: true,
        amount: target.xpReward || 80,
        x: rect.left + rect.width / 2,
        y: rect.top
      });
      showToast('Focus session complete! XP accrued.', 'success');
      setTimeout(() => setXpAnimation(null), 1000);
    }
  };

  // Timeline optimizer week logic simulation
  const handleOptimizeWeek = async () => {
    setOptimizing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      // Rebalance late night and overlap events
      setEvents(prev =>
        prev.map(evt => {
          if (evt.id === 'evt-4') {
            // Move Linear Algebra to morning 8:30 AM
            return {
              ...evt,
              startTime: '2026-07-23T08:30:00.000Z',
              endTime: '2026-07-23T09:30:00.000Z',
              aiReason: 'Optimized from late-night to morning cognitive slot to maximize focus.'
            };
          }
          if (evt.id === 'evt-2') {
            // Allocate a 15-minute buffer
            return {
              ...evt,
              startTime: '2026-07-23T11:15:00.000Z',
              endTime: '2026-07-23T12:15:00.000Z',
              aiReason: 'Rescheduled automatically to allocate a 15-minute buffer.'
            };
          }
          return evt;
        })
      );
      setConflicts([]);
      setIsOptimized(true);
      showToast('Weekly calendar optimized for maximum productivity!', 'success');
    } catch (e) {
      showToast('Failed to optimize calendar', 'error');
    } finally {
      setOptimizing(false);
    }
  };

  const getCategoryColor = (cat?: string) => {
    switch (cat) {
      case 'EXAM':
        return 'bg-red-500/10 border-red-500/20 text-red-400';
      case 'ASSIGNMENT':
        return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
      case 'STUDY':
        return 'bg-violet-500/10 border-violet-500/20 text-violet-400';
      case 'REVISION':
        return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
      case 'QUIZ':
        return 'bg-pink-500/10 border-pink-500/20 text-pink-400';
      case 'MEETING':
        return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
      default:
        return 'bg-zinc-900 border-zinc-800 text-zinc-300';
    }
  };

  // Month Grid values (Wednesday July 1, 2026 context)
  const monthDays = Array.from({ length: 31 }, (_, idx) => idx + 1);
  const leadingEmptyDays = Array.from({ length: 3 }, (_, idx) => idx);

  // Day workload intensity calculator
  const dayLoads = useMemo(() => {
    const loads: Record<number, { level: 'low' | 'medium' | 'high' | 'peak' | 'recovery'; color: string; bg: string }> = {};
    for (let d = 1; d <= 31; d++) {
      if (d === 23) {
        loads[d] = { level: 'peak', color: 'text-violet-400', bg: 'bg-violet-950/20 border-violet-500/20' };
      } else if (d === 24) {
        loads[d] = { level: 'medium', color: 'text-indigo-400', bg: 'bg-indigo-950/10 border-indigo-900/10' };
      } else if (d === 22) {
        loads[d] = { level: 'high', color: 'text-fuchsia-400', bg: 'bg-fuchsia-950/15 border-fuchsia-900/15' };
      } else if (d % 6 === 0) {
        loads[d] = { level: 'recovery', color: 'text-emerald-400', bg: 'bg-emerald-950/5 border-emerald-900/5' };
      } else {
        loads[d] = { level: 'low', color: 'text-zinc-500', bg: 'bg-zinc-950/20 border-zinc-900/20' };
      }
    }
    return loads;
  }, []);

  useEffect(() => {
    setTimeout(() => setLoading(false), 500);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070708] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070708] text-zinc-150 p-6 lg:p-10 select-text font-sans relative text-xs">
      
      {/* Floating XP Animation */}
      <AnimatePresence>
        {xpAnimation && (
          <motion.div
            initial={{ opacity: 1, y: xpAnimation.y - 20, scale: 0.8 }}
            animate={{ opacity: 0, y: xpAnimation.y - 120, scale: 1.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="fixed z-50 font-black text-violet-400 text-lg pointer-events-none drop-shadow-[0_0_10px_rgba(139,92,246,0.6)]"
            style={{ left: xpAnimation.x - 20 }}
          >
            +{xpAnimation.amount} XP ✨
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-6 text-left">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-violet-650/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.1)]">
              <CalendarIcon className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Calendar Workspace 3.0
                <span className="text-[9px] font-black uppercase tracking-wider bg-violet-500/10 border border-violet-500/20 text-violet-400 px-2 py-0.5 rounded-md">AI scheduling OS</span>
              </h1>
              <p className="text-xs text-zinc-500 font-medium mt-0.5">
                Optimize cognitive schedules, manage load levels, and configure auto-revision buffers.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick Jumps */}
            <div className="hidden lg:flex items-center gap-2 text-[10px] font-bold text-zinc-550">
              <button onClick={() => setSelectedDate(new Date(2026, 6, 23))} className="hover:text-zinc-300">Today</button> •
              <button onClick={() => showToast('Jumping to OS Exam Day (Aug 5)', 'info')} className="hover:text-zinc-300">Next Exam</button> •
              <button onClick={() => showToast('Jumping to Highest Priority day', 'info')} className="hover:text-zinc-300">Priority Day</button>
            </div>

            {/* View switcher */}
            <div className="flex items-center gap-1.5 bg-zinc-900/60 p-1.5 border border-zinc-900 rounded-xl">
              {(['month', 'week', 'day', 'agenda'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition cursor-pointer ${
                    viewMode === mode
                      ? 'bg-zinc-955 text-white border border-zinc-800'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Flagship KPI Hero Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-left">
          {[
            { label: 'Weekly Study Target', val: '18.5 Hours', desc: '4.5 hrs planned today', color: 'text-zinc-200' },
            { label: 'Calculated focus score', val: '92%', desc: 'Peak performance window', color: 'text-violet-405' },
            { label: 'Weekly XP yield', val: '+550 XP', desc: 'Forecasted target', color: 'text-zinc-200' },
            { label: 'Recovery score', val: 'Excellent', desc: 'Burnout risk: Low', color: 'text-emerald-450' },
            { label: 'Conflict index', val: conflicts.length === 0 ? '0' : `${conflicts.length} Warning(s)`, desc: 'Requires optimization', color: conflicts.length === 0 ? 'text-emerald-450' : 'text-amber-500' }
          ].map((stat, idx) => (
            <div key={idx} className="bg-zinc-900/40 border border-zinc-900 p-4.5 rounded-[24px] hover:border-zinc-800 transition duration-300">
              <span className="text-[8.5px] font-black text-zinc-550 block uppercase tracking-widest">{stat.label}</span>
              <span className={`text-sm font-black block mt-1 ${stat.color}`}>{stat.val}</span>
              <span className="text-[9.5px] text-zinc-500 block leading-tight mt-0.5">{stat.desc}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: CALENDAR OR AGENDA VIEWS */}
          <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-[32px] space-y-4">
              
              {/* Header Navigation with Mini Month Picker */}
              <div className="flex justify-between items-center pb-2.5 border-b border-zinc-900 text-left">
                <div className="relative">
                  <button 
                    onClick={() => setShowMonthPicker(!showMonthPicker)}
                    className="text-xs font-black uppercase tracking-wider text-zinc-200 hover:text-white flex items-center gap-1.5 focus:outline-none cursor-pointer"
                  >
                    <CalendarDays className="w-4 h-4 text-violet-405" />
                    {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    <span className="text-[8px] font-bold text-zinc-550 hover:text-zinc-400">▼</span>
                  </button>

                  <AnimatePresence>
                    {showMonthPicker && (
                      <motion.div 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute left-0 mt-2 w-48 bg-zinc-950 border border-zinc-900 rounded-2xl shadow-xl z-30 p-2 text-left"
                      >
                        <div className="text-[9px] font-black text-zinc-550 uppercase tracking-wider px-2 py-1">Select Month</div>
                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, idx) => (
                          <button
                            key={m}
                            onClick={() => {
                              setSelectedDate(new Date(2206, idx, 1));
                              setShowMonthPicker(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 rounded-lg hover:bg-zinc-900 text-xs font-semibold ${selectedDate.getMonth() === idx ? 'text-violet-400 bg-violet-950/20' : 'text-zinc-450'}`}
                          >
                            {m} 2026
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))}
                    className="p-2 bg-zinc-950 border border-zinc-900 rounded-xl hover:border-zinc-800 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setSelectedDate(new Date(2026, 6, 23))}
                    className="px-3 py-2 bg-zinc-950 border border-zinc-900 rounded-xl text-[9px] font-black uppercase text-zinc-450 hover:text-zinc-200 transition cursor-pointer"
                  >
                    Today
                  </button>
                  <button 
                    onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))}
                    className="p-2 bg-zinc-950 border border-zinc-900 rounded-xl hover:border-zinc-800 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* MONTH VIEW GRID */}
              {viewMode === 'month' && (
                <div className="space-y-1">
                  <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black text-zinc-550 uppercase tracking-widest">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                      <div key={d} className="py-1">{d}</div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {leadingEmptyDays.map(emptyIdx => (
                      <div key={`empty-${emptyIdx}`} className="h-20 bg-zinc-950/10 rounded-[14px] border border-transparent" />
                    ))}
                    {monthDays.map(dayNum => {
                      const isToday = dayNum === 23;
                      const dayEvents = dayNum === 23 ? events : [];
                      const load = dayLoads[dayNum] || { level: 'low', bg: 'bg-zinc-950/20 border-zinc-900/20' };

                      return (
                        <div 
                          key={dayNum} 
                          onMouseEnter={() => setHoveredDay(dayNum)}
                          onMouseLeave={() => setHoveredDay(null)}
                          className={`h-22 p-2 rounded-[16px] border text-left flex flex-col justify-between transition-all duration-200 relative group cursor-pointer ${load.bg} ${
                            isToday ? 'ring-2 ring-violet-500/25' : ''
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className={`text-[10px] font-black ${isToday ? 'text-violet-400 bg-violet-950/40 px-1.5 py-0.5 rounded-md' : 'text-zinc-555'}`}>{dayNum}</span>
                            {dayNum === 23 && <span className="text-[7.5px] font-black text-violet-400 tracking-wider">TODAY</span>}
                          </div>

                          {/* Render events inside cell */}
                          <div className="flex-1 overflow-y-auto space-y-0.5 mt-1 scrollbar-none">
                            {dayEvents.slice(0, 2).map(evt => (
                              <div 
                                key={evt.id} 
                                className={`text-[7.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border truncate ${getCategoryColor(evt.category)}`}
                              >
                                {evt.title}
                              </div>
                            ))}
                            {dayEvents.length > 2 && (
                              <span className="text-[7.5px] font-bold text-zinc-550 block">+{dayEvents.length - 2} More</span>
                            )}
                          </div>

                          {/* Day Capacity Hover Preview details */}
                          <AnimatePresence>
                            {hoveredDay === dayNum && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.95, y: 5 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-zinc-950 border border-zinc-900 p-3 rounded-2xl shadow-xl z-20 space-y-2 pointer-events-none text-left"
                              >
                                <div className="text-[9px] font-black text-zinc-550 uppercase tracking-widest">Focus Capacity Info</div>
                                <div className="text-xs font-black text-zinc-200">
                                  {dayNum === 23 ? 'Peak Focus Load' : dayNum % 6 === 0 ? 'Recovery Day' : 'Suggested Study Day'}
                                </div>
                                <div className="text-[9.5px] text-zinc-500 font-semibold leading-relaxed">
                                  {dayNum === 23 ? '4 events scheduled. Available study buffer: 2.5h.' : 'Free focus slot detected. Recommended revision: OS memory.'}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* WEEK VIEW GRID */}
              {viewMode === 'week' && (
                <div className="grid grid-cols-7 gap-2">
                  {['Mon 20', 'Tue 21', 'Wed 22', 'Thu 23', 'Fri 24', 'Sat 25', 'Sun 26'].map((day, idx) => {
                    const isToday = idx === 3;
                    const dayEvents = isToday ? events : [];
                    return (
                      <div key={idx} className={`bg-zinc-950/20 p-2.5 border rounded-[20px] min-h-[250px] text-left space-y-3 ${
                        isToday ? 'border-violet-500/25 bg-violet-955/5' : 'border-zinc-900'
                      }`}>
                        <span className={`text-[9px] font-black uppercase tracking-widest block border-b border-zinc-900 pb-1.5 ${
                          isToday ? 'text-violet-405 font-black' : 'text-zinc-550'
                        }`}>
                          {day}
                        </span>
                        
                        <div className="space-y-1.5">
                          {dayEvents.map(evt => (
                            <div key={evt.id} className={`p-2 rounded-xl border text-[9px] font-extrabold text-left space-y-1 ${getCategoryColor(evt.category)}`}>
                              <span className="block truncate">{evt.title}</span>
                              <span className="text-[7.5px] text-zinc-500 font-bold block">
                                {new Date(evt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* DAY VIEW GRID */}
              {viewMode === 'day' && (
                <div className="space-y-3">
                  <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest block text-left">Thursday, July 23, 2026</span>
                  <div className="space-y-2">
                    {events.map(evt => (
                      <div key={evt.id} className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-2xl flex items-start gap-4 text-left">
                        <div className="p-2.5 bg-zinc-900 border border-zinc-900 rounded-xl text-zinc-400 flex items-center justify-center shrink-0">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-zinc-550">
                              {new Date(evt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(evt.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded border ${getCategoryColor(evt.category)}`}>
                              {evt.category}
                            </span>
                          </div>
                          <span className="font-extrabold text-zinc-200 block text-xs">{evt.title}</span>
                          <span className="text-[10px] text-zinc-500 block">{evt.aiReason}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AGENDA VIEW */}
              {viewMode === 'agenda' && (
                <div className="space-y-3">
                  {events.map(evt => (
                    <div key={evt.id} className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-2xl flex items-center justify-between text-left">
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${
                          evt.category === 'EXAM' ? 'bg-red-500' : evt.category === 'ASSIGNMENT' ? 'bg-amber-500' : 'bg-violet-500'
                        }`} />
                        <div>
                          <span className="font-extrabold text-zinc-200 block text-xs">{evt.title}</span>
                          <span className="text-[9px] text-zinc-500 block">July 23, 2026 • {evt.durationMins} mins</span>
                        </div>
                      </div>
                      <span className={`text-[9.5px] font-black uppercase px-2.5 py-0.5 rounded border ${getCategoryColor(evt.category)}`}>
                        {evt.category}
                      </span>
                    </div>
                  ))}
                </div>
              )}

            </div>

            {/* AI WEEKLY OPTIMIZER PANEL (Before vs After) */}
            <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-[32px] space-y-4 text-left">
              <div className="flex justify-between items-center pb-2.5 border-b border-zinc-900">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-450">AI Timeline Optimizer</h3>
                  <span className="text-[9.5px] text-zinc-550 block">Resolve sleep and burnout conflicts automatically.</span>
                </div>
                <button
                  type="button"
                  onClick={handleOptimizeWeek}
                  disabled={optimizing || isOptimized}
                  className="px-4 py-2.5 bg-violet-650 hover:bg-violet-600 disabled:opacity-40 rounded-xl text-[9px] font-black uppercase tracking-wider text-white transition flex items-center gap-1.5 cursor-pointer shadow-lg"
                >
                  {optimizing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Optimizing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Optimize My Week
                    </>
                  )}
                </button>
              </div>

              {/* Before / After Layout Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Before */}
                <div className="bg-zinc-950/40 border border-zinc-900 p-4 rounded-2xl space-y-3 relative overflow-hidden">
                  <div className="absolute top-2 right-2 text-[8px] font-black uppercase tracking-wider bg-rose-500/10 border border-rose-500/20 text-rose-455 px-1.5 py-0.5 rounded">Current Plan</div>
                  <span className="text-[9px] font-black text-zinc-550 block uppercase tracking-widest">Late Night Heavy Load</span>
                  
                  <div className="space-y-1.5 text-[10px]">
                    <div className="p-2 bg-zinc-950 border border-zinc-900 rounded-xl line-through text-zinc-550">
                      Linear Algebra Homework (10:30 PM - 11:30 PM)
                    </div>
                    <div className="p-2 bg-zinc-950 border border-zinc-900 rounded-xl line-through text-zinc-550">
                      OS Prep & Arch Quiz (Back-to-back blocks)
                    </div>
                  </div>
                </div>

                {/* After */}
                <div className="bg-zinc-950/40 border border-violet-500/10 p-4 rounded-2xl space-y-3 relative overflow-hidden">
                  <div className="absolute top-2 right-2 text-[8px] font-black uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 px-1.5 py-0.5 rounded">Optimized Suggestion</div>
                  <span className="text-[9px] font-black text-violet-405 block uppercase tracking-widest">High Energy Morning Slots</span>
                  
                  <div className="space-y-1.5 text-[10px]">
                    <div className="p-2 bg-violet-950/10 border border-violet-500/20 rounded-xl text-violet-300">
                      Linear Algebra Homework (8:30 AM - 9:30 AM)
                    </div>
                    <div className="p-2 bg-emerald-950/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                      Allocated 15-minute recovery buffers
                    </div>
                  </div>
                </div>
              </div>

              {/* Estimated Improvements Stats */}
              <div className="grid grid-cols-4 gap-2 pt-2 text-center text-xs">
                {[
                  { label: 'Productivity', val: '+12%', color: 'text-emerald-400' },
                  { label: 'Focus Score', val: '+18%', color: 'text-violet-400' },
                  { label: 'Burnout Risk', val: '-34%', color: 'text-emerald-400' },
                  { label: 'Est. XP / week', val: '+250 XP', color: 'text-amber-400' }
                ].map((stat, idx) => (
                  <div key={idx} className="bg-zinc-950/60 p-2.5 border border-zinc-900 rounded-xl">
                    <span className="text-[8px] font-black text-zinc-550 block uppercase tracking-wider">{stat.label}</span>
                    <span className={`font-black text-xs ${stat.color} block mt-0.5`}>{stat.val}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: AI CONFLICT ENGINE & FORM CREATORS */}
          <div className="space-y-6">
            
            {/* AI SCHEDULING ASSISTANT 2.0 */}
            <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-[32px] space-y-5 text-left relative overflow-hidden">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 pb-2.5 border-b border-zinc-900 flex items-center justify-between">
                <span>AI Scheduling Assistant 2.0</span>
                <Sparkles className="w-4 h-4 text-violet-405 animate-pulse" />
              </h3>

              {conflicts.length === 0 ? (
                <div className="p-10 text-center border border-dashed border-zinc-900 rounded-[24px] bg-zinc-950/10 flex flex-col items-center justify-center gap-3">
                  <div className="p-3 bg-zinc-900/40 border border-zinc-900 rounded-2xl">
                    <Check className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-black text-zinc-350">Calendar Optimized</p>
                    <p className="text-[10px] text-zinc-550 leading-relaxed font-semibold">No schedule conflicts, burnout markers, or sleep overlaps detected for this week.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {conflicts.map(c => (
                    <div key={c.id} className="p-4 bg-zinc-950 border border-zinc-900 rounded-[20px] space-y-3 relative overflow-hidden hover:border-zinc-800 transition">
                      <div className="flex justify-between items-center">
                        <span className="text-[8.5px] font-black uppercase text-amber-500 tracking-wider">{c.type}</span>
                        <span className="text-[8.5px] font-black text-zinc-550">Confidence: {c.confidence}</span>
                      </div>
                      
                      <p className="text-[10.5px] text-zinc-400 leading-relaxed font-semibold">{c.message}</p>
                      
                      <div className="flex justify-between items-center pt-2.5 border-t border-zinc-900 text-[8.5px] font-bold text-zinc-550">
                        <span>Move to morning slot</span>
                        <button
                          type="button"
                          onClick={handleOptimizeWeek}
                          className="px-2.5 py-1 bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/20 text-violet-405 rounded-lg uppercase font-black transition cursor-pointer"
                        >
                          Auto Fix
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* QUICK CREATE CUSTOM EVENT BLOCK PANEL */}
            <div className="p-6 bg-zinc-900/40 border border-zinc-900 rounded-[32px] space-y-4 text-left">
              <h3 className="text-xs font-black text-zinc-405 uppercase tracking-widest flex items-center gap-2">
                <Plus className="h-4.5 w-4.5" /> Create Custom Block
              </h3>

              <form onSubmit={handleCreateEvent} className="space-y-3 text-xs">
                <div className="flex flex-col gap-1">
                  <label className="text-[9.5px] font-black text-zinc-500 uppercase tracking-widest">Event Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Operating Systems Revision"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-violet-500 transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9.5px] font-black text-zinc-500 uppercase tracking-widest">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full bg-zinc-955 border border-zinc-900 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none cursor-pointer"
                    >
                      <option value="STUDY">Study Session</option>
                      <option value="EXAM">Exam block</option>
                      <option value="ASSIGNMENT">Assignment</option>
                      <option value="QUIZ">Practice Quiz</option>
                      <option value="REVISION">Revision</option>
                      <option value="PERSONAL">Personal</option>
                      <option value="MEETING">Meeting</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9.5px] font-black text-zinc-500 uppercase tracking-widest">Difficulty</label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value as any)}
                      className="w-full bg-zinc-955 border border-zinc-900 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none cursor-pointer"
                    >
                      <option value="HARD">Hard</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="EASY">Easy</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9.5px] font-black text-zinc-500 uppercase tracking-widest">Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full bg-zinc-955 border border-zinc-900 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none cursor-pointer"
                    >
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9.5px] font-black text-zinc-500 uppercase tracking-widest">Preferred energy</label>
                    <select
                      value={preferredEnergy}
                      onChange={(e) => setPreferredEnergy(e.target.value as any)}
                      className="w-full bg-zinc-955 border border-zinc-900 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none cursor-pointer"
                    >
                      <option value="MORNING">Morning (Peak)</option>
                      <option value="AFTERNOON">Afternoon</option>
                      <option value="EVENING">Evening</option>
                      <option value="NIGHT">Night</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9.5px] font-black text-zinc-500 uppercase tracking-widest">Start Time</label>
                    <input
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-zinc-955 border border-zinc-900 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none cursor-pointer"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9.5px] font-black text-zinc-500 uppercase tracking-widest">End Time</label>
                    <input
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full bg-zinc-955 border border-zinc-900 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none cursor-pointer"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-violet-650 hover:bg-violet-600 text-white font-bold rounded-xl transition cursor-pointer uppercase text-[9px] tracking-wider shadow-lg shadow-violet-900/10 focus:outline-none"
                >
                  Schedule Event
                </button>
              </form>
            </div>

          </div>
        </div>

        {/* DAILY TIMELINE CARDS (Today's Timeline Blocks) */}
        <div className="space-y-4 text-left">
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center justify-between">
            <span>Today's Timeline Blocks</span>
            <span className="text-[8px] font-black bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded uppercase tracking-wider">Spaced repetitions active</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {events.map((evt) => (
              <div 
                key={evt.id} 
                onMouseEnter={() => setHoveredEvent(evt.id)}
                onMouseLeave={() => setHoveredEvent(null)}
                className={`p-5 rounded-[24px] border transition-all duration-300 relative overflow-hidden group flex flex-col justify-between gap-4 ${
                  evt.isCompleted 
                    ? 'bg-zinc-955/40 border-zinc-950 opacity-60' 
                    : 'bg-zinc-900/40 border-zinc-900 hover:border-zinc-800 shadow-md hover:scale-[1.02]'
                }`}
              >
                {/* Subtle indicator bar matching category color */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                  evt.category === 'EXAM' ? 'bg-red-500' : evt.category === 'ASSIGNMENT' ? 'bg-amber-500' : 'bg-violet-500'
                }`} />

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded border ${getCategoryColor(evt.category)}`}>
                        {evt.category}
                      </span>
                      <span className="text-[9.5px] text-zinc-500 font-bold">
                        {new Date(evt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {evt.difficulty && (
                      <span className="text-[8px] font-black bg-zinc-950 border border-zinc-900 text-zinc-450 px-2 py-0.5 rounded uppercase">
                        {evt.difficulty}
                      </span>
                    )}
                  </div>

                  <span className="font-extrabold text-zinc-200 block text-xs leading-tight">{evt.title}</span>
                  
                  {/* AI focus Expected Retention stats */}
                  <div className="flex gap-2">
                    <span className="text-[8.5px] font-black text-zinc-500 bg-zinc-950 border border-zinc-900/60 px-2 py-0.5 rounded uppercase">
                      🧠 focus: {evt.focusScore || 80}%
                    </span>
                    <span className="text-[8.5px] font-black text-zinc-500 bg-zinc-950 border border-zinc-900/60 px-2 py-0.5 rounded uppercase">
                      📈 retention: {evt.expectedRetention || 78}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-zinc-900/60">
                  <span className="text-[9.5px] font-black text-violet-400 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" /> +{evt.xpReward || 80} XP
                  </span>
                  
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleDeleteEvent(evt.id)}
                      className="p-1.5 hover:bg-zinc-950 border border-transparent hover:border-zinc-900 rounded-lg text-zinc-500 hover:text-rose-500 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    
                    <button 
                      onClick={(e) => handleToggleComplete(evt.id, e)}
                      className={`p-1.5 rounded-lg border transition cursor-pointer shrink-0 ${
                        evt.isCompleted
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : 'bg-zinc-950 border-zinc-900 hover:border-violet-500/40 text-zinc-500 hover:text-violet-405'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Floating Event Hover Preview Card */}
                <AnimatePresence>
                  {hoveredEvent === evt.id && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: 5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute inset-0 bg-zinc-950 border border-zinc-900 p-4 rounded-[24px] z-20 flex flex-col justify-between text-left"
                    >
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[8px] font-black uppercase text-violet-400">AI Scheduling Intel</span>
                          <span className="text-[8px] font-black text-zinc-550">Priority: {evt.priority || 'MEDIUM'}</span>
                        </div>
                        <p className="text-xs font-black text-zinc-200 block truncate">{evt.title}</p>
                        <p className="text-[9.5px] text-zinc-500 leading-relaxed font-semibold">{evt.aiReason || 'Scheduled at optimal hour.'}</p>
                      </div>
                      
                      <div className="flex justify-between items-center pt-2 border-t border-zinc-900 text-[8.5px] font-bold text-zinc-555">
                        <span>Energy Cost: {evt.energyCost || 50}%</span>
                        <button 
                          onClick={() => showToast('Starting Study Focus Session...', 'info')}
                          className="px-2 py-0.5 bg-violet-650 hover:bg-violet-600 text-white rounded text-[8px] font-black uppercase tracking-wider"
                        >
                          Start Focus
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
