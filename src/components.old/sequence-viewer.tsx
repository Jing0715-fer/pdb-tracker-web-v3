'use client';

import React, { useCallback, useState } from 'react';
import { Copy, X } from 'lucide-react';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

// ─── Color Maps ──────────────────────────────────────────────────────────

export const AMINO_ACID_COLORS: Record<string, { color: string; label: string }> = {
  A: { color: '#f97316', label: 'Ala (Hydrophobic)' },
  V: { color: '#f97316', label: 'Val (Hydrophobic)' },
  L: { color: '#f97316', label: 'Leu (Hydrophobic)' },
  I: { color: '#f97316', label: 'Ile (Hydrophobic)' },
  M: { color: '#f97316', label: 'Met (Hydrophobic)' },
  F: { color: '#f97316', label: 'Phe (Hydrophobic)' },
  W: { color: '#f97316', label: 'Trp (Hydrophobic)' },
  P: { color: '#f97316', label: 'Pro (Hydrophobic)' },
  S: { color: '#22c55e', label: 'Ser (Polar)' },
  T: { color: '#22c55e', label: 'Thr (Polar)' },
  N: { color: '#22c55e', label: 'Asn (Polar)' },
  Q: { color: '#22c55e', label: 'Gln (Polar)' },
  Y: { color: '#22c55e', label: 'Tyr (Polar)' },
  C: { color: '#22c55e', label: 'Cys (Polar)' },
  K: { color: '#3b82f6', label: 'Lys (Positive)' },
  R: { color: '#3b82f6', label: 'Arg (Positive)' },
  H: { color: '#3b82f6', label: 'His (Positive)' },
  D: { color: '#ef4444', label: 'Asp (Negative)' },
  E: { color: '#ef4444', label: 'Glu (Negative)' },
  G: { color: '#9ca3af', label: 'Gly (Special)' },
};

export const NUCLEOTIDE_COLORS: Record<string, { color: string; label: string }> = {
  A: { color: '#22c55e', label: 'Adenine' },
  T: { color: '#ef4444', label: 'Thymine' },
  G: { color: '#f97316', label: 'Guanine' },
  C: { color: '#3b82f6', label: 'Cytosine' },
  U: { color: '#a855f7', label: 'Uracil' },
};

// ─── Helpers ────────────────────────────────────────────────────────────

export function isNucleotideType(moleculeType: string): boolean {
  return moleculeType.toLowerCase().includes('nucleotide');
}

export function getBfactorColor(position: number, totalLength: number): string {
  const ratio = totalLength > 1 ? position / (totalLength - 1) : 0.5;
  // Blue (low) -> Green/Yellow (mid) -> Red (high)
  if (ratio < 0.5) {
    const t = ratio * 2;
    const r = Math.round(0 + t * 80);
    const g = Math.round(80 + t * 175);
    const b = Math.round(220 - t * 160);
    return `rgb(${r},${g},${b})`;
  }
  const t = (ratio - 0.5) * 2;
  const r = Math.round(80 + t * 175);
  const g = Math.round(255 - t * 175);
  const b = Math.round(60 - t * 60);
  return `rgb(${r},${g},${b})`;
}

export type SequenceColorMode = 'type' | 'bfactor';

// ─── Sequence View Component ────────────────────────────────────────────

interface SequenceViewProps {
  sequence: string;
  moleculeType: string;
  chainId?: string;
  onResidueRangeSelect?: (chainId: string, start: number, end: number) => void;
  onResidueClick?: (chainId: string, residueNumber: number) => void;
  className?: string;
}

export function SequenceView({
  sequence,
  moleculeType,
  chainId,
  onResidueRangeSelect,
  onResidueClick,
  className = '',
}: SequenceViewProps) {
  const isNucleotide = isNucleotideType(moleculeType);
  const colorMap = isNucleotide ? NUCLEOTIDE_COLORS : AMINO_ACID_COLORS;
  const blockSize = 10;
  const [colorMode, setColorMode] = useState<SequenceColorMode>('type');
  const [rangeStart, setRangeStart] = useState<number | null>(null);
  const [rangeEnd, setRangeEnd] = useState<number | null>(null);
  const [selecting, setSelecting] = useState(false);

  // Split sequence into blocks of 10
  const blocks: { residues: string[]; startPos: number }[] = [];
  for (let i = 0; i < sequence.length; i += blockSize) {
    const chunk = sequence.slice(i, i + blockSize);
    blocks.push({
      residues: chunk.split(''),
      startPos: i + 1,
    });
  }

  const handleResidueMouseDown = useCallback((pos: number) => {
    setSelecting(true);
    setRangeStart(pos);
    setRangeEnd(pos);
  }, []);

  const handleResidueMouseEnter = useCallback((pos: number) => {
    if (selecting) setRangeEnd(pos);
  }, [selecting]);

  const handleResidueMouseUp = useCallback(() => {
    if (selecting && rangeStart != null && rangeEnd != null && chainId) {
      const start = Math.min(rangeStart, rangeEnd);
      const end = Math.max(rangeStart, rangeEnd);
      if (start !== end && onResidueRangeSelect) {
        onResidueRangeSelect(chainId, start, end);
      } else if (start === end && onResidueClick) {
        onResidueClick(chainId, start);
      }
    }
    setSelecting(false);
  }, [selecting, rangeStart, rangeEnd, chainId, onResidueRangeSelect, onResidueClick]);

  const clearRange = useCallback(() => {
    setRangeStart(null);
    setRangeEnd(null);
  }, []);

  const isInRange = useCallback((pos: number) => {
    if (rangeStart == null || rangeEnd == null) return false;
    const min = Math.min(rangeStart, rangeEnd);
    const max = Math.max(rangeStart, rangeEnd);
    return pos >= min && pos <= max;
  }, [rangeStart, rangeEnd]);

  const effectiveRangeStart = rangeStart != null && rangeEnd != null ? Math.min(rangeStart, rangeEnd) : null;
  const effectiveRangeEnd = rangeStart != null && rangeEnd != null ? Math.max(rangeStart, rangeEnd) : null;

  return (
    <div className="px-2 py-1.5 bg-claude-bg/50 rounded-md border border-claude-border-light mt-1">
      {/* Legend + Color Mode Toggle */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex flex-wrap gap-x-2 gap-y-0.5">
          {colorMode === 'type' ? (
            isNucleotide ? (
              <>
                <span className="flex items-center gap-0.5 text-[8px]"><span className="w-1.5 h-1.5 rounded-sm inline-block" style={{ backgroundColor: '#22c55e' }} />A</span>
                <span className="flex items-center gap-0.5 text-[8px]"><span className="w-1.5 h-1.5 rounded-sm inline-block" style={{ backgroundColor: '#ef4444' }} />T</span>
                <span className="flex items-center gap-0.5 text-[8px]"><span className="w-1.5 h-1.5 rounded-sm inline-block" style={{ backgroundColor: '#f97316' }} />G</span>
                <span className="flex items-center gap-0.5 text-[8px]"><span className="w-1.5 h-1.5 rounded-sm inline-block" style={{ backgroundColor: '#3b82f6' }} />C</span>
                <span className="flex items-center gap-0.5 text-[8px]"><span className="w-1.5 h-1.5 rounded-sm inline-block" style={{ backgroundColor: '#a855f7' }} />U</span>
              </>
            ) : (
              <>
                <span className="flex items-center gap-0.5 text-[8px] text-claude-text-muted"><span className="w-1.5 h-1.5 rounded-sm inline-block" style={{ backgroundColor: '#f97316' }} />Hydrophobic</span>
                <span className="flex items-center gap-0.5 text-[8px] text-claude-text-muted"><span className="w-1.5 h-1.5 rounded-sm inline-block" style={{ backgroundColor: '#22c55e' }} />Polar</span>
                <span className="flex items-center gap-0.5 text-[8px] text-claude-text-muted"><span className="w-1.5 h-1.5 rounded-sm inline-block" style={{ backgroundColor: '#3b82f6' }} />Charged+</span>
                <span className="flex items-center gap-0.5 text-[8px] text-claude-text-muted"><span className="w-1.5 h-1.5 rounded-sm inline-block" style={{ backgroundColor: '#ef4444' }} />Charged-</span>
                <span className="flex items-center gap-0.5 text-[8px] text-claude-text-muted"><span className="w-1.5 h-1.5 rounded-sm inline-block" style={{ backgroundColor: '#9ca3af' }} />Gly</span>
              </>
            )
          ) : (
            <>
              <span className="flex items-center gap-0.5 text-[8px] text-claude-text-muted"><span className="w-1.5 h-1.5 rounded-sm inline-block" style={{ backgroundColor: getBfactorColor(0, 100) }} />Low B-factor</span>
              <span className="flex items-center gap-0.5 text-[8px] text-claude-text-muted"><span className="w-1.5 h-1.5 rounded-sm inline-block" style={{ backgroundColor: getBfactorColor(50, 100) }} />Mid</span>
              <span className="flex items-center gap-0.5 text-[8px] text-claude-text-muted"><span className="w-1.5 h-1.5 rounded-sm inline-block" style={{ backgroundColor: getBfactorColor(100, 100) }} />High B-factor</span>
              <span className="text-[7px] text-claude-text-muted italic ml-1">(simulated)</span>
            </>
          )}
        </div>
        {/* Color mode toggle */}
        <div className="flex items-center rounded border border-claude-border-light overflow-hidden flex-shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setColorMode('type')}
                className={`px-1 py-0.5 text-[8px] font-medium transition-colors ${
                  colorMode === 'type'
                    ? 'bg-claude-accent text-white'
                    : 'bg-claude-surface text-claude-text-muted hover:text-claude-text'
                }`}
              >
                Type
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-claude-surface text-claude-text border border-claude-border shadow-lg text-[9px]">
              Color by residue type
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setColorMode('bfactor')}
                className={`px-1 py-0.5 text-[7px] font-medium transition-colors ${
                  colorMode === 'bfactor'
                    ? 'bg-claude-accent text-white'
                    : 'bg-claude-surface text-claude-text-muted hover:text-claude-text'
                }`}
              >
                B-factor
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-claude-surface text-claude-text border border-claude-border shadow-lg text-[9px]">
              Simulated B-factor gradient
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Residue Range Selector */}
      {onResidueRangeSelect && (
        <div className="flex items-center gap-1 mb-1.5 px-1">
          <span className="text-[8px] text-claude-text-muted">Range:</span>
          {effectiveRangeStart != null && effectiveRangeEnd != null ? (
            <>
              <span className="text-[9px] font-mono font-bold text-claude-accent">
                {effectiveRangeStart}–{effectiveRangeEnd}
              </span>
              <span className="text-[8px] text-claude-text-muted">
                ({effectiveRangeEnd - effectiveRangeStart + 1} residues)
              </span>
              <button
                onClick={clearRange}
                className="p-0.5 rounded text-claude-text-muted hover:text-claude-accent hover:bg-claude-accent-light transition-colors ml-1"
                title="Clear range"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </>
          ) : (
            <span className="text-[8px] text-claude-text-muted italic">
              Click &amp; drag to select
            </span>
          )}
        </div>
      )}

      {/* Copy + Controls row */}
      <div className="flex items-center gap-1 mb-1.5 px-1">
        {/* Copy sequence button */}
        <button
          onClick={() => {
            navigator.clipboard.writeText(sequence).then(() => {
              // silent success
            }).catch(() => {});
          }}
          className="p-0.5 rounded text-claude-text-muted hover:text-claude-accent hover:bg-claude-accent-light transition-colors text-[8px] flex items-center gap-0.5"
          title="Copy sequence"
        >
          <Copy className="w-2.5 h-2.5" />
          <span>Copy</span>
        </button>
        {/* Color mode toggle */}
        <div className="flex items-center gap-0.5 ml-auto">
          <span className="text-[8px] text-claude-text-muted">Color:</span>
          <button
            onClick={() => setColorMode('type')}
            className={`text-[8px] px-1 py-0.5 rounded transition-colors ${colorMode === 'type' ? 'bg-claude-accent text-white' : 'text-claude-text-muted hover:bg-claude-border-light'}`}
          >
            Type
          </button>
          <button
            onClick={() => setColorMode('bfactor')}
            className={`text-[8px] px-1 py-0.5 rounded transition-colors ${colorMode === 'bfactor' ? 'bg-claude-accent text-white' : 'text-claude-text-muted hover:bg-claude-border-light'}`}
          >
            Bfac
          </button>
        </div>
      </div>

      {/* Sequence blocks */}
      <div
        className={`font-mono leading-none overflow-x-auto custom-scrollbar ${className}`}
        onMouseUp={handleResidueMouseUp}
        onMouseLeave={() => { if (selecting) setSelecting(false); }}
      >
        {blocks.map((block, blockIdx) => (
          <div key={blockIdx} className="flex items-start gap-0.5">
            {/* Position number */}
            <span className="text-[8px] text-claude-text-muted w-7 text-right flex-shrink-0 pt-px select-none">
              {block.startPos}
            </span>
            {/* Residues */}
            <div className="flex">
              {block.residues.map((residue, resIdx) => {
                const pos = block.startPos + resIdx;
                const colorInfo = colorMap[residue.toUpperCase()];
                const inRange = isInRange(pos);
                const bfactorColor = getBfactorColor(pos - 1, sequence.length);
                const residueColor = colorMode === 'bfactor'
                  ? bfactorColor
                  : (colorInfo?.color || '#6b7280');

                return (
                  <Tooltip key={resIdx}>
                    <TooltipTrigger asChild>
                      <span
                        className="text-[10px] leading-tight select-none hover:font-bold transition-all w-3.5 h-3.5 flex items-center justify-center"
                        style={{
                          color: residueColor,
                          backgroundColor: inRange
                            ? `${residueColor}30`
                            : undefined,
                          borderRadius: inRange ? '2px' : undefined,
                          cursor: (onResidueRangeSelect || onResidueClick) ? 'pointer' : 'default',
                          fontWeight: inRange ? 700 : undefined,
                        }}
                        onMouseDown={() => (onResidueRangeSelect || onResidueClick) && handleResidueMouseDown(pos)}
                        onMouseEnter={() => (onResidueRangeSelect || onResidueClick) && handleResidueMouseEnter(pos)}
                      >
                        {residue}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="bg-claude-surface text-claude-text border border-claude-border shadow-lg text-[10px]"
                    >
                      {pos}: {colorInfo?.label || residue}
                      {colorMode === 'bfactor' && (
                        <span className="ml-1 text-[8px] text-claude-text-muted">
                          (B-factor: {((pos / sequence.length) * 100).toFixed(0)})
                        </span>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
