'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Filter } from 'lucide-react';
import { toast } from 'sonner';
import type { SortDir } from '@/lib/pdb-types';
import type { FilterPreset as FilterPresetType } from '@/components/filter-presets';
import { hasAdvancedSyntax, parseAdvancedSearch } from '@/lib/pdb-utils';

export type SortField = string;

export interface UsePdbFiltersReturn {
  // State
  methodFilter: string;
  setMethodFilter: React.Dispatch<React.SetStateAction<string>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  debouncedSearch: string;
  setDebouncedSearch: React.Dispatch<React.SetStateAction<string>>;
  parsedFieldFilters: Record<string, string>;
  parsedTextQuery: string;
  parsedTokens: any[];
  searchMode: 'basic' | 'advanced';
  setSearchMode: React.Dispatch<React.SetStateAction<'basic' | 'advanced'>>;
  sortField: SortField;
  setSortField: React.Dispatch<React.SetStateAction<SortField>>;
  sortDir: SortDir;
  setSortDir: React.Dispatch<React.SetStateAction<SortDir>>;
  quickFilters: Set<string>;
  setQuickFilters: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedTagFilter: string | null;
  setSelectedTagFilter: React.Dispatch<React.SetStateAction<string | null>>;
  tagFilterDropdownOpen: boolean;
  setTagFilterDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  activeFilterPreset: string | null;
  setActiveFilterPreset: React.Dispatch<React.SetStateAction<string | null>>;

  // Callbacks
  handleApplyPreset: (preset: FilterPresetType) => void;
}

export function usePdbFilters(): UsePdbFiltersReturn {
  // ── Method Filter ──
  const [methodFilter, setMethodFilter] = useState<string>('all');

  // ── Search Query ──
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [parsedFieldFilters, setParsedFieldFilters] = useState<Record<string, string>>({});
  const [parsedTextQuery, setParsedTextQuery] = useState('');
  const [parsedTokens, setParsedTokens] = useState<any[]>([]);

  // ── Search Mode ──
  const [searchMode, setSearchMode] = useState<'basic' | 'advanced'>(() => {
    if (typeof window !== 'undefined') {
      try { return (localStorage.getItem('pdb-search-mode') as 'basic' | 'advanced') || 'advanced'; } catch { return 'advanced'; }
    }
    return 'advanced';
  });

  // ── Sort ──
  const [sortField, setSortField] = useState<SortField>('releaseDate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // ── Quick Filters ──
  const [quickFilters, setQuickFilters] = useState<Set<string>>(new Set());

  // ── Filter Presets (built-in) ──
  const [activeFilterPreset, setActiveFilterPreset] = useState<string | null>(null);

  // ── Tag Filter ──
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [tagFilterDropdownOpen, setTagFilterDropdownOpen] = useState(false);

  // Ref for debounce timeout
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Persist search mode to localStorage ──
  useEffect(() => {
    try { localStorage.setItem('pdb-search-mode', searchMode); } catch { /* ignore */ }
  }, [searchMode]);

  // ── Auto-suggest advanced mode when user types advanced syntax ──
  useEffect(() => {
    if (searchMode === 'basic' && searchQuery && hasAdvancedSyntax(searchQuery)) {
      setSearchMode('advanced');
    }
  }, [searchQuery, searchMode]);

  // ── Debounced Search with Advanced Syntax Parsing ──
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      const parsed = parseAdvancedSearch(searchQuery);
      setParsedFieldFilters(parsed.fieldFilters);
      setParsedTextQuery(parsed.textQuery);
      setParsedTokens(parsed.tokens);
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [searchQuery]);

  // ── Built-in Filter Presets Handler ──
  const handleApplyPreset = useCallback((preset: FilterPresetType) => {
    const f = preset.filters;
    if (f.methodFilter) setMethodFilter(f.methodFilter);
    if (f.quickFilters) setQuickFilters(new Set(f.quickFilters));
    if (f.searchQuery !== undefined) setSearchQuery(f.searchQuery);
    setActiveFilterPreset(preset.id);
    toast('Filter preset applied', {
      description: `"${preset.name}" applied`,
      icon: <Filter className="h-4 w-4 text-claude-accent" />,
    });
  }, []);

  return {
    // State
    methodFilter,
    setMethodFilter,
    searchQuery,
    setSearchQuery,
    debouncedSearch,
    setDebouncedSearch,
    parsedFieldFilters,
    parsedTextQuery,
    parsedTokens,
    searchMode,
    setSearchMode,
    sortField,
    setSortField,
    sortDir,
    setSortDir,
    quickFilters,
    setQuickFilters,
    selectedTagFilter,
    setSelectedTagFilter,
    tagFilterDropdownOpen,
    setTagFilterDropdownOpen,
    activeFilterPreset,
    setActiveFilterPreset,

    // Callbacks
    handleApplyPreset,
  };
}
