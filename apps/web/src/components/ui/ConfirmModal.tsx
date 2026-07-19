'use client';

import React, { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'danger' | 'info' | 'warning';
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  type = 'danger'
}: ConfirmModalProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Close on Escape, focus confirm button on open
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      // Small timeout to ensure element is rendered
      setTimeout(() => confirmButtonRef.current?.focus(), 50);
    }
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const getThemeClasses = () => {
    switch (type) {
      case 'danger':
        return {
          iconBg: 'bg-destructive/10 text-destructive',
          confirmBtn: 'bg-destructive hover:bg-destructive/90 text-destructive-foreground focus:ring-destructive',
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-500/10 text-amber-500',
          confirmBtn: 'bg-amber-500 hover:bg-amber-500/90 text-white focus:ring-amber-500',
        };
      default:
        return {
          iconBg: 'bg-primary/10 text-primary',
          confirmBtn: 'bg-primary hover:bg-primary/90 text-primary-foreground focus:ring-primary',
        };
    }
  };

  const theme = getThemeClasses();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
          />

          {/* Modal Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0.15 }}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            aria-describedby="confirm-modal-desc"
            className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-[101] text-left font-sans"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex gap-4">
              {/* Icon */}
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${theme.iconBg}`}>
                <AlertTriangle className="h-5 w-5" />
              </div>

              {/* Title & Message */}
              <div className="space-y-1.5 flex-1 min-w-0 pr-4">
                <h3
                  id="confirm-modal-title"
                  className="font-bold text-base text-foreground tracking-tight"
                >
                  {title}
                </h3>
                <p
                  id="confirm-modal-desc"
                  className="text-xs text-muted-foreground leading-relaxed"
                >
                  {message}
                </p>
              </div>
            </div>

            {/* Buttons Action Footer */}
            <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-border/55">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 hover:bg-secondary rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              >
                {cancelLabel}
              </button>
              <button
                ref={confirmButtonRef}
                type="button"
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-sm cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background ${theme.confirmBtn}`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
