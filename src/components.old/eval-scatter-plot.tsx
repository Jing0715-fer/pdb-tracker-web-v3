'use client';

import React, { useMemo, useCallback } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  Cell,
} from 'recharts';
import { METHOD_COLORS, ClaudeScatterTooltip, getChartAxisColor, getChartTickColor } from '@/components/chart-tooltips';
import { getMethodLabel } from '@/components/pdb-helpers';
import type { EvalRow } from '@/lib/pdb-types';
import { useTheme } from 'next-themes';

interface EvalScatterPlotProps {
  rows: EvalRow[];
  onSelectPdb?: (pdbId: string) => void;
  selectedPdbId?: string | null;
}

interface ScatterDataPoint {
  pdbId: string;
  resolution: number;
  journalIf: number;
  method: string;
  methodLabel: string;
  title: string | null;
  ifTier: string | null;
  type: 'structure' | 'blast';
}

export function EvalScatterPlot({ rows, onSelectPdb, selectedPdbId }: EvalScatterPlotProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const data = useMemo(() => {
    return rows
      .filter((row) => row.resolution != null && row.journalIf != null)
      .map((row) => ({
        pdbId: row.pdbId,
        resolution: row.resolution!,
        journalIf: row.journalIf!,
        method: row.method || '',
        methodLabel: getMethodLabel(row.method || ''),
        title: row._type === 'structure'
          ? (row as any).title || null
          : (row as any).description || null,
        ifTier: (row as any).ifTier || null,
        type: row._type,
      }));
  }, [rows]);

  const handleScatterClick = useCallback(
    (point: any) => {
      if (point?.pdbId) {
        onSelectPdb?.(point.pdbId);
      }
    },
    [onSelectPdb]
  );

  // Group by method for separate scatter series
  const methodGroups = useMemo(() => {
    const groups: Record<string, ScatterDataPoint[]> = {};
    for (const point of data) {
      const key = point.methodLabel;
      if (!groups[key]) groups[key] = [];
      groups[key].push(point);
    }
    return groups;
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-claude-text-muted">
        No resolution/IF data available for scatter plot
      </div>
    );
  }

  return (
    <div className="chart-container chart-inner-shadow rounded-lg p-2 bg-claude-surface dark:bg-[#242220] border border-claude-border-light dark:border-[#2b2926]">
      <ResponsiveContainer width="100%" height={220}>
        <ScatterChart margin={{ top: 10, right: 15, bottom: 5, left: 5 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={isDark ? '#3d3832' : '#f0ece5'}
          />
          <XAxis
            type="number"
            dataKey="resolution"
            name="Resolution"
            unit="Å"
            tick={{ fontSize: 9, fill: getChartTickColor(isDark) }}
            axisLine={{ stroke: getChartAxisColor(isDark) }}
            tickLine={{ stroke: getChartAxisColor(isDark) }}
            label={{
              value: 'Resolution (Å)',
              position: 'insideBottom',
              offset: -2,
              style: { fontSize: 9, fill: getChartTickColor(isDark) },
            }}
          />
          <YAxis
            type="number"
            dataKey="journalIf"
            name="IF"
            tick={{ fontSize: 9, fill: getChartTickColor(isDark) }}
            axisLine={{ stroke: getChartAxisColor(isDark) }}
            tickLine={{ stroke: getChartAxisColor(isDark) }}
            label={{
              value: 'Impact Factor',
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: 9, fill: getChartTickColor(isDark) },
            }}
          />
          <ZAxis type="category" dataKey="type" range={[40, 70]} />
          <Tooltip
            content={<ClaudeScatterTooltip isDark={isDark} />}
            cursor={{ strokeDasharray: '3 3', stroke: isDark ? '#4a4540' : '#d4cfc8' }}
          />
          {Object.entries(methodGroups).map(([methodLabel, points]) => {
            const color = METHOD_COLORS[methodLabel] || METHOD_COLORS['Other'];
            return (
              <Scatter
                key={methodLabel}
                name={methodLabel}
                data={points}
                fill={color}
                onClick={handleScatterClick}
                style={{ cursor: 'pointer' }}
              >
                {points.map((entry, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={color}
                    fillOpacity={selectedPdbId === entry.pdbId ? 1 : 0.7}
                    stroke={selectedPdbId === entry.pdbId ? color : 'white'}
                    strokeWidth={selectedPdbId === entry.pdbId ? 2 : 1}
                  />
                ))}
              </Scatter>
            );
          })}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
