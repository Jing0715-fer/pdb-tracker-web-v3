'use client';

/**
 * PDB Tracker — Dashboard shell.
 *
 * Reproduces the header + sidebar + main canvas context of the original
 * pdb-tracker-web-v3 application so the "Skills" button sits naturally in the
 * header. The Skills popup (`SettingsRunPanel`) is the optimised module this
 * task is focused on — everything else is a static, faithful-looking shell.
 */

import { useState } from 'react';
import { SettingsRunPanel } from '@/components/settings-run-panel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Activity,
  Atom,
  BookOpen,
  CalendarClock,
  Database,
  Dna,
  FlaskConical,
  Github,
  LayoutDashboard,
  LineChart,
  Menu,
  Search,
  TrendingUp,
  Users,
} from 'lucide-react';

const SIDEBAR_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', active: true },
  { icon: Dna, label: 'PDB Structures' },
  { icon: BookOpen, label: 'Literature' },
  { icon: FlaskConical, label: 'Evaluations' },
  { icon: CalendarClock, label: 'Weekly Reports' },
  { icon: LineChart, label: 'Analytics' },
  { icon: Atom, label: 'Targets' },
];

const STATS = [
  { label: 'PDB Structures', value: '12,847', delta: '+184', icon: Database, accent: 'text-sky-500' },
  { label: 'PubMed Articles', value: '8,392', delta: '+1,204', icon: BookOpen, accent: 'text-emerald-500' },
  { label: 'Evaluations', value: '342', delta: '+12', icon: FlaskConical, accent: 'text-violet-500' },
  { label: 'Weekly Reports', value: '47', delta: '+1', icon: CalendarClock, accent: 'text-amber-500' },
];

const RECENT = [
  { pdb: '8XG7', method: 'Cryo-EM', res: '2.4 Å', title: 'Human GPCR complex in active state', date: '2025-07-09' },
  { pdb: '8XG6', method: 'X-ray', res: '1.8 Å', title: 'Kinase domain with inhibitor', date: '2025-07-09' },
  { pdb: '8XG5', method: 'Cryo-EM', res: '3.1 Å', title: 'Ribosome-Sec61 translocon complex', date: '2025-07-08' },
  { pdb: '8XG4', method: 'NMR', res: '—', title: 'Intrinsically disordered protein region', date: '2025-07-08' },
  { pdb: '8XG3', method: 'X-ray', res: '2.1 Å', title: 'SARS-CoV-2 main protease variant', date: '2025-07-07' },
  { pdb: '8XG2', method: 'Cryo-EM', res: '2.8 Å', title: 'Mitochondrial ATP synthase', date: '2025-07-07' },
];

const methodColor: Record<string, string> = {
  'Cryo-EM': 'bg-sky-500/10 text-sky-600 dark:text-sky-300 border-sky-500/30',
  'X-ray': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30',
  'NMR': 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30',
};

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 lg:hidden"
            onClick={() => setSidebarOpen(s => !s)}
          >
            <Menu className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
              <Dna className="h-4 w-4 text-primary" />
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-semibold leading-tight">PDB Tracker</div>
              <div className="text-[10px] text-muted-foreground leading-tight">Structure Biology Intelligence</div>
            </div>
          </div>

          {/* Search */}
          <div className="hidden md:flex items-center h-8 flex-1 max-w-md ml-4 rounded-lg border border-border/60 bg-muted/40 px-3 gap-2 text-muted-foreground">
            <Search className="h-3.5 w-3.5" />
            <input
              type="text"
              placeholder="Search PDB / UniProt / PubMed…"
              className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"
            />
            <kbd className="text-[9px] font-mono px-1 py-0.5 rounded border border-border/60 bg-background">⌘K</kbd>
          </div>

          <div className="flex-1" />

          {/* Live indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            <span>cron active</span>
          </div>

          <Separator orientation="vertical" className="h-5 hidden sm:block" />

          {/* ── THE SKILLS BUTTON ── */}
          <SettingsRunPanel />

          <a
            href="https://github.com/Jing0715-fer/pdb-tracker-web-v3"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex"
          >
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Github className="h-4 w-4" />
            </Button>
          </a>
        </div>
      </header>

      {/* ── Body: sidebar + main ───────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } fixed lg:static z-40 lg:z-auto top-14 lg:top-0 left-0 h-[calc(100vh-3.5rem)] lg:h-auto w-56 shrink-0 border-r border-border/60 bg-muted/20 transition-transform`}
        >
          <nav className="p-3 space-y-1">
            {SIDEBAR_ITEMS.map((item, i) => (
              <button
                key={i}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-colors ${
                  item.active
                    ? 'bg-primary/10 text-foreground border border-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-transparent'
                }`}
              >
                <item.icon className="h-3.5 w-3.5" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.active && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
              </button>
            ))}
          </nav>
          <Separator className="my-2 bg-border/40" />
          <div className="px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">This Week</div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground flex items-center gap-1.5"><TrendingUp className="h-3 w-3" /> Cryo-EM</span>
                <span className="font-mono text-foreground">67</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground flex items-center gap-1.5"><TrendingUp className="h-3 w-3" /> X-ray</span>
                <span className="font-mono text-foreground">98</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground flex items-center gap-1.5"><TrendingUp className="h-3 w-3" /> NMR</span>
                <span className="font-mono text-foreground">19</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="p-4 sm:p-6 space-y-6">
            {/* Page heading */}
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2">
                  <LayoutDashboard className="h-5 w-5 text-primary" />
                  Dashboard
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                  结构生物学智能追踪 · RCSB PDB + PubMed + UniProt 联邦检索 · 实时 LLM 摘要
                </p>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Activity className="h-3.5 w-3.5" />
                <span>Last sync: just now</span>
                <Badge variant="outline" className="text-[10px] font-normal border-border/60">v3.0</Badge>
              </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {STATS.map((s, i) => (
                <Card key={i} className="overflow-hidden border-border/60">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        {s.label}
                      </CardTitle>
                      <s.icon className={`h-4 w-4 ${s.accent}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold tabular-nums">{s.value}</div>
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-0.5">
                      <TrendingUp className="h-3 w-3" /> {s.delta} this week
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Recent structures table */}
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Dna className="h-4 w-4 text-primary" />
                    Recent PDB Releases
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground border-border/60">
                    <Users className="h-2.5 w-2.5 mr-1" /> 6 of 184
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="max-h-96">
                  <div className="divide-y divide-border/40">
                    {RECENT.map((r, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/30 transition-colors cursor-pointer"
                      >
                        <code className="font-mono text-xs font-semibold text-primary w-16 shrink-0">{r.pdb}</code>
                        <Badge variant="outline" className={`text-[10px] font-normal shrink-0 ${methodColor[r.method]}`}>
                          {r.method}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{r.title}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{r.date}</div>
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono shrink-0 hidden sm:block">{r.res}</div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Tip card */}
            <Card className="border-dashed border-border/60 bg-muted/20">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                  <FlaskConical className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">提示：点击右上角「Skills」按钮手动触发任务</div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Skills 面板复刻了 <code className="px-1 py-0.5 rounded bg-muted/60 font-mono text-[10px]">literature-daily</code> 与{' '}
                    <code className="px-1 py-0.5 rounded bg-muted/60 font-mono text-[10px]">protein-target-evaluator</code> 两个 skill 的后端逻辑，
                    支持手动触发每日文献检索、靶点评估与 PDB 周报生成，全部通过 SSE 流式推送进度。
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-border/60 bg-muted/20">
        <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-3 text-[10px] text-muted-foreground flex-wrap">
          <div className="flex items-center gap-3">
            <span>PDB Tracker v3 · pdb-tracker-web-v3</span>
            <span className="hidden sm:inline opacity-50">·</span>
            <span className="hidden sm:inline">RCSB · PubMed · UniProt · BLAST</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> all systems operational</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
