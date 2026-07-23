'use client';

import React from 'react';
import { X, Flame, Trophy, Clock, BookOpen, Brain, Download, FileText, Share2, Copy } from 'lucide-react';
import { useToast } from '@/components/providers/ToastProvider';

interface StudyCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  displayName: string;
  username: string;
  streak: number;
  level: number;
  studyHours: number;
  weeklyRank: number;
  notesCount: number;
  flashcardsCount: number;
}

export default function StudyCardModal({
  isOpen,
  onClose,
  displayName,
  username,
  streak,
  level,
  studyHours,
  weeklyRank,
  notesCount,
  flashcardsCount
}: StudyCardModalProps) {
  const { showToast } = useToast();

  if (!isOpen) return null;

  // Print PDF exporter
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>StudySync Card - ${displayName}</title>
          <style>
            body {
              background: #09090b;
              color: #f4f4f5;
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
            }
            .card {
              border: 1px solid #27272a;
              background: linear-gradient(135deg, #18181b, #09090b);
              padding: 40px;
              border-radius: 24px;
              width: 350px;
              text-align: center;
              box-shadow: 0 25px 50px -12px rgba(139, 92, 246, 0.15);
            }
            .name { font-size: 24px; font-weight: 800; margin-bottom: 4px; }
            .username { color: #71717a; font-size: 14px; margin-bottom: 20px; }
            .badge { display: inline-block; padding: 4px 12px; background: rgba(139, 92, 246, 0.2); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 9999px; color: #a78bfa; font-size: 12px; font-weight: 800; margin-bottom: 24px; }
            .stat-row { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 14px; color: #a1a1aa; border-bottom: 1px solid rgba(39, 39, 42, 0.4); padding-pb: 8px; }
            .stat-val { font-weight: bold; color: #f4f4f5; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="name">${displayName}</div>
            <div class="username">@${username || 'learner'}</div>
            <div class="badge">Level ${level} • Scholar</div>
            <div class="stat-row"><span>🔥 Streak:</span><span class="stat-val">${streak} Days</span></div>
            <div class="stat-row"><span>⏱ Study Hours:</span><span class="stat-val">${studyHours} Hours</span></div>
            <div class="stat-row"><span>🏆 Weekly Rank:</span><span class="stat-val">#${weeklyRank || 'Unranked'}</span></div>
            <div class="stat-row"><span>📖 Notes:</span><span class="stat-val">${notesCount}</span></div>
            <div class="stat-row"><span>🧠 Flashcards:</span><span class="stat-val">${flashcardsCount}</span></div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    showToast('Exporting to PDF printer...', 'success');
  };

  // Vector SVG file downloader
  const handleExportSVG = () => {
    const svgContent = `<svg width="400" height="500" viewBox="0 0 400 500" fill="none" xmlns="http://www.w3.org/2000/svg">
  <style>
    .title { font: bold 22px system-ui, sans-serif; fill: #F4F4F5; }
    .sub { font: 600 13px system-ui, sans-serif; fill: #71717A; }
    .badge { font: bold 11px system-ui, sans-serif; fill: #A78BFA; }
    .label { font: 500 13px system-ui, sans-serif; fill: #A1A1AA; }
    .val { font: bold 13px system-ui, sans-serif; fill: #F4F4F5; }
    .divider { stroke: #27272A; stroke-opacity: 0.5; }
  </style>
  <rect width="400" height="500" rx="24" fill="#09090B"/>
  <rect width="400" height="500" rx="24" stroke="#1E1B4B" stroke-width="2"/>
  
  <text x="200" y="70" text-anchor="middle" class="title">${displayName}</text>
  <text x="200" y="95" text-anchor="middle" class="sub">@${username || 'learner'}</text>
  
  <rect x="130" y="120" width="140" height="26" rx="13" fill="#8B5CF6" fill-opacity="0.15"/>
  <text x="200" y="137" text-anchor="middle" class="badge">Level ${level} • Scholar</text>
  
  <!-- Stats rows -->
  <text x="50" y="200" class="label">🔥 Learning Streak</text>
  <text x="350" y="200" text-anchor="end" class="val">${streak} Days</text>
  <line x1="50" y1="215" x2="350" y2="215" class="divider"/>
 
  <text x="50" y="250" class="label">⏱ Study Hours</text>
  <text x="350" y="250" text-anchor="end" class="val">${studyHours} Hours</text>
  <line x1="50" y1="265" x2="350" y2="265" class="divider"/>

  <text x="50" y="300" class="label">🏆 Weekly Placement</text>
  <text x="350" y="300" text-anchor="end" class="val">#${weeklyRank || 'Unranked'}</text>
  <line x1="50" y1="315" x2="350" y2="315" class="divider"/>

  <text x="50" y="350" class="label">📖 Notes Created</text>
  <text x="350" y="350" text-anchor="end" class="val">${notesCount}</text>
  <line x1="50" y1="365" x2="350" y2="365" class="divider"/>

  <text x="50" y="400" class="label">🧠 Flashcards Practiced</text>
  <text x="350" y="400" text-anchor="end" class="val">${flashcardsCount}</text>
  <line x1="50" y1="415" x2="350" y2="415" class="divider"/>
</svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `StudySync_Card_${username || 'learner'}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Vector SVG study card downloaded!', 'success');
  };

  // Plain text exporter
  const handleCopyText = () => {
    const text = `━━━━━━━━━━━━━━━━━━
📚 ${displayName}
@${username || 'learner'}
🔥 ${streak} Day Streak
💎 Level ${level} Scholar
⏱ ${studyHours} Hours Focused
🏆 Weekly Rank #${weeklyRank || 'Unranked'}
📖 ${notesCount} Notes
━━━━━━━━━━━━━━━━━━`;
    
    navigator.clipboard.writeText(text);
    showToast('Plain text card copied to clipboard!', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-zinc-950/90 border border-zinc-800/80 rounded-[32px] w-full max-w-sm overflow-hidden flex flex-col p-6 space-y-6 relative shadow-2xl backdrop-blur-xl">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-1.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition duration-200 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center space-y-1 mt-2">
          <h3 className="font-black text-zinc-100 text-base">Your Study Card</h3>
          <p className="text-zinc-500 text-[10px] font-semibold">Export vector SVG or print-friendly PDF cards</p>
        </div>

        {/* Visual Card Card Preview with elegant glassmorphism styling */}
        <div className="bg-gradient-to-b from-zinc-900/60 to-zinc-950 border border-zinc-900 rounded-[24px] p-6 text-center space-y-5 shadow-inner relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-650/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute right-4 top-4 text-violet-500/20">
            <Share2 className="w-8 h-8" />
          </div>
          
          <div>
            <span className="text-sm font-black text-zinc-200 block">{displayName}</span>
            <span className="text-[10px] text-zinc-550 block mt-0.5">@{username || 'learner'}</span>
          </div>

          <div className="inline-block px-3 py-1 bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[9px] font-black rounded-full uppercase tracking-widest">
            Level {level} • Scholar
          </div>

          <div className="space-y-2.5 text-xs text-left">
            <div className="flex justify-between items-center pb-1 border-b border-zinc-900/40 text-zinc-400">
              <span className="flex items-center gap-1.5 text-zinc-500"><Flame className="w-3.5 h-3.5 text-orange-500" /> Streak</span>
              <span className="font-bold text-zinc-200">{streak} Days</span>
            </div>
            <div className="flex justify-between items-center pb-1 border-b border-zinc-900/40 text-zinc-400">
              <span className="flex items-center gap-1.5 text-zinc-500"><Clock className="w-3.5 h-3.5 text-blue-400" /> Hours</span>
              <span className="font-bold text-zinc-200">{studyHours} h</span>
            </div>
            <div className="flex justify-between items-center pb-1 border-b border-zinc-900/40 text-zinc-400">
              <span className="flex items-center gap-1.5 text-zinc-500"><Trophy className="w-3.5 h-3.5 text-yellow-500" /> Weekly Rank</span>
              <span className="font-bold text-zinc-200">#{weeklyRank || 'Unranked'}</span>
            </div>
            <div className="flex justify-between items-center pb-1 border-b border-zinc-900/40 text-zinc-400">
              <span className="flex items-center gap-1.5 text-zinc-500"><FileText className="w-3.5 h-3.5 text-violet-400" /> Notes</span>
              <span className="font-bold text-zinc-200">{notesCount}</span>
            </div>
            <div className="flex justify-between items-center text-zinc-400">
              <span className="flex items-center gap-1.5 text-zinc-500"><Brain className="w-3.5 h-3.5 text-pink-400" /> Cards</span>
              <span className="font-bold text-zinc-200">{flashcardsCount}</span>
            </div>
          </div>
        </div>

        {/* Exporters Button Grid */}
        <div className="grid grid-cols-3 gap-2.5">
          <button
            onClick={handleExportSVG}
            className="flex flex-col items-center gap-1.5 p-3 bg-zinc-950/60 border border-zinc-900 hover:border-zinc-800 rounded-xl transition duration-200 cursor-pointer text-zinc-300"
          >
            <Download className="w-4 h-4 text-violet-400" />
            <span className="text-[9px] font-black uppercase tracking-widest">SVG</span>
          </button>
          
          <button
            onClick={handleExportPDF}
            className="flex flex-col items-center gap-1.5 p-3 bg-zinc-950/60 border border-zinc-900 hover:border-zinc-800 rounded-xl transition duration-200 cursor-pointer text-zinc-300"
          >
            <FileText className="w-4 h-4 text-blue-400" />
            <span className="text-[9px] font-black uppercase tracking-widest">PDF</span>
          </button>

          <button
            onClick={handleCopyText}
            className="flex flex-col items-center gap-1.5 p-3 bg-zinc-950/60 border border-zinc-900 hover:border-zinc-800 rounded-xl transition duration-200 cursor-pointer text-zinc-300"
          >
            <Copy className="w-4 h-4 text-emerald-400" />
            <span className="text-[9px] font-black uppercase tracking-widest">Copy</span>
          </button>
        </div>
      </div>
    </div>
  );
}
