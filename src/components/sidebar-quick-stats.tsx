'use client';

import React, { useMemo } from 'react';
import { ChevronDown, ChevronRight, Microscope, Database, Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Snapshot {
  weekId?: string;
  weekStart?: string;
  entryCount?: number;
  [key: string]: any;
}

interface SidebarQuickStatsProps {
  snapshots: Snapshot[];
  currentWeekEntryCount: number;
  avgResolution: number;
  totalStructures: number;
}

export function SidebarQuickStats({
  snapshots,
  currentWeekEntryCount,
  avgResolution,
  totalStructures,
}: SidebarQuickStatsProps) {
  const [expanded, setExpanded] = React.useState(true);

  const stats = useMemo(() => {
    const sorted = [...snapshots]
      .filter(s => s.weekStart)
      .sort((a, b) => new Date(b.weekStart!).getTime() - new Date(a.weekStart!).getTime());
    const currentWeek = sorted[0];
    const prevWeek = sorted[1];
    let weekChange = 0;
    if (prevWeek && currentWeek && currentWeek.entryCount != null && prevWeek.entryCount != null) {
      weekChange = ((currentWeek.entryCount - prevWeek.entryCount) / Math.max(prevWeek.entryCount, 1)) * 100;
    }
    return { weekChange };
  }, [snapshots]);

  const resQuality = avgResolution <= 2 ? 'good' : avgResolution <= 3 ? 'medium' : 'low';
  const resColor = resQuality === 'good' ? 'text-emerald-500' : resQuality === 'medium' ? 'text-amber-500' : 'text-red-400';
  const resBg = resQuality === 'good'
    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    : resQuality === 'medium'
      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
      : 'bg-red-400/10 text-red-400';

  const TrendIcon = stats.weekChange > 0 ? TrendingUp : stats.weekChange < 0 ? TrendingDown : Minus;
  const trendColor = stats.weekChange > 0 ? 'trend-up' : stats.weekChange < 0 ? 'trend-down' : 'trend-neutral';

  return (
    <div className="mb-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 px-2 py-1.5 w-full text-[11px] font-medium text-claude-text-muted hover:text-claude-text-secondary transition-colors rounded-lg hover:bg-claude-border-light/30 dark:hover:bg-[#2b2926]/50"
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        Quick Stats
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-2 pb-2 space-y-1.5">
              {/* This Week */}
              <div className="glass-panel-warm rounded-lg p-2.5 card-hover-glow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-md bg-claude-accent/10 flex items-center justify-center">
                      <Microscope className="h-3 w-3 text-claude-accent" />
                    </div>
                    <span className="text-[10px] text-claude-text-muted">This Week</span>
                  </div>
                  {stats.weekChange !== 0 && (
                    <span className={`inline-flex items-center gap-0.5 text-[9px] font-medium ${trendColor}`}>
                      <TrendIcon className="h-2.5 w-2.5" />
                      {stats.weekChange > 0 ? '+' : ''}{stats.weekChange.toFixed(0)}%
                    </span>
                  )}
                </div>
                <div className="mt-1 text-lg font-bold tabular-nums text-gradient-cool">
                  {currentWeekEntryCount}
                </div>
              </div>

              {/* Total */}
              <div className="glass-panel-warm rounded-lg p-2.5 card-hover-glow">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-md bg-teal-500/10 flex items-center justify-center">
                    <Database className="h-3 w-3 text-teal-500" />
                  </div>
                  <span className="text-[10px] text-claude-text-muted">Total</span>
                </div>
                <div className="mt-1 text-lg font-bold tabular-nums text-gradient-warm">
                  {totalStructures}
                </div>
              </div>

              {/* Avg Resolution */}
              <div className="glass-panel-warm rounded-lg p-2.5 card-hover-glow">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-md bg-claude-accent/10 flex items-center justify-center">
                    <Target className="h-3 w-3 text-claude-accent" />
                  </div>
                  <span className="text-[10px] text-claude-text-muted">Avg Res</span>
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className={`text-lg font-bold tabular-nums text-gradient-emerald`}>
                    {avgResolution > 0 ? avgResolution.toFixed(2) : '\u2014'}
                  </span>
                  <span className="text-[9px] text-claude-text-muted">&#x212B;</span>
                  <span className={`ml-auto text-[9px] font-medium px-1.5 py-0.5 rounded-full ${resBg}`}>
                    {resQuality === 'good' ? 'High' : resQuality === 'medium' ? 'Med' : 'Low'}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
