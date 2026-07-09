'use client';

import React, { useMemo } from 'react';
import { Lightbulb, Snowflake, BarChart3, Microscope, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from 'lucide-react';
import type { PdbEntry, WeeklySnapshot } from '@/lib/pdb-types';
import { getMethodLabel, getMethodColor } from '@/components/pdb-helpers';

interface QuickInsightsProps {
  entries: PdbEntry[];
  snapshot: WeeklySnapshot | null;
  snapshots: WeeklySnapshot[];
  loading: boolean;
}

interface InsightChipData {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel: string;
  colorClass: string;
  borderColor: string;
}

function getResolutionQuality(avgRes: number | null): { label: string; colorClass: string } {
  if (avgRes === null || avgRes === undefined) return { label: 'N/A', colorClass: 'text-claude-text-muted' };
  if (avgRes <= 2) return { label: 'High', colorClass: 'text-green-600 dark:text-green-400' };
  if (avgRes <= 3.5) return { label: 'Medium', colorClass: 'text-amber-600 dark:text-amber-400' };
  return { label: 'Low', colorClass: 'text-red-500 dark:text-red-400' };
}

export function WeeklyQuickInsights({ entries, snapshot, snapshots, loading }: QuickInsightsProps) {
  const [collapsed, setCollapsed] = React.useState(false);

  const insights = useMemo<InsightChipData[]>(() => {
    if (loading || entries.length === 0) {
      return [
        { icon: <Lightbulb className="h-3 w-3" />, label: 'Quick Insights', value: '—', sublabel: 'Loading data...', colorClass: 'text-claude-text-muted', borderColor: 'border-claude-border' },
      ];
    }

    // 1. Method Leader
    const methodCounts: Record<string, number> = {};
    for (const entry of entries) {
      const m = entry.method || 'Unknown';
      methodCounts[m] = (methodCounts[m] || 0) + 1;
    }
    let leaderMethod = '';
    let leaderCount = 0;
    for (const [method, count] of Object.entries(methodCounts)) {
      if (count > leaderCount) {
        leaderMethod = method;
        leaderCount = count;
      }
    }
    const leaderPct = Math.round((leaderCount / entries.length) * 100);
    const leaderLabel = getMethodLabel(leaderMethod);
    const leaderColors = getMethodColor(leaderMethod);

    // 2. High Impact (IF ≥ 20)
    const highImpactEntries = entries.filter(e => e.journalIf !== null && e.journalIf >= 20);
    const highImpactCount = highImpactEntries.length;
    const highImpactJournals = [...new Set(highImpactEntries.map(e => e.journal).filter(Boolean))].slice(0, 2);
    const journalStr = highImpactJournals.length > 0 ? ` (${highImpactJournals.join(', ')})` : '';

    // 3. Resolution Quality
    const resEntries = entries.filter(e => e.resolution !== null);
    const avgRes = resEntries.length > 0
      ? resEntries.reduce((sum, e) => sum + (e.resolution ?? 0), 0) / resEntries.length
      : null;
    const resQuality = getResolutionQuality(avgRes);
    const avgResStr = avgRes !== null ? `${avgRes.toFixed(2)}\u00C5` : 'N/A';

    // 4. Week Change
    let weekChange = 0;
    let weekChangeStr = '—';
    let weekChangeIcon = <Minus className="h-3 w-3" />;
    let weekChangeColor = 'text-claude-text-muted';
    if (snapshot && snapshots.length > 1) {
      const currentIdx = snapshots.findIndex(s => s.weekId === snapshot.weekId);
      if (currentIdx >= 0 && currentIdx < snapshots.length - 1) {
        const prevSnapshot = snapshots[currentIdx + 1];
        weekChange = snapshot.totalStructures - prevSnapshot.totalStructures;
        if (weekChange > 0) {
          weekChangeStr = `+${weekChange} vs last week`;
          weekChangeIcon = <TrendingUp className="h-3 w-3" />;
          weekChangeColor = 'text-green-600 dark:text-green-400';
        } else if (weekChange < 0) {
          weekChangeStr = `${weekChange} vs last week`;
          weekChangeIcon = <TrendingDown className="h-3 w-3" />;
          weekChangeColor = 'text-red-500 dark:text-red-400';
        } else {
          weekChangeStr = 'No change';
          weekChangeIcon = <Minus className="h-3 w-3" />;
          weekChangeColor = 'text-claude-text-muted';
        }
      }
    }

    return [
      {
        icon: <Snowflake className="h-3 w-3" />,
        label: 'Method Leader',
        value: `${leaderLabel}`,
        sublabel: `${leaderPct}% share (${leaderCount})`,
        colorClass: leaderColors.text,
        borderColor: leaderColors.border,
      },
      {
        icon: <BarChart3 className="h-3 w-3" />,
        label: 'High Impact',
        value: `${highImpactCount} paper${highImpactCount !== 1 ? 's' : ''}`,
        sublabel: highImpactCount > 0 ? `IF\u226520${journalStr}` : 'IF\u226520',
        colorClass: highImpactCount > 0 ? 'text-claude-high dark:text-claude-high' : 'text-claude-text-muted',
        borderColor: highImpactCount > 0 ? 'border-claude-high/30' : 'border-claude-border',
      },
      {
        icon: <Microscope className="h-3 w-3" />,
        label: 'Avg Resolution',
        value: avgResStr,
        sublabel: `${resQuality.label} quality`,
        colorClass: resQuality.colorClass,
        borderColor: avgRes !== null
          ? avgRes <= 2 ? 'border-green-500/30' : avgRes <= 3.5 ? 'border-amber-500/30' : 'border-red-500/30'
          : 'border-claude-border',
      },
      {
        icon: weekChangeIcon,
        label: 'Week Change',
        value: weekChangeStr,
        sublabel: weekChange !== 0 ? `${snapshot?.totalStructures ?? 0} total` : 'Same as last week',
        colorClass: weekChangeColor,
        borderColor: weekChange > 0 ? 'border-green-500/30' : weekChange < 0 ? 'border-red-500/30' : 'border-claude-border',
      },
    ];
  }, [entries, snapshot, snapshots, loading]);

  return (
    <div className="quick-insights-panel border-b border-claude-border dark:border-[#3d3832] bg-claude-surface dark:bg-[#242220]">
      <div className="px-4 py-2">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Lightbulb className="h-3.5 w-3.5 text-claude-accent" />
            <span className="text-[11px] font-semibold text-claude-text">Quick Insights</span>
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="h-5 w-5 flex items-center justify-center rounded hover:bg-claude-border-light dark:hover:bg-[#2b2926] transition-colors"
            aria-label={collapsed ? 'Expand insights' : 'Collapse insights'}
          >
            {collapsed ? (
              <ChevronDown className="h-3 w-3 text-claude-text-muted" />
            ) : (
              <ChevronUp className="h-3 w-3 text-claude-text-muted" />
            )}
          </button>
        </div>
        {!collapsed && (
          <div className="flex flex-wrap gap-2">
            {insights.map((chip, i) => (
              <div
                key={i}
                className={`insight-chip flex items-center gap-2 px-2.5 py-1.5 rounded-lg border ${chip.borderColor} bg-claude-border-light/50 dark:bg-[#2b2926]/60 transition-all`}
              >
                <span className={`flex-shrink-0 ${chip.colorClass}`}>{chip.icon}</span>
                <div className="min-w-0">
                  <div className="text-[9px] text-claude-text-muted leading-tight">{chip.label}</div>
                  <div className={`text-[11px] font-semibold leading-tight ${chip.colorClass}`}>{chip.value}</div>
                  <div className="text-[9px] text-claude-text-muted leading-tight truncate">{chip.sublabel}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
