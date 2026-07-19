'use client';

import React, { useState } from 'react';
import { Lock, Check } from 'lucide-react';

interface AvatarOption {
  url: string;
  name: string;
  category: string;
  isFree: boolean;
}

interface AvatarPickerProps {
  currentAvatarUrl: string | null;
  onSelectAvatar: (url: string) => void;
}

export default function AvatarPicker({ currentAvatarUrl, onSelectAvatar }: AvatarPickerProps) {
  const categories = [
    'Minimal', 'Abstract', 'Astronaut', 'Owls', 'Coffee', 'Plants', 'Cyberpunk', 'Anime-inspired'
  ];
  const [activeCategory, setActiveCategory] = useState('Minimal');

  const avatarOptions: AvatarOption[] = [
    // Minimal
    { url: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot1', name: 'Nano Bot', category: 'Minimal', isFree: true },
    { url: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot2', name: 'Vector Bot', category: 'Minimal', isFree: true },
    { url: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot3', name: 'Cyber Bot', category: 'Minimal', isFree: false },
    { url: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot4', name: 'Neo Bot', category: 'Minimal', isFree: false },
    // Abstract
    { url: 'https://api.dicebear.com/7.x/identicon/svg?seed=abs1', name: 'Prism', category: 'Abstract', isFree: true },
    { url: 'https://api.dicebear.com/7.x/identicon/svg?seed=abs2', name: 'Geometry', category: 'Abstract', isFree: true },
    { url: 'https://api.dicebear.com/7.x/identicon/svg?seed=abs3', name: 'Flux', category: 'Abstract', isFree: false },
    { url: 'https://api.dicebear.com/7.x/identicon/svg?seed=abs4', name: 'Nebula', category: 'Abstract', isFree: false },
    // Astronaut
    { url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=astro1', name: 'Astro Star', category: 'Astronaut', isFree: true },
    { url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=astro2', name: 'Cosmo Jack', category: 'Astronaut', isFree: true },
    { url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=astro3', name: 'Galaxy Ranger', category: 'Astronaut', isFree: false },
    { url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=astro4', name: 'Nova Pilot', category: 'Astronaut', isFree: false },
    // Owls
    { url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=owl1', name: 'Athena', category: 'Owls', isFree: true },
    { url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=owl2', name: 'Hooty', category: 'Owls', isFree: true },
    { url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=owl3', name: 'Midnight', category: 'Owls', isFree: false },
    { url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=owl4', name: 'Sage Owl', category: 'Owls', isFree: false },
    // Coffee
    { url: 'https://api.dicebear.com/7.x/shapes/svg?seed=coffee1', name: 'Espresso', category: 'Coffee', isFree: true },
    { url: 'https://api.dicebear.com/7.x/shapes/svg?seed=coffee2', name: 'Latte Art', category: 'Coffee', isFree: true },
    { url: 'https://api.dicebear.com/7.x/shapes/svg?seed=coffee3', name: 'Cold Brew', category: 'Coffee', isFree: false },
    { url: 'https://api.dicebear.com/7.x/shapes/svg?seed=coffee4', name: 'Moka Pot', category: 'Coffee', isFree: false },
    // Plants
    { url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=plant1', name: 'Cactus', category: 'Plants', isFree: true },
    { url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=plant2', name: 'Bonsai', category: 'Plants', isFree: true },
    { url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=plant3', name: 'Fern Leaf', category: 'Plants', isFree: false },
    { url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=plant4', name: 'Monstera', category: 'Plants', isFree: false },
    // Cyberpunk
    { url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=cyber1', name: 'Neon Runner', category: 'Cyberpunk', isFree: true },
    { url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=cyber2', name: 'Netrunner', category: 'Cyberpunk', isFree: true },
    { url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=cyber3', name: 'Synthwave', category: 'Cyberpunk', isFree: false },
    { url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=cyber4', name: 'Glitch Hacker', category: 'Cyberpunk', isFree: false },
    // Anime
    { url: 'https://api.dicebear.com/7.x/miniavs/svg?seed=anime1', name: 'Shinobi', category: 'Anime-inspired', isFree: true },
    { url: 'https://api.dicebear.com/7.x/miniavs/svg?seed=anime2', name: 'Sensei', category: 'Anime-inspired', isFree: true },
    { url: 'https://api.dicebear.com/7.x/miniavs/svg?seed=anime3', name: 'Mecha Pilot', category: 'Anime-inspired', isFree: false },
    { url: 'https://api.dicebear.com/7.x/miniavs/svg?seed=anime4', name: 'Valkyrie', category: 'Anime-inspired', isFree: false },
  ];

  const filteredAvatars = avatarOptions.filter((a) => a.category === activeCategory);

  return (
    <div className="space-y-4">
      {/* Category Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin border-b border-zinc-800">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              activeCategory === cat ? 'bg-violet-650 text-white shadow' : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Avatars Grid */}
      <div className="grid grid-cols-4 gap-4">
        {filteredAvatars.map((avatar) => {
          const isSelected = currentAvatarUrl === avatar.url;
          return (
            <div
              key={avatar.name}
              className={`relative rounded-2xl p-2 bg-zinc-950 border flex flex-col items-center justify-between group transition-all duration-300 ${
                isSelected 
                  ? 'border-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.15)] bg-violet-950/5' 
                  : 'border-zinc-850 hover:border-zinc-700 hover:bg-zinc-900/40'
              }`}
            >
              {/* Badge for locks */}
              {!avatar.isFree && (
                <div className="absolute top-2 right-2 bg-zinc-900 border border-zinc-800/80 p-1 rounded-lg text-zinc-500">
                  <Lock className="w-3 h-3" />
                </div>
              )}

              {/* Avatar Image */}
              <div className="relative w-14 h-14 rounded-full overflow-hidden bg-zinc-900/50 mt-1 mb-2">
                <img
                  src={avatar.url}
                  alt={avatar.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Avatar Name */}
              <span className="text-[10px] font-bold text-zinc-450 block truncate w-full text-center px-1 mb-1">
                {avatar.name}
              </span>

              {/* Action Button */}
              {avatar.isFree ? (
                <button
                  type="button"
                  onClick={() => onSelectAvatar(avatar.url)}
                  disabled={isSelected}
                  className={`w-full py-1 text-[9px] font-extrabold rounded-lg flex items-center justify-center gap-0.5 transition cursor-pointer ${
                    isSelected
                      ? 'bg-violet-500/20 text-violet-300'
                      : 'bg-zinc-900 hover:bg-violet-650 hover:text-white text-zinc-300'
                  }`}
                >
                  {isSelected ? (
                    <>
                      <Check className="w-2.5 h-2.5" />
                      Active
                    </>
                  ) : (
                    'Select'
                  )}
                </button>
              ) : (
                <div className="w-full py-1 text-[9px] font-bold rounded-lg bg-zinc-900/40 text-zinc-650 flex items-center justify-center select-none cursor-not-allowed">
                  Locked
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
