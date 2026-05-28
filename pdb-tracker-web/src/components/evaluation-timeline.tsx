'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { METHOD_COLORS } from '@/components/chart-tooltips';
import { getMethodLabel } from '@/components/pdb-helpers';
import type { EvalPdbStructure, EvalBlastResult, EvalRow } from '@/lib/pdb-types';

interface EvalTimelineProps {
  rows: EvalRow[];
  onSelectPdb?: (pdbId: string) => void;
  selectedPdbId?: string | null;
}

interface TimelineEntry {
  pdbId: string;
  date: Date | null;
  method: string | null;
  ifValue: number | null;
  title: string | null;
  type: 'structure' | 'blast';
}

const METHOD_DOT_COLORS: Record<string, string> = {
  'Cryo-EM': '#2d8f8f',
  'X-ray': '#7c5cbf',
  'NMR': '#c9872e',
  'Other': '#6b7280',
};

export function EvalTimeline({ rows, onSelectPdb, selectedPdbId }: EvalTimelineProps) {
  const entries = useMemo(() => {
    const items: TimelineEntry[] = rows
      .filter((row) => row.releaseDate)
      .map((row) => ({
        pdbId: row.pdbId,
        date: row.releaseDate ? new Date(row.releaseDate + 'T00:00:00Z') : null,
        method: row.method,
        ifValue: row.journalIf,
        title: row._type === 'structure' ? (row as EvalPdbStructure).title : (row as EvalBlastResult).description,
        type: row._type,
      }))
      .filter((e) => e.date !== null)
      .sort((a, b) => (a.date!.getTime()) - (b.date!.getTime()));

    return items;
  }, [rows]);

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-claude-text-muted">
        No timeline data available
      </div>
    );
  }

  const minDate = entries[0].date!;
  const maxDate = entries[entries.length - 1].date!;
  const dateRange = maxDate.getTime() - minDate.getTime() || 1;

  const width = 600;
  const height = 120;
  const padding = { top: 20, right: 20, bottom: 25, left: 20 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const maxIf = Math.max(...entries.map((e) => e.ifValue ?? 0), 1);

  const xScale = (date: Date) =>
    padding.left + ((date.getTime() - minDate.getTime()) / dateRange) * plotW;
  const yScale = (ifVal: number | null) =>
    padding.top + plotH - ((ifVal ?? 0) / maxIf) * plotH;

  // Year markers
  const yearMarkers: { year: number; x: number }[] = [];
  const startYear = minDate.getUTCFullYear();
  const endYear = maxDate.getUTCFullYear();
  for (let y = startYear; y <= endYear; y++) {
    const d = new Date(Date.UTC(y, 0, 1));
    if (d >= minDate && d <= maxDate) {
      yearMarkers.push({ year: y, x: xScale(d) });
    }
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto min-w-[400px]"
        style={{ maxHeight: '180px' }}
      >
        {/* Grid lines */}
        {yearMarkers.map((m) => (
          <g key={m.year}>
            <line
              x1={m.x}
              y1={padding.top}
              x2={m.x}
              y2={padding.top + plotH}
              stroke="#e8e4dd"
              strokeWidth={0.5}
              strokeDasharray="3,3"
            />
            <text
              x={m.x}
              y={height - 5}
              textAnchor="middle"
              fontSize={9}
              fill="#9b9590"
              fontFamily="var(--font-geist-mono), monospace"
            >
              {m.year}
            </text>
          </g>
        ))}

        {/* IF axis labels */}
        {[0, 0.5, 1].map((frac) => {
          const y = padding.top + plotH - frac * plotH;
          const val = frac * maxIf;
          return (
            <g key={frac}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + plotW}
                y2={y}
                stroke="#f0ece5"
                strokeWidth={0.5}
              />
              <text
                x={padding.left - 5}
                y={y + 3}
                textAnchor="end"
                fontSize={8}
                fill="#9b9590"
                fontFamily="var(--font-geist-mono), monospace"
              >
                {val.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* Data points */}
        {entries.map((entry, idx) => {
          const cx = xScale(entry.date!);
          const cy = yScale(entry.ifValue);
          const methodLabel = getMethodLabel(entry.method);
          const color = METHOD_DOT_COLORS[methodLabel] || METHOD_DOT_COLORS['Other'];
          const radius = entry.type === 'structure' ? 5 : 3.5;
          const isSelected = selectedPdbId === entry.pdbId;

          return (
            <g key={`${entry.pdbId}-${idx}`}>
              {isSelected && (
                <circle cx={cx} cy={cy} r={radius + 4} fill={color} fillOpacity={0.15} />
              )}
              <motion.circle
                cx={cx}
                cy={cy}
                r={radius}
                fill={color}
                stroke={isSelected ? color : 'white'}
                strokeWidth={isSelected ? 2 : 1}
                fillOpacity={0.85}
                style={{ cursor: 'pointer' }}
                initial={{ r: 0, opacity: 0 }}
                animate={{ r: radius, opacity: 0.85 }}
                transition={{ delay: idx * 0.02, duration: 0.3 }}
                onClick={() => onSelectPdb?.(entry.pdbId)}
              >
                <title>
                  {entry.pdbId} | {methodLabel} | IF: {entry.ifValue?.toFixed(1) ?? '—'} |{' '}
                  {entry.date?.getUTCFullYear()}-{String((entry.date?.getUTCMonth() ?? 0) + 1).padStart(2, '0')}
                </title>
              </motion.circle>
            </g>
          );
        })}

        {/* Axis labels */}
        <text
          x={padding.left + plotW / 2}
          y={height - 1}
          textAnchor="middle"
          fontSize={8}
          fill="#9b9590"
        >
          Release Date
        </text>
        <text
          x={5}
          y={padding.top + plotH / 2}
          textAnchor="middle"
          fontSize={8}
          fill="#9b9590"
          transform={`rotate(-90, 5, ${padding.top + plotH / 2})`}
        >
          IF
        </text>
      </svg>
    </div>
  );
}
