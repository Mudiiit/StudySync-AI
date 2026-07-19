'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/providers/ToastProvider';
import { 
  Calendar as CalendarIcon, Sparkles, Loader2, Plus, 
  Trash2, AlertTriangle, Check, ArrowRight, Clock, ShieldAlert, Tag
} from 'lucide-react';
import api from '@/lib/axios';
import { motion } from 'framer-motion';

interface CalendarEventItem {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  category?: 'STUDY' | 'EXAM' | 'ASSIGNMENT' | 'PERSONAL' | 'HOLIDAY';
  location?: string;
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [intelligenceAlerts, setIntelligenceAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'agenda'>('month');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Quick Create Form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [category, setCategory] = useState<'STUDY' | 'EXAM' | 'ASSIGNMENT' | 'PERSONAL' | 'HOLIDAY'>('STUDY');
  
  const { showToast } = useToast();

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

      const [eventsRes, intelRes] = await Promise.all([
        api.get('/calendar/events', {
          params: { start: start.toISOString(), end: end.toISOString() },
        }).catch(() => ({ data: [] })),
        api.get('/calendar/intelligence').catch(() => ({ data: { alerts: [] } })),
      ]);

      setEvents(eventsRes.data || []);
      setIntelligenceAlerts(intelRes.data?.alerts || []);
    } catch (e: any) {
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
      const res = await api.post('/calendar/events', {
        title,
        description,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        category,
      });

      if (res.data?.hasConflict) {
        showToast(`Warning: Event overlaps with ${res.data.conflictingEvents[0].title}`, 'info');
      } else {
        showToast('Event created successfully', 'success');
      }

      setTitle('');
      setDescription('');
      setStartTime('');
      setEndTime('');
      fetchEvents();
    } catch (err: any) {
      showToast('Failed to create calendar event', 'error');
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await api.delete(`/calendar/events/${id}`);
      showToast('Event removed', 'success');
      fetchEvents();
    } catch (e) {
      showToast('Failed to delete event', 'error');
    }
  };

  const getCategoryColor = (cat?: string) => {
    switch (cat) {
      case 'EXAM':
        return 'bg-red-500/10 border-red-500/30 text-red-400';
      case 'ASSIGNMENT':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      case 'STUDY':
        return 'bg-violet-500/10 border-violet-500/30 text-violet-400';
      case 'HOLIDAY':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
      default:
        return 'bg-zinc-900 border-zinc-800 text-zinc-300';
    }
  };

  return (
    <div className="min-h-screen bg-[#070708] text-zinc-100 p-6 lg:p-10 select-text">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">Smart Study Calendar</h1>
              <p className="text-xs text-zinc-400 font-medium mt-0.5">
                Intelligent scheduling with automatic conflict detection and time-blocking.
              </p>
            </div>
          </div>

          {/* View Mode Controls */}
          <div className="flex items-center gap-2 bg-zinc-900/60 p-1.5 border border-zinc-800 rounded-xl">
            {(['month', 'week', 'day', 'agenda'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold capitalize transition cursor-pointer ${
                  viewMode === mode
                    ? 'bg-violet-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Intelligence Warnings */}
        {intelligenceAlerts.length > 0 && (
          <div className="space-y-2">
            {intelligenceAlerts.map((alert, idx) => (
              <div
                key={idx}
                className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-2xl flex items-start gap-3"
              >
                <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-300">{alert.title}</h4>
                  <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed">{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Events List / Agenda */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-zinc-200 uppercase tracking-wider">
                {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Scheduled Events
              </h3>
              <span className="text-xs text-zinc-400 font-bold">{events.length} Total Events</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 text-zinc-500">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : events.length > 0 ? (
              <div className="space-y-3">
                {events.map((evt) => (
                  <motion.div
                    key={evt.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 bg-[#0d0d11]/80 border border-zinc-850 hover:border-zinc-750 rounded-2xl flex items-start justify-between gap-4 transition shadow-md"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${getCategoryColor(evt.category)}`}>
                          {evt.category || 'STUDY'}
                        </span>
                        <span className="text-xs text-zinc-400 font-semibold">
                          {new Date(evt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                          {new Date(evt.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <h4 className="text-sm font-extrabold text-zinc-150">{evt.title}</h4>
                      {evt.description && <p className="text-xs text-zinc-400 leading-relaxed">{evt.description}</p>}
                    </div>

                    <button
                      onClick={() => handleDeleteEvent(evt.id)}
                      className="p-2 text-zinc-500 hover:text-red-400 transition cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="p-8 border border-zinc-850 rounded-2xl text-center space-y-2 bg-zinc-950/40">
                <CalendarIcon className="h-8 w-8 text-zinc-600 mx-auto" />
                <p className="text-xs text-zinc-400 font-semibold">No calendar events for this period.</p>
              </div>
            )}
          </div>

          {/* Quick Add Form */}
          <div className="p-6 bg-[#0d0d11]/80 border border-zinc-850 rounded-2xl space-y-4 h-fit">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <Plus className="h-4 w-4 text-violet-400" /> Quick Add Event
            </h3>
            <form onSubmit={handleCreateEvent} className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-400 font-semibold block mb-1">Event Title</label>
                <input
                  type="text"
                  placeholder="e.g. Operating Systems Exam Prep"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-zinc-400 font-semibold block mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none"
                >
                  <option value="STUDY">Study Session</option>
                  <option value="EXAM">Exam</option>
                  <option value="ASSIGNMENT">Assignment Deadline</option>
                  <option value="PERSONAL">Personal</option>
                  <option value="HOLIDAY">Holiday</option>
                </select>
              </div>
              <div>
                <label className="text-zinc-400 font-semibold block mb-1">Start Time</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-zinc-400 font-semibold block mb-1">End Time</label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-zinc-400 font-semibold block mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Optional notes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition cursor-pointer"
              >
                Schedule Event
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
