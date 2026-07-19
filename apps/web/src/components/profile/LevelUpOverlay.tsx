'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy } from 'lucide-react';
import xpService, { LevelUpAlert } from '@/services/xp';

export default function LevelUpOverlay() {
  const [alert, setAlert] = useState<LevelUpAlert | null>(null);
  const [confetti, setConfetti] = useState<{ id: number; x: number; y: number; color: string }[]>([]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const checkLevelUp = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (!token) return;
      try {
        const data = await xpService.getLevelUpAlert();
        if (data) {
          setAlert(data);
          // Spawn confetti particles
          const colors = ['#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B'];
          const particles = Array.from({ length: 60 }).map((_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: -10 - Math.random() * 20,
            color: colors[Math.floor(Math.random() * colors.length)],
          }));
          setConfetti(particles);
          
          // Play a level up sound
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-200.wav');
            audio.volume = 0.4;
            audio.play().catch(() => {});
          } catch (_) {}
        }
      } catch (err) {
        console.error('Failed to retrieve level up alerts:', err);
      }
    };

    // Check on mount and poll occasionally
    checkLevelUp();
    interval = setInterval(checkLevelUp, 15000);

    return () => clearInterval(interval);
  }, []);

  const handleDismiss = async () => {
    if (!alert) return;
    try {
      await xpService.acknowledgeLevelUp();
      setAlert(null);
      setConfetti([]);
    } catch (err) {
      console.error('Failed to dismiss level up:', err);
    }
  };

  return (
    <>
      {/* Dynamic Rain Confetti */}
      {alert && (
        <div className="fixed inset-0 pointer-events-none z-[9998] overflow-hidden">
          {confetti.map((c) => (
            <motion.div
              key={c.id}
              initial={{ y: `${c.y}vh`, x: `${c.x}vw`, rotate: 0, opacity: 1 }}
              animate={{ 
                y: '105vh', 
                x: `${c.x + (Math.random() * 10 - 5)}vw`,
                rotate: 360 * (Math.random() * 2 + 1)
              }}
              transition={{ duration: Math.random() * 2.5 + 2.5, ease: 'linear' }}
              style={{
                backgroundColor: c.color,
                width: `${Math.random() * 8 + 6}px`,
                height: `${Math.random() * 14 + 8}px`,
              }}
              className="absolute rounded-sm opacity-90 shadow-sm"
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {alert && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.8, y: 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 30, opacity: 0 }}
              transition={{ type: 'spring', damping: 15 }}
              className="relative w-full max-w-sm rounded-3xl border border-violet-500/30 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-8 text-center shadow-2xl overflow-hidden"
            >
              {/* Premium Glow effect */}
              <div className="absolute -inset-10 rounded-full bg-violet-650/15 blur-3xl pointer-events-none animate-pulse" />

              <div className="relative space-y-6">
                {/* Visual Level Trophy */}
                <motion.div
                  initial={{ rotate: -15, scale: 0.8 }}
                  animate={{ rotate: [0, -10, 10, -5, 5, 0], scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.8 }}
                  className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-tr from-violet-650 to-indigo-650 flex items-center justify-center text-white shadow-xl shadow-violet-500/10 border border-violet-400/30"
                >
                  <Trophy className="w-10 h-10 animate-bounce" />
                </motion.div>

                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-violet-400 bg-violet-500/10 px-3 py-1 rounded-full border border-violet-500/20">
                    Milestone Reached!
                  </span>
                  <h2 className="text-3xl font-extrabold text-white tracking-tight pt-2">
                    LEVEL UP!
                  </h2>
                  <p className="text-zinc-400 text-xs font-semibold">
                    You have unlocked new learning ranks and statistics features.
                  </p>
                </div>

                <div className="bg-zinc-900/60 border border-zinc-850 p-4 rounded-2xl space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400 font-bold">New Level</span>
                    <span className="text-white font-extrabold text-sm">Level {alert.level}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400 font-bold">Rank Title</span>
                    <span className="text-violet-400 font-extrabold text-xs">{alert.title}</span>
                  </div>
                </div>

                <button
                  onClick={handleDismiss}
                  className="w-full py-3 bg-violet-650 hover:bg-violet-600 active:scale-[0.98] rounded-xl text-xs font-bold text-white transition-all duration-200 cursor-pointer shadow-lg shadow-violet-600/25"
                >
                  Continue Journey
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
