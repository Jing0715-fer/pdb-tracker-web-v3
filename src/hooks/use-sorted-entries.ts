'use client';

import { useMemo } from 'react';
import type { PdbEntry, SortDir } from '@/lib/pdb-types';
import {
  parseAdvancedSearch,
  advancedEntryMatch,
  matchesFieldFilters,
  computeQualityScore,
  generateTags,
} from '@/lib/pdb-utils';
import { parseLigands } from '@/components/pdb-helpers';
import type { DiffResult } from '@/hooks/use-diff-mode';

export interface UseSortedEntriesParams {
  entries: PdbEntry[];
  sortField: string;
  sortDir: SortDir;
  bookmarks: Set<string>;
  activeCollection: string | null;
  collections: Record<string, string[]>;
  quickFilters: Set<string>;
  pinnedEntries: Set<string>;
  // Filter state (aggregated in filterConfig in pdb-tracker)
  showBookmarksOnly: boolean;
  debouncedSearch: string;
  searchMode: 'basic' | 'advanced';
  parsedFieldFilters: Record<string, string>;
  parsedTextQuery: string;
  structureNotes: Record<string, string>;
  resolutionRange: [number, number];
  ifRange: [number, number];
  selectedOrganisms: Set<string>;
  dateRange: { from: string; to: string };
  qualityFilter: string;
  hasLigandsFilter: boolean;
  selectedTagFilter: string | null;
  diffMode: boolean;
  diffResult: DiffResult;
  // Rating filter
  minRating: number;
  ratings: Record<string, number>;
}

export interface UseSortedEntriesReturn {
  sortedEntries: PdbEntry[];
}

export function useSortedEntries(params: UseSortedEntriesParams): UseSortedEntriesReturn {
  const {
    entries,
    sortField,
    sortDir,
    bookmarks,
    activeCollection,
    collections,
    quickFilters,
    pinnedEntries,
    showBookmarksOnly,
    debouncedSearch,
    searchMode,
    parsedFieldFilters,
    parsedTextQuery,
    structureNotes,
    resolutionRange,
    ifRange,
    selectedOrganisms,
    dateRange,
    qualityFilter,
    hasLigandsFilter,
    selectedTagFilter,
    diffMode,
    diffResult,
    minRating,
    ratings,
  } = params;

  const sortedEntries = useMemo(() => {
    let source = entries;
    if (activeCollection && collections[activeCollection]) {
      const collectionIds = new Set(collections[activeCollection]);
      source = entries.filter(e => collectionIds.has(e.pdbId));
    } else if (showBookmarksOnly) {
      source = entries.filter(e => bookmarks.has(e.pdbId));
    }
    // Client-side search filtering (includes notes search & advanced field:value syntax)
    if (debouncedSearch) {
      if (searchMode === 'advanced') {
        // Use full advanced matcher (boolean logic + field filters + quoted phrases)
        const parsed = parseAdvancedSearch(debouncedSearch);
        source = source.filter(e => advancedEntryMatch(e, parsed.tokens, structureNotes[e.pdbId]));
      } else {
        // Basic mode: simple substring match
        // Apply field filters from advanced search syntax
        if (Object.keys(parsedFieldFilters).length > 0) {
          source = source.filter(e => matchesFieldFilters(e, parsedFieldFilters));
        }
        // Apply text query (non-field parts) across all fields
        if (parsedTextQuery) {
          const q = parsedTextQuery.toLowerCase();
          source = source.filter(e => {
            const fieldMatch =
              e.pdbId.toLowerCase().includes(q) ||
              (e.title || '').toLowerCase().includes(q) ||
              (e.organisms || '').toLowerCase().includes(q) ||
              (e.journal || '').toLowerCase().includes(q) ||
              (e.authors || '').toLowerCase().includes(q) ||
              (e.ligands || '').toLowerCase().includes(q) ||
              (e.doi || '').toLowerCase().includes(q);
            const noteMatch = structureNotes[e.pdbId]?.toLowerCase().includes(q) ?? false;
            return fieldMatch || noteMatch;
          });
        }
      }
    }
    // Apply advanced filters
    if (resolutionRange[0] !== 0 || resolutionRange[1] !== 5) {
      source = source.filter(e => {
        if (e.resolution === null || e.resolution === undefined) return false;
        return e.resolution >= resolutionRange[0] && e.resolution <= resolutionRange[1];
      });
    }
    if (ifRange[0] !== 0 || ifRange[1] !== 50) {
      source = source.filter(e => {
        if (e.journalIf === null || e.journalIf === undefined) return false;
        return e.journalIf >= ifRange[0] && e.journalIf <= ifRange[1];
      });
    }
    if (selectedOrganisms.size > 0) {
      source = source.filter(e => {
        if (!e.organisms) return false;
        const entryOrganisms = e.organisms.split('|').map(o => o.trim());
        return entryOrganisms.some(o => selectedOrganisms.has(o));
      });
    }
    if (dateRange.from) {
      source = source.filter(e => (e.releaseDate || '') >= dateRange.from);
    }
    if (dateRange.to) {
      source = source.filter(e => (e.releaseDate || '') <= dateRange.to);
    }
    if (qualityFilter !== 'all') {
      source = source.filter(e => {
        const qs = computeQualityScore(e);
        switch (qualityFilter) {
          case 'excellent': return qs.total >= 80;
          case 'high': return qs.total >= 70;
          case 'good': return qs.total >= 60 && qs.total < 80;
          case 'fair': return qs.total >= 40 && qs.total < 60;
          case 'low': return qs.total < 40;
          default: return true;
        }
      });
    }
    if (hasLigandsFilter) {
      source = source.filter(e => {
        if (!e.ligands) return false;
        const ligandList = parseLigands(e.ligands);
        return ligandList.length > 0 && !ligandList.every(l => l === 'N/A');
      });
    }
    if (selectedTagFilter) {
      source = source.filter(e => {
        const entryTags = generateTags(e, diffMode && diffResult.newIds.has(e.pdbId));
        return entryTags.some(t => t.label === selectedTagFilter);
      });
    }
    // Filter by minimum rating
    if (minRating > 0) {
      source = source.filter(e => {
        const r = ratings[e.pdbId];
        return r !== undefined && r >= minRating;
      });
    }
    // Apply quick filters (multi-select via Set)
    if (quickFilters.size > 0) {
      for (const qf of quickFilters) {
        switch (qf) {
          case 'high_res':
            source = source.filter(e => e.resolution !== null && e.resolution !== undefined && e.resolution <= 2.0);
            break;
          case 'cryoem_only':
            source = source.filter(e => {
              const m = (e.method || '').toUpperCase();
              return m.includes('CRYO-EM') || m.includes('ELECTRON MICROSCOPY') || e.isCryoem;
            });
            break;
          case 'xray_only':
            source = source.filter(e => {
              const m = (e.method || '').toUpperCase();
              return m.includes('X-RAY') || e.isXray;
            });
            break;
          case 'high_if':
            source = source.filter(e => e.journalIf !== null && e.journalIf !== undefined && e.journalIf >= 10);
            break;
          case 'has_ligands':
            source = source.filter(e => {
              if (!e.ligands) return false;
              const ligandList = parseLigands(e.ligands);
              return ligandList.length > 0 && !ligandList.every(l => l === 'N/A');
            });
            break;
          case 'bookmarked':
            source = source.filter(e => bookmarks.has(e.pdbId));
            break;
        }
      }
    }
    if (!source.length) return [];
    const sorted = [...source].sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case 'pdbId': aVal = a.pdbId; bVal = b.pdbId; break;
        case 'method': aVal = a.method; bVal = b.method; break;
        case 'resolution': aVal = a.resolution ?? 999; bVal = b.resolution ?? 999; break;
        case 'journalIf': aVal = a.journalIf ?? -1; bVal = b.journalIf ?? -1; break;
        case 'organisms': aVal = a.organisms || ''; bVal = b.organisms || ''; break;
        case 'title': aVal = a.title; bVal = b.title; break;
        case 'releaseDate': aVal = a.releaseDate; bVal = b.releaseDate; break;
        case 'journal': aVal = a.journal || ''; bVal = b.journal || ''; break;
        default: aVal = a.releaseDate; bVal = b.releaseDate;
      }
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
    // Pinned entries always appear at the top, preserving their sort order within pinned group
    if (pinnedEntries.size > 0) {
      const pinned = sorted.filter(e => pinnedEntries.has(e.pdbId));
      const unpinned = sorted.filter(e => !pinnedEntries.has(e.pdbId));
      return [...pinned, ...unpinned];
    }
    return sorted;
  }, [entries, sortField, sortDir, bookmarks, activeCollection, collections, quickFilters, pinnedEntries, showBookmarksOnly, debouncedSearch, searchMode, parsedFieldFilters, parsedTextQuery, structureNotes, resolutionRange, ifRange, selectedOrganisms, dateRange, qualityFilter, hasLigandsFilter, selectedTagFilter, diffMode, diffResult, minRating, ratings]);

  return { sortedEntries };
}
