'use client';

import React, { useMemo } from 'react';
import { FileText, BarChart3, Bookmark, Clock, BookOpen } from 'lucide-react';
import { TiltCard, AnimatedNumber } from '@/components/ui/pdb-animated';
import { DistributionBar, type DistributionSegment } from '@/components/ui/distribution-bar';
import type { LitStats } from '@/lib/pdb-types';
import { formatRelativeTime } from '@/lib/pdb-utils';

export interface ReadingProgressInfo {
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
          <div className="hidden sm:flex items-center justify-end h-[38px] min-w-0 flex-1">
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

// ─── IF Distribution Bar (using unified DistributionBar) ──────────────────────

function IfDistributionBar({ ifDistribution, totalPapers, width = 90, height = 6 }: {
  ifDistribution: { tier: string; count: number }[];
  totalPapers: number;
  width?: number;
  height?: number;
}) {
  const segments: DistributionSegment[] = useMemo(() => {
    const order: Record<string, number> = { top: 0, high: 1, mid: 2, low: 3 };
    const colorMap: Record<string, string> = { top: '#dc2626', high: '#ea580c', mid: '#16a34a', low: '#6b7280' };
    return [...ifDistribution]
      .sort((a, b) => (order[a.tier] ?? 4) - (order[b.tier] ?? 4))
      .map(d => ({
        label: d.tier,
        count: totalPapers > 0 ? d.count : 0,
        color: colorMap[d.tier] ?? '#6b7280',
      }));
  }, [ifDistribution, totalPapers]);

  return <DistributionBar segments={segments} width={width} height={height} />;
}

// ─── Method Distribution Mini Bar (using unified DistributionBar) ────────────

function MethodMiniBar({ methodDistribution, width = 90, height = 6 }: {
  methodDistribution: { method: string; count: number }[];
  width?: number;
  height?: number;
}) {
  const segments: DistributionSegment[] = useMemo(() => {
    const methodOrder: Record<string, number> = { 'Cryo-EM': 0, 'X-ray': 1, 'NMR': 2, 'Other': 3 };
    const colorMap: Record<string, string> = {
      'Cryo-EM': '#2d8f8f',
      'X-ray': '#7c5cbf',
      'NMR': '#c9872e',
      'Other': '#6b7280',
    };
    return [...methodDistribution]
      .sort((a, b) => (methodOrder[a.method] ?? 9) - (methodOrder[b.method] ?? 9))
      .map(d => ({
        label: d.method,
        count: d.count,
        color: colorMap[d.method] ?? '#6b7280',
      }));
  }, [methodDistribution]);

  return <DistributionBar segments={segments} width={width} height={height} hideZeroInLegend={false} />;
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
        <MethodMiniBar methodDistribution={stats.methodDistribution} width={90} height={6} />
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
        <IfDistributionBar ifDistribution={stats.ifDistribution} totalPapers={stats.totalPapers} width={90} height={6} />
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
