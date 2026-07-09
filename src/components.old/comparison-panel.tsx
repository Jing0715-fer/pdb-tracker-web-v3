'use client';

import React from 'react';
import { X, GitCompare, ShieldCheck, Beaker, Ruler, Dna, FlaskConical } from 'lucide-react';

interface CompareStructure {
  pdbId: string;
  title: string;
  method: string;
  resolution: number | null;
  quality: {
    molprobity_score: number | null;
    ramachandran_favored: number | null;
    clash_score: number | null;
  } | null;
  entities: number;
  ligands: number;
}

interface ComparisonPanelProps {
  base: CompareStructure;
  target: CompareStructure;
  onClose: () => void;
}

function MetricRow({
  label,
  baseValue,
  targetValue,
  unit = '',
  lowerIsBetter = false,
  icon: Icon,
}: {
  label: string;
  baseValue: number | null;
  targetValue: number | null;
  unit?: string;
  lowerIsBetter?: boolean;
  icon: React.ElementType;
}) {
  const baseStr = baseValue != null ? `${baseValue}${unit}` : 'N/A';
  const targetStr = targetValue != null ? `${targetValue}${unit}` : 'N/A';

  let winner: 'base' | 'target' | 'tie' | null = null;
  if (baseValue != null && targetValue != null) {
    if (baseValue === targetValue) {
      winner = 'tie';
    } else if (lowerIsBetter) {
      winner = baseValue < targetValue ? 'base' : 'target';
    } else {
      winner = baseValue > targetValue ? 'base' : 'target';
    }
  }

  return (
    <div className="flex items-center gap-2 py-2 border-b border-claude-border/50 last:border-0">
      <Icon className="w-3.5 h-3.5 text-claude-muted flex-shrink-0" />
      <span className="text-[11px] text-claude-muted flex-1 min-w-0 truncate">{label}</span>
      <span
        className={`text-[11px] font-mono font-medium w-16 text-right ${
          winner === 'base' ? 'text-emerald-600 metric-better' : 'text-claude-text'
        }`}
      >
        {baseStr}
      </span>
      <span className="text-[10px] text-claude-muted">vs</span>
      <span
        className={`text-[11px] font-mono font-medium w-16 text-right ${
          winner === 'target' ? 'text-emerald-600 metric-better' : 'text-claude-text'
        }`}
      >
        {targetStr}
      </span>
      {winner === 'tie' && (
        <span className="text-[9px] bg-claude-surface text-claude-muted px-1 rounded">tie</span>
      )}
    </div>
  );
}

export default function ComparisonPanel({ base, target, onClose }: ComparisonPanelProps) {
  return (
    <div className="flex-shrink-0 border-b border-claude-border bg-claude-surface/50 backdrop-blur-sm comparison-panel-border">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-claude-border/50">
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-claude-accent" />
          <span className="text-xs font-semibold text-claude-text">Structure Comparison</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-claude-border/30 text-claude-muted hover:text-claude-text transition-colors btn-click-ripple"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* PDB IDs Header */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 px-3 py-1.5 bg-claude-bg/50">
        <div className="text-center">
          <span className="text-sm font-mono font-bold text-claude-accent">{base.pdbId}</span>
          <p className="text-[9px] text-claude-muted truncate">{base.title}</p>
        </div>
        <div className="flex items-center text-[10px] text-claude-muted font-medium">VS</div>
        <div className="text-center">
          <span className="text-sm font-mono font-bold text-claude-accent">{target.pdbId}</span>
          <p className="text-[9px] text-claude-muted truncate">{target.title}</p>
        </div>
      </div>

      {/* Metrics */}
      <div className="px-3 py-1">
        <MetricRow
          label="Resolution"
          baseValue={base.resolution}
          targetValue={target.resolution}
          unit=" Å"
          lowerIsBetter
          icon={Ruler}
        />
        <MetricRow
          label="MolProbity Score"
          baseValue={base.quality?.molprobity_score ?? null}
          targetValue={target.quality?.molprobity_score ?? null}
          lowerIsBetter
          icon={ShieldCheck}
        />
        <MetricRow
          label="Clash Score"
          baseValue={base.quality?.clash_score ?? null}
          targetValue={target.quality?.clash_score ?? null}
          lowerIsBetter
          icon={Beaker}
        />
        <MetricRow
          label="Rama Favored %"
          baseValue={base.quality?.ramachandran_favored ?? null}
          targetValue={target.quality?.ramachandran_favored ?? null}
          unit="%"
          icon={Dna}
        />
        <MetricRow
          label="Entities"
          baseValue={base.entities}
          targetValue={target.entities}
          icon={FlaskConical}
        />
        <MetricRow
          label="Ligands"
          baseValue={base.ligands}
          targetValue={target.ligands}
          icon={FlaskConical}
        />
      </div>

      {/* Method comparison */}
      <div className="px-3 pb-2 pt-1 flex items-center gap-2">
        <span className="text-[9px] text-claude-muted">Method:</span>
        <span className="text-[9px] font-mono text-claude-text bg-claude-border/30 px-1.5 py-0.5 rounded">
          {base.method}
        </span>
        <span className="text-[9px] text-claude-muted">vs</span>
        <span className="text-[9px] font-mono text-claude-text bg-claude-border/30 px-1.5 py-0.5 rounded">
          {target.method}
        </span>
      </div>
    </div>
  );
}
