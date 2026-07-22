'use client';

import React from 'react';

// ==========================================================
// SHARED UTILITIES & RENDER TEMPLATES
// ==========================================================

interface BadgeProps {
  size?: number;
  unlocked: boolean;
}

// Global gradient definition helper to prevent duplicating `<defs>`
function BadgeDefs({
  id,
  unlocked,
  borderColors,
  gemColors,
  artColors,
  glowColor,
}: {
  id: string;
  unlocked: boolean;
  borderColors: string[];
  gemColors: string[];
  artColors: string[];
  glowColor: string;
}) {
  const finalBorder = unlocked ? borderColors : ['#27272a', '#18181b', '#09090b'];
  const finalGem = unlocked ? gemColors : ['#18181b', '#09090b', '#020202'];
  const finalArt = unlocked ? artColors : ['#52525b', '#27272a'];
  const finalGlow = unlocked ? glowColor : 'rgba(0,0,0,0)';

  return (
    <defs>
      <filter id={`glow-${id}`} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="4.5" result="blur1" />
        <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="blur2" />
        <feMerge>
          <feMergeNode in="blur2" />
          <feMergeNode in="blur1" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      <linearGradient id={`borderGrad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
        {finalBorder.map((color, idx) => (
          <stop key={idx} offset={`${(idx / (finalBorder.length - 1)) * 100}%`} stopColor={color} />
        ))}
      </linearGradient>

      <radialGradient id={`shieldGrad-${id}`} cx="50%" cy="30%" r="70%">
        <stop offset="0%" stopColor={finalGem[0]} />
        <stop offset="65%" stopColor={finalGem[1]} />
        <stop offset="100%" stopColor={finalGem[2]} />
      </radialGradient>

      <linearGradient id={`artGrad-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
        {finalArt.map((color, idx) => (
          <stop key={idx} offset={`${(idx / (finalArt.length - 1)) * 100}%`} stopColor={color} />
        ))}
      </linearGradient>

    </defs>
  );
}

// ==========================================================
// 1. STREAK CATEGORY BADGES (5)
// ==========================================================

export function Streak7Badge({ size = 96, unlocked }: BadgeProps) {
  const id = 'streak-7';
  const border = ['#9ca3af', '#4b5563', '#111827'];
  const gem = ['#1f2937', '#111827', '#030712'];
  const art = ['#f3f4f6', '#9ca3af', '#4b5563'];

  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]">
        <BadgeDefs id={id} unlocked={unlocked} borderColors={border} gemColors={gem} artColors={art} glowColor="rgba(156,163,175,0.25)" />
        {unlocked && <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(156,163,175,0.2)" strokeWidth="8" filter={`url(#glow-${id})`} />}
        {/* Steel circular medal frame */}
        <circle cx="50" cy="50" r="44" fill="url(#shieldGrad-streak-7)" stroke="url(#borderGrad-streak-7)" strokeWidth="6" />
        <circle cx="50" cy="50" r="37" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1.5" />
        {/* Simple single fire flame */}
        <g transform="translate(32, 28) scale(0.36)">
          <path d="M50 5C25 35 30 65 50 95C70 65 75 35 50 5Z" fill="url(#artGrad-streak-7)" />
        </g>
      </svg>
    </div>
  );
}

export function Streak30Badge({ size = 96, unlocked }: BadgeProps) {
  const id = 'streak-30';
  const border = ['#34d399', '#059669', '#064e3b'];
  const gem = ['#064e3b', '#022c22', '#011c14'];
  const art = ['#a7f3d0', '#10b981', '#047857'];

  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]">
        <BadgeDefs id={id} unlocked={unlocked} borderColors={border} gemColors={gem} artColors={art} glowColor="rgba(16,185,129,0.35)" />
        {unlocked && <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(16,185,129,0.3)" strokeWidth="10" filter={`url(#glow-${id})`} />}
        {/* Hexagonal emerald frame */}
        <polygon points="50,4 88,20 88,80 50,96 12,80 12,20" fill="url(#shieldGrad-streak-30)" stroke="url(#borderGrad-streak-30)" strokeWidth="6.5" />
        {/* Double fire flame */}
        <g transform="translate(28, 26) scale(0.44)">
          <path d="M50 5C25 32 30 60 50 90C70 60 75 32 50 5Z" fill="url(#artGrad-streak-30)" />
          <path d="M50 25C35 45 38 65 50 85C62 65 65 45 50 25Z" fill="#ffffff" opacity="0.8" />
        </g>
      </svg>
    </div>
  );
}

export function Streak100Badge({ size = 96, unlocked }: BadgeProps) {
  const id = 'streak-100';
  const border = ['#60a5fa', '#2563eb', '#1e3a8a'];
  const gem = ['#1e3a8a', '#172554', '#0c122c'];
  const art = ['#bfdbfe', '#3b82f6', '#1d4ed8'];

  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]">
        <BadgeDefs id={id} unlocked={unlocked} borderColors={border} gemColors={gem} artColors={art} glowColor="rgba(59,130,246,0.45)" />
        {unlocked && <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(59,130,246,0.4)" strokeWidth="12" filter={`url(#glow-${id})`} />}
        {/* Winged Rare Sapphire Crest */}
        <path d="M 12 45 C 0 30 8 10 28 6 C 16 18 12 34 12 45 Z" fill="url(#borderGrad-streak-100)" />
        <path d="M 88 45 C 100 30 92 10 72 6 C 84 18 88 34 88 45 Z" fill="url(#borderGrad-streak-100)" />
        <polygon points="50,4 84,18 97,50 84,82 50,97 16,82 3,50 16,18" fill="url(#shieldGrad-streak-100)" stroke="url(#borderGrad-streak-100)" strokeWidth="7" />
        {/* Triple fire flame */}
        <g transform="translate(26, 26) scale(0.48)">
          <path d="M50 5C20 30 25 60 50 90C75 60 80 30 50 5Z" fill="url(#artGrad-streak-100)" />
          <path d="M50 20C32 40 35 62 50 82C65 62 68 40 50 20Z" fill="#ffffff" opacity="0.8" />
          <path d="M50 35C38 50 40 65 50 78C60 65 62 50 50 35Z" fill={art[0]} />
        </g>
      </svg>
    </div>
  );
}

export function Streak365Badge({ size = 96, unlocked }: BadgeProps) {
  const id = 'streak-365';
  const border = ['#c084fc', '#7e22ce', '#3b0764'];
  const gem = ['#581c87', '#2e1065', '#1a053a'];
  const art = ['#f5d0fe', '#a855f7', '#6b21a8'];

  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]">
        <BadgeDefs id={id} unlocked={unlocked} borderColors={border} gemColors={gem} artColors={art} glowColor="rgba(168,85,247,0.65)" />
        {unlocked && <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(168,85,247,0.5)" strokeWidth="14" filter={`url(#glow-${id})`} />}
        {/* Runic Starburst Epic Crest */}
        <polygon points="50,2 65,19 89,9 83,33 99,50 83,67 89,91 65,81 50,98 35,81 11,91 17,67 1,50 17,33 11,9 35,19" fill="url(#shieldGrad-streak-365)" stroke="url(#borderGrad-streak-365)" strokeWidth="7.5" />
        <circle cx="50" cy="50" r="32" fill="none" stroke={art[0]} strokeWidth="2.5" strokeDasharray="18,10" className="animate-spin" style={{ animationDuration: '6s' }} />
        {/* Floating runic flame centerpiece */}
        <g transform="translate(24, 24) scale(0.52)">
          <path d="M50 5C15 35 20 65 50 95C80 65 85 35 50 5Z" fill="url(#artGrad-streak-365)" />
          <path d="M50 25C25 45 28 70 50 88C72 70 75 45 50 25Z" fill="#ffffff" opacity="0.9" />
        </g>
      </svg>
    </div>
  );
}

export function Streak1000Badge({ size = 96, unlocked }: BadgeProps) {
  const id = 'streak-1000';
  const border = ['#fde68a', '#f59e0b', '#78350f', '#b45309', '#fde68a'];
  const gem = ['#991b1b', '#7f1d1d', '#450a0a'];
  const art = ['#fffbeb', '#f59e0b', '#b45309'];

  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]">
        <BadgeDefs id={id} unlocked={unlocked} borderColors={border} gemColors={gem} artColors={art} glowColor="rgba(245,158,11,0.85)" />
        {unlocked && <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(245,158,11,0.65)" strokeWidth="16" filter={`url(#glow-${id})`} />}
        {/* Ornate Gold Crown Laurel Crest */}
        <circle cx="50" cy="50" r="44" fill="url(#shieldGrad-streak-1000)" stroke="url(#borderGrad-streak-1000)" strokeWidth="8" />
        <path d="M 32 12 L 40 22 L 50 10 L 60 22 L 68 12 L 64 26 H 36 Z" fill="url(#borderGrad-streak-1000)" stroke="#ffffff" strokeWidth="1" />
        {/* Giant gold fire phoenix */}
        <g transform="translate(26, 26) scale(0.48)">
          <path d="M 50 2 C 22 24 16 66 50 98 C 84 66 78 24 50 2 Z" fill="url(#artGrad-streak-1000)" opacity="0.45" />
          <path d="M 50 12 C 46 22 34 28 26 44 C 20 54 22 66 32 74 C 24 64 26 50 36 44 C 40 42 44 48 50 48 C 56 48 60 42 64 44 C 74 50 76 64 68 74 C 78 66 80 54 74 44 C 66 28 54 22 50 12 Z" fill="url(#artGrad-streak-1000)" />
        </g>
      </svg>
    </div>
  );
}

// ==========================================================
// 2. STUDY HOURS CATEGORY BADGES (7)
// ==========================================================

export function Hours10Badge({ size = 96, unlocked }: BadgeProps) {
  const id = 'hours-10';
  const border = ['#d1d5db', '#9ca3af', '#374151'];
  const gem = ['#374151', '#111827', '#030712'];
  const art = ['#ffffff', '#e5e7eb', '#9ca3af'];

  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]">
        <BadgeDefs id={id} unlocked={unlocked} borderColors={border} gemColors={gem} artColors={art} glowColor="rgba(156,163,175,0.2)" />
        <circle cx="50" cy="50" r="44" fill="url(#shieldGrad-hours-10)" stroke="url(#borderGrad-hours-10)" strokeWidth="6" />
        {/* Simple Pocket Watch details */}
        <g transform="translate(30, 30) scale(0.4)">
          <circle cx="50" cy="50" r="40" fill="none" stroke="url(#artGrad-hours-10)" strokeWidth="6" />
          <line x1="50" y1="50" x2="50" y2="22" stroke="url(#artGrad-hours-10)" strokeWidth="6" strokeLinecap="round" />
          <line x1="50" y1="50" x2="72" y2="50" stroke="url(#artGrad-hours-10)" strokeWidth="6" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}

export function Hours50Badge({ size = 96, unlocked }: BadgeProps) {
  const id = 'hours-50';
  const border = ['#9ca3af', '#4b5563', '#1f2937'];
  const gem = ['#1f2937', '#111827', '#09090b'];
  const art = ['#e5e7eb', '#9ca3af', '#4b5563'];

  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]">
        <BadgeDefs id={id} unlocked={unlocked} borderColors={border} gemColors={gem} artColors={art} glowColor="rgba(156,163,175,0.25)" />
        <circle cx="50" cy="50" r="44" fill="url(#shieldGrad-hours-50)" stroke="url(#borderGrad-hours-50)" strokeWidth="6" />
        {/* Circular iron compass */}
        <g transform="translate(28, 28) scale(0.44)">
          <circle cx="50" cy="50" r="42" fill="none" stroke="url(#artGrad-hours-50)" strokeWidth="5" />
          <polygon points="50,15 56,46 50,52 44,46" fill="url(#artGrad-hours-50)" />
          <polygon points="50,85 56,54 50,48 44,54" fill="url(#artGrad-hours-50)" opacity="0.6" />
        </g>
      </svg>
    </div>
  );
}

export function Hours100Badge({ size = 96, unlocked }: BadgeProps) {
  const id = 'hours-100';
  const border = ['#34d399', '#059669', '#064e3b'];
  const gem = ['#064e3b', '#022c22', '#011c14'];
  const art = ['#a7f3d0', '#10b981', '#047857'];

  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]">
        <BadgeDefs id={id} unlocked={unlocked} borderColors={border} gemColors={gem} artColors={art} glowColor="rgba(16,185,129,0.35)" />
        {unlocked && <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(16,185,129,0.3)" strokeWidth="8" filter={`url(#glow-${id})`} />}
        {/* Hexagonal brass compass with emerald crystal core */}
        <polygon points="50,3 90,20 90,80 50,97 10,80 10,20" fill="url(#shieldGrad-hours-100)" stroke="url(#borderGrad-hours-100)" strokeWidth="6.5" />
        <g transform="translate(26, 26) scale(0.48)">
          <circle cx="50" cy="50" r="44" fill="none" stroke="url(#artGrad-hours-100)" strokeWidth="4" />
          <polygon points="50,15 58,45 50,50 42,45" fill="url(#artGrad-hours-100)" />
          <circle cx="50" cy="50" r="8" fill="#ffffff" filter={`url(#glow-${id})`} />
        </g>
      </svg>
    </div>
  );
}

export function Hours250Badge({ size = 96, unlocked }: BadgeProps) {
  const id = 'hours-250';
  const border = ['#60a5fa', '#2563eb', '#1e3a8a'];
  const gem = ['#1e40af', '#1e3a8a', '#172554'];
  const art = ['#bfdbfe', '#3b82f6', '#1d4ed8'];

  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]">
        <BadgeDefs id={id} unlocked={unlocked} borderColors={border} gemColors={gem} artColors={art} glowColor="rgba(59,130,246,0.45)" />
        {unlocked && <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(59,130,246,0.4)" strokeWidth="12" filter={`url(#glow-${id})`} />}
        {/* Sapphire wings surrounding a glowing blue timepiece */}
        <path d="M 12 45 C -4 30 4 10 26 6 C 14 18 10 34 12 45 Z" fill="url(#borderGrad-hours-250)" />
        <path d="M 88 45 C 104 30 96 10 74 6 C 86 18 90 34 88 45 Z" fill="url(#borderGrad-hours-250)" />
        <polygon points="50,3 84,18 97,50 84,82 50,97 16,82 3,50 16,18" fill="url(#shieldGrad-hours-250)" stroke="url(#borderGrad-hours-250)" strokeWidth="7" />
        <g transform="translate(26, 26) scale(0.48)">
          <circle cx="50" cy="50" r="44" fill="none" stroke="url(#artGrad-hours-250)" strokeWidth="4" />
          <polygon points="50,15 58,45 50,50 42,45" fill="url(#artGrad-hours-250)" />
          <circle cx="50" cy="50" r="6" fill="#ffffff" filter={`url(#glow-${id})`} />
        </g>
      </svg>
    </div>
  );
}

export function Hours500Badge({ size = 96, unlocked }: BadgeProps) {
  const id = 'hours-500';
  const border = ['#c084fc', '#7e22ce', '#3b0764'];
  const gem = ['#581c87', '#3b0764', '#2e1065'];
  const art = ['#f5d0fe', '#a855f7', '#6b21a8'];

  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]">
        <BadgeDefs id={id} unlocked={unlocked} borderColors={border} gemColors={gem} artColors={art} glowColor="rgba(168,85,247,0.75)" />
        {unlocked && <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(168,85,247,0.6)" strokeWidth="12" filter={`url(#glow-${id})`} />}
        {/* Floating runes circling an amethyst clock dial */}
        <polygon points="50,2 65,19 89,9 83,33 99,50 83,67 89,91 65,81 50,98 35,81 11,91 17,67 1,50 17,33 11,9 35,19" fill="url(#shieldGrad-hours-500)" stroke="url(#borderGrad-hours-500)" strokeWidth="7.5" />
        <circle cx="50" cy="50" r="34" fill="none" stroke={art[0]} strokeWidth="2" strokeDasharray="18,10" className="animate-spin" style={{ animationDuration: '8s' }} />
        <g transform="translate(26, 26) scale(0.48)">
          <circle cx="50" cy="50" r="44" fill="none" stroke="url(#artGrad-hours-500)" strokeWidth="4" />
          <polygon points="50,15 58,45 50,50 42,45" fill="url(#artGrad-hours-500)" />
        </g>
      </svg>
    </div>
  );
}

export function Hours1000Badge({ size = 96, unlocked }: BadgeProps) {
  const id = 'hours-1000';
  const border = ['#fde68a', '#f59e0b', '#78350f', '#b45309', '#fde68a'];
  const gem = ['#991b1b', '#7f1d1d', '#450a0a'];
  const art = ['#fffbeb', '#f59e0b', '#b45309'];

  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]">
        <BadgeDefs id={id} unlocked={unlocked} borderColors={border} gemColors={gem} artColors={art} glowColor="rgba(245,158,11,0.85)" />
        {unlocked && <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(245,158,11,0.7)" strokeWidth="14" filter={`url(#glow-${id})`} />}
        {/* Massive gold hourglass wreathed in laurels */}
        <circle cx="50" cy="50" r="44" fill="url(#shieldGrad-hours-1000)" stroke="url(#borderGrad-hours-1000)" strokeWidth="8" />
        <g transform="translate(26, 26) scale(0.48)">
          {/* Hourglass */}
          <path d="M35 25H65M35 75H65" stroke="url(#artGrad-hours-1000)" strokeWidth="5" strokeLinecap="round" />
          <path d="M40 27C40 40 48 48 48 50C48 52 40 60 40 73H60C60 60 52 52 52 50C52 48 60 40 60 27H40Z" fill="none" stroke="url(#artGrad-hours-1000)" strokeWidth="4" />
          <circle cx="50" cy="50" r="5" fill="#ffffff" filter={`url(#glow-${id})`} />
        </g>
      </svg>
    </div>
  );
}

export function Hours5000Badge({ size = 96, unlocked }: BadgeProps) {
  const id = 'hours-5000';
  const border = ['#fbcfe8', '#db2777', '#3b0764', '#a21caf', '#fbcfe8'];
  const gem = ['#020617', '#0f172a', '#1e293b'];
  const art = ['#ffffff', '#fbcfe8', '#db2777', '#4a044e'];

  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]">
        <BadgeDefs id={id} unlocked={unlocked} borderColors={border} gemColors={gem} artColors={art} glowColor="rgba(236,72,153,0.95)" />
        {unlocked && <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(236,72,153,0.8)" strokeWidth="16" filter={`url(#glow-${id})`} />}
        {/* Pink/white crystal celestial astrolabe with orbital rings */}
        <circle cx="50" cy="50" r="46" fill="url(#shieldGrad-hours-5000)" stroke="url(#borderGrad-hours-5000)" strokeWidth="8.5" />
        <ellipse cx="50" cy="50" rx="46" ry="14" fill="none" stroke={art[1]} strokeWidth="1.8" strokeDasharray="25,15" transform="rotate(35, 50, 50)" className="animate-spin" style={{ animationDuration: '9s' }} />
        <ellipse cx="50" cy="50" rx="46" ry="14" fill="none" stroke={art[1]} strokeWidth="1.8" strokeDasharray="25,15" transform="rotate(-35, 50, 50)" className="animate-spin" style={{ animationDuration: '14s' }} />
        <g transform="translate(26, 26) scale(0.48)">
          <circle cx="50" cy="50" r="44" fill="none" stroke="url(#artGrad-hours-5000)" strokeWidth="4.5" />
          <polygon points="50,15 58,45 50,50 42,45" fill="url(#artGrad-hours-5000)" />
          <circle cx="50" cy="50" r="6" fill="#ffffff" filter={`url(#glow-${id})`} />
        </g>
      </svg>
    </div>
  );
}

// ==========================================================
// 3. FOCUS SESSIONS CATEGORY BADGES (4)
// ==========================================================

export function Focus25Badge({ size = 96, unlocked }: BadgeProps) {
  const id = 'focus-25';
  const border = ['#d1d5db', '#9ca3af', '#374151'];
  const gem = ['#374151', '#111827', '#030712'];
  const art = ['#ffffff', '#e5e7eb', '#9ca3af'];

  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]">
        <BadgeDefs id={id} unlocked={unlocked} borderColors={border} gemColors={gem} artColors={art} glowColor="rgba(156,163,175,0.2)" />
        <circle cx="50" cy="50" r="45" fill="url(#shieldGrad-focus-25)" stroke="url(#borderGrad-focus-25)" strokeWidth="6" />
        {/* Simple crosshair target */}
        <g transform="translate(26, 26) scale(0.48)">
          <circle cx="50" cy="50" r="30" fill="none" stroke="url(#artGrad-focus-25)" strokeWidth="4" />
          <line x1="50" y1="10" x2="50" y2="90" stroke="url(#artGrad-focus-25)" strokeWidth="4" />
          <line x1="10" y1="50" x2="90" y2="50" stroke="url(#artGrad-focus-25)" strokeWidth="4" />
        </g>
      </svg>
    </div>
  );
}

export function Focus100Badge({ size = 96, unlocked }: BadgeProps) {
  const id = 'focus-100';
  const border = ['#34d399', '#059669', '#064e3b'];
  const gem = ['#064e3b', '#022c22', '#011c14'];
  const art = ['#a7f3d0', '#10b981', '#047857'];

  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]">
        <BadgeDefs id={id} unlocked={unlocked} borderColors={border} gemColors={gem} artColors={art} glowColor="rgba(16,185,129,0.35)" />
        <polygon points="50,3 90,20 90,80 50,97 10,80 10,20" fill="url(#shieldGrad-focus-100)" stroke="url(#borderGrad-focus-100)" strokeWidth="6.5" />
        {/* Concentric emerald target */}
        <g transform="translate(26, 26) scale(0.48)">
          <circle cx="50" cy="50" r="36" fill="none" stroke="url(#artGrad-focus-100)" strokeWidth="4.5" />
          <circle cx="50" cy="50" r="22" fill="none" stroke="url(#artGrad-focus-100)" strokeWidth="3" />
          <circle cx="50" cy="50" r="8" fill="url(#artGrad-focus-100)" />
        </g>
      </svg>
    </div>
  );
}

export function Focus250Badge({ size = 96, unlocked }: BadgeProps) {
  const id = 'focus-250';
  const border = ['#60a5fa', '#2563eb', '#1e3a8a'];
  const gem = ['#1e40af', '#1e3a8a', '#172554'];
  const art = ['#bfdbfe', '#3b82f6', '#1d4ed8'];

  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]">
        <BadgeDefs id={id} unlocked={unlocked} borderColors={border} gemColors={gem} artColors={art} glowColor="rgba(59,130,246,0.45)" />
        <polygon points="50,3 84,18 97,50 84,82 50,97 16,82 3,50 16,18" fill="url(#shieldGrad-focus-250)" stroke="url(#borderGrad-focus-250)" strokeWidth="7" />
        {/* Cobalt shield with sapphire energy rings */}
        <g transform="translate(26, 26) scale(0.48)">
          <circle cx="50" cy="50" r="38" fill="none" stroke="url(#artGrad-focus-250)" strokeWidth="4.5" strokeDasharray="18,10" />
          <circle cx="50" cy="50" r="22" fill="none" stroke="url(#artGrad-focus-250)" strokeWidth="3" />
          <polygon points="50,32 60,48 50,60 40,48" fill="#ffffff" filter={`url(#glow-${id})`} />
        </g>
      </svg>
    </div>
  );
}

export function Focus1000Badge({ size = 96, unlocked }: BadgeProps) {
  const id = 'focus-1000';
  const border = ['#fde68a', '#f59e0b', '#78350f', '#b45309', '#fde68a'];
  const gem = ['#991b1b', '#7f1d1d', '#450a0a'];
  const art = ['#fffbeb', '#f59e0b', '#b45309'];

  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]">
        <BadgeDefs id={id} unlocked={unlocked} borderColors={border} gemColors={gem} artColors={art} glowColor="rgba(245,158,11,0.85)" />
        {unlocked && <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(245,158,11,0.7)" strokeWidth="14" filter={`url(#glow-${id})`} />}
        {/* Gold solar ring locking a glowing ruby prism core */}
        <circle cx="50" cy="50" r="44" fill="url(#shieldGrad-focus-1000)" stroke="url(#borderGrad-focus-1000)" strokeWidth="8" />
        <g transform="translate(26, 26) scale(0.48)">
          <circle cx="50" cy="50" r="46" fill="none" stroke="url(#artGrad-focus-1000)" strokeWidth="3" strokeDasharray="30,12" />
          <polygon points="50,12 83,69 17,69" fill="none" stroke="url(#artGrad-focus-1000)" strokeWidth="4.5" />
          <polygon points="50,26 68,54 50,74 32,54" fill="#ffffff" filter={`url(#glow-${id})`} />
        </g>
      </svg>
    </div>
  );
}

// ==========================================================
// 4. NOTES CATEGORY BADGES (4)
// ==========================================================

export function Notes25Badge({ size = 96, unlocked }: BadgeProps) {
  const id = 'notes-25';
  const border = ['#d1d5db', '#9ca3af', '#374151'];
  const gem = ['#374151', '#111827', '#030712'];
  const art = ['#ffffff', '#e5e7eb', '#9ca3af'];

  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]">
        <BadgeDefs id={id} unlocked={unlocked} borderColors={border} gemColors={gem} artColors={art} glowColor="rgba(156,163,175,0.2)" />
        <circle cx="50" cy="50" r="45" fill="url(#shieldGrad-notes-25)" stroke="url(#borderGrad-notes-25)" strokeWidth="6" />
        {/* Simple open book */}
        <g transform="translate(26, 26) scale(0.48)">
          <path d="M20 30 C30 26 50 32 50 32 C50 32 70 26 80 30 V68 C70 64 50 70 50 70 C50 70 30 64 20 68 V30Z" fill="none" stroke="url(#artGrad-notes-25)" strokeWidth="4.5" />
        </g>
      </svg>
    </div>
  );
}

export function Notes100Badge({ size = 96, unlocked }: BadgeProps) {
  const id = 'notes-100';
  const border = ['#34d399', '#059669', '#064e3b'];
  const gem = ['#064e3b', '#022c22', '#011c14'];
  const art = ['#a7f3d0', '#10b981', '#047857'];

  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]">
        <BadgeDefs id={id} unlocked={unlocked} borderColors={border} gemColors={gem} artColors={art} glowColor="rgba(16,185,129,0.35)" />
        <polygon points="50,3 90,20 90,80 50,97 10,80 10,20" fill="url(#shieldGrad-notes-100)" stroke="url(#borderGrad-notes-100)" strokeWidth="6.5" />
        {/* Emerald decorated book */}
        <g transform="translate(26, 26) scale(0.48)">
          <path d="M20 30 C30 26 50 32 50 32 C50 32 70 26 80 30 V68 C70 64 50 70 50 70 C50 70 30 64 20 68 V30Z" fill="none" stroke="url(#artGrad-notes-100)" strokeWidth="4.5" />
          <path d="M 23 31 C 32 28 48 33 48 33 V 66 C 48 66 32 61 15 67 Z" fill="url(#artGrad-notes-100)" opacity="0.6" />
        </g>
      </svg>
    </div>
  );
}

export function Notes500Badge({ size = 96, unlocked }: BadgeProps) {
  const id = 'notes-500';
  const border = ['#60a5fa', '#2563eb', '#1e3a8a'];
  const gem = ['#1e40af', '#1e3a8a', '#172554'];
  const art = ['#bfdbfe', '#3b82f6', '#1d4ed8'];

  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]">
        <BadgeDefs id={id} unlocked={unlocked} borderColors={border} gemColors={gem} artColors={art} glowColor="rgba(59,130,246,0.45)" />
        <polygon points="50,3 84,18 97,50 84,82 50,97 16,82 3,50 16,18" fill="url(#shieldGrad-notes-500)" stroke="url(#borderGrad-notes-500)" strokeWidth="7" />
        {/* Sapphire book with wing shapes */}
        <g transform="translate(26, 26) scale(0.48)">
          <path d="M20 30 C30 26 50 32 50 32 C50 32 70 26 80 30 V68 C70 64 50 70 50 70 C50 70 30 64 20 68 V30Z" fill="none" stroke="url(#artGrad-notes-500)" strokeWidth="4.5" />
          <circle cx="50" cy="50" r="5" fill="#ffffff" filter={`url(#glow-${id})`} />
        </g>
      </svg>
    </div>
  );
}

export function Notes1000Badge({ size = 96, unlocked }: BadgeProps) {
  const id = 'notes-1000';
  const border = ['#c084fc', '#7e22ce', '#3b0764'];
  const gem = ['#581c87', '#3b0764', '#2e1065'];
  const art = ['#f5d0fe', '#a855f7', '#6b21a8'];

  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]">
        <BadgeDefs id={id} unlocked={unlocked} borderColors={border} gemColors={gem} artColors={art} glowColor="rgba(168,85,247,0.75)" />
        {unlocked && <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(168,85,247,0.6)" strokeWidth="12" filter={`url(#glow-${id})`} />}
        {/* Ancient magical tome with floating amethyst crystal core */}
        <polygon points="50,2 65,19 89,9 83,33 99,50 83,67 89,91 65,81 50,98 35,81 11,91 17,67 1,50 17,33 11,9 35,19" fill="url(#shieldGrad-notes-1000)" stroke="url(#borderGrad-notes-1000)" strokeWidth="7.5" />
        <g transform="translate(26, 26) scale(0.48)">
          <path d="M20 30 C30 26 50 32 50 32 C50 32 70 26 80 30 V68 C70 64 50 70 50 70 C50 70 30 64 20 68 V30Z" fill="none" stroke="url(#artGrad-notes-1000)" strokeWidth="4.5" />
          <polygon points="50,15 55,24 50,33 45,24" fill="#ffffff" filter={`url(#glow-${id})`} />
        </g>
      </svg>
    </div>
  );
}

// ==========================================================
// 5. FLASHCARDS CATEGORY BADGES (4)
// ==========================================================

export function Cards100Badge({ size = 96, unlocked }: BadgeProps) {
  const id = 'cards-100';
  const border = ['#d1d5db', '#9ca3af', '#374151'];
  const gem = ['#374151', '#111827', '#030712'];
  const art = ['#ffffff', '#e5e7eb', '#9ca3af'];

  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]">
        <BadgeDefs id={id} unlocked={unlocked} borderColors={border} gemColors={gem} artColors={art} glowColor="rgba(156,163,175,0.2)" />
        <circle cx="50" cy="50" r="45" fill="url(#shieldGrad-cards-100)" stroke="url(#borderGrad-cards-100)" strokeWidth="6" />
        {/* Simple double-layered card stack */}
        <g transform="translate(26, 26) scale(0.48)">
          <rect x="25" y="25" width="40" height="50" rx="4" fill="none" stroke="url(#artGrad-cards-100)" strokeWidth="5.5" />
          <rect x="35" y="15" width="40" height="50" rx="4" fill="none" stroke="url(#artGrad-cards-100)" strokeWidth="5.5" />
        </g>
      </svg>
    </div>
  );
}

export function Cards500Badge({ size = 96, unlocked }: BadgeProps) {
  const id = 'cards-500';
  const border = ['#34d399', '#059669', '#064e3b'];
  const gem = ['#064e3b', '#022c22', '#011c14'];
  const art = ['#a7f3d0', '#10b981', '#047857'];

  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]">
        <BadgeDefs id={id} unlocked={unlocked} borderColors={border} gemColors={gem} artColors={art} glowColor="rgba(16,185,129,0.35)" />
        <polygon points="50,3 90,20 90,80 50,97 10,80 10,20" fill="url(#shieldGrad-cards-500)" stroke="url(#borderGrad-cards-500)" strokeWidth="6.5" />
        {/* Hexagonal emerald plate with gold trims */}
        <g transform="translate(26, 26) scale(0.48)">
          <rect x="25" y="25" width="40" height="50" rx="4" fill="none" stroke="url(#artGrad-cards-500)" strokeWidth="5.5" />
          <rect x="35" y="15" width="40" height="50" rx="4" fill="none" stroke="url(#artGrad-cards-500)" strokeWidth="5.5" />
          <circle cx="55" cy="40" r="4" fill="#ffffff" />
        </g>
      </svg>
    </div>
  );
}

export function Cards2500Badge({ size = 96, unlocked }: BadgeProps) {
  const id = 'cards-2500';
  const border = ['#60a5fa', '#2563eb', '#1e3a8a'];
  const gem = ['#1e40af', '#1e3a8a', '#172554'];
  const art = ['#bfdbfe', '#3b82f6', '#1d4ed8'];

  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]">
        <BadgeDefs id={id} unlocked={unlocked} borderColors={border} gemColors={gem} artColors={art} glowColor="rgba(59,130,246,0.45)" />
        <polygon points="50,3 84,18 97,50 84,82 50,97 16,82 3,50 16,18" fill="url(#shieldGrad-cards-2500)" stroke="url(#borderGrad-cards-2500)" strokeWidth="7" />
        {/* Blue sapphire diamond card crest */}
        <g transform="translate(26, 26) scale(0.48)">
          <rect x="25" y="25" width="40" height="50" rx="4" fill="none" stroke="url(#artGrad-cards-2500)" strokeWidth="5.5" />
          <circle cx="45" cy="50" r="6" fill="#ffffff" filter={`url(#glow-${id})`} />
        </g>
      </svg>
    </div>
  );
}

export function Cards10000Badge({ size = 96, unlocked }: BadgeProps) {
  const id = 'cards-10000';
  const border = ['#c084fc', '#7e22ce', '#3b0764'];
  const gem = ['#581c87', '#3b0764', '#2e1065'];
  const art = ['#f5d0fe', '#a855f7', '#6b21a8'];

  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]">
        <BadgeDefs id={id} unlocked={unlocked} borderColors={border} gemColors={gem} artColors={art} glowColor="rgba(168,85,247,0.75)" />
        {unlocked && <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(168,85,247,0.6)" strokeWidth="12" filter={`url(#glow-${id})`} />}
        {/* Floating purple card layers with amethyst magic circles */}
        <polygon points="50,2 65,19 89,9 83,33 99,50 83,67 89,91 65,81 50,98 35,81 11,91 17,67 1,50 17,33 11,9 35,19" fill="url(#shieldGrad-cards-10000)" stroke="url(#borderGrad-cards-10000)" strokeWidth="7.5" />
        <g transform="translate(26, 26) scale(0.48)">
          <rect x="25" y="25" width="40" height="50" rx="4" fill="none" stroke="url(#artGrad-cards-10000)" strokeWidth="5.5" />
          <polygon points="50,15 55,24 50,33 45,24" fill="#ffffff" filter={`url(#glow-${id})`} />
        </g>
      </svg>
    </div>
  );
}

// ==========================================================
// 6. QUIZZES CATEGORY BADGES (5)
// ==========================================================

export function Quizzes100Badge({ size = 96, unlocked }: BadgeProps) {
  const id = 'quizzes-100';
  const border = ['#34d399', '#059669', '#064e3b'];
  const gem = ['#064e3b', '#022c22', '#011c14'];
  const art = ['#a7f3d0', '#10b981', '#047857'];

  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]">
        <BadgeDefs id={id} unlocked={unlocked} borderColors={border} gemColors={gem} artColors={art} glowColor="rgba(16,185,129,0.35)" />
        <polygon points="50,3 90,20 90,80 50,97 10,80 10,20" fill="url(#shieldGrad-quizzes-100)" stroke="url(#borderGrad-quizzes-100)" strokeWidth="6.5" />
        {/* Hexagonal gold rim enclosing a green chalice */}
        <g transform="translate(26, 26) scale(0.48)">
          <path d="M 30 30 C 30 46 40 58 50 58 C 60 58 70 46 70 30 Z" fill="url(#artGrad-quizzes-100)" stroke="#ffffff" strokeWidth="1.5" />
          <path d="M 44 58 H 56 V 74 H 44 Z" fill="url(#artGrad-quizzes-100)" />
        </g>
      </svg>
    </div>
  );
}

export function Quizzes500Badge({ size = 96, unlocked }: BadgeProps) {
  const id = 'quizzes-500';
  const border = ['#60a5fa', '#2563eb', '#1e3a8a'];
  const gem = ['#1e40af', '#1e3a8a', '#172554'];
  const art = ['#bfdbfe', '#3b82f6', '#1d4ed8'];

  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]">
        <BadgeDefs id={id} unlocked={unlocked} borderColors={border} gemColors={gem} artColors={art} glowColor="rgba(59,130,246,0.45)" />
        <polygon points="50,3 84,18 97,50 84,82 50,97 16,82 3,50 16,18" fill="url(#shieldGrad-quizzes-500)" stroke="url(#borderGrad-quizzes-500)" strokeWidth="7" />
        {/* Blue sapphire trophy with metal wings */}
        <g transform="translate(26, 26) scale(0.48)">
          <path d="M30 34C18 34 18 52 30 54M70 34C82 34 82 52 70 54" fill="none" stroke="url(#artGrad-quizzes-500)" strokeWidth="4.5" />
          <path d="M 32 28 H 68 V 42 C 68 53 59 62 50 62 C 41 62 32 53 32 42 Z" fill="url(#artGrad-quizzes-500)" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx="50" cy="46" r="6" fill="#ffffff" filter={`url(#glow-${id})`} />
        </g>
      </svg>
    </div>
  );
}

export function Quizzes1000Badge({ size = 96, unlocked }: BadgeProps) {
  const id = 'quizzes-1000';
  const border = ['#c084fc', '#7e22ce', '#3b0764'];
  const gem = ['#581c87', '#3b0764', '#2e1065'];
  const art = ['#f5d0fe', '#a855f7', '#6b21a8'];

  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]">
        <BadgeDefs id={id} unlocked={unlocked} borderColors={border} gemColors={gem} artColors={art} glowColor="rgba(168,85,247,0.75)" />
        {unlocked && <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(168,85,247,0.6)" strokeWidth="12" filter={`url(#glow-${id})`} />}
        {/* Amethyst trophy topped with magical energy */}
        <polygon points="50,2 65,19 89,9 83,33 99,50 83,67 89,91 65,81 50,98 35,81 11,91 17,67 1,50 17,33 11,9 35,19" fill="url(#shieldGrad-quizzes-1000)" stroke="url(#borderGrad-quizzes-1000)" strokeWidth="7.5" />
        <g transform="translate(26, 26) scale(0.48)">
          <path d="M 32 28 H 68 V 42 C 68 53 59 62 50 62 C 41 62 32 53 32 42 Z" fill="url(#artGrad-quizzes-1000)" stroke="#ffffff" strokeWidth="1.5" />
          <polygon points="50,15 55,24 50,33 45,24" fill="#ffffff" filter={`url(#glow-${id})`} />
        </g>
      </svg>
    </div>
  );
}

export function QuizPerfect10Badge({ size = 96, unlocked }: BadgeProps) {
  const id = 'quiz-perfect-10';
  const border = ['#60a5fa', '#2563eb', '#1e3a8a'];
  const gem = ['#1e40af', '#1e3a8a', '#172554'];
  const art = ['#bfdbfe', '#3b82f6', '#1d4ed8'];

  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]">
        <BadgeDefs id={id} unlocked={unlocked} borderColors={border} gemColors={gem} artColors={art} glowColor="rgba(59,130,246,0.45)" />
        {/* 8-pointed star base with blue star */}
        <polygon points="50,4 84,18 97,50 84,82 50,97 16,82 3,50 16,18" fill="url(#shieldGrad-quiz-perfect-10)" stroke="url(#borderGrad-quiz-perfect-10)" strokeWidth="7" />
        <g transform="translate(26, 26) scale(0.48)">
          <polygon points="50,14 61,36 84,39 67,55 72,78 50,67 28,78 33,55 16,39 39,36" fill="url(#artGrad-quiz-perfect-10)" stroke="#ffffff" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

export function QuizPerfect100Badge({ size = 96, unlocked }: BadgeProps) {
  const id = 'quiz-perfect-100';
  const border = ['#fde68a', '#f59e0b', '#78350f', '#b45309', '#fde68a'];
  const gem = ['#991b1b', '#7f1d1d', '#450a0a'];
  const art = ['#fffbeb', '#f59e0b', '#b45309'];

  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]">
        <BadgeDefs id={id} unlocked={unlocked} borderColors={border} gemColors={gem} artColors={art} glowColor="rgba(245,158,11,0.85)" />
        {unlocked && <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(245,158,11,0.7)" strokeWidth="14" filter={`url(#glow-${id})`} />}
        {/* Massive golden laurel surrounding a double star crown trophy */}
        <circle cx="50" cy="50" r="44" fill="url(#shieldGrad-quiz-perfect-100)" stroke="url(#borderGrad-quiz-perfect-100)" strokeWidth="8" />
        <g transform="translate(26, 26) scale(0.48)">
          <path d="M30 34C18 34 18 52 30 54M70 34C82 34 82 52 70 54" fill="none" stroke="url(#artGrad-quiz-perfect-100)" strokeWidth="4.5" />
          <path d="M 32 28 H 68 V 42 C 68 53 59 62 50 62 C 41 62 32 53 32 42 Z" fill="url(#artGrad-quiz-perfect-100)" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx="50" cy="46" r="6" fill="#ffffff" filter={`url(#glow-${id})`} />
        </g>
      </svg>
    </div>
  );
}

// ==========================================================
// 7. GOALS CATEGORY BADGES (3)
// ==========================================================

export function Goals10Badge({ size = 96, unlocked }: BadgeProps) {
  const id = 'goals-10';
  const border = ['#d1d5db', '#9ca3af', '#374151'];
  const gem = ['#374151', '#111827', '#030712'];
  const art = ['#ffffff', '#e5e7eb', '#9ca3af'];

  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]">
        <BadgeDefs id={id} unlocked={unlocked} borderColors={border} gemColors={gem} artColors={art} glowColor="rgba(156,163,175,0.2)" />
        <circle cx="50" cy="50" r="45" fill="url(#shieldGrad-goals-10)" stroke="url(#borderGrad-goals-10)" strokeWidth="6" />
        {/* Simple steel shield */}
        <g transform="translate(26, 26) scale(0.48)">
          <path d="M50 12 L80 25 V50 C80 68 68 82 50 88 C32 82 20 68 20 50 V25 Z" fill="none" stroke="url(#artGrad-goals-10)" strokeWidth="5.5" />
        </g>
      </svg>
    </div>
  );
}

export function Goals100Badge({ size = 96, unlocked }: BadgeProps) {
  const id = 'goals-100';
  const border = ['#60a5fa', '#2563eb', '#1e3a8a'];
  const gem = ['#1e40af', '#1e3a8a', '#172554'];
  const art = ['#bfdbfe', '#3b82f6', '#1d4ed8'];

  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]">
        <BadgeDefs id={id} unlocked={unlocked} borderColors={border} gemColors={gem} artColors={art} glowColor="rgba(59,130,246,0.45)" />
        <polygon points="50,3 84,18 97,50 84,82 50,97 16,82 3,50 16,18" fill="url(#shieldGrad-goals-100)" stroke="url(#borderGrad-goals-100)" strokeWidth="7" />
        {/* Winged blue shield with peak banner */}
        <g transform="translate(26, 26) scale(0.48)">
          <path d="M 18 80 L 44 26 L 62 52 L 90 80 Z" fill="none" stroke="url(#artGrad-goals-100)" strokeWidth="4.5" strokeLinejoin="round" />
          <path d="M 44 12 L 72 20 L 44 28 V 12 Z" fill="url(#artGrad-goals-100)" />
        </g>
      </svg>
    </div>
  );
}

export function Goals500Badge({ size = 96, unlocked }: BadgeProps) {
  const id = 'goals-500';
  const border = ['#fde68a', '#f59e0b', '#78350f', '#b45309', '#fde68a'];
  const gem = ['#991b1b', '#7f1d1d', '#450a0a'];
  const art = ['#fffbeb', '#f59e0b', '#b45309'];

  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]">
        <BadgeDefs id={id} unlocked={unlocked} borderColors={border} gemColors={gem} artColors={art} glowColor="rgba(245,158,11,0.85)" />
        {unlocked && <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(245,158,11,0.7)" strokeWidth="14" filter={`url(#glow-${id})`} />}
        {/* Ornate golden mountain summit wreathed in sun rays */}
        <circle cx="50" cy="50" r="44" fill="url(#shieldGrad-goals-500)" stroke="url(#borderGrad-goals-500)" strokeWidth="8" />
        <g transform="translate(26, 26) scale(0.48)">
          <path d="M 18 80 L 44 26 L 62 52 L 90 80 Z" fill="none" stroke="url(#artGrad-goals-500)" strokeWidth="4.5" strokeLinejoin="round" />
          <path d="M 44 12 L 72 20 L 44 28 V 12 Z" fill="url(#artGrad-goals-500)" />
        </g>
      </svg>
    </div>
  );
}

// ==========================================================
// 8. AI USAGE CATEGORY BADGES (3)
// ==========================================================

export function AiSummaries100Badge({ size = 96, unlocked }: BadgeProps) {
  const id = 'ai-summaries-100';
  const border = ['#34d399', '#059669', '#064e3b'];
  const gem = ['#064e3b', '#022c22', '#011c14'];
  const art = ['#a7f3d0', '#10b981', '#047857'];

  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]">
        <BadgeDefs id={id} unlocked={unlocked} borderColors={border} gemColors={gem} artColors={art} glowColor="rgba(16,185,129,0.35)" />
        <polygon points="50,3 90,20 90,80 50,97 10,80 10,20" fill="url(#shieldGrad-ai-summaries-100)" stroke="url(#borderGrad-ai-summaries-100)" strokeWidth="6.5" />
        {/* Hexagonal emerald processor */}
        <g transform="translate(26, 26) scale(0.48)">
          <rect x="35" y="35" width="30" height="30" rx="6" fill="none" stroke="url(#artGrad-ai-summaries-100)" strokeWidth="4" />
          <circle cx="50" cy="50" r="7" fill="url(#artGrad-ai-summaries-100)" className="animate-pulse" />
        </g>
      </svg>
    </div>
  );
}

export function AiCards500Badge({ size = 96, unlocked }: BadgeProps) {
  const id = 'ai-cards-500';
  const border = ['#60a5fa', '#2563eb', '#1e3a8a'];
  const gem = ['#1e40af', '#1e3a8a', '#172554'];
  const art = ['#bfdbfe', '#3b82f6', '#1d4ed8'];

  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]">
        <BadgeDefs id={id} unlocked={unlocked} borderColors={border} gemColors={gem} artColors={art} glowColor="rgba(59,130,246,0.45)" />
        <polygon points="50,3 84,18 97,50 84,82 50,97 16,82 3,50 16,18" fill="url(#shieldGrad-ai-cards-500)" stroke="url(#borderGrad-ai-cards-500)" strokeWidth="7" />
        {/* Sapphire glowing sphere */}
        <g transform="translate(26, 26) scale(0.48)">
          <circle cx="50" cy="50" r="44" fill="none" stroke="url(#artGrad-ai-cards-500)" strokeWidth="2.5" />
          <circle cx="50" cy="50" r="12" fill="url(#artGrad-ai-cards-500)" />
          <circle cx="50" cy="50" r="6" fill="#ffffff" filter={`url(#glow-${id})`} />
        </g>
      </svg>
    </div>
  );
}

export function AiQuizzes250Badge({ size = 96, unlocked }: BadgeProps) {
  const id = 'ai-quizzes-250';
  const border = ['#60a5fa', '#2563eb', '#1e3a8a'];
  const gem = ['#1e40af', '#1e3a8a', '#172554'];
  const art = ['#bfdbfe', '#3b82f6', '#1d4ed8'];

  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]">
        <BadgeDefs id={id} unlocked={unlocked} borderColors={border} gemColors={gem} artColors={art} glowColor="rgba(59,130,246,0.45)" />
        <polygon points="50,3 84,18 97,50 84,82 50,97 16,82 3,50 16,18" fill="url(#shieldGrad-ai-quizzes-250)" stroke="url(#borderGrad-ai-quizzes-250)" strokeWidth="7" />
        {/* Double neural ring enclosing a blue crystal core */}
        <g transform="translate(26, 26) scale(0.48)">
          <circle cx="50" cy="50" r="44" fill="none" stroke="url(#artGrad-ai-quizzes-250)" strokeWidth="2.5" />
          <polygon points="50,22 74,36 74,64 50,78 26,64 26,36" fill="none" stroke="url(#artGrad-ai-quizzes-250)" strokeWidth="4.5" />
          <circle cx="50" cy="50" r="6" fill="#ffffff" filter={`url(#glow-${id})`} />
        </g>
      </svg>
    </div>
  );
}

// ==========================================================
// 9. DOCUMENTS CATEGORY BADGES (3)
// ==========================================================

export function Docs25Badge({ size = 96, unlocked }: BadgeProps) {
  const id = 'docs-25';
  const border = ['#d1d5db', '#9ca3af', '#374151'];
  const gem = ['#374151', '#111827', '#030712'];
  const art = ['#ffffff', '#e5e7eb', '#9ca3af'];

  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]">
        <BadgeDefs id={id} unlocked={unlocked} borderColors={border} gemColors={gem} artColors={art} glowColor="rgba(156,163,175,0.2)" />
        <circle cx="50" cy="50" r="45" fill="url(#shieldGrad-docs-25)" stroke="url(#borderGrad-docs-25)" strokeWidth="6" />
        {/* Simple steel vault plate */}
        <g transform="translate(26, 26) scale(0.48)">
          <circle cx="50" cy="50" r="36" fill="rgba(0,0,0,0.5)" stroke="url(#artGrad-docs-25)" strokeWidth="6.5" />
          <rect x="44" y="24" width="12" height="52" rx="4" fill="url(#artGrad-docs-25)" />
        </g>
      </svg>
    </div>
  );
}

export function Docs100Badge({ size = 96, unlocked }: BadgeProps) {
  const id = 'docs-100';
  const border = ['#60a5fa', '#2563eb', '#1e3a8a'];
  const gem = ['#1e40af', '#1e3a8a', '#172554'];
  const art = ['#bfdbfe', '#3b82f6', '#1d4ed8'];

  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]">
        <BadgeDefs id={id} unlocked={unlocked} borderColors={border} gemColors={gem} artColors={art} glowColor="rgba(59,130,246,0.45)" />
        <polygon points="50,3 84,18 97,50 84,82 50,97 16,82 3,50 16,18" fill="url(#shieldGrad-docs-100)" stroke="url(#borderGrad-docs-100)" strokeWidth="7" />
        {/* Winged blue chest lock */}
        <g transform="translate(26, 26) scale(0.48)">
          <circle cx="50" cy="50" r="36" fill="rgba(0,0,0,0.5)" stroke="url(#artGrad-docs-100)" strokeWidth="6.5" />
          <rect x="24" y="44" width="52" height="12" rx="4" fill="url(#artGrad-docs-100)" />
        </g>
      </svg>
    </div>
  );
}

export function Docs500Badge({ size = 96, unlocked }: BadgeProps) {
  const id = 'docs-500';
  const border = ['#fde68a', '#f59e0b', '#78350f', '#b45309', '#fde68a'];
  const gem = ['#991b1b', '#7f1d1d', '#450a0a'];
  const art = ['#fffbeb', '#f59e0b', '#b45309'];

  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]">
        <BadgeDefs id={id} unlocked={unlocked} borderColors={border} gemColors={gem} artColors={art} glowColor="rgba(245,158,11,0.85)" />
        {unlocked && <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(245,158,11,0.7)" strokeWidth="14" filter={`url(#glow-${id})`} />}
        {/* Golden vault door with sun laurels */}
        <circle cx="50" cy="50" r="44" fill="url(#shieldGrad-docs-500)" stroke="url(#borderGrad-docs-500)" strokeWidth="8" />
        <g transform="translate(26, 26) scale(0.48)">
          <circle cx="50" cy="50" r="36" fill="rgba(0,0,0,0.5)" stroke="url(#artGrad-docs-500)" strokeWidth="6.5" />
          <rect x="44" y="24" width="12" height="52" rx="4" fill="url(#artGrad-docs-500)" />
          <rect x="24" y="44" width="52" height="12" rx="4" fill="url(#artGrad-docs-500)" />
        </g>
      </svg>
    </div>
  );
}

// ==========================================================
// 10. SECRET SPECIAL CATEGORY BADGES (5)
// ==========================================================

export function SecretMoonReaderBadge({ size = 96, unlocked }: BadgeProps) {
  const id = 'secret-moon';
  const border = ['#60a5fa', '#2563eb', '#1e3a8a'];
  const gem = ['#1e3a8a', '#172554', '#0c122c'];
  const art = ['#bfdbfe', '#3b82f6', '#1d4ed8'];

  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]">
        <BadgeDefs id={id} unlocked={unlocked} borderColors={border} gemColors={gem} artColors={art} glowColor="rgba(59,130,246,0.45)" />
        <polygon points="50,3 84,18 97,50 84,82 50,97 16,82 3,50 16,18" fill="url(#shieldGrad-secret-moon)" stroke="url(#borderGrad-secret-moon)" strokeWidth="7" />
        {/* Crescent sapphire moon wreathed in dark wings */}
        <g transform="translate(26, 26) scale(0.48)">
          <path d="M50 20C33 20 20 33 20 50C20 67 33 80 50 80C58 80 65 77 71 72C61 72 53 64 53 54C53 44 61 36 71 36C65 31 58 20 50 20Z" fill="url(#artGrad-secret-moon)" />
        </g>
      </svg>
    </div>
  );
}

export function SecretLightningBrainBadge({ size = 96, unlocked }: BadgeProps) {
  const id = 'secret-lightning';
  const border = ['#c084fc', '#7e22ce', '#3b0764'];
  const gem = ['#581c87', '#2e1065', '#1a053a'];
  const art = ['#f5d0fe', '#a855f7', '#6b21a8'];

  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]">
        <BadgeDefs id={id} unlocked={unlocked} borderColors={border} gemColors={gem} artColors={art} glowColor="rgba(168,85,247,0.75)" />
        <polygon points="50,2 65,19 89,9 83,33 99,50 83,67 89,91 65,81 50,98 35,81 11,91 17,67 1,50 17,33 11,9 35,19" fill="url(#shieldGrad-secret-lightning)" stroke="url(#borderGrad-secret-lightning)" strokeWidth="7.5" />
        {/* Amethyst shield with violet lightning bolts */}
        <g transform="translate(26, 26) scale(0.48)">
          <path d="M50 15 L30 50 H50 L40 85 L70 45 H50 Z" fill="url(#artGrad-secret-lightning)" />
        </g>
      </svg>
    </div>
  );
}

export function SecretAncientMindBadge({ size = 96, unlocked }: BadgeProps) {
  const id = 'secret-ancient';
  const border = ['#c084fc', '#7e22ce', '#3b0764'];
  const gem = ['#581c87', '#2e1065', '#1a053a'];
  const art = ['#f5d0fe', '#a855f7', '#6b21a8'];

  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]">
        <BadgeDefs id={id} unlocked={unlocked} borderColors={border} gemColors={gem} artColors={art} glowColor="rgba(168,85,247,0.75)" />
        <polygon points="50,2 65,19 89,9 83,33 99,50 83,67 89,91 65,81 50,98 35,81 11,91 17,67 1,50 17,33 11,9 35,19" fill="url(#shieldGrad-secret-ancient)" stroke="url(#borderGrad-secret-ancient)" strokeWidth="7.5" />
        {/* Levitating runic hourglass */}
        <g transform="translate(26, 26) scale(0.48)">
          <path d="M35 25H65M35 75H65" stroke="url(#artGrad-secret-ancient)" strokeWidth="5" strokeLinecap="round" />
          <path d="M40 27C40 40 48 48 48 50C48 52 40 60 40 73H60C60 60 52 52 52 50C52 48 60 40 60 27H40Z" fill="none" stroke="url(#artGrad-secret-ancient)" strokeWidth="4" />
        </g>
      </svg>
    </div>
  );
}

export function SecretHiddenScholarBadge({ size = 96, unlocked }: BadgeProps) {
  const id = 'secret-hidden';
  const border = ['#34d399', '#059669', '#064e3b'];
  const gem = ['#064e3b', '#022c22', '#011c14'];
  const art = ['#a7f3d0', '#10b981', '#047857'];

  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]">
        <BadgeDefs id={id} unlocked={unlocked} borderColors={border} gemColors={gem} artColors={art} glowColor="rgba(16,185,129,0.35)" />
        <polygon points="50,3 90,20 90,80 50,97 10,80 10,20" fill="url(#shieldGrad-secret-hidden)" stroke="url(#borderGrad-secret-hidden)" strokeWidth="6.5" />
        {/* Emerald mask silhouette with nature trims */}
        <g transform="translate(26, 26) scale(0.48)">
          <path d="M 15 35 C 20 20 80 20 85 35 C 80 50 65 65 50 78 C 35 65 20 50 15 35 Z" fill="url(#artGrad-secret-hidden)" />
        </g>
      </svg>
    </div>
  );
}

export function SecretMysterySolverBadge({ size = 96, unlocked }: BadgeProps) {
  const id = 'secret-mystery';
  const border = ['#60a5fa', '#2563eb', '#1e3a8a'];
  const gem = ['#1e40af', '#1e3a8a', '#172554'];
  const art = ['#bfdbfe', '#3b82f6', '#1d4ed8'];

  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]">
        <BadgeDefs id={id} unlocked={unlocked} borderColors={border} gemColors={gem} artColors={art} glowColor="rgba(59,130,246,0.45)" />
        <polygon points="50,3 84,18 97,50 84,82 50,97 16,82 3,50 16,18" fill="url(#shieldGrad-secret-mystery)" stroke="url(#borderGrad-secret-mystery)" strokeWidth="7" />
        {/* Cobalt key locking an ancient rune */}
        <g transform="translate(26, 26) scale(0.48)">
          <path d="M 50 15 C 38 15 32 24 32 34 C 32 44 38 48 44 50 V 82 H 56 V 70 H 64 V 60 H 56 V 50 C 62 48 68 44 68 34 C 68 24 62 15 50 15 Z" fill="url(#artGrad-secret-mystery)" />
        </g>
      </svg>
    </div>
  );
}

// ==========================================================
// BADGE ASSETS DICTIONARY MAPPING
// ==========================================================

export const BADGE_ASSETS: Record<string, React.FC<BadgeProps>> = {
  // Streak
  streak_7: Streak7Badge,
  streak_30: Streak30Badge,
  streak_100: Streak100Badge,
  streak_365: Streak365Badge,
  streak_1000: Streak1000Badge,

  // Hours
  hours_10: Hours10Badge,
  hours_50: Hours50Badge,
  hours_100: Hours100Badge,
  hours_250: Hours250Badge,
  hours_500: Hours500Badge,
  hours_1000: Hours1000Badge,
  hours_5000: Hours5000Badge,

  // Focus
  focus_25: Focus25Badge,
  focus_100: Focus100Badge,
  focus_250: Focus250Badge,
  focus_1000: Focus1000Badge,

  // Notes
  notes_25: Notes25Badge,
  notes_100: Notes100Badge,
  notes_500: Notes500Badge,
  notes_1000: Notes1000Badge,

  // Cards
  cards_100: Cards100Badge,
  cards_500: Cards500Badge,
  cards_2500: Cards2500Badge,
  cards_10000: Cards10000Badge,

  // Quizzes
  quizzes_100: Quizzes100Badge,
  quizzes_500: Quizzes500Badge,
  quizzes_1000: Quizzes1000Badge,
  quiz_perfect_10: QuizPerfect10Badge,
  quiz_perfect_100: QuizPerfect100Badge,

  // Goals
  goals_10: Goals10Badge,
  goals_100: Goals100Badge,
  goals_500: Goals500Badge,

  // AI Usage
  ai_summaries_100: AiSummaries100Badge,
  ai_cards_500: AiCards500Badge,
  ai_quizzes_250: AiQuizzes250Badge,

  // Docs
  docs_25: Docs25Badge,
  docs_100: Docs100Badge,
  docs_500: Docs500Badge,

  // Secrets
  secret_moon_reader: SecretMoonReaderBadge,
  secret_lightning_brain: SecretLightningBrainBadge,
  secret_ancient_mind: SecretAncientMindBadge,
  secret_hidden_scholar: SecretHiddenScholarBadge,
  secret_mystery_solver: SecretMysterySolverBadge,
};
