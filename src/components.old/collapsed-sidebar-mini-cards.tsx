'use client';

import React from 'react';
import type { WeeklySnapshot, Evaluation } from '@/lib/pdb-types';
import type { EvalBatch, BatchSubTarget } from '@/hooks/use-pdb-evaluation';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { PanelLeftOpen, Calendar, Microscope, Layers, ChevronDown } from 'lucide-react';
import { getScoreColor, formatDate } from './pdb-helpers';

// ── Helpers (duplicated from pdb-tracker to avoid circular deps) ──
function getAvgScore(scores: string | null): number {
  if (!scores) return 0;
  try {
    const s = JSON.parse(scores);
    const vals = Object.values(s).map(v => typeof v === 'number' ? v : (v as any)?.score ?? 0) as number[];
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  } catch { return 0; }
}

// ── Props Interface ──
export interface CollapsedSidebarMiniCardsProps {
  // Sidebar state
  onExpandSidebar: () => void;

  // Mode
  mode: 'weekly' | 'evaluation';
  setMode: React.Dispatch<React.SetStateAction<'weekly' | 'evaluation'>>;

  // Week selection
  snapshots: WeeklySnapshot[];
  selectedWeekId: string | null;
  setSelectedWeekId: React.Dispatch<React.SetStateAction<string | null>>;
  setPreviewOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setMobileSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openWeekMenu: (e: React.MouseEvent, weekId: string) => void;

  // Evaluation
  evaluations: Evaluation[];
  evalBatches: EvalBatch[];
  expandedEvalGroups: Set<string>;
  setExpandedEvalGroups: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedBatchId: string | null;
  setSelectedBatchId: React.Dispatch<React.SetStateAction<string | null>>;
  evalBatchSubTargets: Record<string, BatchSubTarget[]>;
  batchFetchedEvals: Record<string, Evaluation>;
  selectedEvalId: string | null;
  setSelectedEvalId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedEval: React.Dispatch<React.SetStateAction<Evaluation | null>>;
  setEvalContextMenu: React.Dispatch<React.SetStateAction<{ x: number; y: number; uniprotId: string } | null>>;
  selectedComplexId: string | null;
  setSelectedComplexId: React.Dispatch<React.SetStateAction<string | null>>;
  setExpandedComplexId: React.Dispatch<React.SetStateAction<string | null>>;

  // Search
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  setSearchDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function CollapsedSidebarMiniCards({
  onExpandSidebar,
  mode,
  setMode,
  snapshots,
  selectedWeekId,
  setSelectedWeekId,
  setPreviewOpen,
  setMobileSidebarOpen,
  openWeekMenu,
  evaluations,
  evalBatches,
  expandedEvalGroups,
  setExpandedEvalGroups,
  selectedBatchId,
  setSelectedBatchId,
  evalBatchSubTargets,
  batchFetchedEvals,
  selectedEvalId,
  setSelectedEvalId,
  setSelectedEval,
  setEvalContextMenu,
  selectedComplexId,
  setSelectedComplexId,
  setExpandedComplexId,
  setSearchQuery,
  setSearchDropdownOpen,
}: CollapsedSidebarMiniCardsProps) {
  return (
    <div className="hidden lg:flex w-14 flex-shrink-0 border-r border-claude-border dark:border-[#3d3832] bg-claude-surface dark:bg-[#242220] flex-col items-center pt-3 gap-1 no-print sidebar-gradient overflow-hidden relative">
      <div className="sidebar-mesh-overlay" />
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onExpandSidebar}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-claude-border-light dark:hover:bg-claude-border transition-colors duration-150 btn-press-subtle btn-ripple"
          >
            <PanelLeftOpen className="h-4 w-4 text-claude-text-secondary" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs tooltip-enter">Expand sidebar</TooltipContent>
      </Tooltip>
      {/* Mode toggle buttons */}
      <div className="flex flex-col items-center gap-1 mt-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => { setMode('weekly'); setSelectedEvalId(null); setSelectedEval(null); setSearchQuery(''); setSearchDropdownOpen(false); }}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 ${
                mode === 'weekly'
                  ? 'bg-claude-accent-light dark:bg-[#3d2a22] text-claude-accent shadow-sm'
                  : 'text-claude-text-muted hover:bg-claude-border-light dark:hover:bg-[#3d3832] hover:text-claude-text-secondary'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs tooltip-enter">Weekly Mode</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => { setMode('evaluation'); setSearchQuery(''); setSearchDropdownOpen(false); }}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 ${
                mode === 'evaluation'
                  ? 'bg-claude-accent-light dark:bg-[#3d2a22] text-claude-accent shadow-sm'
                  : 'text-claude-text-muted hover:bg-claude-border-light dark:hover:bg-[#3d3832] hover:text-claude-text-secondary'
              }`}
            >
              <Microscope className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs tooltip-enter">Evaluation Mode</TooltipContent>
        </Tooltip>
      </div>
      {/* Mini week/eval cards - scrollable */}
      <div className="flex-1 overflow-y-auto thin-scrollbar sidebar-scroll mt-1 w-full flex flex-col items-center gap-1 px-1">
        {mode === 'weekly' && snapshots.slice(0, 20).map(snap => (
          <HoverCard key={snap.weekId} openDelay={300} closeDelay={100}>
            <HoverCardTrigger asChild>
              <button
                onClick={() => { setSelectedWeekId(snap.weekId); setPreviewOpen(true); setMobileSidebarOpen(false); }}
                onContextMenu={(e) => openWeekMenu(e, snap.weekId)}
                className={`w-full h-8 rounded-lg flex items-center justify-center text-[10px] font-mono font-semibold transition-all duration-150 ${
                  selectedWeekId === snap.weekId
                    ? 'bg-claude-accent-light dark:bg-[#3d2a22] text-claude-accent shadow-sm sidebar-week-active'
                    : 'text-claude-text-muted hover:bg-claude-border-light dark:hover:bg-[#3d3832] hover:text-claude-text-secondary'
                }`}
              >
                {snap.weekId.replace('W', '')}
              </button>
            </HoverCardTrigger>
            <HoverCardContent
              side="right"
              align="center"
              className="w-56 p-3 space-y-2 bg-white dark:bg-[#2b2926] border border-claude-border dark:border-[#4a4540] rounded-xl shadow-xl"
            >
              <div className="text-xs font-semibold text-claude-text">{snap.weekId}</div>
              <div className="text-[10px] text-claude-text-muted">
                {formatDate(snap.weekStart)} — {formatDate(snap.weekEnd)}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {snap.cryoemCount > 0 && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-claude-cryoem-bg text-claude-cryoem">
                    EM {snap.cryoemCount}
                  </span>
                )}
                {snap.xrayCount > 0 && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-claude-xray-bg text-claude-xray">
                    XR {snap.xrayCount}
                  </span>
                )}
                {snap.nmrCount > 0 && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-claude-nmr-bg text-claude-nmr">
                    NMR {snap.nmrCount}
                  </span>
                )}
              </div>
              {/* Method ratio progress bar */}
              <div className="flex h-1.5 rounded-full overflow-hidden bg-claude-border-light dark:bg-[#3d3832] relative">
                {snap.cryoemCount > 0 && (
                  <div className="h-full bg-claude-cryoem" style={{ width: `${(snap.cryoemCount / snap.totalStructures) * 100}%` }} />
                )}
                {snap.xrayCount > 0 && (
                  <div className="h-full bg-claude-xray" style={{ width: `${(snap.xrayCount / snap.totalStructures) * 100}%` }} />
                )}
                {snap.nmrCount > 0 && (
                  <div className="h-full bg-claude-nmr" style={{ width: `${(snap.nmrCount / snap.totalStructures) * 100}%` }} />
                )}
                {snap.otherCount > 0 && (
                  <div className="h-full bg-claude-other progress-bar-shine" style={{ width: `${(snap.otherCount / snap.totalStructures) * 100}%` }} />
                )}
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-claude-text-muted">Total</span>
                <span className="font-mono text-claude-text-secondary">{snap.totalStructures}</span>
              </div>
              <div className="text-[9px] text-claude-text-muted/60 text-center pt-1 border-t border-claude-border/50">
                Click to view
              </div>
            </HoverCardContent>
          </HoverCard>
        ))}
        {mode === 'evaluation' && (() => {
          const evalItems = [...evalBatches.map(b => ({ ...b, _type: 'batch' as const })), ...evaluations.slice(0, 40).map(e => ({ ...e, _type: 'individual' as const }))];
          return evalItems.slice(0, 40).map(item => {
            if (item._type === 'batch') {
              const batch = item as any;
              const isExpanded = expandedEvalGroups.has(batch.batchId);
              const isSelected = selectedBatchId === batch.batchId;
              const subs = evalBatchSubTargets[batch.batchId] || [];
              const totalPDB = subs.reduce((sum: number, sub: any) => sum + (sub.pdbCount || 0), 0);
              const totalBLAST = subs.reduce((sum: number, sub: any) => sum + (sub.blastCount || 0), 0);
              return (
                <Collapsible key={batch.batchId} open={isExpanded} onOpenChange={(open) => { setSelectedBatchId(batch.batchId); setSelectedEvalId(null); setSelectedEval(null); setSelectedComplexId(null); setExpandedComplexId(null); setPreviewOpen(true); setMobileSidebarOpen(false); setExpandedEvalGroups(prev => { const next = new Set(prev); if (open) next.add(batch.batchId); else next.delete(batch.batchId); return next; }); }}>
                  <CollapsibleTrigger asChild>
                    <div
                      className={`w-full text-left p-2 rounded-[8px] border transition-all duration-200 cursor-pointer outline-none focus-visible:outline-none focus-visible:ring-0 ${
                        isSelected
                          ? 'bg-claude-surface dark:bg-[#242220] border-claude-border dark:border-[#3d3832] border-l-[3px] border-l-purple-500/70 dark:border-l-purple-400/60'
                          : 'bg-claude-surface dark:bg-[#242220] border-claude-border dark:border-[#3d3832] hover:border-claude-border-light dark:hover:border-[#4a4540]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <div className="min-w-0 flex-1 flex items-center gap-1">
                          <Layers className="h-3 w-3 text-purple-500 flex-shrink-0" />
                          <span className="text-[11px] font-semibold text-claude-text dark:text-[#e8e4dd] truncate">{batch.title || batch.batchId}</span>
                          <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300">{batch.subTargetCount}</span>
                        </div>
                        <ChevronDown className={`h-2.5 w-2.5 text-claude-text-muted transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] text-claude-text-muted dark:text-[#6b6560]">
                        <span>{subs.length} sub-targets</span>
                        <span>·</span>
                        <span>{totalPDB} PDB</span>
                        <span>·</span>
                        <span>{totalBLAST} BLAST</span>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-2 pb-2 pt-1 space-y-0.5">
                      {subs.map((sub: any) => {
                        const subEv = evaluations.find(e => e.uniprotId === sub.uniprotId) || batchFetchedEvals[sub.uniprotId];
                        const subScore = subEv ? getAvgScore(subEv.scores) : (sub.bestScore || null);
                        const subColor = subScore !== null ? getScoreColor(subScore) : '#9b9590';
                        return (
                          <button
                            key={sub.uniprotId}
                            onClick={(e) => { e.stopPropagation(); setSelectedEvalId(sub.uniprotId); setSelectedBatchId(batch.batchId); setPreviewOpen(true); setMobileSidebarOpen(false); const cachedEval = batchFetchedEvals[sub.uniprotId] || evaluations.find(e => e.uniprotId === sub.uniprotId); if (cachedEval) { setSelectedEval(cachedEval); } else { setSelectedEval(null); } }}
                            className={`w-full text-left p-1 rounded-md transition-colors duration-150 flex items-center gap-1 ${
                                selectedEvalId === sub.uniprotId && selectedBatchId === batch.batchId
                                  ? 'bg-purple-100/60 dark:bg-purple-900/20 border border-purple-300/30 dark:border-purple-600/25'
                                  : 'hover:bg-claude-border-light dark:hover:bg-claude-border'
                            }`}
                          >
                            <span className="font-mono text-[9px] font-semibold text-purple-600 dark:text-purple-400">{sub.uniprotId}</span>
                            <span className="text-[8px] text-claude-text-muted dark:text-[#6b6560] truncate flex-1">{subEv ? (subEv.proteinName || subEv.entryName) : (sub.proteinName || '')}</span>
                            {subScore !== null && (
                              <span className="text-[8px] font-mono font-bold" style={{ color: subColor }}>
                                {typeof subScore === 'number' ? subScore.toFixed(1) : subScore}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            }
            const ev = item as Evaluation;
            const evStructures = ev.pdbStructures || [];
            const evBlasts = ev.blastResults || [];
            const evCryoem = evStructures.filter(s => (s.method as string)?.includes('Cryo') || (s.method as string)?.includes('ELECTRON MICROSCOPY')).length;
            const evXray = evStructures.filter(s => (s.method as string)?.includes('X-Ray') || (s.method as string)?.includes('X-RAY')).length;
            const evBlast = evBlasts.length;
            const evTotal = evStructures.length + evBlast;
            return (
              <HoverCard key={ev.uniprotId} openDelay={300} closeDelay={100}>
                <HoverCardTrigger asChild>
                  <button
                    onClick={() => { setSelectedEvalId(ev.uniprotId); setSelectedBatchId(null); setSelectedComplexId(null); setExpandedComplexId(null); setExpandedEvalGroups(new Set()); setPreviewOpen(true); setMobileSidebarOpen(false); }}
                    onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setEvalContextMenu({ x: e.clientX, y: e.clientY, uniprotId: ev.uniprotId }); }}
                    className={`w-full h-8 rounded-lg flex items-center justify-center text-[10px] font-mono font-semibold transition-all duration-150 overflow-hidden truncate px-1 ${
                      selectedEvalId === ev.uniprotId
                        ? 'bg-claude-accent-light dark:bg-[#3d2a22] text-claude-accent shadow-sm'
                        : 'text-claude-text-muted hover:bg-claude-border-light dark:hover:bg-[#3d3832] hover:text-claude-text-secondary'
                    }`}
                  >
                    {ev.uniprotId.replace('U', '')}
                  </button>
                </HoverCardTrigger>
                <HoverCardContent side="right" align="center" className="w-56 p-3 space-y-2 bg-white dark:bg-[#2b2926] border border-claude-border dark:border-[#4a4540] rounded-xl shadow-xl">
                  <div className="text-xs font-semibold text-claude-text truncate">{ev.proteinName || ev.uniprotId}</div>
                  {ev.geneNames && <div className="text-[10px] text-claude-text-muted">Gene: {ev.geneNames}</div>}
                  <div className="flex gap-1.5 flex-wrap">
                    {evCryoem > 0 && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-claude-cryoem-bg text-claude-cryoem">EM {evCryoem}</span>}
                    {evXray > 0 && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-claude-xray-bg text-claude-xray">XR {evXray}</span>}
                    {evBlast > 0 && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-claude-accent-light dark:bg-[#3d2a22] text-claude-accent">BLAST {evBlast}</span>}
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-claude-text-muted">Total structures</span>
                    <span className="font-mono text-claude-text-secondary">{evTotal}</span>
                  </div>
                  <div className="text-[9px] text-claude-text-muted/60 text-center pt-1 border-t border-claude-border/50">Click to view</div>
                </HoverCardContent>
              </HoverCard>
            );
          });
        })()}
      </div>
    </div>
  );
}
