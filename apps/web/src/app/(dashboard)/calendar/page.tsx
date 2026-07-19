'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/providers/ToastProvider';
import { 
  Calendar as CalendarIcon, Sparkles, Loader2, Plus, 
  Trash2, AlertTriangle, Check, ArrowRight 
} from 'lucide-react';
import api from '@/lib/axios';

interface CalendarEventItem {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Quick Create Form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  
  const { showToast } = useToast();

  const fetchEvents = async () => {
    try {
      // Load current month range boundary
      const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

      const res = await api.get('/calendar/events', {
        params: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      });
      setEvents(res.data);
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
      });

      if (res.data.hasConflict) {
        showToast(`Warning: Event overlaps with: ${res.data.conflictingEvents[0].title}`, 'info');
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

  const handleOptimize = async () => {
    setOptimizing(true);
    showToast('AI is optimizing calendar schedule...', 'info');

    try {
      const res = await api.post('/calendar/optimize', {
        date: selectedDate.toISOString().split('T')[0],
      });

      if (res.data.optimizedEvents?.length > 0) {
        showToast(`AI successfully scheduled ${res.data.optimizedEvents.length} study blocks!`, 'success');
      } else {
        showToast('AI suggests no additional study sessions needed today.', 'info');
      }
      fetchEvents();
    } catch (err) {
      showToast('AI Calendar optimization failed', 'error');
    } finally {
      setOptimizing(false);
    }
  };

  const handleResolveConflict = async (id: string) => {
    try {
      showToast('AI is resolving calendar overlap...', 'info');
      const res = await api.post(`/calendar/resolve/${id}`);
      if (res.data.success) {
        showToast('Event rescheduled to the next available free study block!', 'success');
        fetchEvents();
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'No free time slots available to shift event', 'error');
    }
  };

  const getFormatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const handlePrevMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1));
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6 max-w-7xl mx-auto w-full font-sans text-xs min-h-screen text-foreground select-none">
      
      {/* LEFT SIDEBAR: QUICK CREATE & AI SCHEDULER */}
      <div className="w-full lg:w-4/12 flex flex-col gap-6">
        
        {/* AI Optimizer Panel */}
        <div className="border border-border/40 bg-card rounded-2xl p-5 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm">AI Schedule Planner</span>
              <span className="text-[10px] text-muted-foreground">Auto-balances task workloads.</span>
            </div>
          </div>

          <button
            onClick={handleOptimize}
            disabled={optimizing}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
          >
            {optimizing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            <span>Optimize Today\'s Workload</span>
          </button>
        </div>

        {/* Quick Create Event */}
        <div className="border border-border/40 bg-card rounded-2xl p-5 shadow-lg backdrop-blur-md">
          <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4">Create Event</h2>
          
          <form onSubmit={handleCreateEvent} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Event Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Study Physics, Calculus Exam, etc..."
                className="bg-card border border-border/40 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-primary/60 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details or notes..."
                className="bg-card border border-border/40 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-primary/60 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Start Time</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="bg-card border border-border/40 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-primary/60 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">End Time</label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="bg-card border border-border/40 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-primary/60 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              className="mt-2 w-full bg-secondary hover:bg-secondary/80 text-foreground font-semibold py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add to Calendar</span>
            </button>
          </form>
        </div>

      </div>

      {/* RIGHT CONTAINER: CALENDAR AGENDA VIEWS */}
      <div className="flex-1 border border-border/40 bg-card rounded-2xl shadow-lg backdrop-blur-md p-5 flex flex-col min-h-[500px]">
        
        {/* Calendar Nav Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <button onClick={handlePrevMonth} className="px-2.5 py-1.5 border border-border/30 hover:bg-secondary rounded-lg cursor-pointer">Back</button>
            <span className="font-bold text-sm min-w-[120px] text-center">{getFormatDate(selectedDate)}</span>
            <button onClick={handleNextMonth} className="px-2.5 py-1.5 border border-border/30 hover:bg-secondary rounded-lg cursor-pointer">Next</button>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>Agenda Feed</span>
            </span>
          </div>
        </div>

        {/* Events listing */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1.5 max-h-[550px]">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : events.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground/60">
              <CalendarIcon className="h-12 w-12 stroke-[1.25] text-muted-foreground mb-2" />
              <span>No events scheduled in this range.</span>
            </div>
          ) : (
            events.map((event) => {
              const start = new Date(event.startTime);
              const end = new Date(event.endTime);
              const dateStr = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
              const timeStr = `${start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

              return (
                <div
                  key={event.id}
                  className="border border-border/30 bg-card/45 p-4 rounded-xl flex items-start justify-between gap-4 hover:border-primary/20 transition-all shadow-sm"
                >
                  <div className="flex flex-col gap-1.5">
                    <span className="font-bold text-sm text-foreground line-clamp-1">{event.title}</span>
                    {event.description && <span className="text-muted-foreground break-all">{event.description}</span>}
                    
                    <div className="flex flex-wrap items-center gap-2.5 text-[10px] text-muted-foreground/75 font-semibold mt-1">
                      <span>{dateStr}</span>
                      <span>•</span>
                      <span>{timeStr}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleResolveConflict(event.id)}
                      title="AI Auto-Resolve Collision Overlaps"
                      className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/25 px-2 py-1 rounded text-[9px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <AlertTriangle className="h-3 w-3" />
                      <span>Auto-Reschedule</span>
                    </button>

                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-rose-500 cursor-pointer transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                </div>
              );
            })
          )}
        </div>

      </div>

    </div>
  );
}
