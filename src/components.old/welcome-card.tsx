'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { X, Microscope, Keyboard, Search, GitCompare, Bookmark } from 'lucide-react';

interface WelcomeCardProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function WelcomeCard({ visible, onDismiss }: WelcomeCardProps) {
  if (!visible) return null;

  const tips = [
    { icon: <Keyboard className="h-3 w-3" />, label: <><kbd className="kbd-enhanced text-[9px]">?</kbd> for shortcuts</> },
    { icon: <Search className="h-3 w-3" />, label: '\u2318K to search' },
    { icon: <GitCompare className="h-3 w-3" />, label: 'C to compare' },
    { icon: <Bookmark className="h-3 w-3" />, label: 'Space to bookmark' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="glass-stat-card glass-card-premium card-lift p-4 mb-4 relative overflow-hidden"
    >
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 text-[10px] text-claude-text-muted hover:text-claude-text transition-colors flex items-center gap-1"
      >
        <X className="h-3 w-3" />
        Dismiss
      </button>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-claude-accent/20 to-claude-accent/5 flex items-center justify-center">
          <Microscope className="h-4 w-4 text-claude-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-claude-text dark:text-[#e8e4df] mb-1">Welcome to PDB Structure Tracker</h3>
          <p className="text-[11px] text-claude-text-muted dark:text-[#9b9590] leading-relaxed mb-2">
            Track weekly Protein Data Bank releases, explore structures, compare entries, and manage your research workflow.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {tips.map((tip) => (
              <div key={String(tip.label)} className="flex items-center gap-1.5 text-[10px] text-claude-text-muted dark:text-[#9b9590]">
                <span className="text-claude-accent/60">{tip.icon}</span>
                {tip.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
