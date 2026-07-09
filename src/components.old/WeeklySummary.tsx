'use client';

import React, { useMemo } from 'react';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Cpu, Aperture, Bug } from 'lucide-react';
import type { PdbEntry, WeeklySnapshot } from '@/lib/pdb-types';
import { METHOD_COLORS, IF_TIER_COLORS, RESOLUTION_RANGES, getChartAxisColor, getChartTickColor, ClaudeChartTooltip, ClaudeResTooltip } from '@/components/chart-tooltips';

// ─── Props ────────────────────────────────────────────────────────────────────

interface WeeklySummaryProps {
  entries: PdbEntry[];
  snapshot?: WeeklySnapshot | null;
  snapshots?: WeeklySnapshot[];
}

// ─── Key Insight Item ──────────────────────────────────────────────────────────

interface InsightItem {
  id: string;
  icon: React.ReactNode;
  color: string;
  text: string;
  trend: 'up' | 'down' | 'neutral';
}

function InsightCard({ insight, index }: { insight: InsightItem; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: index * 0.1 }}
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-claude-border-light/50 dark:bg-[#1a1917]/50 border border-claude-border/40 dark:border-[#3d3832]/40 h-full"
    >
      <div className={`flex items-center justify-center w-6 h-6 rounded-md flex-shrink-0 ${insight.color}`}>
        {insight.icon}
      </div>
      <span className="text-xs text-claude-text-secondary leading-snug flex-1">{insight.text}</span>
      <span className="flex-shrink-0">
        {insight.trend === 'up' && <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
        {insight.trend === 'down' && <TrendingDown className="h-3.5 w-3.5 text-red-400" />}
        {insight.trend === 'neutral' && <span className="text-[10px] text-claude-text-muted">\u2014</span>}
      </span>
    </motion.div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WeeklySummary({ entries, snapshot, snapshots = [] }: WeeklySummaryProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // ─── Key Insights ──────────────────────────────────────────────────────────

  const insights = useMemo(() => {
    const items: InsightItem[] = [];
    if (entries.length === 0) return items;

    // 1. Cryo-EM structures change
    const cryoemCount = entries.filter(e => e.isCryoem).length;
    const cryoemPct = entries.length > 0 ? (cryoemCount / entries.length) * 100 : 0;

    if (snapshot && snapshots.length >= 2) {
      const currentIdx = snapshots.findIndex(s => s.weekId === snapshot.weekId);
      if (currentIdx >= 0 && currentIdx < snapshots.length - 1) {
        const prev = snapshots[currentIdx + 1];
        if (prev && prev.totalStructures > 0) {
          const prevCryoemPct = (prev.cryoemCount / prev.totalStructures) * 100;
          const delta = cryoemPct - prevCryoemPct;
          const absDelta = Math.abs(delta).toFixed(1);
          if (Math.abs(delta) >= 0.1) {
            items.push({
              id: 'cryoem-change',
              icon: <Cpu className="h-3 w-3 text-white" />,
              color: 'bg-gradient-to-br from-[#2d8f8f] to-[#1a6b6b]',
              text: `Cryo-EM structures ${delta > 0 ? 'increased' : 'decreased'} by ${absDelta}% this week`,
              trend: delta > 0 ? 'up' : 'down',
            });
          } else {
            items.push({
              id: 'cryoem-stable',
              icon: <Cpu className="h-3 w-3 text-white" />,
              color: 'bg-gradient-to-br from-[#2d8f8f] to-[#1a6b6b]',
              text: `Cryo-EM share remains stable at ${cryoemPct.toFixed(1)}%`,
              trend: 'neutral',
            });
          }
        }
      }
    } else if (cryoemCount > 0) {
      items.push({
        id: 'cryoem-count',
        icon: <Cpu className="h-3 w-3 text-white" />,
        color: 'bg-gradient-to-br from-[#2d8f8f] to-[#1a6b6b]',
        text: `Cryo-EM accounts for ${cryoemPct.toFixed(1)}% of structures (${cryoemCount} entries)`,
        trend: cryoemPct > 30 ? 'up' : 'neutral',
      });
    }

    // 2. Average resolution change
    const resolutions = entries.filter(e => e.resolution != null).map(e => e.resolution!);
    const avgResolution = resolutions.length > 0
      ? resolutions.reduce((a, b) => a + b, 0) / resolutions.length
      : null;

    if (avgResolution !== null && snapshot && snapshots.length >= 2) {
      const currentIdx = snapshots.findIndex(s => s.weekId === snapshot.weekId);
      if (currentIdx >= 0 && currentIdx < snapshots.length - 1) {
        const prev = snapshots[currentIdx + 1];
        if (prev && prev.avgResolution != null) {
          const resDelta = avgResolution - prev.avgResolution;
          const absResDelta = Math.abs(resDelta).toFixed(2);
          // Lower resolution is better, so "improved" means lower
          if (Math.abs(resDelta) >= 0.05) {
            items.push({
              id: 'resolution-change',
              icon: <Aperture className="h-3 w-3 text-white" />,
              color: resDelta < 0
                ? 'bg-gradient-to-br from-emerald-500 to-emerald-700'
                : 'bg-gradient-to-br from-amber-500 to-amber-700',
              text: `Average resolution ${resDelta < 0 ? 'improved' : 'worsened'} by ${absResDelta}Å`,
              trend: resDelta < 0 ? 'up' : 'down',
            });
          }
        }
      }
    } else if (avgResolution !== null) {
      items.push({
        id: 'resolution-avg',
        icon: <Aperture className="h-3 w-3 text-white" />,
        color: avgResolution <= 2.5
          ? 'bg-gradient-to-br from-emerald-500 to-emerald-700'
          : 'bg-gradient-to-br from-amber-500 to-amber-700',
        text: `Average resolution is ${avgResolution.toFixed(2)}Å`,
        trend: avgResolution <= 2.5 ? 'up' : 'neutral',
      });
    }

    // 3. New organisms
    if (snapshot && snapshots.length >= 2) {
      const currentIdx = snapshots.findIndex(s => s.weekId === snapshot.weekId);
      if (currentIdx >= 0 && currentIdx < snapshots.length - 1) {
        // We can't easily compute "new organisms" without previous entries,
        // so let's count unique organisms in current entries
        const currentOrganisms = new Set<string>();
        for (const e of entries) {
          if (!e.organisms) continue;
          e.organisms.split('|').forEach(o => {
            const trimmed = o.trim();
            if (trimmed) currentOrganisms.add(trimmed);
          });
        }
        if (currentOrganisms.size > 0) {
          items.push({
            id: 'organisms-count',
            icon: <Bug className="h-3 w-3 text-white" />,
            color: 'bg-gradient-to-br from-[#c9872e] to-[#a06b1a]',
            text: `${currentOrganisms.size} unique organism${currentOrganisms.size !== 1 ? 's' : ''} represented this week`,
            trend: currentOrganisms.size >= 4 ? 'up' : 'neutral',
          });
        }
      }
    } else {
      const currentOrganisms = new Set<string>();
      for (const e of entries) {
        if (!e.organisms) continue;
        e.organisms.split('|').forEach(o => {
          const trimmed = o.trim();
          if (trimmed) currentOrganisms.add(trimmed);
        });
      }
      if (currentOrganisms.size > 0) {
        items.push({
          id: 'organisms-count',
          icon: <Bug className="h-3 w-3 text-white" />,
          color: 'bg-gradient-to-br from-[#c9872e] to-[#a06b1a]',
          text: `${currentOrganisms.size} unique organism${currentOrganisms.size !== 1 ? 's' : ''} represented`,
          trend: currentOrganisms.size >= 4 ? 'up' : 'neutral',
        });
      }
    }

    return items.slice(0, 3); // Max 3 insights
  }, [entries, snapshot, snapshots]);

  // ─── Method Distribution ─────────────────────────────────────────────────

  const methodData = useMemo(() => {
    const counts: Record<string, number> = { 'Cryo-EM': 0, 'X-ray': 0, 'NMR': 0, 'Other': 0 };
    for (const e of entries) {
      const m = (e.method || '').toUpperCase();
      if (m.includes('CRYO-EM') || m.includes('ELECTRON MICROSCOPY')) counts['Cryo-EM']++;
      else if (m.includes('X-RAY') || m.includes('XRAY')) counts['X-ray']++;
      else if (m.includes('NMR')) counts['NMR']++;
      else counts['Other']++;
    }
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value, color: METHOD_COLORS[name] || METHOD_COLORS['Other'] }));
  }, [entries]);

  // ─── Resolution Distribution ─────────────────────────────────────────────

  const resolutionData = useMemo(() => {
    const counts = RESOLUTION_RANGES.map(r => ({ range: r.label, count: 0, color: r.color, min: r.min, max: r.max }));
    for (const e of entries) {
      if (e.resolution == null) continue;
      for (const bucket of counts) {
        if (e.resolution >= bucket.min && e.resolution < bucket.max) {
          bucket.count++;
          break;
        }
      }
    }
    return counts.filter(b => b.count > 0);
  }, [entries]);

  // ─── IF Tier Distribution ────────────────────────────────────────────────

  const ifTierData = useMemo(() => {
    const counts: Record<string, number> = { top: 0, high: 0, mid: 0, low: 0, unknown: 0 };
    for (const e of entries) {
      const tier = e.ifTier || 'unknown';
      counts[tier] = (counts[tier] || 0) + 1;
    }
    const labels: Record<string, string> = { top: 'Top (≥20)', high: 'High (10-20)', mid: 'Mid (5-10)', low: 'Low (<5)', unknown: 'Unknown' };
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([tier, count]) => ({
        tier: labels[tier] || tier,
        value: count,
        color: IF_TIER_COLORS[tier] || IF_TIER_COLORS['unknown'],
      }));
  }, [entries]);

  // ─── Organism Distribution ───────────────────────────────────────────────

  const organismData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of entries) {
      if (!e.organisms) continue;
      const organisms = e.organisms.split('|');
      for (const org of organisms) {
        const trimmed = org.trim();
        if (trimmed) counts[trimmed] = (counts[trimmed] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name: name.length > 25 ? name.slice(0, 22) + '…' : name, count }));
  }, [entries]);

  const axisColor = getChartAxisColor(isDark);
  const tickColor = getChartTickColor(isDark);

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-claude-text-muted">No data available for charts</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* ── Key Insights Section ──────────────────────────────────────────────── */}
      {insights.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-claude-text-secondary mb-2.5 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3 text-claude-accent" />
            Key Insights
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 [grid-auto-rows:1fr]">
            {insights.map((insight, i) => (
              <InsightCard key={insight.id} insight={insight} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* ── Charts Grid ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Method Distribution Donut */}
        <div className="bg-claude-surface dark:bg-[#242220] rounded-lg border border-claude-border dark:border-[#3d3832] p-4 chart-container">
          <h4 className="text-xs font-semibold text-claude-text-secondary mb-3 uppercase tracking-wider">
            Method Distribution
          </h4>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart key="weekly-method-pie">
                <Pie
                  data={methodData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                  stroke="none"
                >
                  {methodData.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<ClaudeChartTooltip isDark={isDark} />} />
                <Legend
                  wrapperStyle={{ fontSize: '11px', color: axisColor }}
                  formatter={(value) => <span style={{ color: axisColor }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Resolution Distribution Bar Chart */}
        <div className="bg-claude-surface dark:bg-[#242220] rounded-lg border border-claude-border dark:border-[#3d3832] p-4 chart-container">
          <h4 className="text-xs font-semibold text-claude-text-secondary mb-3 uppercase tracking-wider">
            Resolution Distribution
          </h4>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart key="weekly-resolution-bar" data={resolutionData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#3d3832' : '#e8e4dd'} />
                <XAxis
                  dataKey="range"
                  tick={{ fill: tickColor, fontSize: 10 }}
                  axisLine={{ stroke: axisColor }}
                  tickLine={{ stroke: axisColor }}
                />
                <YAxis
                  tick={{ fill: tickColor, fontSize: 10 }}
                  axisLine={{ stroke: axisColor }}
                  tickLine={{ stroke: axisColor }}
                  allowDecimals={false}
                />
                <Tooltip content={<ClaudeResTooltip isDark={isDark} />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {resolutionData.map((entry, i) => (
                    <Cell key={`res-${i}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* IF Tier Distribution */}
        <div className="bg-claude-surface dark:bg-[#242220] rounded-lg border border-claude-border dark:border-[#3d3832] p-4 chart-container">
          <h4 className="text-xs font-semibold text-claude-text-secondary mb-3 uppercase tracking-wider">
            Impact Factor Tiers
          </h4>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart key="weekly-if-pie">
                <Pie
                  data={ifTierData}
                  dataKey="value"
                  nameKey="tier"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  paddingAngle={1}
                  stroke="none"
                >
                  {ifTierData.map((entry, i) => (
                    <Cell key={`if-${i}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<ClaudeChartTooltip isDark={isDark} />} />
                <Legend
                  wrapperStyle={{ fontSize: '11px' }}
                  formatter={(value) => <span style={{ color: axisColor }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Organism Distribution */}
        <div className="bg-claude-surface dark:bg-[#242220] rounded-lg border border-claude-border dark:border-[#3d3832] p-4 chart-container">
          <h4 className="text-xs font-semibold text-claude-text-secondary mb-3 uppercase tracking-wider">
            Top Organisms
          </h4>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart key="weekly-organism-bar" data={organismData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#3d3832' : '#e8e4dd'} horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: tickColor, fontSize: 10 }}
                  axisLine={{ stroke: axisColor }}
                  tickLine={{ stroke: axisColor }}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: tickColor, fontSize: 9 }}
                  axisLine={{ stroke: axisColor }}
                  tickLine={{ stroke: axisColor }}
                  width={100}
                />
                <Tooltip content={<ClaudeChartTooltip isDark={isDark} />} />
                <Bar dataKey="count" fill="#c96442" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
