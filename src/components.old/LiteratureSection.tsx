// LiteratureSection.tsx
// Displays literature info grouped by pubmedId with associated PDB IDs
// Compact card layout with authors, journal, IF badge, and PDB chips

'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { ExternalLink, BookOpen, Database, Search, X, ChevronRight, Quote, Calendar, FileText, User, RefreshCw, CloudDownload, FolderOpen, ArrowLeft, BarChart3, TrendingUp, Microscope, Hash, Folder, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import type { PdbEntry } from './types';

interface PdbInfo {
  pdbId: string;
  method: string | null;
  title: string | null;
  journal: string | null;
  journalIf: number | null;
  pubmedId: string | null;
  pubmedTitle?: string | null;
  pubmedAuthors?: string | null;
  pubmedAbstract?: string | null;
  identity?: number | null;
}

interface SnapshotInfo {
  weekId: string;
  weekStart: string;
  weekEnd: string;
  totalStructures: number;
  cryoemCount: number;
  xrayCount: number;
  nmrCount: number;
  otherCount: number;
}

interface LiteratureSectionProps {
  entries?: PdbEntry[];
  pdbStructures?: (PdbInfo & { _sourceUniport?: string; _sharedCount?: number })[];
  blastResults?: (PdbInfo & { identity?: number | null; _sourceUniport?: string; _sharedCount?: number })[];
  onSelectPdb: (pdbId: string) => void;
  /** Whether this is rendered in full-width mode (main view) vs sidebar */
  fullWidth?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Callback to trigger parent data refetch after PubMed metadata is fetched */
  onRefetch?: () => void;
  /** Weekly snapshots for folder grouping */
  snapshots?: SnapshotInfo[];
  /** Currently selected week ID */
  selectedWeekId?: string | null;
  /** Callback when user selects a week folder from dashboard */
  onSelectWeek?: (weekId: string) => void;
}

interface LitGroup {
  pubmedId: string;
  title: string;
  authors: string | null;
  journal: string | null;
  journalIf: number | null;
  abstract: string | null;
  pdbs: { pdbId: string; method: string | null; isBlast?: boolean; identity?: number | null; _sourceUniports?: string[]; title?: string | null; resolution?: number | null }[];
  _sharedCount: number;
  /** Whether this group has real PubMed metadata or is using fallback data */
  hasRealMetadata: boolean;
}

interface EntryGroup {
  journal: string | null;
  journalIf: number | null;
  entries: { pdbId: string; method: string | null; releaseDate: string | null; title?: string | null; journalIf?: number | null }[];
  _count: number;
}

type SortMode = 'if' | 'structures' | 'journal';

/** Format authors string: "Smith,A.B.; Johnson,C.D.; ..." → "Smith, Johnson et al." */
function formatAuthors(authors: string | null, maxNames: number = 3): string | null {
  if (!authors) return null;
  // Split by semicolon
  const parts = authors.split(';').map(a => a.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  // Extract last names
  const names = parts.map(p => {
    const firstComma = p.indexOf(',');
    return firstComma > 0 ? p.substring(0, firstComma).trim() : p.split(' ')[0].trim();
  });
  if (names.length <= maxNames) return names.join(', ');
  return `${names.slice(0, maxNames).join(', ')} et al.`;
}

/** Get author initials for avatar: "Smith J" → "SJ" */
function getAuthorInitials(authors: string | null): string {
  if (!authors) return '?';
  const parts = authors.split(';').map(a => a.trim()).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0];
  const firstComma = first.indexOf(',');
  const lastName = firstComma > 0 ? first.substring(0, firstComma).trim() : first.split(' ')[0].trim();
  if (parts.length > 1) {
    const second = parts[1];
    const secComma = second.indexOf(',');
    const secondName = secComma > 0 ? second.substring(0, secComma).trim() : second.split(' ')[0].trim();
    return `${lastName.charAt(0)}${secondName.charAt(0)}`.toUpperCase();
  }
  return lastName.substring(0, 2).toUpperCase();
}

/** Get IF tier info */
function getIfTier(value: number): { label: string; color: string; dotColor: string; borderColor: string } {
  if (value >= 20) return { label: 'Top', color: 'text-red-600 dark:text-red-400', dotColor: 'bg-red-500', borderColor: 'border-l-red-400 dark:border-l-red-500' };
  if (value >= 10) return { label: 'High', color: 'text-amber-600 dark:text-amber-400', dotColor: 'bg-amber-500', borderColor: 'border-l-amber-400 dark:border-l-amber-500' };
  if (value >= 5) return { label: 'Mid', color: 'text-emerald-600 dark:text-emerald-400', dotColor: 'bg-emerald-500', borderColor: 'border-l-emerald-400 dark:border-l-emerald-500' };
  return { label: 'Low', color: 'text-gray-500 dark:text-gray-400', dotColor: 'bg-gray-400', borderColor: 'border-l-gray-300 dark:border-l-gray-600' };
}

/** Get method color info */
function getMethodInfo(method: string): { label: string; color: string; bgColor: string } {
  if (method.includes('Cryo')) return { label: 'Cryo-EM', color: 'text-teal-600 dark:text-teal-400', bgColor: 'bg-teal-50 dark:bg-teal-900/20' };
  if (method.includes('X-RAY') || method.includes('XRAY')) return { label: 'X-ray', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/20' };
  if (method.includes('NMR')) return { label: 'NMR', color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-900/20' };
  return { label: method, color: 'text-gray-500 dark:text-gray-400', bgColor: 'bg-gray-50 dark:bg-gray-800/40' };
}

export function LiteratureSection({ entries, pdbStructures, blastResults, onSelectPdb, fullWidth = false, loading = false, onRefetch, snapshots, selectedWeekId, onSelectWeek }: LiteratureSectionProps) {
  const [sortMode, setSortMode] = useState<SortMode>('if');
  const [sortDesc, setSortDesc] = useState(true);
  const [selectedLit, setSelectedLit] = useState<LitGroup | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [fetchingPubmed, setFetchingPubmed] = useState(false);
  // 'dashboard' shows overview + folder list; 'list' shows paper cards
  const [litView, setLitView] = useState<'dashboard' | 'list'>('dashboard');

  // Normal literature groups with pubmedId
  const litGroups: LitGroup[] = useMemo(() => {
    const map = new Map<string, LitGroup>();

    if (entries) {
      for (const e of entries) {
        if (!e.pubmedId) continue;
        let g = map.get(e.pubmedId);
        const hasRealMeta = !!(e as any).pubmedTitle;
        if (!g) {
          g = {
            pubmedId: e.pubmedId,
            title: (e as any).pubmedTitle || e.title || 'No title',
            authors: (e as any).pubmedAuthors || e.authors || null,
            journal: e.journal || null,
            journalIf: e.journalIf ?? null,
            abstract: (e as any).pubmedAbstract || null,
            pdbs: [],
            _sharedCount: 0,
            hasRealMetadata: hasRealMeta,
          };
          map.set(e.pubmedId, g);
        }
        if (hasRealMeta && !g.hasRealMetadata) {
          g.hasRealMetadata = true;
          if ((e as any).pubmedTitle) g.title = (e as any).pubmedTitle;
          if ((e as any).pubmedAuthors) g.authors = (e as any).pubmedAuthors;
          if ((e as any).pubmedAbstract) g.abstract = (e as any).pubmedAbstract;
        }
        // Use entry's authors if group doesn't have them
        if (!g.authors && e.authors) g.authors = e.authors;

        const existingPdb = g.pdbs.find(p => p.pdbId === e.pdbId);
        if (!existingPdb) {
          g.pdbs.push({ pdbId: e.pdbId, method: e.method ?? null, _sourceUniports: (e as any)._sourceUniport ? [(e as any)._sourceUniport] : [], title: e.title ?? null, resolution: e.resolution ?? null });
        }
        g._sharedCount++;
      }
    }

    if (pdbStructures) {
      for (const s of pdbStructures) {
        if (!s.pubmedId) continue;
        let g = map.get(s.pubmedId);
        const hasRealMeta = !!s.pubmedTitle;
        if (!g) {
          g = {
            pubmedId: s.pubmedId,
            title: s.pubmedTitle || s.title || 'No title',
            authors: s.pubmedAuthors || null,
            journal: s.journal || null,
            journalIf: s.journalIf,
            abstract: s.pubmedAbstract || null,
            pdbs: [],
            _sharedCount: 0,
            hasRealMetadata: hasRealMeta,
          };
          map.set(s.pubmedId, g);
        }
        if (hasRealMeta && !g.hasRealMetadata) {
          g.hasRealMetadata = true;
          if (s.pubmedTitle) g.title = s.pubmedTitle;
          if (s.pubmedAuthors) g.authors = s.pubmedAuthors;
          if (s.pubmedAbstract) g.abstract = s.pubmedAbstract;
        }
        const existingPdb = g.pdbs.find(p => p.pdbId === s.pdbId);
        if (!existingPdb) {
          g.pdbs.push({ pdbId: s.pdbId, method: null, isBlast: false, _sourceUniports: s._sourceUniport ? [s._sourceUniport] : [], title: s.title ?? null, resolution: null });
        }
        g._sharedCount++;
      }
    }

    if (blastResults) {
      for (const b of blastResults) {
        if (!b.pubmedId) continue;
        let g = map.get(b.pubmedId);
        const hasRealMeta = !!b.pubmedTitle;
        if (!g) {
          g = {
            pubmedId: b.pubmedId,
            title: b.pubmedTitle || b.title || 'No title',
            authors: b.pubmedAuthors || null,
            journal: b.journal || null,
            journalIf: b.journalIf,
            abstract: b.pubmedAbstract || null,
            pdbs: [],
            _sharedCount: 0,
            hasRealMetadata: hasRealMeta,
          };
          map.set(b.pubmedId, g);
        }
        if (hasRealMeta && !g.hasRealMetadata) {
          g.hasRealMetadata = true;
          if (b.pubmedTitle) g.title = b.pubmedTitle;
          if (b.pubmedAuthors) g.authors = b.pubmedAuthors;
          if (b.pubmedAbstract) g.abstract = b.pubmedAbstract;
        }
        const existingPdb = g.pdbs.find(p => p.pdbId === b.pdbId);
        if (!existingPdb) {
          g.pdbs.push({ pdbId: b.pdbId, method: null, isBlast: true, identity: b.identity ?? null, _sourceUniports: b._sourceUniport ? [b._sourceUniport] : [], title: b.title ?? null, resolution: null });
        }
        g._sharedCount++;
      }
    }

    return Array.from(map.values());
  }, [entries, pdbStructures, blastResults]);

  // Fallback groups when no pubmedId exists
  const entryGroups: EntryGroup[] = useMemo(() => {
    if (litGroups.length > 0) return [];
    if (!entries && !pdbStructures) return [];

    const map = new Map<string, EntryGroup>();
    const items = entries ? entries.map(e => ({ pdbId: e.pdbId, method: e.method ?? null, releaseDate: e.releaseDate ?? null, journal: e.journal ?? null, journalIf: e.journalIf ?? null, title: e.title ?? null })) : [];

    for (const item of items) {
      const key = item.journal || 'Unknown Journal';
      let g = map.get(key);
      if (!g) {
        g = { journal: item.journal, journalIf: item.journalIf, entries: [], _count: 0 };
        map.set(key, g);
      }
      g.entries.push({ pdbId: item.pdbId, method: item.method, releaseDate: item.releaseDate, title: item.title, journalIf: item.journalIf });
      g._count++;
    }

    return Array.from(map.values());
  }, [entries, pdbStructures, litGroups]);

  // Filter by search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return litGroups;
    const q = searchQuery.toLowerCase().trim();
    return litGroups.filter(g =>
      g.title.toLowerCase().includes(q) ||
      (g.authors && g.authors.toLowerCase().includes(q)) ||
      (g.journal && g.journal.toLowerCase().includes(q)) ||
      g.pdbs.some(p => p.pdbId.toLowerCase().includes(q)) ||
      g.pubmedId.includes(q)
    );
  }, [litGroups, searchQuery]);

  const sortedGroups = useMemo(() => {
    const sorted = [...filteredGroups];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortMode) {
        case 'if':
          cmp = (b.journalIf ?? 0) - (a.journalIf ?? 0);
          break;
        case 'structures':
          cmp = b.pdbs.length - a.pdbs.length;
          break;
        case 'journal':
          cmp = (b.journal || '').localeCompare(a.journal || '');
          break;
      }
      return sortDesc ? cmp : -cmp;
    });
    return sorted;
  }, [filteredGroups, sortMode, sortDesc]);

  const sortedEntryGroups = useMemo(
    () => [...entryGroups].sort((a, b) => {
      const aIf = a.journalIf ?? 0;
      const bIf = b.journalIf ?? 0;
      return sortDesc ? bIf - aIf : aIf - bIf;
    }),
    [entryGroups, sortDesc]
  );

  // Summary stats
  const totalPapers = litGroups.length || entryGroups.length;
  const totalStructures = litGroups.reduce((sum, g) => sum + g.pdbs.length, 0) || entryGroups.reduce((sum, g) => sum + g._count, 0);
  const avgIf = litGroups.length > 0 ? litGroups.reduce((sum, g) => sum + (g.journalIf ?? 0), 0) / litGroups.length : null;
  const highIfCount = litGroups.filter(g => (g.journalIf ?? 0) >= 10).length;
  const missingMetadataCount = litGroups.filter(g => !g.hasRealMetadata).length;

  // Fetch PubMed metadata
  const handleFetchPubmed = useCallback(async () => {
    const idsToFetch = litGroups
      .filter(g => !g.hasRealMetadata)
      .map(g => g.pubmedId);
    if (idsToFetch.length === 0) return;

    setFetchingPubmed(true);
    try {
      const res = await fetch('/api/pubmed-fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pubmedIds: idsToFetch }),
      });
      const data = await res.json();
      if (data.error) {
        console.error('PubMed fetch error:', data.error);
        return;
      }
      // Trigger parent refetch to pick up cached metadata
      onRefetch?.();
    } catch (err) {
      console.error('Failed to fetch PubMed metadata:', err);
    } finally {
      setFetchingPubmed(false);
    }
  }, [litGroups, onRefetch]);

  // Detail Modal - enhanced with citation-style layout
  const DetailModal = selectedLit ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-[2px]" onClick={() => setSelectedLit(null)} />
      <div
        className="relative z-10 w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col bg-white dark:bg-[#1c1a18] rounded-2xl shadow-2xl border border-claude-border/60 dark:border-[#3d3832]/60 lit-detail-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient accent */}
        <div className="flex-shrink-0 border-b border-claude-border dark:border-[#3d3832]">
          {selectedLit.journalIf != null && (
            <div className={`h-1 rounded-t-2xl ${selectedLit.journalIf >= 20 ? 'bg-gradient-to-r from-red-400 to-orange-400' : selectedLit.journalIf >= 10 ? 'bg-gradient-to-r from-amber-400 to-yellow-400' : selectedLit.journalIf >= 5 ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : 'bg-gradient-to-r from-gray-300 to-gray-400'}`} />
          )}
          <div className="flex items-start justify-between gap-3 px-5 py-4">
            <div className="flex-1 min-w-0">
              {/* Authors - prominent display with avatar */}
              {selectedLit.authors && (
                <div className="flex items-center gap-2.5 mb-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ${
                    selectedLit.journalIf != null && selectedLit.journalIf >= 20 ? 'bg-red-500' :
                    selectedLit.journalIf != null && selectedLit.journalIf >= 10 ? 'bg-amber-500' :
                    'bg-gradient-to-br from-slate-400 to-slate-600'
                  }`}>
                    {getAuthorInitials(selectedLit.authors)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-claude-text-secondary leading-snug truncate">
                      {formatAuthors(selectedLit.authors, 5)}
                    </p>
                  </div>
                </div>
              )}
              <h2 className="text-sm font-semibold text-claude-text leading-snug">{selectedLit.title || 'Untitled'}</h2>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {selectedLit.journal && (
                  <span className="text-[11px] text-claude-text-muted italic flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {selectedLit.journal}
                  </span>
                )}
                {selectedLit.journalIf != null && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                    selectedLit.journalIf >= 20 ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200/60 dark:border-red-800/40' :
                    selectedLit.journalIf >= 10 ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/40' :
                    'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/40'
                  }`}>
                    IF {selectedLit.journalIf.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
            <button onClick={() => setSelectedLit(null)} className="flex-shrink-0 p-1.5 rounded-lg hover:bg-claude-border-light dark:hover:bg-[#3d3832] text-claude-text-muted hover:text-claude-text transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar">
          {/* Abstract section */}
          {selectedLit.abstract ? (
            <div className="px-5 py-4 border-b border-claude-border/50 dark:border-[#3d3832]/50">
              <div className="flex items-center gap-1.5 mb-2">
                <Quote className="h-3 w-3 text-claude-accent/40" />
                <p className="text-[10px] font-medium text-claude-text-muted uppercase tracking-wide">Abstract</p>
              </div>
              <p className="text-[11.5px] text-claude-text/90 leading-[1.65]">{selectedLit.abstract}</p>
            </div>
          ) : !selectedLit.hasRealMetadata ? (
            <div className="px-5 py-3 border-b border-claude-border/50 dark:border-[#3d3832]/50">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/30">
                <CloudDownload className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10.5px] text-amber-700 dark:text-amber-300 leading-relaxed">
                    PubMed metadata not yet fetched. Use the &quot;Fetch Metadata&quot; button above to load the title, abstract, and authors.
                  </p>
                </div>
                {!fetchingPubmed && (
                  <button
                    onClick={() => { setSelectedLit(null); handleFetchPubmed(); }}
                    className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
                  >
                    <CloudDownload className="h-3 w-3" />
                    Fetch
                  </button>
                )}
              </div>
            </div>
          ) : null}

          {/* Associated PDB Structures */}
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-medium text-claude-text-muted uppercase tracking-wide flex items-center gap-1.5">
                <Database className="h-3 w-3" />
                Associated Structures ({selectedLit.pdbs.length})
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {selectedLit.pdbs.map((p) => {
                const methodInfo = p.method ? getMethodInfo(p.method) : null;
                return (
                  <button
                    key={`${p.pdbId}-${p.isBlast ? 'b' : 's'}`}
                    onClick={() => onSelectPdb(p.pdbId)}
                    className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-claude-surface/80 dark:bg-[#2b2926]/80 border border-claude-border/40 dark:border-[#3d3832]/40 hover:border-claude-accent/50 hover:bg-claude-accent/5 transition-all group"
                  >
                    <span className="font-mono text-[11px] font-bold text-claude-accent group-hover:text-claude-accent-hover">{p.pdbId}</span>
                    {methodInfo && (
                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-semibold ${methodInfo.bgColor} ${methodInfo.color}`}>
                        {methodInfo.label === 'Cryo-EM' ? 'EM' : methodInfo.label}
                      </span>
                    )}
                    {p.isBlast && <span className="text-[8px] px-1 py-0.5 rounded bg-claude-accent-light dark:bg-[#3d2a22] text-claude-accent font-semibold border border-claude-accent/20">Homolog</span>}
                    {p.resolution != null && (
                      <span className="text-[9px] text-claude-text-muted ml-auto">{p.resolution.toFixed(2)}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 bg-claude-bg/80 dark:bg-[#1a1917]/80 border-t border-claude-border/50 dark:border-[#3d3832]/50 flex-shrink-0 rounded-b-2xl">
          <a href={`https://pubmed.gov/${selectedLit.pubmedId}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[11px] text-claude-accent hover:text-claude-accent-hover font-medium transition-colors">
            <ExternalLink className="h-3.5 w-3.5" />View on PubMed
          </a>
          <span className="text-[10px] text-claude-text-muted font-mono">PMID: {selectedLit.pubmedId}</span>
        </div>
      </div>
    </div>
  ) : null;

  // Loading state
  if (loading) {
    return (
      <div className={fullWidth ? 'p-5 space-y-2.5' : 'px-3 space-y-2'}>
        {fullWidth && (
          <div className="flex items-center gap-4 mb-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-16" />
          </div>
        )}
        {Array.from({ length: fullWidth ? 6 : 4 }).map((_, i) => (
          <div key={i} className="p-3 rounded-xl bg-claude-bg/50 dark:bg-[#1a1917]/50 border border-claude-border/30">
            <div className="flex items-start gap-2.5 mb-2">
              <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <Skeleton className="h-3.5 w-full mb-1.5" />
                <Skeleton className="h-3 w-3/4" />
              </div>
              <Skeleton className="h-4 w-12 rounded flex-shrink-0" />
            </div>
            <div className="flex gap-1 ml-[42px]">
              <Skeleton className="h-5 w-14 rounded-md" />
              <Skeleton className="h-5 w-14 rounded-md" />
              <Skeleton className="h-5 w-14 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ─── Summary Header ─────────────────────────────────────────────────────
  const SummaryHeader = (
    <div className={`flex items-center gap-2 ${fullWidth ? 'mb-4 px-1' : 'px-1 mb-2'}`}>
      <div className={`flex items-center gap-2.5 ${fullWidth ? 'flex-1' : ''}`}>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-claude-accent/5 dark:bg-claude-accent/10 border border-claude-accent/15">
          <BookOpen className={`text-claude-accent flex-shrink-0 ${fullWidth ? 'h-4 w-4' : 'h-3.5 w-3.5'}`} />
          <span className={`${fullWidth ? 'text-xs' : 'text-[10px]'} text-claude-text-secondary font-semibold`}>
            {totalPapers} paper{totalPapers !== 1 ? 's' : ''}
          </span>
        </div>
        <span className={`${fullWidth ? 'text-[11px]' : 'text-[10px]'} text-claude-text-muted font-medium`}>
          <span className="text-claude-accent font-bold">{totalStructures}</span> structure{totalStructures !== 1 ? 's' : ''}
        </span>
        {avgIf != null && avgIf > 0 && (
          <span className={`${fullWidth ? 'text-[10px]' : 'text-[9px]'} text-claude-text-muted hidden sm:inline`}>
            Avg IF <span className="font-semibold text-claude-text-secondary">{avgIf.toFixed(1)}</span>
          </span>
        )}
        {highIfCount > 0 && (
          <span className={`${fullWidth ? 'text-[10px]' : 'text-[9px]'} px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/30 font-semibold hidden sm:inline-flex items-center`}>
            {highIfCount} high-IF
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {missingMetadataCount > 0 && (
          <button
            onClick={handleFetchPubmed}
            disabled={fetchingPubmed}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
              fetchingPubmed
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-500 cursor-wait'
                : 'bg-claude-accent/8 dark:bg-claude-accent/15 text-claude-accent hover:bg-claude-accent/15 dark:hover:bg-claude-accent/25 border border-claude-accent/15 hover:border-claude-accent/30'
            }`}
          >
            {fetchingPubmed ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin" />
                Fetching…
              </>
            ) : (
              <>
                <CloudDownload className="h-3 w-3" />
                Fetch Metadata
                <span className={`text-[8px] px-1.5 py-0 rounded-full ${
                  'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                }`}>
                  {missingMetadataCount}
                </span>
              </>
            )}
          </button>
        )}
        {fullWidth && (
          <button
            onClick={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery(''); }}
            className={`p-1.5 rounded-md transition-colors ${showSearch ? 'bg-claude-accent-light dark:bg-[#3d2a22] text-claude-accent' : 'text-claude-text-muted hover:text-claude-text-secondary hover:bg-claude-border-light/50 dark:hover:bg-[#3d3832]/50'}`}
          >
            {showSearch ? <X className="h-3.5 w-3.5" /> : <Search className="h-3.5 w-3.5" />}
          </button>
        )}
        <div className="flex items-center bg-claude-bg/50 dark:bg-[#1a1917]/50 rounded-lg border border-claude-border/30 dark:border-[#3d3832]/30 p-0.5">
          {([
            { mode: 'if' as SortMode, label: 'IF' },
            { mode: 'structures' as SortMode, label: 'PDBs' },
            { mode: 'journal' as SortMode, label: 'Journal' },
          ]).map(opt => (
            <button
              key={opt.mode}
              onClick={() => {
                if (sortMode === opt.mode) {
                  setSortDesc(!sortDesc);
                } else {
                  setSortMode(opt.mode);
                  setSortDesc(true);
                }
              }}
              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[9px] font-semibold transition-all ${
                sortMode === opt.mode
                  ? 'bg-white dark:bg-[#2b2926] text-claude-accent shadow-sm'
                  : 'text-claude-text-muted hover:text-claude-text-secondary'
              }`}
            >
              {opt.label}
              {sortMode === opt.mode && (
                <span className="text-[7px]">{sortDesc ? '↓' : '↑'}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ─── IF Badge Component ──────────────────────────────────────────────────
  function IfBadge({ value }: { value: number }) {
    const tier = getIfTier(value);
    return (
      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border if-badge-shimmer ${tier.color} ${
        value >= 20 ? 'bg-red-50 dark:bg-red-900/20 border-red-200/60 dark:border-red-800/40' :
        value >= 10 ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200/60 dark:border-amber-800/40' :
        value >= 5 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200/60 dark:border-emerald-800/40' :
        'bg-gray-50 dark:bg-gray-800/40 border-gray-200/60 dark:border-gray-700/40'
      }`}>
        {value.toFixed(1)}
      </span>
    );
  }

  // ─── Compact Literature Card (enhanced) ──────────────────────────────────
  function LitCard({ group, index, fullWidth: fw }: { group: LitGroup; index: number; fullWidth?: boolean }) {
    const displayAuthors = formatAuthors(group.authors, fw ? 3 : 2);
    const authorInitials = getAuthorInitials(group.authors);
    const ifTier = group.journalIf != null ? getIfTier(group.journalIf) : null;

    // Determine dominant method
    const methodCounts: Record<string, number> = {};
    for (const p of group.pdbs) {
      if (p.method) {
        const m = p.method.includes('Cryo') ? 'Cryo-EM' : p.method.includes('X-RAY') || p.method.includes('XRAY') ? 'X-ray' : p.method.includes('NMR') ? 'NMR' : 'Other';
        methodCounts[m] = (methodCounts[m] || 0) + 1;
      }
    }
    const dominantMethod = Object.entries(methodCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const methodInfo = dominantMethod ? getMethodInfo(dominantMethod) : null;

    // Count methods for mixed badge
    const methodTypes = Object.keys(methodCounts);

    return (
      <div
        onClick={() => setSelectedLit(group)}
        className={`${fw ? 'px-3.5 py-3' : 'px-2.5 py-2'} lit-card-enter lit-card-hover rounded-xl bg-white/70 dark:bg-[#1c1a18]/80 border border-claude-border/30 dark:border-[#3d3832]/30 hover:border-claude-accent/40 cursor-pointer transition-all duration-150 ${
          ifTier ? `border-l-[2.5px] ${ifTier.borderColor}` : ''
        }`}
        style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
      >
        {/* Row 1: Author avatar + Title + Badges */}
        <div className="flex items-start gap-2.5">
          {/* Author avatar */}
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 mt-0.5 ${
            ifTier ? (group.journalIf! >= 20 ? 'bg-red-500' : group.journalIf! >= 10 ? 'bg-amber-500' : group.journalIf! >= 5 ? 'bg-emerald-500' : 'bg-gray-400') :
            'bg-gradient-to-br from-slate-400 to-slate-500'
          }`}>
            {authorInitials}
          </div>

          {/* Title + badge area */}
          <div className="flex-1 min-w-0">
            <p className={`${fw ? 'text-[12px]' : 'text-[10.5px]'} font-semibold text-claude-text line-clamp-2 leading-[1.45]`}>
              {group.title}
            </p>
          </div>

          {/* Badges column */}
          <div className="flex items-center gap-1 flex-shrink-0 pt-0.5">
            {methodInfo && (
              <span className={`method-badge-lit ${methodInfo.bgColor} ${methodInfo.color}`}>
                {methodInfo.label === 'Cryo-EM' ? 'EM' : methodInfo.label}
              </span>
            )}
            {group.journalIf != null && (
              <IfBadge value={group.journalIf} />
            )}
          </div>
        </div>

        {/* Row 2: Authors + Journal */}
        <div className={`flex items-center gap-1.5 mt-1.5 ml-[38px]`}>
          {displayAuthors && (
            <span className="text-[9.5px] text-claude-text-muted flex items-center gap-1">
              <User className="h-2.5 w-2.5 opacity-40" />
              <span className="truncate">{displayAuthors}</span>
            </span>
          )}
          {group.journal && (
            <>
              <span className="text-[9px] text-claude-text-muted/30">&middot;</span>
              <span className="text-[9px] text-claude-text-muted/70 italic truncate">{group.journal}</span>
            </>
          )}
        </div>

        {/* Row 3: PDB chips + PubMed link */}
        <div className="flex items-center gap-1 mt-2 ml-[38px] flex-wrap">
          {group.pdbs.slice(0, fw ? 5 : 3).map((p) => {
            const isShared = (p._sourceUniports?.length || 0) > 1;
            const pdbMethod = p.method ? getMethodInfo(p.method) : null;
            return (
              <button
                key={`${p.pdbId}-${p.isBlast ? 'b' : 's'}`}
                onClick={(e) => { e.stopPropagation(); onSelectPdb(p.pdbId); }}
                className={`pdb-chip-hover inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-mono font-semibold bg-claude-surface/80 dark:bg-[#2b2926]/80 border border-claude-border/30 dark:border-[#3d3832]/30 hover:border-claude-accent/50 hover:bg-claude-accent/5 transition-colors ${
                  isShared ? 'text-amber-600 dark:text-amber-400 border-amber-300/40 dark:border-amber-700/40' : 'text-claude-accent'
                }`}
              >
                {p.pdbId}
                {p.isBlast && <span className="text-[7px] px-0.5 rounded bg-claude-accent-light dark:bg-[#3d2a22] text-claude-accent ml-0.5 font-bold">H</span>}
              </button>
            );
          })}
          {group.pdbs.length > (fw ? 5 : 3) && (
            <span className="text-[8px] text-claude-text-muted/50 font-medium px-1">+{group.pdbs.length - (fw ? 5 : 3)}</span>
          )}
          <a
            href={`https://pubmed.gov/${group.pubmedId}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-0.5 text-[8px] text-claude-accent/50 hover:text-claude-accent transition-colors ml-auto flex-shrink-0"
          >
            <ExternalLink className="h-2.5 w-2.5" />
            PubMed
          </a>
        </div>
      </div>
    );
  }

  // ─── Journal Group Card (fallback when no pubmedIds) ─────────────────────
  function JournalCard({ group, fullWidth: fw }: { group: EntryGroup; fullWidth?: boolean }) {
    return (
      <div className={`${fw ? 'px-3.5 py-3' : 'px-2.5 py-2'} rounded-xl bg-white/70 dark:bg-[#1c1a18]/80 border border-claude-border/30 dark:border-[#3d3832]/30 hover:border-claude-accent/30 transition-all duration-150`}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className={`${fw ? 'text-xs' : 'text-[10px]'} font-semibold text-claude-text truncate flex items-center gap-1.5`}>
            <FileText className="h-3 w-3 text-claude-accent/40" />
            {group.journal || 'Unknown Journal'}
          </p>
          {group.journalIf != null && (
            <IfBadge value={group.journalIf} />
          )}
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {group.entries.slice(0, fw ? 10 : 6).map((e) => (
            <button
              key={e.pdbId}
              onClick={() => onSelectPdb(e.pdbId)}
              className="pdb-chip-hover inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-mono font-semibold text-claude-accent bg-claude-surface/80 dark:bg-[#2b2926]/80 border border-claude-border/30 dark:border-[#3d3832]/30 hover:border-claude-accent/50 transition-colors"
            >
              {e.pdbId}
            </button>
          ))}
          {group.entries.length > (fw ? 10 : 6) && (
            <span className="text-[8px] text-claude-text-muted/50 font-medium">+{group.entries.length - (fw ? 10 : 6)}</span>
          )}
          <span className="text-[8px] text-claude-text-muted/50 ml-auto font-medium">{group._count} structures</span>
        </div>
      </div>
    );
  }

  // ─── Search bar (fullWidth only) ────────────────────────────────────────
  const SearchBar = fullWidth && showSearch ? (
    <div className="mb-3 px-1">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-claude-text-muted/50" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search papers by title, author, journal, or PDB ID..."
          className="w-full pl-8 pr-8 py-2 text-[11px] rounded-lg bg-white dark:bg-[#1c1a18] border border-claude-border/40 dark:border-[#3d3832]/40 text-claude-text placeholder:text-claude-text-muted/40 focus:outline-none focus:ring-2 focus:ring-claude-accent/20 focus:border-claude-accent/40 transition-all"
          autoFocus
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-claude-border-light dark:hover:bg-[#3d3832] text-claude-text-muted/50 hover:text-claude-text-muted transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      {searchQuery && (
        <p className="text-[9px] text-claude-text-muted mt-1.5 px-1">
          {sortedGroups.length} result{sortedGroups.length !== 1 ? 's' : ''} found
        </p>
      )}
    </div>
  ) : null;
  // ─── Compute per-week literature stats for dashboard ─────────────────────
  const weekFolderData = useMemo(() => {
    if (!entries || !snapshots || snapshots.length === 0) return [];
    // Group entries by week
    const weekEntries = new Map<string, PdbEntry[]>();
    for (const e of entries) {
      // Entries might not have weekId directly; use releaseDate to match
      // But they come filtered by selectedWeekId already in weekly mode
      // For dashboard we need ALL entries across all weeks, so we should
      // group by matching entry releaseDate to snapshot week ranges
      const eDate = e.releaseDate ? new Date(e.releaseDate) : null;
      let matchedWeek: string | null = null;
      if (eDate && snapshots) {
        for (const s of snapshots) {
          const start = new Date(s.weekStart);
          const end = new Date(s.weekEnd);
          if (eDate >= start && eDate <= end) {
            matchedWeek = s.weekId;
            break;
          }
        }
      }
      if (matchedWeek) {
        if (!weekEntries.has(matchedWeek)) weekEntries.set(matchedWeek, []);
        weekEntries.get(matchedWeek)!.push(e);
      }
    }
    // Build folder data from snapshots
    return snapshots
      .map(snap => {
        const weekE = weekEntries.get(snap.weekId) || [];
        const papersWithPmid = new Set<string>();
        let cryoemCount = 0;
        let xrayCount = 0;
        let nmrCount = 0;
        let maxIf = 0;
        const journalSet = new Set<string>();
        for (const e of weekE) {
          if (e.pubmedId) papersWithPmid.add(e.pubmedId);
          if (e.method?.includes('Cryo')) cryoemCount++;
          else if (e.method?.includes('X-RAY') || e.method?.includes('XRAY')) xrayCount++;
          else if (e.method?.includes('NMR')) nmrCount++;
          if (e.journalIf && e.journalIf > maxIf) maxIf = e.journalIf;
          if (e.journal) journalSet.add(e.journal);
        }
        // Format date range
        const startDate = new Date(snap.weekStart);
        const endDate = new Date(snap.weekEnd);
        const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const dateLabel = `${fmt(startDate)} — ${fmt(endDate)}`;
        return {
          weekId: snap.weekId,
          dateLabel,
          totalEntries: weekE.length,
          paperCount: papersWithPmid.size,
          cryoemCount,
          xrayCount,
          nmrCount,
          maxIf,
          journalCount: journalSet.size,
        };
      })
      .filter(w => w.totalEntries > 0)
      .sort((a, b) => b.weekId.localeCompare(a.weekId)); // newest first
  }, [entries, snapshots]);

  // ─── Dashboard Overview Stats ──────────────────────────────────────────
  const dashboardStats = useMemo(() => {
    const totalPapersAll = litGroups.length;
    const totalStructuresAll = entries?.length || 0;
    const totalHighIf = litGroups.filter(g => (g.journalIf ?? 0) >= 10).length;
    const totalMissing = litGroups.filter(g => !g.hasRealMetadata).length;
    const avgIfVal = litGroups.length > 0 ? litGroups.reduce((s, g) => s + (g.journalIf ?? 0), 0) / litGroups.length : 0;
    return { totalPapersAll, totalStructuresAll, totalHighIf, totalMissing, avgIfVal };
  }, [litGroups, entries]);

  // ─── Dashboard View Component ──────────────────────────────────────────
  const DashboardView = fullWidth && litView === 'dashboard' ? (
    <div className="p-5">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-claude-accent/20 to-claude-accent/5 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-claude-accent" />
          </div>
          <div>
            <h2 className="text-base font-bold text-claude-text">Paper Dashboard</h2>
            <p className="text-[11px] text-claude-text-muted">Browse papers organized by weekly releases</p>
          </div>
        </div>
        {dashboardStats.totalMissing > 0 && (
          <button
            onClick={handleFetchPubmed}
            disabled={fetchingPubmed}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-claude-accent/8 dark:bg-claude-accent/15 text-claude-accent hover:bg-claude-accent/15 dark:hover:bg-claude-accent/25 border border-claude-accent/15 hover:border-claude-accent/30 transition-all"
          >
            {fetchingPubmed ? <RefreshCw className="h-3 w-3 animate-spin" /> : <CloudDownload className="h-3 w-3" />}
            Fetch Metadata ({dashboardStats.totalMissing})
          </button>
        )}
      </div>

      {/* Overview Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Papers', value: dashboardStats.totalPapersAll, icon: BookOpen, color: 'text-teal-600 dark:text-teal-400', bg: 'from-teal-500/5 to-transparent' },
          { label: 'Structures', value: dashboardStats.totalStructuresAll, icon: Database, color: 'text-blue-600 dark:text-blue-400', bg: 'from-blue-500/5 to-transparent' },
          { label: 'High-IF (≥10)', value: dashboardStats.totalHighIf, icon: TrendingUp, color: 'text-amber-600 dark:text-amber-400', bg: 'from-amber-500/5 to-transparent' },
          { label: 'Avg IF', value: dashboardStats.avgIfVal > 0 ? dashboardStats.avgIfVal.toFixed(1) : '—', icon: BarChart3, color: 'text-purple-600 dark:text-purple-400', bg: 'from-purple-500/5 to-transparent' },
        ].map(stat => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className={`relative rounded-xl border border-claude-border/30 dark:border-[#3d3832]/30 bg-gradient-to-br ${stat.bg} p-3.5 hover:shadow-md hover:border-claude-accent/20 transition-all cursor-default`}
          >
            <div className="flex items-center justify-between mb-2">
              <stat.icon className={`h-4 w-4 ${stat.color} opacity-60`} />
            </div>
            <p className="text-xl font-bold text-claude-text">{stat.value}</p>
            <p className="text-[10px] text-claude-text-muted mt-0.5">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Weekly Folders */}
      <div className="mb-3 flex items-center gap-2">
        <Folder className="h-4 w-4 text-claude-accent/60" />
        <h3 className="text-xs font-semibold text-claude-text-secondary uppercase tracking-wider">Folders by Date</h3>
        <span className="text-[10px] text-claude-text-muted/60 ml-auto">{weekFolderData.length} weeks</span>
      </div>

      {weekFolderData.length === 0 ? (
        <div className="text-center py-12 text-claude-text-muted">
          <FolderOpen className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">No weekly data available</p>
          <p className="text-[11px] mt-1 text-claude-text-muted/60">Select a week to view associated papers</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {weekFolderData.map((week, idx) => (
            <motion.div
              key={week.weekId}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(idx, 8) * 30 }}
              onClick={() => {
                onSelectWeek?.(week.weekId);
                setLitView('list');
              }}
              className={`group relative rounded-xl border cursor-pointer transition-all duration-150 p-4 hover:shadow-lg ${
                selectedWeekId === week.weekId
                  ? 'border-claude-accent/50 bg-claude-accent/5 dark:bg-claude-accent/10 ring-1 ring-claude-accent/20'
                  : 'border-claude-border/30 dark:border-[#3d3832]/30 bg-white/70 dark:bg-[#1c1a18]/60 hover:border-claude-accent/30'
              }`}
            >
              {/* Folder header */}
              <div className="flex items-start justify-between mb-2.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Folder className={`h-4 w-4 flex-shrink-0 ${selectedWeekId === week.weekId ? 'text-claude-accent' : 'text-claude-text-muted/40 group-hover:text-claude-accent/60'} transition-colors`} />
                    <span className="text-sm font-bold text-claude-text">{week.weekId}</span>
                  </div>
                  <p className="text-[10px] text-claude-text-muted pl-6">{week.dateLabel}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-claude-text-muted/30 group-hover:text-claude-accent/50 transition-all group-hover:translate-x-0.5 flex-shrink-0 mt-1" />
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-3 text-[10px] pl-6">
                <span className="flex items-center gap-1 text-claude-text-secondary font-semibold">
                  <Hash className="h-2.5 w-2.5 opacity-40" />
                  {week.totalEntries} entries
                </span>
                {week.paperCount > 0 && (
                  <span className="flex items-center gap-1 text-claude-accent font-medium">
                    <FileText className="h-2.5 w-2.5 opacity-50" />
                    {week.paperCount} papers
                  </span>
                )}
              </div>

              {/* Method badges */}
              <div className="flex items-center gap-1.5 mt-2.5 pl-6">
                {week.cryoemCount > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400">
                    EM {week.cryoemCount}
                  </span>
                )}
                {week.xrayCount > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                    XR {week.xrayCount}
                  </span>
                )}
                {week.nmrCount > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
                    NMR {week.nmrCount}
                  </span>
                )}
                {week.maxIf >= 10 && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ml-auto ${
                    week.maxIf >= 20 ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' :
                    'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                  }`}>
                    Top IF {week.maxIf.toFixed(0)}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  ) : null;

  // ─── Back Button for List View ─────────────────────────────────────────
  const BackToDashboard = fullWidth && litView === 'list' ? (
    <button
      onClick={() => setLitView('dashboard')}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-claude-text-secondary hover:text-claude-accent hover:bg-claude-accent/5 border border-claude-border/30 hover:border-claude-accent/20 transition-all mb-3"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Back to Folders
    </button>
  ) : null;

  // ─── Show fallback journal view when no pubmedId data ───────────────────
  if (sortedGroups.length === 0 && sortedEntryGroups.length > 0) {
    return (
      <>
        <div className={fullWidth ? 'p-4' : 'px-3'}>
          {SummaryHeader}
          <div className={`flex-1 min-h-0 overflow-y-auto space-y-1.5 ${fullWidth ? 'max-h-[calc(100vh-260px)]' : ''}`}>
            {sortedEntryGroups.map((group, gi) => (
              <JournalCard key={group.journal || `journal-${gi}`} group={group} fullWidth={fullWidth} />
            ))}
          </div>
        </div>
        {DetailModal}
      </>
    );
  }

  // ─── Empty state ────────────────────────────────────────────────────────
  if (sortedGroups.length === 0 && sortedEntryGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-claude-text-muted">
        <div className="w-16 h-16 rounded-2xl bg-claude-border/20 dark:bg-[#3d3832]/20 flex items-center justify-center mb-4">
          <BookOpen className="h-8 w-8 opacity-20" />
        </div>
        <p className="text-sm font-semibold">No literature data</p>
        <p className="text-[11px] mt-1.5 text-claude-text-muted/60 max-w-[240px] text-center leading-relaxed">
          {entries && entries.length > 0
            ? 'Entries found but no PubMed IDs available for this week'
            : 'Select a week with PDB entries to view associated literature'}
        </p>
      </div>
    );
  }

  // ─── Main literature view ───────────────────────────────────────────────
  return (
    <>
      <AnimatePresence mode="wait">
        {litView === 'dashboard' && fullWidth ? (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {DashboardView}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <div className={fullWidth ? 'p-4 pb-6' : 'px-3'}>
              {BackToDashboard}
              {SummaryHeader}
              {SearchBar}
              {searchQuery && sortedGroups.length === 0 && (
                <div className="flex flex-col items-center py-8 text-claude-text-muted">
                  <Search className="h-8 w-8 mb-2 opacity-20" />
                  <p className="text-xs font-medium">No results found</p>
                  <p className="text-[10px] mt-1 text-claude-text-muted/60">Try a different search term</p>
                </div>
              )}
              <div className={`flex-1 min-h-0 overflow-y-auto thin-scrollbar space-y-2 ${fullWidth ? 'max-h-[calc(100vh-320px)]' : ''}`}>
                {sortedGroups.map((group, i) => (
                  <LitCard key={group.pubmedId} group={group} index={i} fullWidth={fullWidth} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {DetailModal}
    </>
  );
}
