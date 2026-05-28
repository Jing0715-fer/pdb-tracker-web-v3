'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, BarChart3, ChevronRight, Network } from 'lucide-react';
import type { LitPaper, LitReport, LitStats } from '@/lib/pdb-types';
import { LiteratureStatCards } from './LiteratureStatCards';
import { LiteratureToolbar, type ViewMode, type SortField, type DateFilter, type IfFilter } from './LiteratureToolbar';
import { LiteraturePaperList } from './LiteraturePaperList';
import { LiteratureDetailPanel } from './LiteratureDetailPanel';
import { LiteratureDateSidebar } from './LiteratureDateSidebar';
import { LiteratureStatsChart } from './LiteratureStatsChart';
import { LiteratureCitationNetwork } from './LiteratureCitationNetwork';
import { ReadingListSidebar, type ReadingList, useReadingLists } from './LiteratureReadingList';
import { PaperNotesEditor, usePaperNotes, type NoteData } from './LiteraturePaperNotes';
import { LiteratureAdvancedFilter, DEFAULT_ADVANCED_FILTERS, countActiveFilters, applyAdvancedFilters, type AdvancedFilterState } from './LiteratureAdvancedFilter';
import { usePaperTags, TagFilterBar } from './LiteraturePaperTags';
import { useReadingProgress, type ReadingProgressMap } from '@/hooks/use-reading-progress';

// ─── LiteratureContent ─────────────────────────────────────────────────────────
// The content portion of literature mode, for use inside pdb-tracker's
// unified layout. No sidebar, no header, no detail panel — just stat cards,
// charts toggle, toolbar, and paper list.

export interface LiteratureContentProps {
  stats: LitStats | null;
  papers: LitPaper[];
  reports: LitReport[];
  isLoading: boolean;
  showCharts: boolean;
  onToggleCharts: () => void;
  selectedDate: string | null;
  onClearDateFilter: () => void;
  onSelectPaper: (paper: LitPaper) => void;
  hasActiveFilters: boolean;
  onClearAllFilters: () => void;
  externalSearch?: string;
  // Reading list filter
  readingListFilter?: string | null;
  onClearReadingListFilter?: () => void;
  // Notes
  paperNotes?: ReturnType<typeof usePaperNotes>;
  // Paper notes editor open state
  openNotePmid?: string | null;
  onOpenNote?: (pmid: string | null) => void;
  // Tags
  paperTagsHook?: ReturnType<typeof usePaperTags>;
  tagFilter?: string | null;
  onTagFilterChange?: (tag: string | null) => void;
  // Detail panel props
  isDetailOpen?: boolean;
  onCloseDetail?: () => void;
  // Reading progress
  readingProgressHook?: ReturnType<typeof useReadingProgress>;
  // Total papers count for reading progress calculation
  totalPapersCount?: number;
}

export function LiteratureContent({
  stats,
  papers,
  reports,
  isLoading,
  showCharts,
  onToggleCharts,
  selectedDate,
  onClearDateFilter,
  onSelectPaper,
  hasActiveFilters,
  onClearAllFilters,
  externalSearch,
  readingListFilter,
  onClearReadingListFilter,
  paperNotes,
  openNotePmid,
  onOpenNote,
  paperTagsHook,
  tagFilter,
  onTagFilterChange,
  isDetailOpen,
  onCloseDetail,
  readingProgressHook,
  totalPapersCount,
}: LiteratureContentProps) {
  // Internal UI state (not shared with pdb-tracker)
  const [internalSearch, setInternalSearch] = useState('');

  // Derive effective search: external (header) takes priority when provided
  const search = externalSearch !== undefined ? externalSearch : internalSearch;

  const [sort, setSort] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [ifFilter, setIfFilter] = useState<IfFilter>('all');
  const [hasPdbOnly, setHasPdbOnly] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [expandAll, setExpandAll] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showCitationNetwork, setShowCitationNetwork] = useState(false);

  // Advanced filter state
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilterState>(DEFAULT_ADVANCED_FILTERS);
  const [advancedFilterOpen, setAdvancedFilterOpen] = useState(false);

  // Filter and sort papers
  const filteredPapers = useMemo(() => {
    let result = [...papers];

    // Reading list filter
    if (readingListFilter) {
      // This filter is handled externally via readingListFilter prop
      // The papers prop should already be filtered by the parent
    }

    // Tag filter
    if (tagFilter && paperTagsHook) {
      const papersWithTag = new Set(paperTagsHook.getPapersWithTag(tagFilter));
      result = result.filter(p => papersWithTag.has(p.pmid));
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      let cutoff: Date;
      switch (dateFilter) {
        case 'week':
          cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '3months':
          cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoff = new Date(0);
      }
      result = result.filter(p => {
        try {
          const d = new Date(p.pubdate + 'T00:00:00Z');
          return d >= cutoff;
        } catch {
          return true;
        }
      });
    }

    // IF filter
    if (ifFilter !== 'all') {
      const minIf = parseInt(ifFilter, 10);
      result = result.filter(p => p.IF != null && p.IF >= minIf);
    }

    // Has PDB filter
    if (hasPdbOnly) {
      result = result.filter(p => p.pdbs.length > 0);
    }

    // Advanced filters
    result = applyAdvancedFilters(result, advancedFilters);

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sort) {
        case 'IF':
          cmp = (a.IF ?? 0) - (b.IF ?? 0);
          break;
        case 'date':
          cmp = a.pubdate.localeCompare(b.pubdate);
          break;
        case 'title':
          cmp = (a.title || '').localeCompare(b.title || '');
          break;
        case 'journal':
          cmp = (a.journal || '').localeCompare(b.journal || '');
          break;
        case 'pmid':
          cmp = a.pmid.localeCompare(b.pmid);
          break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [papers, dateFilter, ifFilter, hasPdbOnly, sort, sortOrder, readingListFilter, tagFilter, paperTagsHook, advancedFilters]);

  const handleToggleExpand = useCallback((pmid: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(pmid)) next.delete(pmid);
      else next.add(pmid);
      return next;
    });
  }, []);

  const handleSort = useCallback((field: string) => {
    if (sort === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(field as SortField);
      setSortOrder('desc');
    }
  }, [sort]);

  const activeFiltersCount = [
    dateFilter !== 'all',
    ifFilter !== 'all',
    hasPdbOnly,
    !!readingListFilter,
    !!selectedDate,
    !!tagFilter,
    countActiveFilters(advancedFilters) > 0,
  ].filter(Boolean).length;

  // Advanced filter badges for toolbar
  const advancedFilterBadges = useMemo(() => {
    const badges: { label: string; onRemove: () => void }[] = [];
    for (const j of advancedFilters.journals.slice(0, 3)) {
      badges.push({
        label: j,
        onRemove: () => setAdvancedFilters(prev => ({ ...prev, journals: prev.journals.filter(x => x !== j) })),
      });
    }
    for (const m of advancedFilters.methods) {
      badges.push({
        label: m,
        onRemove: () => setAdvancedFilters(prev => ({ ...prev, methods: prev.methods.filter(x => x !== m) })),
      });
    }
    if (advancedFilters.yearStart || advancedFilters.yearEnd) {
      badges.push({
        label: `${advancedFilters.yearStart || '…'}–${advancedFilters.yearEnd || '…'}`,
        onRemove: () => setAdvancedFilters(prev => ({ ...prev, yearStart: '', yearEnd: '' })),
      });
    }
    if (advancedFilters.hasAbstract) {
      badges.push({
        label: 'Abstract',
        onRemove: () => setAdvancedFilters(prev => ({ ...prev, hasAbstract: false })),
      });
    }
    if (advancedFilters.hasPdbStructures) {
      badges.push({
        label: 'PDB',
        onRemove: () => setAdvancedFilters(prev => ({ ...prev, hasPdbStructures: false })),
      });
    }
    return badges;
  }, [advancedFilters]);

  // Tag-related data for filtering
  const tagPaperCounts = useMemo(() => {
    if (!paperTagsHook) return {};
    const counts: Record<string, number> = {};
    const allTags = paperTagsHook.getAllTags();
    for (const tag of allTags) {
      counts[tag] = paperTagsHook.getPapersWithTag(tag).length;
    }
    return counts;
  }, [paperTagsHook]);

  const handleTagClickOnCard = useCallback((tag: string) => {
    if (onTagFilterChange) {
      onTagFilterChange(tagFilter === tag ? null : tag);
    }
  }, [onTagFilterChange, tagFilter]);

  return (
    <>
      {/* Charts toggle + Citation Network toggle + filter info */}
      <div className="px-4 pt-2 flex items-center gap-2 flex-wrap">
        {selectedDate && (
          <span className="text-xs text-claude-text-muted">
            Filtered by:{' '}
            <button onClick={onClearDateFilter} className="text-claude-accent dark:text-claude-accent-hover hover:underline">
              {selectedDate}
            </button>
            <button onClick={onClearDateFilter} className="ml-1 text-claude-text-muted hover:text-claude-text">✕</button>
          </span>
        )}
        {readingListFilter && onClearReadingListFilter && (
          <span className="text-xs text-claude-text-muted">
            List filter:{' '}
            <button onClick={onClearReadingListFilter} className="text-claude-accent dark:text-claude-accent-hover hover:underline">
              Reading list
            </button>
            <button onClick={onClearReadingListFilter} className="ml-1 text-claude-text-muted hover:text-claude-text">✕</button>
          </span>
        )}
        {tagFilter && onTagFilterChange && (
          <span className="text-xs text-claude-text-muted">
            Tag filter:{' '}
            <button onClick={() => onTagFilterChange(null)} className="text-claude-accent dark:text-claude-accent-hover hover:underline">
              {tagFilter}
            </button>
            <button onClick={() => onTagFilterChange(null)} className="ml-1 text-claude-text-muted hover:text-claude-text">✕</button>
          </span>
        )}
        <div className="flex-1" />
        {activeFiltersCount > 0 && (
          <button
            onClick={onClearAllFilters}
            className="text-[10px] font-medium text-claude-accent dark:text-claude-accent-hover hover:underline"
          >
            Clear filters
          </button>
        )}
        <button
          onClick={() => setShowCitationNetwork(!showCitationNetwork)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            showCitationNetwork
              ? 'bg-claude-accent/10 text-claude-accent dark:bg-claude-accent/20 dark:text-claude-accent-hover'
              : 'bg-claude-border-light dark:bg-[#2b2926] text-claude-text-secondary hover:bg-claude-border dark:hover:bg-[#3d3832]'
          }`}
        >
          <Network className="h-3.5 w-3.5" />
          Network
          <ChevronRight className={`h-3 w-3 transition-transform ${showCitationNetwork ? 'rotate-90' : ''}`} />
        </button>
        <button
          onClick={onToggleCharts}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            showCharts
              ? 'bg-claude-accent/10 text-claude-accent dark:bg-claude-accent/20 dark:text-claude-accent-hover'
              : 'bg-claude-border-light dark:bg-[#2b2926] text-claude-text-secondary hover:bg-claude-border dark:hover:bg-[#3d3832]'
          }`}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Charts
          <ChevronRight className={`h-3 w-3 transition-transform ${showCharts ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {/* Stat cards */}
      <LiteratureStatCards
        stats={stats}
        isLoading={isLoading && !stats}
        readingProgress={readingProgressHook ? (() => {
          const total = totalPapersCount ?? papers.length ?? 1;
          const progressMap = readingProgressHook.progressMap;
          let unreadCount = 0;
          let readingCount = 0;
          let readCount = 0;
          for (const paper of papers) {
            const p = progressMap[paper.pmid] ?? 0;
            if (p >= 100) readCount++;
            else if (p > 0) readingCount++;
            else unreadCount++;
          }
          const papersWithProgress = readingCount + readCount;
          const progressPercentage = total > 0 ? Math.round((papersWithProgress / total) * 100) : 0;
          return { totalPapers: total, unreadCount, readingCount, readCount, progressPercentage };
        })() : undefined}
      />

      {/* Citation Network */}
      <AnimatePresence>
        {showCitationNetwork && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="px-4"
          >
            <LiteratureCitationNetwork papers={papers} onClose={() => setShowCitationNetwork(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Charts section */}
      <AnimatePresence>
        {showCharts && stats && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="px-4"
          >
            <LiteratureStatsChart stats={stats} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toolbar */}
      <div className="px-4 space-y-2">
        <LiteratureToolbar
          search={search}
          onSearchChange={setInternalSearch}
          sort={sort}
          onSortChange={setSort}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
          ifFilter={ifFilter}
          onIfFilterChange={setIfFilter}
          hasPdbOnly={hasPdbOnly}
          onHasPdbToggle={() => setHasPdbOnly(!hasPdbOnly)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          expandAll={expandAll}
          onExpandAllToggle={() => setExpandAll(!expandAll)}
          resultCount={filteredPapers.length}
          advancedFilterOpen={advancedFilterOpen}
          onToggleAdvancedFilter={() => setAdvancedFilterOpen(!advancedFilterOpen)}
          advancedFilterCount={countActiveFilters(advancedFilters)}
          advancedFilterBadges={advancedFilterBadges}
          filteredPapers={filteredPapers}
        />

        {/* Advanced Filter Panel */}
        <LiteratureAdvancedFilter
          papers={papers}
          filters={advancedFilters}
          onFiltersChange={setAdvancedFilters}
          isOpen={advancedFilterOpen}
          onToggle={() => setAdvancedFilterOpen(!advancedFilterOpen)}
        />

        {/* Tag filter bar */}
        {paperTagsHook && paperTagsHook.getAllTags().length > 0 && (
          <TagFilterBar
            allTags={paperTagsHook.getAllTags()}
            activeTag={tagFilter ?? null}
            onTagClick={onTagFilterChange ?? (() => {})}
            paperCountByTag={tagPaperCounts}
          />
        )}
      </div>

      {/* Paper notes editor overlay */}
      <AnimatePresence>
        {openNotePmid && paperNotes && onOpenNote && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="px-4"
          >
            <PaperNotesEditor
              pmid={openNotePmid}
              noteText={paperNotes.getNote(openNotePmid)}
              noteData={paperNotes.getNoteData(openNotePmid)}
              onNoteChange={paperNotes.setNote}
              onClose={() => onOpenNote(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Paper list */}
      <div className="flex-1 overflow-auto px-4">
        <LiteraturePaperList
          papers={filteredPapers}
          viewMode={viewMode}
          expandAll={expandAll}
          expandedIds={expandedIds}
          onToggleExpand={handleToggleExpand}
          onSelectPaper={onSelectPaper}
          sortField={sort}
          sortOrder={sortOrder}
          onSort={handleSort}
          isLoading={isLoading}
          readingLists={undefined}
          isPaperInList={undefined}
          onToggleList={undefined}
          hasNote={paperNotes?.hasNote}
          onOpenNote={onOpenNote || undefined}
          tags={paperTagsHook ? (paper: LitPaper) => paperTagsHook.getTags(paper.pmid) : undefined}
          onTagClick={onTagFilterChange ? handleTagClickOnCard : undefined}
          getReadingProgress={readingProgressHook?.getProgress}
        />
      </div>
    </>
  );
}

// ─── LiteratureView (standalone) ────────────────────────────────────────────────
// Convenience wrapper for standalone use (e.g., full-page literature view).
// Manages its own data fetching, sidebar, detail panel.

export function LiteratureView() {
  // Data state
  const [stats, setStats] = useState<LitStats | null>(null);
  const [papers, setPapers] = useState<LitPaper[]>([]);
  const [reports, setReports] = useState<LitReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // UI state
  const [selectedPaper, setSelectedPaper] = useState<LitPaper | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showCharts, setShowCharts] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  // Reading lists
  const readingListState = useReadingLists();
  const [readingListFilter, setReadingListFilter] = useState<string | null>(null);

  // Paper notes
  const paperNotesState = usePaperNotes();
  const [openNotePmid, setOpenNotePmid] = useState<string | null>(null);

  // Paper tags
  const paperTagsState = usePaperTags();
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  // Reading progress
  const readingProgressState = useReadingProgress();

  // Fetch stats
  useEffect(() => {
    fetch('/api/literature/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error('Failed to fetch lit stats:', err));
  }, []);

  // Fetch papers
  useEffect(() => {
    setIsLoading(true);
    const params = new URLSearchParams();
    fetch(`/api/literature/papers?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        setPapers(Array.isArray(data) ? data : []);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  // Fetch reports
  useEffect(() => {
    fetch('/api/literature/reports')
      .then(res => res.json())
      .then(data => setReports(Array.isArray(data) ? data : []))
      .catch(err => console.error('Failed to fetch reports:', err));
  }, []);

  // Handle date selection from sidebar
  const handleSelectDate = useCallback(async (date: string) => {
    setSelectedDate(date);
    setIsLoading(true);
    try {
      const res = await fetch(`/api/literature/report/${date}`);
      const data = await res.json();
      if (data.papers) setPapers(data.papers);
    } catch (err) {
      console.error('Failed to fetch report by date:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleClearDateFilter = useCallback(() => {
    setSelectedDate(null);
    setIsLoading(true);
    fetch('/api/literature/papers')
      .then(res => res.json())
      .then(data => { setPapers(Array.isArray(data) ? data : []); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  }, []);

  const handleSelectPaper = useCallback((paper: LitPaper) => {
    setSelectedPaper(paper);
    setIsDetailOpen(true);
  }, []);

  const clearAllFilters = useCallback(() => {
    if (selectedDate) handleClearDateFilter();
    setReadingListFilter(null);
    setTagFilter(null);
  }, [selectedDate, handleClearDateFilter]);

  const hasActiveFilters = selectedDate !== null || readingListFilter !== null || tagFilter !== null;

  // Filter papers by reading list
  const filteredPapers = useMemo(() => {
    if (!readingListFilter) return papers;
    const list = readingListState.lists.find(l => l.id === readingListFilter);
    if (!list) return papers;
    return papers.filter(p => list.paperPmids.includes(p.pmid));
  }, [papers, readingListFilter, readingListState.lists]);

  return (
    <div className="flex h-full min-h-screen bg-claude-bg">
      {/* Sidebar */}
      <AnimatePresence initial={false}>
        {showSidebar ? (
          <motion.aside
            key="lit-sidebar"
            initial={{ width: 220, opacity: 1 }}
            animate={{ width: 220, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="hidden lg:block flex-shrink-0 overflow-hidden"
          >
            <LiteratureDateSidebar
              reports={reports}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              isLoading={isLoading && reports.length === 0}
            />
          </motion.aside>
        ) : null}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-claude-border dark:border-[#3d3832]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="hidden lg:flex p-1.5 rounded-lg hover:bg-claude-border-light dark:hover:bg-[#2b2926] text-claude-text-muted hover:text-claude-text transition-colors"
              title={showSidebar ? 'Hide sidebar' : 'Show sidebar'}
            >
              <BookOpen className="h-4 w-4" />
            </button>
            <h1 className="text-lg font-bold text-claude-text header-title">
              Literature Tracker
            </h1>
          </div>
        </div>

        {/* Content */}
        <LiteratureContent
          stats={stats}
          papers={filteredPapers}
          reports={reports}
          isLoading={isLoading}
          showCharts={showCharts}
          onToggleCharts={() => setShowCharts(!showCharts)}
          selectedDate={selectedDate}
          onClearDateFilter={handleClearDateFilter}
          onSelectPaper={handleSelectPaper}
          hasActiveFilters={hasActiveFilters}
          onClearAllFilters={clearAllFilters}
          readingListFilter={readingListFilter}
          onClearReadingListFilter={() => setReadingListFilter(null)}
          paperNotes={paperNotesState}
          openNotePmid={openNotePmid}
          onOpenNote={setOpenNotePmid}
          paperTagsHook={paperTagsState}
          tagFilter={tagFilter}
          onTagFilterChange={setTagFilter}
          readingProgressHook={readingProgressState}
          totalPapersCount={papers.length}
        />
      </main>

      {/* Detail panel */}
      <LiteratureDetailPanel
        paper={selectedPaper}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        paperTags={selectedPaper ? paperTagsState.getTags(selectedPaper.pmid) : []}
        onAddTag={paperTagsState.addTag}
        onRemoveTag={paperTagsState.removeTag}
        allPapers={papers}
        onSelectPaper={handleSelectPaper}
        readingProgress={selectedPaper ? readingProgressState.getProgress(selectedPaper.pmid) : 0}
        onProgressChange={readingProgressState.setProgress}
        onMarkComplete={readingProgressState.markComplete}
      />
    </div>
  );
}
