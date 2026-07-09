'use client';

import React, { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Sparkles,
  Loader2,
  RotateCcw,
  AlertCircle,
  ChevronDown,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Lazy-load markdown renderer to reduce bundle size
const LazyMarkdown = dynamic(
  () => import('@/components/lazy-markdown').then((m) => ({ default: m.LazyMarkdown })),
  { ssr: false, loading: () => <div className="animate-pulse h-20 bg-claude-border-light dark:bg-claude-border/30 rounded" /> }
);

// ─── Types ─────────────────────────────────────────────────────────────────

interface AiWeeklySummaryPanelProps {
  weekId: string | null;
  entries: any[];
}

// ─── Local Storage Helper ─────────────────────────────────────────────────

function getCachedSummary(weekId: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`ai-weekly-summary-${weekId}`);
    return raw || null;
  } catch {
    return null;
  }
}

function setCachedSummary(weekId: string, summary: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`ai-weekly-summary-${weekId}`, summary);
  } catch {
    // Silently ignore storage errors
  }
}

// ─── Loading Skeleton ──────────────────────────────────────────────────────

function SummarySkeleton() {
  return (
    <div className="space-y-3 animate-pulse p-4">
      <div className="h-4 bg-claude-border-light dark:bg-claude-border/40 rounded w-2/5" />
      <div className="space-y-2">
        <div className="h-2.5 bg-claude-border-light/60 dark:bg-claude-border/25 rounded w-full" />
        <div className="h-2.5 bg-claude-border-light/60 dark:bg-claude-border/25 rounded w-11/12" />
        <div className="h-2.5 bg-claude-border-light/60 dark:bg-claude-border/25 rounded w-4/5" />
      </div>
      <div className="h-4 bg-claude-border-light dark:bg-claude-border/40 rounded w-1/3 mt-4" />
      <div className="space-y-2">
        <div className="h-2.5 bg-claude-border-light/60 dark:bg-claude-border/25 rounded w-full" />
        <div className="h-2.5 bg-claude-border-light/60 dark:bg-claude-border/25 rounded w-5/6" />
      </div>
      <div className="h-4 bg-claude-border-light dark:bg-claude-border/40 rounded w-1/3 mt-4" />
      <div className="space-y-2">
        <div className="h-2.5 bg-claude-border-light/60 dark:bg-claude-border/25 rounded w-full" />
        <div className="h-2.5 bg-claude-border-light/60 dark:bg-claude-border/25 rounded w-10/12" />
        <div className="h-2.5 bg-claude-border-light/60 dark:bg-claude-border/25 rounded w-3/4" />
      </div>
    </div>
  );
}

// ─── Animated Dots ─────────────────────────────────────────────────────────

function AnimatedDots() {
  return (
    <span className="inline-flex gap-0.5 ml-1">
      <span className="animate-bounce" style={{ animationDelay: '0ms', animationDuration: '0.8s' }}>.</span>
      <span className="animate-bounce" style={{ animationDelay: '150ms', animationDuration: '0.8s' }}>.</span>
      <span className="animate-bounce" style={{ animationDelay: '300ms', animationDuration: '0.8s' }}>.</span>
    </span>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export function AiWeeklySummaryPanel({ weekId, entries }: AiWeeklySummaryPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Restore cached summary when weekId changes
  useEffect(() => {
    if (weekId) {
      const cached = getCachedSummary(weekId);
      if (cached) {
        setSummary(cached);
        setExpanded(true);
      } else {
        setSummary(null);
        setExpanded(false);
      }
    } else {
      setSummary(null);
      setExpanded(false);
    }
    setError(null);
    setLoading(false);
  }, [weekId]);

  const generateSummary = useCallback(async () => {
    if (!weekId || entries.length === 0) return;

    setLoading(true);
    setError(null);
    setExpanded(true);

    try {
      const response = await fetch('/api/ai-weekly-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekId, entries }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed with status ${response.status}`);
      }

      const data = await response.json();
      const newSummary = data.summary || 'No summary generated.';
      setSummary(newSummary);
      setCachedSummary(weekId, newSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate summary');
    } finally {
      setLoading(false);
    }
  }, [weekId, entries]);

  const handleCopy = useCallback(() => {
    if (!summary) return;
    navigator.clipboard.writeText(summary).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [summary]);

  // Don't render if no week selected or no entries
  if (!weekId || entries.length === 0) return null;

  return (
    <div className="mx-2 sm:mx-4 mb-2">
      {/* Collapsed trigger button */}
      {!expanded && !loading && !summary && (
        <Button
          variant="outline"
          size="sm"
          onClick={generateSummary}
          className="w-full sm:w-auto gap-2 bg-gradient-to-r from-claude-accent/5 to-purple-500/5 hover:from-claude-accent/10 hover:to-purple-500/10 border-claude-accent/20 dark:border-claude-accent/30 text-claude-accent dark:text-claude-accent transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <Sparkles className="h-3.5 w-3.5" />
          AI Weekly Summary
        </Button>
      )}

      {/* Expanded panel */}
      {(expanded || loading || summary) && (
        <div className="rounded-lg border border-claude-border dark:border-[#3d3832] bg-claude-surface dark:bg-[#242220] overflow-hidden transition-all duration-300">
          {/* Panel header */}
          <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-claude-border dark:border-[#3d3832] bg-claude-surface/50 dark:bg-[#242220]/50">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br from-claude-accent/20 to-purple-500/20 flex-shrink-0">
                <Sparkles className="h-3 w-3 text-claude-accent" />
              </div>
              <span className="text-[11px] sm:text-xs font-semibold text-claude-text dark:text-[#e8e4dd] truncate">
                AI Weekly Summary
              </span>
              {weekId && (
                <span className="text-[9px] sm:text-[10px] text-claude-text-muted font-mono hidden sm:inline">
                  {weekId}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {/* Copy button */}
              {summary && !loading && (
                <button
                  onClick={handleCopy}
                  className="p-1 rounded-md hover:bg-claude-border-light dark:hover:bg-claude-border/40 transition-colors"
                  title="Copy summary"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3 text-claude-text-muted" />
                  )}
                </button>
              )}
              {/* Regenerate button */}
              {summary && !loading && (
                <button
                  onClick={generateSummary}
                  className="p-1 rounded-md hover:bg-claude-border-light dark:hover:bg-claude-border/40 transition-colors"
                  title="Regenerate summary"
                >
                  <RotateCcw className="h-3 w-3 text-claude-text-muted" />
                </button>
              )}
              {/* Collapse button */}
              {!loading && (
                <button
                  onClick={() => {
                    setExpanded(false);
                  }}
                  className="p-1 rounded-md hover:bg-claude-border-light dark:hover:bg-claude-border/40 transition-colors"
                  title="Collapse"
                >
                  <ChevronDown className="h-3 w-3 text-claude-text-muted rotate-180" />
                </button>
              )}
            </div>
          </div>

          {/* Panel content */}
          <div className="relative">
            {/* Loading state */}
            {loading && (
              <div>
                <div className="flex items-center gap-2 px-4 py-3 text-[11px] text-claude-accent">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>
                    Generating AI summary for week {weekId}
                    <AnimatedDots />
                  </span>
                </div>
                <SummarySkeleton />
              </div>
            )}

            {/* Error state */}
            {error && !loading && (
              <div className="p-3 sm:p-4">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-red-700 dark:text-red-400">Generation Failed</p>
                    <p className="text-[10px] text-red-600/70 dark:text-red-400/60 mt-0.5">{error}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateSummary}
                  className="mt-2 gap-1.5 text-[11px] h-7"
                >
                  <RotateCcw className="h-3 w-3" />
                  Retry
                </Button>
              </div>
            )}

            {/* Summary content */}
            {summary && !loading && !error && (
              <div className="px-3 sm:px-4 py-3 max-h-96 overflow-y-auto custom-scrollbar">
                <div className="text-[11px] sm:text-xs leading-relaxed text-claude-text-secondary dark:text-[#c8c3bc] [&_h1]:text-sm [&_h1]:font-bold [&_h1]:text-claude-text [&_h1]:dark:text-[#e8e4dd] [&_h1]:mt-3 [&_h1]:mb-1.5 [&_h2]:text-[12px] [&_h2]:font-bold [&_h2]:text-claude-text [&_h2]:dark:text-[#e8e4dd] [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h3]:text-[11px] [&_h3]:font-semibold [&_h3]:text-claude-text-secondary [&_h3]:mt-2 [&_h3]:mb-1 [&_p]:mb-2 [&_ul]:mb-2 [&_ul]:ml-4 [&_ul]:list-disc [&_ol]:mb-2 [&_ol]:ml-4 [&_ol]:list-decimal [&_li]:mb-0.5 [&_strong]:text-claude-text [&_strong]:dark:text-[#e8e4dd] [&_strong]:font-semibold">
                  <LazyMarkdown>{summary}</LazyMarkdown>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
