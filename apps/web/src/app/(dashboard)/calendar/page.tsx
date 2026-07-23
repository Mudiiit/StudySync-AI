'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/providers/ToastProvider';
import { 
  Calendar as CalendarIcon, Sparkles, Loader2, Plus, 
  Trash2, Check, Clock, ShieldAlert,
  Zap, Flame, Award, ChevronLeft, ChevronRight, BarChart3, Settings,
  RefreshCw, Layers
} from 'lucide-react';
import api from '@/lib/axios';
import { motion, AnimatePresence } from 'framer-motion';

interface CalendarEventItem {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  category: 'STUDY' | 'EXAM' | 'ASSIGNMENT' | 'PERSONAL' | 'HOLIDAY' | 'POMODORO' | 'REVISION' | 'QUIZ';
  difficulty?: 'HARD' | 'MEDIUM' | 'EASY';
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  energyRequired?: 'HIGH' | 'MEDIUM' | 'LOW';
  xpReward?: number;
  aiReason?: string;
  isCompleted?: boolean;
  durationMins?: number;
}

export default function CalendarPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'agenda'>('month');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2026, 6, 23)); // Set to fixed local time context (July 2026)
  
  // Data States
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [optimizing, setOptimizing] = useState(false);

  // Form States
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [category, setCategory] = useState<CalendarEventItem['category']>('STUDY');
  const [difficulty, setDifficulty] = useState<'HARD' | 'MEDIUM' | 'EASY'>('MEDIUM');
  const [priority, setPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');

  // Floating celebration XP state
  const [xpAnimation, setXpAnimation] = useState<{ show: boolean; amount: number; x: number; y: number } | null>(null);

  const defaultEvents: CalendarEventItem[] = [
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
      aiReason: 'Scheduled because exam is in 13 days and spaced repetition is due.',
      isCompleted: false,
      durationMins: 90
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
      aiReason: 'Scheduled because of low recent quiz accuracy logged.',
      isCompleted: false,
      durationMins: 60
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
      aiReason: 'Scheduled because retention score dropped to 68%.',
      isCompleted: true,
      durationMins: 60
    },
    {
      id: 'evt-4',
      title: 'Linear Algebra Homework',
      description: 'Compute eigenvectors and solve diagonal matrices.',
      startTime: '2026-07-23T16:00:00.000Z',
      endTime: '2026-07-23T17:00:00.000Z',
      category: 'ASSIGNMENT',
      difficulty: 'EASY',
      priority: 'LOW',
      energyRequired: 'LOW',
      xpReward: 50,
      aiReason: 'Scheduled to avoid deadline hazards (due in 2 days).',
      isCompleted: false,
      durationMins: 60
    }
  ];

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

      const eventsRes = await api.get('/calendar/events', {
        params: { start: start.toISOString(), end: end.toISOString() },
      }).catch(() => ({ data: [] }));

      const raw = eventsRes.data || [];
      if (raw.length === 0) {
        setEvents(defaultEvents);
      } else {
        // Map raw events to include AI fields
        const mapped = raw.map((evt: any, idx: number) => ({
          ...evt,
          category: evt.category || 'STUDY',
          difficulty: evt.difficulty || 'MEDIUM',
          priority: evt.priority || 'MEDIUM',
          energyRequired: evt.energyRequired || 'MEDIUM',
          xpReward: evt.xpReward || 80,
          aiReason: evt.aiReason || 'Scheduled by AI strategic learning schedule rules.',
          isCompleted: evt.isCompleted || false,
          durationMins: evt.durationMins || 60
        }));
        setEvents(mapped);
      }

      // Populate conflicts mock
      setConflicts([
        { id: 'conf-1', title: 'Late-Night Study Overload', message: 'You have scheduled Linear Algebra past 10:00 PM. This blocks cognitive restoration cycles.', type: 'burnout' },
        { id: 'conf-2', title: 'Back-to-Back Collision', message: 'OS prep and Architecture quiz have no buffer window allocated between blocks.', type: 'overlap' }
      ]);
    } catch (e) {
      showToast('Failed to load calendar events', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [selectedDate]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startTime || !endTime) {
      showToast('Please fill in all required fields', 'info');
      return;
    }

    try {
      const startISO = new Date(startTime).toISOString();
      const endISO = new Date(endTime).toISOString();

      await api.post('/calendar/events', {
        title,
        description,
        startTime: startISO,
        endTime: endISO,
        category,
      }).catch(() => {});

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
        aiReason: 'Manually added by user to the schedule stream.',
        isCompleted: false,
        durationMins: Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000)
      };

      setEvents(prev => [...prev, newEvt]);
      showToast('Event created successfully', 'success');

      setTitle('');
      setDescription('');
      setStartTime('');
      setEndTime('');
    } catch (err: any) {
      showToast('Failed to create calendar event', 'error');
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await api.delete(`/calendar/events/${id}`).catch(() => {});
      setEvents(prev => prev.filter(evt => evt.id !== id));
      showToast('Event removed', 'success');
    } catch (e) {
      showToast('Failed to delete event', 'error');
    }
  };

  const handleToggleComplete = async (id: string, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const target = events.find(evt => evt.id === id);
    const isFinishing = target ? !target.isCompleted : false;

    setEvents(prev =>
      prev.map(evt => evt.id === id ? { ...evt, isCompleted: !evt.isCompleted } : evt)
    );

    if (isFinishing) {
      setXpAnimation({
        show: true,
        amount: target?.xpReward || 80,
        x: rect.left + rect.width / 2,
        y: rect.top
      });
      showToast('Session completed! +XP bonus added.', 'success');
      setTimeout(() => setXpAnimation(null), 1000);
    }
  };

  const handleAutoReschedule = async () => {
    try {
      setOptimizing(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Auto reschedule: add 15 min buffers between back-to-back blocks
      setEvents(prev => {
        return prev.map(evt => {
          if (evt.id === 'evt-2') {
            return {
              ...evt,
              startTime: '2026-07-23T11:15:00.000Z',
              endTime: '2026-07-23T12:15:00.000Z',
              aiReason: 'Rescheduled automatically to allocate a 15-minute recovery buffer.'
            };
          }
          return evt;
        });
      });
      setConflicts(prev => prev.filter(c => c.type !== 'overlap'));
      showToast('Conflict resolved: added 15-minute buffer between study sessions.', 'success');
    } catch (err) {
      showToast('Failed to reschedule blocks', 'error');
    } finally {
      setOptimizing(false);
    }
  };

  const handleClearBurnout = () => {
    setEvents(prev => {
      return prev.map(evt => {
        if (evt.id === 'evt-4') {
          return {
            ...evt,
            startTime: '2026-07-23T19:00:00.000Z',
            endTime: '2026-07-23T20:00:00.000Z',
            aiReason: 'Postponed to early evening to protect cognitive sleep patterns.'
          };
        }
        return evt;
      });
    });
    setConflicts(prev => prev.filter(c => c.type !== 'burnout'));
    showToast('Late-night schedule warning resolved.', 'success');
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
      default:
        return 'bg-zinc-900 border-zinc-800 text-zinc-300';
    }
  };

  // Month Grid calculations
  const monthDays = Array.from({ length: 31 }, (_, idx) => idx + 1);
  const leadingEmptyDays = Array.from({ length: 3 }, (_, idx) => idx); // July 2026 starts on Wednesday

  return (
    <div className="min-h-screen bg-[#070708] text-zinc-100 p-6 lg:p-10 select-text">
      
      {/* XP Floating Particle Animation */}
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-violet-650/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.1)]">
              <CalendarIcon className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                AI Scheduling Workspace
                <span className="text-[10px] font-black uppercase tracking-wider bg-violet-500/10 border border-violet-500/20 text-violet-400 px-2 py-0.5 rounded-md">Calendar 2.0</span>
              </h1>
              <p className="text-xs text-zinc-400 font-medium mt-0.5">
                Intelligent scheduling with automatic conflict detection, cognitive load balance, and planner integration.
              </p>
            </div>
          </div>

          {/* View Mode Controls */}
          <div className="flex items-center gap-2 bg-zinc-900/60 p-1.5 border border-zinc-800 rounded-xl">
            {(['month', 'week', 'day', 'agenda'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-black capitalize transition cursor-pointer ${
                  viewMode === mode
                    ? 'bg-violet-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* FLAGSHIFT HERO STATS */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Study Hours Planned', val: '4.5 Hours', desc: 'Meets daily target', color: 'text-zinc-200' },
            { label: 'Upcoming Exams', val: '1 Exam', desc: 'OS Prep - 13 days', color: 'text-zinc-200' },
            { label: 'Estimated XP today', val: '+350 XP', desc: 'Focus reward', color: 'text-violet-400' },
            { label: 'Free time available', val: '3 Hours', desc: 'Leisure capacity', color: 'text-zinc-200' },
            { label: 'Schedule Health', val: '94%', desc: 'Cognitive peak synergy', color: 'text-emerald-400' }
          ].map((stat, idx) => (
            <div key={idx} className="bg-zinc-900/40 border border-zinc-850 p-4 rounded-2xl relative overflow-hidden group hover:border-violet-500/20 transition duration-300">
              <span className="text-[9px] font-bold text-zinc-550 block uppercase tracking-wider">{stat.label}</span>
              <span className={`text-base font-black block mt-0.5 ${stat.color}`}>{stat.val}</span>
              <span className="text-[9px] text-zinc-500 block leading-tight">{stat.desc}</span>
            </div>
          ))}
        </div>

        {/* MAIN CALENDAR AND ASSISTANT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Col: Calendar Views */}
          <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-zinc-900/40 border border-zinc-850 p-6 rounded-3xl space-y-4">
              
              {/* Month navigation */}
              <div className="flex justify-between items-center pb-2 border-b border-zinc-850/50">
                <h3 className="text-sm font-extrabold text-zinc-200">
                  {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))}
                    className="p-1.5 bg-zinc-950 border border-zinc-850 rounded hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setSelectedDate(new Date(2026, 6, 23))}
                    className="px-2.5 py-1 bg-zinc-950 border border-zinc-850 rounded text-[10px] font-black uppercase text-zinc-400 hover:text-zinc-250 transition cursor-pointer"
                  >
                    Today
                  </button>
                  <button 
                    onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))}
                    className="p-1.5 bg-zinc-950 border border-zinc-850 rounded hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* MONTH VIEW GRID */}
              {viewMode === 'month' && (
                <div className="space-y-1">
                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-zinc-550 uppercase tracking-wider">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                      <div key={d} className="py-1">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {leadingEmptyDays.map(emptyIdx => (
                      <div key={`empty-${emptyIdx}`} className="h-20 bg-zinc-950/20 rounded-xl border border-transparent" />
                    ))}
                    {monthDays.map(dayNum => {
                      const isToday = dayNum === 23;
                      const dayEvents = dayNum === 23 ? events : [];
                      return (
                        <div 
                          key={dayNum} 
                          className={`h-20 p-1.5 bg-zinc-950/40 border rounded-xl text-left flex flex-col justify-between transition group cursor-pointer ${
                            isToday ? 'border-violet-500/50 bg-zinc-900/30' : 'border-zinc-850/60 hover:border-zinc-800'
                          }`}
                        >
                          <span className={`text-[10px] font-black ${isToday ? 'text-violet-400' : 'text-zinc-550'}`}>{dayNum}</span>
                          <div className="flex-1 overflow-y-auto space-y-0.5 mt-1 scrollbar-none">
                            {dayEvents.map(evt => (
                              <div 
                                key={evt.id} 
                                className={`text-[8px] font-bold px-1.5 py-0.5 rounded border truncate ${getCategoryColor(evt.category)}`}
                                title={evt.title}
                              >
                                {evt.title}
                              </div>
                            ))}
                          </div>
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
                      <div key={idx} className={`bg-zinc-950/30 p-2 border rounded-2xl min-h-[220px] text-left space-y-2 ${
                        isToday ? 'border-violet-500/30 bg-zinc-900/20' : 'border-zinc-850/60'
                      }`}>
                        <span className={`text-[10px] font-black uppercase tracking-wider block border-b border-zinc-900 pb-1 ${
                          isToday ? 'text-violet-400' : 'text-zinc-550'
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
                      <div key={evt.id} className="p-4 bg-zinc-950/40 border border-zinc-850 rounded-2xl flex items-start gap-4 text-left">
                        <div className="p-2.5 bg-zinc-900 border border-zinc-850 rounded-xl text-zinc-400 flex items-center justify-center shrink-0">
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
                    <div key={evt.id} className="p-4 bg-zinc-950/40 border border-zinc-850 rounded-2xl flex items-center justify-between text-left">
                      <div className="flex items-center gap-3">
                        <span className={`w-2.5 h-2.5 rounded-full ${
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

            {/* PRODUCTIVITY HEATMAP VISUALISATION */}
            <div className="bg-zinc-900/40 border border-zinc-850 p-6 rounded-3xl space-y-4 text-left">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Weekly Focus Intensity Forecast</h3>
              
              <div className="grid grid-cols-7 gap-2 max-w-md mx-auto pt-2">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                  <div key={idx} className="text-center text-[10px] font-black text-zinc-550 uppercase">
                    {day}
                  </div>
                ))}
                {[
                  { hours: 4.5, val: '80%' }, { hours: 5.0, val: '92%' }, { hours: 3.5, val: '75%' },
                  { hours: 4.5, val: '88%' }, { hours: 6.0, val: '95%' }, { hours: 2.0, val: '60%' }, { hours: 0, val: 'Rest' }
                ].map((d, idx) => {
                  const isRest = d.hours === 0;
                  const bg = isRest ? 'bg-zinc-950 border border-zinc-850' : 'bg-violet-550 border border-violet-550';
                  return (
                    <div 
                      key={idx} 
                      className={`h-12 rounded-xl flex flex-col items-center justify-center text-[9px] font-bold text-zinc-300 transition hover:scale-105 cursor-pointer ${bg}`}
                      title={`${d.hours} hours focus`}
                    >
                      <span>{isRest ? 'Rest' : `${d.hours}h`}</span>
                      {!isRest && <span className="text-[7.5px] text-violet-300 font-extrabold">{d.val}</span>}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right Col: AI Assistant Sidebar & Form */}
          <div className="space-y-6">
            
            {/* AI SCHEDULING ASSISTANT */}
            <div className="bg-zinc-900/40 border border-zinc-850 p-6 rounded-3xl space-y-5 text-left relative overflow-hidden">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 pb-2.5 border-b border-zinc-850 flex items-center justify-between">
                <span>AI Scheduling Assistant</span>
                <Sparkles className="w-4 h-4 text-violet-400 animate-pulse" />
              </h3>

              {/* Conflict alerts Warnings */}
              {conflicts.length > 0 && (
                <div className="space-y-3">
                  {conflicts.map(c => (
                    <div key={c.id} className="p-3.5 bg-amber-950/15 border border-amber-500/25 rounded-2xl space-y-2 text-xs">
                      <div className="flex gap-2">
                        <ShieldAlert className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-extrabold text-amber-300 block">{c.title}</span>
                          <span className="text-[10px] text-zinc-400 block mt-0.5 leading-relaxed">{c.message}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end pt-1">
                        <button 
                          onClick={c.type === 'overlap' ? handleAutoReschedule : handleClearBurnout}
                          disabled={optimizing}
                          className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg text-[9px] font-black uppercase tracking-wider transition hover:bg-amber-500/20 cursor-pointer disabled:opacity-50"
                        >
                          {optimizing ? 'Rescheduling...' : 'Auto Fix Conflict'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Recommendations list */}
              <div className="space-y-3.5 pt-1">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-zinc-550 block uppercase tracking-wider">Suggested Focus Slot</span>
                  <span className="text-xs font-extrabold text-zinc-200 block">08:00 AM – 10:00 AM (Cognitive Peak)</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-zinc-550 block uppercase tracking-wider">Burnout Alert Threshold</span>
                  <span className="text-xs font-extrabold text-emerald-400 block">Energy matches planned workload perfectly.</span>
                </div>
              </div>
            </div>

            {/* Quick Add Form Panel */}
            <div className="p-6 bg-zinc-900/40 border border-zinc-850 rounded-3xl space-y-4 text-left">
              <h3 className="text-xs font-bold text-zinc-350 uppercase tracking-wider flex items-center gap-2">
                <Plus className="h-4 w-4 text-violet-400" /> Create Custom Block
              </h3>
              <form onSubmit={handleCreateEvent} className="space-y-3 text-xs">
                <div>
                  <label className="text-zinc-400 font-semibold block mb-1">Event Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Operating Systems Exam Prep"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-violet-500 transition"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 font-semibold block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none cursor-pointer"
                  >
                    <option value="STUDY">Study Session</option>
                    <option value="EXAM">Exam block</option>
                    <option value="ASSIGNMENT">Assignment Deadline</option>
                    <option value="QUIZ">Practice Quiz</option>
                    <option value="REVISION">Spaced Revision</option>
                    <option value="PERSONAL">Personal</option>
                  </select>
                </div>
                <div>
                  <label className="text-zinc-400 font-semibold block mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 font-semibold block mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none cursor-pointer"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-violet-650 hover:bg-violet-600 text-white font-bold rounded-xl transition cursor-pointer uppercase text-[10px] tracking-wider shadow-lg shadow-violet-900/10"
                >
                  Schedule Event
                </button>
              </form>
            </div>

          </div>
        </div>

        {/* DAILY TIMELINE LIST */}
        <div className="space-y-4 text-left">
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Today's Timeline Blocks</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {events.map((evt) => (
              <div 
                key={evt.id} 
                className={`p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden group hover:scale-[1.02] flex flex-col justify-between gap-4 ${
                  evt.isCompleted 
                    ? 'bg-zinc-950/40 border-zinc-900 opacity-60' 
                    : 'bg-[#0d0d11]/80 border-zinc-850 hover:border-zinc-800 shadow-md'
                }`}
              >
                {/* Glowing flare animation */}
                <div className="absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 group-hover:left-full transition-all duration-1000" />
                
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded border ${getCategoryColor(evt.category)}`}>
                      {evt.category}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-bold">
                      {new Date(evt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <span className="font-extrabold text-zinc-200 block text-xs leading-tight">{evt.title}</span>
                  <span className="text-[10px] text-zinc-500 block leading-relaxed">{evt.aiReason}</span>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-zinc-900/60">
                  <span className="text-[9.5px] font-black text-violet-400 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" /> +{evt.xpReward} XP
                  </span>
                  <button 
                    onClick={(e) => handleToggleComplete(evt.id, e)}
                    className={`p-1.5 rounded-lg border transition cursor-pointer shrink-0 ${
                      evt.isCompleted
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-zinc-900 border-zinc-800 hover:border-violet-500/40 text-zinc-400 hover:text-violet-400'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
