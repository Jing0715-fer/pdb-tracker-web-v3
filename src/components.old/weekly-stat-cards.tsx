'use client';

import React, { useState, useEffect, useMemo, useId } from 'react';
import { motion } from 'framer-motion';
import { Database, Aperture, Cpu, Trophy, TrendingUp, TrendingDown } from 'lucide-react';
import { TiltCard, AnimatedNumber } from '@/components/ui/pdb-animated';
import { DistributionBar, type DistributionSegment } from '@/components/ui/distribution-bar';
import type { PdbEntry, WeeklySnapshot } from '@/lib/pdb-types';

// ─── Stat Card Component ──────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: number;
  suffix?: string;
  decimals?: number;
  icon: React.ReactNode;
  color: string;
  glowColor?: string;
  subtitle?: string;
  loading?: boolean;
  delay?: number;
  children?: React.ReactNode;
  borderColor?: string;
}

function StatCard({ title, value, suffix = '', decimals = 0, icon, color, glowColor, subtitle, loading, delay = 0, children, borderColor = '#2d8f8f' }: StatCardProps) {
  return (
    <TiltCard
      className="gradient-border-wrap min-w-0 h-full"
      animationDelay={`${delay}ms`}
      style={{ '--gradient-border-color': borderColor } as React.CSSProperties}
    >
      <div className="gradient-border-inner bg-claude-surface dark:bg-[#242220] p-3 sm:p-4 claude-card-shadow transition-transform duration-200 min-w-0 h-full flex flex-col">
        <div className="flex items-start justify-between mb-1.5 sm:mb-2 min-h-[36px] gap-2">
          <div className={`flex items-center justify-center w-8 h-8 min-w-[32px] rounded-md ${color} stat-icon-float flex-shrink-0`}>
            {icon}
          </div>
          <div className="hidden sm:flex items-center justify-end h-[38px] min-w-0 flex-1">{children ?? <div className="h-[38px]" />}</div>
        </div>
        <div className="text-xl sm:text-2xl font-bold text-claude-text tabular-nums">
          {loading ? (
            <div className="w-14 sm:w-16 h-6 sm:h-7 rounded shimmer-skeleton" />
          ) : (
            <AnimatedNumber value={value} decimals={decimals} suffix={suffix} glowColor={glowColor} />
          )}
        </div>
        <div className="text-[10px] sm:text-[11px] text-claude-text-muted mt-0.5">{title}</div>
        <div className={`text-[9px] sm:text-[10px] mt-0.5 line-clamp-1 ${subtitle ? 'text-claude-text-muted opacity-70' : 'invisible'}`}>
          {subtitle || '\u00A0'}
        </div>
      </div>
    </TiltCard>
  );
}

// ─── Bezier Sparkline SVG ────────────────────────────────────────────────────

function BezierSparkline({ data, color = '#2d8f8f', width = 100, height = 36 }: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  const reactId = useId();
  const uid = reactId.replace(/:/g, '');
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 3;
  const usableH = height - padding * 2;
  const usableW = width - padding * 2;

  const points = data.map((v, i) => ({
    x: padding + (i / (data.length - 1)) * usableW,
    y: height - padding - ((v - min) / range) * usableH,
  }));

  // Build smooth bezier curve path using Catmull-Rom to Bezier conversion
  let path = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;

  if (points.length === 2) {
    // Simple quadratic bezier for 2 points
    const cpx = (points[0].x + points[1].x) / 2;
    path += ` Q${cpx.toFixed(1)},${points[0].y.toFixed(1)} ${points[1].x.toFixed(1)},${points[1].y.toFixed(1)}`;
  } else {
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      // Catmull-Rom to Bezier control points
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
  }

  // Gradient fill: close the path along the bottom
  const fillPath = `${path} L${points[points.length - 1].x.toFixed(1)},${(height - padding).toFixed(1)} L${points[0].x.toFixed(1)},${(height - padding).toFixed(1)} Z`;

  return (
    <svg width={width} height={height} className="flex-shrink-0" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* Gradient fill area */}
      <motion.path
        d={fillPath}
        fill={`url(#fill-${uid})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: animated ? 1 : 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      />
      {/* Bezier curve line */}
      <motion.path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: animated ? 1 : 0, opacity: animated ? 1 : 0 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
      {/* End dot */}
      {points.length > 0 && (
        <motion.circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r={2.5}
          fill={color}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: animated ? 1 : 0, opacity: animated ? 1 : 0 }}
          transition={{ duration: 0.3, delay: 1.0 }}
        />
      )}
    </svg>
  );
}

// ─── Mini Resolution Bar Chart ────────────────────────────────────────────────

function MiniResBarChart({ entries, width = 90, height = 34 }: {
  entries: PdbEntry[];
  width?: number;
  height?: number;
}) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 200);
    return () => clearTimeout(timer);
  }, []);

  const bars = useMemo(() => {
    const ressWithValues = entries.filter(e => e.resolution != null);
    const under2 = ressWithValues.filter(e => e.resolution! < 2).length;
    const between2and3 = ressWithValues.filter(e => e.resolution! >= 2 && e.resolution! < 3).length;
    const over3 = ressWithValues.filter(e => e.resolution! >= 3).length;
    const maxVal = Math.max(under2, between2and3, over3, 1);
    return [
      { count: under2, color: '#16a34a', label: '<2Å' },
      { count: between2and3, color: '#c9872e', label: '2-3Å' },
      { count: over3, color: '#dc2626', label: '>3Å' },
    ].map(b => ({
      ...b,
      height: maxVal > 0 ? (b.count / maxVal) * (height - 12) : 0,
    }));
  }, [entries, height]);

  const barWidth = (width - 16) / 3;

  return (
    <svg width={width} height={height} className="flex-shrink-0">
      {bars.map((bar, i) => {
        const x = 4 + i * (barWidth + 2);
        const barH = Math.max(bar.height, bar.count > 0 ? 3 : 0);
        const y = height - 8 - barH;
        return (
          <React.Fragment key={i}>
            <motion.rect
              x={x}
              width={barWidth - 2}
              fill={bar.color}
              rx={1.5}
              initial={{ y: height - 8, height: 0 }}
              animate={animated ? { y, height: barH } : { y: height - 8, height: 0 }}
              transition={{ duration: 0.6, delay: 0.2 + i * 0.1, ease: 'easeOut' }}
              opacity={0.85}
            />
            <text
              x={x + (barWidth - 2) / 2}
              y={height - 1}
              textAnchor="middle"
              className="fill-claude-text-muted"
              style={{ fontSize: '7px', fontFamily: 'monospace' }}
            >
              {bar.label}
            </text>
          </React.Fragment>
        );
      })}
    </svg>
  );
}

// ─── Cryo-EM Trend Indicator ──────────────────────────────────────────────────

function CryoEmTrendIndicator({ currentPct, previousPct }: {
  currentPct: number;
  previousPct: number | null;
}) {
  if (previousPct === null) return null;

  const delta = currentPct - previousPct;
  const isUp = delta > 0;
  const isDown = delta < 0;
  const isNeutral = Math.abs(delta) < 0.1;

  return (
    <motion.div
      className="flex items-center gap-1 px-1.5 py-0.5 rounded-md"
      style={{
        backgroundColor: isUp ? 'rgba(16, 163, 74, 0.1)' : isDown ? 'rgba(220, 38, 38, 0.1)' : 'rgba(107, 114, 128, 0.1)',
      }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.5 }}
    >
      {isUp && <TrendingUp className="h-3 w-3 text-green-500" />}
      {isDown && <TrendingDown className="h-3 w-3 text-red-400" />}
      {isNeutral && <span className="h-3 w-3 flex items-center justify-center text-[8px] text-claude-text-muted">\u2014</span>}
      <span className={`text-[10px] font-mono font-semibold ${
        isUp ? 'text-green-600 dark:text-green-400' : isDown ? 'text-red-500 dark:text-red-400' : 'text-claude-text-muted'
      }`}>
        {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
      </span>
    </motion.div>
  );
}

// ─── IF Distribution Horizontal Bar (using unified DistributionBar) ───────────

function IfDistributionBar({ entries, width = 90, height = 6 }: {
  entries: PdbEntry[];
  width?: number;
  height?: number;
}) {
  const segments: DistributionSegment[] = useMemo(() => {
    const top = entries.filter(e => (e.journalIf ?? 0) >= 20).length;
    const high = entries.filter(e => (e.journalIf ?? 0) >= 10 && (e.journalIf ?? 0) < 20).length;
    const mid = entries.filter(e => (e.journalIf ?? 0) >= 5 && (e.journalIf ?? 0) < 10).length;
    const low = entries.filter(e => (e.journalIf ?? 0) > 0 && (e.journalIf ?? 0) < 5).length;
    return [
      { label: 'Top', count: top, color: '#dc2626' },
      { label: 'High', count: high, color: '#ea580c' },
      { label: 'Mid', count: mid, color: '#16a34a' },
      { label: 'Low', count: low, color: '#6b7280' },
    ];
  }, [entries]);

  return <DistributionBar segments={segments} width={width} height={height} />;
}

// ─── Circular Progress SVG ────────────────────────────────────────────────────

function CircularProgress({ value, max, color, size = 34 }: { value: number; max: number; color: string; size?: number }) {
  const radius = (size - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);
  const offset = circumference * (1 - progress);

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="currentColor"
        strokeWidth={2.5}
        className="text-claude-border dark:text-[#3d3832]"
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
      />
    </svg>
  );
}

// ─── WeeklyStatCards Component ────────────────────────────────────────────────

interface WeeklyStatCardsProps {
  snapshot: WeeklySnapshot | null;
  entries: PdbEntry[];
  loading: boolean;
  snapshots?: WeeklySnapshot[];
}

export function WeeklyStatCards({ snapshot, entries, loading, snapshots = [] }: WeeklyStatCardsProps) {
  // Compute stats from entries
  const totalStructures = snapshot?.totalStructures ?? entries.length;

  // Average resolution
  const resolutions = entries.filter(e => e.resolution != null).map(e => e.resolution!);
  const avgResolution = resolutions.length > 0
    ? resolutions.reduce((a, b) => a + b, 0) / resolutions.length
    : 0;

  // Cryo-EM percentage
  const cryoemCount = snapshot?.cryoemCount ?? entries.filter(e => e.isCryoem).length;
  const cryoemPct = totalStructures > 0 ? (cryoemCount / totalStructures) * 100 : 0;

  // Previous week Cryo-EM % for trend indicator
  const prevCryoemPct = useMemo(() => {
    if (!snapshot || snapshots.length < 2) return null;
    const currentIdx = snapshots.findIndex(s => s.weekId === snapshot.weekId);
    if (currentIdx < 0 || currentIdx >= snapshots.length - 1) return null;
    const prev = snapshots[currentIdx + 1];
    if (!prev || prev.totalStructures === 0) return null;
    return (prev.cryoemCount / prev.totalStructures) * 100;
  }, [snapshot, snapshots]);

  // Top IF journal
  const ifEntries = entries.filter(e => e.journalIf != null && e.journal);
  const topIfEntry = ifEntries.length > 0
    ? ifEntries.reduce((a, b) => (a.journalIf ?? 0) > (b.journalIf ?? 0) ? a : b)
    : null;

  // Sparkline data from snapshots (total counts for recent weeks)
  const sparklineData = useMemo(() => {
    if (snapshots.length >= 2) {
      // Take last 4 snapshots (reversed since they're usually desc order)
      const recent = [...snapshots].reverse().slice(-4);
      return recent.map(s => s.totalStructures);
    }
    return [5, 8, 12, totalStructures];
  }, [snapshots, totalStructures]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-2 sm:p-3 card-shimmer [grid-auto-rows:1fr] min-w-0">
      {/* Total Structures */}
      <StatCard
        title="Total Structures"
        value={totalStructures}
        icon={<Database className="h-4 w-4 text-white" />}
        color="bg-gradient-to-br from-[#2d8f8f] to-[#1a6b6b]"
        glowColor="#2d8f8f"
        subtitle={snapshot?.weekId || ''}
        loading={loading}
        delay={0}
        borderColor="#2d8f8f"
      >
        <BezierSparkline data={sparklineData} color="#2d8f8f" width={100} height={36} />
      </StatCard>

      {/* Avg Resolution */}
      <StatCard
        title="Avg Resolution"
        value={avgResolution}
        suffix="Å"
        decimals={2}
        icon={<Aperture className="h-4 w-4 text-white" />}
        color={
          avgResolution <= 2.0 ? 'bg-gradient-to-br from-green-500 to-green-700' :
          avgResolution <= 3.5 ? 'bg-gradient-to-br from-amber-500 to-amber-700' :
          'bg-gradient-to-br from-red-500 to-red-700'
        }
        glowColor={
          avgResolution <= 2.0 ? '#16a34a' :
          avgResolution <= 3.5 ? '#c9872e' : '#dc2626'
        }
        subtitle={resolutions.length > 0 ? `from ${resolutions.length} entries` : ''}
        loading={loading}
        delay={80}
        borderColor={
          avgResolution <= 2.0 ? '#16a34a' :
          avgResolution <= 3.5 ? '#c9872e' : '#dc2626'
        }
      >
        <MiniResBarChart entries={entries} width={90} height={34} />
      </StatCard>

      {/* Cryo-EM % */}
      <StatCard
        title="Cryo-EM Share"
        value={cryoemPct}
        suffix="%"
        decimals={1}
        icon={<Cpu className="h-4 w-4 text-white" />}
        color="bg-gradient-to-br from-[#7c5cbf] to-[#5a3d99]"
        glowColor="#7c5cbf"
        subtitle={`${cryoemCount} of ${totalStructures}`}
        loading={loading}
        delay={160}
        borderColor="#7c5cbf"
      >
        <div className="flex items-center gap-1.5">
          <CircularProgress value={cryoemPct} max={100} color="#7c5cbf" size={34} />
          <CryoEmTrendIndicator currentPct={cryoemPct} previousPct={prevCryoemPct} />
        </div>
      </StatCard>

      {/* Top IF */}
      <StatCard
        title="Top Impact Factor"
        value={topIfEntry?.journalIf ?? 0}
        decimals={1}
        icon={<Trophy className="h-4 w-4 text-white" />}
        color="bg-gradient-to-br from-[#c9872e] to-[#a06b1a]"
        glowColor="#c9872e"
        subtitle={topIfEntry?.journal || 'No IF data'}
        loading={loading}
        delay={240}
        borderColor="#c9872e"
      >
        <IfDistributionBar entries={entries} width={90} height={6} />
      </StatCard>
    </div>
  );
}
