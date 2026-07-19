'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Clock, HelpCircle, Eye, RefreshCw, Star, CheckCircle, Brain, ArrowRight } from 'lucide-react';
import { useReviewCard } from '@/hooks/useFlashcards';
import { Flashcard } from '@/services/flashcards';
import { useToast } from '../providers/ToastProvider';

interface ReviewSessionModalProps {
  cards: Flashcard[];
  onClose: () => void;
  onFinish?: () => void;
}

export default function ReviewSessionModal({ cards: initialCards, onClose, onFinish }: ReviewSessionModalProps) {
  const [queue, setQueue] = useState<Flashcard[]>([...initialCards]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  
  // Timer & Statistics
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [reviewsLogged, setReviewsLogged] = useState(0);
  const [sessionSuccessCount, setSessionSuccessCount] = useState(0); // rating > 0
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const reviewMutation = useReviewCard();
  const { showToast } = useToast();

  const currentCard = queue[currentIndex];

  // Timer loop
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTime]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentCard) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (isFlipped) {
        if (e.key === '1') handleRate(0); // Again
        else if (e.key === '2') handleRate(1); // Hard
        else if (e.key === '3') handleRate(2); // Good
        else if (e.key === '4') handleRate(3); // Easy
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentCard, isFlipped, currentIndex]);

  const handleRate = async (rating: number) => {
    if (!currentCard) return;

    const currentId = currentCard.id;
    setIsFlipped(false);
    setShowHint(false);
    setShowExplanation(false);

    try {
      // Trigger mutation
      await reviewMutation.mutateAsync({ cardId: currentId, rating });
      
      setReviewsLogged((prev) => prev + 1);
      if (rating > 0) {
        setSessionSuccessCount((prev) => prev + 1);
      }

      // Progress session queue
      if (currentIndex < queue.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        // Queue exhausted
        showToast('Spaced repetition review session completed!', 'success');
        if (onFinish) onFinish();
        onClose();
      }
    } catch (err: any) {
      showToast(`Failed to submit review: ${err.message || err}`, 'error');
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!currentCard) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-md text-white p-6">
        <Brain className="w-16 h-16 text-indigo-500 mb-4 animate-pulse" />
        <h2 className="text-2xl font-bold tracking-tight mb-2">No Cards Due for Review!</h2>
        <p className="text-zinc-400 mb-6 text-center max-w-md">Excellent work! You are all caught up on your studies for today.</p>
        <button
          onClick={onClose}
          className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold transition"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const progressPercentage = Math.round(((currentIndex) / queue.length) * 100);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-white font-sans overflow-hidden">
      
      {/* Top Header Section */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur">
        <div className="flex items-center gap-3">
          <Brain className="w-6 h-6 text-indigo-400" />
          <span className="font-semibold text-lg">Active Review Session</span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300">
            Card {currentIndex + 1} of {queue.length}
          </span>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-zinc-400 text-sm">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span>Elapsed: {formatTime(elapsed)}</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
            title="End Session"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-zinc-900">
        <motion.div 
          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Interactive Review Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-4xl mx-auto w-full">
        
        {/* Helper Instructions */}
        <p className="text-zinc-500 text-xs mb-4">
          {!isFlipped 
            ? 'Press [Space] or click card to flip' 
            : 'Select confidence level or press [1] - [4] shortcut keys'}
        </p>

        {/* 3D Card Container */}
        <div 
          className="w-full max-w-2xl h-80 cursor-pointer relative"
          style={{ perspective: 1200 }}
          onClick={() => setIsFlipped((prev) => !prev)}
        >
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={isFlipped ? 'back' : 'front'}
              initial={{ rotateY: isFlipped ? 90 : -90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: isFlipped ? -90 : 90, opacity: 0 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className={`absolute inset-0 w-full h-full p-8 rounded-3xl border ${
                isFlipped 
                  ? 'bg-zinc-900 border-indigo-500/30' 
                  : 'bg-zinc-900/80 border-zinc-800/80'
              } flex flex-col shadow-2xl overflow-y-auto select-none`}
            >
              {/* Card Meta Row */}
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-6 border-b border-zinc-800 pb-2">
                <span>{isFlipped ? 'ANSWER SIDE' : 'QUESTION SIDE'}</span>
                <span className="uppercase tracking-wider font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                  {currentCard.difficulty}
                </span>
              </div>

              {/* Card Main Body */}
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                {!isFlipped ? (
                  <h3 className="text-xl md:text-2xl font-medium leading-relaxed tracking-tight text-zinc-100">
                    {currentCard.question}
                  </h3>
                ) : (
                  <div className="w-full">
                    <p className="text-lg md:text-xl font-medium leading-relaxed text-zinc-100 mb-4 whitespace-pre-wrap">
                      {currentCard.answer}
                    </p>
                  </div>
                )}
              </div>

              {/* Card Tags / Bottom Row */}
              {currentCard.tags && currentCard.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 justify-center mt-6">
                  {currentCard.tags.map((t, idx) => (
                    <span key={idx} className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dynamic Context Tabs (Hint & Explanation) */}
        <div className="mt-8 flex flex-col items-center gap-4 w-full max-w-2xl">
          
          <div className="flex gap-3">
            {currentCard.hint && (
              <button
                onClick={() => setShowHint((prev) => !prev)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl border text-xs font-semibold tracking-wide transition ${
                  showHint 
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                {showHint ? 'Hide Hint' : 'Show Hint'}
              </button>
            )}

            {isFlipped && currentCard.explanation && (
              <button
                onClick={() => setShowExplanation((prev) => !prev)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl border text-xs font-semibold tracking-wide transition ${
                  showExplanation 
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' 
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                {showExplanation ? 'Hide Explanation' : 'Show Explanation'}
              </button>
            )}
          </div>

          {/* Hint Dropdown */}
          <AnimatePresence>
            {showHint && currentCard.hint && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="w-full p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-sm text-amber-300 text-center leading-relaxed"
              >
                <span className="font-semibold text-amber-400">Hint:</span> {currentCard.hint}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Explanation Dropdown */}
          <AnimatePresence>
            {showExplanation && currentCard.explanation && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="w-full p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 text-sm text-indigo-300 leading-relaxed whitespace-pre-wrap"
              >
                <span className="font-semibold text-indigo-400 block mb-1">Concept Explanation:</span>
                {currentCard.explanation}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </main>

      {/* Spaced Repetition Ratings Bar */}
      <footer className="border-t border-zinc-800 bg-zinc-900/80 p-6 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {!isFlipped ? (
            <motion.button
              key="show-answer-btn"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onClick={() => setIsFlipped(true)}
              className="px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-semibold tracking-wide shadow-lg shadow-indigo-600/10 flex items-center gap-2 group transition"
            >
              Reveal Answer
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
            </motion.button>
          ) : (
            <motion.div
              key="sm2-ratings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl"
            >
              {/* AGAIN button */}
              <button
                onClick={() => handleRate(0)}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-zinc-800 hover:bg-red-500/10 border border-zinc-700 hover:border-red-500/40 group transition"
              >
                <span className="text-red-400 group-hover:text-red-300 font-semibold text-sm">Again</span>
                <span className="text-zinc-500 text-[10px] mt-0.5">Incorrect [1]</span>
              </button>

              {/* HARD button */}
              <button
                onClick={() => handleRate(1)}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-zinc-800 hover:bg-amber-500/10 border border-zinc-700 hover:border-amber-500/40 group transition"
              >
                <span className="text-amber-400 group-hover:text-amber-300 font-semibold text-sm">Hard</span>
                <span className="text-zinc-500 text-[10px] mt-0.5">Struggled [2]</span>
              </button>

              {/* GOOD button */}
              <button
                onClick={() => handleRate(2)}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-zinc-800 hover:bg-indigo-500/10 border border-zinc-700 hover:border-indigo-500/40 group transition"
              >
                <span className="text-indigo-400 group-hover:text-indigo-300 font-semibold text-sm">Good</span>
                <span className="text-zinc-500 text-[10px] mt-0.5">Hesitation [3]</span>
              </button>

              {/* EASY button */}
              <button
                onClick={() => handleRate(3)}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-zinc-800 hover:bg-emerald-500/10 border border-zinc-700 hover:border-emerald-500/40 group transition"
              >
                <span className="text-emerald-400 group-hover:text-emerald-300 font-semibold text-sm">Easy</span>
                <span className="text-zinc-500 text-[10px] mt-0.5">Flawless [4]</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </footer>

    </div>
  );
}
