'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRightLeft, LayoutDashboard, Clock, Database, FlaskConical, CheckCircle2, AlertTriangle, Target, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TiltCard, AnimatedNumber } from '@/components/ui/pdb-animated';
import { DistributionBar, type DistributionSegment } from '@/components/ui/distribution-bar';
import { EvaluationPage } from '@/components/evaluation-page';
import { EvalComparison } from '@/components/eval-comparison';
import { EvalBatchCompare } from '@/components/EvalBatchCompare';
import { EvalDashboard } from '@/components/eval-dashboard';
import { EvalGanttTimeline } from '@/components/eval-gantt-timeline';
import type { Evaluation, EvalBatch, EvalBatchSubTarget } from '@/lib/pdb-types';
import type { EvaluationViewProps } from './types';

// ─── Circular Progress SVG ────────────────────────────────────────────────────

function CircularProgress({ value, max, color, size = 34 }: { value: number; max: number; color: string; size?: number }) {
  const radius = (size - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);
  const offset = circumference * (1 - progress);

  return (
    <svg width={size} height={size} className="transform -rotate-90 flex-shrink-0">
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="currentColor"
        strokeWidth={2.5}
        className="text-claude-border dark:text-[#3d3832]"
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
      />
    </svg>
  );
}

// ─── Compact Eval Stat Cards ──────────────────────────────────────────────────
// Matches the same overview → separator → action bar pattern as Weekly & Literature

function EvalStatCards({ evaluations, evalBatches, evalLoading }: {
  evaluations: Evaluation[];
  evalBatches: EvalBatch[];
  evalLoading: boolean;
}) {
  const totalEvals = evaluations.length;
  const totalBatches = evalBatches.length;

  // Compute average coverage
  const avgCoverage = useMemo(() => {
    const withCoverage = evaluations.filter(e => e.coverage != null);
    if (withCoverage.length === 0) return 0;
    return withCoverage.reduce((sum, e) => sum + (e.coverage ?? 0), 0) / withCoverage.length;
  }, [evaluations]);

  // High coverage count (>=80%)
  const highCoverageCount = evaluations.filter(e => (e.coverage ?? 0) >= 80).length;
  const midCoverageCount = evaluations.filter(e => (e.coverage ?? 0) >= 50 && (e.coverage ?? 0) < 80).length;
  const lowCoverageCount = evaluations.filter(e => (e.coverage ?? 0) < 50).length;

  // Coverage distribution segments for the "High Coverage" card
  const coverageSegments: DistributionSegment[] = useMemo(() => [
    { label: 'High', count: highCoverageCount, color: '#16a34a' },
    { label: 'Mid', count: midCoverageCount, color: '#c9872e' },
    { label: 'Low', count: lowCoverageCount, color: '#dc2626' },
  ], [highCoverageCount, midCoverageCount, lowCoverageCount]);

  // Completion rate: evaluation has pdbStructures > 0 AND blastResults > 0 AND report
  const completionRate = useMemo(() => {
    if (totalEvals === 0) return 0;
    const completedCount = evaluations.filter(e => {
      const hasPdb = (e.pdbStructures?.length ?? 0) > 0;
      const hasBlast = (e.blastResults?.length ?? 0) > 0;
      const hasReport = !!e.report;
      return hasPdb && hasBlast && hasReport;
    }).length;
    return (completedCount / totalEvals) * 100;
  }, [evaluations, totalEvals]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-2 sm:p-3 [grid-auto-rows:1fr] min-w-0">
      {/* Total Targets */}
      <TiltCard className="gradient-border-wrap min-w-0 h-full" style={{ '--gradient-border-color': '#2d8f8f' } as React.CSSProperties}>
        <div className="gradient-border-inner bg-claude-surface dark:bg-[#242220] p-3 sm:p-4 claude-card-shadow transition-transform duration-200 min-w-0 h-full flex flex-col">
          <div className="flex items-start justify-between mb-1.5 sm:mb-2 min-h-[36px] gap-2">
            <div className="flex items-center justify-center w-8 h-8 min-w-[32px] rounded-md bg-gradient-to-br from-[#2d8f8f] to-[#1a6b6b] stat-icon-float flex-shrink-0">
              <FlaskConical className="h-4 w-4 text-white" />
            </div>
            <div className="hidden sm:flex items-center justify-end h-[38px] min-w-0 flex-1">
              <CircularProgress value={completionRate} max={100} color="#2d8f8f" size={34} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-claude-text tabular-nums">
            {evalLoading ? <div className="w-14 sm:w-16 h-6 sm:h-7 rounded shimmer-skeleton" /> : <AnimatedNumber value={totalEvals} glowColor="#2d8f8f" />}
          </div>
          <div className="text-[10px] sm:text-[11px] text-claude-text-muted mt-0.5">Eval Targets</div>
          <div className="text-[9px] sm:text-[10px] mt-0.5 line-clamp-1 text-claude-text-muted opacity-70">{totalBatches} batch{totalBatches !== 1 ? 'es' : ''} · {completionRate.toFixed(0)}% complete</div>
        </div>
      </TiltCard>

      {/* Batches */}
      <TiltCard className="gradient-border-wrap min-w-0 h-full" style={{ '--gradient-border-color': '#c9872e' } as React.CSSProperties}>
        <div className="gradient-border-inner bg-claude-surface dark:bg-[#242220] p-3 sm:p-4 claude-card-shadow transition-transform duration-200 min-w-0 h-full flex flex-col">
          <div className="flex items-start justify-between mb-1.5 sm:mb-2 min-h-[36px] gap-2">
            <div className="flex items-center justify-center w-8 h-8 min-w-[32px] rounded-md bg-gradient-to-br from-[#c9872e] to-[#a06b1a] stat-icon-float flex-shrink-0">
              <Database className="h-4 w-4 text-white" />
            </div>
            <div className="hidden sm:flex items-center justify-end h-[38px] min-w-0 flex-1">
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#c9872e]/10">
                <TrendingUp className="h-3 w-3 text-[#c9872e]" />
                <span className="text-[9px] font-mono font-semibold text-[#c9872e]">
                  {totalEvals > 0 ? (totalEvals / Math.max(totalBatches, 1)).toFixed(1) : '0'}
                </span>
              </div>
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-claude-text tabular-nums">
            {evalLoading ? <div className="w-14 sm:w-16 h-6 sm:h-7 rounded shimmer-skeleton" /> : <AnimatedNumber value={totalBatches} glowColor="#c9872e" />}
          </div>
          <div className="text-[10px] sm:text-[11px] text-claude-text-muted mt-0.5">Batches</div>
          <div className="text-[9px] sm:text-[10px] mt-0.5 line-clamp-1 text-claude-text-muted opacity-70">{totalEvals} evaluations</div>
        </div>
      </TiltCard>

      {/* Avg Coverage */}
      <TiltCard className="gradient-border-wrap min-w-0 h-full" style={{ '--gradient-border-color': '#7c5cbf' } as React.CSSProperties}>
        <div className="gradient-border-inner bg-claude-surface dark:bg-[#242220] p-3 sm:p-4 claude-card-shadow transition-transform duration-200 min-w-0 h-full flex flex-col">
          <div className="flex items-start justify-between mb-1.5 sm:mb-2 min-h-[36px] gap-2">
            <div className="flex items-center justify-center w-8 h-8 min-w-[32px] rounded-md bg-gradient-to-br from-[#7c5cbf] to-[#5a3d99] stat-icon-float flex-shrink-0">
              <Target className="h-4 w-4 text-white" />
            </div>
            <div className="hidden sm:flex items-center justify-end h-[38px] min-w-0 flex-1">
              <CircularProgress value={avgCoverage} max={100} color="#7c5cbf" size={34} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-claude-text tabular-nums">
            {evalLoading ? <div className="w-14 sm:w-16 h-6 sm:h-7 rounded shimmer-skeleton" /> : <AnimatedNumber value={avgCoverage} suffix="%" decimals={0} glowColor="#7c5cbf" />}
          </div>
          <div className="text-[10px] sm:text-[11px] text-claude-text-muted mt-0.5">Avg Coverage</div>
          <div className="text-[9px] sm:text-[10px] mt-0.5 line-clamp-1 text-claude-text-muted opacity-70">{highCoverageCount} high (≥80%)</div>
        </div>
      </TiltCard>

      {/* High Coverage — with coverage distribution bar */}
      <TiltCard className="gradient-border-wrap min-w-0 h-full" style={{ '--gradient-border-color': '#16a34a' } as React.CSSProperties}>
        <div className="gradient-border-inner bg-claude-surface dark:bg-[#242220] p-3 sm:p-4 claude-card-shadow transition-transform duration-200 min-w-0 h-full flex flex-col">
          <div className="flex items-start justify-between mb-1.5 sm:mb-2 min-h-[36px] gap-2">
            <div className="flex items-center justify-center w-8 h-8 min-w-[32px] rounded-md bg-gradient-to-br from-[#16a34a] to-[#0d7a35] stat-icon-float flex-shrink-0">
              <CheckCircle2 className="h-4 w-4 text-white" />
            </div>
            <div className="hidden sm:flex items-center justify-end h-[38px] min-w-0 flex-1">
              <DistributionBar segments={coverageSegments} width={90} height={6} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-claude-text tabular-nums">
            {evalLoading ? <div className="w-14 sm:w-16 h-6 sm:h-7 rounded shimmer-skeleton" /> : <AnimatedNumber value={highCoverageCount} glowColor="#16a34a" />}
          </div>
          <div className="text-[10px] sm:text-[11px] text-claude-text-muted mt-0.5">≥80% Coverage</div>
          <div className="text-[9px] sm:text-[10px] mt-0.5 line-clamp-1 text-claude-text-muted opacity-70">{totalEvals > 0 ? `${((highCoverageCount / totalEvals) * 100).toFixed(0)}% of total` : 'No data'}</div>
        </div>
      </TiltCard>
    </div>
  );
}

export function EvaluationView({
  evaluations,
  allEvaluations,
  evalBatches,
  batchSubTargets,
  selectedEvalId,
  selectedEval,
  evalLoading,
  evalSubView,
  evalDetailTab,
  selectedEvalStructure,
  evalReportContent,
  detailPanelOpen,
  onSelectEvalId,
  onSetEvalSubView,
  onSetEvalDetailTab,
  onSetSelectedEvalStructure,
}: EvaluationViewProps) {
  // Sub-view: toolbar + full-width component
  if (evalSubView === 'compare' || evalSubView === 'dashboard' || evalSubView === 'timeline' || evalSubView === 'batch') {
    return (
      <div className="flex flex-col h-full">
        {/* Sub-view navigation bar */}
        <div className="px-4 py-2 flex items-center gap-2 flex-shrink-0 border-b border-claude-border dark:border-[#3d3832] bg-claude-surface dark:bg-[#242220]">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSetEvalSubView('default')}
            className="h-7 px-2.5 text-[11px] text-claude-text-secondary hover:text-claude-text"
          >
            ← Back to Evaluation
          </Button>
          <div className="flex items-center gap-1 ml-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSetEvalSubView('compare')}
              className={`h-7 px-2.5 text-[11px] ${evalSubView === 'compare' ? 'bg-claude-accent/10 text-claude-accent' : 'text-claude-text-muted'}`}
            >
              <ArrowRightLeft className="h-3 w-3 mr-1" />
              Compare
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSetEvalSubView('dashboard')}
              className={`h-7 px-2.5 text-[11px] ${evalSubView === 'dashboard' ? 'bg-claude-accent/10 text-claude-accent' : 'text-claude-text-muted'}`}
            >
              <LayoutDashboard className="h-3 w-3 mr-1" />
              Dashboard
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSetEvalSubView('timeline')}
              className={`h-7 px-2.5 text-[11px] ${evalSubView === 'timeline' ? 'bg-claude-accent/10 text-claude-accent' : 'text-claude-text-muted'}`}
            >
              <Clock className="h-3 w-3 mr-1" />
              Timeline
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSetEvalSubView('batch')}
              className={`h-7 px-2.5 text-[11px] ${evalSubView === 'batch' ? 'bg-claude-accent/10 text-claude-accent' : 'text-claude-text-muted'}`}
            >
              <Database className="h-3 w-3 mr-1" />
              Batch Matrix
            </Button>
          </div>
        </div>
        {/* Sub-view content */}
        <div className="flex-1 min-h-0">
          {evalSubView === 'compare' && <EvalComparison evaluations={allEvaluations} />}
          {evalSubView === 'dashboard' && (
            <EvalDashboard
              evaluations={allEvaluations}
              batches={evalBatches}
              batchSubTargets={batchSubTargets}
              onViewBatch={(batchId) => { onSetEvalSubView('batch'); void batchId; }}
            />
          )}
          {evalSubView === 'timeline' && (
            <EvalGanttTimeline
              evaluations={allEvaluations}
              onSelectEval={(id) => { onSelectEvalId(id); }}
              selectedUniprotId={selectedEvalId}
            />
          )}
          {evalSubView === 'batch' && (
            <EvalBatchCompare
              evaluations={allEvaluations}
              batches={evalBatches}
              batchSubTargets={batchSubTargets}
            />
          )}
        </div>
      </div>
    );
  }

  // Default: individual evaluation page with overview → separator → action bar pattern
  return (
    <>
      {/* Overview stat cards — same pattern as Weekly & Literature */}
      <EvalStatCards evaluations={allEvaluations} evalBatches={evalBatches} evalLoading={evalLoading} />

      {/* Colored separator — same gradient as Weekly & Literature: after overview, before action bar */}
      <div
        className="mx-4 mt-2 h-[2px] flex-shrink-0"
        style={{ background: 'linear-gradient(90deg, #c96442, #2d8f8f, #7c5cbf, #c9872e)' }}
      />

      {/* Compare + Dashboard + Timeline toggle buttons — white bg same as Weekly & Literature */}
      <div className="px-4 py-2 flex items-center gap-2 flex-shrink-0 border-b border-claude-border dark:border-[#3d3832] bg-claude-surface dark:bg-[#242220]">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSetEvalSubView('compare')}
          className={`h-7 px-2.5 text-[11px] ${evalSubView === 'compare' ? 'bg-claude-accent/10 text-claude-accent' : 'text-claude-text-muted'}`}
        >
          <ArrowRightLeft className="h-3 w-3 mr-1" />
          Compare
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSetEvalSubView('dashboard')}
          className={`h-7 px-2.5 text-[11px] ${evalSubView === 'dashboard' ? 'bg-claude-accent/10 text-claude-accent' : 'text-claude-text-muted'}`}
        >
          <LayoutDashboard className="h-3 w-3 mr-1" />
          Dashboard
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSetEvalSubView('timeline')}
          className={`h-7 px-2.5 text-[11px] ${evalSubView === 'timeline' ? 'bg-claude-accent/10 text-claude-accent' : 'text-claude-text-muted'}`}
        >
          <Clock className="h-3 w-3 mr-1" />
          Timeline
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSetEvalSubView('batch')}
          className={`h-7 px-2.5 text-[11px] ${evalSubView === 'batch' ? 'bg-claude-accent/10 text-claude-accent' : 'text-claude-text-muted'}`}
        >
          <Database className="h-3 w-3 mr-1" />
          Batch Matrix
        </Button>
      </div>
      <EvaluationPage
        evaluation={selectedEval}
        loading={evalLoading}
        selectedPdbId={selectedEvalStructure?.pdbId ?? null}
        onSelectPdb={(pdbId) => {
          if (!selectedEval) return;
          // Find the matching EvalRow from pdbStructures or blastResults
          const structRow = selectedEval.pdbStructures.find(s => s.pdbId === pdbId);
          if (structRow) {
            onSetSelectedEvalStructure({ ...structRow, _type: 'structure' });
            return;
          }
          const blastRow = selectedEval.blastResults.find(b => b.pdbId === pdbId);
          if (blastRow) {
            onSetSelectedEvalStructure({
              ...blastRow,
              _type: 'blast',
              ifTier: blastRow.ifTier || '',
              journalIf: blastRow.journalIf ?? null,
              title: blastRow.title || blastRow.description || null,
              releaseDate: blastRow.releaseDate || null,
              pubmedId: blastRow.pubmedId || null,
              pubmedTitle: blastRow.pubmedTitle || null,
              pubmedAuthors: blastRow.pubmedAuthors || null,
              pubmedAbstract: blastRow.pubmedAbstract || null,
            });
          }
        }}
      />
    </>
  );
}
