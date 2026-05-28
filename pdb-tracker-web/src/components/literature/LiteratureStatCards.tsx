'use client';

import React, { useState, useEffect, useMemo, useId } from 'react';
import { motion } from 'framer-motion';
import { FileText, BarChart3, Bookmark, Clock, BookOpen } from 'lucide-react';
import { TiltCard, AnimatedNumber } from '@/components/ui/pdb-animated';
import type { LitStats } from '@/lib/pdb-types';
import { formatRelativeTime } from '@/lib/pdb-utils';

interface ReadingProgressInfo {
  totalPapers: number;
  unreadCount: number;
  readingCount: number;
  readCount: number;
  progressPercentage: number;
}

interface LiteratureStatCardsProps {
  stats: LitStats | null;
  isLoading: boolean;
  readingProgress?: ReadingProgressInfo;
}

// ─── Unified Stat Card (matches Weekly style) ─────────────────────────────────

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
  isText?: boolean;
  textValue?: string;
}

function StatCard({
  title, value, suffix = '', decimals = 0, icon, color, glowColor,
  subtitle, loading, delay = 0, children, borderColor = '#2d8f8f',
  isText = false, textValue,
}: StatCardProps) {
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
          <div className="hidden sm:flex items-center justify-center h-[38px] min-w-0">
            {children ?? <div className="h-[38px]" />}
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-bold text-claude-text tabular-nums">
          {loading ? (
            <div className="w-14 sm:w-16 h-6 sm:h-7 rounded shimmer-skeleton" />
          ) : isText ? (
            <div className="text-xl sm:text-2xl font-bold text-claude-text truncate max-w-full" title={textValue}>
              {textValue}
            </div>
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

// ─── IF Distribution Bar (matches Weekly style) ────────────────────────────────

function IfDistributionBar({ ifDistribution, totalPapers, width = 100, height = 8 }: {
  ifDistribution: { tier: string; count: number }[];
  totalPapers: number;
  width?: number;
  height?: number;
}) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const segments = useMemo(() => {
    const sorted = [...ifDistribution].sort((a, b) => {
      const order: Record<string, number> = { top: 0, high: 1, mid: 2, low: 3 };
      return (order[a.tier] ?? 4) - (order[b.tier] ?? 4);
    });
    return sorted.map(d => ({
      ...d,
      pct: totalPapers > 0 ? d.count / totalPapers : 0,
      color: d.tier === 'top' ? '#dc2626' : d.tier === 'high' ? '#ea580c' : d.tier === 'mid' ? '#16a34a' : '#6b7280',
    }));
  }, [ifDistribution, totalPapers]);

  const cumulativeX = segments.reduce<number[]>((acc, seg, i) => {
    const prev = i === 0 ? 0 : acc[i - 1] + segments[i - 1].pct * width;
    acc.push(prev);
    return acc;
  }, []);
  return (
    <div className="flex flex-col gap-1">
      <svg width={width} height={height} className="flex-shrink-0">
        {segments.map((seg, i) => {
          const segWidth = seg.pct * width;
          const startX = cumulativeX[i];
          return (
            <motion.rect
              key={i}
              x={startX}
              y={0}
              width={segWidth}
              height={height}
              rx={i === 0 || i === segments.length - 1 ? height / 2 : 0}
              fill={seg.color}
              opacity={0.8}
              initial={{ width: 0 }}
              animate={animated ? { width: segWidth } : { width: 0 }}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.08, ease: 'easeOut' }}
            />
          );
        })}
      </svg>
      <div className="flex items-center gap-2 mt-0.5">
        {segments.filter(s => s.count > 0).map((seg, i) => (
          <div key={i} className="flex items-center gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-[8px] text-claude-text-muted font-mono">{seg.tier} {seg.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Method Distribution Mini Bar ──────────────────────────────────────────────

function MethodMiniBar({ methodDistribution, width = 60, height = 8 }: {
  methodDistribution: { method: string; count: number }[];
  width?: number;
  height?: number;
}) {
  const total = methodDistribution.reduce((sum, d) => sum + d.count, 0) || 1;
  const methodColors: Record<string, string> = {
    'Cryo-EM': '#2d8f8f',
    'X-ray': '#7c5cbf',
    'NMR': '#c9872e',
    'Other': '#6b7280',
  };

  const cumulativeX = methodDistribution.reduce<number[]>((acc, d, i) => {
    const prev = i === 0 ? 0 : acc[i - 1] + (methodDistribution[i - 1].count / total) * width;
    acc.push(prev);
    return acc;
  }, []);
  return (
    <div className="flex flex-col gap-1">
      <svg width={width} height={height} className="flex-shrink-0">
        <rect x={0} y={0} width={width} height={height} rx={height / 2} className="fill-claude-border dark:fill-[#3d3832]" opacity={0.4} />
        {methodDistribution.map((d, i) => {
          const segWidth = (d.count / total) * width;
          const startX = cumulativeX[i];
          return (
            <rect
              key={i}
              x={startX}
              y={0}
              width={segWidth}
              height={height}
              fill={methodColors[d.method] || '#6b7280'}
              opacity={0.85}
              rx={i === 0 ? height / 4 : i === methodDistribution.length - 1 ? height / 4 : 0}
            />
          );
        })}
      </svg>
      <div className="flex items-center gap-1.5 mt-0.5">
        {methodDistribution.map((d, i) => (
          <div key={i} className="flex items-center gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: methodColors[d.method] || '#6b7280' } } />
            <span className="text-[8px] text-claude-text-muted font-mono">{d.method}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Circular Progress SVG (matches Weekly style) ──────────────────────────────

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

// ─── Clock Pulse SVG (for Latest Update card) ─────────────────────────────────

function ClockPulse({ color }: { color: string }) {
  return (
    <svg width={34} height={34} viewBox="0 0 34 34">
      <circle cx={17} cy={17} r={13} fill="none" stroke={color} strokeWidth={2.5} opacity={0.3} />
      <circle cx={17} cy={17} r={13} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round"
        strokeDasharray={81.68} strokeDashoffset={20}
        style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
      />
      <line x1={17} y1={17} x2={17} y2={10} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <line x1={17} y1={17} x2={22} y2={17} stroke={color} strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <div className="gradient-border-wrap h-full" style={{ '--gradient-border-color': '#9b9590' } as React.CSSProperties}>
      <div className="gradient-border-inner bg-claude-surface dark:bg-[#242220] p-3 sm:p-4 claude-card-shadow transition-transform duration-200 min-w-0 h-full flex flex-col">
        <div className="flex items-start justify-between mb-1.5 sm:mb-2">
          <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-md shimmer-skeleton" />
          <div className="hidden sm:block h-[38px] w-[90px] rounded shimmer-skeleton" />
        </div>
        <div className="h-6 sm:h-7 w-14 sm:w-16 rounded shimmer-skeleton mb-1" />
        <div className="h-2.5 sm:h-3 w-16 sm:w-20 rounded shimmer-skeleton" />
        <div className="h-2 sm:h-2.5 w-20 sm:w-24 rounded shimmer-skeleton mt-1" />
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function LiteratureStatCards({ stats, isLoading, readingProgress }: LiteratureStatCardsProps) {
  if (isLoading || !stats) {
    return (
      <div className={`grid grid-cols-2 ${readingProgress ? 'sm:grid-cols-3 lg:grid-cols-5' : 'sm:grid-cols-4'} gap-2 sm:gap-3 [grid-auto-rows:1fr]`}>
        {Array.from({ length: readingProgress ? 5 : 4 }).map((_, i) => (
          <div key={i} className="min-w-0 h-full">
            <StatCardSkeleton />
          </div>
        ))}
      </div>
    );
  }

  // Format latestDate - handle both string and epoch timestamp formats
  const formatLatestDate = (date: string | number | null): { display: string; relative: string } => {
    if (!date) return { display: '—', relative: 'No data' };
    try {
      let d: Date;
      if (typeof date === 'number') {
        d = new Date(date);
      } else if (typeof date === 'string' && /^\d{10,13}$/.test(date.trim())) {
        d = new Date(parseInt(date.trim()));
      } else {
        d = new Date(date);
      }
      if (isNaN(d.getTime())) return { display: String(date), relative: 'Invalid date' };
      const display = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
      const relative = formatRelativeTime(d.toISOString().slice(0, 10));
      return { display, relative };
    } catch {
      return { display: String(date), relative: 'Invalid date' };
    }
  };

  const latestDateInfo = formatLatestDate(stats.latestDate as any);

  return (
    <div className={`grid grid-cols-2 ${readingProgress ? 'sm:grid-cols-3 lg:grid-cols-5' : 'sm:grid-cols-4'} gap-2 sm:gap-3 [grid-auto-rows:1fr]`}>
      {/* Total Papers */}
      <StatCard
        title="Total Papers"
        value={stats.totalPapers}
        icon={<FileText className="h-4 w-4 text-white" />}
        color="bg-gradient-to-br from-[#2d8f8f] to-[#1a6b6b]"
        glowColor="#2d8f8f"
        subtitle={`${stats.papersWithIf} with IF data`}
        loading={isLoading}
        delay={0}
        borderColor="#2d8f8f"
      >
        <MethodMiniBar methodDistribution={stats.methodDistribution} width={60} height={8} />
      </StatCard>

      {/* Avg Impact Factor */}
      <StatCard
        title="Avg Impact Factor"
        value={stats.avgIf ?? 0}
        decimals={2}
        icon={<BarChart3 className="h-4 w-4 text-white" />}
        color="bg-gradient-to-br from-[#c9872e] to-[#a06b1a]"
        glowColor="#c9872e"
        subtitle={stats.ifDistribution.length > 0
          ? `Top: ${stats.ifDistribution.find(d => d.tier === 'top')?.count ?? 0} papers`
          : 'No IF data'}
        loading={isLoading}
        delay={80}
        borderColor="#c9872e"
      >
        <IfDistributionBar ifDistribution={stats.ifDistribution} totalPapers={stats.totalPapers} width={100} height={8} />
      </StatCard>

      {/* Top Journal */}
      <StatCard
        title="Top Journal"
        value={0}
        icon={<Bookmark className="h-4 w-4 text-white" />}
        color="bg-gradient-to-br from-[#7c5cbf] to-[#5a3d99]"
        glowColor="#7c5cbf"
        subtitle={stats.topJournal ?? 'No data'}
        loading={isLoading}
        delay={160}
        borderColor="#7c5cbf"
        isText
        textValue={stats.topJournal ?? '—'}
      >
        <CircularProgress
          value={stats.topJournal ? 100 : 0}
          max={100}
          color="#7c5cbf"
          size={34}
        />
      </StatCard>

      {/* Latest Update */}
      <StatCard
        title="Latest Update"
        value={0}
        icon={<Clock className="h-4 w-4 text-white" />}
        color="bg-gradient-to-br from-[#16a34a] to-[#0d7a35]"
        glowColor="#16a34a"
        subtitle={latestDateInfo.relative}
        loading={isLoading}
        delay={240}
        borderColor="#16a34a"
        isText
        textValue={latestDateInfo.display}
      >
        <ClockPulse color="#16a34a" />
      </StatCard>

      {/* 5th card: Reading Progress */}
      {readingProgress && (
        <StatCard
          title="Reading Progress"
          value={readingProgress.progressPercentage}
          suffix="%"
          decimals={0}
          icon={<BookOpen className="h-4 w-4 text-white" />}
          color="bg-gradient-to-br from-[#2d8f8f] to-[#16a34a]"
          glowColor="#2d8f8f"
          subtitle={`${readingProgress.readCount} read · ${readingProgress.readingCount} reading · ${readingProgress.unreadCount} unread`}
          delay={320}
          borderColor="#2d8f8f"
        >
          <CircularProgress
            value={readingProgress.progressPercentage}
            max={100}
            color="#2d8f8f"
            size={34}
          />
        </StatCard>
      )}
    </div>
  );
}
