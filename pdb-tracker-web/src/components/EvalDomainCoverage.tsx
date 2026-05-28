'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Evaluation, EvalPdbStructure, EvalBlastResult } from '@/lib/pdb-types';
import { AnimatedNumber } from '@/components/ui/pdb-animated';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CoverageRegion {
  start: number;
  end: number;
  pdbId: string;
  method: string;
  label?: string;
}

interface BlastRegion {
  start: number;
  end: number;
  pdbId: string;
}

interface DomainRegion {
  start: number;
  end: number;
  label: string;
  color: string;
}

// ─── Method Color Helper ──────────────────────────────────────────────────────

function getMethodColor(method: string): { fill: string; label: string } {
  const m = (method || '').toUpperCase();
  if (m.includes('CRYO')) return { fill: '#2d8f8f', label: 'Cryo-EM' };
  if (m.includes('X-RAY') || m.includes('XRAY')) return { fill: '#7c5cbf', label: 'X-ray' };
  if (m.includes('NMR')) return { fill: '#c9872e', label: 'NMR' };
  return { fill: '#6b7280', label: 'Other' };
}

function getMethodColorDark(method: string): { fill: string } {
  const m = (method || '').toUpperCase();
  if (m.includes('CRYO')) return { fill: '#3db5b5' };
  if (m.includes('X-RAY') || m.includes('XRAY')) return { fill: '#9b7ed8' };
  if (m.includes('NMR')) return { fill: '#d9a24e' };
  return { fill: '#9b9590' };
}

// ─── Domain Colors ────────────────────────────────────────────────────────────

const DOMAIN_COLORS = [
  '#c96442', '#2d8f8f', '#7c5cbf', '#c9872e', '#16a34a',
  '#e55a4f', '#4a90d9', '#d4a843', '#6b8e6b', '#9b59b6',
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface EvalDomainCoverageProps {
  evaluation: Evaluation;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function EvalDomainCoverage({ evaluation }: EvalDomainCoverageProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  const seqLength = evaluation.sequenceLength || 1;
  const structures = evaluation.pdbStructures || [];
  const blastResults = evaluation.blastResults || [];

  // ─── Compute PDB coverage regions ────────────────────────────────────────

  const coverageRegions: CoverageRegion[] = useMemo(() => {
    return structures
      .filter((s) => s.unpStart != null && s.unpEnd != null)
      .map((s) => ({
        start: s.unpStart!,
        end: s.unpEnd!,
        pdbId: s.pdbId,
        method: s.method || '',
        label: s.title || s.pdbId,
      }));
  }, [structures]);

  // ─── Compute BLAST regions ───────────────────────────────────────────────

  const blastRegions: BlastRegion[] = useMemo(() => {
    return blastResults
      .filter((b) => {
        const queryCov = b.queryCoverage;
        return queryCov != null && queryCov > 0;
      })
      .map((b) => {
        const queryCov = b.queryCoverage!;
        // Infer region from query coverage percentage
        const coveredLength = Math.round((queryCov / 100) * seqLength);
        const start = Math.max(1, Math.round(1 + (seqLength - coveredLength) * 0.1));
        const end = Math.min(seqLength, start + coveredLength);
        return {
          start,
          end,
          pdbId: b.pdbId,
        };
      });
  }, [blastResults, seqLength]);

  // ─── Infer domain regions from PDB structure clusters ────────────────────

  const domains: DomainRegion[] = useMemo(() => {
    if (coverageRegions.length === 0) return [];

    // Sort regions by start position
    const sorted = [...coverageRegions].sort((a, b) => a.start - b.start);

    // Group nearby regions into domains (gap < 10% of sequence length)
    const gapThreshold = seqLength * 0.1;
    const groups: CoverageRegion[][] = [];
    let currentGroup: CoverageRegion[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const prevEnd = currentGroup[currentGroup.length - 1].end;
      if (sorted[i].start - prevEnd < gapThreshold) {
        currentGroup.push(sorted[i]);
      } else {
        groups.push(currentGroup);
        currentGroup = [sorted[i]];
      }
    }
    groups.push(currentGroup);

    return groups.map((group, idx) => ({
      start: Math.min(...group.map((g) => g.start)),
      end: Math.max(...group.map((g) => g.end)),
      label: group.length === 1 ? group[0].pdbId : `Domain ${idx + 1}`,
      color: DOMAIN_COLORS[idx % DOMAIN_COLORS.length],
    }));
  }, [coverageRegions, seqLength]);

  // ─── Compute coverage percentage ─────────────────────────────────────────

  const coveragePct = useMemo(() => {
    if (coverageRegions.length === 0) return 0;
    // Merge overlapping ranges
    const ranges: [number, number][] = coverageRegions
      .map((r) => [r.start, r.end] as [number, number])
      .sort((a, b) => a[0] - b[0]);

    const merged: [number, number][] = [ranges[0]];
    for (let i = 1; i < ranges.length; i++) {
      const last = merged[merged.length - 1];
      if (ranges[i][0] <= last[1]) {
        last[1] = Math.max(last[1], ranges[i][1]);
      } else {
        merged.push(ranges[i]);
      }
    }

    const coveredResidues = merged.reduce((acc, [s, e]) => acc + (e - s + 1), 0);
    return Math.min((coveredResidues / seqLength) * 100, 100);
  }, [coverageRegions, seqLength]);

  // ─── Scale helper ────────────────────────────────────────────────────────

  const scale = (pos: number) => ((pos - 1) / seqLength) * 100;

  // ─── Legend items ────────────────────────────────────────────────────────

  const methodLegend = useMemo(() => {
    const methods = new Set<string>();
    structures.forEach((s) => {
      if (s.method) methods.add(s.method);
    });
    return Array.from(methods).map((m) => ({
      method: m,
      ...getMethodColor(m),
      ...(isDark ? getMethodColorDark(m) : {}),
    }));
  }, [structures, isDark]);

  if (coverageRegions.length === 0 && blastRegions.length === 0) {
    return (
      <div className="text-xs text-claude-text-muted py-4 text-center">
        No coverage data available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header with coverage percentage */}
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-semibold text-claude-text uppercase tracking-wider">
          Domain Coverage
        </h4>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-claude-text-muted">
            {structures.length} structure{structures.length !== 1 ? 's' : ''}
            {blastRegions.length > 0 && ` · ${blastRegions.length} homolog${blastRegions.length !== 1 ? 's' : ''}`}
          </span>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-claude-accent/10 dark:bg-claude-accent/20">
            <span className="text-[10px] font-medium text-claude-accent">Coverage</span>
            <span className="text-xs font-bold text-claude-accent">
              <AnimatedNumber value={coveragePct} decimals={0} suffix="%" />
            </span>
          </div>
        </div>
      </div>

      {/* Main coverage bar */}
      <div className="relative">
        {/* Full sequence track */}
        <div className="relative h-10 bg-claude-border-light/60 dark:bg-[#2b2926]/60 rounded-lg overflow-hidden border border-claude-border/30 dark:border-[#3d3832]/30">
          {/* Uncovered region pattern (dashed) */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `repeating-linear-gradient(
                90deg,
                transparent,
                transparent 8px,
                ${isDark ? '#4a4540' : '#d4cfc8'} 8px,
                ${isDark ? '#4a4540' : '#d4cfc8'} 10px
              )`,
            }}
          />

          {/* BLAST result regions (semi-transparent overlays) */}
          {blastRegions.map((region, idx) => {
            const leftPct = scale(region.start);
            const widthPct = scale(region.end) - leftPct;
            return (
              <motion.div
                key={`blast-${idx}`}
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3 + idx * 0.05, ease: 'easeOut' }}
                style={{
                  left: `${leftPct}%`,
                  width: `${widthPct}%`,
                  transformOrigin: 'left',
                }}
                className="absolute top-0 h-full"
              >
                <div className="w-full h-full bg-claude-cryoem/15 dark:bg-claude-cryoem/10 border-l border-r border-claude-cryoem/20" />
              </motion.div>
            );
          })}

          {/* PDB structure coverage regions */}
          {coverageRegions.map((region, idx) => {
            const leftPct = scale(region.start);
            const widthPct = scale(region.end) - leftPct;
            const mc = isDark ? getMethodColorDark(region.method) : getMethodColor(region.method);
            const fillColor = mc.fill;
            const isHovered = hoveredRegion === region.pdbId;

            return (
              <Tooltip key={`cov-${idx}`}>
                <TooltipTrigger asChild>
                  <motion.div
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: 1, opacity: 1 }}
                    transition={{ duration: 0.5, delay: idx * 0.08, ease: 'easeOut' }}
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      transformOrigin: 'left',
                    }}
                    className="absolute top-0 h-full cursor-pointer"
                    onMouseEnter={() => setHoveredRegion(region.pdbId)}
                    onMouseLeave={() => setHoveredRegion(null)}
                  >
                    <motion.div
                      className="w-full h-full rounded-sm"
                      style={{ backgroundColor: fillColor, opacity: isHovered ? 0.95 : 0.7 }}
                      animate={{ opacity: isHovered ? 0.95 : 0.7 }}
                      transition={{ duration: 0.15 }}
                    />
                    {/* PDB ID label inside bar if wide enough */}
                    {widthPct > 8 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[8px] font-mono font-bold text-white/90 drop-shadow-sm truncate px-1">
                          {region.pdbId}
                        </span>
                      </div>
                    )}
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="bg-claude-surface dark:bg-[#242220] border border-claude-border dark:border-[#3d3832] shadow-lg"
                >
                  <div className="text-[11px] space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: fillColor }}
                      />
                      <span className="font-mono font-bold text-claude-accent">{region.pdbId}</span>
                      <span className="text-[9px] text-claude-text-muted">
                        {getMethodColor(region.method).label}
                      </span>
                    </div>
                    <div className="text-[10px] text-claude-text-secondary">
                      Residues {region.start}–{region.end}
                    </div>
                    {region.label && (
                      <div className="text-[10px] text-claude-text-muted line-clamp-2 max-w-[200px]">
                        {region.label}
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Residue number markers */}
        <div className="flex items-center justify-between mt-1 px-0.5">
          <span className="text-[8px] text-claude-text-muted font-mono">1</span>
          {seqLength > 100 && (
            <span className="text-[8px] text-claude-text-muted font-mono">
              {Math.round(seqLength / 2)}
            </span>
          )}
          <span className="text-[8px] text-claude-text-muted font-mono">{seqLength}</span>
        </div>
      </div>

      {/* Domain labels below bar */}
      {domains.length > 0 && (
        <div className="relative h-6">
          {domains.map((domain, idx) => {
            const leftPct = scale(domain.start);
            const widthPct = scale(domain.end) - leftPct;
            return (
              <motion.div
                key={`domain-${idx}`}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.5 + idx * 0.08 }}
                style={{
                  left: `${leftPct}%`,
                  width: `${Math.max(widthPct, 4)}%`,
                }}
                className="absolute top-0 flex flex-col items-center"
              >
                {/* Connector line */}
                <div
                  className="w-px h-2"
                  style={{ backgroundColor: domain.color, opacity: 0.5 }}
                />
                {/* Domain bracket */}
                <div
                  className="h-1.5 rounded-full w-full"
                  style={{ backgroundColor: domain.color, opacity: 0.3 }}
                />
                {/* Domain label */}
                <span
                  className="text-[8px] font-medium mt-0.5 truncate max-w-full px-0.5"
                  style={{ color: domain.color }}
                >
                  {domain.label}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Method colors */}
        {methodLegend.map((item, idx) => {
          const fillColor = isDark ? (item as any).fill : item.fill;
          return (
            <div key={`legend-${idx}`} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: fillColor, opacity: 0.8 }}
              />
              <span className="text-[9px] text-claude-text-muted font-medium">
                {item.label}
              </span>
            </div>
          );
        })}

        {/* BLAST overlay */}
        {blastRegions.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0 bg-claude-cryoem/20 border border-claude-cryoem/30" />
            <span className="text-[9px] text-claude-text-muted font-medium">BLAST Homologs</span>
          </div>
        )}

        {/* Uncovered */}
        <div className="flex items-center gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-sm flex-shrink-0 opacity-20"
            style={{
              backgroundImage: `repeating-linear-gradient(
                90deg,
                ${isDark ? '#4a4540' : '#d4cfc8'},
                ${isDark ? '#4a4540' : '#d4cfc8'} 2px,
                transparent 2px,
                transparent 4px
              )`,
            }}
          />
          <span className="text-[9px] text-claude-text-muted font-medium">Uncovered</span>
        </div>
      </div>
    </div>
  );
}
