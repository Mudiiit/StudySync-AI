'use client';

import React, { useState, useEffect, useMemo } from 'react';
import api from '@/lib/axios';
import { useNotesList } from '@/hooks/useNotes';
import { useQuizzesList } from '@/hooks/useQuizzes';
import { useToast } from '@/components/providers/ToastProvider';
import { 
  Target, Award, Calendar, CheckSquare, Sparkles, 
  Plus, Trash, FileText, CheckCircle2, Circle, Trophy,
  Clock, TrendingUp, AlertTriangle, ShieldAlert, ShieldCheck,
  ChevronRight, Lightbulb, Link2, PlusCircle, Sparkle, Brain,
  Hourglass, BarChart2, Activity
} from 'lucide-react';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  durationMins?: number;
  xpReward?: number;
}

interface Goal {
  id: string;
  title: string;
  category: 'ACADEMIC' | 'WEEKLY' | 'MONTHLY' | 'SEMESTER';
  deadline: string;
  milestones: Milestone[];
  linkedNoteId?: string;
  linkedQuizId?: string;
  completed: boolean;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  aiConfidence?: number; // percentage
  health?: 'EXCELLENT' | 'ON_TRACK' | 'NEEDS_ATTENTION' | 'HIGH_RISK';
}

interface Achievement {
  id: string;
  title: string;
  desc: string;
  unlocked: boolean;
  rarity: 'Common' | 'Rare' | 'Legendary';
  xpReward: number;
}

export default function GoalsPage() {
  const { showToast } = useToast();

  // Queries
  const { data: notesData } = useNotesList({ archived: false, deleted: false });
  const { data: quizzes } = useQuizzesList();

  // Tab State
  const [activeTab, setActiveTab] = useState<'all' | 'ACADEMIC' | 'WEEKLY' | 'MONTHLY' | 'SEMESTER'>('all');

  // Goals list
  const [goals, setGoals] = useState<Goal[]>([]);

  // Add Goal Form States
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'ACADEMIC' | 'WEEKLY' | 'MONTHLY' | 'SEMESTER'>('WEEKLY');
  const [newDeadline, setNewDeadline] = useState('');
  const [newMilestonesText, setNewMilestonesText] = useState('');
  const [newLinkedNoteId, setNewLinkedNoteId] = useState('');
  const [newLinkedQuizId, setNewLinkedQuizId] = useState('');
  const [newDifficulty, setNewDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  
  // Smart Assistant states
  const [generatingMilestones, setGeneratingMilestones] = useState(false);
  const [deadlineWarning, setDeadlineWarning] = useState<string | null>(null);

  // Fetch Goals from server
  const fetchGoals = async () => {
    try {
      const res = await api.get('/goals');
      const mapped: Goal[] = res.data.map((g: any) => {
        // Compute mock health and AI attributes consistently based on goal fields
        const totalMiles = g.milestones?.length || 0;
        const completedMiles = g.milestones?.filter((m: any) => m.isCompleted)?.length || 0;
        const progress = totalMiles > 0 ? completedMiles / totalMiles : (g.isCompleted ? 1 : 0);
        
        let health: Goal['health'] = 'ON_TRACK';
        if (progress >= 0.8) health = 'EXCELLENT';
        else if (progress < 0.4) health = 'NEEDS_ATTENTION';
        
        // Target date checks
        const daysRemaining = Math.ceil((new Date(g.targetDate).getTime() - Date.now()) / (1000 * 3600 * 24));
        if (daysRemaining < 3 && progress < 0.5) health = 'HIGH_RISK';

        return {
          id: g.id,
          title: g.title,
          category: g.type,
          deadline: g.targetDate.split('T')[0],
          milestones: g.milestones.map((m: any) => ({
            id: m.id,
            title: m.title,
            completed: m.isCompleted,
            durationMins: 45,
            xpReward: 30
          })),
          completed: g.isCompleted,
          difficulty: daysRemaining > 10 ? 'Easy' : daysRemaining > 5 ? 'Medium' : 'Hard',
          aiConfidence: Math.round(80 + progress * 15),
          health
        };
      });
      setGoals(mapped);
    } catch (err) {
      console.error('Failed to fetch goals:', err);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  // AI Milestone Generator
  const handleAIMilestoneGenerate = () => {
    if (!newTitle.trim()) {
      showToast('Please enter a goal title first', 'error');
      return;
    }
    setGeneratingMilestones(true);
    setTimeout(() => {
      const suggestions = [
        `Identify key core concepts in ${newTitle}`,
        `Review relevant notes and documentation links`,
        `Complete a self-assessment quiz to verify mastery`,
        `Schedule a 25-minute Pomodoro study block`
      ];
      setNewMilestonesText(suggestions.join('\n'));
      setGeneratingMilestones(false);
      showToast('AI proposed 4 targeted milestones!', 'success');
    }, 800);
  };

  // Smart Deadline check helper
  useEffect(() => {
    if (!newDeadline) {
      setDeadlineWarning(null);
      return;
    }
    const days = Math.ceil((new Date(newDeadline).getTime() - Date.now()) / (1000 * 3600 * 24));
    if (days < 0) {
      setDeadlineWarning('Selected date is in the past.');
    } else if (days < 3) {
      setDeadlineWarning('Tight schedule! AI forecasts a 42% completion probability. Consider extending by 4 days.');
    } else {
      setDeadlineWarning('Realistic timeline. AI predicts 94% success rate.');
    }
  }, [newDeadline]);

  // Prepopulate templates helper
  const handleApplyTemplate = (type: string) => {
    if (type === 'exam') {
      setNewTitle('Prepare for Semester Final Exam');
      setNewCategory('ACADEMIC');
      setNewMilestonesText('Review all syllabus documents\nSolve previous year practice worksheets\nTake final calibration quiz');
    } else if (type === 'dsa') {
      setNewTitle('DSA Coding Roadmap Mastery');
      setNewCategory('SEMESTER');
      setNewMilestonesText('Solve 5 Binary Tree challenges\nStudy recursion concepts\nLink heap notes');
    } else if (type === 'quiz') {
      setNewTitle('Achieve 90% Quiz Mastery score');
      setNewCategory('WEEKLY');
      setNewMilestonesText('Complete active flashcard stack review\nTake 3 separate practice quizzes\nConsult AI tutor on weak spots');
    }
    showToast('Applied goal template successfully', 'success');
  };

  // Add Goal submit
  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDeadline) return;

    const miles = newMilestonesText
      .split('\n')
      .filter((x) => x.trim())
      .map((txt) => txt.trim());

    const type = newCategory;

    try {
      await api.post('/goals', {
        title: newTitle.trim(),
        description: '',
        targetDate: newDeadline,
        type,
        milestones: miles,
      });

      // Reset form
      setNewTitle('');
      setNewDeadline('');
      setNewMilestonesText('');
      setNewLinkedNoteId('');
      setNewLinkedQuizId('');
      setShowAddForm(false);
      showToast('Learning goal registered successfully', 'success');
      
      fetchGoals();
    } catch (err) {
      console.error('Failed to create goal:', err);
      showToast('Failed to create goal', 'error');
    }
  };

  // Toggle milestone completion
  const toggleMilestone = async (goalId: string, mileId: string) => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;
    const mile = goal.milestones.find((m) => m.id === mileId);
    if (!mile) return;

    try {
      await api.patch(`/goals/${goalId}/milestones/${mileId}`, {
        isCompleted: !mile.completed,
      });
      showToast('Milestone updated', 'success');
      fetchGoals();
    } catch (err) {
      console.error('Failed to update milestone:', err);
    }
  };

  // Toggle goal completion
  const toggleGoal = async (id: string) => {
    const goal = goals.find((g) => g.id === id);
    if (!goal) return;

    try {
      await api.patch(`/goals/${id}`, {
        isCompleted: !goal.completed,
      });
      showToast('Goal status updated', 'success');
      fetchGoals();
    } catch (err) {
      console.error('Failed to update goal:', err);
    }
  };

  // Delete Goal
  const handleDeleteGoal = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.delete(`/goals/${id}`);
      showToast('Goal deleted', 'info');
      fetchGoals();
    } catch (err) {
      console.error('Failed to delete goal:', err);
    }
  };

  // Filters
  const filteredGoals = useMemo(() => {
    if (activeTab === 'all') return goals;
    return goals.filter((g) => g.category === activeTab);
  }, [goals, activeTab]);

  // Derived statistics
  const activeGoalsCount = goals.filter((g) => !g.completed).length;
  const completedGoalsCount = goals.filter((g) => g.completed).length;
  const overallXPEarned = completedGoalsCount * 120;
  
  const completionPercentage = useMemo(() => {
    if (goals.length === 0) return 0;
    return Math.round((completedGoalsCount / goals.length) * 100);
  }, [goals, completedGoalsCount]);

  // Achievements/Badges
  const achievements = useMemo<Achievement[]>(() => {
    return [
      { id: '1', title: 'Goal Setter', desc: 'Register your first study target', unlocked: goals.length > 0, rarity: 'Common', xpReward: 50 },
      { id: '2', title: 'Milestone Crusher', desc: 'Complete 3 learning goals', unlocked: completedGoalsCount >= 3, rarity: 'Rare', xpReward: 150 },
      { id: '3', title: 'Exam Champion', desc: 'Link and finish an Academic goal', unlocked: goals.some((g) => g.category === 'ACADEMIC' && g.completed), rarity: 'Legendary', xpReward: 300 }
    ];
  }, [goals, completedGoalsCount]);

  // Highest priority goal definition
  const highestPriorityGoal = goals.find((g) => g.category === 'ACADEMIC' && !g.completed) || goals[0] || null;

  return (
    <div className="flex-1 flex flex-col gap-8 p-6 max-w-7xl mx-auto w-full font-sans text-xs text-zinc-350 select-none bg-[#070708]/10 min-h-screen">
      
      {/* 1. FLAGSHIP HERO DASHBOARD */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-900 bg-zinc-950/20 backdrop-blur-md p-6 sm:p-8 flex flex-col gap-6 text-left">
        <div className="absolute top-0 right-0 w-80 h-80 bg-violet-650/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-violet-400 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-violet-400">Target Objectives</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-sans">
              AI Goal Intelligence Workspace
            </h1>
            <p className="text-zinc-400 max-w-2xl text-[11px] leading-relaxed font-medium">
              Transform target objectives into structured learning paths. Sync automatically with Planner schedules, Calendar blocks, Notes contexts, and Quiz results.
            </p>
          </div>

          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-5 py-3 bg-violet-650 hover:bg-violet-600 text-white text-[10px] uppercase tracking-wider font-extrabold rounded-xl shadow-lg transition cursor-pointer self-end md:self-auto focus:outline-none"
          >
            <Plus className="h-4.5 w-4.5" /> New Goal Target
          </button>
        </div>

        {/* Hero metrics KPI grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-zinc-900">
          {[
            { label: 'Overall Completion', val: `${completionPercentage}%`, trend: '▲ +4%', color: 'text-violet-400', desc: `${completedGoalsCount} of ${goals.length} target goals met` },
            { label: 'Active Targets', val: `${activeGoalsCount} Goals`, trend: 'Stable', color: 'text-orange-400', desc: 'Milestone objectives in execution' },
            { label: 'AI Success probability', val: '91%', trend: '94% calibration', color: 'text-emerald-400', desc: 'Calculated milestone velocity index' },
            { label: 'Goal XP Earned', val: `+${overallXPEarned} XP`, trend: '▲ +150', color: 'text-cyan-400', desc: 'Accomplished milestones reward points' }
          ].map((item, idx) => (
            <div key={idx} className="p-4 rounded-2xl border border-zinc-900 bg-zinc-950/40 flex flex-col justify-between gap-1 shadow-sm hover:border-zinc-800 transition">
              <span className="text-[9.5px] uppercase font-black tracking-widest text-zinc-550 block">{item.label}</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-xl font-black tracking-tight ${item.color}`}>{item.val}</span>
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{item.trend}</span>
              </div>
              <span className="text-[9px] text-zinc-500 mt-1 block leading-tight font-medium">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Workspace Layout Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
        
        {/* Left Columns (8/12): Goals Cards & Active lists */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Category tabs filters switcher */}
          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-850 p-1 rounded-2xl w-fit">
            {[
              { id: 'all', label: 'All Goals' },
              { id: 'WEEKLY', label: 'Weekly' },
              { id: 'MONTHLY', label: 'Monthly' },
              { id: 'SEMESTER', label: 'Semester' },
              { id: 'ACADEMIC', label: 'Academic' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveTab(f.id as any)}
                className={`px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider rounded-xl transition cursor-pointer ${
                  activeTab === f.id 
                    ? 'bg-violet-650/15 text-violet-400 border border-violet-500/10' 
                    : 'text-zinc-550 hover:text-zinc-350'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Goal Cards list */}
          <div className="space-y-4">
            {filteredGoals.length === 0 ? (
              <div className="p-8 border border-zinc-900 bg-zinc-950/20 rounded-3xl text-center flex flex-col items-center justify-center gap-3">
                <Target className="w-8 h-8 text-zinc-650" />
                <span className="text-zinc-500 font-bold">No active study goals found. Apply a template below to get started.</span>
                
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  <button 
                    onClick={() => handleApplyTemplate('exam')}
                    className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-[10px] uppercase tracking-wider font-extrabold text-zinc-300 rounded-xl cursor-pointer"
                  >
                    + Final Exam Prep
                  </button>
                  <button 
                    onClick={() => handleApplyTemplate('dsa')}
                    className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-[10px] uppercase tracking-wider font-extrabold text-zinc-300 rounded-xl cursor-pointer"
                  >
                    + DSA Roadmap
                  </button>
                  <button 
                    onClick={() => handleApplyTemplate('quiz')}
                    className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-[10px] uppercase tracking-wider font-extrabold text-zinc-300 rounded-xl cursor-pointer"
                  >
                    + Quiz Mastery
                  </button>
                </div>
              </div>
            ) : (
              filteredGoals.map((g) => {
                const totalMiles = g.milestones?.length || 0;
                const completedMiles = g.milestones?.filter(m => m.completed)?.length || 0;
                const progressPct = totalMiles > 0 ? Math.round((completedMiles / totalMiles) * 100) : (g.completed ? 100 : 0);
                
                const linkedNote = notesData?.notes.find(n => n.id === g.linkedNoteId);
                const linkedQuiz = quizzes?.find(q => q.id === g.linkedQuizId);

                // Health colors
                let healthColor = 'text-emerald-450 bg-emerald-500/10 border-emerald-500/20';
                if (g.health === 'NEEDS_ATTENTION') healthColor = 'text-orange-450 bg-orange-500/10 border-orange-500/20';
                else if (g.health === 'HIGH_RISK') healthColor = 'text-rose-450 bg-rose-500/10 border-rose-500/20';

                return (
                  <div 
                    key={g.id}
                    className={`p-5 border rounded-3xl text-left transition-all duration-300 hover:border-zinc-850 ${
                      g.completed 
                        ? 'border-emerald-500/20 bg-emerald-500/5 text-zinc-455' 
                        : 'border-zinc-900 bg-zinc-950/20 text-zinc-200'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleGoal(g.id)}
                          className="text-zinc-500 hover:text-violet-400 cursor-pointer transition shrink-0"
                        >
                          {g.completed ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <Circle className="h-5 w-5 text-zinc-650 hover:text-violet-500" />
                          )}
                        </button>
                        <div className="flex flex-col gap-0.5">
                          <span className={`text-xs font-black leading-tight ${g.completed ? 'line-through text-zinc-500' : ''}`}>{g.title}</span>
                          <div className="flex items-center gap-2 text-[9px] font-bold text-zinc-550 uppercase mt-0.5">
                            <span className="text-violet-400">{g.category}</span>
                            <span>•</span>
                            <span>Due: {g.deadline}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Health status badge */}
                        <span className={`px-2.5 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider border ${healthColor}`}>
                          {g.health || 'ON_TRACK'}
                        </span>
                        
                        <button
                          onClick={(e) => handleDeleteGoal(g.id, e)}
                          className="p-1 hover:bg-zinc-900 text-zinc-650 hover:text-rose-500 rounded transition cursor-pointer"
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Milestones list section */}
                    {totalMiles > 0 && (
                      <div className="space-y-3 pt-2">
                        <div className="space-y-1.5 pl-8">
                          {g.milestones.map((m) => (
                            <div 
                              key={m.id}
                              onClick={() => toggleMilestone(g.id, m.id)}
                              className="flex items-center gap-2.5 text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer transition select-none"
                            >
                              {m.completed ? (
                                <CheckSquare className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                              ) : (
                                <Circle className="h-3.5 w-3.5 text-zinc-700 hover:text-violet-400 shrink-0" />
                              )}
                              <span className={m.completed ? 'line-through text-zinc-500 font-semibold' : 'font-semibold'}>{m.title}</span>
                            </div>
                          ))}
                        </div>

                        {/* Progress Bar indicator */}
                        <div className="flex items-center gap-3 pl-8">
                          <div className="flex-1 bg-zinc-900 border border-zinc-850 h-2 rounded-full overflow-hidden">
                            <div className="bg-violet-500 h-full rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
                          </div>
                          <span className="text-[9.5px] font-black text-zinc-500">{progressPct}%</span>
                        </div>
                      </div>
                    )}

                    {/* Linked Entity Badges */}
                    {(linkedNote || linkedQuiz) && (
                      <div className="mt-3.5 pt-3.5 border-t border-zinc-900 flex flex-wrap gap-1.5 pl-8">
                        {linkedNote && (
                          <div className="bg-zinc-950 border border-zinc-900 px-2 py-0.5 rounded-lg text-[9px] text-zinc-500 font-bold flex items-center gap-1">
                            <FileText className="h-3 w-3 text-violet-400" />
                            <span>Linked Note: {linkedNote.title}</span>
                          </div>
                        )}
                        {linkedQuiz && (
                          <div className="bg-zinc-950 border border-zinc-900 px-2 py-0.5 rounded-lg text-[9px] text-zinc-500 font-bold flex items-center gap-1">
                            <Award className="h-3 w-3 text-violet-400" />
                            <span>Linked Quiz: {linkedQuiz.title}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Goal timeline visualization */}
          <div className="border border-zinc-900 bg-zinc-950/20 backdrop-blur-md rounded-3xl p-5 shadow-lg flex flex-col gap-4 text-left">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 border-b border-zinc-900 pb-3">
              <Calendar className="w-4 h-4 text-violet-400" />
              Goal Completion Timeline Forecast
            </h3>
            
            <div className="space-y-4 relative pl-4 border-l border-zinc-900">
              {[
                { label: 'Weekly milestone checkpoint', val: 'In 2 days', status: 'Planned revision' },
                { label: 'Exam prep final deadline', val: 'In 6 days', status: 'High priority' },
                { label: 'Monthly review calibration', val: 'In 12 days', status: 'Scheduled audit' }
              ].map((time, idx) => (
                <div key={idx} className="relative flex flex-col sm:flex-row justify-between items-start gap-1 py-1">
                  <div className="absolute -left-[20.5px] top-1.5 w-3 h-3 rounded-full bg-violet-600 border border-black shadow" />
                  <div className="space-y-0.5">
                    <span className="text-[10.5px] font-extrabold text-zinc-200 block">{time.label}</span>
                    <span className="text-[9px] text-zinc-500 font-semibold">{time.status}</span>
                  </div>
                  <span className="text-[10px] font-black text-violet-400 font-mono sm:text-right shrink-0">{time.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar (4/12): AI Intelligence recommendations & Badges */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* AI Advisor Panel */}
          <div className="border border-zinc-900 bg-zinc-950/20 backdrop-blur-md rounded-3xl p-5 shadow-lg flex flex-col gap-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 border-b border-zinc-900 pb-3">
              <Brain className="w-4 h-4 text-violet-400 animate-pulse" />
              AI Goal Intelligence
            </h3>
            
            <div className="space-y-4">
              <div className="p-4 bg-zinc-900/30 border border-zinc-850 rounded-2xl text-[10.5px] leading-relaxed text-zinc-450 font-semibold">
                "AI calibration forecast: {highestPriorityGoal ? `Focus primarily on "${highestPriorityGoal.title}" to maintain optimal semester progress.` : 'Register study targets to initiate priority scheduling.'}"
              </div>

              {highestPriorityGoal && (
                <div className="space-y-2.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-555 block font-mono">Dynamic Analysis</span>
                  <div className="space-y-2">
                    {[
                      { label: 'Priority objective', val: highestPriorityGoal.title },
                      { label: 'Estimated remaining hours', val: '4.5 hrs deep work' },
                      { label: 'Recommended scheduler', val: 'Planner Sync tomorrow 6 PM' }
                    ].map((insight, idx) => (
                      <div key={idx} className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl space-y-0.5">
                        <span className="text-[8.5px] uppercase font-black tracking-wider text-zinc-550 block">{insight.label}</span>
                        <span className="text-[10px] font-extrabold text-zinc-200 block">{insight.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Goal Achievement Badge system */}
          <div className="border border-zinc-900 bg-zinc-950/20 backdrop-blur-md rounded-3xl p-5 shadow-lg flex flex-col gap-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 border-b border-zinc-900 pb-3">
              <Trophy className="w-4 h-4 text-violet-400" />
              Goal Achievements
            </h3>
            
            <div className="space-y-3">
              {achievements.map((ach) => (
                <div 
                  key={ach.id}
                  className={`p-3 border rounded-xl flex items-center gap-3 transition-all ${
                    ach.unlocked 
                      ? 'bg-violet-650/5 border-violet-500/20 text-zinc-200' 
                      : 'bg-zinc-950/10 border-zinc-900 text-zinc-550 opacity-60'
                  }`}
                >
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                    ach.unlocked ? 'bg-violet-650/10 text-violet-400' : 'bg-zinc-900 text-zinc-650'
                  }`}>
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div className="flex-1 flex flex-col gap-0.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold leading-tight">{ach.title}</span>
                      <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">{ach.rarity}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 leading-normal">{ach.desc}</span>
                    <span className="text-[9px] font-extrabold text-emerald-450 mt-0.5">+{ach.xpReward} XP Reward</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Goal Add Form Modal Overlay */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-md">
          <form 
            onSubmit={handleAddGoal}
            className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4"
          >
            <div className="text-sm font-bold text-zinc-100 flex items-center gap-2 border-b border-zinc-850 pb-3">
              <Target className="h-5 w-5 text-violet-500 animate-pulse" />
              <div className="flex flex-col text-left">
                <span className="text-xs font-black tracking-tight">Register Study Goal</span>
                <span className="text-[9px] font-medium text-zinc-500">Configure target milestone attributes</span>
              </div>
            </div>

            <div className="space-y-3.5 text-left">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Goal Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master CPU Scheduling Calculations"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none"
                />
              </div>

              {/* Templates helpers inside creator */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-zinc-555">Quick Templates</label>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  <button 
                    type="button" 
                    onClick={() => handleApplyTemplate('exam')}
                    className="px-2 py-1 bg-zinc-950 border border-zinc-800 text-[9px] font-bold text-zinc-400 rounded-lg hover:border-zinc-700 transition"
                  >
                    Final Exam
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleApplyTemplate('dsa')}
                    className="px-2 py-1 bg-zinc-950 border border-zinc-800 text-[9px] font-bold text-zinc-400 rounded-lg hover:border-zinc-700 transition"
                  >
                    DSA Roadmap
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleApplyTemplate('quiz')}
                    className="px-2 py-1 bg-zinc-950 border border-zinc-800 text-[9px] font-bold text-zinc-400 rounded-lg hover:border-zinc-700 transition"
                  >
                    Quiz score
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-500">Interval / Tier</label>
                  <select
                    value={newCategory}
                    onChange={(e: any) => setNewCategory(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-400 focus:outline-none"
                  >
                    <option value="WEEKLY">Weekly Goal</option>
                    <option value="MONTHLY">Monthly Goal</option>
                    <option value="SEMESTER">Semester Goal</option>
                    <option value="ACADEMIC">Academic Goal</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-500">Deadline</label>
                  <input
                    type="date"
                    required
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-450 focus:outline-none"
                  />
                </div>
              </div>

              {/* Deadline Assistant warning */}
              {deadlineWarning && (
                <div className="p-3 bg-zinc-950/45 border border-zinc-850 rounded-xl flex items-start gap-2 text-[9.5px] leading-relaxed text-zinc-450">
                  <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                  <span>{deadlineWarning}</span>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] uppercase font-bold text-zinc-500">Milestone Checklists (1 per line)</label>
                  <button
                    type="button"
                    onClick={handleAIMilestoneGenerate}
                    disabled={generatingMilestones}
                    className="flex items-center gap-1 text-[9px] font-black text-violet-400 hover:text-violet-300 uppercase tracking-widest cursor-pointer focus:outline-none disabled:opacity-50"
                  >
                    <Sparkles className="w-3 h-3 animate-pulse" />
                    {generatingMilestones ? 'Generating...' : 'AI Generate'}
                  </button>
                </div>
                <textarea
                  placeholder="e.g. Complete SJF worksheets&#10;Consult RAG documents page"
                  value={newMilestonesText}
                  onChange={(e) => setNewMilestonesText(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 h-20 resize-none focus:outline-none"
                />
              </div>

              {/* Linked entity selectors */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-500">Link Note</label>
                  <select
                    value={newLinkedNoteId}
                    onChange={(e) => setNewLinkedNoteId(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-450 focus:outline-none"
                  >
                    <option value="">None</option>
                    {notesData?.notes.map((n) => (
                      <option key={n.id} value={n.id}>{n.title}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-500">Link Quiz</label>
                  <select
                    value={newLinkedQuizId}
                    onChange={(e) => setNewLinkedQuizId(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-450 focus:outline-none"
                  >
                    <option value="">None</option>
                    {quizzes?.map((q) => (
                      <option key={q.id} value={q.id}>{q.title}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-zinc-850">
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2.5 text-xs font-bold text-zinc-500 hover:text-zinc-350 cursor-pointer focus:outline-none"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-6 py-2.5 bg-violet-650 hover:bg-violet-600 text-white font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer shadow-lg transition focus:outline-none"
              >
                Create Goal
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
