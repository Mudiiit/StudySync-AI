'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { useToast } from '@/components/providers/ToastProvider';
import { 
  Calendar as CalendarIcon, Clock, CheckCircle2, AlertCircle, Plus, 
  Sparkles, Trash, BookOpen, Layers, BarChart3, 
  Settings, CheckSquare, Target, ChevronRight, Copy, Loader2, RefreshCw, Zap, Flame, ShieldAlert, Award
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';

interface StudyBlock {
  id: string;
  subject: string;
  topic: string;
  durationMins: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  difficulty: 'HARD' | 'MEDIUM' | 'EASY';
  breakRecommend?: string;
  isCompleted: boolean;
  tutorMode?: string;
  masteryGain?: number;
  startTime?: string;
  endTime?: string;
}

interface LearningRec {
  id: string;
  type: string;
  actionText: string;
  reasoning: string;
  subject?: string;
  topic?: string;
  priority: string;
  isApplied: boolean;
}

interface AnalyticsData {
  totalStudyMins: number;
  completedBlocks: number;
  focusScore: number;
  completionRate: number;
  learningVelocity: number;
  streakDays: number;
  examReadinessScore: number;
}

export default function PlannerPage() {
  const { showToast } = useToast();

  // Tab state
  const [activeTab, setActiveTab] = useState<'schedule' | 'semester' | 'roadmap' | 'analytics'>('schedule');

  // Loading states
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  // Data states
  const [blocks, setBlocks] = useState<StudyBlock[]>([]);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<LearningRec[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  // Settings / Inputs
  const [availableHours, setAvailableHours] = useState(4);
  const [energyLevel, setEnergyLevel] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');

  // Roadmap Generator state
  const [subjectInput, setSubjectInput] = useState('');
  const [objectivesInput, setObjectivesInput] = useState('');
  const [roadmapOutput, setRoadmapOutput] = useState<any[]>([]);

  const fetchPlannerData = async () => {
    try {
      setLoading(true);
      const [todayRes, recsRes, analyticsRes] = await Promise.all([
        api.get('/planner/today').catch(() => ({ data: { plan: null, revisions: [] } })),
        api.get('/planner/recommendations').catch(() => ({ data: [] })),
        api.get('/planner/analytics').catch(() => ({ data: null })),
      ]);

      if (todayRes.data?.plan?.sessions) {
        setBlocks(todayRes.data.plan.sessions);
      }
      setRevisions(todayRes.data?.revisions || []);
      setRecommendations(recsRes.data || []);
      setAnalytics(analyticsRes.data);
    } catch (e) {
      showToast('Failed to load planner data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlannerData();
  }, []);

  const handleGeneratePlan = async () => {
    try {
      setGenerating(true);
      const res = await api.post('/planner/daily/generate', {
        availableHours,
        energyLevel,
      });
      if (res.data?.sessions) {
        setBlocks(res.data.sessions);
        showToast('AI Daily Study Plan generated!', 'success');
      }
    } catch (e: any) {
      showToast('Failed to generate daily plan', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleOptimizeWorkload = async () => {
    try {
      setOptimizing(true);
      const res = await api.post('/planner/optimize-today');
      if (res.data?.sessions) {
        setBlocks(res.data.sessions);
      }
      showToast(res.data?.message || 'Workload optimized successfully!', 'success');
    } catch (e: any) {
      showToast('Failed to optimize workload', 'error');
    } finally {
      setOptimizing(false);
    }
  };

  const handleToggleComplete = async (sessionId: string) => {
    try {
      await api.patch(`/planner/sessions/${sessionId}/complete`);
      setBlocks((prev) =>
        prev.map((b) => (b.id === sessionId ? { ...b, isCompleted: true } : b)),
      );
      showToast('Session completed! Revision scheduled.', 'success');
      fetchPlannerData();
    } catch (e: any) {
      showToast('Failed to update session status', 'error');
    }
  };

  const handleApplyRec = async (recId: string) => {
    try {
      await api.post(`/planner/recommendations/${recId}/apply`);
      setRecommendations((prev) => prev.filter((r) => r.id !== recId));
      showToast('Recommendation applied to schedule!', 'success');
      handleGeneratePlan();
    } catch (e) {
      showToast('Failed to apply recommendation', 'error');
    }
  };

  const handleGenerateRoadmap = async () => {
    if (!subjectInput.trim()) {
      showToast('Please enter a subject', 'info');
      return;
    }
    try {
      setGenerating(true);
      const res = await api.post('/planner/roadmap/generate', {
        subject: subjectInput,
        objectives: objectivesInput,
        weeksDuration: 4,
      });
      setRoadmapOutput(res.data);
      showToast('Semester Roadmap generated!', 'success');
    } catch (e) {
      showToast('Failed to generate roadmap', 'error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070708] text-zinc-100 p-6 lg:p-10 select-text">
      {/* Top Header */}
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white">AI Study Planner & Roadmap</h1>
                <p className="text-xs text-zinc-400 font-medium mt-0.5">
                  Cognitive Schedule Optimizer grounded in your Tutor memory & Knowledge Engine.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleOptimizeWorkload}
              disabled={optimizing}
              className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-xl text-xs font-bold text-violet-400 hover:text-violet-300 transition cursor-pointer disabled:opacity-50"
            >
              {optimizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span>Optimize Workload</span>
            </button>
            <button
              onClick={handleGeneratePlan}
              disabled={generating}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-900/20 transition cursor-pointer disabled:opacity-50"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span>Generate AI Daily Plan</span>
            </button>
          </div>
        </div>

        {/* AI Recommendations Banner */}
        {recommendations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommendations.slice(0, 3).map((rec) => (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-gradient-to-r from-violet-950/20 to-zinc-950 border border-violet-500/20 rounded-2xl flex flex-col justify-between gap-3 shadow-md"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-violet-400">
                    <span className="flex items-center gap-1">
                      <Zap className="h-3 w-3" /> AI Recommendation
                    </span>
                    <span className="px-2 py-0.5 bg-violet-500/10 border border-violet-500/20 rounded-md">
                      {rec.priority}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-zinc-150">{rec.actionText}</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2">{rec.reasoning}</p>
                </div>
                <button
                  onClick={() => handleApplyRec(rec.id)}
                  className="w-full py-1.5 bg-violet-600/20 hover:bg-violet-600/40 border border-violet-500/30 rounded-xl text-[11px] font-bold text-violet-300 transition cursor-pointer text-center"
                >
                  Apply to Schedule
                </button>
              </motion.div>
            ))}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
          {[
            { id: 'schedule', label: 'Daily Agenda', icon: Clock },
            { id: 'roadmap', label: 'AI Roadmap Generator', icon: Layers },
            { id: 'analytics', label: 'Productivity & Analytics', icon: BarChart3 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-violet-600/15 border border-violet-500/30 text-violet-400'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab 1: DAILY AGENDA */}
        {activeTab === 'schedule' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Col: Study Blocks list */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-zinc-200 uppercase tracking-wider">Today's Study Blocks</h3>
                <span className="text-xs font-bold text-zinc-400">
                  {blocks.filter((b) => b.isCompleted).length} / {blocks.length} Completed
                </span>
              </div>

              {blocks.length > 0 ? (
                <div className="space-y-3">
                  {blocks.map((block) => (
                    <motion.div
                      key={block.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-5 rounded-2xl border transition-all ${
                        block.isCompleted
                          ? 'bg-zinc-950/40 border-zinc-900 opacity-60'
                          : 'bg-[#0d0d11]/80 border-zinc-850 hover:border-zinc-750 shadow-md'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1.5 flex-grow">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-violet-400 uppercase tracking-wide">
                              {block.subject}
                            </span>
                            <span className="h-1 w-1 bg-zinc-700 rounded-full" />
                            <span
                              className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                                block.difficulty === 'HARD'
                                  ? 'bg-red-500/10 border-red-500/20 text-red-400'
                                  : block.difficulty === 'MEDIUM'
                                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              }`}
                            >
                              {block.difficulty}
                            </span>
                          </div>
                          <h4 className="text-sm font-extrabold text-zinc-150">{block.topic}</h4>
                          {block.breakRecommend && (
                            <p className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-zinc-500" />
                              <span>{block.durationMins} mins — {block.breakRecommend}</span>
                            </p>
                          )}
                        </div>

                        {/* Completion Button */}
                        <button
                          onClick={() => handleToggleComplete(block.id)}
                          disabled={block.isCompleted}
                          className={`p-2.5 rounded-xl border transition cursor-pointer shrink-0 ${
                            block.isCompleted
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : 'bg-zinc-900 border-zinc-800 hover:border-violet-500/40 text-zinc-400 hover:text-violet-400'
                          }`}
                        >
                          <CheckCircle2 className="h-5 w-5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="p-8 border border-zinc-850 rounded-2xl text-center space-y-3 bg-zinc-950/40">
                  <Clock className="h-8 w-8 text-zinc-600 mx-auto" />
                  <p className="text-xs text-zinc-400 font-semibold">No study blocks generated for today yet.</p>
                  <button
                    onClick={handleGeneratePlan}
                    className="px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Generate Study Schedule
                  </button>
                </div>
              )}
            </div>

            {/* Right Col: Controls & Spaced Repetition */}
            <div className="space-y-6">
              {/* Daily Preferences Card */}
              <div className="p-5 bg-[#0d0d11]/80 border border-zinc-850 rounded-2xl space-y-4">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <Settings className="h-4 w-4 text-violet-400" /> Daily Target & Energy
                </h4>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-zinc-400 font-semibold block mb-1">Target Study Hours</label>
                    <input
                      type="number"
                      value={availableHours}
                      onChange={(e) => setAvailableHours(Number(e.target.value))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 font-semibold block mb-1">Energy Level</label>
                    <select
                      value={energyLevel}
                      onChange={(e) => setEnergyLevel(e.target.value as any)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none"
                    >
                      <option value="HIGH">High Energy (Focus on Hard Topics)</option>
                      <option value="MEDIUM">Medium Energy (Balanced Schedule)</option>
                      <option value="LOW">Low Energy (Light Revision)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Spaced Repetition Panel */}
              <div className="p-5 bg-[#0d0d11]/80 border border-zinc-850 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-emerald-400" /> Spaced Repetition (SM-2)
                </h4>
                {revisions.length > 0 ? (
                  <div className="space-y-2">
                    {revisions.map((rev) => (
                      <div key={rev.id} className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl text-xs space-y-1">
                        <span className="font-bold text-zinc-200 block">{rev.topicName}</span>
                        <span className="text-[10px] text-zinc-400 block">{rev.subject} — Interval: {rev.intervalDays} days</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-zinc-400 italic">No revisions pending today.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: AI ROADMAP GENERATOR */}
        {activeTab === 'roadmap' && (
          <div className="space-y-6 max-w-4xl">
            <div className="p-6 bg-[#0d0d11]/80 border border-zinc-850 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Generate Semester Roadmap</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Subject (e.g. Data Structures & Algorithms)"
                  value={subjectInput}
                  onChange={(e) => setSubjectInput(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-200 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Objectives (e.g. Prepare for midterms)"
                  value={objectivesInput}
                  onChange={(e) => setObjectivesInput(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-200 focus:outline-none"
                />
              </div>
              <button
                onClick={handleGenerateRoadmap}
                disabled={generating}
                className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                {generating ? 'Generating...' : 'Build 4-Week Dynamic Roadmap'}
              </button>
            </div>

            {/* Generated Roadmap Timeline */}
            {roadmapOutput.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Structured Roadmap Breakdown</h4>
                {roadmapOutput.map((step, idx) => (
                  <div key={idx} className="p-5 bg-zinc-950 border border-zinc-850 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-extrabold text-violet-400">{step.title}</h5>
                      <span className="text-[10px] font-bold text-zinc-400">{step.estimatedHours} Hours Estimated</span>
                    </div>
                    <p className="text-xs text-zinc-300">{step.description}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {step.topics?.map((topic: string, tidx: number) => (
                        <span key={tidx} className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded-md text-[10px] text-zinc-400">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: ANALYTICS & INSIGHTS */}
        {activeTab === 'analytics' && analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-5 bg-[#0d0d11]/80 border border-zinc-850 rounded-2xl space-y-2 text-center">
              <Flame className="h-6 w-6 text-orange-500 mx-auto" />
              <span className="block text-2xl font-black text-white">{analytics.streakDays} Days</span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Study Streak</span>
            </div>
            <div className="p-5 bg-[#0d0d11]/80 border border-zinc-850 rounded-2xl space-y-2 text-center">
              <Award className="h-6 w-6 text-violet-400 mx-auto" />
              <span className="block text-2xl font-black text-white">{analytics.examReadinessScore}%</span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Exam Readiness Score</span>
            </div>
            <div className="p-5 bg-[#0d0d11]/80 border border-zinc-850 rounded-2xl space-y-2 text-center">
              <Zap className="h-6 w-6 text-indigo-400 mx-auto" />
              <span className="block text-2xl font-black text-white">{analytics.learningVelocity}x</span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Learning Velocity</span>
            </div>
            <div className="p-5 bg-[#0d0d11]/80 border border-zinc-850 rounded-2xl space-y-2 text-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto" />
              <span className="block text-2xl font-black text-white">{analytics.completionRate}%</span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Task Completion Rate</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
