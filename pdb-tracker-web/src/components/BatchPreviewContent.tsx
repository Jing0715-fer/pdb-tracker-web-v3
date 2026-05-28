'use client';

import { useTheme } from 'next-themes';
import { Layers, Database, FileSearch, FileText } from 'lucide-react';
import type { Evaluation } from './pdb-tracker';

interface BatchPreviewContentProps {
  batchId: string;
  onSelectSubTarget: (uniprotId: string) => void;
  selectedSubTargetId: string | null;
  allEvals: Evaluation[];
  batchFetchedEvals: Record<string, Evaluation>;
  evalBatches: any[];
  evalBatchSubTargets: Record<string, any[]>;
  onOpenBatchReport?: (batchId: string, title: string) => void;
}

export function BatchPreviewContent({
  batchId,
  onSelectSubTarget,
  selectedSubTargetId,
  allEvals,
  batchFetchedEvals,
  evalBatches,
  evalBatchSubTargets,
  onOpenBatchReport,
}: BatchPreviewContentProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const batch = evalBatches.find((b: any) => b.batchId === batchId);
  const subTargets = evalBatchSubTargets[batchId] || [];

  if (!batch) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-claude-text-muted">
        <p className="text-xs">Batch not found</p>
      </div>
    );
  }

  // Compute batch-level stats
  const totalPdb = subTargets.reduce((sum: number, sub: any) => sum + (sub.pdbCount || 0), 0);
  const totalBlast = subTargets.reduce((sum: number, sub: any) => sum + (sub.blastCount || 0), 0);
  const avgScore = subTargets.length > 0 ? subTargets.reduce((sum: number, sub: any) => sum + (sub.bestScore || 0), 0) / subTargets.length : 0;
  const scoreColor = avgScore >= 80 ? '#2d8f8f' : avgScore >= 50 ? '#c9872e' : avgScore >= 25 ? '#ea580c' : '#dc2626';

  return (
    <div className="p-3 space-y-3">
      {/* ── Batch Hero Card ── */}
      <div className="rounded-[10px] border border-claude-border dark:border-[#3d3832] bg-claude-surface dark:bg-[#242220] p-2.5 space-y-1.5">
        {/* Title row with badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-xs font-semibold text-claude-text leading-tight break-words flex-1 min-w-0">{batch.title || 'Batch'}</h2>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex-shrink-0">
            <Layers className="h-2.5 w-2.5 mr-0.5" />{subTargets.length} targets
          </span>
        </div>
        <p className="text-[10px] text-claude-text-muted">Complex Evaluation Group</p>
        {/* Stats row */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            <Database className="h-2.5 w-2.5 text-claude-text-muted" />
            <span className="text-[10px] font-mono font-semibold text-claude-text">{totalPdb}</span>
            <span className="text-[9px] text-claude-text-muted">PDB</span>
          </div>
          <div className="w-px h-2.5 bg-claude-border" />
          <div className="flex items-center gap-0.5">
            <FileSearch className="h-2.5 w-2.5 text-claude-text-muted" />
            <span className="text-[10px] font-mono font-semibold text-claude-text">{totalBlast}</span>
            <span className="text-[9px] text-claude-text-muted">BLAST</span>
          </div>
          <div className="w-px h-2.5 bg-claude-border" />
          <div className="flex items-center gap-0.5">
            <span className="text-[9px] text-claude-text-muted">Score</span>
            <span className="text-[10px] font-mono font-bold" style={{ color: scoreColor }}>{avgScore.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* ── Full Batch Report Button ── */}
      <button
        onClick={() => onOpenBatchReport?.(batch.batchId, batch.title || 'Batch Report')}
        className="w-full rounded-[10px] border border-claude-border dark:border-[#3d3832] bg-claude-surface dark:bg-[#242220] p-2.5 space-y-1.5 hover:border-claude-accent/40 hover:bg-claude-border-light/30 dark:hover:bg-[#3d3832]/30 transition-all duration-150"
      >
        <div className="flex items-center gap-1.5">
          <FileText className="h-3 w-3 text-claude-accent" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-claude-text-muted">View Full Batch Report</span>
        </div>
        <div className="text-[10px] text-claude-text-secondary leading-relaxed pl-4 border-l-2 border-claude-border/50 dark:border-[#3d3832]/50">
          {batch.combinedReport}
        </div>
      </button>

      {/* ── Sub-targets ── */}
      <div className="rounded-[10px] border border-claude-border dark:border-[#3d3832] bg-claude-surface dark:bg-[#242220] p-3 space-y-2">
        <div className="flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-purple-500" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-claude-text-muted">Sub-targets ({subTargets.length})</span>
        </div>
        <div className="space-y-1">
          {subTargets.map((sub: any) => {
            const subEval = allEvals.find(e => e.uniprotId === sub.uniprotId) || batchFetchedEvals[sub.uniprotId];
            const covPct = subEval?.coverage ? Math.min(subEval.coverage, 100) : 0;
            const covColor = covPct >= 80 ? '#2d8f8f' : covPct >= 50 ? '#c9872e' : covPct >= 25 ? '#ea580c' : '#dc2626';
            const subScore = sub.bestScore || 0;
            const subScoreColor = subScore >= 80 ? '#2d8f8f' : subScore >= 50 ? '#c9872e' : subScore >= 25 ? '#ea580c' : '#dc2626';
            return (
              <button
                key={sub.uniprotId}
                onClick={() => onSelectSubTarget(sub.uniprotId)}
                className={`w-full text-left p-2.5 rounded-lg border transition-all duration-150 ${
                  selectedSubTargetId === sub.uniprotId
                    ? 'border-claude-accent/40 bg-claude-accent-light/30 dark:bg-[#3d2a22]/30'
                    : 'border-claude-border/50 dark:border-[#3d3832]/50 hover:border-claude-accent/30 hover:bg-claude-border-light/30 dark:hover:bg-[#3d3832]/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] font-semibold text-claude-accent">{sub.uniprotId}</span>
                      {sub.geneName && <span className="text-[10px] text-claude-text-muted">({sub.geneName})</span>}
                    </div>
                    <div className="text-[10px] text-claude-text-muted truncate mt-0.5">{sub.proteinName || subEval?.proteinName || '-'}</div>
                    {/* Mini stats */}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] text-claude-text-muted">
                        <span className="font-mono font-semibold">{sub.pdbCount || 0}</span> PDB
                      </span>
                      <span className="text-[9px] text-claude-text-muted">
                        <span className="font-mono font-semibold">{sub.blastCount || 0}</span> BLAST
                      </span>
                      {covPct > 0 && (
                        <span className="text-[9px] font-mono" style={{ color: covColor }}>{covPct.toFixed(0)}%</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    {subScore > 0 && (
                      <div className="flex items-center gap-1">
                        <div className="w-8 h-1.5 rounded-full bg-claude-border dark:bg-[#3d3832] overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(subScore, 100)}%`, backgroundColor: subScoreColor }} />
                        </div>
                        <span className="text-[10px] font-mono font-bold" style={{ color: subScoreColor }}>{subScore.toFixed(1)}</span>
                      </div>
                    )}
                    {selectedSubTargetId === sub.uniprotId && (
                      <span className="text-[9px] text-claude-accent mt-1">Viewing</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Shared Structure Analysis ── */}
      {(() => {
        const batchEvals = subTargets.map((sub: any) => allEvals.find((e: Evaluation) => e.uniprotId === sub.uniprotId)).filter(Boolean) as Evaluation[];
        if (batchEvals.length < 2) return null;
        const sharedMap = new Map<string, number>();
        batchEvals.forEach((ev: Evaluation) => {
          const pdbIds = new Set((ev.pdbStructures || []).map((s: any) => s.pdbId));
          pdbIds.forEach(pdbId => {
            sharedMap.set(pdbId, (sharedMap.get(pdbId) || 0) + 1);
          });
        });
        const sharedEntries = Array.from(sharedMap.entries())
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
        const sharedOnly = sharedEntries.filter(([, count]) => count > 1);
        if (sharedOnly.length === 0) return null;
        const getSharedColor = (count: number) => {
          if (count >= 4) return { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800/40' };
          if (count === 3) return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800/40' };
          return { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-800/40' };
        };
        return (
          <div className="rounded-[10px] border border-claude-border dark:border-[#3d3832] bg-claude-surface dark:bg-[#242220] p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-claude-text">
                Shared Structures <span className="text-claude-text-muted font-normal">({sharedOnly.length})</span>
              </h4>
              <span className="text-[9px] px-1.5 py-0.5 rounded font-medium bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 border border-teal-200/50 dark:border-teal-800/30">
                across 2+ targets
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
              {sharedOnly.map(([pdbId, count]) => {
                const colors = getSharedColor(count);
                return (
                  <a
                    key={pdbId}
                    href={`https://www.rcsb.org/structure/${pdbId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold border ${colors.bg} ${colors.text} ${colors.border} hover:opacity-80 transition-opacity`}
                  >
                    {pdbId}
                    <span className="text-[8px] font-normal opacity-70">×{count}</span>
                  </a>
                );
              })}
            </div>
            <div className="flex items-center gap-3 text-[9px] text-claude-text-muted pt-1 border-t border-claude-border/30 dark:border-[#3d3832]/30">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-teal-400" /> 2 targets</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-400" /> 3 targets</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-orange-400" /> 4+ targets</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
