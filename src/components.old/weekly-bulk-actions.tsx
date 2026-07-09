'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, Download, GitCompareArrows, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── Props ────────────────────────────────────────────────────────────────────

interface WeeklyBulkActionsProps {
  selectedCount: number;
  totalCount: number;
  onBookmarkAll: () => void;
  onExportSelected: (format: 'csv' | 'json') => void;
  onCompare: () => void;
  onClearSelection: () => void;
  /** Whether compare is allowed (2-4 items) */
  canCompare: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WeeklyBulkActions({
  selectedCount,
  totalCount,
  onBookmarkAll,
  onExportSelected,
  onCompare,
  onClearSelection,
  canCompare,
}: WeeklyBulkActionsProps) {
  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClearSelection();
      }
    };
    if (selectedCount > 0) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedCount, onClearSelection]);

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl shadow-lg border border-claude-border/50 dark:border-[#3d3832]/50 backdrop-blur-xl bg-white/80 dark:bg-[#1a1917]/80">
            {/* Selection count */}
            <div className="flex items-center gap-2 pr-3 border-r border-claude-border/50 dark:border-[#3d3832]/50">
              <div className="flex items-center justify-center h-6 w-6 rounded-full bg-claude-accent/15 text-claude-accent text-[11px] font-bold">
                {selectedCount}
              </div>
              <span className="text-xs text-claude-text-secondary font-medium whitespace-nowrap">
                {selectedCount} of {totalCount} selected
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBookmarkAll}
                className="h-8 px-3 text-[11px] gap-1.5 text-claude-text-secondary hover:text-claude-accent hover:bg-claude-accent/10"
                title="Add all selected to bookmarks"
              >
                <Bookmark className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Bookmark All</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onExportSelected('csv')}
                className="h-8 px-3 text-[11px] gap-1.5 text-claude-text-secondary hover:text-claude-accent hover:bg-claude-accent/10"
                title="Export selected as CSV"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export CSV</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={onCompare}
                disabled={!canCompare}
                className={`h-8 px-3 text-[11px] gap-1.5 ${
                  canCompare
                    ? 'text-claude-text-secondary hover:text-[#2d8f8f] hover:bg-[#2d8f8f]/10'
                    : 'text-claude-text-muted/40 cursor-not-allowed'
                }`}
                title={canCompare ? 'Compare selected structures' : 'Select 2-4 structures to compare'}
              >
                <GitCompareArrows className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Compare</span>
                {!canCompare && (
                  <span className="text-[9px] text-claude-text-muted">(2-4)</span>
                )}
              </Button>
            </div>

            {/* Divider */}
            <div className="w-px h-5 bg-claude-border/50 dark:bg-[#3d3832]/50" />

            {/* Clear selection */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="h-8 w-8 p-0 text-claude-text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
              title="Clear selection (Esc)"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
