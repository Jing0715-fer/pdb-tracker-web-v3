'use client';

import React, { useMemo } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from 'recharts';
import { useTheme } from 'next-themes';
import type { PdbEntry, WeeklySnapshot } from '@/lib/pdb-types';
import { getChartAxisColor, getChartTickColor, ClaudeChartTooltip, ClaudeTrendTooltip, ClaudeResTooltip } from '@/components/chart-tooltips';

// ─── Color Constants ──────────────────────────────────────────────────────────

const METHOD_COLORS: Record<string, string> = {
  'Cryo-EM': '#2d8f8f',
  'X-ray': '#7c5cbf',
  'NMR': '#c9872e',
  'Other': '#94a3b8',
};

const RESOLUTION_BINS = [
  { label: '<1.5Å', min: 0, max: 1.5, color: '#16a34a' },
  { label: '1.5-2.0Å', min: 1.5, max: 2.0, color: '#2d8f8f' },
  { label: '2.0-2.5Å', min: 2.0, max: 2.5, color: '#7c5cbf' },
  { label: '2.5-3.0Å', min: 2.5, max: 3.0, color: '#c9872e' },
  { label: '3.0-3.5Å', min: 3.0, max: 3.5, color: '#ea580c' },
  { label: '>3.5Å', min: 3.5, max: Infinity, color: '#dc2626' },
];

const IF_TIER_COLORS: Record<string, string> = {
  '≥20': '#dc2626',
  '≥10': '#ea580c',
  '≥5': '#16a34a',
  '<5': '#94a3b8',
};

function getIfTierColor(ifValue: number | null): string {
  if (ifValue == null) return '#94a3b8';
  if (ifValue >= 20) return IF_TIER_COLORS['≥20'];
  if (ifValue >= 10) return IF_TIER_COLORS['≥10'];
  if (ifValue >= 5) return IF_TIER_COLORS['≥5'];
  return IF_TIER_COLORS['<5'];
}

function getIfTierLabel(ifValue: number | null): string {
  if (ifValue == null) return 'Unknown';
  if (ifValue >= 20) return '≥20';
  if (ifValue >= 10) return '≥10';
  if (ifValue >= 5) return '≥5';
  return '<5';
}

// ─── Custom Pie Label ──────────────────────────────────────────────────────────

interface PieLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  name: string;
  value: number;
}

const RADIAN = Math.PI / 180;

function renderCustomizedLabel({ cx, cy, midAngle, outerRadius, percent, name }: PieLabelProps) {
  if (percent < 0.05) return null; // Hide labels for tiny slices
  const radius = outerRadius + 18;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="text-[9px] fill-claude-text-muted"
    >
      {name} ({(percent * 100).toFixed(0)}%)
    </text>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────────

function ChartEmpty({ message = 'No data available' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center h-[200px] text-[11px] text-claude-text-muted">
      {message}
    </div>
  );
}

// ─── 1. MethodDistributionChart ────────────────────────────────────────────────

interface MethodDistributionChartProps {
  entries: PdbEntry[];
}

function MethodDistributionChart({ entries }: MethodDistributionChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const data = useMemo(() => {
    const cryoem = entries.filter(e => e.isCryoem).length;
    const xray = entries.filter(e => e.isXray).length;
    const nmr = entries.filter(e => !e.isCryoem && !e.isXray && e.method?.toLowerCase().includes('nmr')).length;
    const other = entries.filter(e => !e.isCryoem && !e.isXray && !(e.method?.toLowerCase().includes('nmr'))).length;
    const total = cryoem + xray + nmr + other;

    return {
      slices: [
        { name: 'Cryo-EM', value: cryoem, fill: METHOD_COLORS['Cryo-EM'] },
        { name: 'X-ray', value: xray, fill: METHOD_COLORS['X-ray'] },
        { name: 'NMR', value: nmr, fill: METHOD_COLORS['NMR'] },
        { name: 'Other', value: other, fill: METHOD_COLORS['Other'] },
      ].filter(d => d.value > 0),
      total,
    };
  }, [entries]);

  if (data.total === 0) return <ChartEmpty message="No method data" />;

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data.slices}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={75}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
            label={renderCustomizedLabel}
            labelLine={false}
          >
            {data.slices.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} className="transition-opacity duration-200 hover:opacity-80" />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              const pct = data.total > 0 ? ((d.value / data.total) * 100).toFixed(1) : '0';
              return (
                <div className="rounded-lg px-3 py-2 text-xs shadow-lg border bg-white dark:bg-[#2b2926] dark:border-[#4a4540]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.fill }} />
                    <span className="text-claude-text-secondary">{d.name}</span>
                    <span className="font-mono font-medium ml-auto text-claude-text">{d.value}</span>
                    <span className="text-claude-text-muted">({pct}%)</span>
                  </div>
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Center text showing total count */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: 0 }}>
        <div className="text-center">
          <div className="text-lg font-bold text-claude-text leading-none">{data.total}</div>
          <div className="text-[9px] text-claude-text-muted mt-0.5">total</div>
        </div>
      </div>
    </div>
  );
}

// ─── 2. ResolutionHistogramChart ──────────────────────────────────────────────

interface ResolutionHistogramChartProps {
  entries: PdbEntry[];
}

function ResolutionHistogramChart({ entries }: ResolutionHistogramChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const axisColor = getChartAxisColor(isDark);
  const tickColor = getChartTickColor(isDark);

  const data = useMemo(() => {
    return RESOLUTION_BINS.map(bin => {
      const count = entries.filter(e => {
        if (e.resolution == null) return false;
        return e.resolution >= bin.min && e.resolution < bin.max;
      }).length;
      return {
        range: bin.label,
        count,
        fill: bin.color,
        color: bin.color,
      };
    });
  }, [entries]);

  const hasData = data.some(d => d.count > 0);
  if (!hasData) return <ChartEmpty message="No resolution data" />;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <defs>
          {data.map((d, i) => (
            <linearGradient key={`grad-${i}`} id={`resGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={d.color} stopOpacity={0.9} />
              <stop offset="100%" stopColor={d.color} stopOpacity={0.5} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#3d3832' : '#f0ece5'} />
        <XAxis
          dataKey="range"
          tick={{ fontSize: 9, fill: tickColor }}
          axisLine={{ stroke: axisColor }}
          tickLine={{ stroke: axisColor }}
        />
        <YAxis
          tick={{ fontSize: 9, fill: tickColor }}
          axisLine={{ stroke: axisColor }}
          tickLine={{ stroke: axisColor }}
          allowDecimals={false}
        />
        <Tooltip content={<ClaudeResTooltip isDark={isDark} />} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={`url(#resGrad-${index})`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── 3. WeeklyTrendChart ──────────────────────────────────────────────────────

interface WeeklyTrendChartProps {
  snapshots: WeeklySnapshot[];
}

function WeeklyTrendChart({ snapshots }: WeeklyTrendChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const axisColor = getChartAxisColor(isDark);
  const tickColor = getChartTickColor(isDark);

  const data = useMemo(() => {
    if (!snapshots.length) return [];
    // Take last 12 snapshots for the trend chart
    const recent = snapshots.slice(-12);
    return recent.map(s => ({
      weekId: s.weekId?.replace(/^W/, 'W') || s.weekId || '',
      total: s.totalStructures,
      cryoem: s.cryoemCount,
      xray: s.xrayCount,
    }));
  }, [snapshots]);

  if (data.length === 0) return <ChartEmpty message="No snapshot data" />;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <defs>
          <linearGradient id="totalAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#c96442" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#c96442" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="cryoemAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2d8f8f" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#2d8f8f" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="xrayAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#7c5cbf" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#7c5cbf" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#3d3832' : '#f0ece5'} />
        <XAxis
          dataKey="weekId"
          tick={{ fontSize: 9, fill: tickColor }}
          axisLine={{ stroke: axisColor }}
          tickLine={{ stroke: axisColor }}
        />
        <YAxis
          tick={{ fontSize: 9, fill: tickColor }}
          axisLine={{ stroke: axisColor }}
          tickLine={{ stroke: axisColor }}
          allowDecimals={false}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="rounded-lg px-3 py-2 text-xs shadow-lg border bg-white dark:bg-[#2b2926] dark:border-[#4a4540]">
                <div className="font-semibold mb-1 text-[11px] text-claude-text">{label}</div>
                {payload.map((p: any, i: number) => {
                  const colorMap: Record<string, string> = {
                    total: '#c96442',
                    cryoem: '#2d8f8f',
                    xray: '#7c5cbf',
                  };
                  const nameMap: Record<string, string> = {
                    total: 'Total',
                    cryoem: 'Cryo-EM',
                    xray: 'X-ray',
                  };
                  return (
                    <div key={i} className="flex items-center gap-2 py-0.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colorMap[p.dataKey] || '#c96442' }} />
                      <span className="text-claude-text-secondary">{nameMap[p.dataKey] || p.dataKey}</span>
                      <span className="font-mono font-medium ml-auto text-claude-text">{p.value}</span>
                    </div>
                  );
                })}
              </div>
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="total"
          stroke="#c96442"
          strokeWidth={2}
          fill="url(#totalAreaGrad)"
        />
        <Area
          type="monotone"
          dataKey="cryoem"
          stroke="#2d8f8f"
          strokeWidth={1.5}
          fill="url(#cryoemAreaGrad)"
        />
        <Area
          type="monotone"
          dataKey="xray"
          stroke="#7c5cbf"
          strokeWidth={1.5}
          fill="url(#xrayAreaGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── 4. JournalImpactChart ────────────────────────────────────────────────────

interface JournalImpactChartProps {
  entries: PdbEntry[];
}

function JournalImpactChart({ entries }: JournalImpactChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const axisColor = getChartAxisColor(isDark);
  const tickColor = getChartTickColor(isDark);

  const data = useMemo(() => {
    const journalMap = new Map<string, { count: number; ifSum: number; ifCount: number }>();
    entries.forEach(e => {
      if (e.journal) {
        const existing = journalMap.get(e.journal) || { count: 0, ifSum: 0, ifCount: 0 };
        existing.count++;
        if (e.journalIf != null && e.journalIf > 0) {
          existing.ifSum += e.journalIf;
          existing.ifCount++;
        }
        journalMap.set(e.journal, existing);
      }
    });

    return Array.from(journalMap.entries())
      .map(([name, { count, ifSum, ifCount }]) => ({
        name: name.length > 25 ? name.slice(0, 24) + '…' : name,
        fullName: name,
        count,
        avgIf: ifCount > 0 ? ifSum / ifCount : null,
        fill: getIfTierColor(ifCount > 0 ? ifSum / ifCount : null),
      }))
      .sort((a, b) => (b.avgIf ?? 0) - (a.avgIf ?? 0))
      .slice(0, 6);
  }, [entries]);

  if (data.length === 0) return <ChartEmpty message="No journal data" />;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
        <defs>
          {data.map((d, i) => (
            <linearGradient key={`jgrad-${i}`} id={`jGrad-${i}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={d.fill} stopOpacity={0.9} />
              <stop offset="100%" stopColor={d.fill} stopOpacity={0.5} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#3d3832' : '#f0ece5'} horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 9, fill: tickColor }}
          axisLine={{ stroke: axisColor }}
          tickLine={{ stroke: axisColor }}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 8, fill: tickColor }}
          axisLine={{ stroke: axisColor }}
          tickLine={{ stroke: axisColor }}
          width={85}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload;
            return (
              <div className="rounded-lg px-3 py-2 text-xs shadow-lg border bg-white dark:bg-[#2b2926] dark:border-[#4a4540] max-w-[250px]">
                <div className="font-semibold mb-1 text-[11px] text-claude-text break-words">{d.fullName}</div>
                <div className="flex items-center gap-2 py-0.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.fill }} />
                  <span className="text-claude-text-secondary">IF</span>
                  <span className="font-mono font-medium ml-auto text-claude-text">{d.avgIf != null ? d.avgIf.toFixed(1) : 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 py-0.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0 bg-claude-text-muted" />
                  <span className="text-claude-text-secondary">Structures</span>
                  <span className="font-mono font-medium ml-auto text-claude-text">{d.count}</span>
                </div>
                {d.avgIf != null && (
                  <div className="flex items-center gap-2 py-0.5">
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: d.fill + '20', color: d.fill }}>
                      {getIfTierLabel(d.avgIf)}
                    </span>
                  </div>
                )}
              </div>
            );
          }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={`url(#jGrad-${index})`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Main WeeklyDashboardCharts Component ─────────────────────────────────────

interface WeeklyDashboardChartsProps {
  entries: PdbEntry[];
  snapshots: WeeklySnapshot[];
}

export function WeeklyDashboardCharts({ entries, snapshots }: WeeklyDashboardChartsProps) {
  const hasEntries = entries.length > 0;
  const hasSnapshots = snapshots.length > 0;

  if (!hasEntries && !hasSnapshots) {
    return (
      <div className="p-4 text-center text-[11px] text-claude-text-muted">
        No data available for dashboard charts
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      {/* Method Distribution */}
      <div className="p-4 rounded-lg border border-claude-border/50 dark:border-[#3d3832]/50 bg-claude-surface dark:bg-[#242220]">
        <div className="text-[11px] font-semibold text-claude-text-muted uppercase tracking-wider mb-3">
          Method Distribution
        </div>
        <MethodDistributionChart entries={entries} />
      </div>

      {/* Resolution Histogram */}
      <div className="p-4 rounded-lg border border-claude-border/50 dark:border-[#3d3832]/50 bg-claude-surface dark:bg-[#242220]">
        <div className="text-[11px] font-semibold text-claude-text-muted uppercase tracking-wider mb-3">
          Resolution Distribution
        </div>
        <ResolutionHistogramChart entries={entries} />
      </div>

      {/* Weekly Trend */}
      <div className="p-4 rounded-lg border border-claude-border/50 dark:border-[#3d3832]/50 bg-claude-surface dark:bg-[#242220]">
        <div className="text-[11px] font-semibold text-claude-text-muted uppercase tracking-wider mb-3">
          Weekly Trend
        </div>
        <WeeklyTrendChart snapshots={snapshots} />
        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#c96442' }} />
            <span className="text-[9px] text-claude-text-muted">Total</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#2d8f8f' }} />
            <span className="text-[9px] text-claude-text-muted">Cryo-EM</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#7c5cbf' }} />
            <span className="text-[9px] text-claude-text-muted">X-ray</span>
          </div>
        </div>
      </div>

      {/* Journal Impact */}
      <div className="p-4 rounded-lg border border-claude-border/50 dark:border-[#3d3832]/50 bg-claude-surface dark:bg-[#242220]">
        <div className="text-[11px] font-semibold text-claude-text-muted uppercase tracking-wider mb-3">
          Top Journals by Impact Factor
        </div>
        <JournalImpactChart entries={entries} />
        {/* IF Tier Legend */}
        <div className="flex items-center justify-center gap-3 mt-2 flex-wrap">
          {Object.entries(IF_TIER_COLORS).map(([tier, color]) => (
            <div key={tier} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[9px] text-claude-text-muted">IF {tier}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
