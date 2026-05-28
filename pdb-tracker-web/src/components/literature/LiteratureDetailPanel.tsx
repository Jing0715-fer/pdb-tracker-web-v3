'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Link2, BookOpen, Users, Calendar, Tag, Sparkles, Loader2, CheckCircle2, Circle, Box } from 'lucide-react';
import type { LitPaper } from '@/lib/pdb-types';
import { getMethodColor, getMethodLabel, formatDate } from '@/components/pdb-helpers';
import { TagInput, TagPill } from './LiteraturePaperTags';
import { LiteratureRelatedPapers } from './LiteratureRelatedPapers';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { PdbStructureViewer } from '@/components/PdbStructureViewer';

interface LiteratureDetailPanelProps {
  paper: LitPaper | null;
  isOpen: boolean;
  onClose: () => void;
  // Tags props
  paperTags?: string[];
  onAddTag?: (pmid: string, tag: string) => void;
  onRemoveTag?: (pmid: string, tag: string) => void;
  // Related papers props
  allPapers?: LitPaper[];
  onSelectPaper?: (paper: LitPaper) => void;
  // Reading progress props
  readingProgress?: number; // 0-100
  onProgressChange?: (pmid: string, value: number) => void;
  onMarkComplete?: (pmid: string) => void;
}

/** Get progress bar color: teal 0-33%, amber 34-66%, green 67-100% */
function getProgressColor(progress: number): string {
  if (progress >= 67) return '#10b981';
  if (progress >= 34) return '#f59e0b';
  return '#2d8f8f';
}

/** Get reading status for badge */
function getReadingStatus(progress: number): { color: string; bg: string; text: string; label: string } {
  if (progress >= 100) return { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200/60 dark:border-emerald-800/30', text: 'border-emerald-300 dark:border-emerald-700', label: 'Read' };
  if (progress > 0) return { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200/60 dark:border-amber-800/30', text: 'border-amber-300 dark:border-amber-700', label: 'Reading' };
  return { color: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-800/50 border-gray-200/60 dark:border-gray-700/30', text: 'border-gray-300 dark:border-gray-600', label: 'Unread' };
}

export function LiteratureDetailPanel({
  paper,
  isOpen,
  onClose,
  paperTags = [],
  onAddTag,
  onRemoveTag,
  allPapers = [],
  onSelectPaper,
  readingProgress = 0,
  onProgressChange,
  onMarkComplete,
}: LiteratureDetailPanelProps) {
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [viewerPdbId, setViewerPdbId] = useState<string | null>(null);

  const handleAiSummary = async () => {
    if (!paper || aiLoading) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdbId: paper.pdbs[0]?.pdbId || paper.pmid,
          title: paper.title,
          method: paper.pdbs[0]?.method || '',
          resolution: paper.pdbs[0]?.resolution || null,
          journal: paper.journal,
          journalIf: paper.IF,
        }),
      });
      const data = await res.json();
      setAiSummary(data.summary || 'Unable to generate summary.');
    } catch {
      setAiSummary('Failed to generate AI summary. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  // Close on Escape key
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Reset AI summary when paper changes
  React.useEffect(() => {
    setAiSummary(null);
    setAiLoading(false);
    setViewerPdbId(null);
  }, [paper?.pmid]);

  return (
    <AnimatePresence>
      {isOpen && paper && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[420px] bg-claude-surface dark:bg-[#242220] border-l border-claude-border dark:border-[#3d3832] shadow-2xl preview-gradient-border flex flex-col"
          >
            {/* Reading progress bar at very top */}
            <div className="h-[2px] w-full bg-claude-border-light dark:bg-[#2b2926] flex-shrink-0">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${readingProgress}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="h-full progress-shine"
                style={{ background: getProgressColor(readingProgress) }}
              />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-claude-border dark:border-[#3d3832] bg-gradient-to-r from-[#faf7f4] to-[#f5f0ea] dark:from-[#242220] dark:to-[#2b2926]">
              <h2 className="text-sm font-bold text-claude-text truncate pr-2">Paper Details</h2>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-claude-border-light dark:hover:bg-[#2b2926] text-claude-text-muted hover:text-claude-text transition-colors active:scale-95"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left"><p>Close</p></TooltipContent>
              </Tooltip>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar preview-scroll p-4 space-y-4">
              {/* Title */}
              <div>
                <h3 className="text-base font-bold text-claude-text leading-snug">
                  {paper.title || 'Untitled'}
                </h3>
              </div>

              {/* Reading Progress Section */}
              {onProgressChange && (() => {
                const status = getReadingStatus(readingProgress);
                return (
                  <div className="p-3 rounded-lg border border-claude-border/60 dark:border-[#3d3832]/60 bg-claude-border-light/30 dark:bg-[#1a1917]/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                        <span className="text-[10px] font-medium text-claude-text-muted uppercase tracking-wider">
                          Reading Progress
                        </span>
                        {/* Status badge */}
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold border ${status.bg} ${status.color}`}>
                          <Circle className="h-1.5 w-1.5 fill-current" />
                          {status.label}
                        </span>
                      </div>
                      <span className={`text-sm font-bold tabular-nums ${
                        readingProgress >= 100
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : readingProgress > 0
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-claude-text-muted'
                      }`}>
                        {readingProgress}%
                      </span>
                    </div>

                    {/* Progress bar visual */}
                    <div className="h-1.5 w-full bg-claude-border-light dark:bg-[#2b2926] rounded-full mb-3 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${readingProgress}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ background: getProgressColor(readingProgress) }}
                      />
                    </div>

                    {/* Slider */}
                    <Slider
                      value={[readingProgress]}
                      min={0}
                      max={100}
                      step={5}
                      onValueChange={(value) => {
                        onProgressChange(paper.pmid, value[0]);
                      }}
                      className="w-full mb-2"
                    />

                    {/* Quick action buttons */}
                    <div className="flex items-center gap-2">
                      {readingProgress < 100 ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2.5 text-[10px] font-medium border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                          onClick={() => onMarkComplete?.(paper.pmid)}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Mark as Read
                        </Button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Completed
                        </span>
                      )}
                      {readingProgress > 0 && readingProgress < 100 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px] font-medium text-claude-text-muted hover:text-claude-text"
                          onClick={() => onProgressChange(paper.pmid, 0)}
                        >
                          Reset
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Metadata grid */}
              <div className="grid grid-cols-2 gap-3">
                {paper.authors && (
                  <div className="col-span-2">
                    <div className="flex items-start gap-2">
                      <Users className="h-3.5 w-3.5 text-claude-text-muted mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-[10px] font-medium text-claude-text-muted uppercase tracking-wider mb-0.5">Authors</div>
                        <div className="text-xs text-claude-text-secondary leading-relaxed">{paper.authors}</div>
                      </div>
                    </div>
                  </div>
                )}
                {paper.journal && (
                  <div>
                    <div className="text-[10px] font-medium text-claude-text-muted uppercase tracking-wider mb-0.5">Journal</div>
                    <div className="text-xs text-claude-text-secondary font-medium">{paper.journal}</div>
                  </div>
                )}
                {paper.IF != null && (
                  <div>
                    <div className="text-[10px] font-medium text-claude-text-muted uppercase tracking-wider mb-0.5">Impact Factor</div>
                    <div className={`text-sm font-bold ${
                      paper.IF >= 20 ? 'text-red-600 dark:text-red-400' :
                      paper.IF >= 10 ? 'text-orange-600 dark:text-orange-400' :
                      paper.IF >= 5 ? 'text-emerald-600 dark:text-emerald-400' :
                      'text-claude-text'
                    }`}>
                      {paper.IF.toFixed(1)}
                    </div>
                  </div>
                )}
                {paper.pubdate && (
                  <div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-claude-text-muted" />
                      <div className="text-[10px] font-medium text-claude-text-muted uppercase tracking-wider">Date</div>
                    </div>
                    <div className="text-xs text-claude-text-secondary mt-0.5">{paper.pubdate}</div>
                  </div>
                )}
                <div>
                  <div className="text-[10px] font-medium text-claude-text-muted uppercase tracking-wider mb-0.5">PMID</div>
                  <div className="text-xs text-claude-text-secondary font-mono">{paper.pmid}</div>
                </div>
              </div>

              {/* DOI + PubMed links */}
              <div className="flex items-center gap-2">
                <a
                  href={`https://pubmed.ncbi.nlm.nih.gov/${paper.pmid}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-claude-accent/10 text-claude-accent dark:bg-claude-accent/20 dark:text-claude-accent-hover hover:bg-claude-accent/20 dark:hover:bg-claude-accent/30 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  PubMed
                </a>
                {paper.doi && (
                  <a
                    href={`https://doi.org/${paper.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-claude-border-light dark:bg-[#2b2926] text-claude-text-secondary hover:bg-claude-border dark:hover:bg-[#3d3832] transition-colors"
                  >
                    <Link2 className="h-3 w-3" />
                    DOI
                  </a>
                )}
              </div>

              {/* Abstract */}
              {paper.abstract && (
                <div>
                  <div className="text-[10px] font-medium text-claude-text-muted uppercase tracking-wider mb-1.5">Abstract</div>
                  <div className="text-xs text-claude-text-secondary leading-relaxed p-3 rounded-lg bg-claude-border-light/50 dark:bg-[#1a1917]/50 border border-claude-border/50 dark:border-[#3d3832]/50">
                    {paper.abstract}
                  </div>
                </div>
              )}

              {/* AI Summary */}
              <div>
                <button
                  onClick={handleAiSummary}
                  disabled={aiLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-claude-accent/10 to-purple-500/10 dark:from-claude-accent/20 dark:to-purple-500/20 text-claude-accent dark:text-claude-accent-hover hover:from-claude-accent/20 hover:to-purple-500/20 dark:hover:from-claude-accent/30 dark:hover:to-purple-500/30 transition-all disabled:opacity-50 active:scale-95"
                >
                  {aiLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  {aiLoading ? 'Generating...' : 'AI Summary'}
                </button>
                {aiSummary && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 p-3 rounded-lg bg-gradient-to-br from-claude-accent/5 to-purple-500/5 dark:from-claude-accent/10 dark:to-purple-500/10 border border-claude-accent/20 dark:border-claude-accent/30 text-xs text-claude-text-secondary leading-relaxed"
                  >
                    {aiSummary}
                  </motion.div>
                )}
              </div>

              {/* Tags Section */}
              {onAddTag && onRemoveTag && (
                <div className="border-t border-claude-border/50 dark:border-[#3d3832]/50 pt-3">
                  <TagInput
                    pmid={paper.pmid}
                    currentTags={paperTags}
                    onAddTag={onAddTag}
                    onRemoveTag={onRemoveTag}
                  />
                </div>
              )}

              {/* Associated PDB structures */}
              {paper.pdbs.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <BookOpen className="h-3.5 w-3.5 text-claude-text-muted" />
                    <span className="text-[10px] font-medium text-claude-text-muted uppercase tracking-wider">
                      Associated PDB Structures ({paper.pdbs.length})
                    </span>
                  </div>
                  <div className="space-y-2">
                    {paper.pdbs.map(pdb => {
                      const methodStyle = getMethodColor(pdb.method || '');
                      const isViewerOpen = viewerPdbId === pdb.pdbId;
                      return (
                        <div key={pdb.pdbId} className="space-y-2">
                          <div
                            className="flex items-center gap-2 p-2.5 rounded-lg border border-claude-border/60 dark:border-[#3d3832]/60 bg-claude-border-light/30 dark:bg-[#1a1917]/30 hover:bg-claude-border-light/60 dark:hover:bg-[#2b2926]/60 transition-colors"
                          >
                            <a
                              href={`https://www.rcsb.org/structure/${pdb.pdbId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-mono font-bold text-claude-accent dark:text-claude-accent-hover hover:underline"
                            >
                              {pdb.pdbId}
                            </a>
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-medium ${methodStyle.bg} ${methodStyle.text} ${methodStyle.border} border`}>
                              {getMethodLabel(pdb.method || '')}
                            </span>
                            {pdb.resolution != null && (
                              <span className="text-[10px] text-claude-text-muted font-mono">
                                {pdb.resolution.toFixed(2)}Å
                              </span>
                            )}
                            {pdb.isBlast && (
                              <span className="text-[9px] px-1 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
                                BLAST
                              </span>
                            )}
                            <a
                              href={`https://www.rcsb.org/structure/${pdb.pdbId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded hover:bg-claude-border-light dark:hover:bg-[#2b2926] text-claude-text-muted hover:text-claude-accent dark:hover:text-claude-accent-hover transition-colors"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                            <button
                              onClick={() => setViewerPdbId(isViewerOpen ? null : pdb.pdbId)}
                              className={`ml-auto p-1 rounded transition-colors ${
                                isViewerOpen
                                  ? 'bg-claude-accent/15 text-claude-accent dark:bg-claude-accent/25 dark:text-claude-accent-hover'
                                  : 'text-claude-text-muted hover:text-claude-accent dark:hover:text-claude-accent-hover hover:bg-claude-border-light/60 dark:hover:bg-[#3d3832]/40'
                              }`}
                              title={isViewerOpen ? 'Close 3D viewer' : 'View 3D structure'}
                            >
                              <Box className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {/* Inline 3D viewer for this PDB */}
                          <AnimatePresence>
                            {isViewerOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <PdbStructureViewer pdbId={pdb.pdbId} />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Keywords */}
              {paper.keywords && paper.keywords.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Tag className="h-3 w-3 text-claude-text-muted" />
                    <span className="text-[10px] font-medium text-claude-text-muted uppercase tracking-wider">Keywords</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {paper.keywords.map((kw, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-claude-border-light dark:bg-[#2b2926] text-claude-text-secondary border border-claude-border/50 dark:border-[#3d3832]/50"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Papers */}
              {allPapers.length > 1 && onSelectPaper && (
                <div className="border-t border-claude-border/50 dark:border-[#3d3832]/50 pt-3">
                  <LiteratureRelatedPapers
                    currentPaper={paper}
                    allPapers={allPapers}
                    onSelectPaper={(relatedPaper) => {
                      onSelectPaper(relatedPaper);
                    }}
                  />
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
