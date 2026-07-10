'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Calendar, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WeeklyStatCards } from '@/components/weekly-stat-cards';
import { WeeklyPdbTable } from '@/components/WeeklyPdbTable';
import { WeeklySummary } from '@/components/WeeklySummary';
import { WeeklyHeatmap } from '@/components/weekly-heatmap';
import { WeeklyTrendAnalysis } from '@/components/weekly-trend-analysis';
import type { PdbEntry, WeeklySnapshot } from '@/lib/pdb-types';
import type { WeeklyViewProps } from './types';

export function WeeklyView({
  entries,
  currentSnapshot,
  loading,
  sortField,
  sortDir,
  currentPage,
  pageSize,
  filteredEntries,
  paginatedEntries,
  totalPages,
  bookmarks,
  selectedEntryIds,
  highlightedRowId,
  showSummary,
  showHeatmap,
  showTrend,
  weeklyDateFilter,
  selectedSnapshot,
  onSort,
  onRowClick,
  onToggleBookmark,
  onSelectEntries,
  onHighlightRow,
  onSetShowSummary,
  onSetShowHeatmap,
  onSetShowTrend,
  onSetWeeklyDateFilter,
  onSetCurrentPage,
  onSetPageSize,
}: WeeklyViewProps) {
  return (
    <>
      <WeeklyStatCards snapshot={currentSnapshot} entries={entries} loading={loading} snapshots={[]} />

      {/* Colored separator — same gradient as Evaluation & Literature: after overview, before action bar */}
      <div
        className="mx-4 mt-2 h-[2px] flex-shrink-0"
        style={{ background: 'linear-gradient(90deg, #c96442, #2d8f8f, #7c5cbf, #c9872e)' }}
      />

      {/* Summary + Heatmap toggle (filter bar) — white bg same as Evaluation & Literature */}
      <div className="px-4 py-2 flex items-center gap-2 flex-shrink-0 border-b border-claude-border dark:border-[#3d3832] bg-claude-surface dark:bg-[#242220]">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSetShowSummary(!showSummary)}
          className={`h-7 px-2.5 text-[11px] ${showSummary ? 'bg-claude-accent/10 text-claude-accent' : 'text-claude-text-muted'}`}
        >
          <BarChart3 className="h-3 w-3 mr-1" />
          {showSummary ? 'Hide Summary' : 'Show Summary'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSetShowHeatmap(!showHeatmap)}
          className={`h-7 px-2.5 text-[11px] ${showHeatmap ? 'bg-claude-accent/10 text-claude-accent' : 'text-claude-text-muted'}`}
        >
          <Calendar className="h-3 w-3 mr-1" />
          {showHeatmap ? 'Hide Heatmap' : 'Heatmap'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSetShowTrend(!showTrend)}
          className={`h-7 px-2.5 text-[11px] ${showTrend ? 'bg-claude-accent/10 text-claude-accent' : 'text-claude-text-muted'}`}
        >
          <TrendingUp className="h-3 w-3 mr-1" />
          {showTrend ? 'Hide Trends' : 'Trend Analysis'}
        </Button>
      </div>

      {/* Summary Charts */}
      <AnimatePresence>
        {showSummary && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <WeeklySummary entries={entries} snapshot={currentSnapshot} snapshots={[]} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trend Analysis */}
      <AnimatePresence>
        {showTrend && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <WeeklyTrendAnalysis snapshots={[]} entries={entries} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Heatmap Calendar */}
      <AnimatePresence>
        {showHeatmap && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <WeeklyHeatmap selectedSnapshot={selectedSnapshot} onDateSelect={onSetWeeklyDateFilter} currentDateFilter={weeklyDateFilter} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Data Table */}
      <div className="flex-1 overflow-auto border-t border-claude-border dark:border-[#3d3832]">
        <WeeklyPdbTable
          entries={paginatedEntries}
          loading={loading}
          sortField={sortField}
          sortDir={sortDir}
          onSort={onSort}
          onRowClick={onRowClick}
          bookmarks={bookmarks}
          onToggleBookmark={onToggleBookmark}
          selectedEntryIds={selectedEntryIds}
          onSelectEntries={onSelectEntries}
          highlightedRowId={highlightedRowId}
          onHighlightRow={onHighlightRow}
        />
      </div>

      {/* Pagination */}
      <div className="flex-shrink-0">
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-t border-claude-border dark:border-[#3d3832] bg-claude-surface dark:bg-[#242220]">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-claude-text-muted">
              Showing <span className="font-mono font-medium text-claude-text-secondary">{((currentPage - 1) * pageSize) + 1}</span>–<span className="font-mono font-medium text-claude-text-secondary">{Math.min(currentPage * pageSize, filteredEntries.length)}</span> of <span className="font-mono font-medium text-claude-text-secondary">{filteredEntries.length}</span>
            </span>
            <select
              value={pageSize}
              onChange={(e) => { onSetPageSize(Number(e.target.value)); onSetCurrentPage(1); }}
              className="h-6 px-1.5 text-[10px] font-medium rounded border border-claude-border dark:border-[#3d3832] bg-white dark:bg-[#1a1917] text-claude-text-secondary"
            >
              {[10, 25, 50, 100].map(s => <option key={s} value={s}>{s}/page</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" disabled={currentPage <= 1} onClick={() => onSetCurrentPage(p => p - 1)} className="h-7 px-2 text-[11px]">Prev</Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page: number;
              if (totalPages <= 5) page = i + 1;
              else if (currentPage <= 3) page = i + 1;
              else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
              else page = currentPage - 2 + i;
              return (
                <Button key={page} variant={currentPage === page ? 'default' : 'ghost'} size="sm"
                  onClick={() => onSetCurrentPage(page)}
                  className={`h-7 w-7 p-0 text-[11px] ${currentPage === page ? 'bg-claude-accent text-white shadow-sm' : ''}`}
                >{page}</Button>
              );
            })}
            <Button variant="ghost" size="sm" disabled={currentPage >= totalPages} onClick={() => onSetCurrentPage(p => p + 1)} className="h-7 px-2 text-[11px]">Next</Button>
          </div>
        </div>
      </div>
    </>
  );
}