'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { useToast } from '@/components/providers/ToastProvider';
import { useCreateNote } from '@/hooks/useNotes';
import { 
  Calendar, Clock, CheckCircle2, AlertCircle, Plus, 
  Sparkles, Trash, BookOpen, Layers, BarChart3, 
  Settings, CheckSquare, Target, ChevronRight, Copy, Loader2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface StudyBlock {
  id: string;
  subject: string;
  duration: number; // in mins
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  difficulty: 'HARD' | 'MEDIUM' | 'EASY';
  breakRecommend: string;
  completed: boolean;
}

interface Deadline {
  id: string;
  title: string;
  subject: string;
  date: string;
  daysRemaining: number;
}

export default function PlannerPage() {
  const { showToast } = useToast();
  const createNoteMutation = useCreateNote();

  // Tab state
  const [activeTab, setActiveTab] = useState<'schedule' | 'semester' | 'roadmap'>('schedule');

  // Study Blocks
  const [blocks, setBlocks] = useState<StudyBlock[]>([]);
  const [newSubject, setNewSubject] = useState('');
  const [newDuration, setNewDuration] = useState(60);
  const [newPriority, setNewPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');
  const [newDifficulty, setNewDifficulty] = useState<'HARD' | 'MEDIUM' | 'EASY'>('MEDIUM');

  // Semester deadlines
  const [deadlines, setDeadlines] = useState<Deadline[]>([
    { id: '1', title: 'OS Midterm Prep', subject: 'Operating Systems', date: '2026-07-15', daysRemaining: 12 },
    { id: '2', title: 'DBMS Assignment 3', subject: 'Database Systems', date: '2026-07-20', daysRemaining: 17 }
  ]);
  const [newDeadlineTitle, setNewDeadlineTitle] = useState('');
  const [newDeadlineSubject, setNewDeadlineSubject] = useState('');
  const [newDeadlineDate, setNewDeadlineDate] = useState('');

  // AI Roadmap states
  const [subjectInput, setSubjectInput] = useState('');
  const [objectivesInput, setObjectivesInput] = useState('');
  const [focusInput, setFocusInput] = useState('');
  const [roadmapOutput, setRoadmapOutput] = useState<string | null>(null);
  const [loadingRoadmap, setLoadingRoadmap] = useState(false);

  // Settings
  const [availableHours, setAvailableHours] = useState(4);
  const [breakFrequency, setBreakFrequency] = useState(50); // minutes

  // Load from local storage on mount
  useEffect(() => {
    const savedBlocks = localStorage.getItem('study-planner-blocks');
    if (savedBlocks) setBlocks(JSON.parse(savedBlocks));
    else {
      const defaultBlocks: StudyBlock[] = [
        { id: '1', subject: 'Operating Systems', duration: 90, priority: 'HIGH', difficulty: 'HARD', breakRecommend: 'Take 10m break after 45m', completed: false },
        { id: '2', subject: 'Data Structures', duration: 60, priority: 'MEDIUM', difficulty: 'MEDIUM', breakRecommend: 'Take 5m break after 25m', completed: true }
      ];
      setBlocks(defaultBlocks);
      localStorage.setItem('study-planner-blocks', JSON.stringify(defaultBlocks));
    }

    const savedDeadlines = localStorage.getItem('study-planner-deadlines');
    if (savedDeadlines) setDeadlines(JSON.parse(savedDeadlines));
  }, []);

  const saveBlocks = (updated: StudyBlock[]) => {
    setBlocks(updated);
    localStorage.setItem('study-planner-blocks', JSON.stringify(updated));
  };

  const saveDeadlines = (updated: Deadline[]) => {
    setDeadlines(updated);
    localStorage.setItem('study-planner-deadlines', JSON.stringify(updated));
  };

  // Add study block
  const handleAddBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim()) return;

    // Estimate breaks based on duration
    let breakRecommend = 'Take 5m break after 25m';
    if (newDuration >= 90) breakRecommend = 'Take 15m break after 75m';
    else if (newDuration >= 50) breakRecommend = 'Take 10m break after 50m';

    const newBlock: StudyBlock = {
      id: Math.random().toString(),
      subject: newSubject.trim(),
      duration: newDuration,
      priority: newPriority,
      difficulty: newDifficulty,
      breakRecommend,
      completed: false
    };

    saveBlocks([...blocks, newBlock]);
    setNewSubject('');
    showToast('Study session block added', 'success');
  };

  // Toggle complete
  const toggleBlockComplete = (id: string) => {
    const updated = blocks.map((b) => b.id === id ? { ...b, completed: !b.completed } : b);
    saveBlocks(updated);
  };

  // Delete block
  const handleDeleteBlock = (id: string) => {
    saveBlocks(blocks.filter((b) => b.id !== id));
  };

  // Add deadline
  const handleAddDeadline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeadlineTitle.trim() || !newDeadlineDate) return;

    const diffTime = Math.abs(new Date(newDeadlineDate).getTime() - new Date().getTime());
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const newD: Deadline = {
      id: Math.random().toString(),
      title: newDeadlineTitle.trim(),
      subject: newDeadlineSubject.trim() || 'General',
      date: newDeadlineDate,
      daysRemaining
    };

    saveDeadlines([...deadlines, newD].sort((a, b) => a.daysRemaining - b.daysRemaining));
    setNewDeadlineTitle('');
    setNewDeadlineSubject('');
    setNewDeadlineDate('');
    showToast('Deadline added to exam calendar', 'success');
  };

  const handleDeleteDeadline = (id: string) => {
    saveDeadlines(deadlines.filter((d) => d.id !== id));
  };

  // Generate AI Roadmap
  const handleGenerateRoadmap = async () => {
    if (!subjectInput.trim()) return;
    setLoadingRoadmap(true);
    setRoadmapOutput(null);
    try {
      const res = await api.post('/ai/study-plan', {
        subject: subjectInput.trim(),
        objectives: objectivesInput.trim() || 'Master core concepts & pass exams.',
        focus: focusInput.trim() || 'High yield syllabus points.'
      });
      setRoadmapOutput(res.data.plan);
      showToast('AI Study roadmap generated!', 'success');
    } catch (e) {
      showToast('Failed to generate study roadmap', 'error');
    } finally {
      setLoadingRoadmap(false);
    }
  };

  // Save Roadmap as Note
  const saveRoadmapAsNote = async () => {
    if (!roadmapOutput || !subjectInput) return;
    try {
      await createNoteMutation.mutateAsync({
        title: `AI Roadmap: ${subjectInput}`,
        content: roadmapOutput
      });
      showToast('Saved roadmap to Notes', 'success');
    } catch (e) {
      showToast('Failed to save note', 'error');
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 font-sans text-zinc-200">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-violet-500" />
            AI Study Planner
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Plan your semester, organize exam targets, and design customized learning schedules.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 p-1 rounded-xl shrink-0">
          {[
            { id: 'schedule', label: 'Daily Agenda', icon: CheckSquare },
            { id: 'semester', label: 'Semester Plan', icon: Calendar },
            { id: 'roadmap', label: 'AI Roadmap Generator', icon: Sparkles }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  activeTab === tab.id 
                    ? 'bg-violet-600/10 text-violet-400 border border-violet-500/20' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* TAB 1: DAILY AGENDA */}
          {activeTab === 'schedule' && (
            <div className="glass-card p-6 rounded-2xl border border-zinc-800 space-y-6">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <h3 className="font-bold text-lg text-zinc-100 flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-violet-500" />
                  Study Session Blocks
                </h3>
                <span className="text-xs text-zinc-500 font-medium">
                  {blocks.filter(b => b.completed).length} of {blocks.length} Completed
                </span>
              </div>

              {/* Blocks list */}
              <div className="space-y-3">
                {blocks.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500 text-xs">No study blocks created. Add a block below to start.</div>
                ) : (
                  blocks.map((b) => (
                    <div 
                      key={b.id}
                      className={`p-4 border rounded-xl flex items-center justify-between gap-4 transition-all hover:bg-zinc-900/50 ${
                        b.completed 
                          ? 'border-emerald-500/20 bg-emerald-500/5 text-zinc-400' 
                          : 'border-zinc-800 bg-zinc-900/10 text-zinc-200'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <button
                          onClick={() => toggleBlockComplete(b.id)}
                          className="mt-0.5 text-zinc-500 hover:text-violet-400 transition cursor-pointer"
                        >
                          {b.completed ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <div className="h-5 w-5 rounded-full border-2 border-zinc-700 hover:border-violet-500" />
                          )}
                        </button>
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className={`text-sm font-semibold truncate ${b.completed ? 'line-through' : ''}`}>{b.subject}</span>
                          <div className="flex flex-wrap items-center gap-2.5 text-[10px] text-zinc-500 font-bold uppercase">
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {b.duration}m</span>
                            <span>•</span>
                            <span className={b.priority === 'HIGH' ? 'text-rose-500' : 'text-zinc-500'}>{b.priority} PRIORITY</span>
                            <span>•</span>
                            <span className="text-zinc-400">{b.difficulty} DIFFICULTY</span>
                          </div>
                          {!b.completed && (
                            <span className="text-[10px] text-violet-400/80 bg-violet-600/5 border border-violet-500/10 px-2 py-0.5 rounded-md w-fit mt-1 italic">
                              💡 {b.breakRecommend}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteBlock(b.id)}
                        className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-rose-500 rounded transition cursor-pointer"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add Block Form */}
              <form onSubmit={handleAddBlock} className="border-t border-zinc-800 pt-6 space-y-4">
                <div className="text-sm font-bold text-zinc-400 mb-2">Create Study Block</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-500">Subject / Concept</label>
                    <input
                      type="text"
                      placeholder="e.g. Binary Trees, DBMS Normalizations"
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-200 focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-500">Duration (Minutes)</label>
                    <input
                      type="number"
                      value={newDuration}
                      onChange={(e) => setNewDuration(parseInt(e.target.value, 10))}
                      className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-200 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-500">Priority level</label>
                    <select
                      value={newPriority}
                      onChange={(e: any) => setNewPriority(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-400 focus:outline-none"
                    >
                      <option value="HIGH">High Priority</option>
                      <option value="MEDIUM">Medium Priority</option>
                      <option value="LOW">Low Priority</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-500">Difficulty Scale</label>
                    <select
                      value={newDifficulty}
                      onChange={(e: any) => setNewDifficulty(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-400 focus:outline-none"
                    >
                      <option value="HARD">Hard</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="EASY">Easy</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!newSubject.trim()}
                  className="w-full py-2.5 bg-violet-600 hover:bg-violet-550 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" /> Add Study block
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: SEMESTER DEADLINES */}
          {activeTab === 'semester' && (
            <div className="glass-card p-6 rounded-2xl border border-zinc-800 space-y-6">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <h3 className="font-bold text-lg text-zinc-100 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-violet-500" />
                  Upcoming Semester Deadlines
                </h3>
              </div>

              {/* Deadlines lists */}
              <div className="space-y-3">
                {deadlines.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500 text-xs">No deadlines registered yet.</div>
                ) : (
                  deadlines.map((d) => (
                    <div 
                      key={d.id}
                      className="p-4 border border-zinc-800 bg-zinc-900/10 rounded-xl flex items-center justify-between gap-4 hover:bg-zinc-900/30 transition-all"
                    >
                      <div className="flex flex-col gap-1 text-left min-w-0">
                        <span className="text-sm font-semibold truncate">{d.title}</span>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase">
                          <span>{d.subject}</span>
                          <span>•</span>
                          <span>Due: {d.date}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className={`px-2 py-0.5 border rounded text-[10px] font-bold ${
                          d.daysRemaining <= 5 
                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-500 animate-pulse' 
                            : 'bg-zinc-850 border-zinc-800 text-zinc-400'
                        }`}>
                          {d.daysRemaining} days left
                        </div>
                        <button
                          onClick={() => handleDeleteDeadline(d.id)}
                          className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-rose-500 rounded transition cursor-pointer"
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Deadline form */}
              <form onSubmit={handleAddDeadline} className="border-t border-zinc-800 pt-6 space-y-4">
                <div className="text-sm font-bold text-zinc-400 mb-2">Register Deadline</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-500">Deliverable / Target</label>
                    <input
                      type="text"
                      placeholder="e.g. Algorithms Term Project, OS Exam"
                      value={newDeadlineTitle}
                      onChange={(e) => setNewDeadlineTitle(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-200 focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-500">Subject</label>
                    <input
                      type="text"
                      placeholder="e.g. Operating Systems"
                      value={newDeadlineSubject}
                      onChange={(e) => setNewDeadlineSubject(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-200 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-500">Due Date</label>
                  <input
                    type="date"
                    value={newDeadlineDate}
                    onChange={(e) => setNewDeadlineDate(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-400 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!newDeadlineTitle.trim() || !newDeadlineDate}
                  className="w-full py-2.5 bg-violet-600 hover:bg-violet-550 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" /> Add Deadline
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: AI ROADMAP GENERATOR */}
          {activeTab === 'roadmap' && (
            <div className="glass-card p-6 rounded-2xl border border-zinc-800 space-y-6">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <h3 className="font-bold text-lg text-zinc-100 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-violet-500" />
                  AI Study Roadmap
                </h3>
              </div>

              {roadmapOutput ? (
                <div className="space-y-4">
                  {/* Header controls */}
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <h4 className="text-xs font-bold text-violet-400">Roadmap: {subjectInput}</h4>
                    <div className="flex gap-2">
                      <button
                        onClick={saveRoadmapAsNote}
                        className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-850 rounded-lg text-[10px] font-bold text-zinc-300 flex items-center gap-1 hover:bg-zinc-850 cursor-pointer transition"
                      >
                        <Plus className="h-3 w-3" /> Save Note
                      </button>
                      <button
                        onClick={() => setRoadmapOutput(null)}
                        className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-850 rounded-lg text-[10px] font-bold text-zinc-500 hover:text-zinc-300 cursor-pointer transition"
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  {/* Markdown content */}
                  <div className="prose prose-invert prose-xs text-zinc-300 max-w-none text-left leading-relaxed">
                    <ReactMarkdown>{roadmapOutput}</ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-xs text-zinc-450 italic leading-normal">
                    Enter syllabus parameters to build detailed study notes, break frequencies, and progress recommendations.
                  </div>
                  <div className="space-y-3.5">
                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="text-[10px] uppercase font-bold text-zinc-500">Subject Name</label>
                      <input
                        type="text"
                        placeholder="e.g. CPU Scheduling Algorithms"
                        value={subjectInput}
                        onChange={(e) => setSubjectInput(e.target.value)}
                        className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="text-[10px] uppercase font-bold text-zinc-500">Target Objectives</label>
                      <input
                        type="text"
                        placeholder="e.g. Compare Round Robin, Shortest Job First, and Priority algorithms"
                        value={objectivesInput}
                        onChange={(e) => setObjectivesInput(e.target.value)}
                        className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="text-[10px] uppercase font-bold text-zinc-500">Focus Areas</label>
                      <input
                        type="text"
                        placeholder="e.g. Focus on calculations and average turnaround times"
                        value={focusInput}
                        onChange={(e) => setFocusInput(e.target.value)}
                        className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateRoadmap}
                    disabled={loadingRoadmap || !subjectInput.trim()}
                    className="w-full py-3 bg-violet-600 hover:bg-violet-550 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-40"
                  >
                    {loadingRoadmap ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analyzing and Structuring Roadmap...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generate AI Roadmap
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Sidebar Controls Right Column */}
        <div className="space-y-6">
          
          {/* Quick Schedule Parameters */}
          <div className="glass-card p-6 rounded-2xl border border-zinc-800 text-left space-y-4">
            <h3 className="font-bold text-sm font-sans tracking-wide uppercase text-zinc-400">Study Constraints</h3>
            
            <div className="space-y-3.5">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Study Hours Available</span>
                  <span className="text-violet-400">{availableHours} hrs</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={12}
                  value={availableHours}
                  onChange={(e) => setAvailableHours(parseInt(e.target.value, 10))}
                  className="w-full accent-violet-600 bg-zinc-850 h-1 rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Break Intervals</span>
                  <span className="text-violet-400">Every {breakFrequency}m</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={90}
                  step={5}
                  value={breakFrequency}
                  onChange={(e) => setBreakFrequency(parseInt(e.target.value, 10))}
                  className="w-full accent-violet-600 bg-zinc-850 h-1 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Academic Priorities Card */}
          <div className="glass-card p-6 rounded-2xl border border-zinc-800 text-left space-y-4">
            <h3 className="font-bold text-sm font-sans tracking-wide uppercase text-zinc-400">Subject Priorities</h3>
            <div className="space-y-3">
              {[
                { name: 'Operating Systems', pct: 85, color: 'bg-violet-500' },
                { name: 'Database Systems', pct: 50, color: 'bg-emerald-500' },
                { name: 'Data Structures', pct: 70, color: 'bg-blue-500' }
              ].map((sub, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold text-zinc-400">
                    <span>{sub.name}</span>
                    <span>{sub.pct}%</span>
                  </div>
                  <div className="w-full bg-zinc-850 h-1.5 rounded-full overflow-hidden">
                    <div className={`${sub.color} h-full rounded-full`} style={{ width: `${sub.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
