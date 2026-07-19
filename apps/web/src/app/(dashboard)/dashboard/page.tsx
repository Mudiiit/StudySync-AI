'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { motion } from 'framer-motion';
import { 
  Flame, Clock, Calendar, CheckCircle2, 
  ArrowRight, BookOpen, AlertCircle, Sparkles, Plus 
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/axios';

interface Exam {
  id: string;
  title: string;
  date: string;
  daysRemaining: number;
}

const mockExams: Exam[] = [
  { id: '1', title: 'Data Structures & Algorithms Final', date: 'Jul 15, 2026', daysRemaining: 13 },
  { id: '2', title: 'Operating Systems Midterm', date: 'Jul 22, 2026', daysRemaining: 20 },
];

const mockAiSuggestions = [
  { id: '1', type: 'revision', text: 'You haven\'t reviewed "Red-Black Trees" flashcards in 3 days. Spaced repetition due today.' },
  { id: '2', type: 'schedule', text: 'Gemini Planner noticed a free slot at 4:00 PM. Schedule revision for Database Systems?' },
  { id: '3', type: 'insight', text: 'Your average Focus Session length improved by 8% this week. Keep it up!' },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [greeting, setGreeting] = useState('Welcome');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const [docs, setDocs] = useState<any[]>([]);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const res = await api.get('/rag/documents');
        const enriched = res.data.map((doc: any) => {
          const lastOpened = parseInt(localStorage.getItem(`doc-last-opened-${doc.id}`) || '0', 10);
          const chatCount = parseInt(localStorage.getItem(`doc-chat-count-${doc.id}`) || '0', 10);
          const annotations = JSON.parse(localStorage.getItem(`doc-annotations-${doc.id}`) || '[]');
          return {
            ...doc,
            lastOpened,
            chatCount,
            highlightsCount: annotations.length
          };
        });
        setDocs(enriched);
      } catch (e) {
        // ignore
      }
    };
    fetchDocs();
  }, []);

  const recentlyOpened = useMemo(() => {
    return [...docs].filter(d => d.lastOpened > 0).sort((a, b) => b.lastOpened - a.lastOpened).slice(0, 3);
  }, [docs]);

  const mostStudied = useMemo(() => {
    return [...docs].filter(d => d.chatCount > 0).sort((a, b) => b.chatCount - a.chatCount).slice(0, 3);
  }, [docs]);

  const mostHighlighted = useMemo(() => {
    return [...docs].filter(d => d.highlightsCount > 0).sort((a, b) => b.highlightsCount - a.highlightsCount).slice(0, 3);
  }, [docs]);

  if (!user) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-sans">
            {greeting}, {user.profile.firstName} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            "Your limitation—it's only your imagination." Here is your dashboard review.
          </p>
        </div>
        <Link href="/planner">
          <div className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-semibold cursor-pointer shadow-[0_4px_14px_rgba(139,92,246,0.2)] transition-all">
            <Plus className="h-4.5 w-4.5" />
            Generate Study Schedule
          </div>
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: 'Study Time Today', value: '2.4 hrs', desc: 'Goal: 3.0 hrs', icon: Clock, color: 'text-primary bg-primary/10' },
          { label: 'Focus Streak', value: '6 days', desc: 'Personal best: 14 days', icon: Flame, color: 'text-orange-500 bg-orange-500/10' },
          { label: 'Task Completion', value: '82%', desc: '14 tasks completed', icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-500/10' },
          { label: 'Productivity Score', value: 'A-', desc: 'Top 10% in cohort', icon: Sparkles, color: 'text-teal-500 bg-teal-500/10' },
        ].map((metric, i) => {
          const Icon = metric.icon;
          return (
            <div key={i} className="glass-card p-6 rounded-lg flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{metric.label}</span>
                <h3 className="text-2xl font-bold font-sans">{metric.value}</h3>
                <p className="text-xs text-muted-foreground">{metric.desc}</p>
              </div>
              <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${metric.color}`}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1: AI Recommendations & Countdown */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* AI Advisor Panel */}
          <div className="glass-panel p-6 rounded-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5">
              <Sparkles className="h-24 w-24 text-primary" />
            </div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-lg font-sans">AI Learning Assistant</h3>
            </div>
            
            <div className="space-y-4">
              {mockAiSuggestions.map((item) => (
                <div key={item.id} className="flex gap-3 p-3 bg-secondary/20 rounded-md border border-border/30 text-sm">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                    <Sparkles className="h-3 w-3" />
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Today's Schedule agenda */}
          <div className="glass-card p-6 rounded-lg">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg font-sans">Today's Agenda</h3>
              <Link href="/calendar" className="text-xs text-primary hover:underline flex items-center gap-1">
                View full calendar
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            
            <div className="space-y-4">
              {[
                { time: '09:00 AM - 11:30 AM', subject: 'Data Structures', task: 'Review AVL Tree balance factors', completed: true },
                { time: '01:00 PM - 02:30 PM', subject: 'Operating Systems', task: 'Process synchronizations and semaphores lecture', completed: false },
                { time: '04:00 PM - 05:00 PM', subject: 'General Study', task: 'RAG Tutor - Ask questions about midterm syllabus', completed: false },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3.5 bg-secondary/10 rounded-lg border border-border/30 hover:border-primary/20 transition-all">
                  <div className="flex flex-col gap-1 text-left">
                    <span className="text-xs text-muted-foreground font-medium">{item.time}</span>
                    <span className="text-sm font-semibold">{item.subject}</span>
                    <span className="text-xs text-muted-foreground">{item.task}</span>
                  </div>
                  <div className={`px-2.5 py-1 rounded text-xs font-semibold ${
                    item.completed 
                      ? 'bg-emerald-500/10 text-emerald-500' 
                      : 'bg-primary/10 text-primary'
                  }`}>
                    {item.completed ? 'Finished' : 'Upcoming'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Column 2: Exams & Habits count */}
        <div className="space-y-6">
          
          {/* Exam Countdowns */}
          <div className="glass-card p-6 rounded-lg">
            <h3 className="font-bold text-lg font-sans mb-4">Exam Countdowns</h3>
            <div className="space-y-4">
              {mockExams.map((exam) => (
                <div key={exam.id} className="p-4 bg-secondary/15 rounded-lg border border-border/40 text-left">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-sm leading-tight">{exam.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">Date: {exam.date}</p>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-2 py-0.5 rounded text-xs font-bold font-sans">
                      {exam.daysRemaining}d left
                    </div>
                  </div>
                  {/* progress bar */}
                  <div className="w-full bg-secondary h-1.5 rounded-full mt-3 overflow-hidden">
                    <div 
                      className="bg-red-500 h-full rounded-full" 
                      style={{ width: `${Math.max(10, 100 - (exam.daysRemaining * 3))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats list (Focus levels) */}
          <div className="glass-card p-6 rounded-lg text-left">
            <h3 className="font-bold text-lg font-sans mb-4">Focus Levels</h3>
            <div className="space-y-4">
              {[
                { subject: 'Data Structures', pct: 85, color: 'bg-primary' },
                { subject: 'Operating Systems', pct: 60, color: 'bg-blue-500' },
                { subject: 'Database Systems', pct: 75, color: 'bg-emerald-500' },
              ].map((stat, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span>{stat.subject}</span>
                    <span>{stat.pct}% efficiency</span>
                  </div>
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div className={`${stat.color} h-full rounded-full`} style={{ width: `${stat.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Document Intelligence Analytics */}
          <div className="glass-card p-6 rounded-lg text-left">
            <h3 className="font-bold text-sm font-sans mb-4 tracking-wide uppercase text-zinc-400">Document Intelligence</h3>
            <div className="space-y-4">
              {/* Recently Opened */}
              <div>
                <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest block mb-2">Recently Opened</span>
                {recentlyOpened.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">No recently opened files.</p>
                ) : (
                  <div className="space-y-1.5">
                    {recentlyOpened.map((d) => (
                      <Link key={d.id} href="/documents" className="block p-2.5 bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-800 rounded-xl transition-all">
                        <div className="text-xs font-semibold truncate text-zinc-200">{d.name}</div>
                        <div className="text-[9px] text-zinc-500 mt-0.5">Opened {new Date(d.lastOpened).toLocaleDateString()}</div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Most Studied */}
              <div>
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block mb-2">Most Studied</span>
                {mostStudied.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">No chat interactions yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {mostStudied.map((d) => (
                      <Link key={d.id} href="/documents" className="block p-2.5 bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-800 rounded-xl transition-all">
                        <div className="text-xs font-semibold truncate text-zinc-200">{d.name}</div>
                        <div className="text-[9px] text-zinc-500 mt-0.5">{d.chatCount} queries grounded</div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Most Highlighted */}
              <div>
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest block mb-2">Most Highlighted</span>
                {mostHighlighted.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">No highlights yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {mostHighlighted.map((d) => (
                      <Link key={d.id} href="/documents" className="block p-2.5 bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-800 rounded-xl transition-all">
                        <div className="text-xs font-semibold truncate text-zinc-200">{d.name}</div>
                        <div className="text-[9px] text-zinc-500 mt-0.5">{d.highlightsCount} annotations stored</div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
