'use client';

import { useTheme } from 'next-themes';
import { useMemo, useState } from 'react';
import type { PdbEntry, WeeklySnapshot } from '@/components/types';

export function ActivityHeatmap({
  entries,
  snapshots,
  loading,
  className = '',
}: {
  entries: PdbEntry[];
  snapshots: WeeklySnapshot[];
  loading: boolean;
  className?: string;
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [hoveredWeek, setHoveredWeek] = useState<WeeklySnapshot | null>(null);

  // Group entries by week
  const weekData = useMemo(() => {
    const map = new Map<string, { snapshot: WeeklySnapshot; entries: PdbEntry[]; methodCounts: Record<string, number> }>();
    for (const snap of snapshots) {
      map.set(snap.weekId, { snapshot: snap, entries: [], methodCounts: { CryoEM: 0, XRay: 0, NMR: 0, Other: 0 } });
    }
    for (const e of entries) {
      const weekId = e.weekId;
      if (!weekId) continue;
      const group = map.get(weekId);
      if (group) {
        group.entries.push(e);
        const m = (e.method || '').toUpperCase();
        if (m.includes('CRYO') || m.includes('ELECTRON')) group.methodCounts.CryoEM++;
        else if (m.includes('X-RAY') || m.includes('XRAY')) group.methodCounts.XRay++;
        else if (m.includes('NMR')) group.methodCounts.NMR++;
        else group.methodCounts.Other++;
      }
    }
    return Array.from(map.values());
  }, [entries, snapshots]);

  const maxTotal = useMemo(() => Math.max(...weekData.map(w => w.entries.length), 1), [weekData]);

  const barColor = (method: string) => {
    if (method === 'CryoEM') return isDark ? '#4a9a9a' : '#2d8f8f';
    if (method === 'XRay') return isDark ? '#7a6a5a' : '#9a8570';
    if (method === 'NMR') return isDark ? '#5a7a9a' : '#5a7a9a';
    return isDark ? '#5a5a5a' : '#a0a0a0';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-claude-text-muted">
        <div className="animate-pulse text-xs">Loading activity...</div>
      </div>
    );
  }

  if (weekData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-claude-text-muted dark:text-[#9b9590]">
        <p className="text-xs">No weekly data available</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`} style={{ padding: '8px 4px' }}>
      {/* Method legend */}
      <div className="flex items-center gap-3 text-[9px] px-1">
        {[
          { label: 'Cryo-EM', key: 'CryoEM', color: isDark ? '#4a9a9a' : '#2d8f8f' },
          { label: 'X-ray', key: 'XRay', color: isDark ? '#7a6a5a' : '#9a8570' },
          { label: 'NMR', key: 'NMR', color: isDark ? '#5a7a9a' : '#7a8aaa' },
          { label: 'Other', key: 'Other', color: isDark ? '#5a5a5a' : '#a0a0a0' },
        ].map(item => (
          <span key={item.key} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: item.color }} />
            <span className="text-claude-text-muted">{item.label}</span>
          </span>
        ))}
      </div>

      {/* Week rows */}
      <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[calc(100vh-320px)]">
        {weekData.map(({ snapshot, entries: weekEntries, methodCounts }) => {
          const total = weekEntries.length;
          const heightPx = Math.max(8, Math.round((total / maxTotal) * 80));
          return (
            <div
              key={snapshot.weekId}
              className="flex items-center gap-2 px-1 py-1 rounded hover:bg-claude-border-light/30 dark:hover:bg-[#3d3832]/30 cursor-pointer transition-colors"
              onMouseEnter={() => setHoveredWeek(snapshot)}
              onMouseLeave={() => setHoveredWeek(null)}
            >
              {/* Week label */}
              <div className="w-10 flex-shrink-0 text-[10px] font-mono font-semibold text-claude-text-muted text-right">
                {snapshot.weekId.replace('2026-', '')}
              </div>

              {/* Stacked bar */}
              <div
                className="flex rounded-sm overflow-hidden flex-shrink-0"
                style={{ height: heightPx, minWidth: 40, maxWidth: 160 }}
              >
                {(['CryoEM', 'XRay', 'NMR', 'Other'] as const).map(key => {
                  const count = methodCounts[key];
                  if (count === 0) return null;
                  return (
                    <div
                      key={key}
                      style={{
                        flex: count / total,
                        backgroundColor: barColor(key),
                        minWidth: count > 0 ? 4 : 0,
                      }}
                    />
                  );
                })}
              </div>

              {/* Count */}
              <div className="text-[10px] text-claude-text-muted w-8 flex-shrink-0">
                {total}
              </div>

              {/* Method breakdown on hover */}
              {hoveredWeek?.weekId === snapshot.weekId && (
                <div className="flex items-center gap-2 text-[9px] ml-auto">
                  {(['CryoEM', 'XRay', 'NMR', 'Other'] as const).map(key => {
                    const count = methodCounts[key];
                    if (count === 0) return null;
                    return (
                      <span key={key} className="flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-sm" style={{ backgroundColor: barColor(key) }} />
                        <span className="text-claude-text-muted">{count}</span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Scale hint */}
      <div className="flex items-center gap-1 px-1 text-[9px] text-claude-text-muted">
        <span>Low</span>
        <div className="flex items-end gap-0.5 h-3">
          {[0.2, 0.4, 0.6, 0.8, 1].map((frac, i) => (
            <div key={i} className="w-2 rounded-sm" style={{ height: frac * 12, backgroundColor: isDark ? '#3d6a6a' : '#5a9a9a' }} />
          ))}
        </div>
        <span>High</span>
      </div>
    </div>
  );
}