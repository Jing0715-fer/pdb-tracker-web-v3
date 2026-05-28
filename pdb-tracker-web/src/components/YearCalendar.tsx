'use client';

import { useTheme } from 'next-themes';
import { useMemo, useState, useEffect } from 'react';
import type { WeeklySnapshot } from '@/components/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface YearCalendarProps {
  entries?: { releaseDate: string }[];
  snapshots: WeeklySnapshot[];
  className?: string;
}

interface DailyCount {
  date: string;
  count: string | number;
}

export function YearCalendar({ entries, snapshots, className = '' }: YearCalendarProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [year, setYear] = useState(new Date().getFullYear());
  const [hoveredCell, setHoveredCell] = useState<{ label: string; count: number } | null>(null);
  const [dailyCounts, setDailyCounts] = useState<Record<string, number>>({});

  // Fetch daily counts from dedicated endpoint (pre-computed, no limit)
  useEffect(() => {
    fetch('/api/stats/daily')
      .then(r => r.json())
      .then((data: any) => {
        if (!Array.isArray(data)) { setDailyCounts({}); return; }
        const counts: Record<string, number> = {};
        for (const d of data) {
          counts[d.date] = Number(d.count) || 0;
        }
        setDailyCounts(counts);
      })
      .catch(console.error);
  }, []);

  // Also build from entries prop as fallback
  const entryDailyCounts = useMemo(() => {
    if (!entries) return {};
    const counts: Record<string, number> = {};
    for (const e of entries) {
      if (!e.releaseDate) continue;
      const key = e.releaseDate.split('T')[0];
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [entries]);

  // Use API counts, fall back to entries prop
  const counts = Object.keys(dailyCounts).length > 0 ? dailyCounts : entryDailyCounts;

  // Build calendar grid for all 12 months
  const monthGrid = useMemo(() => {
    const months = [];
    for (let m = 0; m < 12; m++) {
      const firstDay = new Date(year, m, 1).getDay();
      const daysInMonth = new Date(year, m + 1, 0).getDate();
      const cells: { day: number | null; count: number; dateKey: string }[] = [];
      for (let i = 0; i < firstDay; i++) cells.push({ day: null, count: 0, dateKey: '' });
      for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = `${year}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        cells.push({ day: d, count: counts[dateKey] || 0, dateKey });
      }
      months.push({ month: m, cells });
    }
    return months;
  }, [year, counts]);

  const maxCount = useMemo(() => Math.max(...Object.values(counts), 1), [counts]);

  const getColor = (count: number) => {
    if (count === 0) return isDark ? '#2b2926' : '#e8e4dd';
    const intensity = Math.min(count / maxCount, 1);
    if (intensity < 0.2) return isDark ? '#1e3a3a' : '#c8dede';
    if (intensity < 0.4) return isDark ? '#2a5a5a' : '#a0c8c8';
    if (intensity < 0.6) return isDark ? '#3a7a7a' : '#70b0b0';
    if (intensity < 0.8) return isDark ? '#4a9a9a' : '#409a9a';
    return isDark ? '#5ababa' : '#208a8a';
  };

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const cellSize = 11;

  const yearTotal = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className={`flex flex-col gap-1 ${className}`} style={{ padding: '6px 8px' }}>
      {/* Year nav */}
      <div className="flex items-center justify-between px-1 mb-1">
        <button onClick={() => setYear(y => y - 1)} className="h-6 w-6 flex items-center justify-center rounded hover:bg-claude-border-light dark:hover:bg-[#3d3832] text-claude-text-muted hover:text-claude-text transition-colors">
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-claude-text">{year}</span>
          <span className="text-[10px] text-claude-text-muted">{yearTotal} structures</span>
        </div>
        <button onClick={() => setYear(y => y + 1)} className="h-6 w-6 flex items-center justify-center rounded hover:bg-claude-border-light dark:hover:bg-[#3d3832] text-claude-text-muted hover:text-claude-text transition-colors">
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Calendar grid - 12 months in 4x3 */}
      <div className="grid grid-cols-4 gap-x-2 gap-y-1">
        {monthGrid.map(({ month, cells }) => (
          <div key={month} className="flex flex-col gap-[1px]">
            {/* Month label */}
            <div className="text-[9px] font-medium text-claude-text-muted mb-0.5">{monthNames[month]}</div>
            {/* Day-of-week labels */}
            <div className="grid grid-cols-7 gap-[1px]">
              {dayLabels.map((dl, di) => (
                <div key={di} className="text-[7px] text-claude-text-muted/50 text-center" style={{ width: cellSize, height: 8 }}>
                  {di === 1 || di === 4 || di === 6 ? dl : ''}
                </div>
              ))}
            </div>
            {/* Calendar cells */}
            <div className="grid grid-cols-7 gap-[1px]">
              {cells.map((cell, ci) => {
                if (cell.day === null) {
                  return <div key={ci} style={{ width: cellSize, height: cellSize }} />;
                }
                return (
                  <div
                    key={ci}
                    className="rounded-sm cursor-pointer transition-opacity duration-100 hover:opacity-75"
                    style={{
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: getColor(cell.count),
                    }}
                    onMouseEnter={() => setHoveredCell({
                      label: cell.dateKey ? new Date(cell.dateKey + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
                      count: cell.count
                    })}
                    onMouseLeave={() => setHoveredCell(null)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {hoveredCell && (
        <div className="px-2 py-1 text-[10px] rounded border bg-white dark:bg-[#242220] border-claude-border dark:border-[#4a4540] shadow text-claude-text">
          <span className="font-medium">{hoveredCell.label}</span>:{' '}
          <span className="font-semibold text-claude-accent">{hoveredCell.count}</span> {hoveredCell.count === 1 ? 'structure' : 'structures'}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-1 px-1 text-[9px] text-claude-text-muted">
        <span>Less</span>
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const colors = isDark
            ? ['#2b2926', '#1e3a3a', '#2a5a5a', '#3a7a7a', '#4a9a9a', '#5ababa']
            : ['#e8e4dd', '#c8dede', '#a0c8c8', '#70b0b0', '#409a9a', '#208a8a'];
          return <div key={i} className="w-2 h-2 rounded-sm" style={{ backgroundColor: colors[i] }} />;
        })}
        <span>More</span>
      </div>
    </div>
  );
}