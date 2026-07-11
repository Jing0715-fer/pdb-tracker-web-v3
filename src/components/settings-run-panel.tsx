'use client';

/**
 * SettingsRunPanel — optimized "Skills & Manual Run" popup.
 *
 * This is a faithful functional port of the pdb-tracker-web-v3 component but
 * with a substantially upgraded UI:
 *
 *   • Tabbed navigation across the three skill modules (instead of one long scroll)
 *   • Gradient-accented module cards with clear visual hierarchy
 *   • Animated SSE progress feed with color-coded levels, progress bar, auto-scroll
 *   • Polished LLM provider selector with status pills + scan animation
 *   • Collapsible LLM advanced config, full dark mode, responsive layout
 *   • Framer Motion micro-interactions for state transitions
 *
 * The three modules mirror the original backend contracts:
 *   ① POST /api/literature/daily/run  — Structure-Biology Daily Literature Report
 *   ② POST /api/evaluations/run       — Target Evaluation + LLM Report (atomic)
 *   ③ POST /api/pdb-weekly/run        — Manual PDB Weekly Report (SSE, 1–3 cycles)
 *
 * LLM config (provider / apiKey / baseUrl / model / system) is shared across
 * ① / ② and flows into ③ via the same `llm` body field.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useRunStream, type StreamEvent } from '@/lib/use-run-stream';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LazyMarkdown } from '@/components/lazy-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  FlaskConical,
  Sparkles,
  Settings2,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  CalendarClock,
  ChevronDown,
  Activity,
  Cpu,
  Database,
  FileText,
  Zap,
  ShieldCheck,
  Terminal,
  Lock,
  Layers,
  Search,
  Copy,
  Check,
  AlertTriangle,
  FileDown,
  Download,
  Clock,
} from 'lucide-react';

/* ──────────────────────────────────────────────────────────────────────── */
/*  Types                                                                    */
/* ──────────────────────────────────────────────────────────────────────── */

interface LlmInfo {
  env: {
    provider?: string;
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  };
  chosen: string;
  available: Array<{ provider: string; bin?: string; reason: string; label?: string }>;
  totalClisScanned: number;
}

interface LlmUserConfig {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  system: string;
}

interface RunLog {
  ts: string;
  module: 'literature' | 'eval' | 'weekly';
  status: 'running' | 'success' | 'error';
  summary: string;
  details?: string;
  durationMs?: number;
}

const DEFAULT_LLM_CFG: LlmUserConfig = {
  provider: '',
  apiKey: '',
  baseUrl: '',
  model: '',
  system: '',
};

const STORAGE_KEY = 'pdb-tracker:llm-cfg:v2';
const STORAGE_PROVIDER_KEY = 'pdb-tracker:llm-provider:v2';
const AUTO_PROVIDER = '__auto__';

/* ──────────────────────────────────────────────────────────────────────── */
/*  localStorage helpers                                                     */
/* ──────────────────────────────────────────────────────────────────────── */

function loadStoredProvider(): string {
  if (typeof window === 'undefined') return AUTO_PROVIDER;
  try { return localStorage.getItem(STORAGE_PROVIDER_KEY) || AUTO_PROVIDER; } catch { return AUTO_PROVIDER; }
}
function loadStoredCfg(): LlmUserConfig {
  if (typeof window === 'undefined') return DEFAULT_LLM_CFG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LLM_CFG;
    return { ...DEFAULT_LLM_CFG, ...JSON.parse(raw) };
  } catch { return DEFAULT_LLM_CFG; }
}
function persistProvider(p: string) { try { localStorage.setItem(STORAGE_PROVIDER_KEY, p); } catch { /* ignore */ } }
function persistCfg(c: LlmUserConfig) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); } catch { /* ignore */ } }

/* ──────────────────────────────────────────────────────────────────────── */
/*  Small presentational helpers                                             */
/* ──────────────────────────────────────────────────────────────────────── */

function levelColor(level?: string) {
  switch (level) {
    case 'error': return 'text-rose-500';
    case 'warn': return 'text-amber-500';
    case 'success': return 'text-emerald-500';
    default: return 'text-sky-500';
  }
}

function StatusPill({ running, done, ok }: { running: boolean; done: boolean; ok: boolean }) {
  if (running) {
    return (
      <Badge variant="outline" className="bg-sky-500/10 text-sky-600 dark:text-sky-300 border-sky-500/30 gap-1">
        <Loader2 className="h-3 w-3 animate-spin" /> streaming
      </Badge>
    );
  }
  if (done) {
    return ok ? (
      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30 gap-1">
        <CheckCircle2 className="h-3 w-3" /> done
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/30 gap-1">
        <XCircle className="h-3 w-3" /> failed
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-muted/40 text-muted-foreground border-border gap-1">
      <Activity className="h-3 w-3" /> idle
    </Badge>
  );
}

/** Animated SSE event feed used by all three modules. */
function StreamFeed({
  events,
  running,
  done,
  ok,
  emptyHint,
}: {
  events: StreamEvent[];
  running: boolean;
  done: boolean;
  ok: boolean;
  emptyHint: string;
}) {
  const lastProgress = events.filter(e => typeof e.progress === 'number').slice(-1)[0]?.progress ?? null;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const startTime = events[0]?.ts;
  const [elapsed, setElapsed] = useState(0);

  // live elapsed timer while running
  useEffect(() => {
    if (!running || !startTime) return;
    const tick = () => setElapsed(Date.now() - new Date(startTime).getTime());
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [running, startTime]);

  // auto-scroll to bottom when new events arrive (unless user paused)
  useEffect(() => {
    if (running && autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events.length, running, autoScroll]);

  if (events.length === 0) {
    return (
      <div className="mt-3 rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 py-4 text-center">
        <Terminal className="mx-auto h-4 w-4 text-muted-foreground/60" />
        <p className="mt-1.5 text-[11px] text-muted-foreground">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-border/60 bg-muted/20 overflow-hidden">
      {/* header */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-border/60 bg-muted/40">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">实时进度</span>
          <span className="text-[10px] text-muted-foreground/70">({events.length} events)</span>
          {running && startTime && (
            <span className="text-[10px] font-mono text-sky-600 dark:text-sky-300 tabular-nums flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />{(elapsed / 1000).toFixed(1)}s
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setAutoScroll(a => !a)}
            className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${autoScroll ? 'border-sky-500/40 text-sky-600 dark:text-sky-300 bg-sky-500/10' : 'border-border/60 text-muted-foreground hover:text-foreground'}`}
            title={autoScroll ? '自动滚动中，点击暂停' : '已暂停，点击恢复'}
          >
            {autoScroll ? '⤓ auto' : '⏸ paused'}
          </button>
          <StatusPill running={running} done={done} ok={ok} />
        </div>
      </div>

      {/* progress bar with percentage label */}
      {typeof lastProgress === 'number' && (
        <div className="px-3 pt-2.5 pb-1.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-mono text-muted-foreground tabular-nums">
              {lastProgress < 100 ? 'processing' : 'complete'} · {lastProgress}%
            </span>
            {done && (
              <span className={`text-[10px] font-mono font-semibold tabular-nums ${ok ? 'text-emerald-500' : 'text-rose-500'}`}>
                {ok ? '✓' : '✗'} {(elapsed / 1000).toFixed(1)}s
              </span>
            )}
          </div>
          <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              className={`absolute inset-y-0 left-0 rounded-full ${
                done ? (ok ? 'bg-emerald-500' : 'bg-rose-500') : 'bg-gradient-to-r from-sky-500 to-sky-400'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${lastProgress}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            >
              {running && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_1.5s_infinite]" />
              )}
            </motion.div>
          </div>
        </div>
      )}

      {/* stage timeline strip — collapses repeated stages into milestones */}
      <StageTimeline events={events} />

      {/* log lines */}
      <div ref={scrollRef} className="max-h-44 overflow-y-auto px-3 py-2 space-y-1">
        {events.map((e, i) => {
          const txt = (e.detail || e.message || e.stage || '').toString().trim();
          if (!txt) return null;
          return (
            <div key={i} className="text-[10px] font-mono flex gap-2 leading-relaxed">
              <span className="text-muted-foreground/60 shrink-0 tabular-nums">
                {new Date(e.ts).toLocaleTimeString('en-GB', { hour12: false })}
              </span>
              <span className={`shrink-0 font-semibold ${levelColor(e.level)}`}>
                {e.stage || e.level || 'info'}
              </span>
              <span className="flex-1 text-foreground/80 truncate" title={txt}>{txt}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * StageTimeline — a horizontal strip of milestone "chips" derived from the SSE
 * event stream. Collapses repeated stages (e.g. multiple `llm-digest` events)
 * into a single chip, colour-coding by the latest level seen for that stage.
 */
function StageTimeline({ events }: { events: StreamEvent[] }) {
  // Build an ordered list of unique stages with their latest level + progress.
  const stageMap = new Map<string, { level?: string; progress?: number; count: number }>();
  const order: string[] = [];
  for (const e of events) {
    const stage = e.stage || e.level || 'info';
    if (!stageMap.has(stage)) {
      stageMap.set(stage, { level: e.level, progress: e.progress, count: 1 });
      order.push(stage);
    } else {
      const cur = stageMap.get(stage)!;
      cur.level = e.level || cur.level;
      cur.progress = e.progress ?? cur.progress;
      cur.count += 1;
    }
  }
  if (order.length === 0) return null;

  return (
    <div className="px-3 pb-2 pt-1 border-b border-border/40">
      <div className="flex items-center gap-1 overflow-x-auto pb-1 thin-scroll">
        {order.map((stage, i) => {
          const info = stageMap.get(stage)!;
          const isLast = i === order.length - 1;
          const dotColor = info.level === 'error' ? 'bg-rose-500' : info.level === 'warn' ? 'bg-amber-500' : info.level === 'success' ? 'bg-emerald-500' : isLast ? 'bg-sky-500' : 'bg-muted-foreground/40';
          return (
            <div key={stage} className="flex items-center shrink-0">
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-background/60 border border-border/40">
                <span className={`h-1.5 w-1.5 rounded-full ${dotColor} ${isLast && !info.level ? 'animate-pulse' : ''}`} />
                <span className="text-[9px] font-mono text-muted-foreground whitespace-nowrap">{stage}</span>
                {info.count > 1 && <span className="text-[8px] text-muted-foreground/50">×{info.count}</span>}
              </div>
              {!isLast && <span className="text-muted-foreground/30 mx-0.5">→</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * LLMPreview — collapsible inline preview of real LLM-generated content
 * (module ② report / module ① digest). Renders Markdown, shows fallback
 * warning when the LLM SDK failed, and lets the user copy the raw text.
 */
function LLMPreview({
  content,
  title,
  provider,
  model,
  durationMs,
  fallback,
  error,
  ok,
  dbSaved,
  chars,
  accent = 'emerald',
}: {
  content?: string;
  title: string;
  provider?: string;
  model?: string;
  durationMs?: number;
  fallback?: boolean;
  error?: string;
  ok?: boolean;
  dbSaved?: boolean;
  chars?: number;
  accent?: 'emerald' | 'sky';
}) {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  // Failure case: no content but we have an error — show a failure card.
  const isFailure = ok === false || (fallback && !content);

  const accentMap = {
    emerald: { ring: 'border-emerald-500/30', bg: 'from-emerald-500/5', icon: 'text-emerald-500', badge: 'border-emerald-500/30 text-emerald-600 dark:text-emerald-300 bg-emerald-500/10' },
    sky: { ring: 'border-sky-500/30', bg: 'from-sky-500/5', icon: 'text-sky-500', badge: 'border-sky-500/30 text-sky-600 dark:text-sky-300 bg-sky-500/10' },
  };
  const a = accentMap[accent];
  // Override styling for failure state.
  const ringCls = isFailure ? 'border-rose-500/40' : a.ring;
  const bgCls = isFailure ? 'from-rose-500/5' : a.bg;
  const iconCls = isFailure ? 'text-rose-500' : a.icon;

  const copy = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mt-3 rounded-lg border ${ringCls} bg-gradient-to-br ${bgCls} via-transparent to-transparent overflow-hidden`}
    >
      {/* header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border/40 bg-background/40">
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-2 min-w-0 flex-1"
        >
          {isFailure ? (
            <XCircle className={`h-3.5 w-3.5 ${iconCls} shrink-0`} />
          ) : (
            <FileText className={`h-3.5 w-3.5 ${iconCls} shrink-0`} />
          )}
          <span className="text-xs font-semibold truncate">{title}</span>
          {/* LLM status badge — clearly shows real success vs failure */}
          {ok === true && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-emerald-500/40 text-emerald-600 dark:text-emerald-300 bg-emerald-500/10 gap-0.5 shrink-0">
              <CheckCircle2 className="h-2.5 w-2.5" /> LLM 真实生成
            </Badge>
          )}
          {isFailure && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-rose-500/40 text-rose-600 dark:text-rose-300 bg-rose-500/10 gap-0.5 shrink-0">
              <XCircle className="h-2.5 w-2.5" /> LLM 调用失败
            </Badge>
          )}
          {/* DB persistence badge */}
          {dbSaved === true && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-sky-500/40 text-sky-600 dark:text-sky-300 bg-sky-500/10 gap-0.5 shrink-0">
              <Database className="h-2.5 w-2.5" /> 已入库
            </Badge>
          )}
          {dbSaved === false && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-rose-500/40 text-rose-600 dark:text-rose-300 bg-rose-500/10 gap-0.5 shrink-0">
              <Database className="h-2.5 w-2.5" /> 入库失败
            </Badge>
          )}
          {!isFailure && (
            <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 ${a.badge} gap-0.5 shrink-0`}>
              <Sparkles className="h-2.5 w-2.5" /> {provider}/{model}
            </Badge>
          )}
          {chars != null && <span className="text-[9px] text-muted-foreground/60 font-mono shrink-0">{chars} chars</span>}
          {durationMs != null && <span className="text-[9px] text-muted-foreground/60 font-mono shrink-0 hidden sm:inline">{(durationMs / 1000).toFixed(1)}s</span>}
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={copy} title="复制原文">
            {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setExpanded(e => !e)}>
            <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </Button>
        </div>
      </div>
      {/* body */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {isFailure ? (
              // Failure body — show the error message clearly, no fake content.
              <div className="px-3 py-3 bg-rose-500/5">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-rose-600 dark:text-rose-300 mb-1">LLM 调用失败</div>
                    <div className="text-[11px] text-muted-foreground font-mono break-all">
                      {error || '未知错误'}
                    </div>
                    <div className="text-[10px] text-muted-foreground/70 mt-2">
                      本次运行未生成报告文本（已跳过 fallback，不伪造内容）。请检查 z-ai SDK 配置 / 网络 / 配额后重试。
                    </div>
                  </div>
                </div>
              </div>
            ) : content ? (
              <div className="px-3 py-2 max-h-72 overflow-y-auto thin-scroll text-xs leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                <LazyMarkdown>{content}</LazyMarkdown>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Main component                                                           */
/* ──────────────────────────────────────────────────────────────────────── */

/**
 * CycleTimeline — module ③专属的可视化时间轴。把对抗式生成器的
 * Generator → Critic-Scientific → Synthesis 三阶段渲染成带状态点的横向轨道，
 * 当前运行阶段带 pulse 动画，已完成阶段显示 ✓ + 耗时。
 */
function CycleTimeline({
  events,
  maxCycles,
  running,
  result,
}: {
  events: StreamEvent[];
  maxCycles: 1 | 2 | 3;
  running: boolean;
  result?: any;
}) {
  const roles = [
    { key: 'generator', label: 'Generator', desc: '初版周报生成', color: 'sky' },
    { key: 'critic-scientific', label: 'Critic-Sci', desc: '科学性评审', color: 'amber' },
    { key: 'synthesis', label: 'Synthesis', desc: '综合终稿', color: 'emerald' },
  ].slice(0, maxCycles);

  // Derive per-role status from the event stream + result payload.
  const roleStatus = roles.map((r) => {
    const roleEvents = events.filter(e => (e.stage || '').includes(r.key));
    const started = roleEvents.length > 0;
    const cycleResult = result?.cycles?.find((c: any) => c.role === r.key);
    const completed = roleEvents.some(e => e.level === 'success') || !!cycleResult;
    const verdict = cycleResult?.verdict;
    const durationMs = cycleResult?.durationMs;
    const contentChars = cycleResult?.contentChars;
    const reportType = cycleResult?.reportType;
    return { ...r, started, completed, verdict, durationMs, contentChars, reportType, eventCount: roleEvents.length };
  });

  const hasAnyActivity = roleStatus.some(r => r.started);
  if (!hasAnyActivity && !running) return null;

  return (
    <div className="mt-3 rounded-lg border border-border/60 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent p-3">
      <div className="flex items-center gap-2 mb-2.5">
        <Layers className="h-3 w-3 text-amber-500" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Cycle Orchestration</span>
        <span className="text-[10px] text-muted-foreground/60">· {maxCycles}-step pipeline</span>
      </div>

      {/* horizontal track */}
      <div className="flex items-stretch gap-1">
        {roleStatus.map((r, i) => {
          const isLast = i === roleStatus.length - 1;
          const colorMap: Record<string, { dot: string; ring: string; bg: string; text: string }> = {
            sky: { dot: 'bg-sky-500', ring: 'border-sky-500/40', bg: 'bg-sky-500/5', text: 'text-sky-600 dark:text-sky-300' },
            amber: { dot: 'bg-amber-500', ring: 'border-amber-500/40', bg: 'bg-amber-500/5', text: 'text-amber-600 dark:text-amber-300' },
            emerald: { dot: 'bg-emerald-500', ring: 'border-emerald-500/40', bg: 'bg-emerald-500/5', text: 'text-emerald-600 dark:text-emerald-300' },
          };
          const c = colorMap[r.color];
          return (
            <div key={r.key} className="flex items-stretch flex-1 min-w-0">
              <div className={`flex-1 rounded-lg border ${r.completed ? c.ring : 'border-border/60'} ${r.completed ? c.bg : 'bg-background/40'} p-2 transition-all`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="relative flex h-2 w-2 shrink-0">
                    {r.started && !r.completed && (
                      <span className={`absolute inline-flex h-full w-full rounded-full ${c.dot} opacity-60`} style={{ animation: 'pulse-ring 1.5s ease-out infinite' }} />
                    )}
                    <span className={`relative inline-flex h-2 w-2 rounded-full ${r.completed ? c.dot : r.started ? c.dot : 'bg-muted-foreground/30'}`} />
                  </span>
                  <span className="text-[10px] font-semibold truncate">{r.label}</span>
                  {r.completed && <CheckCircle2 className={`h-3 w-3 ${c.text} shrink-0`} />}
                  {r.verdict && (
                    <Badge variant="outline" className={`text-[8px] px-1 py-0 h-3.5 ${r.verdict === 'pass' ? 'border-emerald-500/30 text-emerald-600' : 'border-amber-500/30 text-amber-600'}`}>
                      {r.verdict}
                    </Badge>
                  )}
                </div>
                <div className="text-[9px] text-muted-foreground truncate">{r.desc}</div>
                <div className="text-[9px] font-mono text-muted-foreground/60 mt-0.5 flex items-center gap-1.5 flex-wrap">
                  {r.completed ? (
                    <>
                      <span className="flex items-center gap-0.5"><Clock className="h-2 w-2" />{((r.durationMs || 0) / 1000).toFixed(1)}s</span>
                      {r.contentChars != null && <span className="flex items-center gap-0.5"><FileText className="h-2 w-2" />{r.contentChars > 1000 ? `${(r.contentChars / 1000).toFixed(1)}k` : r.contentChars}</span>}
                      <span>· {r.eventCount}ev</span>
                    </>
                  ) : r.started ? (
                    <span className="flex items-center gap-0.5"><Loader2 className="h-2 w-2 animate-spin" />running…</span>
                  ) : 'pending'}
                </div>
              </div>
              {!isLast && (
                <div className="flex items-center px-0.5 shrink-0">
                  <ChevronDown className="h-3 w-3 text-muted-foreground/40 -rotate-90" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SettingsRunPanel() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('literature');
  const [llmInfo, setLlmInfo] = useState<LlmInfo | null>(null);
  const [chosenProvider, setChosenProvider] = useState<string>(() => loadStoredProvider());
  const [llmCfg, setLlmCfg] = useState<LlmUserConfig>(() => loadStoredCfg());
  const [showLlmCfg, setShowLlmCfg] = useState(false);
  const [logs, setLogs] = useState<RunLog[]>([]);
  const [logFilter, setLogFilter] = useState<'all' | 'literature' | 'eval' | 'weekly'>('all');
  const [logSearch, setLogSearch] = useState('');
  /** Modules currently running — supports parallel execution. */
  const [running, setRunning] = useState<Set<string>>(new Set());
  const isRunning = (m: string) => running.has(m);
  const markRunning = (m: string) => setRunning(s => new Set(s).add(m));
  const markDone = (m: string) => setRunning(s => { const n = new Set(s); n.delete(m); return n; });
  const [scanning, setScanning] = useState(false);

  // ① Daily literature params
  const [litDate, setLitDate] = useState(new Date().toISOString().slice(0, 10));
  const [litWindowDays, setLitWindowDays] = useState(3);
  const [litMaxPathA, setLitMaxPathA] = useState(300);
  const [litMaxPathB, setLitMaxPathB] = useState(50);
  const [litMaxPapers, setLitMaxPapers] = useState(20);
  const [litSkipWikiFiles, setLitSkipWikiFiles] = useState(false);
  const [litExistingReports, setLitExistingReports] = useState<Array<{ date: string; paperCount: number; hasLLMDigest: boolean }>>([]);

  // ② Eval params
  const [evalUniprot, setEvalUniprot] = useState('P00533');
  const [evalForceBlast, setEvalForceBlast] = useState(false);
  const [evalSkipBlast, setEvalSkipBlast] = useState(true);
  const [evalMaxPdb, setEvalMaxPdb] = useState(80);
  const [evalGenerateReport, setEvalGenerateReport] = useState(true);
  const [evalSaveReportFile, setEvalSaveReportFile] = useState(true);

  // ③ Weekly report state
  const [weeklyWindow, setWeeklyWindow] = useState<{ weekId: string; reportDate: string; startDate: string; endDate: string } | null>(null);
  const [weeklyDbCounts, setWeeklyDbCounts] = useState<{ pdbStructure: number; weeklySnapshot: number; weeklyReport: number } | null>(null);
  const [weeklyCycles, setWeeklyCycles] = useState<1 | 2 | 3>(2);

  const weeklyStream = useRunStream();
  const litStream = useRunStream();
  const evalStream = useRunStream();

  /* ── data fetch on open ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!open) return;
    if (!llmInfo) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setScanning(true);
      fetch('/api/llm/providers')
        .then(r => r.json())
        .then((d: LlmInfo) => {
          setLlmInfo(d);
          setLlmCfg(prev => ({
            ...prev,
            provider: prev.provider || d.chosen || '',
            model: prev.model || d.env.model || '',
            baseUrl: prev.baseUrl || d.env.baseUrl || '',
          }));
        })
        .catch(() => { /* ignore */ })
        .finally(() => setScanning(false));
    }
    if (litExistingReports.length === 0) {
      fetch('/api/literature/daily/list')
        .then(r => r.json())
        .then((d: any) => setLitExistingReports(d.reports || []))
        .catch(() => { /* ignore */ });
    }
    if (!weeklyWindow) {
      fetch('/api/pdb-weekly/run', { method: 'GET' })
        .then(r => r.json())
        .then((d: any) => {
          if (d && d.weekId) {
            setWeeklyWindow({ weekId: d.weekId, reportDate: d.reportDate, startDate: d.startDate, endDate: d.endDate });
          }
          if (d?.dbCounts) setWeeklyDbCounts(d.dbCounts);
        })
        .catch(() => { /* ignore */ });
    }
     
  }, [open]);

  /* ── provider picker ────────────────────────────────────────────────── */
  const pickProvider = (providerId: string) => {
    setChosenProvider(providerId);
    persistProvider(providerId);
    if (providerId === AUTO_PROVIDER) {
      setLlmCfg(prev => ({ ...prev, provider: '' }));
    } else {
      setLlmCfg(prev => ({ ...prev, provider: providerId }));
    }
  };

  const effectiveProviderId = chosenProvider === AUTO_PROVIDER ? (llmInfo?.chosen || '') : chosenProvider;

  const rescan = () => {
    setScanning(true);
    fetch('/api/llm/providers')
      .then(r => r.json())
      .then((d: LlmInfo) => setLlmInfo(d))
      .catch(() => { /* ignore */ })
      .finally(() => setScanning(false));
  };

  const llmBody = useCallback(() => {
    const out: any = {};
    if (chosenProvider && chosenProvider !== AUTO_PROVIDER) {
      out.provider = chosenProvider;
    } else if (llmCfg.provider) {
      out.provider = llmCfg.provider;
    }
    if (llmCfg.apiKey) out.apiKey = llmCfg.apiKey;
    if (llmCfg.baseUrl) out.baseUrl = llmCfg.baseUrl;
    if (llmCfg.model) out.model = llmCfg.model;
    if (llmCfg.system) out.system = llmCfg.system;
    return Object.keys(out).length > 0 ? out : undefined;
  }, [chosenProvider, llmCfg]);

  useEffect(() => { persistCfg(llmCfg); }, [llmCfg]);

  const log = (entry: RunLog) => setLogs(l => [entry, ...l].slice(0, 50));

  /** Export the current (filtered) logs as a Markdown file download. */
  const exportLogs = (format: 'md' | 'json') => {
    const filtered = logs
      .filter(l => logFilter === 'all' || l.module === logFilter)
      .filter(l => !logSearch || l.summary.toLowerCase().includes(logSearch.toLowerCase()) || (l.details || '').toLowerCase().includes(logSearch.toLowerCase()));
    if (filtered.length === 0) return;
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    let content: string;
    let mime: string;
    let ext: string;
    if (format === 'json') {
      content = JSON.stringify(filtered, null, 2);
      mime = 'application/json';
      ext = 'json';
    } else {
      content = [
        `# 运行中心执行日志`,
        ``,
        `导出时间：${new Date().toISOString()}`,
        `过滤：${logFilter} · 搜索："${logSearch}" · ${filtered.length} 条`,
        ``,
        `---`,
        ``,
        ...filtered.map((l, i) => [
          `## ${i + 1}. [${l.module}] ${l.status} · ${l.ts}`,
          ``,
          `**摘要**：${l.summary}`,
          l.durationMs != null ? `` : ``,
          ...(l.details ? [``, `### 详情`, ``, '```', l.details, '```'] : []),
          ``,
        ].filter(Boolean).join('\n')),
      ].join('\n');
      mime = 'text/markdown';
      ext = 'md';
    }
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `runcenter-logs-${ts}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── run triggers ───────────────────────────────────────────────────── */
  const runLiterature = () => {
    markRunning('lit');
    litStream.reset();
    log({ ts: new Date().toISOString(), module: 'literature', status: 'running', summary: `每日结构生物学文献 ${litDate} (±${litWindowDays}d) — SSE streaming…` });
    litStream.start('/api/literature/daily/run', {
      date: litDate,
      windowDays: litWindowDays,
      maxPathA: litMaxPathA,
      maxPathB: litMaxPathB,
      maxPapers: litMaxPapers,
      skipWikiFiles: litSkipWikiFiles,
      llm: llmBody(),
    });
  };

  const runEvaluation = () => {
    const uid = evalUniprot.trim().toUpperCase();
    markRunning('eval');
    evalStream.reset();
    log({ ts: new Date().toISOString(), module: 'eval', status: 'running', summary: `评估 ${uid} — SSE streaming…` });
    evalStream.start('/api/evaluations/run', {
      uniprot: uid,
      forceBlast: evalForceBlast,
      skipBlast: evalSkipBlast,
      maxPdb: evalMaxPdb,
      generateReport: evalGenerateReport,
      saveReportFile: evalSaveReportFile,
      llm: llmBody(),
    });
  };

  const runWeekly = (maxCycles: 1 | 2 | 3) => {
    markRunning('weekly');
    weeklyStream.reset();
    log({ ts: new Date().toISOString(), module: 'weekly', status: 'running', summary: `触发本周 PDB 周报 (${weeklyWindow?.weekId || '?'}) • ${maxCycles}-cycle • SSE stream active… (预计 5–15 min)` });
    weeklyStream.start('/api/pdb-weekly/run', { maxCycles, llm: llmBody() });
  };

  /* ── completion hooks ───────────────────────────────────────────────── */
  useEffect(() => {
    if (!litStream.state.done) return;
    const s = litStream.state;
    if (s.ok && s.result) {
      const d = s.result;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      log({
        ts: new Date().toISOString(),
        module: 'literature',
        status: 'success',
        summary: `${d.date}: 候选 ${d.totalCandidates} (Path A=${d.pathACount}, Path B=${d.pathBCount}) → 最终入选 ${d.finalCount} 篇 [${Object.entries(d.methodStats || {}).map(([m, c]: [string, any]) => `${m}:${c}`).join(', ')}]`,
        details: d.files?.dailyIndex ? `📁 ${d.files.dailyIndex}\n${d.digest ? `摘要:\n${d.digest.slice(0, 1500)}${d.digest.length > 1500 ? '…' : ''}` : ''}` : '无文件系统输出 (skipWikiFiles)',
        durationMs: d.durationMs,
      });
      fetch('/api/literature/daily/list')
        .then(r => r.json())
        .then((d: any) => setLitExistingReports(d.reports || []))
        .catch(() => { /* ignore */ });
    } else if (s.error) {
      log({ ts: new Date().toISOString(), module: 'literature', status: 'error', summary: s.error });
    }
    markDone('lit');
     
  }, [litStream.state.done]);

  useEffect(() => {
    if (!evalStream.state.done) return;
    const s = evalStream.state;
    if (s.ok && s.result) {
      const d = s.result;
      const uid = d.uniprot || '';
      const repInfo = d.report
        ? (d.report.ok
            ? ` + 报告 ${d.report.savedToFile ? `已落盘 ${d.report.filename}` : '已生成'} (${d.report.provider}/${d.report.model}, ${Math.round((d.report.durationMs || 0) / 100) / 10}s)`
            : ` ⚠️ 报告生成失败: ${d.report.error}`)
        : ' (跳过报告)';
      // eslint-disable-next-line react-hooks/set-state-in-effect
      log({
        ts: new Date().toISOString(),
        module: 'eval',
        status: d.report && !d.report.ok && evalGenerateReport ? 'error' : 'success',
        summary: `${d.uniprotInfo?.proteinName || uid}: direct=${d.directPdbCount}, blast=${d.blastHitCount}, cov=${d.coverage}%, overall=${d.scores.overall?.score}/10${repInfo}`,
        details: `Scores: X-ray ${d.scores.xray?.score}, Cryo-EM ${d.scores.cryoem?.score}, NMR ${d.scores.nmr?.score}${d.skippedBblast ? ' (BLAST skipped)' : ''}`,
        durationMs: d.durationMs,
      });
    } else if (s.error) {
      log({ ts: new Date().toISOString(), module: 'eval', status: 'error', summary: s.error });
    }
    markDone('eval');
     
  }, [evalStream.state.done]);

  const weeklyLogThrottle = useRef(0);
  useEffect(() => {
    const s = weeklyStream.state;
    if (s.log.length > 0) {
      const latest = s.log[s.log.length - 1];
      const summary = (latest.detail || latest.message || latest.stage || '').toString();
      if (summary && Date.now() - weeklyLogThrottle.current > 800) {
        weeklyLogThrottle.current = Date.now();
        // eslint-disable-next-line react-hooks/set-state-in-effect
        log({ ts: new Date().toISOString(), module: 'weekly', status: 'running', summary });
      }
    }
     
  }, [weeklyStream.state.log.length]);

  useEffect(() => {
    if (!weeklyStream.state.done) return;
    const s = weeklyStream.state;
    if (s.ok && s.result) {
      const r = s.result;
      const cycles = r.cycles || [];
      const providers = [...new Set(cycles.map((c: any) => c.provider).filter(Boolean))].join(', ');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      log({
        ts: new Date().toISOString(),
        module: 'weekly',
        status: 'success',
        summary: `完成 ${r.window?.weekId} (${(r.reports || []).join('+')}) • ${cycles.length} cycles • ${providers} • ${(r.durationMs / 1000).toFixed(0)}s`,
        details: [
          `DB 行数: PdbStructure=${r.dbCounts?.pdbStructure}, WeeklyReport=${r.dbCounts?.weeklyReport}, with_authors=${r.dbCounts?.withAuthors}/${r.dbCounts?.pdbStructure}, with_pubmedId=${r.dbCounts?.withPubmedId}/${r.dbCounts?.pdbStructure}, PubMedArticle.matched=${r.dbCounts?.pubmedArticleMatched}`,
          `Files:`,
          ...(r.filesWritten || []).map((f: string) => `  • ${f}`),
          `Cycles:`,
          ...cycles.map((c: any) => `  • C${c.cycle}${c.role === 'critic-scientific' ? ' (critic-sci)' : c.role === 'synthesis' ? ' (synthesis)' : ''} ${c.reportType} via ${c.provider}/${c.model} → ${((c.durationMs || 0) / 1000).toFixed(1)}s, ${c.contentChars || 0} chars${c.verdict ? `, verdict=${c.verdict}` : ''}`),
        ].join('\n'),
        durationMs: r.durationMs,
      });
      fetch('/api/pdb-weekly/run', { method: 'GET' })
        .then(r => r.json())
        .then((d: any) => { if (d?.dbCounts) setWeeklyDbCounts(d.dbCounts); })
        .catch(() => { /* ignore */ });
    } else if (s.error) {
      log({ ts: new Date().toISOString(), module: 'weekly', status: 'error', summary: s.error });
    }
    markDone('weekly');
     
  }, [weeklyStream.state.done]);

  /* ──────────────────────────────────────────────────────────────────── */
  /*  Render                                                               */
  /* ──────────────────────────────────────────────────────────────────── */

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs font-medium border-border/60 hover:border-primary/40 hover:bg-accent/50 transition-all relative"
        >
          <Settings2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">运行中心</span>
          {running.size > 0 && (
            <span className="absolute -top-1 -right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-sky-500 text-white text-[8px] font-bold px-1">
              {running.size}
            </span>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-6xl sm:!max-w-6xl w-[95vw] max-h-[92vh] p-0 gap-0 overflow-hidden">
        {/* ── Header band ─────────────────────────────────────────────── */}
        <div className="relative px-6 pt-6 pb-4 border-b border-border/60 bg-gradient-to-br from-muted/40 via-background to-background">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none" />
          <DialogHeader className="relative">
            <DialogTitle className="flex items-center gap-2.5 text-lg">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20">
                <Sparkles className="h-4.5 w-4.5 text-primary" />
              </div>
              <span>运行中心</span>
              <Badge variant="outline" className="ml-1 text-[10px] font-normal text-muted-foreground border-border/60">
                <Layers className="h-2.5 w-2.5 mr-1" /> 3 modules
              </Badge>
              {running.size > 0 && (
                <Badge variant="outline" className="ml-1 text-[10px] font-normal bg-sky-500/10 text-sky-600 dark:text-sky-300 border-sky-500/30 gap-1">
                  <Loader2 className="h-2.5 w-2.5 animate-spin" /> {running.size} running
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed pt-1">
              结构生物学智能任务中心 — 每日文献检索、蛋白靶点评估、PDB 周报生成三个模块。
              支持并行触发，SSE 实时推送进度与日志，运行中可切换其他模块操作。自动检测 LLM CLI（hermes / claude / codex）或通过 Anthropic / OpenAI / z-ai SDK 调用。
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* ── LLM provider status bar ─────────────────────────────────── */}
        <div className="px-6 py-3 border-b border-border/60 bg-muted/20">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <Cpu className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-[11px] text-muted-foreground shrink-0">LLM 提供方</span>
              <code className="px-1.5 py-0.5 rounded bg-background border border-border/60 font-mono text-[11px] text-foreground">
                {effectiveProviderId || (scanning ? '扫描中…' : '未检测')}
              </code>
              {llmInfo?.available && llmInfo.available.length > 0 && (
                <span className="text-[10px] text-muted-foreground/70 hidden sm:inline">
                  {chosenProvider === AUTO_PROVIDER
                    ? `auto · ${llmInfo.available.length} 可用 / 扫描 ${llmInfo.totalClisScanned} CLI`
                    : `已锁定 · ${llmInfo.available.length} 可用`}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={rescan} disabled={scanning}>
                      <RefreshCw className={`h-3.5 w-3.5 ${scanning ? 'animate-spin' : ''}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">重新扫描 CLI / SDK</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1" onClick={() => setShowLlmCfg(s => !s)}>
                <ChevronDown className={`h-3 w-3 transition-transform ${showLlmCfg ? 'rotate-180' : ''}`} />
                {showLlmCfg ? '收起配置' : 'LLM 配置'}
              </Button>
            </div>
          </div>

          {/* provider pills */}
          {llmInfo?.available && llmInfo.available.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => pickProvider(AUTO_PROVIDER)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border transition-all ${
                  chosenProvider === AUTO_PROVIDER
                    ? 'border-primary/50 bg-primary/10 text-foreground font-medium shadow-sm'
                    : 'border-border/60 text-muted-foreground hover:text-foreground hover:border-border'
                }`}
                title="让服务器按 CLI → SDK → z-ai 顺序自动选择"
              >
                <Sparkles className="h-2.5 w-2.5" />
                <span>auto</span>
              </button>
              {llmInfo.available.map((a, i) => {
                const isPinned = chosenProvider === a.provider;
                const isEffective = effectiveProviderId === a.provider;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => pickProvider(a.provider)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border transition-all ${
                      isPinned
                        ? 'border-primary/50 bg-primary/10 text-foreground font-medium shadow-sm'
                        : isEffective
                        ? 'border-emerald-500/40 text-foreground'
                        : 'border-border/60 text-muted-foreground hover:text-foreground hover:border-border'
                    }`}
                    title={a.reason}
                  >
                    <span className="font-mono">{a.provider}</span>
                    {a.bin && <span className="opacity-50">→ {a.bin.replace(/^.*\//, '~/')}</span>}
                    {isPinned && <Lock className="h-2.5 w-2.5 opacity-70" />}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-1.5 text-[10px] text-muted-foreground/60">
            {chosenProvider === AUTO_PROVIDER
              ? 'auto 模式：服务器按 CLI → SDK → z-ai 顺序自动选，锁定的 provider 显示 🔒'
              : `已锁定到 ${chosenProvider}。点 auto 或其他 provider 切换。`}
          </div>

          {/* advanced LLM config (collapsible) */}
          <AnimatePresence>
            {showLlmCfg && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-3 pt-3 border-t border-border/40 grid grid-cols-2 gap-2.5">
                  <div className="col-span-2">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Provider</Label>
                    <Input
                      placeholder="anthropic | openai | zai | cli:hermes | cli:claude | cli:codex | (空=auto)"
                      value={llmCfg.provider}
                      onChange={e => setLlmCfg({ ...llmCfg, provider: e.target.value })}
                      className="h-8 text-xs mt-1 font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">API Key</Label>
                    <Input
                      type="password"
                      placeholder="sk-…"
                      value={llmCfg.apiKey}
                      onChange={e => setLlmCfg({ ...llmCfg, apiKey: e.target.value })}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Base URL</Label>
                    <Input
                      placeholder="https://api.openai.com/v1"
                      value={llmCfg.baseUrl}
                      onChange={e => setLlmCfg({ ...llmCfg, baseUrl: e.target.value })}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Model</Label>
                    <Input
                      placeholder="claude-sonnet-4-20250514 / gpt-4o-mini"
                      value={llmCfg.model}
                      onChange={e => setLlmCfg({ ...llmCfg, model: e.target.value })}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">System</Label>
                    <Input
                      placeholder="(可选) 系统提示"
                      value={llmCfg.system}
                      onChange={e => setLlmCfg({ ...llmCfg, system: e.target.value })}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Tabbed module panels ─────────────────────────────────────── */}
        <div className="px-6 py-4 max-h-[calc(92vh-280px)] overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-3">
            <TabsList className="grid w-full grid-cols-3 h-9 bg-muted/40">
              <TabsTrigger value="literature" className="text-xs gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">① 文献</span>
                <span className="sm:hidden">①</span>
                {isRunning('lit') && <Loader2 className="h-3 w-3 animate-spin text-sky-500" />}
              </TabsTrigger>
              <TabsTrigger value="evaluation" className="text-xs gap-1.5">
                <FlaskConical className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">② 评估</span>
                <span className="sm:hidden">②</span>
                {isRunning('eval') && <Loader2 className="h-3 w-3 animate-spin text-sky-500" />}
              </TabsTrigger>
              <TabsTrigger value="weekly" className="text-xs gap-1.5">
                <CalendarClock className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">③ 周报</span>
                <span className="sm:hidden">③</span>
                {isRunning('weekly') && <Loader2 className="h-3 w-3 animate-spin text-sky-500" />}
              </TabsTrigger>
            </TabsList>

            {/* ═══ Module ① Daily Literature ═══════════════════════════ */}
            <TabsContent value="literature" className="mt-3">
              <ModuleCard
                icon={<BookOpen className="h-4 w-4" />}
                accent="sky"
                index="①"
                title="每日结构生物学文献获取"
                endpoint="POST /api/literature/daily/run"
                description="双路径 PubMed 检索（Path A: MeSH+方法关键词 / Path B: 高 IF 期刊+方法关键词）→ ±N 天窗口 → 方法筛选（Cryo-EM / X-ray / NMR / AlphaFold）→ 去重排序 → 每篇 LLM 中文研究概要 → 可选执行摘要 → 写入 PubMedArticle + daily-reports 索引。"
              >
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
                  <Field label="日期">
                    <Input type="date" value={litDate} onChange={e => setLitDate(e.target.value)} className="h-8 text-xs" />
                  </Field>
                  <Field label="±窗口天数">
                    <Input type="number" min={0} max={7} value={litWindowDays} onChange={e => setLitWindowDays(parseInt(e.target.value || '3'))} className="h-8 text-xs" />
                  </Field>
                  <Field label="Path A 上限">
                    <Input type="number" min={10} max={1000} value={litMaxPathA} onChange={e => setLitMaxPathA(parseInt(e.target.value || '300'))} className="h-8 text-xs" />
                  </Field>
                  <Field label="Path B 上限">
                    <Input type="number" min={5} max={200} value={litMaxPathB} onChange={e => setLitMaxPathB(parseInt(e.target.value || '50'))} className="h-8 text-xs" />
                  </Field>
                  <Field label="最终入选上限">
                    <Input type="number" min={1} max={100} value={litMaxPapers} onChange={e => setLitMaxPapers(parseInt(e.target.value || '20'))} className="h-8 text-xs" />
                  </Field>
                </div>

                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <Switch checked={litSkipWikiFiles} onCheckedChange={setLitSkipWikiFiles} className="scale-90" />
                    仅 DB（不写 LLM-Wiki 文件）
                  </label>
                  <RunButton
                    running={isRunning('lit')}
                    
                    onClick={runLiterature}
                  />
                </div>

                <StreamFeed
                  events={litStream.state.log}
                  running={litStream.state.running}
                  done={litStream.state.done}
                  ok={litStream.state.ok}
                  emptyHint="点击「执行」启动 PubMed 双路径检索 + LLM 摘要流水线"
                />

                {/* LLM digest inline preview (module ①) — shows real LLM output or failure */}
                {litStream.state.done && litStream.state.result && (
                  <LLMPreview
                    content={litStream.state.result.digest}
                    title={`LLM 每日精选摘要 · ${litStream.state.result.date}`}
                    provider={litStream.state.result.provider}
                    model={litStream.state.result.llmModel || litStream.state.result.model}
                    durationMs={litStream.state.result.llmDurationMs}
                    fallback={litStream.state.result.llmFallback}
                    error={litStream.state.result.llmError}
                    ok={litStream.state.result.llmOk}
                    dbSaved={litStream.state.result.dbSaved}
                    chars={litStream.state.result.digest?.length || 0}
                    accent="sky"
                  />
                )}

                {litExistingReports.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/40">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                      <FileText className="h-3 w-3" /> 历史报告 ({litExistingReports.length} 天)
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                      {litExistingReports.slice(0, 30).map(r => (
                        <button
                          key={r.date}
                          type="button"
                          onClick={() => setLitDate(r.date)}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border border-border/60 hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
                          title={`${r.date} — ${r.paperCount} 篇${r.hasLLMDigest ? ' (有 LLM 摘要)' : ''}`}
                        >
                          <span className="font-mono">{r.date.slice(5)}</span>
                          <span className="opacity-60">{r.paperCount || '?'}</span>
                          {r.hasLLMDigest && <Sparkles className="h-2.5 w-2.5 text-purple-400" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </ModuleCard>
            </TabsContent>

            {/* ═══ Module ② Target Evaluation ═══════════════════════════ */}
            <TabsContent value="evaluation" className="mt-3">
              <ModuleCard
                icon={<FlaskConical className="h-4 w-4" />}
                accent="emerald"
                index="②"
                title="蛋白靶点评估 + LLM 可行性报告"
                endpoint="POST /api/evaluations/run"
                description="UniProt → 元数据 + 序列 → RCSB 直接 PDB → SIFTS 覆盖率 → NCBI BLASTp 同源 → 评分 → 原子任务包含 LLM 报告生成（写入 Evaluation.report + EvaluationReport 表 + 可选 LLM-Wiki）。"
              >
                <div className="flex items-end gap-2 mb-3 flex-wrap">
                  <div className="flex-1 min-w-[140px]">
                    <Field label="UniProt ID">
                      <Input value={evalUniprot} onChange={e => setEvalUniprot(e.target.value)} placeholder="P00533" className="h-8 text-xs font-mono" />
                    </Field>
                  </div>
                  <div className="w-20">
                    <Field label="maxPdb">
                      <Input type="number" min={1} max={500} value={evalMaxPdb} onChange={e => setEvalMaxPdb(parseInt(e.target.value || '80'))} className="h-8 text-xs" />
                    </Field>
                  </div>
                  <ToggleChip checked={evalForceBlast} onCheckedChange={(v) => { setEvalForceBlast(v); if (v) setEvalSkipBlast(false); }} label="强制 BLAST" disabled={evalSkipBlast} />
                  <ToggleChip checked={evalSkipBlast} onCheckedChange={(v) => { setEvalSkipBlast(v); if (v) setEvalForceBlast(false); }} label="跳过 BLAST" disabled={evalForceBlast} />
                  <RunButton
                    running={isRunning('eval')}
                    
                    onClick={runEvaluation}
                  />
                </div>

                <StreamFeed
                  events={evalStream.state.log}
                  running={evalStream.state.running}
                  done={evalStream.state.done}
                  ok={evalStream.state.ok}
                  emptyHint="输入 UniProt ID 并点击「执行」启动评估流水线"
                />

                {/* LLM report inline preview (module ②) — shows real LLM output or failure */}
                {evalStream.state.done && evalStream.state.result?.report && (
                  <LLMPreview
                    content={evalStream.state.result.report.content}
                    title={`LLM 可行性报告 · ${evalStream.state.result.uniprotInfo?.proteinName || evalStream.state.result.uniprot}`}
                    provider={evalStream.state.result.report.provider}
                    model={evalStream.state.result.report.model}
                    durationMs={evalStream.state.result.report.durationMs}
                    fallback={evalStream.state.result.report.fallback}
                    error={evalStream.state.result.report.error}
                    ok={evalStream.state.result.report.ok}
                    dbSaved={evalStream.state.result.dbSaved}
                    chars={evalStream.state.result.report.contentChars}
                    accent="emerald"
                  />
                )}

                <div className="mt-3 flex items-center gap-3 flex-wrap">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <Switch checked={evalGenerateReport} onCheckedChange={setEvalGenerateReport} className="scale-90" />
                    同时生成 LLM 报告
                  </label>
                  <label className={`flex items-center gap-2 text-xs cursor-pointer ${evalGenerateReport ? 'text-muted-foreground' : 'text-muted-foreground/40 pointer-events-none'}`}>
                    <Switch checked={evalSaveReportFile} onCheckedChange={setEvalSaveReportFile} disabled={!evalGenerateReport} className="scale-90" />
                    写入 LLM-Wiki 文件
                  </label>
                  {evalGenerateReport && (
                    <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground border-border/60 gap-1">
                      <Zap className="h-2.5 w-2.5 text-amber-500" />
                      默认原子任务 (评估 + 报告 ~50s)
                    </Badge>
                  )}
                </div>
              </ModuleCard>
            </TabsContent>

            {/* ═══ Module ③ PDB Weekly ═════════════════════════════════ */}
            <TabsContent value="weekly" className="mt-3">
              <ModuleCard
                icon={<CalendarClock className="h-4 w-4" />}
                accent="amber"
                index="③"
                title="手动触发本周 PDB 周报"
                endpoint="POST /api/pdb-weekly/run"
                description="web-v3 进程内 2-step 对抗式生成器：fetch → backfill → PubMed → Generator → Critic-Scientific → (Synthesis) → 写 DB。复用当前选中的 LLM 提供方。SSE 流式推送进度，页面不会冻结。预计耗时 5–15 分钟。"
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                  <InfoTile label="ISO Week" value={weeklyWindow?.weekId || '…'} icon={<CalendarClock className="h-3 w-3" />} />
                  <InfoTile label="报告日期" value={weeklyWindow?.reportDate || '…'} />
                  <InfoTile label="起始" value={weeklyWindow?.startDate || '…'} />
                  <InfoTile label="结束 (RCSB)" value={weeklyWindow?.endDate || '…'} />
                </div>

                {weeklyDbCounts && (
                  <div className="mb-3 flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground">
                    <Database className="h-3 w-3" />
                    <span>DB 中本周已有：</span>
                    <code className="px-1.5 py-0.5 rounded bg-muted/60 font-mono">PdbStructure {weeklyDbCounts.pdbStructure}</code>
                    <code className="px-1.5 py-0.5 rounded bg-muted/60 font-mono">WeeklyReport {weeklyDbCounts.weeklyReport}</code>
                    <code className="px-1.5 py-0.5 rounded bg-muted/60 font-mono">WeeklySnapshot {weeklyDbCounts.weeklySnapshot}</code>
                  </div>
                )}

                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-muted-foreground mr-1">Cycle:</span>
                    {([1, 2, 3] as const).map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setWeeklyCycles(c)}
                        className={`h-7 px-2 rounded-md text-[11px] border transition-all ${
                          weeklyCycles === c
                            ? 'border-primary/50 bg-primary/10 text-foreground font-medium'
                            : 'border-border/60 text-muted-foreground hover:text-foreground hover:border-border'
                        }`}
                        title={c === 1 ? '~5 min' : c === 2 ? '~10 min' : '~15 min'}
                      >
                        {c}
                        <span className="opacity-50 ml-1 hidden sm:inline">
                          {c === 1 ? '(单步)' : c === 2 ? '(Gen+Critic)' : '(完整)'}
                        </span>
                      </button>
                    ))}
                  </div>

                  <RunButton
                    running={isRunning('weekly')}
                    
                    onClick={() => runWeekly(weeklyCycles)}
                    label={isRunning('weekly') ? '运行中…' : '立即触发'}
                  />

                  {isRunning('weekly') && (
                    <Button
                      onClick={() => weeklyStream.cancel()}
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1"
                      title="取消请求（后端可能在几秒后才真正停止）"
                    >
                      <XCircle className="h-3.5 w-3.5" /> 取消
                    </Button>
                  )}

                  <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1">
                    <Cpu className="h-3 w-3" />
                    LLM → <code className="px-1 py-0.5 rounded bg-muted/60 font-mono">{effectiveProviderId || 'auto'}</code>
                  </span>
                </div>

                {/* Cycle timeline — visualises the Generator → Critic → Synthesis orchestration */}
                <CycleTimeline
                  events={weeklyStream.state.log}
                  maxCycles={weeklyCycles}
                  running={isRunning('weekly')}
                  result={weeklyStream.state.result}
                />

                <StreamFeed
                  events={weeklyStream.state.log}
                  running={weeklyStream.state.running}
                  done={weeklyStream.state.done}
                  ok={weeklyStream.state.ok}
                  emptyHint="选择 cycle 数并点击「立即触发」启动对抗式周报生成器"
                />
              </ModuleCard>
            </TabsContent>
          </Tabs>

          {/* ── Execution log (shared) ─────────────────────────────────── */}
          <AnimatePresence>
            {logs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4"
              >
                <div className="rounded-lg border border-border/60 bg-muted/20 overflow-hidden">
                  {/* header with filter pills + search */}
                  <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border/60 bg-muted/40 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold">执行日志</span>
                      <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground border-border/60">
                        {logFilter === 'all' ? logs.length : logs.filter(l => l.module === logFilter).length}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {/* module filter pills */}
                      <div className="flex items-center gap-0.5 rounded-md bg-background/60 border border-border/40 p-0.5">
                        {([
                          { k: 'all', label: 'All' },
                          { k: 'literature', label: '①' },
                          { k: 'eval', label: '②' },
                          { k: 'weekly', label: '③' },
                        ] as const).map(f => (
                          <button
                            key={f.k}
                            type="button"
                            onClick={() => setLogFilter(f.k)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                              logFilter === f.k ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:text-foreground'
                            }`}
                            title={f.k === 'all' ? '全部' : f.k === 'literature' ? '文献' : f.k === 'eval' ? '评估' : '周报'}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                      {/* search box */}
                      <div className="flex items-center h-6 rounded-md border border-border/40 bg-background/60 px-1.5 gap-1">
                        <Search className="h-2.5 w-2.5 text-muted-foreground/60" />
                        <input
                          type="text"
                          value={logSearch}
                          onChange={e => setLogSearch(e.target.value)}
                          placeholder="搜索…"
                          className="w-16 bg-transparent text-[10px] outline-none placeholder:text-muted-foreground/50"
                        />
                      </div>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => exportLogs('md')} title="导出 Markdown" disabled={logs.length === 0}>
                        <FileDown className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => exportLogs('json')} title="导出 JSON" disabled={logs.length === 0}>
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground px-2" onClick={() => setLogs([])}>
                        清空
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="max-h-56">
                    <div className="px-3 py-2 space-y-2">
                      {logs
                        .filter(l => logFilter === 'all' || l.module === logFilter)
                        .filter(l => !logSearch || l.summary.toLowerCase().includes(logSearch.toLowerCase()) || (l.details || '').toLowerCase().includes(logSearch.toLowerCase()))
                        .map((l, i) => {
                          const moduleBadge = l.module === 'literature'
                            ? { txt: '① 文献', cls: 'border-sky-500/30 text-sky-600 dark:text-sky-300 bg-sky-500/10' }
                            : l.module === 'eval'
                            ? { txt: '② 评估', cls: 'border-emerald-500/30 text-emerald-600 dark:text-emerald-300 bg-emerald-500/10' }
                            : { txt: '③ 周报', cls: 'border-amber-500/30 text-amber-600 dark:text-amber-300 bg-amber-500/10' };
                          return (
                            <div
                              key={i}
                              className="text-xs border-l-2 pl-2.5 py-1"
                              style={{
                                borderColor: l.status === 'success' ? '#22c55e' : l.status === 'error' ? '#ef4444' : '#3b82f6',
                              }}
                            >
                              <div className="flex items-center gap-1.5">
                                {l.status === 'success' && <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />}
                                {l.status === 'error' && <XCircle className="h-3 w-3 text-rose-500 shrink-0" />}
                                {l.status === 'running' && <Loader2 className="h-3 w-3 animate-spin text-sky-500 shrink-0" />}
                                <span className="text-muted-foreground font-mono text-[10px] shrink-0">{l.ts.slice(11, 19)}</span>
                                <Badge variant="outline" className={`text-[8px] px-1 py-0 h-3.5 shrink-0 ${moduleBadge.cls}`}>{moduleBadge.txt}</Badge>
                                <span className="font-medium flex-1 leading-tight">{l.summary}</span>
                                {l.durationMs != null && <span className="text-muted-foreground text-[10px] shrink-0">{Math.round(l.durationMs / 100) / 10}s</span>}
                              </div>
                              {l.details && (
                                <pre className="mt-1 text-[10px] whitespace-pre-wrap text-muted-foreground max-h-32 overflow-y-auto font-mono leading-relaxed">
                                  {l.details}
                                </pre>
                              )}
                            </div>
                          );
                        })}
                      {logs.filter(l => logFilter === 'all' || l.module === logFilter).filter(l => !logSearch || l.summary.toLowerCase().includes(logSearch.toLowerCase()) || (l.details || '').toLowerCase().includes(logSearch.toLowerCase())).length === 0 && (
                        <div className="text-[10px] text-muted-foreground/60 text-center py-3">无匹配日志</div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <div className="px-6 py-3 border-t border-border/60 bg-muted/20 flex items-center justify-between gap-2">
          <a
            href="https://hermes-agent.nousresearch.com/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <ExternalLink className="h-3 w-3" /> Hermes docs
          </a>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
            <ShieldCheck className="h-3 w-3" />
            <span>SSE 实时流式 · 并行执行 · 自动 provider 检测 · z-ai LLM</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Module card wrapper with gradient accent                                 */
/* ──────────────────────────────────────────────────────────────────────── */

const ACCENT_CLASSES: Record<string, { ring: string; chip: string; icon: string; glow: string }> = {
  sky: {
    ring: 'before:from-sky-500/60',
    chip: 'bg-sky-500/10 text-sky-600 dark:text-sky-300 border-sky-500/30',
    icon: 'bg-gradient-to-br from-sky-500/20 to-sky-500/5 text-sky-600 dark:text-sky-300',
    glow: 'from-sky-500/5',
  },
  emerald: {
    ring: 'before:from-emerald-500/60',
    chip: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30',
    icon: 'bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 text-emerald-600 dark:text-emerald-300',
    glow: 'from-emerald-500/5',
  },
  amber: {
    ring: 'before:from-amber-500/60',
    chip: 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30',
    icon: 'bg-gradient-to-br from-amber-500/20 to-amber-500/5 text-amber-600 dark:text-amber-300',
    glow: 'from-amber-500/5',
  },
};

function ModuleCard({
  icon,
  accent,
  index,
  title,
  endpoint,
  description,
  children,
}: {
  icon: React.ReactNode;
  accent: keyof typeof ACCENT_CLASSES;
  index: string;
  title: string;
  endpoint: string;
  description: string;
  children: React.ReactNode;
}) {
  const a = ACCENT_CLASSES[accent];
  return (
    <div className={`relative rounded-xl border border-border/60 bg-card overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-gradient-to-b ${a.ring} before:to-transparent`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${a.glow} via-transparent to-transparent pointer-events-none`} />
      <div className="relative p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/40 ${a.icon}`}>
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold leading-tight">
                <span className="text-muted-foreground/60 mr-1">{index}</span>
                {title}
              </h3>
            </div>
            <code className="text-[10px] text-muted-foreground font-mono">{endpoint}</code>
          </div>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mb-3">{description}</p>
        <Separator className="mb-3 bg-border/40" />
        {children}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Small field/tile/button primitives                                       */
/* ──────────────────────────────────────────────────────────────────────── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function InfoTile({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        {icon}{label}
      </Label>
      <div className="mt-1 h-8 px-2 rounded-md border border-border/60 bg-muted/30 flex items-center font-mono text-xs text-foreground/80 truncate">
        {value}
      </div>
    </div>
  );
}

function RunButton({
  running,
  disabled,
  onClick,
  label = '执行',
}: {
  running: boolean;
  disabled?: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <Button onClick={onClick} disabled={disabled} size="sm" className="h-8 text-xs gap-1.5 min-w-[88px]">
      {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
      {running ? '运行中…' : label}
    </Button>
  );
}

function ToggleChip({
  checked,
  onCheckedChange,
  label,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-center gap-1.5 text-xs text-muted-foreground pb-1.5 ${disabled ? 'opacity-40 pointer-events-none' : 'cursor-pointer'}`}>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} className="scale-90" />
      <span className="font-mono text-[11px]">{label}</span>
    </label>
  );
}
