'use client';

import React, { useState, useEffect, useMemo } from 'react';
import api from '@/lib/axios';
import { useNotesList } from '@/hooks/useNotes';
import { useQuizzesList } from '@/hooks/useQuizzes';
import { useToast } from '@/components/providers/ToastProvider';
import { 
  Target, Award, Calendar, CheckSquare, Sparkles, 
  Plus, Trash, FileText, CheckCircle2, Circle, Trophy
} from 'lucide-react';

interface Milestone {
  id: string;
  title: string;
  completed: boolean;
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
}

interface Achievement {
  id: string;
  title: string;
  desc: string;
  unlocked: boolean;
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

  // Achievements
  const achievements = useMemo<Achievement[]>(() => {
    const totalCompleted = goals.filter((g) => g.completed).length;
    return [
      { id: '1', title: 'Goal Setter', desc: 'Register your first study target', unlocked: goals.length > 0 },
      { id: '2', title: 'Milestone Crusher', desc: 'Complete 3 learning goals', unlocked: totalCompleted >= 3 },
      { id: '3', title: 'Exam Champion', desc: 'Link and finish an Academic goal', unlocked: goals.some((g) => g.category === 'ACADEMIC' && g.completed) }
    ];
  }, [goals]);

  const fetchGoals = async () => {
    try {
      const res = await api.get('/goals');
      const mapped: Goal[] = res.data.map((g: any) => ({
        id: g.id,
        title: g.title,
        category: g.type,
        deadline: g.targetDate.split('T')[0],
        milestones: g.milestones.map((m: any) => ({
          id: m.id,
          title: m.title,
          completed: m.isCompleted,
        })),
        completed: g.isCompleted,
      }));
      setGoals(mapped);
    } catch (err) {
      console.error('Failed to fetch goals:', err);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  // Add Goal
  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDeadline) return;

    const miles = newMilestonesText
      .split('\n')
      .filter((x) => x.trim())
      .map((txt) => txt.trim());

    const type = newCategory === 'WEEKLY' || newCategory === 'MONTHLY' ? 'WEEKLY' : 'SEMESTER';

    try {
      await api.post('/goals', {
        title: newTitle.trim(),
        description: '',
        targetDate: newDeadline,
        type,
        milestones: miles,
      });

      // reset form
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
      showToast('Failed to update milestone', 'error');
    }
  };

  // Toggle goal completion directly
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
      showToast('Failed to update goal', 'error');
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
      showToast('Failed to delete goal', 'error');
    }
  };

  // Filters
  const filteredGoals = useMemo(() => {
    if (activeTab === 'all') return goals;
    return goals.filter((g) => g.category === activeTab);
  }, [goals, activeTab]);

  // Overall completion percentage
  const completionPercentage = useMemo(() => {
    if (goals.length === 0) return 0;
    return Math.round((goals.filter((g) => g.completed).length / goals.length) * 100);
  }, [goals]);

  // AI recommendations
  const aiSuggestions = useMemo(() => {
    const active = goals.filter((g) => !g.completed);
    if (active.length === 0) {
      return ['Great job! All active goals are locked. Register a new milestone.'];
    }
    const highPriorities = active.filter((g) => g.category === 'ACADEMIC');
    if (highPriorities.length > 0) {
      return [
        `Focus on "${highPriorities[0].title}". Academic goals have high impact on your performance.`,
        'Link relevant notes or quizzes to index files directly in your tutor chats.'
      ];
    }
    return [
      `Work on completing "${active[0].title}" milestones. Deadline is approaching fast.`
    ];
  }, [goals]);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 font-sans text-zinc-200">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <Target className="h-7 w-7 text-violet-500" />
            Goals Dashboard
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Segment your semester objectives into weekly, monthly, and academic target milestones.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-550 text-white text-xs font-bold rounded-xl shadow-lg transition cursor-pointer"
        >
          <Plus className="h-4.5 w-4.5" /> New Goal
        </button>
      </div>

      {/* Overview Statistics Progress bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-2xl border border-zinc-800 flex items-center justify-between col-span-2">
          <div className="space-y-1.5 text-left w-full">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Goal Completion Percentage</span>
            <div className="flex items-center gap-4 w-full">
              <h3 className="text-3xl font-extrabold text-zinc-200">{completionPercentage}%</h3>
              <div className="flex-1 bg-zinc-900 border border-zinc-800 h-3 rounded-full overflow-hidden">
                <div 
                  className="bg-violet-600 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>
            <p className="text-[10px] text-zinc-500">{goals.filter(g => g.completed).length} of {goals.length} target milestones accomplished.</p>
          </div>
        </div>

        {/* AI Recommendations panel */}
        <div className="glass-card p-6 rounded-2xl border border-zinc-800 text-left space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-violet-400 uppercase tracking-wider">
            <Sparkles className="h-4 w-4" />
            AI Advisor Suggestions
          </div>
          <div className="space-y-1.5">
            {aiSuggestions.map((s, idx) => (
              <p key={idx} className="text-[11px] text-zinc-450 leading-normal">⚡ {s}</p>
            ))}
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
            <div className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <Target className="h-5 w-5 text-violet-500" />
              Register Study Goal
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

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Milestone Checklists (1 per line)</label>
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

            <div className="flex justify-end gap-2.5 pt-4">
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2.5 text-xs font-bold text-zinc-500 hover:text-zinc-350 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-6 py-2.5 bg-violet-600 hover:bg-violet-550 text-white font-bold text-xs rounded-xl cursor-pointer shadow-lg transition"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Panel grid columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Goals listings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Filters switcher */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-2xl w-fit">
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
                className={`px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-xl transition cursor-pointer ${
                  activeTab === f.id 
                    ? 'bg-violet-600/10 text-violet-400 border border-violet-500/20' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Goal Cards list */}
          <div className="space-y-4">
            {filteredGoals.length === 0 ? (
              <div className="text-center py-16 text-zinc-500 text-xs border border-zinc-800 border-dashed rounded-2xl">
                No active targets logged for this filter category.
              </div>
            ) : (
              filteredGoals.map((g) => {
                const totalMiles = g.milestones.length;
                const completedMiles = g.milestones.filter(m => m.completed).length;
                const progressPct = totalMiles > 0 ? Math.round((completedMiles / totalMiles) * 100) : (g.completed ? 100 : 0);
                
                // Get linked items names
                const linkedNote = notesData?.notes.find(n => n.id === g.linkedNoteId);
                const linkedQuiz = quizzes?.find(q => q.id === g.linkedQuizId);

                return (
                  <div 
                    key={g.id}
                    className={`p-5 border rounded-2xl text-left transition-all ${
                      g.completed 
                        ? 'border-emerald-500/20 bg-emerald-500/5 text-zinc-455' 
                        : 'border-zinc-800 bg-zinc-900/10 text-zinc-200'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleGoal(g.id)}
                          className="text-zinc-500 hover:text-violet-400 cursor-pointer transition shrink-0"
                        >
                          {g.completed ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <Circle className="h-5 w-5 text-zinc-600 hover:text-violet-500" />
                          )}
                        </button>
                        <div className="flex flex-col gap-0.5">
                          <span className={`text-sm font-semibold leading-tight ${g.completed ? 'line-through text-zinc-500' : ''}`}>{g.title}</span>
                          <div className="flex items-center gap-2.5 text-[9px] font-bold text-zinc-500 uppercase mt-0.5">
                            <span className="text-violet-400">{g.category}</span>
                            <span>•</span>
                            <span>Due: {g.deadline}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleDeleteGoal(g.id, e)}
                        className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-rose-500 rounded transition cursor-pointer"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Progress tracking bars */}
                    {totalMiles > 0 && (
                      <div className="space-y-3 pt-2">
                        {/* milestones checklist */}
                        <div className="space-y-1.5 pl-8">
                          {g.milestones.map((m) => (
                            <div 
                              key={m.id}
                              onClick={() => toggleMilestone(g.id, m.id)}
                              className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer transition select-none"
                            >
                              {m.completed ? (
                                <CheckSquare className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                              ) : (
                                <Square className="h-3.5 w-3.5 text-zinc-650 shrink-0" />
                              )}
                              <span className={m.completed ? 'line-through text-zinc-500' : ''}>{m.title}</span>
                            </div>
                          ))}
                        </div>

                        {/* mini bar */}
                        <div className="flex items-center gap-3 pl-8">
                          <div className="flex-1 bg-zinc-900 border border-zinc-850 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-violet-500 h-full rounded-full" style={{ width: `${progressPct}%` }} />
                          </div>
                          <span className="text-[9px] font-bold text-zinc-500">{progressPct}%</span>
                        </div>
                      </div>
                    )}

                    {/* Linked Entity Badges */}
                    {(linkedNote || linkedQuiz) && (
                      <div className="mt-3.5 pt-3.5 border-t border-zinc-850 flex flex-wrap gap-1.5 pl-8">
                        {linkedNote && (
                          <div className="bg-zinc-950 border border-zinc-850 px-2 py-0.5 rounded-lg text-[9px] text-zinc-500 font-semibold flex items-center gap-1">
                            <FileText className="h-3 w-3 text-violet-400" />
                            <span>Linked: {linkedNote.title}</span>
                          </div>
                        )}
                        {linkedQuiz && (
                          <div className="bg-zinc-950 border border-zinc-850 px-2 py-0.5 rounded-lg text-[9px] text-zinc-500 font-semibold flex items-center gap-1">
                            <Award className="h-3 w-3 text-violet-400" />
                            <span>Linked: {linkedQuiz.title}</span>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Sidebar: Achievement Cards */}
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-2xl border border-zinc-800 text-left space-y-4">
            <h3 className="font-bold text-sm font-sans tracking-wide uppercase text-zinc-400 flex items-center gap-1.5">
              <Trophy className="h-4.5 w-4.5 text-violet-500" />
              Unlocked Badges
            </h3>

            <div className="space-y-3">
              {achievements.map((ach) => (
                <div 
                  key={ach.id}
                  className={`p-3 border.5 rounded-xl flex items-center gap-3 transition-all ${
                    ach.unlocked 
                      ? 'bg-violet-600/5 border-violet-500/20 text-zinc-200' 
                      : 'bg-zinc-900/10 border-zinc-850 text-zinc-500 opacity-60'
                  }`}
                >
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                    ach.unlocked ? 'bg-violet-600/10 text-violet-400' : 'bg-zinc-850 text-zinc-650'
                  }`}>
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold leading-tight">{ach.title}</span>
                    <span className="text-[10px] text-zinc-500 leading-normal">{ach.desc}</span>
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

// Router Hook Placeholder
import { useRouter } from 'next/navigation';
import { Square } from 'lucide-react';
