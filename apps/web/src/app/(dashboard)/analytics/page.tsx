'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/providers/ToastProvider';
import { 
  Activity, Sparkles, Loader2, Download, 
  TrendingUp, Award, Calendar, BookOpen, AlertCircle, Compass 
} from 'lucide-react';
import api from '@/lib/axios';

interface DashboardStats {
  totalStudyMinutes: number;
  totalCompletedTasks: number;
  averageQuizScore: number;
  history: {
    date: string;
    studyMinutes: number;
    completedTasks: number;
    quizScoresAvg: number;
  }[];
}

interface ForecastStats {
  upcomingTasksCount: number;
  busyLevel: string;
  completionRate: number;
  completionProbability: number;
  deadlineRisk: string;
  examReadinessScore: number;
}

interface RecommendationItem {
  type: string;
  title: string;
  description: string;
  actionUrl: string;
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [forecast, setForecast] = useState<ForecastStats | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [aiInsights, setAiInsights] = useState<string>('');
  
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const { showToast } = useToast();

  const fetchDashboardData = async () => {
    try {
      const [dashRes, foreRes, recRes] = await Promise.all([
        api.get('/analytics/dashboard', { params: { days } }),
        api.get('/analytics/forecast'),
        api.get('/analytics/recommendations'),
      ]);
      setStats(dashRes.data);
      setForecast(foreRes.data);
      setRecommendations(recRes.data);
    } catch (e: any) {
      showToast('Failed to load dashboard metrics', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadAiInsights = async () => {
    setInsightsLoading(true);
    try {
      const res = await api.get('/analytics/insights');
      setAiInsights(res.data.review);
    } catch (err) {
      showToast('Failed to generate AI insights', 'error');
    } finally {
      setInsightsLoading(false);
    }
  };

  const handleExportCSV = () => {
    const token = localStorage.getItem('accessToken');
    const exportUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/analytics/export?token=${token}`;
    window.open(exportUrl, '_blank');
    showToast('Exporting study history report...', 'success');
  };

  useEffect(() => {
    fetchDashboardData();
  }, [days]);

  if (loading || !stats) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate visual properties
  const maxStudyVal = Math.max(...stats.history.map((h) => h.studyMinutes), 60);

  return (
    <div className="flex-1 flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full font-sans text-xs text-foreground select-none">
      
      {/* HEADER CONTROL row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm">Study Analytics & Intelligence</span>
            <span className="text-[10px] text-muted-foreground">Aggregated workload mapping and recommendations.</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Days filters */}
          <div className="flex bg-secondary/35 border border-border/40 p-1 rounded-xl">
            <button 
              onClick={() => setDays(7)} 
              className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-colors ${days === 7 ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              7 Days
            </button>
            <button 
              onClick={() => setDays(30)} 
              className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-colors ${days === 30 ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              30 Days
            </button>
          </div>

          {/* Export Report */}
          <button
            onClick={handleExportCSV}
            className="bg-secondary hover:bg-secondary/80 text-foreground font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Study time */}
        <div className="border border-border/40 bg-card rounded-2xl p-4 flex flex-col gap-1 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Study Time</span>
          <span className="text-xl font-extrabold text-foreground">{Math.round(stats.totalStudyMinutes / 60)} hrs</span>
          <span className="text-[10px] text-muted-foreground/70">{stats.totalStudyMinutes} total minutes logged</span>
        </div>

        {/* Completed tasks */}
        <div className="border border-border/40 bg-card rounded-2xl p-4 flex flex-col gap-1 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Completed Tasks</span>
          <span className="text-xl font-extrabold text-foreground">{stats.totalCompletedTasks} items</span>
          <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Productive task status flow</span>
          </span>
        </div>

        {/* Quiz average */}
        <div className="border border-border/40 bg-card rounded-2xl p-4 flex flex-col gap-1 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Quiz Performance</span>
          <span className="text-xl font-extrabold text-foreground">{Math.round(stats.averageQuizScore)}%</span>
          <span className="text-[10px] text-muted-foreground/70">Average across revision checks</span>
        </div>

        {/* Readiness index */}
        <div className="border border-border/40 bg-card rounded-2xl p-4 flex flex-col gap-1 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Exam Readiness</span>
          <span className="text-xl font-extrabold text-foreground">{forecast?.examReadinessScore || 85}%</span>
          <span className="text-[10px] text-primary font-semibold">Active consistency indexes</span>
        </div>

      </div>

      {/* CHARTS & AI INSIGHTS BLOCK */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Study Trend Bar Chart (SVG) */}
        <div className="lg:col-span-8 border border-border/40 bg-card rounded-2xl p-5 shadow-lg backdrop-blur-md flex flex-col gap-4">
          <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Study Activity Trend</h2>
          
          {/* Custom SVG Bar Graph */}
          <div className="flex-1 min-h-[220px] flex items-end gap-3 px-2 border-b border-border/30 pb-2">
            {stats.history.map((h, idx) => {
              const heightPct = Math.round((h.studyMinutes / maxStudyVal) * 80) + 5;
              const dateStr = new Date(h.date).toLocaleDateString([], { weekday: 'short' });
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-[9px] text-muted-foreground font-bold">{h.studyMinutes}m</span>
                  <div 
                    title={`${h.studyMinutes} study mins on ${dateStr}`}
                    className="w-full bg-primary/20 border-t-2 border-primary rounded-t-lg transition-all duration-500 hover:bg-primary/35 cursor-help"
                    style={{ height: `${heightPct}%` }}
                  />
                  <span className="text-[10px] font-bold text-muted-foreground/80 mt-1">{dateStr}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Workload Forecast details */}
        <div className="lg:col-span-4 border border-border/40 bg-card rounded-2xl p-5 shadow-lg backdrop-blur-md flex flex-col gap-4">
          <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Workload Forecast</h2>

          {forecast && (
            <div className="flex flex-col gap-4">
              {/* Busy Level Gauge */}
              <div className="flex items-center justify-between border-b border-border/30 pb-3">
                <span className="text-muted-foreground font-semibold">Weekly Load Index:</span>
                <span className={`px-2.5 py-1 rounded text-[10px] font-extrabold border ${
                  forecast.busyLevel === 'HIGH' ? 'bg-rose-500/10 text-rose-400 border-rose-500/25' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                }`}>
                  {forecast.busyLevel}
                </span>
              </div>

              {/* Deadline risk indicator */}
              <div className="flex items-center justify-between border-b border-border/30 pb-3">
                <span className="text-muted-foreground font-semibold">Overdue / Deadline Risk:</span>
                <span className={`px-2.5 py-1 rounded text-[10px] font-extrabold border ${
                  forecast.deadlineRisk === 'HIGH' ? 'bg-rose-500/10 text-rose-400 border-rose-500/25' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                }`}>
                  {forecast.deadlineRisk}
                </span>
              </div>

              {/* Completion Probability progress bar */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between font-semibold">
                  <span className="text-muted-foreground">Completion Probability:</span>
                  <span className="text-foreground">{forecast.completionProbability}%</span>
                </div>
                <div className="h-2 bg-secondary border border-border/40 rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${forecast.completionProbability}%` }} />
                </div>
              </div>

              <div className="flex gap-2 items-start bg-secondary/20 p-3 rounded-xl border border-border/20 text-muted-foreground">
                <AlertCircle className="h-4.5 w-4.5 text-primary mt-0.5 shrink-0" />
                <span>AI predicts a completion velocity of {forecast.completionRate}% for upcoming milestones. Keep checking off priorities on time.</span>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* AI INSIGHTS & PERSONALIZED SUGGESTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* AI Recommendations Panel */}
        <div className="border border-border/40 bg-card rounded-2xl p-5 shadow-lg backdrop-blur-md flex flex-col gap-3.5">
          <div className="flex items-center gap-2 border-b border-border/30 pb-2 mb-1">
            <Compass className="h-4.5 w-4.5 text-primary" />
            <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Study Recommendations</h2>
          </div>

          <div className="flex flex-col gap-3">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="border border-border/30 bg-card/45 p-3 rounded-xl flex items-start gap-3 shadow-sm hover:border-primary/20 transition-all">
                <div className="h-6 w-6 rounded bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-foreground">{rec.title}</span>
                  <span className="text-muted-foreground">{rec.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI report summary bubble */}
        <div className="border border-border/40 bg-card rounded-2xl p-5 shadow-lg backdrop-blur-md flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-border/30 pb-2 mb-1">
            <Sparkles className="h-4.5 w-4.5 text-primary animate-pulse" />
            <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">AI Intelligence Insights</h2>
          </div>

          {aiInsights ? (
            <div className="bg-primary/5 border border-primary/15 p-4 rounded-xl text-foreground leading-relaxed text-xs">
              {aiInsights}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted-foreground/60">
              <Sparkles className="h-8 w-8 stroke-[1.25] text-primary mb-2 animate-pulse" />
              <span>Review consistency metrics and generate weekly review recommendations.</span>
              
              <button
                onClick={loadAiInsights}
                disabled={insightsLoading}
                className="mt-4 bg-secondary hover:bg-secondary/85 text-foreground font-semibold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
              >
                {insightsLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                )}
                <span>Generate AI Review Report</span>
              </button>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
