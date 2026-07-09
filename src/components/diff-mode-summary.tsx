'use client';

import React from 'react';
import { X } from 'lucide-react';

interface DiffModeSummaryProps {
  newCount: number;
  removedCount: number;
  unchangedCount: number;
  prevWeekId: string | null;
  onExit: () => void;
}

export default function DiffModeSummary({
  newCount,
  removedCount,
  unchangedCount,
  prevWeekId,
  onExit,
}: DiffModeSummaryProps) {
  return (
    <div className="px-4 py-2 flex items-center gap-4 text-[11px] border-b border-claude-border dark:border-[#3d3832] bg-gradient-to-r from-green-50/50 via-transparent to-red-50/50 dark:from-green-900/10 dark:to-red-900/10">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
          <span className="font-medium text-green-700 dark:text-green-400">{newCount}</span> new
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          <span className="font-medium text-red-700 dark:text-red-400">{removedCount}</span> removed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-gray-400 dark:bg-gray-500" />
          <span className="font-medium text-claude-text-secondary">{unchangedCount}</span> unchanged
        </span>
      </div>
      {prevWeekId && (
        <span className="text-claude-text-muted">
          Comparing with <span className="font-mono font-medium">{prevWeekId}</span>
        </span>
      )}
      {!prevWeekId && (
        <span className="text-amber-600 dark:text-amber-400">
          No previous week available for comparison
        </span>
      )}
      <button
        onClick={onExit}
        className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/30 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
      >
        <X className="h-2.5 w-2.5" />
        Exit Diff
      </button>
    </div>
  );
}
