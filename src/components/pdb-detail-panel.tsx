'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  X,
  ChevronRight,
  ExternalLink,
  Loader2,
  Trash2,
  StickyNote,
  Copy,
  Bookmark,
  BookmarkCheck,
  Target,
  Microscope,
  TrendingUp,
  FlaskConical,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Settings,
  Tag,
  Share2,
  GitMerge,
  ClipboardCopy,
  MoreHorizontal,
  LayoutDashboard,
  Box,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { StructureAnalysisSection } from './StructureAnalysisSection';
import { EntityPanel } from './entity-panel';
import { LigandTooltipContent } from '@/components/pdb-tooltips';
import { QualityRing } from '@/components/quality-components';
import { TagPill } from '@/components/ui/pdb-ui';
import {
  safeNum,
  generateTags,
  computeQualityScore,
} from '@/lib/pdb-utils';
import { toast } from 'sonner';
import {
  getMethodColor,
  getMethodLabel,
  getResolutionColor,
  getIfTierStyle,
  formatDate,
  parseLigands,
} from './pdb-helpers';
import type { EntityInfo, ViewerActions } from './molecule-viewer';
import type {
  PdbEntry,
  EvalPdbStructure,
  LigandInfo,
} from '@/lib/pdb-types';

// ─── Dynamic import for MoleculeViewer (same as parent) ──────────────────
const MoleculeViewer = dynamic(() => import('./molecule-viewer').catch(() => {
  return { default: function MoleculeViewerFallback({ pdbId }: { pdbId: string }) {
    return (
      <div className="relative w-full h-[300px] rounded-lg overflow-hidden bg-[#f5f0eb] dark:bg-[#3d3832] border border-claude-border dark:border-[#4a4540] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-center px-6">
          <svg width="48" height="48" viewBox="0 0 64 64" fill="none" className="opacity-60">
            <circle cx="32" cy="32" r="8" fill="#d4784f" opacity="0.9" />
            <line x1="38" y1="27" x2="50" y2="16" stroke="#c9872e" strokeWidth="2" strokeLinecap="round" />
            <circle cx="52" cy="14" r="5" fill="#c9872e" opacity="0.7" />
            <line x1="38" y1="37" x2="52" y2="46" stroke="#2d8f8f" strokeWidth="2" strokeLinecap="round" />
            <circle cx="54" cy="48" r="5" fill="#2d8f8f" opacity="0.7" />
            <line x1="24" y1="32" x2="12" y2="32" stroke="#7c5cbf" strokeWidth="2" strokeLinecap="round" />
            <circle cx="10" cy="32" r="5" fill="#7c5cbf" opacity="0.7" />
          </svg>
          <span className="text-[12px] font-medium text-claude-text dark:text-[#e8e4dd]">3D viewer unavailable</span>
          <span className="text-[10px] text-claude-text-muted dark:text-[#9b9590]">Module failed to load</span>
          <a href={`https://www.rcsb.org/structure/${pdbId}`} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-claude-border-light dark:bg-[#2b2926] hover:bg-claude-border dark:hover:bg-[#3d3832] border border-claude-border dark:border-[#4a4540] text-[11px] font-medium text-claude-accent transition-colors duration-200">
            View on RCSB PDB
          </a>
        </div>
      </div>
    );
  }};
}), {
  ssr: false,
  loading: () => (
    <div className="relative w-full h-[300px] rounded-lg overflow-hidden bg-[#f5f0eb] dark:bg-[#3d3832] border border-claude-border dark:border-[#4a4540] flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="h-6 w-6 border-2 border-claude-accent border-t-transparent rounded-full animate-spin" />
        <span className="text-[11px] text-claude-text-muted">Loading 3D viewer…</span>
      </div>
    </div>
  ),
});

// ─── Types ────────────────────────────────────────────────────────────────

interface EntryAnnotation {
  tags: string[];
  notes: string;
}

type DetailTab = 'overview' | 'structure' | 'analysis' | 'notes';

export interface PdbDetailPanelProps {
  // Visibility & selection
  detailPanelOpen: boolean;
  setDetailPanelOpen: (open: boolean) => void;
  selectedEntry: PdbEntry | null;
  setSelectedEntry: (entry: PdbEntry | null) => void;
  selectedEvalStructure: (EvalPdbStructure & { isBlast?: boolean }) | null;
  setSelectedEvalStructure: (s: (EvalPdbStructure & { isBlast?: boolean }) | null) => void;

  // Navigation
  paginatedEntries: PdbEntry[];
  setDetailSlideDirection: (dir: 'left' | 'right' | null) => void;
  detailSlideDirection: 'left' | 'right' | null;
  focusedRowIndex: number | null;
  setFocusedRowIndex: (idx: number | null) => void;

  // Responsive
  isMobile: boolean;
  bottomSheetSnap: number;
  setBottomSheetSnap: (snap: number) => void;

  // Context
  selectedWeekId: string | null;
  diffMode: boolean;
  diffResult: { newIds: Set<string>; removedIds: Set<string>; changedIds: Set<string> };

  // Bookmarks & notes
  bookmarks: Set<string>;
  structureNotes: Record<string, string>;
  addNote: (pdbId: string, note: string) => void;
  deleteNote: (pdbId: string) => void;
  updateNote: (pdbId: string, note: string) => void;
  toggleBookmark: (pdbId: string) => void;

  // Comparison
  entryComparison: { entryA: PdbEntry | null; entryB: PdbEntry | null };
  setEntryComparison: (c: { entryA: PdbEntry | null; entryB: PdbEntry | null }) => void;
  setEntryCompareModalOpen: (open: boolean) => void;
  toggleEntryCompare: (entry: PdbEntry) => void;

  // Annotations
  annotations: Record<string, EntryAnnotation>;
  addTag: (pdbId: string, tag: string) => void;
  removeTag: (pdbId: string, tag: string) => void;
  updateAnnotationNotes: (pdbId: string, notes: string) => void;

  // AI summaries
  aiSummaries: Record<string, string>;
  aiSummaryLoading: string | null;
  aiSummaryError: string | null;
  generateAiSummary: (entry: PdbEntry) => void;

  // Notes indicator
  noteSavedIndicator: string | null;

  // 3D Viewer state
  viewerActionsRef: React.RefObject<ViewerActions | null>;
  selectedPdbId: string | null;
  setSelectedPdbId: (id: string | null) => void;
  entities: EntityInfo[];
  setEntities: (ents: EntityInfo[]) => void;
  entityColors: Record<string, string>;
  setEntityColors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  ligandColors: Record<string, string>;
  setLigandColors: (colors: Record<string, string>) => void;
  ligandVisibility: Record<string, boolean>;
  selectedEntity: string | null;
  selectedLigand: string | null;
  hoveredEntity: string | null;
  hoveredLigand: string | null;
  soloLigand: string | null;
  entityVisibility: Record<string, boolean>;
  setEntityVisibility: (v: Record<string, boolean>) => void;
  soloEntity: string | null;
  ligandCodes: string[];
  setLigandCodes: (codes: string[]) => void;
  representation: 'cartoon' | 'ball-stick' | 'surface';
  setRepresentation: (r: 'cartoon' | 'ball-stick' | 'surface') => void;
  hoveredEntityFrom3D: boolean;
  hoveredLigandFrom3D: boolean;
  ligandCache: Record<string, { name?: string; formula?: string; weight?: string; type?: string; [key: string]: unknown }>;

  // 3D Viewer handlers
  handleEntityClick: (entityKey: string) => void;
  handleEntityHoverFromPanel: (entityKey: string | null) => void;
  handleEntityHoverFrom3D: (entityKey: string | null) => void;
  handleEntityColorChange: (entityId: string, color: string) => void;
  handleLigandClick: (code: string) => void;
  handleLigandHoverFromPanel: (code: string | null) => void;
  handleLigandHoverFrom3D: (code: string | null) => void;
  handleLigandColorChange: (code: string, color: string) => void;
  handleEntityVisibilityChange: (entityKey: string, visible: boolean) => void;
  handleLigandFocus: (code: string) => void;
  handleSoloLigand: (code: string | null) => void;
  handleResetView: () => void;
  handleEntityFocus: (entityKey: string) => void;
  handleSoloEntity: (entityKey: string | null) => void;
  handleResidueClick: (chainId: string, residueNumber: number) => void;
  handleFocusIn3D: (entityKey: string) => void;
}

// ─── Helper: build the effective entry from selectedEntry or selectedEvalStructure ──
function buildEffectiveEntry(
  selectedEntry: PdbEntry | null,
  selectedEvalStructure: (EvalPdbStructure & { isBlast?: boolean }) | null,
): PdbEntry | null {
  if (selectedEntry) return selectedEntry;
  if (!selectedEvalStructure) return null;
  return {
    pdbId: selectedEvalStructure.pdbId ?? '',
    title: selectedEvalStructure.title || '',
    method: selectedEvalStructure.method || '',
    resolution: selectedEvalStructure.resolution ?? null,
    ifTier: '',
    ligands: selectedEvalStructure.ligand || '',
    date: selectedEvalStructure.releaseDate || '',
    authors: (selectedEvalStructure as any).pubmedAuthors || '',
    releaseDate: '',
    classification: '',
    organisms: null,
    journal: selectedEvalStructure.journal || '',
    journalIf: selectedEvalStructure.journalIf ?? null,
    pubmedAuthors: (selectedEvalStructure as any).pubmedAuthors || null,
    pubmedAbstract: (selectedEvalStructure as any).pubmedAbstract || null,
    doi: (selectedEvalStructure as any).doi || null,
    isCryoem: (selectedEvalStructure.method || '').toLowerCase().includes('electron'),
    isXray: (selectedEvalStructure.method || '').toLowerCase().includes('x-ray'),
  } as unknown as PdbEntry;
}

// ─── Component ────────────────────────────────────────────────────────────

export function PdbDetailPanel({
  detailPanelOpen,
  setDetailPanelOpen,
  selectedEntry,
  setSelectedEntry,
  selectedEvalStructure,
  setSelectedEvalStructure,
  paginatedEntries,
  setDetailSlideDirection,
  detailSlideDirection,
  focusedRowIndex,
  setFocusedRowIndex,
  isMobile,
  bottomSheetSnap,
  setBottomSheetSnap,
  selectedWeekId,
  diffMode,
  diffResult,
  bookmarks,
  structureNotes,
  addNote,
  deleteNote,
  updateNote,
  toggleBookmark,
  entryComparison,
  setEntryComparison,
  setEntryCompareModalOpen,
  toggleEntryCompare,
  annotations,
  addTag,
  removeTag,
  updateAnnotationNotes,
  aiSummaries,
  aiSummaryLoading,
  aiSummaryError,
  generateAiSummary,
  noteSavedIndicator,
  viewerActionsRef,
  selectedPdbId,
  setSelectedPdbId,
  entities,
  setEntities,
  entityColors,
  setEntityColors,
  ligandColors,
  setLigandColors,
  ligandVisibility,
  selectedEntity,
  selectedLigand,
  hoveredEntity,
  hoveredLigand,
  soloLigand,
  entityVisibility,
  setEntityVisibility,
  soloEntity,
  ligandCodes,
  setLigandCodes,
  representation,
  setRepresentation,
  hoveredEntityFrom3D,
  hoveredLigandFrom3D,
  ligandCache,
  handleEntityClick,
  handleEntityHoverFromPanel,
  handleEntityHoverFrom3D,
  handleEntityColorChange,
  handleLigandClick,
  handleLigandHoverFromPanel,
  handleLigandHoverFrom3D,
  handleLigandColorChange,
  handleEntityVisibilityChange,
  handleLigandFocus,
  handleSoloLigand,
  handleResetView,
  handleEntityFocus,
  handleSoloEntity,
  handleResidueClick,
  handleFocusIn3D,
}: PdbDetailPanelProps) {
  // ── Tab state ──
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');

  if (!detailPanelOpen || (!selectedEntry && !selectedEvalStructure)) return null;

  const effectiveEntry = buildEffectiveEntry(selectedEntry, selectedEvalStructure);
  if (!effectiveEntry) return null;

  // Helper: navigate to prev/next entry in the current table
  const currentEntryIndex = paginatedEntries.findIndex(e => e.pdbId === effectiveEntry.pdbId);
  const canNavigatePrev = currentEntryIndex > 0;
  const canNavigateNext = currentEntryIndex >= 0 && currentEntryIndex < paginatedEntries.length - 1;
  const navigateToEntry = (direction: 'prev' | 'next') => {
    if (currentEntryIndex < 0) return;
    const nextIdx = direction === 'prev'
      ? Math.max(0, currentEntryIndex - 1)
      : Math.min(paginatedEntries.length - 1, currentEntryIndex + 1);
    const nextEntry = paginatedEntries[nextIdx];
    if (nextEntry && nextEntry.pdbId !== effectiveEntry.pdbId) {
      setDetailSlideDirection(direction === 'prev' ? 'right' : 'left');
      setTimeout(() => {
        setSelectedEntry(nextEntry);
        setSelectedEvalStructure(null);
        setDetailSlideDirection(null);
      }, 150);
      if (focusedRowIndex !== null) setFocusedRowIndex(nextIdx);
    }
  };

  // Quality score for header
  const qs = computeQualityScore(effectiveEntry);

  // Compute detailLigands once for the detail panel
  const detailLigands = parseLigands(effectiveEntry.ligands);

  // Quick action handlers
  const isBookmarked = bookmarks.has(effectiveEntry.pdbId);
  const hasNote = !!structureNotes[effectiveEntry.pdbId];
  const isInComparison = entryComparison.entryA?.pdbId === effectiveEntry.pdbId || entryComparison.entryB?.pdbId === effectiveEntry.pdbId;

  const handleCopyPdbId = () => {
    navigator.clipboard.writeText(effectiveEntry.pdbId).then(() => toast('Copied PDB ID')).catch(() => {});
  };
  const handleOpenRcsb = () => {
    window.open(`https://www.rcsb.org/structure/${effectiveEntry.pdbId}`, '_blank', 'noopener,noreferrer');
  };
  const handleToggleBookmark = () => {
    toggleBookmark(effectiveEntry.pdbId);
  };
  const handleAddNote = () => {
    const existing = structureNotes[effectiveEntry.pdbId] || '';
    const note = prompt(existing ? 'Edit note:' : 'Add note:', existing);
    if (note !== null && note.trim()) {
      addNote(effectiveEntry.pdbId, note.trim());
    } else if (note !== null && !note.trim() && existing) {
      deleteNote(effectiveEntry.pdbId);
    }
  };
  const handleCompare = () => {
    toggleEntryCompare(effectiveEntry);
    if (isInComparison) {
      toast('Removed from comparison');
    } else if (entryComparison.entryA) {
      toast('Ready to compare!', { description: `${entryComparison.entryA.pdbId} vs ${effectiveEntry.pdbId}` });
      setEntryCompareModalOpen(true);
    } else {
      toast('Entry selected for comparison', { description: 'Select one more entry to compare' });
    }
  };
  const handleShare = () => {
    const res = effectiveEntry.resolution != null ? `${effectiveEntry.resolution.toFixed(2)}Å` : 'N/A';
    const method = getMethodLabel(effectiveEntry.method || '');
    const ifVal = effectiveEntry.journalIf != null ? `IF ${effectiveEntry.journalIf.toFixed(1)}` : '';
    const title = effectiveEntry.title || '';
    const text = `${effectiveEntry.pdbId} | ${method} | ${res}${ifVal ? ' | ' + ifVal : ''}${title ? ' | ' + title : ''}\nhttps://www.rcsb.org/structure/${effectiveEntry.pdbId}`;
    navigator.clipboard.writeText(text).then(() => toast('Copied shareable info')).catch(() => {});
  };

  // ── Tab definitions ──
  const tabs: { id: DetailTab; label: string; icon: React.ReactNode; badge?: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-3.5 w-3.5" /> },
    { id: 'structure', label: 'Structure', icon: <Box className="h-3.5 w-3.5" />, badge: entities.length > 0 ? <span className="ml-1 text-[8px] px-1 py-0 rounded-full bg-claude-accent/15 text-claude-accent font-semibold leading-none">{entities.length}</span> : undefined },
    { id: 'analysis', label: 'Analysis', icon: <Sparkles className="h-3.5 w-3.5" />, badge: aiSummaries[effectiveEntry.pdbId] ? <span className="ml-1 text-[7px] px-1 py-0 rounded-full bg-claude-xray/15 text-claude-xray font-bold leading-none">AI</span> : undefined },
    { id: 'notes', label: 'Notes', icon: <StickyNote className="h-3.5 w-3.5" />, badge: structureNotes[effectiveEntry.pdbId] ? <span className="ml-1 w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" /> : undefined },
  ];

  // ── Content slide direction class ──
  const contentSlideClass = detailSlideDirection === 'left'
    ? 'detail-content-slide-left'
    : detailSlideDirection === 'right'
      ? 'detail-content-slide-right'
      : 'detail-content-fade';

  // ═══════════════════════════════════════════════════════════════════════
  // ── OVERVIEW TAB CONTENT ──
  // ═══════════════════════════════════════════════════════════════════════
  const overviewContent = (
    <div className="space-y-4">
      {/* Quick Stats Bar */}
      <div className="glass-card flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg">
        {effectiveEntry.resolution != null && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                effectiveEntry.resolution <= 2
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : effectiveEntry.resolution <= 3
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
              }`}>
                <Target className="h-3 w-3" />
                {effectiveEntry.resolution.toFixed(2)}Å
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[10px]">Resolution</TooltipContent>
          </Tooltip>
        )}
        {effectiveEntry.method && (() => {
          const mc = getMethodColor(effectiveEntry.method);
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${mc.bg} ${mc.text} ${mc.border} border`}>
                  <Microscope className="h-3 w-3" />
                  {getMethodLabel(effectiveEntry.method)}
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">Method</TooltipContent>
            </Tooltip>
          );
        })()}
        {effectiveEntry.journalIf != null && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                effectiveEntry.journalIf >= 20
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  : effectiveEntry.journalIf >= 10
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}>
                <TrendingUp className="h-3 w-3" />
                IF {effectiveEntry.journalIf.toFixed(1)}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[10px]">Impact Factor</TooltipContent>
          </Tooltip>
        )}
        {detailLigands.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                <FlaskConical className="h-3 w-3" />
                {detailLigands.length} ligand{detailLigands.length !== 1 ? 's' : ''}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[10px]">{detailLigands.length} ligand{detailLigands.length !== 1 ? 's' : ''} detected</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Tags Section */}
      <div className="flex items-center gap-2 flex-wrap">
        <Tag className="h-3.5 w-3.5 text-claude-text-muted flex-shrink-0" />
        <span className="text-[10px] text-claude-text-muted uppercase tracking-wider font-semibold">Tags</span>
        {annotations[effectiveEntry.pdbId]?.tags && annotations[effectiveEntry.pdbId].tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {annotations[effectiveEntry.pdbId].tags.map((tag, i) => {
              const tagColors = [
                'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
                'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
                'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
                'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
                'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
              ];
              return (
                <span
                  key={tag}
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${tagColors[i % tagColors.length]} tag-hover-lift`}
                >
                  {tag}
                </span>
              );
            })}
          </div>
        ) : (
          <span className="text-[10px] text-claude-text-muted italic">No tags yet</span>
        )}
      </div>

      {/* Info Grid - 2 column compact layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Left column */}
        <div className="space-y-2">
          {/* Assembly + Polymers + Ligands + Organism */}
          <div className="p-2.5 rounded-lg bg-claude-border-light/30 dark:bg-[#1a1917]/60">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <div className="text-[8px] text-claude-text-muted uppercase tracking-wider">Assembly</div>
                <div className="text-[11px] font-medium font-mono text-claude-text truncate">—</div>
              </div>
              <div>
                <div className="text-[8px] text-claude-text-muted uppercase tracking-wider">Polymers</div>
                <div className="text-[11px] font-medium text-claude-text">{effectiveEntry.isCryoem ? 'Cryo-EM' : effectiveEntry.isXray ? 'X-Ray' : '—'}</div>
              </div>
              <div>
                <div className="text-[8px] text-claude-text-muted uppercase tracking-wider">Ligands</div>
                <div className="text-[11px] font-medium text-claude-text">{detailLigands.length || '—'}</div>
              </div>
            </div>
            {effectiveEntry.organisms && (
              <div className="mt-1.5">
                <div className="text-[8px] text-claude-text-muted uppercase tracking-wider">Organism</div>
                <div className="text-[10px] text-claude-text italic truncate">{effectiveEntry.organisms.split('|')[0]?.trim() || '—'}</div>
              </div>
            )}
            <div>
              <div className="text-[8px] text-claude-text-muted uppercase tracking-wider">Resolution</div>
              <div className="flex items-center gap-1.5">
                <div className="flex-1 h-1.5 bg-claude-border-light dark:bg-claude-border rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(5, Math.min(100, (1 - ((effectiveEntry.resolution ?? 3.5) - 0.5) / 4.5) * 100))}%`,
                      backgroundColor: (effectiveEntry.resolution ?? 4) <= 2.0 ? '#16a34a' : (effectiveEntry.resolution ?? 4) <= 3.5 ? '#c9872e' : '#dc2626',
                    }}
                  />
                </div>
                <span className="text-[9px] text-claude-text-muted">{(effectiveEntry.resolution ?? 4) <= 1.5 ? 'Excellent' : (effectiveEntry.resolution ?? 4) <= 2.0 ? 'High' : (effectiveEntry.resolution ?? 4) <= 3.0 ? 'Med' : (effectiveEntry.resolution ?? 4) <= 3.5 ? 'Low' : 'VLow'}</span>
              </div>
            </div>
          </div>

          {/* Journal + IF */}
          {effectiveEntry.journal && (
            <div className="p-2.5 rounded-lg bg-claude-border-light/30 dark:bg-[#1a1917]/60">
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0 flex-1">
                  <div className="text-[8px] text-claude-text-muted uppercase tracking-wider mb-0.5">Journal</div>
                  <div className="text-[10px] text-claude-text-secondary leading-snug truncate">{effectiveEntry.journal}</div>
                </div>
                {effectiveEntry.journalIf != null && (
                  <span className={`flex-shrink-0 text-[9px] px-1 py-0.5 rounded font-medium ${getIfTierStyle(effectiveEntry.ifTier).bg} ${getIfTierStyle(effectiveEntry.ifTier).text}`}>
                    IF {safeNum(effectiveEntry.journalIf, '1')}
                  </span>
                )}
              </div>
              {effectiveEntry.authors && (
                <div className="mt-1 text-[9px] text-claude-text-muted truncate">{effectiveEntry.authors.replace(/\|/g, ', ')}</div>
              )}
            </div>
          )}

          {/* Abstract */}
          {effectiveEntry.pubmedAbstract && (
            <div className="p-2.5 rounded-lg bg-claude-border-light/30 dark:bg-[#1a1917]/60">
              <div className="text-[8px] text-claude-text-muted uppercase tracking-wider mb-1">Abstract</div>
              <p className="text-[10px] text-claude-text-secondary leading-relaxed line-clamp-4">{effectiveEntry.pubmedAbstract}</p>
            </div>
          )}

          {/* Dates */}
          <div className="p-2.5 rounded-lg bg-claude-border-light/30 dark:bg-[#1a1917]/60">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <div className="text-[8px] text-claude-text-muted uppercase tracking-wider">Released</div>
                <div className="text-[10px] text-claude-text">{formatDate(effectiveEntry.releaseDate)}</div>
              </div>
              <div>
                <div className="text-[8px] text-claude-text-muted uppercase tracking-wider">Week</div>
                <div className="text-[10px] font-mono text-claude-text-secondary">{effectiveEntry.weekId}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-2">
          {/* Ligands Detail */}
          {detailLigands.length > 0 && (
            <div className="p-2.5 rounded-lg bg-claude-border-light/30 dark:bg-[#1a1917]/60">
              <div className="text-[8px] text-claude-text-muted uppercase tracking-wider mb-1.5">Ligands ({detailLigands.length})</div>
              <div className="space-y-1 max-h-36 overflow-y-auto custom-scrollbar">
                {detailLigands.map((lig, i) => (
                  <HoverCard key={`detail-lig-${i}-${lig}`} openDelay={200} closeDelay={100}>
                    <HoverCardTrigger asChild>
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-claude-border-light/50 dark:bg-[#2b2926] hover:bg-claude-accent/10 cursor-pointer transition-colors">
                        <span className="text-[10px] font-mono font-semibold text-claude-accent">{lig}</span>
                        {ligandCache[lig] && (
                          <span className="text-[8px] text-claude-text-muted truncate flex-1">{ligandCache[lig].name || ''}</span>
                        )}
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent side="left" className="p-0 w-auto bg-white dark:bg-[#2b2926] border border-claude-border dark:border-[#4a4540] shadow-lg rounded-xl z-50">
                      {ligandCache[lig] ? (
                        <LigandTooltipContent ligand={ligandCache[lig] as unknown as LigandInfo} />
                      ) : (
                        <div className="p-3 flex items-center gap-2">
                          <Loader2 className="h-3 w-3 animate-spin text-claude-accent" />
                          <span className="text-xs text-claude-text-muted">Loading...</span>
                        </div>
                      )}
                    </HoverCardContent>
                  </HoverCard>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          <div className="flex flex-wrap gap-1">
            <a href={`https://www.rcsb.org/structure/${effectiveEntry.pdbId}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-claude-accent-light dark:bg-[#3d2a22] text-claude-accent hover:bg-claude-accent/20 transition-all external-link-hover">
              <ExternalLink className="h-2.5 w-2.5 ext-arrow" />RCSB
            </a>
            {effectiveEntry.doi && (
              <a href={effectiveEntry.doi.startsWith('http') ? effectiveEntry.doi : `https://doi.org/${effectiveEntry.doi}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-claude-xray-bg text-claude-xray hover:bg-claude-xray/20 transition-all external-link-hover">
                <ExternalLink className="h-2.5 w-2.5 ext-arrow" />DOI
              </a>
            )}
            {effectiveEntry.pubmedId && (
              <a href={`https://pubmed.ncbi.nlm.nih.gov/${effectiveEntry.pubmedId}/`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-claude-cryoem-bg text-claude-cryoem hover:bg-claude-cryoem/20 transition-all external-link-hover">
                <ExternalLink className="h-2.5 w-2.5 ext-arrow" />PubMed
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions Toolbar */}
      {(() => {
        const actionButtons = [
          { icon: <ClipboardCopy className="h-3.5 w-3.5" />, label: 'Copy PDB ID', onClick: handleCopyPdbId, active: false, activeIcon: undefined },
          { icon: <ExternalLink className="h-3.5 w-3.5" />, label: 'Open in RCSB', onClick: handleOpenRcsb, active: false, activeIcon: undefined },
          { icon: <Bookmark className="h-3.5 w-3.5" />, label: 'Bookmark', onClick: handleToggleBookmark, active: isBookmarked, activeIcon: <BookmarkCheck className="h-3.5 w-3.5" /> },
          { icon: <StickyNote className="h-3.5 w-3.5" />, label: hasNote ? 'Edit Note' : 'Add Note', onClick: handleAddNote, active: hasNote, activeIcon: undefined },
          { icon: <GitMerge className="h-3.5 w-3.5" />, label: 'Compare', onClick: handleCompare, active: isInComparison, activeIcon: undefined },
          { icon: <Share2 className="h-3.5 w-3.5" />, label: 'Share', onClick: handleShare, active: false, activeIcon: undefined },
        ];
        const desktopButtons = actionButtons.slice(0, 4);
        const mobileButtons = actionButtons.slice(0, 4);
        const mobileOverflow = actionButtons.slice(4);

        return (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            {/* Desktop: show 4 buttons with tooltips */}
            <div className="hidden sm:flex items-center gap-0.5">
              {desktopButtons.map((btn, i) => (
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={btn.onClick}
                      className={`inline-flex items-center justify-center h-7 px-2.5 rounded-md transition-colors duration-150 btn-press-subtle ${
                        btn.active
                          ? btn.label.includes('Bookmark')
                            ? 'text-claude-accent bg-claude-accent/10'
                            : btn.label.includes('Note')
                              ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
                              : 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20'
                          : 'text-claude-text-muted hover:text-claude-text hover:bg-claude-border-light dark:hover:bg-[#3d3832]'
                      }`}
                    >
                      {btn.active && btn.activeIcon ? btn.activeIcon : btn.icon}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[10px]">{btn.label}</TooltipContent>
                </Tooltip>
              ))}
            </div>
            {/* Mobile: show 4 + overflow */}
            <div className="flex sm:hidden items-center gap-0.5">
              {mobileButtons.map((btn, i) => (
                <button
                  key={i}
                  onClick={btn.onClick}
                  className={`inline-flex items-center justify-center h-7 w-7 rounded-md transition-colors duration-150 btn-press-subtle ${
                    btn.active
                      ? btn.label.includes('Bookmark')
                        ? 'text-claude-accent bg-claude-accent/10'
                        : btn.label.includes('Note')
                          ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
                          : 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20'
                      : 'text-claude-text-muted hover:text-claude-text hover:bg-claude-border-light dark:hover:bg-[#3d3832]'
                  }`}
                  title={btn.label}
                >
                  {btn.active && btn.activeIcon ? btn.activeIcon : btn.icon}
                </button>
              ))}
              {mobileOverflow.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="inline-flex items-center justify-center h-7 w-7 rounded-md text-claude-text-muted hover:text-claude-text hover:bg-claude-border-light dark:hover:bg-[#3d3832] transition-colors duration-150">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[140px]">
                    {mobileOverflow.map((btn, i) => (
                      <DropdownMenuItem key={i} onClick={btn.onClick} className="flex items-center gap-2 text-xs">
                        {btn.active && btn.activeIcon ? btn.activeIcon : btn.icon}
                        {btn.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // ── STRUCTURE TAB CONTENT ──
  // ═══════════════════════════════════════════════════════════════════════
  const structureContent = (
    <div className="space-y-4">
      {/* 3D Structure Viewer + Entity Panel Layout */}
      <div className="flex flex-col gap-3">
        {/* Viewer + EntityPanel side-by-side */}
        <div className="flex flex-col md:flex-row gap-3">
          {/* Viewer - takes ~65% width */}
          <div className="flex-1 min-w-0 rounded-lg overflow-hidden border border-claude-border dark:border-[#3d3832]">
          {selectedPdbId ? (
            <MoleculeViewer
              pdbId={selectedPdbId}
              highlightEntity={hoveredEntity}
              highlightLigand={hoveredLigand}
              entityColors={entityColors}
              ligandColors={ligandColors}
              ligandVisibility={ligandVisibility}
              selectedEntities={selectedEntity ? new Set([selectedEntity]) : undefined}
              selectedLigands={selectedLigand ? new Set([selectedLigand]) : undefined}
              soloLigand={soloLigand}
              entityVisibility={entityVisibility}
              soloEntity={soloEntity}
              onEntityClick={handleEntityClick}
              onLigandClick={handleLigandClick}
              onEntityHover={handleEntityHoverFrom3D}
              onLigandHover={handleLigandHoverFrom3D}
              onEntitiesLoaded={(ents) => {
                setEntities(ents);
                const ligs: string[] = [];
                const known = new Set<string>();
                const newColors: Record<string, string> = {};
                for (const e of ents) {
                  const mt = e.molecule_type.toLowerCase();
                  const maxLen = Math.max(...(e.chains.map(c => c.length ?? 0) || [0]), 0);
                  const isPoly = (mt === 'polypeptide(l)' || mt === 'polypeptide(d)') && maxLen > 10 || mt === 'polyribonucleotide' || mt === 'polydeoxyribonucleotide';
                  const isBound = mt.includes('bound') || mt === 'non-polymer';
                  if (isBound && !mt.includes('water')) {
                    for (const chem of e.chem_comp_ids || []) {
                      if (!known.has(chem) && known.add(chem)) ligs.push(chem);
                    }
                  }
                }
                let chainIdx = 0;
                const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];
                for (const e of ents) {
                  for (const chain of e.chains) {
                    const ek = `${selectedPdbId}.${chain.chain}`;
                    newColors[ek] = PALETTE[chainIdx % PALETTE.length];
                    chainIdx++;
                  }
                }
                setLigandCodes(ligs);
                if (Object.keys(newColors).length > 0) {
                  setEntityColors(prev => ({ ...prev, ...newColors }));
                }
              }}
              onLigandsDetected={(codes) => setLigandCodes(codes)}
              onEntityColorChange={handleEntityColorChange}
              onLigandColorChange={handleLigandColorChange}
              onResetColors={() => {
                entities.forEach((e, ei) => {
                  e.chains.forEach((c, ci) => {
                    handleEntityColorChange(`${selectedPdbId}.${c.chain}`, ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#ec4899','#14b8a6','#f97316','#6366f1'][(ei * e.chains.length + ci) % 10]);
                  });
                });
                ligandCodes.forEach((code, i) => {
                  handleLigandColorChange(code, ['#d69e2e','#e53e3e','#805ad5','#00b5d8','#d53f8c','#38a169','#dd6b20','#3182ce','#718096','#f6e05e'][i % 10]);
                });
              }}
              onToggleAllLigands={() => {
                const allVisible = ligandCodes.every(c => ligandVisibility[c] !== false);
                ligandCodes.forEach(code => handleEntityVisibilityChange(code, !allVisible));
              }}
              onRepresentationChange={setRepresentation}
              representation={representation}
              viewerActionsRef={viewerActionsRef}
            />
          ) : (
            <div className="h-[400px] flex items-center justify-center bg-claude-border-light/30">
              <span className="text-sm text-claude-text-muted">Loading 3D structure...</span>
            </div>
          )}
        </div>

          {/* EntityPanel - takes ~35% width */}
          {selectedPdbId && entities.length > 0 && (
            <div className="w-full md:w-[280px] md:flex-shrink-0 h-auto md:h-[calc(100vh-120px)] max-h-[400px] md:max-h-none overflow-y-auto">
              <EntityPanel
            pdbId={selectedPdbId}
            entities={entities}
            ligandCodes={ligandCodes}
            entityColors={entityColors}
            ligandColors={ligandColors}
            ligandVisibility={ligandVisibility}
            selectedEntity={selectedEntity}
            selectedLigand={selectedLigand}
            hoveredEntity={hoveredEntity}
            hoveredLigand={hoveredLigand}
            onEntityClick={handleEntityClick}
            onEntityHover={handleEntityHoverFromPanel}
            onEntityColorChange={handleEntityColorChange}
            onLigandClick={handleLigandClick}
            onLigandHover={handleLigandHoverFromPanel}
            onLigandColorChange={handleLigandColorChange}
            onLigandVisibilityChange={handleEntityVisibilityChange}
            onLigandFocus={handleLigandFocus}
            onSoloLigand={handleSoloLigand}
            onResetView={handleResetView}
            soloLigand={soloLigand}
            entityVisibility={entityVisibility}
            soloEntity={soloEntity}
            onEntityVisibilityChange={handleEntityVisibilityChange}
            onEntityFocus={handleEntityFocus}
            onSoloEntity={handleSoloEntity}
            onResidueClick={handleResidueClick}
            representation={representation}
            onRepresentationChange={setRepresentation}
            hoveredEntityFrom3D={hoveredEntityFrom3D}
            hoveredLigandFrom3D={hoveredLigandFrom3D}
            onFocusIn3D={handleFocusIn3D}
            onExportLigands={async () => {
              const ligandDetails: Record<string, { name: string; formula: string; weight: string; type: string }> = {};
              await Promise.all(ligandCodes.map(async (code) => {
                try {
                  const res = await fetch(`/api/ligand/${code}`);
                  if (res.ok) { const data = await res.json(); ligandDetails[code] = { name: data.name || '', formula: data.formula || '', weight: data.weight != null ? String(data.weight) : '', type: data.type || '' }; }
                } catch {}
              }));
              const headers = ['Code', 'Name', 'Formula', 'MW', 'Type', 'Visible', 'Color'];
              const escapeField = (value: string) => value.includes(',') || value.includes('"') || value.includes('\n') ? `"${value.replace(/"/g, '""')}"` : value;
              const rows = ligandCodes.map((code) => {
                const details = ligandDetails[code];
                return [escapeField(code), escapeField(details?.name || ''), escapeField(details?.formula || ''), escapeField(details?.weight || ''), escapeField(details?.type || ''), String(true), escapeField(ligandColors[code] || '')].join(',');
              });
              const csv = [headers.join(','), ...rows].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = `${selectedPdbId?.toUpperCase()}_ligands.csv`; a.click();
              URL.revokeObjectURL(url);
            }}
            onExportAll={() => {}}
            onLoadStructure={(pdbId: string) => setSelectedPdbId(pdbId)}
            collapsed={false}
            />
            </div>
          )}
        </div>

        {/* Structure Analysis Tabs - below viewer + entity panel */}
        {selectedPdbId && entities.length > 0 && (
          <StructureAnalysisSection
            pdbId={selectedPdbId}
            entities={entities}
            ligandCodes={ligandCodes}
            entityColors={entityColors}
            ligandColors={ligandColors}
          />
        )}
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // ── ANALYSIS TAB CONTENT ──
  // ═══════════════════════════════════════════════════════════════════════
  const analysisContent = (
    <div className="space-y-4">
      {/* Quality Score - Prominent */}
      <div className="glass-card p-4 rounded-lg flex flex-col items-center gap-3">
        <div className="flex items-center gap-1.5">
          <h3 className="text-[11px] font-semibold text-claude-text-muted uppercase tracking-wider">Quality Score</h3>
        </div>
        <div className="relative">
          <QualityRing score={qs.total} size={80} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold font-mono" style={{ color: qs.color }}>{qs.total}</span>
            <span className="text-[8px] font-medium text-claude-text-muted uppercase">{qs.label}</span>
          </div>
        </div>
        {/* Score breakdown */}
        <div className="w-full space-y-1.5 mt-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-claude-text-muted w-16">Resolution</span>
            <div className="flex-1 h-2 bg-claude-border-light dark:bg-claude-border rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-claude-accent transition-all duration-500" style={{ width: `${(qs.resolutionScore / 35) * 100}%` }} />
            </div>
            <span className="text-[10px] font-mono text-claude-text-muted w-8 text-right">{qs.resolutionScore}/35</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-claude-text-muted w-16">Method</span>
            <div className="flex-1 h-2 bg-claude-border-light dark:bg-claude-border rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-claude-cryoem transition-all duration-500" style={{ width: `${(qs.methodScore / 25) * 100}%` }} />
            </div>
            <span className="text-[10px] font-mono text-claude-text-muted w-8 text-right">{qs.methodScore}/25</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-claude-text-muted w-16">IF Score</span>
            <div className="flex-1 h-2 bg-claude-border-light dark:bg-claude-border rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-claude-xray transition-all duration-500" style={{ width: `${(qs.ifScore / 30) * 100}%` }} />
            </div>
            <span className="text-[10px] font-mono text-claude-text-muted w-8 text-right">{qs.ifScore}/30</span>
          </div>
        </div>
      </div>

      {/* Resolution Quality Bar */}
      <div className="p-3 rounded-lg bg-claude-border-light/30 dark:bg-[#1a1917]/60">
        <div className="text-[8px] text-claude-text-muted uppercase tracking-wider mb-2">Resolution Quality</div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2.5 bg-claude-border-light dark:bg-claude-border rounded-full overflow-hidden relative">
            {/* Background gradient showing quality zones */}
            <div className="absolute inset-0 flex">
              <div className="h-full bg-green-200 dark:bg-green-900/40" style={{ width: '33%' }} />
              <div className="h-full bg-amber-200 dark:bg-amber-900/40" style={{ width: '34%' }} />
              <div className="h-full bg-red-200 dark:bg-red-900/40" style={{ width: '33%' }} />
            </div>
            <div className="absolute top-0 left-0 h-full rounded-full bg-green-600 dark:bg-green-400 shadow-sm transition-all duration-700"
              style={{
                width: `${Math.max(5, Math.min(100, (1 - ((effectiveEntry.resolution ?? 3.5) - 0.5) / 4.5) * 100))}%`,
                backgroundColor: (effectiveEntry.resolution ?? 4) <= 2.0 ? '#16a34a' : (effectiveEntry.resolution ?? 4) <= 3.5 ? '#c9872e' : '#dc2626',
              }}
            />
          </div>
          <span className="text-[11px] font-mono font-semibold text-claude-text">
            {effectiveEntry.resolution != null ? `${effectiveEntry.resolution.toFixed(2)}Å` : 'N/A'}
          </span>
        </div>
        <div className="flex justify-between mt-1 text-[8px] text-claude-text-muted">
          <span>0.5Å</span>
          <span>2.0Å</span>
          <span>3.5Å</span>
          <span>5.0Å</span>
        </div>
      </div>

      {/* Impact Factor Tier Analysis */}
      {effectiveEntry.journalIf != null && (
        <div className="p-3 rounded-lg bg-claude-border-light/30 dark:bg-[#1a1917]/60">
          <div className="text-[8px] text-claude-text-muted uppercase tracking-wider mb-2">Impact Factor Tier</div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-[14px] font-bold ${getIfTierStyle(effectiveEntry.ifTier).text}`}>
                  {effectiveEntry.journalIf.toFixed(1)}
                </span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${getIfTierStyle(effectiveEntry.ifTier).bg} ${getIfTierStyle(effectiveEntry.ifTier).text}`}>
                  {effectiveEntry.ifTier || (effectiveEntry.journalIf >= 20 ? 'Top' : effectiveEntry.journalIf >= 10 ? 'High' : effectiveEntry.journalIf >= 5 ? 'Mid' : 'Low')}
                </span>
              </div>
              <div className="h-2 bg-claude-border-light dark:bg-claude-border rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (effectiveEntry.journalIf / 50) * 100)}%`,
                    backgroundColor: effectiveEntry.journalIf >= 20 ? '#dc2626' : effectiveEntry.journalIf >= 10 ? '#ea580c' : effectiveEntry.journalIf >= 5 ? '#16a34a' : '#6b7280',
                  }}
                />
              </div>
              <div className="flex justify-between mt-0.5 text-[7px] text-claude-text-muted">
                <span>0</span>
                <span>10</span>
                <span>20</span>
                <span>50</span>
              </div>
            </div>
          </div>
          {effectiveEntry.journal && (
            <div className="mt-2 text-[9px] text-claude-text-muted">
              Published in <span className="text-claude-text-secondary font-medium">{effectiveEntry.journal}</span>
            </div>
          )}
        </div>
      )}

      {/* Auto-generated Tags */}
      {(() => {
        const entryTags = generateTags(effectiveEntry, diffMode && diffResult.newIds.has(effectiveEntry.pdbId));
        return entryTags.length > 0 ? (
          <div className="p-3 rounded-lg bg-claude-border-light/30 dark:bg-[#1a1917]/60">
            <div className="text-[8px] text-claude-text-muted uppercase tracking-wider mb-2">Auto-Generated Tags</div>
            <div className="flex flex-wrap gap-1">
              {entryTags.map((tag, i) => (
                <TagPill key={`analysis-tag-${tag.label}`} tag={tag} size="xs" />
              ))}
            </div>
          </div>
        ) : null;
      })()}

      {/* AI Summary */}
      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <h3 className="text-[10px] font-semibold text-claude-text-muted uppercase tracking-wider">AI Summary</h3>
          <Sparkles className="h-3 w-3 text-claude-accent" />
        </div>
        {aiSummaries[effectiveEntry.pdbId] ? (
          <div className="rounded-lg border border-claude-border dark:border-[#3d3832] bg-white dark:bg-[#242220] p-2.5">
            <p className="text-[11px] text-claude-text-secondary dark:text-[#9b9590] leading-relaxed">{aiSummaries[effectiveEntry.pdbId]}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[9px] text-claude-text-muted/60 italic">AI-generated</span>
              <button onClick={() => generateAiSummary(effectiveEntry)} className="inline-flex items-center gap-1 text-[9px] text-claude-text-muted hover:text-claude-accent transition-colors">
                <RefreshCw className="h-3 w-3" />Regenerate
              </button>
            </div>
          </div>
        ) : aiSummaryLoading === effectiveEntry.pdbId ? (
          <div className="rounded-lg border border-claude-border dark:border-[#3d3832] bg-white dark:bg-[#242220] p-2.5 relative overflow-hidden">
            <div className="absolute top-2 right-2 pulse-ring">
              <Loader2 className="h-3 w-3 text-claude-accent animate-spin" />
            </div>
            <div className="space-y-2 pr-6">
              <div className="skeleton-bar h-2.5 w-full rounded" />
              <div className="skeleton-bar h-2.5 w-[85%] rounded" />
              <div className="skeleton-bar h-2.5 w-[60%] rounded" />
            </div>
          </div>
        ) : aiSummaryError && aiSummaryLoading === null ? (
          <div className="rounded-lg border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="h-3 w-3 text-red-500 dark:text-red-400" />
              <span className="text-[9px] font-medium text-red-600 dark:text-red-400">Error</span>
            </div>
            <p className="text-[9px] text-red-500/70 dark:text-red-400/70 mb-2">{aiSummaryError}</p>
            <button onClick={() => generateAiSummary(effectiveEntry)} className="inline-flex items-center gap-1 text-[9px] text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium transition-colors">
              <RefreshCw className="h-3 w-3" />Try again
            </button>
          </div>
        ) : (
          <button onClick={() => generateAiSummary(effectiveEntry)} className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-dashed border-claude-border hover:border-claude-accent/40 dark:border-[#4a4540] dark:hover:border-claude-accent/40 bg-claude-border-light/20 hover:bg-claude-accent/5 dark:bg-[#1a1917]/60 dark:hover:bg-claude-accent/5 text-[11px] text-claude-text-muted hover:text-claude-accent dark:hover:text-claude-accent transition-all duration-200">
            <Sparkles className="h-3 w-3" />Generate AI Summary
          </button>
        )}
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // ── NOTES TAB CONTENT ──
  // ═══════════════════════════════════════════════════════════════════════
  const notesContent = (
    <div className="space-y-4">
      {/* Notes Section */}
      <div className="border-l-2 border-amber-400/60 dark:border-amber-600/40 pl-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <StickyNote className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
            <h3 className="text-[10px] font-semibold text-amber-900 dark:text-amber-100 uppercase tracking-wider">Notes</h3>
          </div>
          {structureNotes[effectiveEntry.pdbId] && (
            <button
              onClick={() => deleteNote(effectiveEntry.pdbId)}
              className="text-[10px] text-red-400 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300 transition-colors"
              title="Delete note"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-2 border border-amber-200/60 dark:border-amber-800/30">
          {structureNotes[effectiveEntry.pdbId] ? (
            <div className="space-y-1.5">
              <p className="text-[11px] text-amber-900 dark:text-amber-100 whitespace-pre-wrap leading-relaxed">{structureNotes[effectiveEntry.pdbId]}</p>
              <button
                onClick={() => {
                  const edited = prompt('Edit note:', structureNotes[effectiveEntry.pdbId]);
                  if (edited !== null) updateNote(effectiveEntry.pdbId, edited);
                }}
                className="text-[9px] text-amber-600 hover:text-amber-700 dark:text-amber-300 dark:hover:text-amber-200 transition-colors flex items-center gap-0.5"
              >
                <Settings className="h-2.5 w-2.5" />
                Edit
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                const note = prompt('Add a note:');
                if (note?.trim()) addNote(effectiveEntry.pdbId, note);
              }}
              className="text-[11px] text-amber-600/60 dark:text-amber-400/50 hover:text-amber-600 dark:hover:text-amber-300 transition-colors italic w-full text-left"
            >
              No notes yet — click to add
            </button>
          )}
        </div>
        {noteSavedIndicator === effectiveEntry.pdbId && (
          <span className="mt-1 inline-block text-[9px] font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded note-saved-enter">
            ✓ Saved
          </span>
        )}
      </div>

      {/* Annotation Tags & Notes */}
      <div className="p-3 rounded-lg bg-claude-border-light/30 dark:bg-[#2b2926]/50 border border-claude-border-light/50 dark:border-[#3d3832]/50">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[11px] font-semibold text-claude-text-muted dark:text-[#9b9590] uppercase tracking-wider">Annotations</h4>
          <button
            onClick={() => {
              const tag = prompt('Add annotation tag:');
              if (tag?.trim()) addTag(effectiveEntry.pdbId, tag.trim());
            }}
            className="inline-flex items-center gap-0.5 text-[10px] text-claude-accent hover:text-claude-accent-hover transition-colors"
          >
            <Tag className="h-3 w-3" />
            Add Tag
          </button>
        </div>
        {annotations[effectiveEntry.pdbId]?.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {annotations[effectiveEntry.pdbId].tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-0.5 px-1.5 py-0 text-[9px] rounded-full bg-claude-accent/10 text-claude-accent dark:bg-claude-accent/20 dark:text-claude-accent/80 tag-pill-removable"
              >
                {tag}
                <button
                  onClick={() => removeTag(effectiveEntry.pdbId, tag)}
                  className="ml-0.5 hover:text-red-500 transition-colors tag-pill-remove"
                >
                  <X className="h-2 w-2" />
                </button>
              </span>
            ))}
          </div>
        )}
        <textarea
          value={annotations[effectiveEntry.pdbId]?.notes || ''}
          onChange={(e) => updateAnnotationNotes(effectiveEntry.pdbId, e.target.value)}
          placeholder="Add notes about this structure..."
          className="w-full text-[11px] text-claude-text dark:text-[#d4d0cb] bg-transparent border border-claude-border-light/50 dark:border-[#3d3832]/50 rounded-md px-2 py-1.5 outline-none resize-none min-h-[60px] placeholder:text-claude-text-muted/40 dark:placeholder:text-[#9b9590]/40 focus:ring-1 focus:ring-claude-accent/30"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Quick actions for Notes tab */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleToggleBookmark}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-medium transition-colors duration-150 ${
            isBookmarked
              ? 'text-claude-accent bg-claude-accent/10 border border-claude-accent/20'
              : 'text-claude-text-muted hover:text-claude-text bg-claude-border-light/50 dark:bg-[#2b2926] border border-transparent hover:border-claude-border-light dark:hover:border-[#3d3832]'
          }`}
        >
          {isBookmarked ? <BookmarkCheck className="h-3 w-3" /> : <Bookmark className="h-3 w-3" />}
          {isBookmarked ? 'Bookmarked' : 'Bookmark'}
        </button>
        <button
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-medium text-claude-text-muted hover:text-claude-text bg-claude-border-light/50 dark:bg-[#2b2926] border border-transparent hover:border-claude-border-light dark:hover:border-[#3d3832] transition-colors duration-150"
        >
          <Share2 className="h-3 w-3" />
          Share
        </button>
        <button
          onClick={handleCompare}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-medium transition-colors duration-150 ${
            isInComparison
              ? 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800/30'
              : 'text-claude-text-muted hover:text-claude-text bg-claude-border-light/50 dark:bg-[#2b2926] border border-transparent hover:border-claude-border-light dark:hover:border-[#3d3832]'
          }`}
        >
          <GitMerge className="h-3 w-3" />
          {isInComparison ? 'Comparing' : 'Compare'}
        </button>
        <button
          onClick={handleCopyPdbId}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-medium text-claude-text-muted hover:text-claude-text bg-claude-border-light/50 dark:bg-[#2b2926] border border-transparent hover:border-claude-border-light dark:hover:border-[#3d3832] transition-colors duration-150"
        >
          <ClipboardCopy className="h-3 w-3" />
          Copy ID
        </button>
        <a
          href={`https://www.rcsb.org/structure/${effectiveEntry.pdbId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-medium text-claude-text-muted hover:text-claude-text bg-claude-border-light/50 dark:bg-[#2b2926] border border-transparent hover:border-claude-border-light dark:hover:border-[#3d3832] transition-colors duration-150"
        >
          <ExternalLink className="h-3 w-3" />
          RCSB
        </a>
      </div>
    </div>
  );

  // ── Tab content renderer ──
  const renderTabContent = () => {
    const content = (() => {
      switch (activeTab) {
        case 'overview': return overviewContent;
        case 'structure': return structureContent;
        case 'analysis': return analysisContent;
        case 'notes': return notesContent;
      }
    })();
    return (
      <div key={activeTab} className="detail-tab-panel">
        {content}
      </div>
    );
  };

  // ── Tab Navigation Bar ──
  const tabBar = (
    <div className="glass-card sticky top-0 z-10 flex items-center gap-0.5 px-1 py-1 rounded-lg overflow-x-auto scrollbar-hide">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`relative inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-medium whitespace-nowrap transition-all duration-150 ${
            activeTab === tab.id
              ? 'bg-claude-accent/10 text-claude-accent shadow-sm'
              : 'text-claude-text-muted hover:text-claude-text hover:bg-claude-border-light/60 dark:hover:bg-[#3d3832]/60'
          }`}
        >
          {tab.icon}
          <span className="hidden xs:inline sm:inline">{tab.label}</span>
          {tab.badge}
          {activeTab === tab.id && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-0.5 rounded-full bg-claude-accent" />
          )}
        </button>
      ))}
    </div>
  );

  // ── Shared detail content renderer ──
  const detailContent = (
    <div className={`glass-surface gradient-border ${isMobile ? 'p-4 space-y-3' : 'p-5 space-y-3 max-w-4xl mx-auto'}`}>
      {/* Swipe Navigation Hint (mobile only) */}
      {isMobile && (
        <div className="flex items-center justify-center gap-2 text-[10px] text-claude-text-muted/60 select-none pb-1">
          <span>{canNavigatePrev ? '← Swipe for prev' : ''}</span>
          {canNavigatePrev && canNavigateNext && <span>·</span>}
          <span>{canNavigateNext ? 'Swipe for next →' : ''}</span>
        </div>
      )}

      {/* Tab Navigation */}
      {tabBar}

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );

  // ── Mobile: Bottom Sheet ──
  if (isMobile) {
    return (
      <div
        key="mobile-bottom-sheet-backdrop"
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm detail-backdrop-enter"
        onClick={() => { setDetailPanelOpen(false); setSelectedEntry(null); }}
      >
        <aside
          data-bottom-sheet
          className="fixed left-0 right-0 bottom-0 z-50 bg-claude-surface dark:bg-[#242220] rounded-t-2xl shadow-2xl no-print flex flex-col detail-sheet-enter max-h-[85vh]"
          style={{ height: `${bottomSheetSnap * 100}vh`, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag Handle */}
          <div className="flex-shrink-0 flex items-center justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
            <div className="w-10 h-1 rounded-full bg-claude-border-light dark:bg-[#4a4540]" />
          </div>

          {/* Detail Header */}
          <div className="detail-panel-header-gradient flex-shrink-0 px-4 pb-3 border-b border-claude-border dark:border-[#3d3832] relative z-10">
            {/* Breadcrumb Navigation */}
            <div className="detail-breadcrumb flex items-center gap-1 text-xs text-claude-text-muted/70 mb-2">
              <span className="hover:text-claude-text-secondary cursor-pointer transition-colors" onClick={() => { setDetailPanelOpen(false); setSelectedEntry(null); }}>All Structures</span>
              <ChevronRight className="w-3 h-3 flex-shrink-0" />
              <span className="hover:text-claude-text-secondary cursor-pointer transition-colors truncate max-w-[120px]" onClick={() => { setDetailPanelOpen(false); setSelectedEntry(null); }}>{selectedWeekId || (selectedEvalStructure ? 'Evaluation' : 'Entries')}</span>
              <ChevronRight className="w-3 h-3 flex-shrink-0" />
              <span className="text-claude-accent font-medium truncate max-w-[200px]">{effectiveEntry.pdbId}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {/* Quality Score Ring Indicator */}
                {(() => {
                  const qs = computeQualityScore(effectiveEntry);
                  return (
                    <div className="relative flex-shrink-0" title={`Quality: ${qs.label} (${qs.total}%)`}>
                      <svg width="28" height="28" viewBox="0 0 28 28" className="-rotate-90">
                        <circle cx="14" cy="14" r="11" fill="none" stroke="currentColor" strokeWidth="2" className="text-claude-border dark:text-[#3d3832]" />
                        <circle cx="14" cy="14" r="11" fill="none" stroke={qs.color} strokeWidth="2.5"
                          strokeDasharray={`${(qs.total / 100) * 69.12} 69.12`}
                          strokeLinecap="round" className="transition-all duration-500" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold" style={{ color: qs.color }}>{qs.total}</span>
                    </div>
                  );
                })()}
                <span className="font-mono text-base font-bold text-claude-accent">{effectiveEntry.pdbId}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(effectiveEntry.pdbId).then(() => toast('Copied PDB ID')).catch(() => {}); }}
                  className="inline-flex items-center justify-center h-5 w-5 rounded text-claude-text-muted hover:text-claude-accent hover:bg-claude-accent-light/50 transition-colors"
                  title="Copy PDB ID"
                >
                  <Copy className="h-3 w-3" />
                </button>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getMethodColor(effectiveEntry.method).bg} ${getMethodColor(effectiveEntry.method).text}`}>
                  {getMethodLabel(effectiveEntry.method)}
                </span>
                {structureNotes[effectiveEntry.pdbId] && (
                  <StickyNote className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400 flex-shrink-0" />
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setDetailPanelOpen(false); setSelectedEntry(null); }} className="h-8 w-8 p-0 text-claude-text-muted hover:text-claude-text flex-shrink-0 touch-manipulation rounded-md hover:bg-claude-border-light dark:hover:bg-[#3d3832] btn-press-subtle">
                <X className="h-4 w-4" />
              </Button>
            </div>
            {(() => {
              const entryTags = generateTags(effectiveEntry, diffMode && diffResult.newIds.has(effectiveEntry.pdbId));
              return entryTags.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-2">
                  {entryTags.map((tag, i) => (
                    <TagPill key={`mobile-tag-${i}-${tag.label}`} tag={tag} size="xs" />
                  ))}
                </div>
              ) : null;
            })()}
          </div>

          {/* Detail Content */}
          <ScrollArea className="flex-1 preview-scroll min-h-0">
            <div className={contentSlideClass}>
              {detailContent}
            </div>
          </ScrollArea>
        </aside>
      </div>
    );
  }

  // ── Desktop: Centered Modal ──
  return (
    <>
      <div
        key="desktop-detail-backdrop"
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm gradient-border detail-backdrop-enter"
        onClick={() => { setDetailPanelOpen(false); setSelectedEntry(null); }}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 pointer-events-none">
      <div
        key={`desktop-detail-panel-${effectiveEntry.pdbId}`}
        className="noise-overlay glass-panel backdrop-saturate bg-claude-surface dark:bg-[#242220] rounded-xl border border-claude-border dark:border-[#3d3832] flex flex-col shadow-2xl no-print overflow-hidden w-full max-w-4xl max-h-[90vh] pointer-events-auto detail-modal-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Detail Header - compact single line */}
        <div className="detail-panel-header-gradient backdrop-blur-card flex-shrink-0 p-3 border-b border-claude-border dark:border-[#3d3832] relative z-10">
          {/* Breadcrumb Navigation */}
          <div className="detail-breadcrumb flex items-center gap-1 text-xs text-claude-text-muted/70 mb-2">
            <span className="hover:text-claude-text-secondary cursor-pointer transition-colors" onClick={() => { setDetailPanelOpen(false); setSelectedEntry(null); }}>All Structures</span>
            <ChevronRight className="w-3 h-3 flex-shrink-0" />
            <span className="hover:text-claude-text-secondary cursor-pointer transition-colors truncate max-w-[120px]" onClick={() => { setDetailPanelOpen(false); setSelectedEntry(null); }}>{selectedWeekId || (selectedEvalStructure ? 'Evaluation' : 'Entries')}</span>
            <ChevronRight className="w-3 h-3 flex-shrink-0" />
            <span className="text-claude-accent font-medium truncate max-w-[200px]">{effectiveEntry.pdbId}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="font-mono text-sm font-bold text-claude-accent">{effectiveEntry.pdbId}</span>
              <button
                onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(effectiveEntry.pdbId).then(() => toast('Copied PDB ID')).catch(() => {}); }}
                className="inline-flex items-center justify-center h-5 w-5 rounded text-claude-text-muted hover:text-claude-accent hover:bg-claude-accent-light/50 transition-colors"
                title="Copy PDB ID"
              >
                <Copy className="h-3 w-3" />
              </button>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${getMethodColor(effectiveEntry.method).bg} ${getMethodColor(effectiveEntry.method).text}`}>{getMethodLabel(effectiveEntry.method)}</span>
              {effectiveEntry.resolution != null && <span className={`text-[10px] font-mono font-semibold ${getResolutionColor(effectiveEntry.resolution)}`}>{safeNum(effectiveEntry.resolution, '—')}Å</span>}
              {structureNotes[effectiveEntry.pdbId] && (
                <StickyNote className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400 flex-shrink-0" />
              )}
              {effectiveEntry.title && <span className="text-[11px] text-claude-text-muted line-clamp-2 ml-2 flex-1">{effectiveEntry.title}</span>}
            </div>
            <div className="quality-ring-container relative flex-shrink-0">
              <div className="quality-ring-glow" />
              <QualityRing score={qs.total} size={44} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs font-bold font-mono" style={{ color: qs.color }}>{qs.total}</span>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setDetailPanelOpen(false); setSelectedEntry(null); }} className="h-8 w-8 p-0 text-claude-text-muted hover:text-claude-text flex-shrink-0 rounded-md hover:bg-claude-border-light dark:hover:bg-[#3d3832] btn-press-subtle">
              <X className="h-4 w-4" />
            </Button>
          </div>
          {(() => {
            const entryTags = generateTags(effectiveEntry, diffMode && diffResult.newIds.has(effectiveEntry.pdbId));
            return entryTags.length > 0 ? (
              <div className="flex flex-wrap gap-1 mt-2">
                {entryTags.map((tag, i) => (
                  <TagPill key={`detail-tag-${tag.label}`} tag={tag} size="xs" />
                ))}
              </div>
            ) : null;
          })()}
        </div>

        {/* Detail Content */}
        <div className="flex-1 min-h-0 overflow-y-auto preview-scroll custom-scrollbar">
          <div className={contentSlideClass}>
            {detailContent}
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
