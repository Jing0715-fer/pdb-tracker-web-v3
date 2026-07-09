'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ArrowLeftRight,
  ExternalLink,
  Download,
  ChevronDown,
  ChevronUp,
  Microscope,
  Ruler,
  TrendingUp,
  Globe,
  FlaskConical,
  Calendar,
  BookOpen,
  Hash,
  GitMerge,
  Check,
  AlertTriangle,
  Minus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { getMethodColor, getMethodLabel, getResolutionColor, formatDate, parseLigands } from './pdb-helpers';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PdbEntryLike {
  pdbId: string;
  method: string;
  resolution: number | null;
  releaseDate: string | null;
  title: string;
  journal: string | null;
  journalIf: number | null;
  organisms: string | null;
  ligands: string | null;
  authors?: string | null;
  isCryoem?: number;
  isXray?: number;
  ifTier?: string;
}

interface QualityScoreResult {
  total: number;
  resolutionScore: number;
  methodScore: number;
  ifScore: number;
  label: string;
  color: string;
}

interface StructureComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  entryA: PdbEntryLike | null;
  entryB: PdbEntryLike | null;
  onSwap?: () => void;
  computeQualityScore: (entry: PdbEntryLike) => QualityScoreResult;
}

// ─── Helper: Resolution Quality ───────────────────────────────────────────────

function getResolutionQuality(res: number | null): { label: string; color: string; pct: number } {
  if (res === null || res === undefined) return { label: 'N/A', color: 'text-gray-400', pct: 0 };
  if (res <= 1.5) return { label: 'Excellent', color: 'text-green-600 dark:text-green-400', pct: 100 };
  if (res <= 2.0) return { label: 'High', color: 'text-green-500 dark:text-green-300', pct: 85 };
  if (res <= 2.5) return { label: 'Good', color: 'text-teal-500 dark:text-teal-300', pct: 70 };
  if (res <= 3.0) return { label: 'Medium', color: 'text-amber-500 dark:text-amber-300', pct: 55 };
  if (res <= 3.5) return { label: 'Low', color: 'text-orange-500 dark:text-orange-300', pct: 35 };
  return { label: 'Poor', color: 'text-red-500 dark:text-red-400', pct: 15 };
}

function getIfQuality(ifVal: number | null): { label: string; color: string; pct: number } {
  if (ifVal === null || ifVal === undefined) return { label: 'N/A', color: 'text-gray-400', pct: 0 };
  if (ifVal >= 25) return { label: 'Top', color: 'text-green-600 dark:text-green-400', pct: 100 };
  if (ifVal >= 10) return { label: 'High', color: 'text-teal-500 dark:text-teal-300', pct: 80 };
  if (ifVal >= 5) return { label: 'Good', color: 'text-blue-500 dark:text-blue-300', pct: 60 };
  if (ifVal >= 2) return { label: 'Medium', color: 'text-amber-500 dark:text-amber-300', pct: 40 };
  return { label: 'Low', color: 'text-gray-500 dark:text-gray-400', pct: 20 };
}

// ─── Comparison Color Logic ───────────────────────────────────────────────────

type DiffResult = 'better' | 'worse' | 'same' | 'different' | 'neutral';

function getDiffColor(diff: DiffResult, side: 'left' | 'right'): string {
  if (diff === 'neutral') return '';
  if (diff === 'same') return '';
  if (diff === 'different') return 'bg-amber-50 dark:bg-amber-900/15 border-amber-200/50 dark:border-amber-800/30';
  // For better/worse, the side that is better gets green, the worse gets red
  if (side === 'left') {
    return diff === 'better'
      ? 'bg-green-50 dark:bg-green-900/20 border-green-200/50 dark:border-green-800/30'
      : 'bg-red-50 dark:bg-red-900/15 border-red-200/50 dark:border-red-800/30';
  } else {
    return diff === 'worse'
      ? 'bg-green-50 dark:bg-green-900/20 border-green-200/50 dark:border-green-800/30'
      : 'bg-red-50 dark:bg-red-900/15 border-red-200/50 dark:border-red-800/30';
  }
}

function compareResolution(resA: number | null, resB: number | null): DiffResult {
  if (resA == null && resB == null) return 'same';
  if (resA == null || resB == null) return 'different';
  if (Math.abs(resA - resB) < 0.05) return 'same';
  // Lower is better
  return resA < resB ? 'better' : 'worse';
}

function compareIf(ifA: number | null, ifB: number | null): DiffResult {
  if (ifA == null && ifB == null) return 'same';
  if (ifA == null || ifB == null) return 'different';
  if (Math.abs(ifA - ifB) < 0.1) return 'same';
  // Higher is better
  return ifA > ifB ? 'better' : 'worse';
}

function compareText(a: string | null, b: string | null): DiffResult {
  const aStr = a?.trim() || '';
  const bStr = b?.trim() || '';
  if (aStr === bStr) return 'same';
  if (!aStr || !bStr) return 'different';
  return 'different';
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function QualityBar({ score, color, label }: { score: number; color: string; label: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-claude-text-muted">{label}</span>
        <span className="text-[10px] font-bold" style={{ color }}>{score}</span>
      </div>
      <div className="h-1.5 rounded-full bg-claude-border/30 dark:bg-[#3d3832] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function ExpandableLigands({ ligands, maxShow = 3 }: { ligands: string[]; maxShow?: number }) {
  const [expanded, setExpanded] = useState(false);
  if (ligands.length === 0) return <span className="text-[11px] text-claude-text-muted">None</span>;
  const visible = expanded ? ligands : ligands.slice(0, maxShow);
  const remaining = ligands.length - maxShow;

  return (
    <div>
      <div className="flex flex-wrap gap-1">
        {visible.map((lig, i) => (
          <span key={`${lig}-${i}`} className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono rounded bg-claude-cryoem-bg text-claude-cryoem border border-claude-cryoem/20">
            {lig}
          </span>
        ))}
      </div>
      {remaining > 0 && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="text-[9px] text-claude-accent hover:underline mt-0.5 flex items-center gap-0.5"
        >
          +{remaining} more <ChevronDown className="h-2.5 w-2.5" />
        </button>
      )}
      {expanded && ligands.length > maxShow && (
        <button
          onClick={() => setExpanded(false)}
          className="text-[9px] text-claude-accent hover:underline mt-0.5 flex items-center gap-0.5"
        >
          Show less <ChevronUp className="h-2.5 w-2.5" />
        </button>
      )}
    </div>
  );
}

function ComparisonField({
  icon: Icon,
  label,
  valueA,
  valueB,
  diffLeft,
  diffRight,
  renderValue,
}: {
  icon: React.ElementType;
  label: string;
  valueA: React.ReactNode;
  valueB: React.ReactNode;
  diffLeft: DiffResult;
  diffRight: DiffResult;
  renderValue?: (val: React.ReactNode, side: 'left' | 'right') => React.ReactNode;
}) {
  const leftClass = getDiffColor(diffLeft, 'left');
  const rightClass = getDiffColor(diffRight, 'right');

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-0">
      {/* Left value */}
      <div className={`p-3 rounded-l-lg border border-claude-border dark:border-[#3d3832] md:border-r-0 transition-colors ${leftClass}`}>
        <div className="flex items-center gap-1.5 mb-1">
          <Icon className="h-3 w-3 text-claude-text-muted flex-shrink-0" />
          <span className="text-[9px] font-semibold uppercase text-claude-text-muted tracking-wider">{label}</span>
          {diffLeft === 'better' && <span className="text-[8px] px-1 py-0 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-bold">BETTER</span>}
          {diffLeft === 'worse' && <span className="text-[8px] px-1 py-0 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-bold">WORSE</span>}
        </div>
        <div className="text-[11px] text-claude-text-secondary leading-relaxed">
          {renderValue ? renderValue(valueA, 'left') : valueA}
        </div>
      </div>
      {/* Divider */}
      <div className="hidden md:flex items-center justify-center w-8 border-y border-claude-border dark:border-[#3d3832] bg-claude-bg/30 dark:bg-[#1a1917]/50">
        {diffLeft !== 'same' && diffLeft !== 'neutral' && (
          <span className="text-[9px] font-bold text-claude-accent">≠</span>
        )}
        {diffLeft === 'same' && (
          <span className="text-[9px] text-green-500">=</span>
        )}
      </div>
      {/* Right value */}
      <div className={`p-3 rounded-r-lg border border-claude-border dark:border-[#3d3832] md:border-l-0 transition-colors ${rightClass}`}>
        <div className="flex items-center gap-1.5 mb-1 md:justify-end">
          <span className="text-[9px] font-semibold uppercase text-claude-text-muted tracking-wider md:hidden">{label}</span>
          {diffRight === 'worse' && <span className="text-[8px] px-1 py-0 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-bold">BETTER</span>}
          {diffRight === 'better' && <span className="text-[8px] px-1 py-0 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-bold">WORSE</span>}
        </div>
        <div className="text-[11px] text-claude-text-secondary leading-relaxed">
          {renderValue ? renderValue(valueB, 'right') : valueB}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StructureComparisonModal({
  isOpen,
  onClose,
  entryA,
  entryB,
  onSwap,
  computeQualityScore,
}: StructureComparisonModalProps) {
  const [swapped, setSwapped] = useState(false);
  const [copied, setCopied] = useState(false);

  // Effective entries after swap
  const leftEntry = swapped ? entryB : entryA;
  const rightEntry = swapped ? entryA : entryB;

  const handleSwap = useCallback(() => {
    setSwapped(prev => !prev);
    onSwap?.();
  }, [onSwap]);

  // Export comparison as text
  const handleExport = useCallback(() => {
    if (!leftEntry || !rightEntry) return;
    const qsA = computeQualityScore(leftEntry);
    const qsB = computeQualityScore(rightEntry);
    const ligA = parseLigands(leftEntry.ligands);
    const ligB = parseLigands(rightEntry.ligands);

    const text = [
      `PDB Structure Comparison`,
      `${'═'.repeat(50)}`,
      ``,
      `  ${'Property'.padEnd(20)} ${leftEntry.pdbId.padEnd(12)} ${rightEntry.pdbId}`,
      `${'─'.repeat(50)}`,
      `  ${'Method'.padEnd(20)} ${getMethodLabel(leftEntry.method).padEnd(12)} ${getMethodLabel(rightEntry.method)}`,
      `  ${'Resolution'.padEnd(20)} ${(leftEntry.resolution != null ? leftEntry.resolution.toFixed(2) + ' Å' : 'N/A').padEnd(12)} ${rightEntry.resolution != null ? rightEntry.resolution.toFixed(2) + ' Å' : 'N/A'}`,
      `  ${'Impact Factor'.padEnd(20)} ${(leftEntry.journalIf != null ? leftEntry.journalIf.toFixed(1) : 'N/A').padEnd(12)} ${rightEntry.journalIf != null ? rightEntry.journalIf.toFixed(1) : 'N/A'}`,
      `  ${'Quality Score'.padEnd(20)} ${String(qsA.total).padEnd(12)} ${qsB.total}`,
      `  ${'Organism'.padEnd(20)} ${(leftEntry.organisms || 'N/A').slice(0, 30).padEnd(12)} ${(rightEntry.organisms || 'N/A').slice(0, 30)}`,
      `  ${'Ligands'.padEnd(20)} ${ligA.length.toString().padEnd(12)} ${ligB.length}`,
      `  ${'Release Date'.padEnd(20)} ${formatDate(leftEntry.releaseDate).padEnd(12)} ${formatDate(rightEntry.releaseDate)}`,
      `  ${'Journal'.padEnd(20)} ${(leftEntry.journal || 'N/A').slice(0, 30).padEnd(12)} ${(rightEntry.journal || 'N/A').slice(0, 30)}`,
      ``,
      `  Title A: ${leftEntry.title}`,
      `  Title B: ${rightEntry.title}`,
      ``,
      `  Ligands A: ${ligA.join(', ') || 'None'}`,
      `  Ligands B: ${ligB.join(', ') || 'None'}`,
      ``,
      `Generated: ${new Date().toISOString()}`,
    ].join('\n');

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // fallback
    });
  }, [leftEntry, rightEntry, computeQualityScore]);

  // ESC handler
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!leftEntry || !rightEntry) return null;

  const qsA = computeQualityScore(leftEntry);
  const qsB = computeQualityScore(rightEntry);
  const resDiff = compareResolution(leftEntry.resolution, rightEntry.resolution);
  const ifDiff = compareIf(leftEntry.journalIf, rightEntry.journalIf);
  const methodDiff = compareText(leftEntry.method, rightEntry.method);
  const organismDiff = compareText(leftEntry.organisms, rightEntry.organisms);
  const titleDiff = compareText(leftEntry.title, rightEntry.title);
  const journalDiff = compareText(leftEntry.journal, rightEntry.journal);
  const dateDiff = compareText(leftEntry.releaseDate, rightEntry.releaseDate);
  const ligandsDiff: DiffResult = (() => {
    const ligA = parseLigands(leftEntry.ligands);
    const ligB = parseLigands(rightEntry.ligands);
    if (ligA.length === 0 && ligB.length === 0) return 'same';
    if (ligA.length === ligB.length && ligA.every((l, i) => l === ligB[i])) return 'same';
    return 'different';
  })();

  // Map diffs: for 'better'/'worse' (which means left is better/worse), right is the opposite
  const diffLeft = resDiff; // 'better' means left is better
  const diffRight: DiffResult = resDiff === 'better' ? 'worse' : resDiff === 'worse' ? 'better' : resDiff;

  const ligA = parseLigands(leftEntry.ligands);
  const ligB = parseLigands(rightEntry.ligands);
  const resQ_A = getResolutionQuality(leftEntry.resolution);
  const resQ_B = getResolutionQuality(rightEntry.resolution);
  const ifQ_A = getIfQuality(leftEntry.journalIf);
  const ifQ_B = getIfQuality(rightEntry.journalIf);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="bg-claude-surface dark:bg-[#242220] rounded-xl shadow-2xl w-full max-w-5xl mx-3 sm:mx-4 max-h-[92vh] flex flex-col border border-claude-border dark:border-[#4a4540]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-claude-border dark:border-[#3d3832] flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-claude-accent/10">
                  <GitMerge className="h-4 w-4 text-claude-accent" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-claude-text">Structure Comparison</h2>
                  <p className="text-[10px] text-claude-text-muted">Side-by-side analysis</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSwap}
                  className="h-7 text-[11px] gap-1.5 border-claude-border dark:border-[#3d3832] text-claude-text-secondary hover:text-claude-text"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  Swap
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  className="h-7 text-[11px] gap-1.5 border-claude-border dark:border-[#3d3832] text-claude-text-secondary hover:text-claude-text"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Download className="h-3.5 w-3.5" />}
                  {copied ? 'Copied!' : 'Export'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-7 w-7 p-0 text-claude-text-muted hover:text-claude-text"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* ── Entry Headers ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-5 py-3 border-b border-claude-border/50 dark:border-[#3d3832]/50 flex-shrink-0">
              {/* Left Entry Header */}
              <div className="flex items-center gap-3 p-3 rounded-lg border border-claude-border dark:border-[#3d3832] bg-claude-bg/50 dark:bg-[#1a1917]/50 backdrop-blur-card">
                <a
                  href={`https://www.rcsb.org/structure/${leftEntry.pdbId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono font-bold text-base text-claude-accent hover:underline flex items-center gap-1.5"
                >
                  {leftEntry.pdbId}
                  <ExternalLink className="h-3 w-3 opacity-50" />
                </a>
                <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${getMethodColor(leftEntry.method).bg} ${getMethodColor(leftEntry.method).text} border ${getMethodColor(leftEntry.method).border}`}>
                  {getMethodLabel(leftEntry.method)}
                </span>
                {leftEntry.resolution != null && (
                  <span className={`text-[10px] font-mono ${getResolutionColor(leftEntry.resolution)}`}>
                    {leftEntry.resolution.toFixed(2)}Å
                  </span>
                )}
              </div>
              {/* Right Entry Header */}
              <div className="flex items-center gap-3 p-3 rounded-lg border border-claude-border dark:border-[#3d3832] bg-claude-bg/50 dark:bg-[#1a1917]/50 backdrop-blur-card">
                <a
                  href={`https://www.rcsb.org/structure/${rightEntry.pdbId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono font-bold text-base text-claude-accent hover:underline flex items-center gap-1.5"
                >
                  {rightEntry.pdbId}
                  <ExternalLink className="h-3 w-3 opacity-50" />
                </a>
                <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${getMethodColor(rightEntry.method).bg} ${getMethodColor(rightEntry.method).text} border ${getMethodColor(rightEntry.method).border}`}>
                  {getMethodLabel(rightEntry.method)}
                </span>
                {rightEntry.resolution != null && (
                  <span className={`text-[10px] font-mono ${getResolutionColor(rightEntry.resolution)}`}>
                    {rightEntry.resolution.toFixed(2)}Å
                  </span>
                )}
              </div>
            </div>

            {/* ── Scrollable Content ── */}
            <div className="flex-1 overflow-y-auto px-5 py-4 custom-scrollbar space-y-2.5">
              {/* VS Divider */}
              <div className="relative flex items-center justify-center mb-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-claude-border-light dark:border-[#3d3832]" />
                </div>
                <div className="relative z-10 px-3 py-0.5 rounded-full bg-claude-accent text-white text-[10px] font-bold tracking-widest">
                  VS
                </div>
              </div>

              {/* Method */}
              <ComparisonField
                icon={Microscope}
                label="Method"
                valueA={
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${getMethodColor(leftEntry.method).bg} ${getMethodColor(leftEntry.method).text}`}>
                    {getMethodLabel(leftEntry.method)}
                  </span>
                }
                valueB={
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${getMethodColor(rightEntry.method).bg} ${getMethodColor(rightEntry.method).text}`}>
                    {getMethodLabel(rightEntry.method)}
                  </span>
                }
                diffLeft={methodDiff === 'same' ? 'same' : 'different'}
                diffRight={methodDiff === 'same' ? 'same' : 'different'}
              />

              {/* Resolution with quality indicator */}
              <ComparisonField
                icon={Ruler}
                label="Resolution"
                valueA={leftEntry.resolution != null ? leftEntry.resolution.toFixed(2) + ' Å' : 'N/A'}
                valueB={rightEntry.resolution != null ? rightEntry.resolution.toFixed(2) + ' Å' : 'N/A'}
                diffLeft={resDiff}
                diffRight={resDiff === 'better' ? 'worse' : resDiff === 'worse' ? 'better' : resDiff}
                renderValue={(val, side) => {
                  const entry = side === 'left' ? leftEntry : rightEntry;
                  const resQ = side === 'left' ? resQ_A : resQ_B;
                  return (
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{val}</span>
                      {entry.resolution != null && (
                        <span className={`text-[9px] px-1.5 py-0 rounded-full font-medium ${resQ.color} bg-current/10`}>
                          {resQ.label}
                        </span>
                      )}
                    </div>
                  );
                }}
              />

              {/* Impact Factor with quality indicator */}
              <ComparisonField
                icon={TrendingUp}
                label="Impact Factor"
                valueA={leftEntry.journalIf != null ? leftEntry.journalIf.toFixed(1) : 'N/A'}
                valueB={rightEntry.journalIf != null ? rightEntry.journalIf.toFixed(1) : 'N/A'}
                diffLeft={ifDiff}
                diffRight={ifDiff === 'better' ? 'worse' : ifDiff === 'worse' ? 'better' : ifDiff}
                renderValue={(val, side) => {
                  const entry = side === 'left' ? leftEntry : rightEntry;
                  const ifQ = side === 'left' ? ifQ_A : ifQ_B;
                  return (
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{val}</span>
                      {entry.journalIf != null && (
                        <span className={`text-[9px] px-1.5 py-0 rounded-full font-medium ${ifQ.color} bg-current/10`}>
                          {ifQ.label}
                        </span>
                      )}
                    </div>
                  );
                }}
              />

              {/* Organism */}
              <ComparisonField
                icon={Globe}
                label="Organism"
                valueA={leftEntry.organisms ? leftEntry.organisms.replace(/\|/g, ', ') : 'N/A'}
                valueB={rightEntry.organisms ? rightEntry.organisms.replace(/\|/g, ', ') : 'N/A'}
                diffLeft={organismDiff === 'same' ? 'same' : 'different'}
                diffRight={organismDiff === 'same' ? 'same' : 'different'}
              />

              {/* Title */}
              <ComparisonField
                icon={BookOpen}
                label="Title"
                valueA={leftEntry.title || 'N/A'}
                valueB={rightEntry.title || 'N/A'}
                diffLeft={titleDiff === 'same' ? 'same' : 'different'}
                diffRight={titleDiff === 'same' ? 'same' : 'different'}
              />

              {/* Ligands with expandable list */}
              <ComparisonField
                icon={FlaskConical}
                label="Ligands"
                valueA={ligA.length}
                valueB={ligB.length}
                diffLeft={ligandsDiff === 'same' ? 'same' : 'different'}
                diffRight={ligandsDiff === 'same' ? 'same' : 'different'}
                renderValue={(_val, side) => {
                  const ligands = side === 'left' ? ligA : ligB;
                  return <ExpandableLigands ligands={ligands} />;
                }}
              />

              {/* Release Date */}
              <ComparisonField
                icon={Calendar}
                label="Release Date"
                valueA={formatDate(leftEntry.releaseDate)}
                valueB={formatDate(rightEntry.releaseDate)}
                diffLeft={dateDiff === 'same' ? 'same' : 'different'}
                diffRight={dateDiff === 'same' ? 'same' : 'different'}
              />

              {/* Journal */}
              <ComparisonField
                icon={BookOpen}
                label="Journal"
                valueA={leftEntry.journal || 'N/A'}
                valueB={rightEntry.journal || 'N/A'}
                diffLeft={journalDiff === 'same' ? 'same' : 'different'}
                diffRight={journalDiff === 'same' ? 'same' : 'different'}
              />

              {/* Authors (if available) */}
              {(leftEntry.authors || rightEntry.authors) && (
                <ComparisonField
                  icon={Hash}
                  label="Authors"
                  valueA={leftEntry.authors ? leftEntry.authors.replace(/\|/g, ', ').split(',').slice(0, 5).join(', ') + (leftEntry.authors.split(/[,|]/).length > 5 ? ' et al.' : '') : 'N/A'}
                  valueB={rightEntry.authors ? rightEntry.authors.replace(/\|/g, ', ').split(',').slice(0, 5).join(', ') + (rightEntry.authors.split(/[,|]/).length > 5 ? ' et al.' : '') : 'N/A'}
                  diffLeft={compareText(leftEntry.authors ?? null, rightEntry.authors ?? null) === 'same' ? 'same' : 'different'}
                  diffRight={compareText(leftEntry.authors ?? null, rightEntry.authors ?? null) === 'same' ? 'same' : 'different'}
                />
              )}

              {/* ── Quality Score Comparison ── */}
              <div className="mt-4 pt-4 border-t border-claude-border/50 dark:border-[#3d3832]/50">
                <h3 className="text-[11px] font-semibold text-claude-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                  <TrendingUp className="h-3 w-3" />
                  Quality Score Comparison
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Entry Quality */}
                  <div className="p-3 rounded-lg border border-claude-border dark:border-[#3d3832] space-y-2.5 card-hover-3d">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sm text-claude-accent">{leftEntry.pdbId}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ backgroundColor: qsA.color + '18', color: qsA.color }}>
                        {qsA.label} ({qsA.total})
                      </span>
                    </div>
                    <QualityBar score={qsA.resolutionScore} color={qsA.color} label="Resolution" />
                    <QualityBar score={qsA.methodScore} color={qsA.color} label="Method" />
                    <QualityBar score={qsA.ifScore} color={qsA.color} label="Impact Factor" />
                  </div>
                  {/* Right Entry Quality */}
                  <div className="p-3 rounded-lg border border-claude-border dark:border-[#3d3832] space-y-2.5 card-hover-3d">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sm text-claude-accent">{rightEntry.pdbId}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ backgroundColor: qsB.color + '18', color: qsB.color }}>
                        {qsB.label} ({qsB.total})
                      </span>
                    </div>
                    <QualityBar score={qsB.resolutionScore} color={qsB.color} label="Resolution" />
                    <QualityBar score={qsB.methodScore} color={qsB.color} label="Method" />
                    <QualityBar score={qsB.ifScore} color={qsB.color} label="Impact Factor" />
                  </div>
                </div>

                {/* Score difference indicator */}
                {qsA.total !== qsB.total && (
                  <div className="mt-3 flex items-center justify-center gap-2 text-[10px]">
                    <span className="text-claude-text-muted">Score difference:</span>
                    <span className={`font-bold ${qsA.total > qsB.total ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                      {qsA.total > qsB.total ? leftEntry.pdbId : rightEntry.pdbId} leads by {Math.abs(qsA.total - qsB.total)} points
                    </span>
                  </div>
                )}
              </div>

              {/* Legend */}
              <div className="mt-3 pt-3 border-t border-claude-border/50 dark:border-[#3d3832]/50 flex flex-wrap items-center gap-3 text-[10px] text-claude-text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30" />
                  Better
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded bg-red-50 dark:bg-red-900/15 border border-red-200 dark:border-red-800/30" />
                  Worse
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800/30" />
                  Different
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded border border-claude-border-light dark:border-[#3d3832]" />
                  Same
                </span>
                <span className="ml-auto italic">Lower resolution = better · Higher IF = better</span>
              </div>
            </div>

            {/* ── Footer ── */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-claude-border dark:border-[#3d3832] flex-shrink-0">
              <div className="text-[10px] text-claude-text-muted">
                Comparing <span className="font-mono font-semibold text-claude-accent">{leftEntry.pdbId}</span> vs <span className="font-mono font-semibold text-claude-accent">{rightEntry.pdbId}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="text-[11px] h-7 border-claude-border dark:border-[#3d3832]"
                >
                  Clear Comparison
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={onClose}
                  className="text-[11px] h-7 bg-claude-accent hover:bg-claude-accent-hover text-white"
                >
                  Close
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
