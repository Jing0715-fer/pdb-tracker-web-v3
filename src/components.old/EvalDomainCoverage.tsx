'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Evaluation } from '@/lib/pdb-types';
import { AnimatedNumber } from '@/components/ui/pdb-animated';

// ─── Method Color Helpers ──────────────────────────────────────────────────────

const METHOD_COLORS: Record<string, { light: string; dark: string; label: string }> = {
  cryo: { light: '#2d8f8f', dark: '#3db5b5', label: 'Cryo-EM' },
  xray: { light: '#7c5cbf', dark: '#9b7ed8', label: 'X-ray' },
  nmr: { light: '#c9872e', dark: '#d9a24e', label: 'NMR' },
};

function getMethodStyle(method: string, isDark: boolean) {
  const m = (method || '').toUpperCase();
  if (m.includes('CRYO')) return METHOD_COLORS.cryo;
  if (m.includes('X-RAY') || m.includes('XRAY')) return METHOD_COLORS.xray;
  if (m.includes('NMR')) return METHOD_COLORS.nmr;
  return { light: '#6b7280', dark: '#9b9590', label: 'Other' };
}

// ─── Props & Main Component ────────────────────────────────────────────────────

interface EvalDomainCoverageProps { evaluation: Evaluation; }

export function EvalDomainCoverage({ evaluation }: EvalDomainCoverageProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [hoveredMethod, setHoveredMethod] = useState<string | null>(null);

  const seqLength = evaluation.sequenceLength || 1;
  const pdbCoveragePct = evaluation.coverage ?? 0;  // Source-of-truth from DB (PDB-only)
  const structures = evaluation.pdbStructures || [];
  const blastResults = evaluation.blastResults || [];

  // ─── Derived data ────────────────────────────────────────────────────────────

  const methodCounts = useMemo(() => {
    const counts = new Map<string, number>();
    structures.forEach((s) => {
      const key = s.method || 'Other';
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [structures]);

  const methodLegend = useMemo(() => {
    const seen = new Set<string>();
    return structures
      .filter((s) => s.method && !seen.has(s.method) && seen.add(s.method))
      .map((s) => ({ method: s.method!, style: getMethodStyle(s.method!, isDark) }));
  }, [structures, isDark]);

  const blastCount = blastResults.length;
  const avgIdentity = blastCount > 0
    ? blastResults.reduce((sum, b) => sum + (b.identity ?? 0), 0) / blastCount : 0;

  // ─── BLAST-derived coverage ────────────────────────────────────────────────
  // queryCoverage is a residue count (e.g. 838 for full-length P04637).
  // Best BLAST hit coverage = max queryCoverage / seqLength * 100, capped at 100.
  // This represents the fraction of the protein that can be modeled via
  // the best homologous structure (not necessarily the same organism).
  const bestBlastCoveragePct = useMemo(() => {
    if (blastResults.length === 0) return 0;
    const maxQueryCov = Math.max(
      ...blastResults
        .map((b) => b.queryCoverage ?? 0)
        .filter((c) => c > 0)
    );
    if (maxQueryCov === 0) return 0;
    return Math.min((maxQueryCov / seqLength) * 100, 100);
  }, [blastResults, seqLength]);

  // Effective coverage = max of PDB coverage and best BLAST homolog coverage.
  // Rationale: even without direct PDB structures, a high-coverage homolog
  // enables reliable comparative modeling for the corresponding regions.
  const coveragePct = Math.max(pdbCoveragePct, bestBlastCoveragePct);
  const coverageSource = bestBlastCoveragePct > pdbCoveragePct ? 'homolog' : 'pdb';

  const hasPdbData = structures.length > 0;
  const hasBlastData = blastCount > 0;
  const hasData = hasPdbData || hasBlastData;

  const bgPattern = isDark ? '#4a4540' : '#d4cfc8';
  const grayFill = isDark ? '#6b7280' : '#9ca3af';

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-semibold text-claude-text uppercase tracking-wider">
          Domain Coverage
        </h4>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-claude-text-muted">
            {structures.length} structure{structures.length !== 1 ? 's' : ''}
            {hasBlastData && ` · ${blastCount} homolog${blastCount !== 1 ? 's' : ''}`}
          </span>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-claude-accent/10 dark:bg-claude-accent/20">
            <span className="text-[10px] font-medium text-claude-accent">Coverage</span>
            <span className="text-xs font-bold text-claude-accent">
              <AnimatedNumber value={coveragePct} decimals={0} suffix="%" />
            </span>
            {coverageSource === 'homolog' && (
              <span className="text-[8px] font-medium text-claude-text-muted" title="Estimated from best BLAST homolog">via homolog</span>
            )}
          </div>
        </div>
      </div>

      {/* Coverage bar */}
      <div className="relative">
        <div className="relative h-10 bg-claude-border-light/60 dark:bg-[#2b2926]/60 rounded-lg overflow-hidden border border-claude-border/30 dark:border-[#3d3832]/30">
          {/* Dashed background */}
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 8px, ${bgPattern} 8px, ${bgPattern} 10px)` }} />

          {/* No data */}
          {!hasData && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] text-claude-text-muted italic">No PDB or BLAST data available</span>
            </div>
          )}

          {/* Method segments (PDB coverage) */}
          {hasPdbData && pdbCoveragePct > 0 && (
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              style={{ width: `${pdbCoveragePct}%`, height: '100%', position: 'absolute', left: 0, top: 0, display: 'flex', transformOrigin: 'left' }}
            >
              {Array.from(methodCounts.entries()).map(([method, count], idx) => {
                const fraction = count / structures.length;
                const { light: fillColor } = getMethodStyle(method, false);
                const isHovered = hoveredMethod === method;
                return (
                  <Tooltip key={idx}>
                    <TooltipTrigger asChild>
                      <motion.div
                        initial={{ scaleX: 0, opacity: 0 }}
                        animate={{ scaleX: 1, opacity: 1 }}
                        transition={{ duration: 0.4, delay: idx * 0.05 }}
                        onMouseEnter={() => setHoveredMethod(method)}
                        onMouseLeave={() => setHoveredMethod(null)}
                        style={{ width: `${fraction * 100}%`, height: '100%' }}
                        className="relative cursor-pointer"
                      >
                        <div className="w-full h-full" style={{ backgroundColor: fillColor, opacity: isHovered ? 0.95 : 0.75 }} />
                        {fraction > 0.15 && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[8px] font-medium text-white/90 drop-shadow-sm">{count}</span>
                          </div>
                        )}
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-claude-surface dark:bg-[#242220] border border-claude-border dark:border-[#3d3832] shadow-lg">
                      <div className="text-[11px] flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: fillColor }} />
                        <span className="font-medium">{getMethodStyle(method, false).label}</span>
                        <span className="text-claude-text-muted">× {count}</span>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </motion.div>
          )}

          {/* BLAST homolog coverage (extends from PDB coverage to total coverage) */}
          {hasBlastData && bestBlastCoveragePct > pdbCoveragePct && (
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.4, ease: 'easeOut' }}
                  style={{
                    position: 'absolute',
                    left: `${pdbCoveragePct}%`,
                    width: `${bestBlastCoveragePct - pdbCoveragePct}%`,
                    height: '100%',
                    transformOrigin: 'left',
                    backgroundColor: grayFill,
                    opacity: 0.35,
                    backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 4px, ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'} 4px, ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'} 6px)`,
                    borderLeft: `1px dashed ${isDark ? '#9b9590' : '#6b7280'}`,
                  }}
                  className="cursor-help"
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-claude-surface dark:bg-[#242220] border border-claude-border dark:border-[#3d3832] shadow-lg">
                <div className="text-[11px] space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: grayFill, opacity: 0.5 }} />
                    <span className="font-medium">BLAST Homolog Extension</span>
                  </div>
                  <div className="text-[10px] text-claude-text-muted">
                    {(bestBlastCoveragePct - pdbCoveragePct).toFixed(0)}% modeled by best homolog
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          )}

          {/* BLAST indicator (small marker for proteins with only BLAST, no useful coverage gap) */}
          {hasBlastData && bestBlastCoveragePct <= pdbCoveragePct && (
            <motion.div initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: 0.6 }} transition={{ duration: 0.4, delay: 0.3 }}
              style={{ position: 'absolute', right: 0, top: '20%', height: '60%', width: '3px', backgroundColor: grayFill, borderRadius: '2px' }}
            />
          )}
        </div>

        {/* Ruler */}
        <div className="flex items-center justify-between mt-1 px-0.5">
          <span className="text-[8px] text-claude-text-muted font-mono">1</span>
          {seqLength > 100 && <span className="text-[8px] text-claude-text-muted font-mono">{Math.round(seqLength / 2)}</span>}
          <span className="text-[8px] text-claude-text-muted font-mono">{seqLength}</span>
        </div>
      </div>

      {/* BLAST stats */}
      {hasBlastData && (
        <div className="flex items-center gap-3 text-[9px] text-claude-text-muted flex-wrap">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: grayFill }} />
            {blastCount} BLAST homolog{blastCount !== 1 ? 's' : ''}
          </span>
          <span>avg {avgIdentity.toFixed(1)}% identity</span>
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-claude-border-light/60 dark:bg-[#2b2926] border border-claude-border/40">
            <span className="text-claude-text-secondary dark:text-[#9b9590]">Best homolog covers</span>
            <span className="font-mono font-semibold text-claude-accent">{bestBlastCoveragePct.toFixed(0)}%</span>
            <span className="text-claude-text-muted">of sequence</span>
          </span>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3">
        {methodLegend.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: item.style.light, opacity: 0.8 }} />
            <span className="text-[9px] text-claude-text-muted font-medium">{item.style.label} ×{methodCounts.get(item.method) || 0}</span>
          </div>
        ))}
        {hasBlastData && (
          <>
            {bestBlastCoveragePct > pdbCoveragePct && (
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{
                    backgroundColor: grayFill,
                    opacity: 0.35,
                    backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 1px, ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'} 1px, ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'} 2px)`,
                  }}
                />
                <span className="text-[9px] text-claude-text-muted font-medium">Homolog Extension</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0 bg-claude-cryoem/20 border border-claude-cryoem/30" />
              <span className="text-[9px] text-claude-text-muted font-medium">BLAST Homologs</span>
            </div>
          </>
        )}
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0 opacity-20" style={{ backgroundImage: `repeating-linear-gradient(90deg, ${bgPattern}, ${bgPattern} 2px, transparent 2px, transparent 4px)` }} />
          <span className="text-[9px] text-claude-text-muted font-medium">Uncovered</span>
        </div>
      </div>
    </div>
  );
}
