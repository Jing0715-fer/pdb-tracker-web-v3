'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Database,
  Calendar,
  Bookmark,
  Clock,
  X,
  Compass,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface OnboardingStatsProps {
  totalStructures: number;
  totalWeeks: number;
  totalBookmarks: number;
  sessionTime: number; // seconds
  onDismiss: () => void;
  onExplore: () => void;
}

// ─── Animation Variants ────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatSessionTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function OnboardingStats({
  totalStructures,
  totalWeeks,
  totalBookmarks,
  sessionTime,
  onDismiss,
  onExplore,
}: OnboardingStatsProps) {
  const stats = [
    {
      icon: Database,
      value: totalStructures,
      label: 'Structures',
      color: 'text-claude-accent',
      bg: 'bg-claude-accent-light dark:bg-[#3d2a22]',
    },
    {
      icon: Calendar,
      value: totalWeeks,
      label: 'Weeks Tracked',
      color: 'text-[#2d8f8f]',
      bg: 'bg-[#e8f5f5] dark:bg-[#1a2e2e]',
    },
    {
      icon: Bookmark,
      value: totalBookmarks,
      label: 'Bookmarks',
      color: 'text-[#c9872e]',
      bg: 'bg-[#fdf4e5] dark:bg-[#302818]',
    },
    {
      icon: Clock,
      value: formatSessionTime(sessionTime),
      label: 'Session Time',
      color: 'text-[#7c5cbf]',
      bg: 'bg-[#f0ebf8] dark:bg-[#28203a]',
    },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative overflow-hidden glass-surface p-6 dot-pattern-bg"
    >
      {/* Decorative morph blob */}
      <div className="morph-bg absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br from-claude-accent/20 via-transparent to-[#2d8f8f]/10 blur-2xl pointer-events-none" />
      <div className="morph-bg absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-gradient-to-tr from-[#c9872e]/10 via-transparent to-[#7c5cbf]/10 blur-xl pointer-events-none" />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <motion.div variants={itemVariants}>
            <h2 className="text-lg font-bold text-claude-text mb-1">
              Welcome to PDB Tracker
            </h2>
            <p className="text-xs text-claude-text-muted leading-relaxed max-w-xs">
              Your structural biology research companion. Track, analyze, and compare
              PDB structures across weekly releases.
            </p>
          </motion.div>
          <button
            onClick={onDismiss}
            className="h-7 w-7 flex items-center justify-center rounded-md text-claude-text-muted hover:text-claude-text hover:bg-claude-border-light dark:hover:bg-[#3d3832] transition-colors flex-shrink-0 mt-0.5"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                variants={itemVariants}
                className="flex items-center gap-3 p-3 rounded-xl border border-claude-border/40 dark:border-[#3d3832]/40 bg-white/30 dark:bg-[#1a1917]/30"
              >
                <div
                  className={`flex items-center justify-center h-10 w-10 rounded-lg ${stat.bg}`}
                >
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-bold text-claude-text leading-tight">
                    {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                  </div>
                  <div className="text-[10px] text-claude-text-muted">{stat.label}</div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <motion.div variants={itemVariants} className="flex items-center gap-2">
          <button
            onClick={onExplore}
            className="flex-1 h-9 text-xs font-semibold rounded-lg bg-claude-accent hover:bg-claude-accent-hover text-white flex items-center justify-center gap-1.5 transition-colors ripple-effect"
          >
            <Compass className="h-3.5 w-3.5" />
            Start Exploring
          </button>
          <button
            onClick={onDismiss}
            className="h-9 px-4 text-xs font-medium rounded-lg border border-claude-border dark:border-[#3d3832] text-claude-text-secondary hover:bg-claude-border-light dark:hover:bg-[#3d3832] transition-colors"
          >
            Dismiss
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}
