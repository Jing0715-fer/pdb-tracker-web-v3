'use client';

import React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// ─── Color Palette for Sub-targets ──────────────────────────────────────────

const SOURCE_COLORS = [
  { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-800/40', dot: 'bg-teal-400' },
  { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800/40', dot: 'bg-amber-400' },
  { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800/40', dot: 'bg-purple-400' },
  { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800/40', dot: 'bg-rose-400' },
  { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-400', border: 'border-sky-200 dark:border-sky-800/40', dot: 'bg-sky-400' },
];

export function getSourceColor(idx: number) {
  return SOURCE_COLORS[idx % SOURCE_COLORS.length];
}

// ─── Badge Size Config ──────────────────────────────────────────────────────

type BadgeSize = 'sm' | 'md';

const BADGE_STYLES: Record<BadgeSize, { text: string; px: string; py: string; dot: string; gap: string }> = {
  sm: { text: 'text-[7px]', px: 'px-1', py: 'py-[1px]', dot: 'w-1 h-1', gap: 'gap-0.5' },
  md: { text: 'text-[9px]', px: 'px-1.5', py: 'py-0', dot: 'w-1.5 h-1.5', gap: 'gap-0.5' },
};

// ─── Props ──────────────────────────────────────────────────────────────────

export interface UniprotBadgeListProps {
  /** List of UniProt IDs to display */
  uniprotIds: string[];
  /** Map from uniprotId → color index (sub-target order) */
  colorMap: Map<string, number> | null;
  /** Map from uniprotId → metadata (proteinName, geneName) */
  metaMap?: Record<string, { proteinName: string; geneName: string }> | null;
  /** Whether the row is a shared structure (adds ring indicator) */
  isShared?: boolean;
  /** Badge size variant */
  size?: BadgeSize;
  /** Max number of individual badges before collapsing to count badge (default 3) */
  maxVisible?: number;
  /** Additional CSS class on the container */
  className?: string;
}

// ─── Single UniProt Badge ───────────────────────────────────────────────────

function UniprotBadge({
  uniprotId,
  colorIdx,
  meta,
  isShared,
  size,
}: {
  uniprotId: string;
  colorIdx: number;
  meta?: { proteinName: string; geneName: string } | null;
  isShared?: boolean;
  size: BadgeSize;
}) {
  const sc = getSourceColor(colorIdx);
  const s = BADGE_STYLES[size];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`inline-flex items-center ${s.gap} ${s.px} ${s.py} rounded ${s.text} font-mono font-medium border ${sc.bg} ${sc.text} ${sc.border} ${isShared ? 'ring-1 ring-inset ring-current/15' : ''}`}
        >
          <span className={`${s.dot} rounded-full flex-shrink-0 ${sc.dot}`} />
          {uniprotId}
        </span>
      </TooltipTrigger>
      {meta && (
        <TooltipContent side="top" className="p-2 text-[10px] max-w-[240px]">
          <div className="font-mono font-semibold text-claude-accent">{uniprotId}</div>
          {meta.proteinName && <div className="text-claude-text-secondary mt-0.5">{meta.proteinName}</div>}
          {meta.geneName && <div className="text-claude-text-muted">Gene: {meta.geneName}</div>}
          {isShared && <div className="text-teal-600 dark:text-teal-400 mt-0.5 italic text-[9px]">Shared target</div>}
        </TooltipContent>
      )}
    </Tooltip>
  );
}

// ─── Overflow Count Badge ───────────────────────────────────────────────────

function UniprotOverflowBadge({
  count,
  uniprotIds,
  colorMap,
  metaMap,
  size,
}: {
  count: number;
  uniprotIds: string[];
  colorMap: Map<string, number> | null;
  metaMap?: Record<string, { proteinName: string; geneName: string }> | null;
  size: BadgeSize;
}) {
  const s = BADGE_STYLES[size];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`inline-flex items-center ${s.gap} ${s.px} ${s.py} rounded ${s.text} font-mono font-semibold border bg-claude-border-light/60 dark:bg-[#3d3832]/60 text-claude-text-secondary dark:text-[#9b9590] border-claude-border/50 dark:border-[#4a4540]/50 hover:bg-claude-border-light dark:hover:bg-[#3d3832] transition-colors cursor-default`}
        >
          {count}×
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="p-2 text-[10px] max-w-[280px]">
        <div className="font-semibold text-claude-text mb-1">{count} UniProt IDs:</div>
        <div className="space-y-0.5">
          {uniprotIds.map((uid) => {
            const cIdx = colorMap?.get(uid) ?? 0;
            const sc = getSourceColor(cIdx);
            const meta = metaMap?.[uid];
            return (
              <div key={uid} className="flex items-start gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-0.5 ${sc.dot}`} />
                <div>
                  <span className="font-mono font-semibold">{uid}</span>
                  {meta?.proteinName && <span className="text-claude-text-secondary"> ({meta.proteinName})</span>}
                  {meta?.geneName && <span className="text-claude-text-muted"> [{meta.geneName}]</span>}
                </div>
              </div>
            );
          })}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function UniprotBadgeList({
  uniprotIds,
  colorMap,
  metaMap,
  isShared,
  size = 'md',
  maxVisible = 3,
  className = '',
}: UniprotBadgeListProps) {
  if (!uniprotIds || uniprotIds.length === 0) {
    return <span className="text-claude-text-muted text-[9px]">—</span>;
  }

  const overflow = uniprotIds.length > maxVisible;
  const visibleIds = overflow ? uniprotIds.slice(0, maxVisible) : uniprotIds;

  return (
    <div className={`flex flex-wrap gap-0.5 ${className}`}>
      {visibleIds.map((uid) => {
        const cIdx = colorMap?.get(uid) ?? 0;
        const meta = metaMap?.[uid] ?? null;
        return (
          <UniprotBadge
            key={uid}
            uniprotId={uid}
            colorIdx={cIdx}
            meta={meta}
            isShared={isShared}
            size={size}
          />
        );
      })}
      {overflow && (
        <UniprotOverflowBadge
          count={uniprotIds.length}
          uniprotIds={uniprotIds}
          colorMap={colorMap}
          metaMap={metaMap}
          size={size}
        />
      )}
    </div>
  );
}
