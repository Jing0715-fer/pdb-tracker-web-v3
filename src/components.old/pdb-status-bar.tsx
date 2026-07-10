'use client';

import React from 'react';
import {
  Database,
  Microscope,
  Calendar,
  Activity,
  StickyNote,
  Upload,
  CheckCircle2,
  Terminal,
  SlidersHorizontal,
  Keyboard,
  Moon,
  Sun,
  ArrowUp,
  ArrowDown,
  Star,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FooterClock } from '@/components/ui/pdb-ui';
import type { SortDir } from '@/lib/pdb-types';

// ── Props Interface ──
export interface PdbStatusBarProps {
  mode: 'weekly' | 'evaluation';
  selectedWeekId: string | null;
  entryCount: number;
  evaluationCount: number;
  structureNotesCount: number;
  importedCount: number;
  reviewedCount: number;
  totalEntries: number;
  loadingEntries: boolean;
  keyboardNavHintVisible: boolean;
  searchQuery: string;
  methodFilter: string;
  showBookmarksOnly: boolean;
  activeAdvancedFilterCount: number;
  selectedTagFilter: string | null;
  activeCollection: string | null;
  sortField: string | null;
  sortDir: SortDir;
  selectedRowsCount: number;
  snapshotCount: number;
  mounted: boolean;
  theme: string | undefined;
  ratedCount?: number;
  averageRating?: number;
}

// ── PdbStatusBar Component ──
export default function PdbStatusBar({
  mode,
  selectedWeekId,
  entryCount,
  evaluationCount,
  structureNotesCount,
  importedCount,
  reviewedCount,
  totalEntries,
  loadingEntries,
  keyboardNavHintVisible,
  searchQuery,
  methodFilter,
  showBookmarksOnly,
  activeAdvancedFilterCount,
  selectedTagFilter,
  activeCollection,
  sortField,
  sortDir,
  selectedRowsCount,
  snapshotCount,
  mounted,
  theme,
  ratedCount,
  averageRating,
}: PdbStatusBarProps) {
  return (
    <footer className="flex-shrink-0 h-6 flex items-center border-t border-claude-border dark:border-[#3d3832] bg-claude-border-light dark:bg-[#1a1917] text-[10px] text-claude-text-muted dark:text-[#9b9590] relative no-print select-none overflow-hidden mt-auto status-bar-gradient status-bar-enhanced" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {/* Animated gradient line at top */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-claude-accent/40 to-transparent bg-[length:200%_100%] animate-[status-bar-gradient_4s_ease-in-out_infinite]" />

      {/* Left section */}
      <div className="badge-stack flex items-center h-full min-w-0 truncate">
        <span className="inline-flex items-center gap-1 px-2 border-r border-claude-border/50 truncate">
          {mode === 'weekly' ? <Database className="h-3 w-3 text-claude-accent flex-shrink-0" /> : <Microscope className="h-3 w-3 text-claude-accent flex-shrink-0" />}
          <span className="font-medium text-claude-text-secondary truncate badge-glow slide-in-blur-left">{mode === 'weekly' ? 'Weekly' : 'Evaluation'}</span>
        </span>
        {mode === 'weekly' && selectedWeekId && (
          <span className="hidden sm:inline-flex items-center gap-1 px-2 border-r border-claude-border/50">
            <Calendar className="h-3 w-3" />
            <span className="font-mono">{selectedWeekId}</span>
          </span>
        )}
        <span className="inline-flex items-center gap-1 px-2 border-r border-claude-border/50">
          <Activity className="h-3 w-3" />
          <span>{mode === 'weekly' ? entryCount : evaluationCount} items</span>
        </span>
        {structureNotesCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2 border-r border-claude-border/50 text-amber-600 dark:text-amber-400">
            <StickyNote className="h-3 w-3" />
            <span>{structureNotesCount} notes</span>
          </span>
        )}
        {(ratedCount ?? 0) > 0 && (
          <span className="badge-rating inline-flex items-center gap-1 px-2 border-r border-claude-border/50">
            <Star className="h-3 w-3" />
            <span>{ratedCount} rated{(averageRating ?? 0) > 0 ? ` · ${averageRating!.toFixed(1)}★` : ''}</span>
          </span>
        )}
        {importedCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2 border-r border-claude-border/50 text-gray-600 dark:text-gray-400">
            <Upload className="h-3 w-3" />
            <span>{importedCount} imported</span>
          </span>
        )}
        {mode === 'weekly' && entryCount > 0 && reviewedCount > 0 && (
          <span className="hidden sm:inline-flex items-center gap-1 px-2 border-r border-claude-border/50 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-3 w-3" />
            <span>{reviewedCount}/{totalEntries} reviewed</span>
          </span>
        )}
      </div>

      {/* Center section */}
      <div className="flex-1 flex items-center justify-center h-full overflow-hidden">
        {loadingEntries && (
          <span className="inline-flex items-center gap-1.5 px-2">
            <span className="footer-loading-dot" />
            <span>Loading…</span>
          </span>
        )}
        {/* Keyboard Nav Hint - fades in when keyboard navigation is first used, auto-hides after 5s */}
        <AnimatePresence>
          {keyboardNavHintVisible && mode === 'weekly' && (
            <motion.span
              key="keyboard-nav-hint"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.2 }}
              className="inline-flex items-center gap-1.5 px-2 text-claude-accent/80"
            >
              <Terminal className="h-3 w-3" />
              <span>↑↓ Navigate</span>
              <span className="text-claude-text-muted/40">·</span>
              <span>Enter Open</span>
              <span className="text-claude-text-muted/40">·</span>
              <span>Space Bookmark</span>
              <span className="text-claude-text-muted/40">·</span>
              <span>Esc Close</span>
            </motion.span>
          )}
        </AnimatePresence>
        {!keyboardNavHintVisible && (methodFilter !== 'all' || searchQuery || showBookmarksOnly || activeAdvancedFilterCount > 0 || selectedTagFilter || activeCollection) && (
          <span className="hidden sm:inline-flex items-center gap-1 px-2">
            <SlidersHorizontal className="h-3 w-3 pulse-ring" />
            <span className="counter-badge text-[10px]">{[methodFilter !== 'all' ? 1 : 0, searchQuery ? 1 : 0, showBookmarksOnly ? 1 : 0, activeAdvancedFilterCount, selectedTagFilter ? 1 : 0, activeCollection ? 1 : 0].reduce((a, b) => a + b, 0)} active</span>
          </span>
        )}
        {!keyboardNavHintVisible && sortField && (() => {
          const sortLabels: Record<string, string> = { pdbId: 'PDB ID', method: 'Method', resolution: 'Resolution', journalIf: 'IF', organisms: 'Organism', title: 'Title', releaseDate: 'Date' };
          const label = sortLabels[sortField] || sortField;
          return (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2 border-l border-claude-border/50">
              {sortDir === 'asc' ? <ArrowUp className="h-3 w-3 text-claude-accent/70 sort-arrow-asc" /> : <ArrowDown className="h-3 w-3 text-claude-accent/70 sort-arrow-desc" />}
              <span className="inline-flex items-center px-1.5 py-0 rounded text-[9px] font-medium bg-claude-accent/10 text-claude-accent/80 border border-claude-accent/20">{label}</span>
            </span>
          );
        })()}
        {!keyboardNavHintVisible && !sortField && !(methodFilter !== 'all' || searchQuery || showBookmarksOnly || activeAdvancedFilterCount > 0 || selectedTagFilter || activeCollection) && (
          <span className="hidden sm:inline-flex items-center gap-1 px-2 text-claude-text-muted/60">
            <Keyboard className="h-3 w-3" />
            <span>Press <kbd className="px-0.5 py-px rounded text-[9px] bg-claude-border-light/80 dark:bg-[#3d3832] border border-claude-border/40 dark:border-[#4a4540] font-mono kbd-enhanced">?</kbd> for shortcuts</span>
          </span>
        )}
        {selectedRowsCount > 0 && !keyboardNavHintVisible && (
          <span className="hidden md:inline-flex items-center gap-1 px-2 border-l border-claude-border/50 text-claude-text-muted/60">
            <span>Hold <kbd className="px-0.5 py-px rounded text-[9px] bg-claude-border-light/80 dark:bg-[#3d3832] border border-claude-border/40 dark:border-[#4a4540] font-mono">⇧</kbd> + Click for range</span>
          </span>
        )}
      </div>

      {/* Right section */}
      <div className="hidden sm:flex items-center h-full">
        <span className="inline-flex items-center gap-1.5 px-2 border-l border-claude-border/50">
          <kbd className="px-0.5 py-px rounded text-[9px] bg-claude-border-light/80 dark:bg-[#3d3832] border border-claude-border/40 dark:border-[#4a4540] font-mono">⌘</kbd>
          <span>K</span>
          <span className="text-claude-text-muted/40">·</span>
          <kbd className="px-0.5 py-px rounded text-[9px] bg-claude-border-light/80 dark:bg-[#3d3832] border border-claude-border/40 dark:border-[#4a4540] font-mono">⌘</kbd>
          <span>E</span>
          <span className="text-claude-text-muted/40">·</span>
          <kbd className="px-0.5 py-px rounded text-[9px] bg-claude-border-light/80 dark:bg-[#3d3832] border border-claude-border/40 dark:border-[#4a4540] font-mono">⌘</kbd>
          <span>B</span>
        </span>
        <span className="inline-flex items-center gap-1 px-2 border-l border-claude-border/50">
          {mounted && theme === 'dark' ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
        </span>
        <span className="inline-flex items-center gap-1 px-2 border-l border-claude-border/50">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-breathe" />
          <span>{snapshotCount}w · {evaluationCount}e</span>
        </span>
        <FooterClock />
      </div>
    </footer>
  );
}
