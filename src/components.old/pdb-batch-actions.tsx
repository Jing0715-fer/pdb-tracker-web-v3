'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookmarkPlus,
  StickyNote,
  Download,
  ChevronDown,
  Table as TableIcon,
  FileJson,
  FileText,
  ClipboardCopy,
  GraduationCap,
  GitMerge,
  Layers,
  Plus,
  X,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import type { PdbEntry } from '@/lib/pdb-types';

export interface PdbBatchActionsProps {
  mode: 'evaluation' | 'weekly';
  selectedRows: Set<string>;
  sortedEntries: PdbEntry[];
  selectAllRows: () => void;
  batchSmartBookmark: () => void;
  bookmarks: Set<string>;
  setBatchNoteText: (text: string) => void;
  setBatchNoteDialogOpen: (open: boolean) => void;
  handleExportSelectedCsv: () => void;
  handleExportSelectedJson: () => void;
  handleExportSelectedMarkdown: () => void;
  handleCopySelectedIds: () => void;
  handleCopyIdsNewline: () => void;
  handleCopyAsTsv: () => void;
  setEntryComparison: (comparison: { entryA: PdbEntry | null; entryB: PdbEntry | null }) => void;
  setEntryCompareModalOpen: (open: boolean) => void;
  collections: Record<string, string[]>;
  setCollections: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  setSelectedRows: React.Dispatch<React.SetStateAction<Set<string>>>;
  clearSelection: () => void;
  toast: (message: string, options?: { description?: string }) => void;
  batchNoteDialogOpen: boolean;
  batchNoteText: string;
  setBatchNoteDialogOpenProp: (open: boolean) => void;
  handleBatchNote: () => void;
}

export function PdbBatchActions({
  mode,
  selectedRows,
  sortedEntries,
  selectAllRows,
  batchSmartBookmark,
  bookmarks,
  setBatchNoteText,
  setBatchNoteDialogOpen,
  handleExportSelectedCsv,
  handleExportSelectedJson,
  handleExportSelectedMarkdown,
  handleCopySelectedIds,
  handleCopyIdsNewline,
  handleCopyAsTsv,
  setEntryComparison,
  setEntryCompareModalOpen,
  collections,
  setCollections,
  setSelectedRows,
  clearSelection,
  toast,
  batchNoteDialogOpen,
  batchNoteText,
  setBatchNoteDialogOpenProp,
  handleBatchNote,
}: PdbBatchActionsProps) {
  return (
    <>
      {/* ═══════════ BATCH ACTION BAR ═══════════ */}
      <AnimatePresence>
        {selectedRows.size > 0 && mode === 'weekly' && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 no-print"
            style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="batch-bar-gradient glass-surface bg-claude-surface dark:bg-[#242220] border border-claude-border dark:border-[#3d3832] rounded-xl shadow-2xl shadow-depth-2 px-4 py-2.5 flex items-center gap-3 relative overflow-hidden neo-brutalist-card">
              {/* Left accent border */}
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-transparent via-claude-accent to-transparent rounded-l-xl" />
              {/* Batch Progress Pill */}
              <div className="batch-progress-pill hidden sm:block">
                <div
                  className="batch-progress-fill progress-bar-shine"
                  style={{ width: `${(selectedRows.size / sortedEntries.length) * 100}%` }}
                />
                <span className="batch-progress-text">
                  {selectedRows.size}/{sortedEntries.length}
                </span>
              </div>
              <span className="text-xs font-medium text-claude-text-secondary whitespace-nowrap">
                {selectedRows.size} of {sortedEntries.length} selected
              </span>
              {selectedRows.size < sortedEntries.length && (
                <button
                  onClick={selectAllRows}
                  className="text-[10px] text-claude-accent hover:underline font-medium whitespace-nowrap"
                >
                  Select All {sortedEntries.length}
                </button>
              )}
              <div className="w-px h-5 bg-claude-border-light" />
              {/* Smart Bookmark Toggle */}
              <button
                onClick={batchSmartBookmark}
                className="inline-flex items-center gap-1 h-7 px-3 rounded-lg text-[11px] font-medium text-claude-accent bg-claude-accent-light dark:bg-[#3d2a22] hover:bg-claude-accent-light/80 transition-colors duration-150"
              >
                <BookmarkPlus className="h-3 w-3" />
                {(() => {
                  const selEntries = sortedEntries.filter(e => selectedRows.has(e.pdbId));
                  const bmCount = selEntries.filter(e => bookmarks.has(e.pdbId)).length;
                  return bmCount > selEntries.length / 2 ? 'Unbookmark All' : 'Bookmark All';
                })()}
              </button>
              {/* Batch Note (2+ selected) */}
              {selectedRows.size >= 2 && (
                <button
                  onClick={() => { setBatchNoteText(''); setBatchNoteDialogOpen(true); }}
                  className="inline-flex items-center gap-1 h-7 px-3 rounded-lg text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors duration-150"
                >
                  <StickyNote className="h-3 w-3" />
                  Batch Note
                </button>
              )}
              {/* Export Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="inline-flex items-center gap-1 h-7 px-3 rounded-lg text-[11px] font-medium text-claude-text-secondary bg-claude-border-light/50 hover:bg-claude-border-light dark:bg-[#2b2926] dark:hover:bg-[#3d3832] transition-colors duration-150">
                    <Download className="h-3 w-3" />
                    Export
                    <ChevronDown className="h-2.5 w-2.5 ml-0.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="text-[10px] text-claude-text-muted">Export Format</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleExportSelectedCsv}>
                    <TableIcon className="h-3.5 w-3.5 mr-2 text-claude-text-muted" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportSelectedJson}>
                    <FileJson className="h-3.5 w-3.5 mr-2 text-claude-text-muted" />
                    Export as JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportSelectedMarkdown}>
                    <FileText className="h-3.5 w-3.5 mr-2 text-claude-text-muted" />
                    Export as Markdown
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[10px] text-claude-text-muted">Copy to Clipboard</DropdownMenuLabel>
                  <DropdownMenuItem onClick={handleCopySelectedIds}>
                    <ClipboardCopy className="h-3.5 w-3.5 mr-2 text-claude-text-muted" />
                    Copy PDB IDs (comma)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCopyIdsNewline}>
                    <ClipboardCopy className="h-3.5 w-3.5 mr-2 text-claude-text-muted" />
                    Copy IDs Only (newline)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCopyAsTsv}>
                    <TableIcon className="h-3.5 w-3.5 mr-2 text-claude-text-muted" />
                    Copy as TSV (Excel)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    const sel = sortedEntries.filter(e => selectedRows.has(e.pdbId));
                    const bibEntries = sel.map(entry => {
                      const authors = entry.authors ? entry.authors.split(',').map(a => a.trim()).filter(Boolean) : [];
                      const lastName = authors.length > 0 ? authors[0].split(' ').pop() || 'Unknown' : 'Unknown';
                      const firstNames = authors.slice(0, 3).map(a => a.split(' ')[0]).join(', ');
                      const year = entry.releaseDate ? new Date(entry.releaseDate).getFullYear() : new Date().getFullYear();
                      return `@article{${entry.pdbId.toLowerCase()},
  title = {${(entry.title || entry.pdbId).replace(/[{}]/g, '')}},
  author = {${lastName}, ${firstNames} and others},
  journal = {${entry.journal || 'Unknown Journal'}},
  year = {${year}},
  doi = {10.2210/pdb.${entry.pdbId.toLowerCase()}}
}`;
                    }).join('\n\n');
                    navigator.clipboard.writeText(bibEntries).then(() => toast(`Copied BibTeX for ${sel.length} entries`)).catch(() => toast('Failed to copy'));
                  }}>
                    <GraduationCap className="h-3.5 w-3.5 mr-2 text-claude-text-muted" />
                    Copy as BibTeX
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {selectedRows.size >= 2 && (
                <button
                  onClick={() => {
                    const selectedEntries = sortedEntries.filter(e => selectedRows.has(e.pdbId));
                    if (selectedEntries.length >= 2) {
                      setEntryComparison({ entryA: selectedEntries[0], entryB: selectedEntries[1] });
                      setEntryCompareModalOpen(true);
                    }
                  }}
                  className="inline-flex items-center gap-1 h-7 px-3 rounded-lg text-[11px] font-medium text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 dark:hover:bg-teal-900/30 transition-colors duration-150"
                >
                  <GitMerge className="h-3 w-3" />
                  Compare Selected
                </button>
              )}

              {/* Add to Collection */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="inline-flex items-center gap-1 h-7 px-3 rounded-lg text-[11px] font-medium text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors duration-150">
                    <Layers className="h-3 w-3" />
                    Add to Collection
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {Object.keys(collections).length > 0 && Object.keys(collections).map(name => (
                    <DropdownMenuItem key={name} onClick={() => {
                      const selectedEntries = sortedEntries.filter(e => selectedRows.has(e.pdbId));
                      setCollections(prev => {
                        const updated = { ...prev, [name]: [...new Set([...(prev[name] || []), ...selectedEntries.map(e => e.pdbId)])] };
                        return updated;
                      });
                      toast(`Added ${selectedEntries.length} structures to "${name}"`);
                      setSelectedRows(new Set());
                    }}>
                      <span className="flex items-center gap-2">
                        <Layers className="h-3 w-3 text-violet-400" />
                        {name}
                        <span className="ml-auto text-[9px] text-claude-text-muted">{(collections[name] || []).length}</span>
                      </span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => {
                    const name = prompt('New collection name:');
                    if (name?.trim()) {
                      const selectedEntries = sortedEntries.filter(e => selectedRows.has(e.pdbId));
                      setCollections(prev => ({ ...prev, [name.trim()]: selectedEntries.map(e => e.pdbId) }));
                      toast(`Created "${name.trim()}" with ${selectedEntries.length} structures`);
                      setSelectedRows(new Set());
                    }
                  }}>
                    <span className="flex items-center gap-2">
                      <Plus className="h-3 w-3" />
                      New Collection...
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="w-px h-5 bg-claude-border-light" />
              <button
                onClick={clearSelection}
                className="inline-flex items-center justify-center h-7 w-7 rounded-lg text-claude-text-muted hover:bg-claude-border-light dark:hover:bg-claude-border transition-colors duration-150"
                title="Clear selection"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════ BATCH NOTE DIALOG ═══════════ */}
      <AnimatePresence>
        {batchNoteDialogOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center no-print"
            onClick={() => setBatchNoteDialogOpenProp(false)}
          >
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              className="relative bg-claude-surface dark:bg-[#242220] border border-claude-border dark:border-[#4a4540] rounded-xl shadow-2xl w-[400px] max-w-[90vw] p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-claude-text flex items-center gap-2">
                  <StickyNote className="h-4 w-4 text-amber-500" />
                  Batch Note
                </h3>
                <button
                  onClick={() => setBatchNoteDialogOpenProp(false)}
                  className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-claude-border-light dark:hover:bg-[#3d3832] transition-colors"
                >
                  <X className="h-4 w-4 text-claude-text-muted" />
                </button>
              </div>
              <p className="text-[11px] text-claude-text-muted mb-3">
                This note will be applied to all <span className="font-medium text-claude-text">{selectedRows.size}</span> selected entries.
              </p>
              <textarea
                autoFocus
                value={batchNoteText}
                onChange={e => setBatchNoteText(e.target.value)}
                placeholder="Enter a note for selected structures..."
                rows={3}
                className="w-full px-3 py-2 text-xs rounded-md border border-claude-border dark:border-[#3d3832] bg-white dark:bg-[#1a1917] dark:text-[#e8e4dd] focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400/40 placeholder:text-claude-text-muted/60 resize-none"
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleBatchNote(); }}
              />
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleBatchNote}
                  disabled={!batchNoteText.trim()}
                  className="flex-1 h-8 text-xs bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  Add Note to {selectedRows.size} Entries
                </button>
                <button
                  onClick={() => setBatchNoteDialogOpenProp(false)}
                  className="h-8 px-3 text-xs border border-claude-border dark:border-[#3d3832] text-claude-text-secondary rounded-lg hover:bg-claude-border-light dark:hover:bg-[#3d3832] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
