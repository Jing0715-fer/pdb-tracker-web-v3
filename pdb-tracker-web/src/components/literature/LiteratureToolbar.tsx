'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Search, SlidersHorizontal, LayoutGrid, List, Table, ChevronDown, X, BookOpen, Filter, Download, FileText, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { generateBatchBibTeX, generateBatchRIS, generateCSV, downloadFile } from '@/lib/citation-utils';
import type { LitPaper } from '@/lib/pdb-types';
import { toast } from 'sonner';

export type ViewMode = 'cards' | 'list' | 'table';
export type SortField = 'IF' | 'date' | 'title' | 'journal' | 'pmid';
export type DateFilter = 'all' | 'week' | 'month' | '3months';
export type IfFilter = 'all' | '5' | '10' | '20';

interface LiteratureToolbarProps {
  search: string;
  onSearchChange: (q: string) => void;
  sort: SortField;
  onSortChange: (s: SortField) => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (o: 'asc' | 'desc') => void;
  dateFilter: DateFilter;
  onDateFilterChange: (f: DateFilter) => void;
  ifFilter: IfFilter;
  onIfFilterChange: (f: IfFilter) => void;
  hasPdbOnly: boolean;
  onHasPdbToggle: () => void;
  viewMode: ViewMode;
  onViewModeChange: (m: ViewMode) => void;
  expandAll: boolean;
  onExpandAllToggle: () => void;
  resultCount: number;
  // Advanced filter props
  advancedFilterOpen?: boolean;
  onToggleAdvancedFilter?: () => void;
  advancedFilterCount?: number;
  advancedFilterBadges?: { label: string; onRemove: () => void }[];
  // Batch export props
  filteredPapers?: LitPaper[];
}

const DATE_FILTERS: { value: DateFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: '3months', label: '3 Months' },
];

const IF_FILTERS: { value: IfFilter; label: string }[] = [
  { value: 'all', label: 'All IF' },
  { value: '5', label: '≥5' },
  { value: '10', label: '≥10' },
  { value: '20', label: '≥20' },
];

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'date', label: 'Date' },
  { value: 'IF', label: 'Impact Factor' },
  { value: 'title', label: 'Title' },
  { value: 'journal', label: 'Journal' },
  { value: 'pmid', label: 'PMID' },
];

export function LiteratureToolbar({
  search,
  onSearchChange,
  sort,
  onSortChange,
  sortOrder,
  onSortOrderChange,
  dateFilter,
  onDateFilterChange,
  ifFilter,
  onIfFilterChange,
  hasPdbOnly,
  onHasPdbToggle,
  viewMode,
  onViewModeChange,
  expandAll,
  onExpandAllToggle,
  resultCount,
  advancedFilterOpen,
  onToggleAdvancedFilter,
  advancedFilterCount = 0,
  advancedFilterBadges = [],
  filteredPapers = [],
}: LiteratureToolbarProps) {
  const [localSearch, setLocalSearch] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sortOpen, setSortOpen] = useState(false);

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  const handleSearchInput = useCallback((val: string) => {
    setLocalSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearchChange(val), 300);
  }, [onSearchChange]);

  const clearSearch = useCallback(() => {
    setLocalSearch('');
    onSearchChange('');
  }, [onSearchChange]);

  const hasActiveFilters = dateFilter !== 'all' || ifFilter !== 'all' || hasPdbOnly || search !== '' || advancedFilterCount > 0;

  return (
    <div className="space-y-3">
      {/* Main toolbar row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
        {/* Search input */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-claude-text-muted" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder="Search papers by title, author, journal..."
            className="w-full h-8 pl-8 pr-8 text-sm rounded-lg border border-claude-border dark:border-[#3d3832] bg-white dark:bg-[#1a1917] text-claude-text placeholder:text-claude-text-muted focus:outline-none focus:ring-2 focus:ring-claude-accent/30 input-focus-glow transition-shadow"
          />
          {localSearch && (
            <button
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-claude-border-light dark:bg-[#3d3832] flex items-center justify-center hover:bg-claude-border dark:hover:bg-[#4a4540] transition-colors"
            >
              <X className="h-2.5 w-2.5 text-claude-text-muted" />
            </button>
          )}
        </div>

        {/* Sort dropdown */}
        <div className="relative">
          <button
            onClick={() => setSortOpen(!sortOpen)}
            className="h-8 px-3 text-xs font-medium rounded-lg border border-claude-border dark:border-[#3d3832] bg-white dark:bg-[#1a1917] text-claude-text-secondary hover:bg-claude-border-light dark:hover:bg-[#2b2926] transition-colors flex items-center gap-1.5 claude-focus-ring"
          >
            <SlidersHorizontal className="h-3 w-3" />
            {SORT_OPTIONS.find(o => o.value === sort)?.label ?? 'Sort'}
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc'); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc'); } }}
              className="ml-0.5 text-[10px] text-claude-text-muted hover:text-claude-accent dark:hover:text-claude-accent-hover cursor-pointer select-none"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </span>
            <ChevronDown className="h-3 w-3 text-claude-text-muted" />
          </button>
          {sortOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 min-w-[160px] py-1 rounded-lg border border-claude-border dark:border-[#3d3832] bg-white dark:bg-[#242220] shadow-lg">
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { onSortChange(opt.value); setSortOpen(false); }}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-claude-border-light dark:hover:bg-[#2b2926] transition-colors ${
                      sort === opt.value ? 'text-claude-accent font-medium' : 'text-claude-text-secondary'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Advanced Filters toggle */}
        {onToggleAdvancedFilter && (
          <div className="flex items-center gap-1.5">
            <Button
              variant={advancedFilterCount > 0 ? 'default' : 'outline'}
              size="sm"
              onClick={onToggleAdvancedFilter}
              className={`h-8 text-xs gap-1.5 ${
                advancedFilterCount > 0
                  ? 'bg-claude-accent hover:bg-claude-accent-hover text-white'
                  : 'border-claude-border dark:border-[#3d3832] text-claude-text-secondary hover:bg-claude-border-light dark:hover:bg-[#2b2926]'
              }`}
            >
              <Filter className="h-3 w-3" />
              Filters
              {advancedFilterCount > 0 && (
                <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-white/20 text-[9px] font-bold">
                  {advancedFilterCount}
                </span>
              )}
            </Button>
            {/* Active advanced filter badges */}
            {advancedFilterCount > 0 && !advancedFilterOpen && advancedFilterBadges.slice(0, 2).map((badge, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-claude-accent/10 text-claude-accent dark:bg-claude-accent/20 dark:text-claude-accent-hover"
              >
                {badge.label.length > 12 ? badge.label.slice(0, 12) + '…' : badge.label}
                <button onClick={badge.onRemove} className="hover:text-claude-text transition-colors">
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
            {advancedFilterBadges.length > 2 && !advancedFilterOpen && (
              <span className="text-[9px] text-claude-text-muted">+{advancedFilterBadges.length - 2}</span>
            )}
          </div>
        )}

        {/* Has PDB toggle */}
        <Button
          variant={hasPdbOnly ? 'default' : 'outline'}
          size="sm"
          onClick={onHasPdbToggle}
          className={`h-8 text-xs gap-1.5 ${
            hasPdbOnly
              ? 'bg-claude-accent hover:bg-claude-accent-hover text-white'
              : 'border-claude-border dark:border-[#3d3832] text-claude-text-secondary hover:bg-claude-border-light dark:hover:bg-[#2b2926]'
          }`}
        >
          <BookOpen className="h-3 w-3" />
          Has PDB
        </Button>

        {/* Expand toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={onExpandAllToggle}
          className="h-8 text-xs gap-1.5 border-claude-border dark:border-[#3d3832] text-claude-text-secondary hover:bg-claude-border-light dark:hover:bg-[#2b2926]"
        >
          {expandAll ? 'Collapse' : 'Expand'}
        </Button>

        {/* View mode toggle */}
        <div className="flex rounded-lg border border-claude-border dark:border-[#3d3832] overflow-hidden">
          {([
            { mode: 'cards' as ViewMode, icon: LayoutGrid, label: 'Cards' },
            { mode: 'list' as ViewMode, icon: List, label: 'List' },
            { mode: 'table' as ViewMode, icon: Table, label: 'Table' },
          ]).map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              title={label}
              className={`h-8 px-2.5 flex items-center justify-center transition-colors ${
                viewMode === mode
                  ? 'bg-claude-accent/10 text-claude-accent dark:bg-claude-accent/20 dark:text-claude-accent-hover'
                  : 'bg-white dark:bg-[#1a1917] text-claude-text-muted hover:bg-claude-border-light dark:hover:bg-[#2b2926]'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>

        {/* Export Citations dropdown */}
        {filteredPapers.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5 border-claude-border dark:border-[#3d3832] text-claude-text-secondary hover:bg-claude-border-light dark:hover:bg-[#2b2926]"
              >
                <Download className="h-3.5 w-3.5" />
                Export
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onClick={() => {
                  const content = generateBatchBibTeX(filteredPapers);
                  downloadFile(content, 'citations.bib', 'application/x-bibtex');
                  toast.success(`Exported ${filteredPapers.length} papers as BibTeX`);
                }}
              >
                <FileText className="h-3.5 w-3.5 mr-2" />
                Export All as BibTeX (.bib)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const content = generateBatchRIS(filteredPapers);
                  downloadFile(content, 'citations.ris', 'application/x-research-info-systems');
                  toast.success(`Exported ${filteredPapers.length} papers as RIS`);
                }}
              >
                <FileText className="h-3.5 w-3.5 mr-2" />
                Export All as RIS (.ris)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  const apaCitations = filteredPapers.map(p => {
                    const authors = p.authors || 'Unknown';
                    const year = p.pubdate ? p.pubdate.match(/\d{4}/)?.[0] || '' : '';
                    return `${authors} (${year}). ${p.title}. ${p.journal}${p.doi ? `. https://doi.org/${p.doi}` : ''}. PMID: ${p.pmid}.`;
                  }).join('\n\n');
                  await navigator.clipboard.writeText(apaCitations);
                  toast.success(`Copied ${filteredPapers.length} APA citations to clipboard`);
                }}
              >
                <Copy className="h-3.5 w-3.5 mr-2" />
                Copy All APA Citations
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  const content = generateCSV(filteredPapers);
                  downloadFile(content, 'citations.csv', 'text/csv');
                  toast.success(`Exported ${filteredPapers.length} papers as CSV`);
                }}
              >
                <Download className="h-3.5 w-3.5 mr-2" />
                Export All as CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Filter chips row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-medium text-claude-text-muted uppercase tracking-wider mr-1">Date:</span>
        {DATE_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => onDateFilterChange(f.value)}
            className={`h-6 px-2.5 rounded-full text-[10px] font-medium transition-all duration-150 ${
              dateFilter === f.value
                ? 'bg-claude-accent text-white shadow-sm'
                : 'bg-claude-border-light dark:bg-[#2b2926] text-claude-text-secondary hover:bg-claude-border dark:hover:bg-[#3d3832]'
            }`}
          >
            {f.label}
          </button>
        ))}

        <span className="text-claude-border dark:text-[#3d3832] mx-1">|</span>

        <span className="text-[10px] font-medium text-claude-text-muted uppercase tracking-wider mr-1">IF:</span>
        {IF_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => onIfFilterChange(f.value)}
            className={`h-6 px-2.5 rounded-full text-[10px] font-medium transition-all duration-150 ${
              ifFilter === f.value
                ? 'bg-claude-accent text-white shadow-sm'
                : 'bg-claude-border-light dark:bg-[#2b2926] text-claude-text-secondary hover:bg-claude-border dark:hover:bg-[#3d3832]'
            }`}
          >
            {f.label}
          </button>
        ))}

        {hasActiveFilters && (
          <span className="ml-auto text-[10px] text-claude-text-muted">
            {resultCount} result{resultCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}
