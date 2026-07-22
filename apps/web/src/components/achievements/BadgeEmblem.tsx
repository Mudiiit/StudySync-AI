'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface BadgeEmblemProps {
  category: string;
  tier: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';
  unlocked: boolean;
  isSecret: boolean;
  size?: number;
}

export default function BadgeEmblem({
  category,
  tier,
  unlocked,
  isSecret,
  size = 96,
}: BadgeEmblemProps) {
  // Unique gradient and filter IDs to prevent overlap
  const idPrefix = `${category.replace(/\s+/g, '')}-${tier}`;

  // Gradients config depending on rarity tier
  const getTierColors = () => {
    switch (tier) {
      case 'COMMON':
        return {
          primary: '#9ca3af', // Silver / Gray
          secondary: '#4b5563',
          accent: '#e5e7eb',
          glow: 'rgba(156, 163, 175, 0.25)',
          rings: ['#6b7280', '#374151'],
        };
      case 'UNCOMMON':
        return {
          primary: '#10b981', // Emerald / Green
          secondary: '#047857',
          accent: '#a7f3d0',
          glow: 'rgba(16, 185, 129, 0.4)',
          rings: ['#059669', '#064e3b'],
        };
      case 'RARE':
        return {
          primary: '#3b82f6', // Sapphire / Royal Blue
          secondary: '#1d4ed8',
          accent: '#bfdbfe',
          glow: 'rgba(59, 130, 246, 0.5)',
          rings: ['#2563eb', '#1e3a8a'],
        };
      case 'EPIC':
        return {
          primary: '#a855f7', // Amethyst / Purple
          secondary: '#6b21a8',
          accent: '#e9d5ff',
          glow: 'rgba(168, 85, 247, 0.6)',
          rings: ['#8b5cf6', '#4c1d95'],
        };
      case 'LEGENDARY':
        return {
          primary: '#f59e0b', // Aurum / Gold
          secondary: '#b45309',
          accent: '#fef3c7',
          glow: 'rgba(245, 158, 11, 0.7)',
          rings: ['#d97706', '#78350f'],
        };
      case 'MYTHIC':
        return {
          primary: '#ec4899', // Cosmic Pink / Violet
          secondary: '#8b5cf6',
          accent: '#fbcfe8',
          glow: 'rgba(236, 72, 153, 0.8)',
          rings: ['#db2777', '#3b0764'],
        };
    }
  };

  const colors = getTierColors();

  // Custom icon path definitions for each category
  const renderCategoryIcon = () => {
    if (isSecret && !unlocked) {
      // Mystery Question Mark
      return (
        <path
          d="M44 32C44 26.5 48.5 22 54 22C59.5 22 64 26.5 64 32C64 36.5 60.5 39 57.5 41.5C54.5 44 54 47 54 50M54 59V61"
          stroke="url(#iconGrad)"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
      );
    }

    switch (category) {
      case 'Streak':
        // Elegant Multi-Layer Flame
        return (
          <g>
            <path
              d="M50 18C50 18 36 34 36 46C36 54.8 42.3 62 50 62C57.7 62 64 54.8 64 46C64 34 50 18 50 18Z"
              fill="url(#iconGrad)"
            />
            <path
              d="M50 30C50 30 42 42 42 50C42 55.5 45.6 60 50 60C54.4 60 58 55.5 58 50C58 42 50 30 50 30Z"
              fill={colors.accent}
              opacity="0.8"
            />
            <path
              d="M50 42C50 42 46 48 46 53C46 56.3 47.8 59 50 59C52.2 59 54 56.3 54 53C54 48 50 42 50 42Z"
              fill="#ffffff"
            />
          </g>
        );
      case 'Study Hours':
        // Ornate Hourglass
        return (
          <g>
            {/* Outer Pillars */}
            <path d="M35 25H65M35 75H65" stroke="url(#iconGrad)" strokeWidth="5" strokeLinecap="round" />
            <path d="M38 25V75M62 25V75" stroke="url(#iconGrad)" strokeWidth="3" />
            {/* Glass body */}
            <path
              d="M40 27C40 40 48 48 48 50C48 52 40 60 40 73H60C60 60 52 52 52 50C52 48 60 40 60 27H40Z"
              fill="none"
              stroke="url(#iconGrad)"
              strokeWidth="4"
            />
            {/* Top Sand */}
            <path d="M42 30C42 40 50 45 50 47C50 45 58 40 58 30H42Z" fill="url(#iconGrad)" opacity="0.8" />
            {/* Bottom Sand */}
            <path d="M43 71C45 60 50 56 50 56C50 56 55 60 57 71H43Z" fill="url(#iconGrad)" opacity="0.9" />
            {/* Falling sand stream */}
            <line x1="50" y1="46" x2="50" y2="65" stroke={colors.accent} strokeWidth="2.5" strokeDasharray="3,3" />
          </g>
        );
      case 'Focus Sessions':
        // Chronograph Radar & Focus Rings
        return (
          <g>
            <circle cx="50" cy="50" r="22" stroke="url(#iconGrad)" strokeWidth="3" fill="none" />
            <circle cx="50" cy="50" r="14" stroke="url(#iconGrad)" strokeWidth="2" fill="none" />
            <circle cx="50" cy="50" r="6" fill={colors.accent} />
            {/* Radar Lines */}
            <line x1="50" y1="20" x2="50" y2="80" stroke="url(#iconGrad)" strokeWidth="2.5" />
            <line x1="20" y1="50" x2="80" y2="50" stroke="url(#iconGrad)" strokeWidth="2.5" />
            {/* Corner Indicators */}
            <path d="M32 32H38V26" stroke={colors.accent} strokeWidth="2.5" fill="none" />
            <path d="M68 32H62V26" stroke={colors.accent} strokeWidth="2.5" fill="none" />
            <path d="M32 68H38V74" stroke={colors.accent} strokeWidth="2.5" fill="none" />
            <path d="M68 68H62V74" stroke={colors.accent} strokeWidth="2.5" fill="none" />
          </g>
        );
      case 'Notes':
        // Open Knowledge Book
        return (
          <g>
            <path
              d="M18 64C28 64 36 60 50 54C64 60 72 64 82 64V30C72 30 64 26 50 20C36 26 28 30 18 30V64Z"
              fill="none"
              stroke="url(#iconGrad)"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            {/* Middle spine */}
            <line x1="50" y1="20" x2="50" y2="56" stroke="url(#iconGrad)" strokeWidth="4.5" />
            {/* Left Page details */}
            <path d="M24 38H42M24 46H42M24 54H36" stroke="url(#iconGrad)" strokeWidth="2.5" strokeLinecap="round" />
            {/* Right Page details */}
            <path d="M76 38H58M76 46H58M76 54H64" stroke="url(#iconGrad)" strokeWidth="2.5" strokeLinecap="round" />
            {/* Star burst */}
            <path d="M50 12L52 17L57 19L52 21L50 26L48 21L43 19L48 17L50 12Z" fill={colors.accent} />
          </g>
        );
      case 'Quizzes':
        // Grand Trophy
        return (
          <g>
            {/* Handles */}
            <path
              d="M32 30C22 30 22 46 32 48M68 30C78 30 78 46 68 48"
              stroke="url(#iconGrad)"
              strokeWidth="4"
              fill="none"
            />
            {/* Bowl */}
            <path
              d="M30 26H70V40C70 50 60 58 50 58C40 58 30 50 30 40V26Z"
              fill="url(#iconGrad)"
              stroke={colors.accent}
              strokeWidth="2"
            />
            {/* Stem */}
            <path d="M46 58H54V68H46V58Z" fill="url(#iconGrad)" />
            {/* Pedestal */}
            <path d="M36 68H64V74H36V68Z" fill="url(#iconGrad)" stroke={colors.accent} strokeWidth="1.5" />
            {/* Engraving */}
            <circle cx="50" cy="42" r="5" fill="#ffffff" />
          </g>
        );
      case 'Flashcards':
        // Knowledge Brain Grid
        return (
          <g>
            {/* Brain Outline */}
            <path
              d="M38 32C30 32 26 40 26 48C26 58 38 64 50 68C62 64 74 58 74 48C74 40 70 32 62 32C56 32 52 36 50 38C48 36 44 32 38 32Z"
              fill="none"
              stroke="url(#iconGrad)"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            {/* Internal nodes */}
            <circle cx="38" cy="46" r="4.5" fill="url(#iconGrad)" />
            <circle cx="62" cy="46" r="4.5" fill="url(#iconGrad)" />
            <circle cx="50" cy="56" r="5.5" fill={colors.accent} />
            {/* Synaptic links */}
            <line x1="38" y1="46" x2="50" y2="56" stroke="url(#iconGrad)" strokeWidth="2.5" />
            <line x1="62" y1="46" x2="50" y2="56" stroke="url(#iconGrad)" strokeWidth="2.5" />
            <line x1="38" y1="46" x2="50" y2="38" stroke="url(#iconGrad)" strokeWidth="2.5" />
            <line x1="62" y1="46" x2="50" y2="38" stroke="url(#iconGrad)" strokeWidth="2.5" />
          </g>
        );
      case 'AI Usage':
        // Core Neural chip / spark
        return (
          <g>
            <rect x="35" y="35" width="30" height="30" rx="6" fill="none" stroke="url(#iconGrad)" strokeWidth="4" />
            {/* CPU Pins */}
            <line x1="42" y1="28" x2="42" y2="35" stroke={colors.accent} strokeWidth="3" strokeLinecap="round" />
            <line x1="50" y1="28" x2="50" y2="35" stroke={colors.accent} strokeWidth="3" strokeLinecap="round" />
            <line x1="58" y1="28" x2="58" y2="35" stroke={colors.accent} strokeWidth="3" strokeLinecap="round" />
            <line x1="42" y1="65" x2="42" y2="72" stroke={colors.accent} strokeWidth="3" strokeLinecap="round" />
            <line x1="50" y1="65" x2="50" y2="72" stroke={colors.accent} strokeWidth="3" strokeLinecap="round" />
            <line x1="58" y1="65" x2="58" y2="72" stroke={colors.accent} strokeWidth="3" strokeLinecap="round" />
            <line x1="28" y1="42" x2="35" y2="42" stroke={colors.accent} strokeWidth="3" strokeLinecap="round" />
            <line x1="28" y1="50" x2="35" y2="50" stroke={colors.accent} strokeWidth="3" strokeLinecap="round" />
            <line x1="28" y1="58" x2="35" y2="58" stroke={colors.accent} strokeWidth="3" strokeLinecap="round" />
            <line x1="65" y1="42" x2="72" y2="42" stroke={colors.accent} strokeWidth="3" strokeLinecap="round" />
            <line x1="65" y1="50" x2="72" y2="50" stroke={colors.accent} strokeWidth="3" strokeLinecap="round" />
            <line x1="65" y1="58" x2="72" y2="58" stroke={colors.accent} strokeWidth="3" strokeLinecap="round" />
            {/* Central glowing core */}
            <circle cx="50" cy="50" r="7" fill="url(#iconGrad)" className="animate-pulse" />
          </g>
        );
      case 'Goals':
        // Flag on Summit
        return (
          <g>
            {/* Peaks */}
            <path d="M22 72L42 36L56 52L78 72H22Z" fill="none" stroke="url(#iconGrad)" strokeWidth="4" strokeLinejoin="round" />
            {/* Flagpole */}
            <line x1="42" y1="20" x2="42" y2="45" stroke="url(#iconGrad)" strokeWidth="3" />
            {/* Flag */}
            <path d="M42 20L62 26L42 32V20Z" fill={colors.accent} />
          </g>
        );
      case 'Documents':
        // Knowledge Vault Portal
        return (
          <g>
            <rect x="26" y="28" width="48" height="44" rx="8" fill="none" stroke="url(#iconGrad)" strokeWidth="4.5" />
            <circle cx="50" cy="50" r="11" fill="none" stroke="url(#iconGrad)" strokeWidth="3" />
            {/* Vault lock details */}
            <line x1="50" y1="34" x2="50" y2="40" stroke={colors.accent} strokeWidth="2.5" strokeLinecap="round" />
            <line x1="50" y1="60" x2="50" y2="66" stroke={colors.accent} strokeWidth="2.5" strokeLinecap="round" />
            <line x1="34" y1="50" x2="40" y2="50" stroke={colors.accent} strokeWidth="2.5" strokeLinecap="round" />
            <line x1="60" y1="50" x2="66" y2="50" stroke={colors.accent} strokeWidth="2.5" strokeLinecap="round" />
          </g>
        );
      default:
        // Prestige Star Crest
        return (
          <path
            d="M50 15L59 36L82 38L64 53L70 75L50 63L30 75L36 53L18 38L41 36L50 15Z"
            fill="none"
            stroke="url(#iconGrad)"
            strokeWidth="4.5"
            strokeLinejoin="round"
          />
        );
    }
  };

  // Outer framing geometries per tier
  const renderOuterFrame = () => {
    switch (tier) {
      case 'COMMON':
        // Simple shield/circle
        return (
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="url(#shieldGrad)"
            stroke="url(#borderGrad)"
            strokeWidth="3.5"
          />
        );
      case 'UNCOMMON':
        // Clean octagon
        return (
          <polygon
            points="50,4 82,18 96,50 82,82 50,96 18,82 4,50 18,18"
            fill="url(#shieldGrad)"
            stroke="url(#borderGrad)"
            strokeWidth="4"
          />
        );
      case 'RARE':
        // Pointed Shield Crest
        return (
          <path
            d="M50 4C75 4 92 18 92 46C92 70 70 88 50 96C30 88 8 70 8 46C8 18 25 4 50 4Z"
            fill="url(#shieldGrad)"
            stroke="url(#borderGrad)"
            strokeWidth="4.5"
          />
        );
      case 'EPIC':
        // Double-lined ring octagram
        return (
          <g>
            <polygon
              points="50,2 66,22 90,14 82,38 98,54 74,62 66,86 50,78 34,86 26,62 2,54 18,38 10,14 34,22"
              fill="url(#shieldGrad)"
              stroke="url(#borderGrad)"
              strokeWidth="4"
              opacity="0.95"
            />
            {/* Spinning energy rings */}
            <circle
              cx="50"
              cy="50"
              r="34"
              fill="none"
              stroke={colors.accent}
              strokeWidth="1"
              strokeDasharray="20,10"
              className="animate-spin"
              style={{ animationDuration: '8s' }}
            />
          </g>
        );
      case 'LEGENDARY':
        // Ornate wing star crest
        return (
          <g>
            {/* Glowing flame wings background */}
            <path
              d="M50 4C78 12 96 32 96 50C96 74 72 96 50 96C28 96 4 74 4 50C4 32 22 12 50 4Z"
              fill="url(#shieldGrad)"
              stroke="url(#borderGrad)"
              strokeWidth="5"
            />
            {/* Layered star crest decoration */}
            <polygon
              points="50,10 62,38 90,38 68,54 76,82 50,66 24,82 32,54 10,38 38,38"
              fill="rgba(0,0,0,0.3)"
              stroke={colors.accent}
              strokeWidth="2.5"
            />
          </g>
        );
      case 'MYTHIC':
        // Ornate diamond starburst with celestial orbits
        return (
          <g>
            {/* Back cosmic aura */}
            <circle cx="50" cy="50" r="48" fill="rgba(0,0,0,0.5)" />
            <polygon
              points="50,2 64,36 98,50 64,64 50,98 36,64 2,50 36,36"
              fill="url(#shieldGrad)"
              stroke="url(#borderGrad)"
              strokeWidth="6"
            />
            <polygon
              points="50,16 60,40 84,50 60,60 50,84 40,60 16,50 40,40"
              fill="none"
              stroke={colors.accent}
              strokeWidth="2.5"
            />
            {/* Circular orbital orbits */}
            <ellipse
              cx="50"
              cy="50"
              rx="44"
              ry="18"
              fill="none"
              stroke={colors.accent}
              strokeWidth="1.5"
              strokeDasharray="15,10"
              transform="rotate(30, 50, 50)"
              className="animate-spin"
              style={{ animationDuration: '10s' }}
            />
            <ellipse
              cx="50"
              cy="50"
              rx="44"
              ry="18"
              fill="none"
              stroke={colors.accent}
              strokeWidth="1.5"
              strokeDasharray="15,10"
              transform="rotate(-30, 50, 50)"
              className="animate-spin"
              style={{ animationDuration: '14s' }}
            />
          </g>
        );
    }
  };

  return (
    <motion.div
      whileHover={unlocked ? { scale: 1.08, rotate: 1 } : {}}
      className={`relative inline-block select-none ${unlocked ? 'cursor-pointer' : 'opacity-35 grayscale filter blur-[0.4px]'}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
      >
        <defs>
          {/* Neon Bloom Filter */}
          <filter id={`glow-${idPrefix}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Border Metallic Gradients */}
          <linearGradient id={`borderGrad-${idPrefix}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.accent} />
            <stop offset="30%" stopColor={colors.primary} />
            <stop offset="70%" stopColor={colors.secondary} />
            <stop offset="100%" stopColor={colors.accent} />
          </linearGradient>

          {/* Inner Shield / Crest fill */}
          <radialGradient id={`shieldGrad-${idPrefix}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(24, 24, 27, 0.95)" />
            <stop offset="85%" stopColor="rgba(9, 9, 11, 0.98)" />
            <stop offset="100%" stopColor="rgba(0,0,0,1)" />
          </radialGradient>

          {/* Center Illustration Gradient */}
          <linearGradient id={`iconGrad-${idPrefix}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor={colors.accent} />
            <stop offset="100%" stopColor={colors.primary} />
          </linearGradient>
        </defs>

        {/* Outer Glow behind the frame */}
        {unlocked && (
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={colors.glow}
            strokeWidth="15"
            filter={`url(#glow-${idPrefix})`}
            className="animate-pulse"
          />
        )}

        {/* Render Outer Crest Frame shape */}
        {React.cloneElement(renderOuterFrame(), {
          id: `${idPrefix}-outer`,
          stroke: `url(#borderGrad-${idPrefix})`,
          fill: `url(#shieldGrad-${idPrefix})`,
        })}

        {/* Center Illustration Group */}
        <g id={`${idPrefix}-content`} transform="translate(0, 0)">
          {/* Inner accent ring */}
          <circle
            cx="50"
            cy="50"
            r="28"
            fill="none"
            stroke={colors.primary}
            strokeWidth="1"
            opacity="0.3"
            strokeDasharray="4,4"
          />
          
          {/* Icon path renderer */}
          {React.cloneElement(renderCategoryIcon() as React.ReactElement, {
            id: `${idPrefix}-icon`,
          })}
        </g>

        {/* Dynamic Highlight reflection Sweep */}
        {unlocked && (
          <path
            d="M 12,25 Q 40,15 88,25"
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        )}
      </svg>
    </motion.div>
  );
}
