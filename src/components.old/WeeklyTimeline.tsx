// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import type { PdbEntry, WeeklySnapshot } from './types';
import { getChartAxisColor, getChartTickColor, METHOD_COLORS } from './chart-tooltips';
import { formatDate, getMethodLabel } from './pdb-helpers';
import { ClaudeChartTooltip } from './chart-tooltips';
import { BarChart, Bar, XAxis, YAxis, Tooltip as BTooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

const safeNum = (val: any, decimals: number = 0, fallback: string = '—'): string => {
  if (val == null || isNaN(Number(val))) return fallback;
  return Number(val).toFixed(decimals);
};

export function WeeklyTimeline({
  entries,
  snapshot,
  onSelectEntry,
  onHighlightEntry,
  highlightedEntry,
}: {
  entries: PdbEntry[];
  snapshot: WeeklySnapshot;
  onSelectEntry: (entry: PdbEntry) => void;
  onHighlightEntry: (pdbId: string | null) => void;
  highlightedEntry: string | null;
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(350);
  const [tooltipData, setTooltipData] = useState<{
    entry: PdbEntry;
    x: number;
    y: number;
  } | null>(null);

  // Responsive container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Parse week date range
  const weekStart = new Date(snapshot.weekStart);
  const weekEnd = new Date(snapshot.weekEnd);
  const totalDays = Math.max(1, Math.round((weekEnd.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  const dayLabels = useMemo(() => {
    const days: { date: Date; dayName: string; dateLabel: string }[] = [];
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      days.push({
        date: d,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dateLabel: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      });
    }
    return days;
  }, [snapshot]);

  // Group entries by day
  const entriesByDay = useMemo(() => {
    const groups: Record<string, PdbEntry[]> = {};
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      groups[key] = [];
    }
    entries.forEach(entry => {
      const entryDate = entry.releaseDate.split('T')[0];
      if (groups[entryDate]) {
        groups[entryDate].push(entry);
      } else {
        // Find closest day
        const closest = Object.keys(groups).reduce((prev, curr) =>
          Math.abs(new Date(curr).getTime() - new Date(entryDate).getTime()) <
          Math.abs(new Date(prev).getTime() - new Date(entryDate).getTime()) ? curr : prev
        );
        groups[closest].push(entry);
      }
    });
    return groups;
  }, [entries, weekStart, totalDays]);

  // Timeline stats
  const timelineStats = useMemo(() => {
    const dayCounts = Object.values(entriesByDay).map(e => e.length);
    const maxCount = Math.max(...dayCounts, 0);
    const peakDayIdx = dayCounts.indexOf(maxCount);
    const peakDay = peakDayIdx >= 0 ? dayLabels[peakDayIdx] : null;
    const avgPerDay = entries.length > 0 ? (entries.length / totalDays).toFixed(1) : '0';

    // Method distribution
    const emCount = entries.filter(e => e.isCryoem === 1).length;
    const xrCount = entries.filter(e => e.isXray === 1).length;
    const nmrCount = entries.filter(e => e.method?.toUpperCase().includes('NMR')).length;
    const otherCount = entries.length - emCount - xrCount - nmrCount;

    return { maxCount, peakDay, avgPerDay, emCount, xrCount, nmrCount, otherCount };
  }, [entriesByDay, dayLabels, entries, totalDays]);

  // SVG dimensions - axis at bottom of chart area
  const svgHeight = 380;
  const marginLeft = 8;
  const marginRight = 8;
  const marginTop = 8;
  const marginBottom = 50;
  const timelineY = 40;
  const axisY = svgHeight / 2;
  const dayLabelY = svgHeight - marginBottom + 14;
  const dateLabelY = dayLabelY + 12;
  const usableWidth = containerWidth - marginLeft - marginRight;
  const dayWidth = totalDays > 0 ? usableWidth / totalDays : usableWidth;

  // Shift so peak day is centered in the timeline
  const startOffset = useMemo(() => {
    const counts = Object.values(entriesByDay).map(e => e.length);
    const maxCount = Math.max(...counts, 0);
    const pidx = counts.indexOf(maxCount);
    if (totalDays <= 1 || pidx <= 0) return 0;
    const peakCenterX = marginLeft + pidx * dayWidth + dayWidth / 2;
    const svgCenterX = (containerWidth - marginLeft - marginRight - 24) / 2;
    return svgCenterX - peakCenterX;
  }, [entriesByDay, dayWidth, totalDays, marginLeft, containerWidth]);

  const maxDotsPerGroup = 120;
  const dotBaseSize = 3;
  const dotMaxSize = 7;
  const dotVStep = 3;
  const dotHStep = 6;

  // Get dot color by method
  const getDotColor = (entry: PdbEntry): string => {
    const m = entry.method?.toUpperCase() || '';
    if (m.includes('CRYO') || m.includes('ELECTRON MICROSCOPY')) return METHOD_COLORS['Cryo-EM'];
    if (m.includes('X-RAY') || m.includes('XRAY')) return METHOD_COLORS['X-ray'];
    if (m.includes('NMR')) return METHOD_COLORS['NMR'];
    return METHOD_COLORS['Other'];
  };

  // Calculate dot positions - columns by IF ranges, wrap vertically within each column
  const dotPositions = useMemo(() => {
    const positions: { entry: PdbEntry; cx: number; cy: number; size: number; color: string; dayIndex: number }[] = [];
    const dayKeys = Object.keys(entriesByDay).sort();

    dayKeys.forEach((dayKey, dayIdx) => {
      const dayEntries = entriesByDay[dayKey];
      const cx = marginLeft + startOffset + dayIdx * dayWidth + dayWidth / 2;
      const sortedEntries = [...dayEntries].sort((a, b) => (b.journalIf ?? 0) - (a.journalIf ?? 0));
      const n = sortedEntries.length;

      if (n === 0) return;

      // Dynamically determine column count and per-column max based on entry count
      const colCount = n <= 10 ? 1 : n <= 50 ? 2 : n <= 150 ? 3 : n <= 300 ? 4 : 5;
      const perCol = Math.ceil(n / colCount);
      const usableHeight = svgHeight - marginTop - marginBottom - 40;

      for (let col = 0; col < colCount; col++) {
        const colStart = col * perCol;
        const colEntries = sortedEntries.slice(colStart, colStart + perCol);
        const colIfs = colEntries.map(e => e.journalIf ?? 0);
        const maxIf = Math.max(...colIfs, 1);
        const minIf = Math.min(...colIfs, 0);
        const range = Math.max(maxIf - minIf, 1);

        // Column x offset from day center
        const colOffset = (col - (colCount - 1) / 2) * 22;

        colEntries.forEach((entry, idx) => {
          const if_ = entry.journalIf ?? 0;
          const size = dotBaseSize + (if_ / 50) * (dotMaxSize - dotBaseSize);
          const posInCol = colEntries.length;
          const half = posInCol / 2;
          const signedPos = idx - half + 0.5;
          const spacing = size + dotVStep;
          const rawCY = axisY - signedPos * spacing;
          const cy = Math.min(Math.max(rawCY, marginTop + size + 20), svgHeight - marginBottom - size - 20);
          positions.push({
            entry,
            cx: cx + colOffset,
            cy,
            size,
            color: getDotColor(entry),
            dayIndex: dayIdx,
          });
        });
      }
    });

    return positions;
  }, [entriesByDay, dayWidth, marginLeft, axisY, svgHeight, startOffset]);

  // Method distribution bar segments
  const methodBarSegments = [
    { label: 'EM', count: timelineStats.emCount, color: METHOD_COLORS['Cryo-EM'] },
    { label: 'XR', count: timelineStats.xrCount, color: METHOD_COLORS['X-ray'] },
    { label: 'NMR', count: timelineStats.nmrCount, color: METHOD_COLORS['NMR'] },
    { label: 'Other', count: timelineStats.otherCount, color: METHOD_COLORS['Other'] },
  ].filter(s => s.count > 0);

  const methodBarTotal = methodBarSegments.reduce((s, seg) => s + seg.count, 0);

  const axisStroke = isDark ? '#4a4540' : '#e8e4dd';
  const textColor = isDark ? '#9b9590' : '#7c756e';
  const mutedTextColor = isDark ? '#6b6560' : '#9b9590';

  return (
    <div className="p-4 space-y-4" ref={containerRef}>
      {/* Timeline Stats */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-claude-text">
            Release Timeline
          </h4>
          <span className="text-[10px] text-claude-text-muted">
            {formatDate(snapshot.weekStart)} — {formatDate(snapshot.weekEnd)}
          </span>
        </div>

        {/* Quick stats row */}
        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-claude-text-secondary">
            Peak day: <span className="font-semibold text-claude-text">{timelineStats.peakDay?.dayName || '—'}</span>
            <span className="text-claude-text-muted"> ({timelineStats.maxCount} structures)</span>
          </span>
          <span className="text-claude-text-muted">·</span>
          <span className="text-claude-text-secondary">
            Avg/day: <span className="font-semibold text-claude-text">{timelineStats.avgPerDay}</span>
          </span>
        </div>

        {/* Method distribution mini bar */}
        {methodBarTotal > 0 && (
          <div className="space-y-1">
            <div className="flex h-2 rounded-full overflow-hidden bg-claude-border-light dark:bg-[#1a1917]">
              {methodBarSegments.map((seg, i) => (
                <div
                  key={`mbar-${i}`}
                  className="transition-all duration-500"
                  style={{
                    width: `${(seg.count / methodBarTotal) * 100}%`,
                    backgroundColor: seg.color,
                  }}
                />
              ))}
            </div>
            <div className="flex items-center gap-3">
              {methodBarSegments.map((seg, i) => (
                <span key={`mleg-${i}`} className="flex items-center gap-1 text-[9px]">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
                  <span className="text-claude-text-muted">{seg.label}</span>
                  <span className="font-mono text-claude-text-secondary">{seg.count}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Method Legend */}
      <div className="flex items-center gap-3 flex-wrap">
        {[
          { label: 'Cryo-EM', color: METHOD_COLORS['Cryo-EM'] },
          { label: 'X-ray', color: METHOD_COLORS['X-ray'] },
          { label: 'NMR', color: METHOD_COLORS['NMR'] },
          { label: 'Other', color: METHOD_COLORS['Other'] },
        ].map(item => (
          <span key={item.label} className="flex items-center gap-1 text-[9px]">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-claude-text-muted">{item.label}</span>
          </span>
        ))}
        <span className="text-[9px] text-claude-text-muted ml-auto">
          Dot size ∝ Impact Factor
        </span>
      </div>

      {/* SVG Timeline */}
      <div className="rounded-[10px] border border-claude-border dark:border-[#3d3832] p-3 bg-claude-bg/30 dark:bg-[#1a1917]/50">
        <svg
          width={containerWidth - 24}
          height={svgHeight}
          viewBox={`0 0 ${containerWidth - 24} ${svgHeight}`}
          className="w-full"
          style={{ overflow: 'visible' }}
        >
          {/* Vertical grid lines for each day */}
          {dayLabels.map((day, i) => {
            const x = marginLeft + startOffset + i * dayWidth + dayWidth / 2;
            return (
              <line
                key={`grid-${i}`}
                x1={x}
                y1={marginTop}
                x2={x}
                y2={axisY}
                stroke={axisStroke}
                strokeWidth={0.5}
                strokeDasharray="3,3"
              />
            );
          })}

          {/* Horizontal axis line */}
          <line
            x1={marginLeft + startOffset}
            y1={axisY}
            x2={marginLeft + startOffset + (totalDays - 1) * dayWidth + dayWidth / 2}
            y2={axisY}
            stroke={axisStroke}
            strokeWidth={1}
          />

          {/* Day labels */}
          {dayLabels.map((day, i) => {
            const x = marginLeft + startOffset + i * dayWidth + dayWidth / 2;
            return (
              <g key={`day-${i}`}>
                <text
                  x={x}
                  y={dayLabelY}
                  textAnchor="middle"
                  fontSize={10}
                  fill={textColor}
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  {day.dayName}
                </text>
                <text
                  x={x}
                  y={dateLabelY}
                  textAnchor="middle"
                  fontSize={9}
                  fill={mutedTextColor}
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  {day.dateLabel}
                </text>
                {/* Tick mark */}
                <line
                  x1={x}
                  y1={axisY}
                  x2={x}
                  y2={axisY + 4}
                  stroke={axisStroke}
                  strokeWidth={1}
                />
              </g>
            );
          })}

          {/* Day count badges */}
          {dayLabels.map((day, i) => {
            const dayKey = day.date.toISOString().split('T')[0];
            const count = entriesByDay[dayKey]?.length ?? 0;
            if (count === 0) return null;
            const x = marginLeft + startOffset + i * dayWidth + dayWidth / 2;
            return (
              <text
                key={`count-${i}`}
                x={x}
                y={axisY + 16}
                textAnchor="middle"
                fontSize={9}
                fill={mutedTextColor}
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {count > 99 ? '99+' : count}
              </text>
            );
          })}

          {/* Entry dots with animations */}
          {dotPositions.map((dp, idx) => {
            const isHighlighted = highlightedEntry === dp.entry.pdbId;
            return (
              <motion.circle
                key={`dot-${dp.entry.pdbId}-${idx}`}
                cx={dp.cx}
                cy={dp.cy}
                r={dp.size / 2}
                fill={dp.color}
                opacity={0.85}
                stroke={isHighlighted ? '#ffffff' : 'none'}
                strokeWidth={isHighlighted ? 2 : 0}
                initial={{ r: 0, opacity: 0 }}
                animate={{
                  r: isHighlighted ? dp.size / 2 + 2 : dp.size / 2,
                  opacity: isHighlighted ? 1 : 0.85,
                }}
                transition={{
                  duration: 0.3,
                  delay: Math.min(idx, 20) * 0.03,
                  r: { duration: 0.15 },
                }}
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => {
                  onHighlightEntry(dp.entry.pdbId);
                  const svgRect = (e.currentTarget.closest('svg') as SVGSVGElement)?.getBoundingClientRect();
                  if (svgRect) {
                    setTooltipData({
                      entry: dp.entry,
                      x: dp.cx + 12,
                      y: dp.cy - 10,
                    });
                  }
                }}
                onMouseLeave={() => {
                  onHighlightEntry(null);
                  setTooltipData(null);
                }}
                onClick={() => onSelectEntry(dp.entry)}
              />
            );
          })}

          {/* Tooltip */}
          {tooltipData && (
            <foreignObject
              x={Math.min(tooltipData.x, containerWidth - 24 - 200)}
              y={Math.max(0, tooltipData.y - 60)}
              width={200}
              height={80}
              style={{ overflow: 'visible', pointerEvents: 'none' }}
            >
              <div
                className={`rounded-lg px-2.5 py-2 text-[10px] shadow-lg border bg-white dark:bg-[#2b2926] dark:border-[#4a4540] text-claude-text`}
                style={{ whiteSpace: 'nowrap' }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`font-mono font-semibold text-[11px] text-claude-accent`}>
                    {tooltipData.entry.pdbId}
                  </span>
                  <span
                    className="inline-flex px-1 py-0.5 rounded text-[8px] font-medium"
                    style={{
                      backgroundColor: getDotColor(tooltipData.entry) + '20',
                      color: getDotColor(tooltipData.entry),
                    }}
                  >
                    {getMethodLabel(tooltipData.entry.method)}
                  </span>
                </div>
                <div className={`text-claude-text-secondary truncate max-w-[180px]`}>
                  {tooltipData.entry.title}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {tooltipData.entry.resolution != null && (
                    <span className="text-claude-text-muted">
                      {tooltipData.entry.resolution}Å
                    </span>
                  )}
                  {tooltipData.entry.journalIf != null && (
                    <span className="text-claude-text-muted">
                      IF: {safeNum(tooltipData.entry.journalIf, 1)}
                    </span>
                  )}
                </div>
              </div>
            </foreignObject>
          )}
        </svg>

        {/* Day count indicators below SVG */}
        <div className="flex mt-1" style={{ paddingLeft: marginLeft, paddingRight: marginRight }}>
          {dayLabels.map((day, i) => {
            const dayKey = new Date(weekStart);
            dayKey.setDate(dayKey.getDate() + i);
            const key = dayKey.toISOString().split('T')[0];
            const count = entriesByDay[key]?.length || 0;
            return (
              <div
                key={`count-${i}`}
                className="flex-1 text-center"
              >
                <span className={`text-[9px] font-mono ${count > 0 ? 'text-claude-accent' : isDark ? 'text-[#4a4540]' : 'text-claude-border'}`}>
                  {count > 0 ? count : ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );


}
