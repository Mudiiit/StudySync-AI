'use client';

import React, { useState, useEffect } from 'react';
import { Award, Sparkles, X, Trophy } from 'lucide-react';
import achievementsService, { UserAchievement } from '@/services/achievements';
import { motion, AnimatePresence } from 'framer-motion';

export default function UnlockOverlay() {
  const [activeNotification, setActiveNotification] = useState<UserAchievement | null>(null);
  const [queue, setQueue] = useState<UserAchievement[]>([]);

  const fetchNotifications = async () => {
    try {
      const res = await achievementsService.getPendingNotifications();
      if (res && res.length > 0) {
        setQueue(res);
      }
    } catch (e) {
      console.error('Failed to query achievements notifications:', e);
    }
  };

  useEffect(() => {
    // Initial query
    fetchNotifications();

    // Check periodically every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!activeNotification && queue.length > 0) {
      const next = queue[0];
      setActiveNotification(next);
      setQueue((prev) => prev.slice(1));
    }
  }, [queue, activeNotification]);

  const handleDismiss = async () => {
    if (!activeNotification) return;

    try {
      await achievementsService.acknowledgeAchievement(activeNotification.id);
    } catch (e) {
      console.error('Failed to acknowledge achievement unlock:', e);
    }

    setActiveNotification(null);
  };

  const getTierStyles = (tier: string) => {
    switch (tier) {
      case 'COMMON':
        return { border: 'border-zinc-700', bg: 'from-zinc-900 to-zinc-950', text: 'text-zinc-400', glow: 'shadow-[0_0_30px_rgba(255,255,255,0.05)]' };
      case 'UNCOMMON':
        return { border: 'border-emerald-500/40', bg: 'from-emerald-950/20 to-zinc-950', text: 'text-emerald-400', glow: 'shadow-[0_0_40px_rgba(16,185,129,0.15)]' };
      case 'RARE':
        return { border: 'border-blue-500/40', bg: 'from-blue-950/20 to-zinc-950', text: 'text-blue-400', glow: 'shadow-[0_0_40px_rgba(59,130,246,0.15)]' };
      case 'EPIC':
        return { border: 'border-purple-500/40', bg: 'from-purple-950/20 to-zinc-950', text: 'text-purple-400', glow: 'shadow-[0_0_40px_rgba(139,92,246,0.2)]' };
      case 'LEGENDARY':
        return { border: 'border-amber-500/40', bg: 'from-amber-950/20 to-zinc-950', text: 'text-amber-400', glow: 'shadow-[0_0_50px_rgba(245,158,11,0.25)]' };
      case 'MYTHIC':
        return { border: 'border-pink-500/50', bg: 'from-pink-950/30 to-zinc-950', text: 'text-pink-400 animate-pulse', glow: 'shadow-[0_0_60px_rgba(236,72,153,0.35)]' };
      default:
        return { border: 'border-zinc-800', bg: 'from-zinc-900 to-zinc-950', text: 'text-zinc-400', glow: '' };
    }
  };

  if (!activeNotification) return null;

  const styles = getTierStyles(activeNotification.tier);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 backdrop-blur-md p-4">
        {/* Custom CSS Confetti Fall overlay */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 45 }).map((_, i) => {
            const left = Math.random() * 100;
            const delay = Math.random() * 5;
            const duration = Math.random() * 3 + 2;
            const size = Math.random() * 8 + 4;
            const colors = ['#8B5CF6', '#EC4899', '#10B981', '#3B82F6', '#F59E0B'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            
            return (
              <div
                key={i}
                className="absolute top-0 rounded-sm opacity-80"
                style={{
                  left: `${left}%`,
                  width: `${size}px`,
                  height: `${size}px`,
                  backgroundColor: randomColor,
                  animation: `confettiFall ${duration}s linear infinite`,
                  animationDelay: `${delay}s`,
                }}
              />
            );
          })}
        </div>

        <style jsx global>{`
          @keyframes confettiFall {
            0% { transform: translateY(-20px) rotate(0deg); }
            100% { transform: translateY(100vh) rotate(360deg); }
          }
        `}</style>

        {/* Dynamic Modal content */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: -30 }}
          transition={{ type: 'spring', damping: 25, stiffness: 180 }}
          className={`relative w-full max-w-md bg-gradient-to-b ${styles.bg} border ${styles.border} ${styles.glow} rounded-3xl p-8 text-center flex flex-col items-center space-y-6 shadow-2xl`}
        >
          {/* Confetti details */}
          <div className="p-4 bg-zinc-900/60 rounded-full border border-zinc-800 relative group animate-bounce">
            <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-violet-600 to-pink-500 opacity-20 blur-md group-hover:opacity-40 transition" />
            <Trophy className={`w-12 h-12 ${styles.text}`} />
          </div>

          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-violet-400 flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3" />
              Achievement Unlocked
              <Sparkles className="w-3 h-3" />
            </span>
            <h2 className="text-xl font-extrabold text-zinc-100 tracking-tight mt-1">
              {activeNotification.title}
            </h2>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border mt-2 inline-block uppercase tracking-wide bg-zinc-950/80 ${styles.border} ${styles.text}`}>
              {activeNotification.tier} Tier
            </span>
          </div>

          <p className="text-xs text-zinc-450 leading-relaxed max-w-xs">
            {activeNotification.description}
          </p>

          {/* Reward block */}
          <div className="w-full bg-zinc-950/80 border border-zinc-850/60 py-3 rounded-2xl flex items-center justify-center gap-2">
            <span className="text-xs font-bold text-zinc-400">Reward:</span>
            <span className="text-sm font-extrabold text-violet-400">+{activeNotification.rewardXP} XP</span>
          </div>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="w-full py-3 bg-violet-650 hover:bg-violet-600 active:scale-[0.98] rounded-2xl font-bold text-white text-xs tracking-wide shadow-md transition cursor-pointer"
          >
            Claim Reward & Continue
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
