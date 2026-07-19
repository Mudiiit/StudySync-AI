'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useTheme } from '@/components/providers/ThemeProvider';
import Link from 'next/link';
import CommandPalette from '@/components/layout/CommandPalette';
import UnlockOverlay from '@/components/profile/UnlockOverlay';
import LevelUpOverlay from '@/components/profile/LevelUpOverlay';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import socialService from '@/services/social';
import { 
  Sparkles, Calendar, CheckSquare, FileText, Layers, 
  BookOpen, Brain, Activity, RotateCcw, Target, User as UserIcon,
  LogOut, Settings, Sun, Moon, Menu, X, ArrowLeftRight, Users, Trophy
} from 'lucide-react';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
}

const sidebarItems: SidebarItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: Sparkles },
  { name: 'AI Planner', href: '/planner', icon: ArrowLeftRight },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'AI Notes', href: '/notes', icon: FileText },
  { name: 'Documents', href: '/documents', icon: BookOpen },
  { name: 'Collaboration', href: '/collaboration', icon: Users },
  { name: 'Flashcards', href: '/flashcards', icon: Layers },
  { name: 'Quizzes', href: '/quizzes', icon: BookOpen },
  { name: 'AI Tutor', href: '/tutor', icon: Brain },
  { name: 'Analytics', href: '/analytics', icon: Activity },
  { name: 'Pomodoro', href: '/pomodoro', icon: RotateCcw },
  { name: 'Goals', href: '/goals', icon: Target },
  { name: 'Achievements', href: '/achievements', icon: Trophy },
  { name: 'Leaderboard', href: '/leaderboard', icon: Trophy },
  { name: 'Social Learning', href: '/social', icon: Users },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const sendHeartbeat = () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (!token) return;
      let status = 'ONLINE';
      if (pathname.includes('/pomodoro')) {
        status = 'IN_POMODORO';
      } else if (pathname.includes('/quizzes')) {
        status = 'TAKING_QUIZ';
      } else if (pathname.includes('/notes')) {
        status = 'READING_NOTES';
      } else if (pathname.includes('/tutor')) {
        status = 'STUDYING';
      }
      
      socialService.heartbeat(status).catch(() => {});
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 60000); // every minute

    return () => clearInterval(interval);
  }, [user, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex bg-background text-foreground transition-colors duration-300">
      {/* Sidebar - Desktop */}
      <aside className={`border-r border-border bg-card/30 backdrop-blur-xl transition-all duration-300 z-20 flex flex-col ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        {/* Header/Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.3)]">
              <Sparkles className="h-4.5 w-4.5 text-white" />
            </div>
            {sidebarOpen && <span className="font-bold text-lg font-sans tracking-tight">StudySync AI</span>}
          </Link>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-secondary rounded-md text-muted-foreground transition-colors cursor-pointer hidden md:block"
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link key={item.name} href={item.href}>
                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative cursor-pointer ${
                  isActive 
                    ? 'bg-primary/10 text-primary border border-primary/20' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40 border border-transparent'
                }`}>
                  <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                  {sidebarOpen && <span>{item.name}</span>}
                  
                  {/* Tooltip when collapsed */}
                  {!sidebarOpen && (
                    <div className="absolute left-16 bg-popover text-popover-foreground px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-border shadow-md z-30">
                      {item.name}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer / Profile */}
        <div className="p-4 border-t border-border bg-card/10">
          <div className={`flex items-center justify-between gap-3 ${sidebarOpen ? 'px-2' : 'justify-center'}`}>
            {sidebarOpen ? (
              <Link href="/profile" className="flex items-center gap-2 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
                <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center border border-border">
                  {user.profile.avatarUrl ? (
                    <img src={user.profile.avatarUrl} alt="Avatar" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-col text-left overflow-hidden">
                  <span className="text-sm font-semibold truncate leading-tight">{user.profile.firstName} {user.profile.lastName}</span>
                  <span className="text-xs text-muted-foreground truncate">{user.role}</span>
                </div>
              </Link>
            ) : (
              <Link href="/profile" className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center border border-border cursor-pointer hover:opacity-80 transition-opacity">
                {user.profile.avatarUrl ? (
                  <img src={user.profile.avatarUrl} alt="Avatar" className="h-full w-full rounded-full object-cover" />
                ) : (
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                )}
              </Link>
            )}

            {sidebarOpen && (
              <div className="flex items-center gap-1">
                <Link href="/settings" className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  <Settings className="h-4 w-4" />
                </Link>
                <button onClick={logout} className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-destructive transition-colors cursor-pointer">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-border bg-card/20 backdrop-blur-xl flex items-center justify-between px-8 z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <h2 className="font-semibold text-lg capitalize">
              {pathname.split('/').filter(Boolean).pop() || 'Dashboard'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={toggleTheme}
              className="p-2 hover:bg-secondary rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </button>
            <div className="h-8 w-[1px] bg-border mx-1" />
            <div className="text-xs border border-primary/20 bg-primary/5 text-primary px-2.5 py-1 rounded-full font-medium uppercase tracking-wider font-sans">
              Pro Version
            </div>
          </div>
        </header>

        {/* Content Portal */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          {children}
        </main>
      </div>
      <CommandPalette />
      <UnlockOverlay />
      <LevelUpOverlay />
    </div>
  );
}
