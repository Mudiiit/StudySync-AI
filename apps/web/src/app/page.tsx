'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Brain, Calendar, CheckSquare, Layers, Lock, ShieldCheck } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden flex flex-col justify-between font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-purple-600/10 blur-[150px] pointer-events-none" />

      {/* Header bar */}
      <header className="h-20 w-full max-w-7xl mx-auto px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.3)]">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">StudySync AI</span>
        </div>
        
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
            Sign In
          </Link>
          <Link href="/register" className="bg-primary hover:bg-primary/95 text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold shadow-[0_4px_14px_rgba(139,92,246,0.2)] transition-all">
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto px-6 text-center z-10 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="h-3 w-3" />
            Introducing StudySync AI v1.0
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight">
            The AI Productivity Suite <br />
            <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
              Built for Top Students
            </span>
          </h1>

          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Consolidate your planner, calendar, notes, flashcards, and study tutor into one beautiful startup-grade SaaS app. Powered by Google Gemini.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/register" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3.5 rounded-lg font-bold flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_20px_rgba(139,92,246,0.3)] transition-all text-base">
              Get Started Free
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/login" className="w-full sm:w-auto border border-border bg-card/20 hover:bg-card/40 px-8 py-3.5 rounded-lg font-bold cursor-pointer transition-colors text-base">
              Sign In
            </Link>
          </div>
        </motion.div>

        {/* Feature Grid preview */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-20 w-full text-left"
        >
          {[
            { title: 'AI Study Planner', desc: 'Schedules daily slots based on difficulty levels and available study hours.', icon: Brain },
            { title: 'Smart Calendar', desc: 'Keeps track of exams, reminders, and recurring study times with drag-and-drop support.', icon: Calendar },
            { title: 'Task Kanban', desc: 'Manage assignments, notes, and milestones with customizable prioritize tags.', icon: CheckSquare },
            { title: 'Spaced Repetition', desc: 'Create flashcards manually or using AI, tracked via the SM-2 learning algorithm.', icon: Layers },
          ].map((feat, i) => {
            const Icon = feat.icon;
            return (
              <div key={i} className="glass-card p-6 rounded-lg space-y-3 hover:border-primary/30 transition-all group">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-base">{feat.title}</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">{feat.desc}</p>
              </div>
            );
          })}
        </motion.div>
      </main>

      {/* Footer bar */}
      <footer className="h-20 w-full border-t border-border/40 bg-card/10 flex items-center justify-between px-8 text-xs text-muted-foreground z-10">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>Production Ready Architecture</span>
        </div>
        <span>© {new Date().getFullYear()} StudySync AI. Portfolio Demonstration.</span>
      </footer>
    </div>
  );
}
