'use client';

import React, { useEffect, useCallback, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database,
  FlaskConical,
  BookOpen,
  Sun,
  Moon,
  BarChart3,
  Search,
  Loader2,
  Microscope,
  Hexagon,
  FileText,
} from 'lucide-react';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import type { PdbEntry, Evaluation, LitPaper } from '@/lib/pdb-types';
import { getMethodLabel } from '@/components/pdb-helpers';

// ─── Search Result Types ──────────────────────────────────────────────────────

interface PdbSearchResult {
  pdbId: string;
  title: string | null;
  method: string | null;
  weekId: string | null;
  resolution: number | null;
}

interface EvalSearchResult {
  uniprotId: string;
  proteinName: string | null;
  geneNames: string | null;
}

interface PaperSearchResult {
  pmid: string;
  title: string;
  journal: string;
}

interface SearchResults {
  entries: PdbSearchResult[];
  evaluations: EvalSearchResult[];
  papers: PaperSearchResult[];
}

// ─── Method Badge for search results ─────────────────────────────────────────

function MethodBadge({ method }: { method: string | null }) {
  const label = method ? getMethodLabel(method) : '';
  if (!label) return null;
  const m = method?.toUpperCase() || '';
  let colorClass = 'text-claude-other bg-claude-other-bg';
  if (m.includes('CRYO') || m.includes('ELECTRON MICROSCOPY')) colorClass = 'text-claude-cryoem bg-claude-cryoem-bg';
  else if (m.includes('X-RAY') || m.includes('XRAY')) colorClass = 'text-claude-xray bg-claude-xray-bg';
  else if (m.includes('NMR')) colorClass = 'text-claude-nmr bg-claude-nmr-bg';

  return (
    <span className={`inline-flex items-center px-1.5 py-0 rounded text-[9px] font-semibold ${colorClass}`}>
      {label}
    </span>
  );
}

// ─── Props ──────────────────────────────────────────────────────────────────────

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwitchMode: (mode: 'weekly' | 'evaluation' | 'literature') => void;
  onToggleTheme: () => void;
  onToggleCharts: () => void;
  currentMode: string;
  isDark: boolean;
  // Search result navigation callbacks
  onSelectPdbEntry?: (entry: PdbSearchResult) => void;
  onSelectEvaluation?: (evalResult: EvalSearchResult) => void;
  onSelectPaper?: (paper: PaperSearchResult) => void;
  // Already-loaded evaluations for client-side search
  evaluations?: Evaluation[];
}

// ─── Debounce Hook ──────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

// ─── Main Component ──────────────────────────────────────────────────────────────

export function CommandPalette({
  open,
  onOpenChange,
  onSwitchMode,
  onToggleTheme,
  onToggleCharts,
  currentMode,
  isDark,
  onSelectPdbEntry,
  onSelectEvaluation,
  onSelectPaper,
  evaluations,
}: CommandPaletteProps) {
  const [searchValue, setSearchValue] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResults>({ entries: [], evaluations: [], papers: [] });
  // Track the query that produced the current results, to derive loading state
  const [searchedQuery, setSearchedQuery] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const debouncedQuery = useDebounce(searchValue, 300);

  // Track whether palette was open to reset state on close
  const [prevOpen, setPrevOpen] = useState(false);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (prevOpen && !open) {
      // Palette just closed - reset search state synchronously during render
      setSearchValue('');
      setSearchResults({ entries: [], evaluations: [], papers: [] });
      setSearchedQuery('');
    }
  }

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        onOpenChange(false);
      }
    },
    [open, onOpenChange],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // ─── Fuzzy Search Logic ───────────────────────────────────────────────────

  const filterEvaluations = useCallback((query: string, evals: Evaluation[]): EvalSearchResult[] => {
    if (!query.trim() || !evals.length) return [];
    const q = query.toLowerCase();
    return evals
      .filter(e =>
        (e.proteinName?.toLowerCase().includes(q)) ||
        (e.uniprotId?.toLowerCase().includes(q)) ||
        (e.geneNames?.toLowerCase().includes(q)) ||
        (e.organism?.toLowerCase().includes(q))
      )
      .slice(0, 5)
      .map(e => ({
        uniprotId: e.uniprotId,
        proteinName: e.proteinName,
        geneNames: e.geneNames,
      }));
  }, []);

  // Fetch search results when debounced query changes
  useEffect(() => {
    if (!open || !debouncedQuery.trim()) {
      return;
    }

    const query = debouncedQuery.trim();

    // Cancel previous request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    async function fetchResults() {
      try {
        // Fetch PDB entries and papers in parallel
        const [entriesRes, papersRes] = await Promise.all([
          fetch(`/api/entries?q=${encodeURIComponent(query)}&limit=5`, { signal: controller.signal }),
          fetch(`/api/literature/papers?q=${encodeURIComponent(query)}`, { signal: controller.signal }),
        ]);

        let entries: PdbSearchResult[] = [];
        let papers: PaperSearchResult[] = [];

        if (entriesRes.ok) {
          const data: PdbEntry[] = await entriesRes.json();
          entries = data.slice(0, 5).map(e => ({
            pdbId: e.pdbId,
            title: e.title,
            method: e.method,
            weekId: e.weekId,
            resolution: e.resolution,
          }));
        }

        if (papersRes.ok) {
          const data: LitPaper[] = await papersRes.json();
          papers = data.slice(0, 5).map(p => ({
            pmid: p.pmid,
            title: p.title,
            journal: p.journal,
          }));
        }

        // Filter evaluations client-side
        const evalResults = filterEvaluations(query, evaluations || []);

        if (!controller.signal.aborted) {
          setSearchResults({ entries, evaluations: evalResults, papers });
          setSearchedQuery(query);
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.error('Search error:', err);
        }
      }
    }

    fetchResults();

    return () => {
      controller.abort();
    };
  }, [debouncedQuery, open, evaluations, filterEvaluations]);

  // Derive whether we're actively searching (query changed but results haven't arrived yet)
  const isSearching = debouncedQuery.trim().length > 0 && searchedQuery !== debouncedQuery.trim();
  const hasResults = searchResults.entries.length > 0 || searchResults.evaluations.length > 0 || searchResults.papers.length > 0;
  const showSearchResults = debouncedQuery.trim().length > 0;

  const handleSelect = useCallback(
    (callback: () => void) => {
      onOpenChange(false);
      callback();
    },
    [onOpenChange],
  );

  // Truncate helper
  const truncate = (str: string, max: number) => str.length > max ? str.slice(0, max) + '…' : str;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />

          {/* Command Palette Panel */}
          <div className="fixed inset-x-0 top-0 z-50 flex justify-center pt-[15vh]">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="w-full max-w-lg"
            >
              <Command
                className="rounded-xl border border-claude-border dark:border-[#3d3832] bg-claude-surface dark:bg-[#242220] shadow-2xl shadow-black/20 dark:shadow-black/40"
                loop
              >
                {/* Search Input */}
                <div className="flex items-center border-b border-claude-border dark:border-[#3d3832] px-3">
                  <Search className="h-4 w-4 shrink-0 text-claude-text-muted" />
                  <CommandInput
                    placeholder="Search PDB structures, evaluations, papers..."
                    className="flex h-11 w-full bg-transparent py-3 text-sm text-claude-text placeholder:text-claude-text-muted outline-none"
                    value={searchValue}
                    onValueChange={setSearchValue}
                  />
                  {isSearching && (
                    <Loader2 className="h-4 w-4 shrink-0 text-claude-accent animate-spin" />
                  )}
                </div>

                <CommandList className="max-h-[400px] overflow-y-auto p-1 custom-scrollbar">
                  {!showSearchResults ? (
                    <>
                      {/* Mode Switching */}
                      <CommandGroup
                        heading="Switch Mode"
                        className="[&_[cmdk-group-heading]]:text-claude-text-muted [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
                      >
                        <CommandItem
                          onSelect={() => handleSelect(() => onSwitchMode('weekly'))}
                          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-claude-text-secondary data-[selected=true]:bg-claude-accent/10 data-[selected=true]:text-claude-accent"
                          disabled={currentMode === 'weekly'}
                        >
                          <Database className="h-4 w-4 text-claude-accent" />
                          <span className="flex-1 text-sm">
                            Switch to Weekly
                            {currentMode === 'weekly' && (
                              <span className="ml-1.5 text-[10px] text-claude-text-muted">(current)</span>
                            )}
                          </span>
                          <CommandShortcut className="text-[10px] text-claude-text-muted">1</CommandShortcut>
                        </CommandItem>

                        <CommandItem
                          onSelect={() => handleSelect(() => onSwitchMode('evaluation'))}
                          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-claude-text-secondary data-[selected=true]:bg-claude-accent/10 data-[selected=true]:text-claude-accent"
                          disabled={currentMode === 'evaluation'}
                        >
                          <FlaskConical className="h-4 w-4 text-claude-accent" />
                          <span className="flex-1 text-sm">
                            Switch to Evaluation
                            {currentMode === 'evaluation' && (
                              <span className="ml-1.5 text-[10px] text-claude-text-muted">(current)</span>
                            )}
                          </span>
                          <CommandShortcut className="text-[10px] text-claude-text-muted">2</CommandShortcut>
                        </CommandItem>

                        <CommandItem
                          onSelect={() => handleSelect(() => onSwitchMode('literature'))}
                          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-claude-text-secondary data-[selected=true]:bg-claude-accent/10 data-[selected=true]:text-claude-accent"
                          disabled={currentMode === 'literature'}
                        >
                          <BookOpen className="h-4 w-4 text-claude-accent" />
                          <span className="flex-1 text-sm">
                            Switch to Literature
                            {currentMode === 'literature' && (
                              <span className="ml-1.5 text-[10px] text-claude-text-muted">(current)</span>
                            )}
                          </span>
                          <CommandShortcut className="text-[10px] text-claude-text-muted">3</CommandShortcut>
                        </CommandItem>
                      </CommandGroup>

                      <CommandSeparator className="bg-claude-border dark:bg-[#3d3832] my-1" />

                      {/* Quick Actions */}
                      <CommandGroup
                        heading="Quick Actions"
                        className="[&_[cmdk-group-heading]]:text-claude-text-muted [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
                      >
                        <CommandItem
                          onSelect={() => handleSelect(onToggleTheme)}
                          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-claude-text-secondary data-[selected=true]:bg-claude-accent/10 data-[selected=true]:text-claude-accent"
                        >
                          {isDark ? (
                            <Sun className="h-4 w-4 text-amber-500" />
                          ) : (
                            <Moon className="h-4 w-4 text-indigo-400" />
                          )}
                          <span className="flex-1 text-sm">
                            {isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                          </span>
                        </CommandItem>

                        <CommandItem
                          onSelect={() => handleSelect(onToggleCharts)}
                          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-claude-text-secondary data-[selected=true]:bg-claude-accent/10 data-[selected=true]:text-claude-accent"
                        >
                          <BarChart3 className="h-4 w-4 text-claude-accent" />
                          <span className="flex-1 text-sm">Toggle Summary Charts</span>
                        </CommandItem>

                        <CommandItem
                          onSelect={() => handleSelect(onToggleCharts)}
                          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-claude-text-secondary data-[selected=true]:bg-claude-accent/10 data-[selected=true]:text-claude-accent"
                        >
                          <BookOpen className="h-4 w-4 text-claude-accent" />
                          <span className="flex-1 text-sm">Toggle Literature Charts</span>
                        </CommandItem>
                      </CommandGroup>
                    </>
                  ) : (
                    <>
                      {/* Search Results Mode */}
                      {!hasResults && !isSearching && (
                        <CommandEmpty className="py-6 text-center text-sm text-claude-text-muted">
                          No results found for &quot;{searchValue}&quot;
                        </CommandEmpty>
                      )}

                      {/* PDB Structures Group */}
                      {searchResults.entries.length > 0 && (
                        <CommandGroup
                          heading={
                            <span className="flex items-center gap-1.5">
                              <Database className="h-3 w-3 text-[#2d8f8f]" />
                              PDB Structures
                            </span>
                          }
                          className="[&_[cmdk-group-heading]]:text-claude-text-muted [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
                        >
                          {searchResults.entries.map(entry => (
                            <CommandItem
                              key={entry.pdbId}
                              value={`pdb-${entry.pdbId}`}
                              onSelect={() => handleSelect(() => onSelectPdbEntry?.(entry))}
                              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-claude-text-secondary data-[selected=true]:bg-claude-accent/10 data-[selected=true]:text-claude-accent"
                            >
                              <Hexagon className="h-4 w-4 text-[#2d8f8f] shrink-0" />
                              <span className="font-mono text-xs text-claude-accent shrink-0">{entry.pdbId}</span>
                              <span className="flex-1 text-sm truncate">
                                {truncate(entry.title || 'Untitled', 45)}
                              </span>
                              <MethodBadge method={entry.method} />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}

                      {/* Evaluations Group */}
                      {searchResults.evaluations.length > 0 && (
                        <CommandGroup
                          heading={
                            <span className="flex items-center gap-1.5">
                              <FlaskConical className="h-3 w-3 text-claude-xray" />
                              Evaluations
                            </span>
                          }
                          className="[&_[cmdk-group-heading]]:text-claude-text-muted [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
                        >
                          {searchResults.evaluations.map(ev => (
                            <CommandItem
                              key={ev.uniprotId}
                              value={`eval-${ev.uniprotId}`}
                              onSelect={() => handleSelect(() => onSelectEvaluation?.(ev))}
                              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-claude-text-secondary data-[selected=true]:bg-claude-accent/10 data-[selected=true]:text-claude-accent"
                            >
                              <Microscope className="h-4 w-4 text-claude-xray shrink-0" />
                              <span className="flex-1 text-sm truncate">
                                {ev.proteinName || ev.uniprotId}
                              </span>
                              <span className="text-[10px] font-mono text-claude-text-muted shrink-0">{ev.uniprotId}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}

                      {/* Papers Group */}
                      {searchResults.papers.length > 0 && (
                        <CommandGroup
                          heading={
                            <span className="flex items-center gap-1.5">
                              <FileText className="h-3 w-3 text-claude-nmr" />
                              Papers
                            </span>
                          }
                          className="[&_[cmdk-group-heading]]:text-claude-text-muted [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
                        >
                          {searchResults.papers.map(paper => (
                            <CommandItem
                              key={paper.pmid}
                              value={`paper-${paper.pmid}`}
                              onSelect={() => handleSelect(() => onSelectPaper?.(paper))}
                              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-claude-text-secondary data-[selected=true]:bg-claude-accent/10 data-[selected=true]:text-claude-accent"
                            >
                              <BookOpen className="h-4 w-4 text-claude-nmr shrink-0" />
                              <span className="flex-1 text-sm truncate">
                                {truncate(paper.title, 50)}
                              </span>
                              <span className="text-[10px] text-claude-text-muted shrink-0 max-w-[80px] truncate">{paper.journal}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}

                      {/* Also show mode switch when searching (compact) */}
                      <CommandSeparator className="bg-claude-border dark:bg-[#3d3832] my-1" />
                      <CommandGroup
                        heading="Navigate"
                        className="[&_[cmdk-group-heading]]:text-claude-text-muted [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
                      >
                        <CommandItem
                          onSelect={() => handleSelect(() => onSwitchMode('weekly'))}
                          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer text-claude-text-muted data-[selected=true]:bg-claude-accent/10 data-[selected=true]:text-claude-accent"
                        >
                          <Database className="h-3.5 w-3.5" />
                          <span className="flex-1 text-xs">Go to Weekly</span>
                          <CommandShortcut className="text-[10px]">1</CommandShortcut>
                        </CommandItem>
                        <CommandItem
                          onSelect={() => handleSelect(() => onSwitchMode('evaluation'))}
                          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer text-claude-text-muted data-[selected=true]:bg-claude-accent/10 data-[selected=true]:text-claude-accent"
                        >
                          <FlaskConical className="h-3.5 w-3.5" />
                          <span className="flex-1 text-xs">Go to Evaluation</span>
                          <CommandShortcut className="text-[10px]">2</CommandShortcut>
                        </CommandItem>
                        <CommandItem
                          onSelect={() => handleSelect(() => onSwitchMode('literature'))}
                          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer text-claude-text-muted data-[selected=true]:bg-claude-accent/10 data-[selected=true]:text-claude-accent"
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          <span className="flex-1 text-xs">Go to Literature</span>
                          <CommandShortcut className="text-[10px]">3</CommandShortcut>
                        </CommandItem>
                      </CommandGroup>
                    </>
                  )}
                </CommandList>

                {/* Footer hint */}
                <div className="border-t border-claude-border dark:border-[#3d3832] px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <kbd className="inline-flex items-center text-[9px] text-claude-text-muted bg-claude-border-light dark:bg-[#2b2926] px-1.5 py-0.5 rounded border border-claude-border dark:border-[#3d3832] font-mono">
                      ↑↓
                    </kbd>
                    <span className="text-[10px] text-claude-text-muted">navigate</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="inline-flex items-center text-[9px] text-claude-text-muted bg-claude-border-light dark:bg-[#2b2926] px-1.5 py-0.5 rounded border border-claude-border dark:border-[#3d3832] font-mono">
                      ↵
                    </kbd>
                    <span className="text-[10px] text-claude-text-muted">select</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="inline-flex items-center text-[9px] text-claude-text-muted bg-claude-border-light dark:bg-[#2b2926] px-1.5 py-0.5 rounded border border-claude-border dark:border-[#3d3832] font-mono">
                      esc
                    </kbd>
                    <span className="text-[10px] text-claude-text-muted">close</span>
                  </div>
                </div>
              </Command>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
