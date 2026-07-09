'use client';

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRightLeft, LayoutDashboard, Clock, Database, FlaskConical, CheckCircle2, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatCard, CircularProgress, MiniBar } from '@/components/ui/stat-card';
import type { Evaluation, EvalBatch, EvalBatchSubTarget } from '@/lib/pdb-types';
import type { EvaluationViewProps } from './types';

// Dynamic imports for heavy components (recharts/cmdk-based)
const EvaluationPage = dynamic(() => import('@/components/evaluation-page').then(m => ({ default: m.EvaluationPage })), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-claude-border-light rounded h-8 w-full" />,
});

const EvalComparison = dynamic(() => import('@/components/eval-comparison').then(m => ({ default: m.EvalComparison })), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-claude-border-light rounded h-8 w-full" />,
});

const EvalBatchCompare = dynamic(() => import('@/components/EvalBatchCompare').then(m => ({ default: m.EvalBatchCompare })), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-claude-border-light rounded h-8 w-full" />,
});

const EvalDashboard = dynamic(() => import('@/components/eval-dashboard').then(m => ({ default: m.EvalDashboard })), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-claude-border-light rounded h-8 w-full" />,
});

const EvalGanttTimeline = dynamic(() => import('@/components/eval-gantt-timeline').then(m => ({ default: m.EvalGanttTimeline })), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-claude-border-light rounded h-8 w-full" />,
});

// StatCard, CircularProgress, sparkline, trend utilities now imported from @/components/ui/stat-card

// ─── Compact Eval Stat Cards ──────────────────────────────────────────────────
// Matches the same overview → separator → action bar pattern as Weekly & Literature

function EvalStatCards({ evaluations, evalBatches, evalLoading }: {
  evaluations: Evaluation[];
  evalBatches: EvalBatch[];
  evalLoading: boolean;
}) {
  const totalEvals = evaluations.length;
  const totalBatches = evalBatches.length;

  const avgCoverage = useMemo(() => {
    const withCoverage = evaluations.filter(e => e.coverage != null);
    if (withCoverage.length === 0) return 0;
    return withCoverage.reduce((sum, e) => sum + (e.coverage ?? 0), 0) / withCoverage.length;
  }, [evaluations]);

  const highCoverageCount = evaluations.filter(e => (e.coverage ?? 0) >= 80).length;

  const highCoveragePct = totalEvals > 0 ? (highCoverageCount / totalEvals) * 100 : 0;

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
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-2 sm:p-3 [grid-auto-rows:1fr] min-w-0 stagger-list">
      {/* Eval Targets — completion rate ring */}
      <StatCard
        title="Eval Targets"
        value={totalEvals}
        icon={<FlaskConical className="h-3.5 w-3.5 text-white" />}
        color="bg-gradient-to-br from-[#2d8f8f] to-[#1a6b6b]"
        glowColor="#2d8f8f"
        subtitle={`${totalBatches} batch${totalBatches !== 1 ? 'es' : ''} · ${completionRate.toFixed(0)}% done`}
        loading={evalLoading}
        delay={0}
        borderColor="#2d8f8f"
        tooltip={`Eval Targets: ${totalEvals} (${completionRate.toFixed(0)}% complete, ${totalBatches} batches)`}
      >
        <CircularProgress value={completionRate} max={100} color="#2d8f8f" size={28} />
      </StatCard>

      {/* Batches — mini bar showing batch density */}
      <StatCard
        title="Batches"
        value={totalBatches}
        icon={<Database className="h-3.5 w-3.5 text-white" />}
        color="bg-gradient-to-br from-[#c9872e] to-[#a06b1a]"
        glowColor="#c9872e"
        subtitle={`${totalEvals} evals · ${(totalEvals / Math.max(totalBatches, 1)).toFixed(1)} avg`}
        loading={evalLoading}
        delay={80}
        borderColor="#c9872e"
        tooltip={`Batches: ${totalBatches} (${totalEvals} evaluations, avg ${(totalEvals / Math.max(totalBatches, 1)).toFixed(1)} evals/batch)`}
      >
        <MiniBar value={totalBatches > 0 ? Math.min((totalBatches / Math.max(totalEvals, 1)) * 100 * 3, 100) : 0} max={100} color="#c9872e" width={40} height={5} />
      </StatCard>

      {/* Avg Coverage — coverage ring */}
      <StatCard
        title="Avg Coverage"
        value={avgCoverage}
        suffix="%"
        decimals={0}
        icon={<Target className="h-3.5 w-3.5 text-white" />}
        color="bg-gradient-to-br from-[#7c5cbf] to-[#5a3d99]"
        glowColor="#7c5cbf"
        subtitle={`${highCoverageCount} high (≥80%)`}
        loading={evalLoading}
        delay={160}
        borderColor="#7c5cbf"
        tooltip={`Avg Coverage: ${avgCoverage.toFixed(1)}% (${highCoverageCount} high ≥80%)`}
      >
        <CircularProgress value={avgCoverage} max={100} color="#7c5cbf" size={28} />
      </StatCard>

      {/* ≥80% Coverage — mini bar */}
      <StatCard
        title="≥80% Coverage"
        value={highCoverageCount}
        icon={<CheckCircle2 className="h-3.5 w-3.5 text-white" />}
        color="bg-gradient-to-br from-[#16a34a] to-[#0d7a35]"
        glowColor="#16a34a"
        subtitle={totalEvals > 0 ? `${((highCoverageCount / totalEvals) * 100).toFixed(0)}% of total` : 'No data'}
        loading={evalLoading}
        delay={240}
        borderColor="#16a34a"
        tooltip={`High Coverage: ${highCoverageCount} targets ≥80% (${totalEvals > 0 ? ((highCoverageCount / totalEvals) * 100).toFixed(0) : 0}%)`}
      >
        <MiniBar value={highCoveragePct} max={100} color="#16a34a" width={40} height={5} />
      </StatCard>
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
  const currentSubView: string = evalSubView;
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
          className={`h-7 px-2.5 text-[11px] ${currentSubView === 'compare' ? 'bg-claude-accent/10 text-claude-accent' : 'text-claude-text-muted'}`}
        >
          <ArrowRightLeft className="h-3 w-3 mr-1" />
          Compare
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSetEvalSubView('dashboard')}
          className={`h-7 px-2.5 text-[11px] ${currentSubView === 'dashboard' ? 'bg-claude-accent/10 text-claude-accent' : 'text-claude-text-muted'}`}
        >
          <LayoutDashboard className="h-3 w-3 mr-1" />
          Dashboard
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSetEvalSubView('timeline')}
          className={`h-7 px-2.5 text-[11px] ${currentSubView === 'timeline' ? 'bg-claude-accent/10 text-claude-accent' : 'text-claude-text-muted'}`}
        >
          <Clock className="h-3 w-3 mr-1" />
          Timeline
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSetEvalSubView('batch')}
          className={`h-7 px-2.5 text-[11px] ${currentSubView === 'batch' ? 'bg-claude-accent/10 text-claude-accent' : 'text-claude-text-muted'}`}
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
