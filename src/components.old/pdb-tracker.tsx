'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import {
  Atom, Sun, Moon, Search, BookOpen, FlaskConical, FileText, ScrollText,
  ChevronRight, Database, BarChart3, TrendingUp, X,
  Sparkles, Loader2, ExternalLink, Users, Link2, Copy, Check, Menu,
  Calendar, ArrowRightLeft, LayoutDashboard, Clock, FileDown, Settings,
  Microscope, ArrowUp, RefreshCw, Download, Box, Upload, ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FooterClock, ReportModal } from '@/components/ui/pdb-ui';
import { HeaderParticles } from '@/components/ui/pdb-animated';
import { QualityRing } from '@/components/quality-components';
import type { Mode, PdbEntry, WeeklySnapshot, WeeklyReport, Evaluation, LitPaper, LitReport, LitStats, EvalBatch, EvalBatchSubTarget, EvalRow } from '@/lib/pdb-types';

// ─── Utility: Time Ago ─────────────────────────────────────────────────────

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

import { computeQualityScore, getQualityBorderClass } from '@/lib/pdb-utils';
import { getMethodColor, getMethodLabel, formatDate, formatEvalue, parseLigands } from '@/components/pdb-helpers';
import { WeeklyStatCards } from '@/components/weekly-stat-cards';
import { WeeklyPdbTable } from '@/components/WeeklyPdbTable';
import { WeeklySummary } from '@/components/WeeklySummary';
import { WeeklyPageControls } from '@/components/weekly-page';
import { EvalPageControls } from '@/components/EvalPageControls';
import { WeekComparison } from '@/components/week-comparison';
import { WeeklyActivityFeed } from '@/components/WeeklyActivityFeed';
import { WeeklyView } from '@/components/pdb-tracker/weekly-view';
import { EvaluationView } from '@/components/pdb-tracker/evaluation-view';
import { LiteratureView } from '@/components/pdb-tracker/literature-view';
import { LiteratureDateSidebar } from '@/components/literature/LiteratureDateSidebar';
import { ReadingListSidebar, useReadingLists } from '@/components/literature/LiteratureReadingList';
import { PaperNotesSection, usePaperNotes } from '@/components/literature/LiteraturePaperNotes';
import { usePaperTags, TagInput } from '@/components/literature/LiteraturePaperTags';
import { LiteratureRelatedPapers } from '@/components/literature/LiteratureRelatedPapers';
import { EvalModeSwitcher } from '@/components/EvalModeSwitcher';
import { EvaluationPage } from '@/components/evaluation-page';
import { EvalSummary } from '@/components/eval-summary';
import { PdbViewerModal, PdbThumbnailPreview } from '@/components/PdbViewerModal';
import { EvalComparison } from '@/components/eval-comparison';
import { EvalBatchCompare } from '@/components/EvalBatchCompare';
import { EvalDashboard } from '@/components/eval-dashboard';
import { EvalGanttTimeline } from '@/components/eval-gantt-timeline';
import { EvalReportGenerator } from '@/components/eval-report-generator';
import { useLocalStorageSet } from '@/hooks/use-local-storage';
import { useReadingProgress } from '@/hooks/use-reading-progress';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { CommandPalette } from '@/components/command-palette';
import { NotificationBell } from '@/components/notification-bell';
import { WeeklyHeatmap } from '@/components/weekly-heatmap';
import { WeeklyTrendAnalysis } from '@/components/weekly-trend-analysis';
import { ScrollToTop } from '@/components/scroll-to-top';
import { EnhancedEmptyState } from '@/components/enhanced-empty-state';
import { WeeklyBulkActions } from '@/components/weekly-bulk-actions';
import { WeeklyStructureCompare } from '@/components/weekly-structure-compare';
import { toast } from 'sonner';
import { SettingsPanel } from '@/components/settings-panel';
import { useAppSettings } from '@/hooks/use-app-settings';
import { BreadcrumbNav } from '@/components/breadcrumb-nav';
import { KeyboardHints } from '@/components/keyboard-hints';
import { ScrollProgress } from '@/components/scroll-progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { generateBibTeX, generateRIS, generateAPA, generateVancouver, downloadFile } from '@/lib/citation-utils';
import { DataImportDialog } from '@/components/DataImportDialog';
import { CustomToastContainer, customToast } from '@/components/custom-toast';

// ─── Mode Tab Config ──────────────────────────────────────────────────────────

const MODE_TABS: { mode: Mode; label: string; labelCn: string; icon: React.ReactNode; shortcut: string }[] = [
  { mode: 'weekly', label: 'Weekly', labelCn: '周报', icon: <Database className="h-4 w-4" />, shortcut: '1' },
  { mode: 'evaluation', label: 'Evaluation', labelCn: '评估', icon: <FlaskConical className="h-4 w-4" />, shortcut: '2' },
  { mode: 'literature', label: 'Literature', labelCn: '文献', icon: <BookOpen className="h-4 w-4" />, shortcut: '3' },
];

// ─── MiniSparkline Component ────────────────────────────────────────────────────

let sparklineCounter = 0;

function MiniSparkline({ data, width = 60, height = 20 }: { data: number[]; width?: number; height?: number }) {
  const [uid] = useState(() => `sg${++sparklineCounter}`);
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;
  const usableH = height - padding * 2;
  const usableW = width - padding * 2;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * usableW;
    const y = height - padding - ((v - min) / range) * usableH;
    return `${x},${y}`;
  });

  const linePath = `M${points.join(' L')}`;

  // Gradient fill area (close the path to the bottom)
  const fillPath = `${linePath} L${padding + usableW},${height - padding} L${padding},${height - padding} Z`;

  return (
    <svg width={width} height={height} className="flex-shrink-0" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c96442" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#c96442" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${uid})`} />
      <path d={linePath} fill="none" stroke="#c96442" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── AI Analysis Types ────────────────────────────────────────────────────────

interface AiAnalysisSection {
  id: string;
  title: string;
  icon: string;
  color: string;
  content: string;
}

interface AiAnalysisResult {
  sections: AiAnalysisSection[];
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PdbTracker() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Mode state
  const [mode, setMode] = useState<Mode>('weekly');

  // Weekly data
  const [entries, setEntries] = useState<PdbEntry[]>([]);
  const [snapshots, setSnapshots] = useState<WeeklySnapshot[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Evaluation data
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [allEvaluations, setAllEvaluations] = useState<Evaluation[]>([]);
  const [evalBatches, setEvalBatches] = useState<EvalBatch[]>([]);
  const [batchSubTargets, setBatchSubTargets] = useState<Record<string, EvalBatchSubTarget[]>>({});
  const [selectedEvalId, setSelectedEvalId] = useState<string | null>(null);
  const [selectedEval, setSelectedEval] = useState<Evaluation | null>(null);
  const [evalLoading, setEvalLoading] = useState(true);

  // Literature data
  const [litStats, setLitStats] = useState<LitStats | null>(null);
  const [litPapers, setLitPapers] = useState<LitPaper[]>([]);
  const [litReports, setLitReports] = useState<LitReport[]>([]);
  const [litLoading, setLitLoading] = useState(true);
  const [litSelectedPaper, setLitSelectedPaper] = useState<LitPaper | null>(null);
  const [litIsDetailOpen, setLitIsDetailOpen] = useState(false);
  const [litShowCharts, setLitShowCharts] = useState(false);
  const [litSelectedDate, setLitSelectedDate] = useState<string | null>(null);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string>('releaseDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<PdbEntry | null>(null);
  const [litPdbSelected, setLitPdbSelected] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showTrend, setShowTrend] = useState(false);
  const [weeklyDateFilter, setWeeklyDateFilter] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Mobile search overlay state
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  // Weekly detail panel AI analysis
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysisResult | null>(null);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);

  // Literature detail panel AI summary
  const [litAiSummary, setLitAiSummary] = useState<string | null>(null);
  const [litAiSummaryLoading, setLitAiSummaryLoading] = useState(false);

  // Reading lists
  const readingListState = useReadingLists();
  const [litReadingListFilter, setLitReadingListFilter] = useState<string | null>(null);

  // Paper notes
  const paperNotesState = usePaperNotes();
  const [litOpenNotePmid, setLitOpenNotePmid] = useState<string | null>(null);

  // Paper tags
  const paperTagsState = usePaperTags();
  const [litTagFilter, setLitTagFilter] = useState<string | null>(null);

  // Literature source filter (日报)
  const [litSourceFilter, setLitSourceFilter] = useState<'all' | 'daily'>('all');

  // Literature IF filter
  const [litIfFilter, setLitIfFilter] = useState<'all' | '5' | '10' | '20'>('all');

  // Reading progress
  const readingProgressState = useReadingProgress();

  // Bookmarks with localStorage persistence
  const [bookmarks, updateBookmarks] = useLocalStorageSet('pdb-bookmarks');

  // Search input ref for keyboard shortcut
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Main content scroll container ref for scroll-to-top
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Command palette state
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Weekly report modal state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<{ title: string; content: string } | null>(null);
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);

  // Evaluation detail tab state
  const [evalDetailTab, setEvalDetailTab] = useState('Summary');
  const [selectedEvalStructure, setSelectedEvalStructure] = useState<EvalRow | null>(null);
  const [evalReportContent, setEvalReportContent] = useState<string>('');

  // Evaluation sub-view state (default / compare / dashboard / timeline)
  const [evalSubView, setEvalSubView] = useState<'default' | 'compare' | 'dashboard' | 'timeline' | 'batch'>('default');

  // Evaluation report generator state
  const [evalReportOpen, setEvalReportOpen] = useState(false);

  // Evaluation filter state
  const [evalFilter, setEvalFilter] = useState<string>('all');
  const [evalSortField, setEvalSortField] = useState<string>('uniprotId');
  const [evalSortDir, setEvalSortDir] = useState<'asc' | 'desc'>('asc');

  // Weekly batch selection state
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
  const [compareMode, setCompareMode] = useState(false);

  // Settings panel state
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Keyboard hints overlay state
  const [keyboardHintsOpen, setKeyboardHintsOpen] = useState(false);

  // Data import dialog state
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // 3D viewer modal state
  const [viewerModalPdbId, setViewerModalPdbId] = useState<string | null>(null);
  const [viewerModalOpen, setViewerModalOpen] = useState(false);

  // Back-to-top visibility state
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Data freshness timestamp
  const [dataFetchedAt, setDataFetchedAt] = useState<Date | null>(null);

  // Keyboard navigation: highlighted row in weekly table
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null);

  const {
    settings: appSettings,
    updateSetting,
    updateSettings,
    resetSettings,
    toggleActivityType,
  } = useAppSettings();

  const isDark = theme === 'dark';

  // ─── Keyboard Shortcuts ──────────────────────────────────────────────────

  useKeyboardShortcuts({
    onModeSwitch: (newMode) => {
      setMode(newMode);
      setCurrentPage(1);
      setActiveFilter('all');
      setSearchQuery('');
      setSelectedEvalId(null);
      setSelectedEval(null);
      setSelectedEvalStructure(null);
      setDetailPanelOpen(false);
      setHighlightedRowId(null);
    },
    onCloseDetailPanel: () => {
      setDetailPanelOpen(false);
      setSelectedEvalStructure(null);
      setLitIsDetailOpen(false);
    },
    onOpenCommandPalette: () => {
      setCommandPaletteOpen(true);
    },
    onToggleKeyboardHints: () => {
      setKeyboardHintsOpen(prev => !prev);
    },
    onFocusSearch: () => {
      searchInputRef.current?.focus();
    },
    onNavigateRow: (direction) => {
      if (mode !== 'weekly' || paginatedEntries.length === 0) return;
      const currentIdx = paginatedEntries.findIndex(e => e.pdbId === highlightedRowId);
      let newIdx: number;
      if (currentIdx < 0) {
        newIdx = direction === 'down' ? 0 : paginatedEntries.length - 1;
      } else {
        newIdx = direction === 'down' ? Math.min(currentIdx + 1, paginatedEntries.length - 1) : Math.max(currentIdx - 1, 0);
      }
      setHighlightedRowId(paginatedEntries[newIdx].pdbId);
      // Scroll the row into view
      const rowEl = document.querySelector(`[data-pdb-id="${paginatedEntries[newIdx].pdbId}"]`);
      rowEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    },
    onOpenHighlightedRow: () => {
      if (highlightedRowId && mode === 'weekly') {
        const entry = paginatedEntries.find(e => e.pdbId === highlightedRowId);
        if (entry) {
          setSelectedEntry(entry);
          setDetailPanelOpen(true);
        }
      }
    },
    onToggleBookmarkHighlighted: () => {
      if (highlightedRowId && mode === 'weekly') {
        toggleBookmark(highlightedRowId);
      }
    },
    enabled: true,
  });

  // ─── Data Fetching ────────────────────────────────────────────────────────

  const fetchSnapshots = useCallback(async () => {
    try {
      const res = await fetch('/api/snapshots');
      if (res.ok) {
        const data = await res.json();
        setSnapshots(data);
        if (data.length > 0 && !selectedSnapshot) {
          setSelectedSnapshot(data[0].weekId);
        }
      }
    } catch (err) {
      console.error('Failed to fetch snapshots:', err);
    }
  }, [selectedSnapshot]);

  const fetchEntries = useCallback(async (week?: string, method?: string, q?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (week) params.set('week', week);
      if (method && method !== 'all') params.set('method', method);
      if (q) params.set('q', q);
      params.set('limit', '5000');
      const res = await fetch(`/api/entries?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        // Support both wrapped {total,limit,offset,entries} and legacy array response
        setEntries(Array.isArray(data) ? data : (data.entries ?? []));
      }
    } catch (err) {
      console.error('Failed to fetch entries:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEvaluations = useCallback(async () => {
    setEvalLoading(true);
    try {
      const res = await fetch('/api/evaluations');
      if (res.ok) {
        const data = await res.json();
        setEvaluations(data.individualEvals || []);
        setAllEvaluations(data.allEvaluations || []);
        setEvalBatches(data.batches || []);
        setBatchSubTargets(data.batchSubTargets || {});
      }
    } catch (err) {
      console.error('Failed to fetch evaluations:', err);
    } finally {
      setEvalLoading(false);
    }
  }, []);

  const fetchEvalDetail = useCallback(async (uniprotId: string) => {
    try {
      const res = await fetch(`/api/evaluations/${uniprotId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedEval(data);
      }
    } catch (err) {
      console.error('Failed to fetch evaluation detail:', err);
    }
  }, []);

  const fetchLitStats = useCallback(async () => {
    try {
      const res = await fetch('/api/literature/stats');
      if (res.ok) {
        const data = await res.json();
        setLitStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch lit stats:', err);
    }
  }, []);

  const fetchLitPapers = useCallback(async (q?: string) => {
    setLitLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      const res = await fetch(`/api/literature/papers?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLitPapers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch lit papers:', err);
    } finally {
      setLitLoading(false);
    }
  }, []);

  const fetchLitReports = useCallback(async () => {
    try {
      const res = await fetch('/api/literature/reports');
      if (res.ok) {
        const data = await res.json();
        setLitReports(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch lit reports:', err);
    }
  }, []);

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch('/api/reports?type=weekly_summary');
      if (res.ok) {
        const data = await res.json();
        setWeeklyReports(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    }
  }, []);

  const fetchAiAnalysis = useCallback(async (entry: PdbEntry) => {
    setAiAnalysisLoading(true);
    setAiAnalysis(null);
    try {
      const res = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdbId: entry.pdbId,
          title: entry.title,
          method: entry.method,
          resolution: entry.resolution,
          organism: entry.organisms,
          journal: entry.journal,
          journalIf: entry.journalIf,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiAnalysis(data);
      }
    } catch (err) {
      console.error('Failed to fetch AI analysis:', err);
    } finally {
      setAiAnalysisLoading(false);
    }
  }, []);

  // ─── Literature AI Summary ───────────────────────────────────────────────

  const fetchLitAiSummary = useCallback(async (paper: LitPaper) => {
    setLitAiSummaryLoading(true);
    setLitAiSummary(null);
    try {
      const res = await fetch('/api/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdbId: paper.pdbs?.[0]?.pdbId || '',
          title: paper.title,
          method: paper.pdbs?.[0]?.method || '',
          abstract: paper.abstract,
          journal: paper.journal,
          journalIf: paper.IF,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setLitAiSummary(data.summary || data.content || null);
        toast.success('AI Summary generated', { description: 'Summary is ready to view' });
      }
    } catch (err) {
      console.error('Failed to fetch AI summary:', err);
    } finally {
      setLitAiSummaryLoading(false);
    }
  }, []);

  // ─── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => { setMounted(true); }, []);

  // Apply saved settings on first load
  useEffect(() => {
    if (mounted) {
      setMode(appSettings.defaultMode);
      setSortField(appSettings.defaultSortField);
      setSortDir(appSettings.defaultSortDir);
      setPageSize(appSettings.defaultPageSize);
    }
  }, [mounted]);

  useEffect(() => {
    fetchSnapshots();
    fetchEntries();
    fetchEvaluations();
    fetchLitStats();
    fetchLitPapers();
    fetchLitReports();
    fetchReports();
    setDataFetchedAt(new Date());
  }, []);

  // Refetch entries when snapshot or filter changes
  useEffect(() => {
    if (mode === 'weekly') {
      const methodFilter = activeFilter !== 'all' &&
        ['Cryo-EM', 'X-RAY DIFFRACTION', 'SOLUTION NMR'].includes(activeFilter)
        ? activeFilter : undefined;
      fetchEntries(selectedSnapshot || undefined, methodFilter, searchQuery || undefined);
      setCurrentPage(1);
      setSelectedEntryIds(new Set());
    }
  }, [selectedSnapshot, activeFilter, mode]);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mode === 'weekly') {
        const methodFilter = activeFilter !== 'all' &&
          ['Cryo-EM', 'X-RAY DIFFRACTION', 'SOLUTION NMR'].includes(activeFilter)
          ? activeFilter : undefined;
        fetchEntries(selectedSnapshot || undefined, methodFilter, searchQuery || undefined);
      }
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery, mode, activeFilter, selectedSnapshot]);

  // Fetch eval detail and eval report markdown when selectedEval changes
  useEffect(() => {
    if (selectedEvalId) {
      fetchEvalDetail(selectedEvalId);
      setEvalReportContent('');
    } else {
      setSelectedEval(null);
      setEvalReportContent('');
    }
  }, [selectedEvalId]);

  // Fetch evaluation report markdown from file when selectedEval is available
  useEffect(() => {
    if (selectedEval?.uniprotId) {
      fetch(`/api/eval-report-file/${selectedEval.uniprotId}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.content) {
            const stripped = data.content
              .replace(/^---[\s\S]*?---\s*/m, '')
              .replace(/^#\s+.+\n/, '')
              .replace(/^\*\*[^*]+\*\*:\s*[^*]+\n/gm, '')
              .replace(/^\*\*[^*]+\*\*:\s*/gm, '')
              .replace(/^(created|updated|type|tags|sources):\s*[^\n]+\n/gim, '')
              .trim();
            setEvalReportContent(stripped);
          }
        })
        .catch(() => {});
    }
  }, [selectedEval?.uniprotId]);

  // Fetch AI analysis when entry selected
  useEffect(() => {
    if (selectedEntry && detailPanelOpen) {
      fetchAiAnalysis(selectedEntry);
    } else {
      setAiAnalysis(null);
      setAiAnalysisLoading(false);
    }
  }, [selectedEntry, detailPanelOpen]);

  // Reset literature AI summary when detail panel closes
  useEffect(() => {
    if (!litIsDetailOpen) {
      setLitAiSummary(null);
      setLitAiSummaryLoading(false);
    }
  }, [litIsDetailOpen]);

  // Track scroll for back-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ─── Filtered & Sorted Entries ────────────────────────────────────────────

  const filteredEntries = useMemo(() => {
    let result = [...entries];
    if (activeFilter === 'high-if') result = result.filter(e => (e.journalIf ?? 0) >= 10);
    else if (activeFilter === 'top-if') result = result.filter(e => (e.journalIf ?? 0) >= 20);
    if (weeklyDateFilter) result = result.filter(e => e.releaseDate === weeklyDateFilter);

    result.sort((a, b) => {
      const aVal = (a as any)[sortField];
      const bVal = (b as any)[sortField];
      // null/undefined 始终排在最后（不论 asc 还是 desc）
      // 对 IF 字段：<=0 也视作"未知"——未发表文献的 IF 占位为 0，不应参与排序
      // 对其他数字字段(resolution/coverage/score 等)：0 是合法值，只看 null
      const treatZeroAsMissing = sortField === 'journalIf';
      const isMissing = (v: any) =>
        v == null || (treatZeroAsMissing && typeof v === 'number' && v <= 0);
      const aNull = isMissing(aVal);
      const bNull = isMissing(bVal);
      if (aNull && bNull) return 0;
      if (aNull) return 1;
      if (bNull) return -1;
      let cmp = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') cmp = aVal - bVal;
      else cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [entries, sortField, sortDir, activeFilter, weeklyDateFilter]);

  const filteredEvaluations = useMemo(() => {
    let result = [...allEvaluations];
    if (evalFilter === 'high-coverage') result = result.filter(e => (e.coverage ?? 0) >= 80);
    else if (evalFilter === 'medium-coverage') result = result.filter(e => (e.coverage ?? 0) >= 50);
    else if (evalFilter === 'low-coverage') result = result.filter(e => (e.coverage ?? 0) < 50);
    else if (evalFilter === 'has-structure') result = result.filter(e => (e.pdbStructures?.length ?? 0) > 0);
    else if (evalFilter === 'has-blast') result = result.filter(e => (e.blastResults?.length ?? 0) > 0);
    if (searchQuery && mode === 'evaluation') {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        (e.uniprotId?.toLowerCase().includes(q)) ||
        (e.proteinName?.toLowerCase().includes(q)) ||
        (e.organism?.toLowerCase().includes(q)) ||
        (e.entryName?.toLowerCase().includes(q))
      );
    }
    result.sort((a, b) => {
      const aVal = (a as any)[evalSortField];
      const bVal = (b as any)[evalSortField];
      // null/undefined 始终排在最后（不论 asc 还是 desc）
      // 对 IF 字段：<=0 也视作"未知"——未发表文献的 IF 占位为 0，不应参与排序
      // 对其他数字字段(resolution/coverage/score 等)：0 是合法值，只看 null
      const treatZeroAsMissing = evalSortField === 'journalIf';
      const isMissing = (v: any) =>
        v == null || (treatZeroAsMissing && typeof v === 'number' && v <= 0);
      const aNull = isMissing(aVal);
      const bNull = isMissing(bVal);
      if (aNull && bNull) return 0;
      if (aNull) return 1;
      if (bNull) return -1;
      let cmp = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') cmp = aVal - bVal;
      else cmp = String(aVal).localeCompare(String(bVal));
      return evalSortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [allEvaluations, evalFilter, searchQuery, mode, evalSortField, evalSortDir]);

  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEntries.slice(start, start + pageSize);
  }, [filteredEntries, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredEntries.length / pageSize);

  const currentSnapshot = useMemo(() => {
    return snapshots.find(s => s.weekId === selectedSnapshot) || null;
  }, [snapshots, selectedSnapshot]);

  const prevSnapshot = useMemo(() => {
    if (!selectedSnapshot) return null;
    const idx = snapshots.findIndex(s => s.weekId === selectedSnapshot);
    if (idx < 0 || idx >= snapshots.length - 1) return null;
    return snapshots[idx + 1];
  }, [snapshots, selectedSnapshot]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }, [sortField]);

  const handleEvalSort = useCallback((field: string) => {
    if (evalSortField === field) {
      setEvalSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setEvalSortField(field);
      setEvalSortDir('desc');
    }
  }, [evalSortField]);

  const handleRowClick = useCallback((entry: PdbEntry) => {
    setSelectedEntry(entry);
    setDetailPanelOpen(true);
  }, []);

  const toggleBookmark = useCallback((pdbId: string) => {
    updateBookmarks(prev => {
      const next = new Set(prev);
      if (next.has(pdbId)) {
        next.delete(pdbId);
        toast.info('Bookmark removed', { description: `${pdbId} removed from bookmarks` });
      } else {
        next.add(pdbId);
        toast.success('Bookmarked', { description: `${pdbId} added to bookmarks` });
      }
      return next;
    });
  }, [updateBookmarks]);

  const handleModeSwitch = useCallback((newMode: Mode) => {
    setMode(newMode);
    setCurrentPage(1);
    setActiveFilter('all');
    setSearchQuery('');
    setWeeklyDateFilter(null);
    setSelectedEvalId(null);
    setSelectedEval(null);
    setSelectedEvalStructure(null);
    setDetailPanelOpen(false);
    setLitIsDetailOpen(false);
    setEvalSubView('default');
    setEvalFilter('all');
    setSelectedEntryIds(new Set());
    setCompareMode(false);
    toast(`Switched to ${newMode} mode`, { description: 'Press 1/2/3 for quick switching' });
  }, []);

  // Literature handlers
  const handleLitSelectDate = useCallback(async (date: string) => {
    setLitSelectedDate(date);
    if (!date) {
      await fetchLitPapers();
      return;
    }
    setLitLoading(true);
    try {
      const res = await fetch(`/api/literature/report/${date}`);
      if (res.ok) {
        const data = await res.json();
        if (data.papers) setLitPapers(data.papers);
      }
    } catch (err) {
      // Silently handle fetch errors for date filter
    } finally {
      setLitLoading(false);
    }
  }, [fetchLitPapers]);

  const handleLitClearDateFilter = useCallback(() => {
    setLitSelectedDate(null);
    fetchLitPapers();
  }, [fetchLitPapers]);

  const handleLitSelectPaper = useCallback((paper: LitPaper) => {
    setLitSelectedPaper(paper);
    setLitIsDetailOpen(true);
  }, []);

  const handleLitClearAllFilters = useCallback(() => {
    if (litSelectedDate) handleLitClearDateFilter();
  }, [litSelectedDate, handleLitClearDateFilter]);

  const litHasActiveFilters = litSelectedDate !== null || litSourceFilter !== 'all' || !!litReadingListFilter || !!litTagFilter || litIfFilter !== 'all';

  // ─── Command Palette Search Navigation Handlers ────────────────────────────

  const handleCommandSelectPdbEntry = useCallback((entry: { pdbId: string; weekId: string | null }) => {
    setMode('weekly');
    if (entry.weekId) setSelectedSnapshot(entry.weekId);
    // Find the entry in loaded data and select it
    const found = entries.find(e => e.pdbId === entry.pdbId);
    if (found) {
      setSelectedEntry(found);
      setDetailPanelOpen(true);
    } else {
      // Refetch and select
      fetchEntries(entry.weekId || undefined, undefined, entry.pdbId).then(() => {
        // After fetching, the entry should be in the entries array
        setEntries(prev => {
          const e = prev.find(x => x.pdbId === entry.pdbId);
          if (e) {
            setSelectedEntry(e);
            setDetailPanelOpen(true);
          }
          return prev;
        });
      });
    }
    toast.info('Navigated to PDB entry', { description: entry.pdbId });
  }, [entries, fetchEntries]);

  const handleCommandSelectEvaluation = useCallback((evalResult: { uniprotId: string }) => {
    setMode('evaluation');
    setSelectedEvalId(evalResult.uniprotId);
    setDetailPanelOpen(true);
    toast.info('Navigated to evaluation', { description: evalResult.uniprotId });
  }, []);

  const handleCommandSelectPaper = useCallback((paperResult: { pmid: string }) => {
    setMode('literature');
    const paper = litPapers.find(p => p.pmid === paperResult.pmid);
    if (paper) {
      handleLitSelectPaper(paper);
    }
    toast.info('Navigated to paper', { description: `PMID ${paperResult.pmid}` });
  }, [litPapers, handleLitSelectPaper]);

  // ─── Weekly Batch Selection Handlers ──────────────────────────────────────

  const handleBookmarkAll = useCallback(() => {
    updateBookmarks(prev => {
      const next = new Set(prev);
      let addedCount = 0;
      selectedEntryIds.forEach(pdbId => {
        if (!next.has(pdbId)) {
          next.add(pdbId);
          addedCount++;
        }
      });
      toast.success('Bookmarked all', { description: `${addedCount} structure${addedCount !== 1 ? 's' : ''} added to bookmarks` });
      return next;
    });
  }, [selectedEntryIds, updateBookmarks]);

  const handleExportSelected = useCallback((format: 'csv' | 'json') => {
    const selectedEntries = entries.filter(e => selectedEntryIds.has(e.pdbId));
    if (selectedEntries.length === 0) return;

    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'json') {
      const data = selectedEntries.map(e => ({
        pdbId: e.pdbId,
        method: e.method,
        resolution: e.resolution,
        journalIf: e.journalIf,
        journal: e.journal,
        organisms: e.organisms,
        title: e.title,
        releaseDate: e.releaseDate,
        ligands: e.ligands,
        doi: e.doi,
      }));
      content = JSON.stringify(data, null, 2);
      filename = `pdb-selected-${new Date().toISOString().slice(0, 10)}.json`;
      mimeType = 'application/json';
    } else {
      const headers = ['PDB ID', 'Method', 'Resolution', 'IF', 'Journal', 'Organism', 'Title', 'Date', 'Ligands', 'DOI'];
      const rows = selectedEntries.map(e => [
        e.pdbId,
        e.method || '',
        e.resolution != null ? e.resolution.toFixed(2) : '',
        e.journalIf != null ? e.journalIf.toFixed(1) : '',
        e.journal || '',
        e.organisms || '',
        e.title || '',
        e.releaseDate || '',
        e.ligands || '',
        e.doi || '',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
      content = [headers.join(','), ...rows].join('\n');
      filename = `pdb-selected-${new Date().toISOString().slice(0, 10)}.csv`;
      mimeType = 'text/csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export complete', { description: `${selectedEntries.length} structures exported as ${format.toUpperCase()}` });
  }, [entries, selectedEntryIds]);

  const handleCompare = useCallback(() => {
    setCompareMode(true);
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedEntryIds(new Set());
  }, []);

  // When PDB clicked from literature, select it for detail view
  const handleLitPdbClick = useCallback((pdbId: string) => {
    setLitPdbSelected(pdbId);
  }, []);

  const handleLitPdbBack = useCallback(() => {
    setLitPdbSelected(null);
  }, []);


  // ─── Weekly Report Viewer ────────────────────────────────────────────────

  const handleViewReport = useCallback((weekId?: string, type?: 'xray' | 'cryoem') => {
    const targetWeekId = weekId || selectedSnapshot || '';
    fetch(`/api/weekly-report-file?weekId=${encodeURIComponent(targetWeekId)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.files && data.files.length > 0) {
          const targetFile = type
            ? data.files.find((f: any) => f.type === type) || data.files[0]
            : data.files[0];
          if (targetFile) {
            setSelectedReport({ title: `Weekly Report — ${targetFile.filename.replace(/\.md$/, '')}`, content: targetFile.content });
            setReportModalOpen(true);
          }
        } else {
          const report = weeklyReports.find(r => r.weekId === targetWeekId);
          if (report && report.content) {
            setSelectedReport({ title: `Weekly Report — ${report.weekId}`, content: report.content });
            setReportModalOpen(true);
          }
        }
      })
      .catch(() => {
        const report = weeklyReports.find(r => r.weekId === targetWeekId);
        if (report && report.content) {
          setSelectedReport({ title: `Weekly Report — ${report.weekId}`, content: report.content });
          setReportModalOpen(true);
        }
      });
  }, [weeklyReports, selectedSnapshot]);

  const getReportCountForWeek = useCallback((weekId: string | null) => {
    if (!weekId) return 0;
    if (/W\d+/i.test(weekId)) return 2;
    return weeklyReports.some(r => r.weekId === weekId && r.content) ? 1 : 0;
  }, [weeklyReports]);

  // ─── Snapshot Method Distribution Bar ──────────────────────────────────────

  function SnapshotMethodBar({ snap, isActive }: { snap: WeeklySnapshot; isActive: boolean }) {
    const total = snap.totalStructures || 1;
    const cryoemPct = (snap.cryoemCount / total) * 60;
    const xrayPct = (snap.xrayCount / total) * 60;
    const nmrPct = (snap.nmrCount / total) * 60;
    const barH = isActive ? 8 : 6;

    return (
      <svg width={60} height={barH} className="flex-shrink-0 mt-1">
        {/* Background track */}
        <rect x={0} y={0} width={60} height={barH} rx={barH / 2} className="fill-claude-border dark:fill-[#3d3832]" opacity={0.5} />
        {/* Cryo-EM segment */}
        {snap.cryoemCount > 0 && (
          <rect x={0} y={0} width={cryoemPct} height={barH} rx={cryoemPct >= 60 ? barH / 2 : 0} fill="#2d8f8f" opacity={0.85} style={{ clipPath: 'inset(0 0 0 0 round 4px 0 0 4px)' }} />
        )}
        {/* X-ray segment */}
        {snap.xrayCount > 0 && (
          <rect x={cryoemPct} y={0} width={xrayPct} height={barH} fill="#7c5cbf" opacity={0.85} />
        )}
        {/* NMR segment */}
        {snap.nmrCount > 0 && (
          <rect x={cryoemPct + xrayPct} y={0} width={nmrPct} height={barH} fill="#c9872e" opacity={0.85} style={{ clipPath: 'inset(0 0 0 0 round 0 4px 4px 0)' }} />
        )}
        {/* Glow for active */}
        {isActive && (
          <rect x={0} y={0} width={60} height={barH} rx={barH / 2} fill="none" stroke="#c96442" strokeWidth={0.5} opacity={0.6} />
        )}
      </svg>
    );
  }

  // ─── Render: Weekly Sidebar ──────────────────────────────────────────────

  const renderWeeklySidebar = (mobile?: boolean) => (
    <motion.aside
      layout
      className={`${mobile ? 'w-full' : ''} ${mobile ? '' : 'hidden lg:flex'} border-r border-claude-border dark:border-[#3d3832] bg-claude-surface dark:bg-[#242220] flex flex-col overflow-hidden flex-shrink-0 sidebar-animated ${!mobile && sidebarCollapsed ? 'sidebar-collapsed w-[48px]' : 'w-[260px]'}`}
    >
      <div className="px-3 py-3 border-b border-claude-border dark:border-[#3d3832]">
        <div className="flex items-center justify-between">
          {(!sidebarCollapsed || mobile) && (
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-semibold text-claude-text-secondary uppercase tracking-wider">
                Weekly Snapshots
              </h3>
            </div>
          )}
          {mobile ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-claude-text-muted hover:text-claude-text"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-claude-text-muted hover:text-claude-text active:scale-95 transition-transform duration-100"
                  onClick={() => setSidebarCollapsed(c => !c)}
                >
                  <ChevronRight className={`h-3.5 w-3.5 sidebar-collapse-btn ${sidebarCollapsed ? '' : 'rotated'}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left"><p>{sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}</p></TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto sidebar-scroll py-1">
        {snapshots.map(snap => {
          const isActive = selectedSnapshot === snap.weekId;
          return (
            <div
              key={snap.weekId}
              role="button"
              tabIndex={0}
              onClick={() => { setSelectedSnapshot(snap.weekId); setActiveFilter('all'); if (mobile) setMobileMenuOpen(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedSnapshot(snap.weekId); setActiveFilter('all'); if (mobile) setMobileMenuOpen(false); } }}
              className={`w-full text-left px-3 py-2.5 mx-1.5 rounded-md mb-0.5 claude-transition claude-focus-ring hover:pl-2 transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-claude-accent-light dark:bg-[#3d2a22] sidebar-active-card border-l-2 border-claude-accent'
                  : 'hover:bg-claude-border-light dark:hover:bg-[#2b2926]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className={`text-xs font-semibold ${isActive ? 'text-claude-accent' : 'text-claude-text'}`}>
                    {(sidebarCollapsed && !mobile) ? snap.weekId.replace('2025-', '') : snap.weekId}
                  </span>
                  {(!sidebarCollapsed || mobile) && getReportCountForWeek(snap.weekId) > 0 && (
                    <div className="flex items-center gap-0.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button onClick={(e) => { e.stopPropagation(); handleViewReport(snap.weekId, 'xray'); }} className="h-4 w-4 p-0 flex items-center justify-center rounded border border-[#7c5cbf]/40 hover:bg-claude-accent/10 active:scale-90 transition-all duration-100">
                            <span className="text-[8px] font-bold text-[#7c5cbf]">X</span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right"><p>X-ray Report</p></TooltipContent>
                      </Tooltip>
                      {getReportCountForWeek(snap.weekId) > 1 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button onClick={(e) => { e.stopPropagation(); handleViewReport(snap.weekId, 'cryoem'); }} className="h-4 w-4 p-0 flex items-center justify-center rounded border border-[#2d8f8f]/40 hover:bg-claude-accent/10 active:scale-90 transition-all duration-100">
                              <span className="text-[8px] font-bold text-[#2d8f8f]">E</span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right"><p>Cryo-EM Report</p></TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {(!sidebarCollapsed || mobile) && snapshots.length > 1 && (
                    <MiniSparkline data={snapshots.map(s => s.totalStructures)} width={50} height={16} />
                  )}
                  <span className="text-[10px] font-mono text-claude-text-muted">
                    {snap.totalStructures}
                  </span>
                </div>
              </div>
              {(!sidebarCollapsed || mobile) && (
                <div className="mt-0.5 flex items-center gap-2">
                  <SnapshotMethodBar snap={snap} isActive={isActive} />
                  <div className="flex items-center gap-1">
                    {snap.cryoemCount > 0 && (
                      <span className="text-[8px] font-mono text-[#2d8f8f]" title="Cryo-EM">E{snap.cryoemCount}</span>
                    )}
                    {snap.xrayCount > 0 && (
                      <span className="text-[8px] font-mono text-[#7c5cbf]" title="X-ray">X{snap.xrayCount}</span>
                    )}
                    {snap.nmrCount > 0 && (
                      <span className="text-[8px] font-mono text-[#c9872e]" title="NMR">N{snap.nmrCount}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Week Comparison & Activity Feed inside scrollable area */}
        {(!sidebarCollapsed || mobile) && currentSnapshot && (
          <div className="border-t border-claude-border dark:border-[#3d3832] p-3 mt-1">
            <WeekComparison current={currentSnapshot} previous={prevSnapshot} snapshots={snapshots} />
          </div>
        )}
        {(!sidebarCollapsed || mobile) && (
          <div className="border-t border-claude-border dark:border-[#3d3832]">
            <WeeklyActivityFeed entries={entries} weekLabel={currentSnapshot?.weekId} maxEvents={6} />
          </div>
        )}
      </div>
    </motion.aside>
  );

  // ─── Render: Evaluation Sidebar ──────────────────────────────────────────

  const renderEvalSidebar = (mobile?: boolean) => (
    <aside className={`${mobile ? 'w-full' : 'w-[260px]'} ${mobile ? '' : 'hidden lg:flex'} border-r border-claude-border dark:border-[#3d3832] bg-claude-surface dark:bg-[#242220] flex flex-col overflow-hidden flex-shrink-0`}>
      <div className="px-3 py-3 border-b border-claude-border dark:border-[#3d3832]">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-claude-text-secondary uppercase tracking-wider">
            Evaluations
          </h3>
          {mobile && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-claude-text-muted hover:text-claude-text"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto sidebar-scroll">
        <EvalModeSwitcher
          evaluations={evaluations}
          batches={evalBatches}
          batchSubTargets={batchSubTargets}
          selectedUniprotId={selectedEvalId}
          onSelectEval={(id) => { setSelectedEvalId(id); setDetailPanelOpen(true); setSelectedEvalStructure(null); if (mobile) setMobileMenuOpen(false); }}
          loading={evalLoading}
        />
      </div>
    </aside>
  );

  // ─── Render: Literature Sidebar ──────────────────────────────────────────

  const renderLiteratureSidebar = (mobile?: boolean) => (
    <aside className={`${mobile ? 'w-full' : 'w-[260px]'} ${mobile ? '' : 'hidden lg:flex'} border-r border-claude-border dark:border-[#3d3832] bg-claude-surface dark:bg-[#242220] flex flex-col overflow-hidden flex-shrink-0`}>
      <div className="px-3 py-3 border-b border-claude-border dark:border-[#3d3832]">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-claude-text-secondary uppercase tracking-wider">
            Literature
          </h3>
          {mobile && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-claude-text-muted hover:text-claude-text"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto sidebar-scroll">
        <LiteratureDateSidebar
          allPapers={litPapers}
          filteredPapers={(() => {
            let filtered: typeof litPapers = litPapers;

            // Source filter (日报)
            if (litSourceFilter === 'daily') {
              filtered = filtered.filter(p => p.source === '结构生物学文献日报');
            }

            // Reading list filter
            if (litReadingListFilter) {
              const list = readingListState.lists.find(l => l.id === litReadingListFilter);
              if (list) {
                filtered = filtered.filter(p => list.paperPmids.includes(p.pmid));
              }
            }

            // Tag filter
            if (litTagFilter) {
              const papersWithTag = new Set(paperTagsState.getPapersWithTag(litTagFilter));
              filtered = filtered.filter(p => papersWithTag.has(p.pmid));
            }


            // IF filter
            if (litIfFilter !== 'all') {
              const minIf = parseInt(litIfFilter, 10);
              filtered = filtered.filter(p => p.IF != null && p.IF >= minIf);
            }

            // Date filter (show filtered count for selected date range)
            if (litSelectedDate) {
              filtered = filtered.filter(p => {
                if (!p.pubdate) return false;
                if (litSelectedDate.length === 4) {
                  return p.pubdate.startsWith(litSelectedDate);
                } else if (litSelectedDate.length === 7) {
                  return p.pubdate.startsWith(litSelectedDate);
                } else {
                  return p.pubdate === litSelectedDate;
                }
              });
            }

            return filtered;
          })()}
          onClearFilter={litSourceFilter !== 'all' || litReadingListFilter || litTagFilter || litSelectedDate || litIfFilter !== 'all' ? () => { setLitSourceFilter('all'); setLitReadingListFilter(null); setLitTagFilter(null); handleLitClearDateFilter(); setLitIfFilter('all'); } : undefined}
          selectedDate={litSelectedDate}
          onSelectDate={(date) => { handleLitSelectDate(date); if (mobile) setMobileMenuOpen(false); }}
          isLoading={litLoading && litReports.length === 0}
          inline
        />
        {/* Section Divider */}
        <div className="border-t border-claude-border dark:border-[#3d3832]" />
        {/* Reading Lists Section */}
        <div className="px-3 py-3">
          <ReadingListSidebar
            lists={readingListState.lists}
            selectedListId={litReadingListFilter}
            onSelectList={setLitReadingListFilter}
            onCreateList={readingListState.createList}
            onDeleteList={readingListState.deleteList}
            onClearList={readingListState.clearList}
            onRemovePaperFromList={readingListState.removePaperFromList}
            onReorderLists={readingListState.reorderLists}
            papersMap={(() => { const m = new Map<string, LitPaper>(); litPapers.forEach(p => m.set(p.pmid, p)); return m; })()}
            progressMap={readingProgressState.progressMap}
            onPaperClick={(pmid) => {
              const paper = litPapers.find(p => p.pmid === pmid);
              if (paper) handleLitSelectPaper(paper);
            }}
          />
        </div>
      </div>
    </aside>
  );

  // ─── Render: Weekly Content ──────────────────────────────────────────────

  const renderWeeklyContent = () => (
    <>
      <WeeklyStatCards snapshot={currentSnapshot} entries={entries} loading={loading} snapshots={snapshots} />

      {/* Summary + Heatmap toggle */}
      <div className="px-4 pt-2 flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSummary(!showSummary)}
          className={`h-7 px-2.5 text-[11px] ${showSummary ? 'bg-claude-accent/10 text-claude-accent' : 'text-claude-text-muted'}`}
        >
          <BarChart3 className="h-3 w-3 mr-1" />
          {showSummary ? 'Hide Summary' : 'Show Summary'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowHeatmap(!showHeatmap)}
          className={`h-7 px-2.5 text-[11px] ${showHeatmap ? 'bg-claude-accent/10 text-claude-accent' : 'text-claude-text-muted'}`}
        >
          <Calendar className="h-3 w-3 mr-1" />
          {showHeatmap ? 'Hide Heatmap' : 'Heatmap'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowTrend(!showTrend)}
          className={`h-7 px-2.5 text-[11px] ${showTrend ? 'bg-claude-accent/10 text-claude-accent' : 'text-claude-text-muted'}`}
        >
          <TrendingUp className="h-3 w-3 mr-1" />
          {showTrend ? 'Hide Trends' : 'Trend Analysis'}
        </Button>
      </div>

      {/* Summary Charts */}
      <AnimatePresence>
        {showSummary && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <WeeklySummary entries={entries} snapshot={currentSnapshot} snapshots={snapshots} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trend Analysis */}
      <AnimatePresence>
        {showTrend && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <WeeklyTrendAnalysis snapshots={snapshots} entries={entries} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Heatmap Calendar */}
      <AnimatePresence>
        {showHeatmap && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <WeeklyHeatmap selectedSnapshot={selectedSnapshot} onDateSelect={setWeeklyDateFilter} currentDateFilter={weeklyDateFilter} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Data Table */}
      <div className="flex-1 overflow-auto border-t border-claude-border dark:border-[#3d3832]">
        <WeeklyPdbTable
          entries={paginatedEntries}
          loading={loading}
          sortField={sortField}
          sortDir={sortDir}
          onSort={handleSort}
          onRowClick={handleRowClick}
          bookmarks={bookmarks}
          onToggleBookmark={toggleBookmark}
          selectedEntryIds={selectedEntryIds}
          onSelectEntries={setSelectedEntryIds}
          highlightedRowId={highlightedRowId}
          onHighlightRow={setHighlightedRowId}
        />
      </div>

      {/* Pagination */}
      <div className="flex-shrink-0">
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-t border-claude-border dark:border-[#3d3832] bg-claude-surface dark:bg-[#242220]">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-claude-text-muted">
              Showing <span className="font-mono font-medium text-claude-text-secondary">{((currentPage - 1) * pageSize) + 1}</span>–<span className="font-mono font-medium text-claude-text-secondary">{Math.min(currentPage * pageSize, filteredEntries.length)}</span> of <span className="font-mono font-medium text-claude-text-secondary">{filteredEntries.length}</span>
            </span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="h-6 px-1.5 text-[10px] font-medium rounded border border-claude-border dark:border-[#3d3832] bg-white dark:bg-[#1a1917] text-claude-text-secondary"
            >
              {[10, 25, 50, 100].map(s => <option key={s} value={s}>{s}/page</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)} className="h-7 px-2 text-[11px]">Prev</Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page: number;
              if (totalPages <= 5) page = i + 1;
              else if (currentPage <= 3) page = i + 1;
              else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
              else page = currentPage - 2 + i;
              return (
                <Button key={page} variant={currentPage === page ? 'default' : 'ghost'} size="sm"
                  onClick={() => setCurrentPage(page)}
                  className={`h-7 w-7 p-0 text-[11px] ${currentPage === page ? 'bg-claude-accent text-white shadow-sm' : ''}`}
                >{page}</Button>
              );
            })}
            <Button variant="ghost" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="h-7 px-2 text-[11px]">Next</Button>
          </div>
        </div>
      </div>
    </>
  );

  // ─── Render: Evaluation Content ──────────────────────────────────────────

  const renderEvalContent = () => {
    // Sub-view: toolbar + full-width component
    if (evalSubView === 'compare' || evalSubView === 'dashboard' || evalSubView === 'timeline' || evalSubView === 'batch') {
      return (
        <div className="flex flex-col h-full">
          {/* Sub-view navigation bar */}
          <div className="px-4 py-2 flex items-center gap-2 flex-shrink-0 border-b border-claude-border dark:border-[#3d3832] bg-claude-surface dark:bg-[#242220]">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEvalSubView('default')}
              className="h-7 px-2.5 text-[11px] text-claude-text-secondary hover:text-claude-text"
            >
              ← Back to Evaluation
            </Button>
            <div className="flex items-center gap-1 ml-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEvalSubView('compare')}
                className={`h-7 px-2.5 text-[11px] ${evalSubView === 'compare' ? 'bg-claude-accent/10 text-claude-accent' : 'text-claude-text-muted'}`}
              >
                <ArrowRightLeft className="h-3 w-3 mr-1" />
                Compare
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEvalSubView('dashboard')}
                className={`h-7 px-2.5 text-[11px] ${evalSubView === 'dashboard' ? 'bg-claude-accent/10 text-claude-accent' : 'text-claude-text-muted'}`}
              >
                <LayoutDashboard className="h-3 w-3 mr-1" />
                Dashboard
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEvalSubView('timeline')}
                className={`h-7 px-2.5 text-[11px] ${evalSubView === 'timeline' ? 'bg-claude-accent/10 text-claude-accent' : 'text-claude-text-muted'}`}
              >
                <Clock className="h-3 w-3 mr-1" />
                Timeline
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEvalSubView('batch')}
                className={`h-7 px-2.5 text-[11px] ${evalSubView === 'batch' ? 'bg-claude-accent/10 text-claude-accent' : 'text-claude-text-muted'}`}
              >
                <Database className="h-3 w-3 mr-1" />
                Batch Matrix
              </Button>
            </div>
          </div>
          {/* Sub-view content */}
          <div className="flex-1 min-h-0">
            {evalSubView === 'compare' && <EvalComparison evaluations={allEvaluations} />}
            {evalSubView === 'dashboard' && <EvalDashboard evaluations={allEvaluations} batches={evalBatches} batchSubTargets={batchSubTargets} onViewBatch={(batchId) => { setEvalSubView('batch'); }} />}
            {evalSubView === 'timeline' && <EvalGanttTimeline evaluations={allEvaluations} onSelectEval={(id) => { setSelectedEvalId(id); setDetailPanelOpen(true); }} selectedUniprotId={selectedEvalId} />}
            {evalSubView === 'batch' && <EvalBatchCompare evaluations={allEvaluations} batches={evalBatches} batchSubTargets={batchSubTargets} />}
          </div>
        </div>
      );
    }

    // Default: individual evaluation page with Compare/Dashboard/Timeline buttons
    return (
      <>
        {/* Compare + Dashboard + Timeline toggle buttons */}
        <div className="px-4 pt-2 flex items-center gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEvalSubView('compare')}
            className="h-7 px-2.5 text-[11px] text-claude-text-muted"
          >
            <ArrowRightLeft className="h-3 w-3 mr-1" />
            Compare
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEvalSubView('dashboard')}
            className="h-7 px-2.5 text-[11px] text-claude-text-muted"
          >
            <LayoutDashboard className="h-3 w-3 mr-1" />
            Dashboard
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEvalSubView('timeline')}
            className="h-7 px-2.5 text-[11px] text-claude-text-muted"
          >
            <Clock className="h-3 w-3 mr-1" />
            Timeline
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEvalSubView('batch')}
            className="h-7 px-2.5 text-[11px] text-claude-text-muted"
          >
            <Database className="h-3 w-3 mr-1" />
            Batch Matrix
          </Button>
          {selectedEval && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEvalReportOpen(true)}
              className="h-7 px-2.5 text-[11px] text-claude-accent hover:text-claude-accent-hover hover:bg-claude-accent/10 ml-auto"
            >
              <FileDown className="h-3 w-3 mr-1" />
              Generate Report
            </Button>
          )}
        </div>
        <EvaluationPage
          evaluation={selectedEval}
          loading={evalLoading}
          selectedPdbId={selectedEvalStructure?.pdbId ?? null}
          onSelectPdb={(pdbId) => {
            if (!selectedEval) return;
            // Find the matching EvalRow from pdbStructures or blastResults
            const structRow = selectedEval.pdbStructures.find(s => s.pdbId === pdbId);
            if (structRow) {
              setSelectedEvalStructure({ ...structRow, _type: 'structure' });
              setDetailPanelOpen(true);
              return;
            }
            const blastRow = selectedEval.blastResults.find(b => b.pdbId === pdbId);
            if (blastRow) {
              setSelectedEvalStructure({
                ...blastRow,
                _type: 'blast',
                ifTier: blastRow.ifTier || '',
                journalIf: blastRow.journalIf ?? null,
                title: blastRow.title || blastRow.description || null,
                releaseDate: blastRow.releaseDate || null,
                pubmedId: blastRow.pubmedId || null,
                pubmedTitle: blastRow.pubmedTitle || null,
                pubmedAuthors: blastRow.pubmedAuthors || null,
                pubmedAbstract: blastRow.pubmedAbstract || null,
              });
              setDetailPanelOpen(true);
            }
          }}
        />
      </>
    );
  };

  const renderDetailPanelWrapper = (content: React.ReactNode, closeHandler: () => void) => (
    <>
      {/* Mobile: full-screen overlay */}
      <div className="md:hidden fixed inset-0 z-50 flex flex-col bg-claude-bg dark:bg-[#1a1917]">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-claude-border dark:border-[#3d3832] bg-claude-surface dark:bg-[#242220] flex-shrink-0">
          <span className="text-sm font-semibold text-claude-text">Details</span>
          <Button variant="ghost" size="sm" onClick={closeHandler} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto preview-scroll">
          {content}
        </div>
      </div>
      {/* Desktop: inline panel with responsive width */}
      <motion.aside
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        style={{ width: 'clamp(280px, 30vw, 420px)' }}
        className="hidden md:flex border-l border-white/20 dark:border-white/5 bg-white/80 dark:bg-[#1a1917]/80 backdrop-blur-md flex-col overflow-hidden flex-shrink-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] relative"
      >
        {content}
      </motion.aside>
    </>
  );

  // ─── Render: Detail Panel ────────────────────────────────────────────────

  const renderDetailPanel = () => {
    if (!detailPanelOpen && !litIsDetailOpen && !litPdbSelected) return null;

    // PDB detail from literature mode — show same detail panel but with back button
    if (mode === 'literature' && litPdbSelected) {
      const pdbEntry = entries.find(e => e.pdbId === litPdbSelected) || (() => {
        // Try to find in blast results
        for (const row of selectedEval?.blastResults || []) {
          if (row.pdbId === litPdbSelected) {
            return {
              pdbId: row.pdbId,
              title: row.title || row.pdbId,
              method: row.method || '',
              resolution: row.resolution ?? null,
              authors: '',
              releaseDate: '',
              isCryoem: (row.method || '').toLowerCase().includes('em'),
              isXray: (row.method || '').toLowerCase().includes('x-ray'),
              isNmR: false,
              journal: '',
              organisms: '',
            };
          }
        }
        return null;
      })();

      if (!pdbEntry) return null;
      const qualityScore = computeQualityScore(pdbEntry);
      const pdbDetailContent = (
        <>
          {/* Header */}
          <div className="px-4 py-3 border-b border-claude-border dark:border-[#3d3832] flex items-center justify-between bg-gradient-to-r from-[#faf7f4] to-[#f5f0ea] dark:from-[#242220] dark:to-[#2b2926]">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleLitPdbBack} className="h-7 w-7 p-0 rounded-full bg-claude-border-light/80 dark:bg-[#2b2926]/80 hover:bg-claude-accent/10 text-claude-text-muted hover:text-claude-accent transition-all duration-200">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-mono font-bold text-sm text-claude-accent">{pdbEntry.pdbId}</span>
            </div>
          </div>
          {/* 3D Structure Preview */}
          <div className="p-4 border-b border-claude-border/50 dark:border-[#3d3832]/50">
            <div className="flex items-center gap-1.5 mb-2">
              <Box className="h-3.5 w-3.5 text-claude-accent" />
              <span className="text-[10px] font-medium text-claude-text-muted uppercase tracking-wider">3D Structure</span>
            </div>
            <PdbThumbnailPreview
              pdbId={pdbEntry.pdbId || ''}
              title={pdbEntry.title ?? undefined}
              onClick={() => { setViewerModalPdbId(pdbEntry.pdbId); setViewerModalOpen(true); }}
            />
          </div>
          {/* Title */}
          <div className="px-4 py-3 border-b border-claude-border/50 dark:border-[#3d3832]/50">
            <div className="text-xs text-claude-text-muted mb-1">Title</div>
            <div className="text-sm text-claude-text font-medium leading-snug">{pdbEntry.title || '—'}</div>
          </div>
          {/* Method & Resolution */}
          <div className="px-4 py-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-claude-text-muted mb-1">Method</div>
                <span className={`method-badge inline-flex px-2 py-0.5 rounded text-[11px] font-medium border ${
                  pdbEntry.isCryoem ? 'method-badge-cryoem bg-claude-cryoem-bg text-claude-cryoem border-claude-cryoem/30' :
                  pdbEntry.isXray ? 'method-badge-xray bg-claude-xray-bg text-claude-xray border-claude-xray/30' :
                  'method-badge-nmr bg-claude-nmr-bg text-claude-nmr border-claude-nmr/30'
                }`}>
                  {pdbEntry.method || 'Unknown'}
                </span>
              </div>
              <div>
                <div className="text-xs text-claude-text-muted mb-1">Resolution</div>
                <div className={`text-sm font-mono font-semibold ${
                  pdbEntry.resolution != null
                    ? pdbEntry.resolution <= 2.0 ? 'text-green-600 dark:text-green-400'
                      : pdbEntry.resolution <= 3.5 ? 'text-amber-600 dark:text-amber-400'
                      : 'text-red-500 dark:text-red-400'
                    : 'text-claude-text-muted'
                }`}>
                  {pdbEntry.resolution != null ? `${pdbEntry.resolution.toFixed(2)}Å` : '—'}
                </div>
              </div>
            </div>
          </div>
        </>
      );
      return renderDetailPanelWrapper(pdbDetailContent, handleLitPdbBack);
    }

    // Literature detail panel (inline, matches sidebar+main+detail pattern)
    if (mode === 'literature' && litIsDetailOpen && litSelectedPaper) {
      const paper = litSelectedPaper;

      // IF tier color for the bar
      const ifTierColor = paper.IF != null
        ? paper.IF >= 20 ? 'bg-red-500'
          : paper.IF >= 10 ? 'bg-orange-500'
          : paper.IF >= 5 ? 'bg-emerald-500'
          : 'bg-gray-400'
        : 'bg-gray-300 dark:bg-gray-600';

      // Build citation text (shown in the panel)
      const citationYear = paper.pubdate ? new Date(paper.pubdate).getFullYear() || paper.pubdate.slice(0, 4) : '';
      const citationText = `${paper.authors || 'Unknown'} (${citationYear}). ${paper.title}. ${paper.journal}${paper.doi ? `. DOI: ${paper.doi}` : ''}. PMID: ${paper.pmid}.`;

      const litDetailContent = (<>
        {/* Accent gradient top bar */}
        <div className="glass-detail-panel-accent" />
        {/* Noise texture overlay */}
        <div className="glass-noise-overlay" />
        {/* IF Tier Color Bar */}
        <div className={`h-[2px] w-full ${ifTierColor} flex-shrink-0 relative z-[1]`} />

          {/* Reading progress bar at very top (replaces IF bar when progress > 0) */}
          {readingProgressState.getProgress(paper.pmid) > 0 && (
            <div className="h-[2px] w-full bg-claude-border-light dark:bg-[#2b2926] flex-shrink-0 relative z-[1]">
              <div
                className="h-full transition-all duration-500 ease-out"
                style={{
                  width: `${readingProgressState.getProgress(paper.pmid)}%`,
                  background: readingProgressState.getProgress(paper.pmid) >= 100
                    ? '#10b981'
                    : 'linear-gradient(90deg, #2d8f8f, #c96442)',
                }}
              />
            </div>
          )}

          {/* Header */}
          <div className="px-4 py-3 border-b border-claude-border dark:border-[#3d3832] flex items-center justify-between bg-gradient-to-r from-[#faf7f4] to-[#f5f0ea] dark:from-[#242220] dark:to-[#2b2926]">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-claude-accent" />
              <span className="text-sm font-bold text-claude-accent font-mono">PMID: {paper.pmid}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setLitIsDetailOpen(false)} className="h-7 w-7 p-0 rounded-full bg-claude-border-light/80 dark:bg-[#2b2926]/80 hover:bg-red-100 dark:hover:bg-red-900/30 text-claude-text-muted hover:text-red-500 transition-all duration-200">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto preview-scroll p-4 space-y-4">
            {/* Title */}
            <div>
              <h3 className="text-base font-bold text-claude-text leading-snug">
                {paper.title || 'Untitled'}
              </h3>
            </div>

            {/* Reading Progress Section */}
            <div className="p-3 rounded-lg border border-claude-border/60 dark:border-[#3d3832]/60 bg-claude-border-light/30 dark:bg-[#1a1917]/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                  <span className="text-[10px] font-medium text-claude-text-muted uppercase tracking-wider">
                    Reading Progress
                  </span>
                </div>
                <span className={`text-sm font-bold tabular-nums ${
                  readingProgressState.getProgress(paper.pmid) >= 100
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : readingProgressState.getProgress(paper.pmid) > 0
                      ? 'text-teal-600 dark:text-teal-400'
                      : 'text-claude-text-muted'
                }`}>
                  {readingProgressState.getProgress(paper.pmid)}%
                </span>
              </div>

              {/* Progress bar visual */}
              <div className="h-1.5 w-full bg-claude-border-light dark:bg-[#2b2926] rounded-full mb-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${readingProgressState.getProgress(paper.pmid)}%`,
                    background: readingProgressState.getProgress(paper.pmid) >= 100
                      ? '#10b981'
                      : 'linear-gradient(90deg, #2d8f8f, #c96442)',
                  }}
                />
              </div>

              {/* Slider */}
              <Slider
                value={[readingProgressState.getProgress(paper.pmid)]}
                min={0}
                max={100}
                step={5}
                onValueChange={(value) => {
                  readingProgressState.setProgress(paper.pmid, value[0]);
                }}
                className="w-full mb-2"
              />

              {/* Quick action buttons */}
              <div className="flex items-center gap-2">
                {readingProgressState.getProgress(paper.pmid) < 100 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2.5 text-[10px] font-medium border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                    onClick={() => readingProgressState.markComplete(paper.pmid)}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Mark as Complete
                  </Button>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                    <Check className="h-3 w-3" />
                    Completed
                  </span>
                )}
                {readingProgressState.getProgress(paper.pmid) > 0 && readingProgressState.getProgress(paper.pmid) < 100 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px] font-medium text-claude-text-muted hover:text-claude-text"
                    onClick={() => readingProgressState.setProgress(paper.pmid, 0)}
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>

            {/* AI Summary */}
            <div className="border border-claude-border/50 dark:border-[#3d3832]/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-claude-accent" />
                  <span className="text-[10px] font-medium text-claude-text-muted uppercase tracking-wider">AI Summary</span>
                </div>
                {!litAiSummary && !litAiSummaryLoading && (
                  <button
                    onClick={() => fetchLitAiSummary(paper)}
                    className="text-[10px] font-medium text-claude-accent dark:text-claude-accent-hover hover:underline"
                  >
                    Generate
                  </button>
                )}
              </div>
              {litAiSummaryLoading && (
                <div className="flex items-center gap-2 text-xs text-claude-text-muted">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Generating summary...
                </div>
              )}
              {litAiSummary && (
                <p className="text-xs text-claude-text-secondary leading-relaxed">{litAiSummary}</p>
              )}
            </div>

            {/* Metadata grid */}
            <div className="grid grid-cols-2 gap-3">
              {paper.authors && (
                <div className="col-span-2">
                  <div className="flex items-start gap-2">
                    <Users className="h-3.5 w-3.5 text-claude-text-muted mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-[10px] font-medium text-claude-text-muted uppercase tracking-wider mb-0.5">Authors</div>
                      <div className="text-xs text-claude-text-secondary leading-relaxed">{paper.authors}</div>
                    </div>
                  </div>
                </div>
              )}
              {paper.journal && (
                <div>
                  <div className="text-[10px] font-medium text-claude-text-muted uppercase tracking-wider mb-0.5">Journal</div>
                  <div className="text-xs text-claude-text-secondary font-medium">{paper.journal}</div>
                </div>
              )}
              {paper.IF != null && (
                <div>
                  <div className="text-[10px] font-medium text-claude-text-muted uppercase tracking-wider mb-0.5">Impact Factor</div>
                  <div className={`text-sm font-bold ${
                    paper.IF >= 20 ? 'text-red-600 dark:text-red-400' :
                    paper.IF >= 10 ? 'text-orange-600 dark:text-orange-400' :
                    paper.IF >= 5 ? 'text-emerald-600 dark:text-emerald-400' :
                    'text-claude-text'
                  }`}>
                    {paper.IF.toFixed(1)}
                  </div>
                </div>
              )}
              {paper.pubdate && (
                <div>
                  <div className="text-[10px] font-medium text-claude-text-muted uppercase tracking-wider mb-0.5">Date</div>
                  <div className="text-xs text-claude-text-secondary">{paper.pubdate}</div>
                </div>
              )}
              <div>
                <div className="text-[10px] font-medium text-claude-text-muted uppercase tracking-wider mb-0.5">PMID</div>
                <div className="text-xs text-claude-text-secondary font-mono">{paper.pmid}</div>
              </div>
            </div>

            {/* DOI + PubMed links */}
            <div className="flex items-center gap-2">
              <a href={`https://pubmed.ncbi.nlm.nih.gov/${paper.pmid}/`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-claude-accent/10 text-claude-accent dark:bg-claude-accent/20 dark:text-claude-accent-hover hover:bg-claude-accent/20 dark:hover:bg-claude-accent/30 transition-colors">
                <ExternalLink className="h-3 w-3" /> PubMed
              </a>
              {paper.doi && (
                <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-claude-border-light dark:bg-[#2b2926] text-claude-text-secondary hover:bg-claude-border dark:hover:bg-[#3d3832] transition-colors">
                  <Link2 className="h-3 w-3" /> DOI
                </a>
              )}
            </div>

            {/* Abstract */}
            {paper.abstract && (
              <div>
                <div className="text-[10px] font-medium text-claude-text-muted uppercase tracking-wider mb-1.5">Abstract</div>
                <div className="text-xs text-claude-text-secondary leading-relaxed p-3 rounded-lg bg-claude-border-light/50 dark:bg-[#1a1917]/50 border border-claude-border/50 dark:border-[#3d3832]/50">
                  {paper.abstract}
                </div>
              </div>
            )}

            {/* Export Citation */}
            <div>
              <div className="text-[10px] font-medium text-claude-text-muted uppercase tracking-wider mb-1.5">Cite this paper</div>
              <div className="text-xs text-claude-text-secondary leading-relaxed p-3 rounded-lg bg-claude-border-light/50 dark:bg-[#1a1917]/50 border border-claude-border/50 dark:border-[#3d3832]/50">
                {citationText}
              </div>
              <div className="mt-1.5">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium bg-claude-border-light dark:bg-[#2b2926] text-claude-text-secondary hover:bg-claude-border dark:hover:bg-[#3d3832] transition-colors border border-claude-border/50 dark:border-[#3d3832]/50">
                      <BookOpen className="h-3 w-3" />
                      Export Citation
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-52">
                    <DropdownMenuItem
                      onClick={async () => {
                        const apa = generateAPA(paper);
                        await navigator.clipboard.writeText(apa);
                        toast.success('APA citation copied!');
                      }}
                    >
                      <Copy className="h-3.5 w-3.5 mr-2" />
                      Copy APA Citation
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={async () => {
                        const bibtex = generateBibTeX(paper);
                        await navigator.clipboard.writeText(bibtex);
                        toast.success('BibTeX copied!');
                      }}
                    >
                      <Copy className="h-3.5 w-3.5 mr-2" />
                      Copy BibTeX
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={async () => {
                        const ris = generateRIS(paper);
                        await navigator.clipboard.writeText(ris);
                        toast.success('RIS copied!');
                      }}
                    >
                      <Copy className="h-3.5 w-3.5 mr-2" />
                      Copy RIS
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={async () => {
                        const vancouver = generateVancouver(paper);
                        await navigator.clipboard.writeText(vancouver);
                        toast.success('Vancouver citation copied!');
                      }}
                    >
                      <Copy className="h-3.5 w-3.5 mr-2" />
                      Copy Vancouver
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        const bibtex = generateBibTeX(paper);
                        const key = paper.authors?.split(',')[0]?.trim()?.replace(/[^a-zA-Z0-9]/g, '') || paper.pmid;
                        const year = paper.pubdate ? paper.pubdate.match(/\d{4}/)?.[0] || '' : '';
                        downloadFile(bibtex, `${key}${year}.bib`, 'application/x-bibtex');
                        toast.success('BibTeX file downloaded!');
                      }}
                    >
                      <Download className="h-3.5 w-3.5 mr-2" />
                      Download .bib file
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        const ris = generateRIS(paper);
                        const key = paper.authors?.split(',')[0]?.trim()?.replace(/[^a-zA-Z0-9]/g, '') || paper.pmid;
                        const year = paper.pubdate ? paper.pubdate.match(/\d{4}/)?.[0] || '' : '';
                        downloadFile(ris, `${key}${year}.ris`, 'application/x-research-info-systems');
                        toast.success('RIS file downloaded!');
                      }}
                    >
                      <Download className="h-3.5 w-3.5 mr-2" />
                      Download .ris file
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Associated PDB structures */}
            {paper.pdbs.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Database className="h-3.5 w-3.5 text-claude-text-muted" />
                  <span className="text-[10px] font-medium text-claude-text-muted uppercase tracking-wider">
                    Associated PDB Structures ({paper.pdbs.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {paper.pdbs.map(pdb => {
                    const methodStyle = getMethodColor(pdb.method || '');
                    // Resolution quality dot
                    const resDotColor = pdb.resolution != null
                      ? pdb.resolution < 2.5 ? 'bg-emerald-500'
                        : pdb.resolution < 3.5 ? 'bg-amber-500'
                        : 'bg-red-500'
                      : null;
                    return (
                      <div key={pdb.pdbId}
                        onClick={() => handleLitPdbClick(pdb.pdbId)}
                        className="flex items-center gap-2 p-2.5 rounded-lg border border-claude-border/60 dark:border-[#3d3832]/60 bg-claude-border-light/30 dark:bg-[#1a1917]/30 hover:bg-claude-accent/10 dark:hover:bg-claude-accent/10 cursor-pointer transition-colors">
                        {/* Resolution quality dot */}
                        {resDotColor && (
                          <span className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${resDotColor}`} title={
                            pdb.resolution! < 2.5 ? 'High resolution (<2.5Å)' :
                            pdb.resolution! < 3.5 ? 'Medium resolution (<3.5Å)' :
                            'Low resolution (≥3.5Å)'
                          } />
                        )}
                        <button
                          onClick={() => {
                            handleLitPdbClick(pdb.pdbId);
                          }}
                          className="text-xs font-mono font-bold text-claude-accent dark:text-claude-accent-hover hover:underline cursor-pointer">
                          {pdb.pdbId}
                        </button>
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-medium ${methodStyle.bg} ${methodStyle.text} ${methodStyle.border} border`}>
                          {getMethodLabel(pdb.method || '')}
                        </span>
                        {pdb.resolution != null && (
                          <span className="text-[10px] text-claude-text-muted font-mono">
                            {pdb.resolution.toFixed(2)}Å
                          </span>
                        )}
                        {pdb.isBlast && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
                            BLAST
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Keywords */}
            {paper.keywords && paper.keywords.length > 0 && (
              <div>
                <div className="text-[10px] font-medium text-claude-text-muted uppercase tracking-wider mb-1.5">Keywords</div>
                <div className="flex flex-wrap gap-1">
                  {paper.keywords.map((kw, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-claude-border-light dark:bg-[#2b2926] text-claude-text-secondary border border-claude-border/50 dark:border-[#3d3832]/50">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes Section */}
            <PaperNotesSection
              pmid={paper.pmid}
              noteText={paperNotesState.getNote(paper.pmid)}
              noteData={paperNotesState.getNoteData(paper.pmid)}
              onNoteChange={paperNotesState.setNote}
            />

            {/* Tags Section */}
            <div className="border-t border-claude-border/50 dark:border-[#3d3832]/50 pt-3">
              <TagInput
                pmid={paper.pmid}
                currentTags={paperTagsState.getTags(paper.pmid)}
                onAddTag={paperTagsState.addTag}
                onRemoveTag={paperTagsState.removeTag}
              />
            </div>

            {/* Related Papers */}
            {litPapers.length > 1 && (
              <div className="border-t border-claude-border/50 dark:border-[#3d3832]/50 pt-3">
                <LiteratureRelatedPapers
                  currentPaper={paper}
                  allPapers={litPapers}
                  onSelectPaper={handleLitSelectPaper}
                />
              </div>
            )}
          </div>
      </>);

      return renderDetailPanelWrapper(litDetailContent, () => setLitIsDetailOpen(false));
    }

    // Evaluation structure detail — individual structure/homog detail panel
    if (mode === 'evaluation' && selectedEvalStructure) {
      const row = selectedEvalStructure;
      const isStructure = row._type === 'structure';
      const methodStyle = getMethodColor(row.method || '');
      const resDotColor = row.resolution != null
        ? row.resolution < 2.5 ? 'bg-emerald-500'
          : row.resolution < 3.5 ? 'bg-amber-500'
          : 'bg-red-500'
        : null;

      // Compute quality score (reuse weekly scoring — both share resolution/method/journalIf)
      const qualityEntry: Partial<PdbEntry> = {
        resolution: row.resolution,
        method: row.method,
        journalIf: row.journalIf,
      };
      const qualityScore = computeQualityScore(qualityEntry);
      const qualityBorderClass = getQualityBorderClass(qualityEntry);

      // Parse ligands
      const ligandList = parseLigands(isStructure ? (row as any).ligand || (row as any).ligandNames : (row as any).ligand);

      const evalStructureDetailContent = (<>
          {/* Accent gradient top bar */}
          <div className="glass-detail-panel-accent" />
          {/* Noise texture overlay */}
          <div className="glass-noise-overlay" />
          {/* Header */}
          <div className="px-4 py-3 border-b border-claude-border dark:border-[#3d3832] flex items-center justify-between relative z-[1]">
            <div className="flex items-center gap-2">
              <Atom className="h-4 w-4 text-claude-accent" />
              <span className="font-mono font-bold text-sm text-claude-accent">{row.pdbId}</span>
              {/* Quality Score Ring */}
              <div className="relative">
                <QualityRing score={qualityScore.score} size={32} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[8px] font-bold text-claude-text">{qualityScore.score}</span>
                </div>
              </div>
              {/* Type badge */}
              <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-medium border ${
                isStructure
                  ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-700/50'
                  : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700/50'
              }`}>
                {isStructure ? 'Structure' : 'Homolog'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {/* Back to evaluation panel */}
              <Button variant="ghost" size="sm" onClick={() => setSelectedEvalStructure(null)} className="h-7 w-7 p-0 rounded-full bg-claude-border-light/80 dark:bg-[#2b2926]/80 hover:bg-claude-accent/10 text-claude-text-muted hover:text-claude-accent transition-all duration-200" title="Back to evaluation">
                <ChevronRight className="h-4 w-4 rotate-180" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setDetailPanelOpen(false); setSelectedEvalStructure(null); }} className="h-7 w-7 p-0 rounded-full bg-claude-border-light/80 dark:bg-[#2b2926]/80 hover:bg-red-100 dark:hover:bg-red-900/30 text-claude-text-muted hover:text-red-500 transition-all duration-200">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className={`flex-1 overflow-y-auto preview-scroll p-4 space-y-4 detail-scroll-container ${qualityBorderClass}`}>

            {/* 3D Structure Preview */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Box className="h-3.5 w-3.5 text-claude-accent" />
                <span className="text-[10px] font-medium text-claude-text-muted uppercase tracking-wider">3D Structure</span>
              </div>
              <PdbThumbnailPreview
                pdbId={row.pdbId}
                title={row.title || (row as any).description}
                onClick={() => { setViewerModalPdbId(row.pdbId); setViewerModalOpen(true); }}
              />
            </div>

            {/* Title */}
            <div>
              <div className="text-xs text-claude-text-muted mb-1">Title</div>
              <div className="text-sm text-claude-text font-medium leading-snug">
                {row.title || (row as any).description || '—'}
              </div>
            </div>

            {/* Quality Score Breakdown */}
            <div>
              <div className="text-xs text-claude-text-muted mb-2">Quality Score</div>
              <div className="flex items-center gap-4">
                <div className="relative score-ring-glow">
                  <QualityRing score={qualityScore.score} size={56} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-claude-text">{qualityScore.score}</span>
                  </div>
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-claude-text-muted">Resolution</span>
                    <span className="font-mono font-medium" style={{ color: qualityScore.resolution >= 25 ? '#2d8f8f' : qualityScore.resolution >= 15 ? '#c9872e' : '#e55a4f' }}>{qualityScore.resolution}/35</span>
                  </div>
                  <div className="h-1.5 bg-claude-border-light dark:bg-[#2b2926] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(qualityScore.resolution / 35) * 100}%`, backgroundColor: qualityScore.resolution >= 25 ? '#2d8f8f' : qualityScore.resolution >= 15 ? '#c9872e' : '#e55a4f' }} />
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-claude-text-muted">Method</span>
                    <span className="font-mono font-medium" style={{ color: qualityScore.method >= 20 ? '#2d8f8f' : qualityScore.method >= 15 ? '#c9872e' : '#e55a4f' }}>{qualityScore.method}/25</span>
                  </div>
                  <div className="h-1.5 bg-claude-border-light dark:bg-[#2b2926] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(qualityScore.method / 25) * 100}%`, backgroundColor: qualityScore.method >= 20 ? '#2d8f8f' : qualityScore.method >= 15 ? '#c9872e' : '#e55a4f' }} />
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-claude-text-muted">Impact</span>
                    <span className="font-mono font-medium" style={{ color: qualityScore.impact >= 20 ? '#2d8f8f' : qualityScore.impact >= 10 ? '#c9872e' : '#e55a4f' }}>{qualityScore.impact}/30</span>
                  </div>
                  <div className="h-1.5 bg-claude-border-light dark:bg-[#2b2926] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(qualityScore.impact / 30) * 100}%`, backgroundColor: qualityScore.impact >= 20 ? '#2d8f8f' : qualityScore.impact >= 10 ? '#c9872e' : '#e55a4f' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Method & Resolution */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-claude-text-muted mb-1">Method</div>
                <span className={`method-badge inline-flex px-2 py-0.5 rounded text-[11px] font-medium border ${methodStyle.bg} ${methodStyle.text} ${methodStyle.border} border`}>
                  {getMethodLabel(row.method || '')}
                </span>
              </div>
              <div>
                <div className="text-xs text-claude-text-muted mb-1">Resolution</div>
                <div className="flex items-center gap-1.5">
                  {resDotColor && <span className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${resDotColor}`} title={
                    row.resolution! < 2.5 ? 'High resolution (<2.5Å)' :
                    row.resolution! < 3.5 ? 'Medium resolution (<3.5Å)' :
                    'Low resolution (≥3.5Å)'
                  } />}
                  <span className={`text-sm font-mono font-semibold ${
                    row.resolution != null
                      ? row.resolution <= 2.0 ? 'text-green-600 dark:text-green-400'
                        : row.resolution <= 3.5 ? 'text-amber-600 dark:text-amber-400'
                        : 'text-red-500 dark:text-red-400'
                      : 'text-claude-text-muted'
                  }`}>
                    {row.resolution != null ? `${row.resolution.toFixed(2)}Å` : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* BLAST-specific info (only for homolog rows) */}
            {!isStructure && (
              <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-700/50 bg-amber-50/50 dark:bg-amber-900/10">
                <div className="text-[10px] font-medium text-amber-700 dark:text-amber-300 uppercase tracking-wider mb-2">BLAST Homolog Info</div>
                <div className="grid grid-cols-2 gap-2">
                  {(row as any).identity != null && (
                    <div>
                      <div className="text-[10px] text-claude-text-muted">Identity</div>
                      <span className={`text-sm font-mono font-semibold ${
                        (row as any).identity >= 90 ? 'text-green-600 dark:text-green-400'
                          : (row as any).identity >= 70 ? 'text-teal-600 dark:text-teal-400'
                          : (row as any).identity >= 50 ? 'text-amber-600 dark:text-amber-400'
                          : 'text-red-500 dark:text-red-400'
                      }`}>
                        {(row as any).identity.toFixed(1)}%
                      </span>
                    </div>
                  )}
                  {(row as any).evalue != null && (
                    <div>
                      <div className="text-[10px] text-claude-text-muted">E-value</div>
                      <span className="text-sm font-mono font-semibold text-claude-text">
                        {formatEvalue(parseFloat((row as any).evalue))}
                      </span>
                    </div>
                  )}
                  {(row as any).queryCoverage != null && (
                    <div>
                      <div className="text-[10px] text-claude-text-muted">Query Coverage</div>
                      <span className="text-sm font-mono font-semibold text-claude-text">
                        {(row as any).queryCoverage.toFixed(1)}%
                      </span>
                    </div>
                  )}
                  {(row as any).targetCoverage != null && (
                    <div>
                      <div className="text-[10px] text-claude-text-muted">Target Coverage</div>
                      <span className="text-sm font-mono font-semibold text-claude-text">
                        {(row as any).targetCoverage.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
                {(row as any).description && (
                  <div className="mt-2">
                    <div className="text-[10px] text-claude-text-muted mb-0.5">Description</div>
                    <div className="text-xs text-claude-text-secondary leading-relaxed">{(row as any).description}</div>
                  </div>
                )}
              </div>
            )}

            {/* Structure-specific info: Chain mapping */}
            {isStructure && (row as any).chainId && (
              <div className="grid grid-cols-2 gap-3">
                {(row as any).chainId && (
                  <div>
                    <div className="text-xs text-claude-text-muted mb-1">Chain</div>
                    <div className="text-sm text-claude-text font-mono">{(row as any).chainId}</div>
                  </div>
                )}
                {(row as any).unpStart != null && (row as any).unpEnd != null && (
                  <div>
                    <div className="text-xs text-claude-text-muted mb-1">UniProt Range</div>
                    <div className="text-sm text-claude-text font-mono">{(row as any).unpStart}–{(row as any).unpEnd}</div>
                  </div>
                )}
              </div>
            )}

            {/* Authors */}
            {((row as any).authors || (row as any).pubmedAuthors) && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Users className="h-3 w-3 text-claude-text-muted" />
                  <span className="text-xs text-claude-text-muted">Authors</span>
                </div>
                <div className="text-xs text-claude-text-secondary leading-relaxed">
                  {(row as any).authors || (row as any).pubmedAuthors}
                </div>
              </div>
            )}

            {/* Organism */}
            {(row as any).organism && (
              <div>
                <div className="text-xs text-claude-text-muted mb-1">Organism</div>
                <div className="text-sm text-claude-text">{(row as any).organism}</div>
              </div>
            )}

            {/* Journal & IF */}
            <div>
              <div className="text-xs text-claude-text-muted mb-1">Journal</div>
              <div className="text-sm text-claude-text">{row.journal || '—'}</div>
              {row.journalIf != null && (
                <span className={`inline-flex mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  row.ifTier === 'top' ? 'bg-claude-top-bg text-claude-top' :
                  row.ifTier === 'high' ? 'bg-claude-high-bg text-claude-high' :
                  row.ifTier === 'mid' ? 'bg-claude-mid-bg text-claude-mid' :
                  'bg-claude-low-bg text-claude-low'
                }`}>
                  IF: {row.journalIf.toFixed(1)}
                </span>
              )}
            </div>

            {/* Release Date */}
            {(row as any).releaseDate && (
              <div>
                <div className="text-xs text-claude-text-muted mb-1">Release Date</div>
                <div className="text-sm text-claude-text">{formatDate((row as any).releaseDate)}</div>
              </div>
            )}

            {/* DOI as clickable link */}
            {row.doi && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Link2 className="h-3 w-3 text-claude-text-muted" />
                  <span className="text-xs text-claude-text-muted">DOI</span>
                </div>
                <a
                  href={`https://doi.org/${row.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-claude-accent dark:text-claude-accent-hover hover:underline break-all"
                >
                  {row.doi}
                </a>
              </div>
            )}

            {/* Ligands */}
            {ligandList.length > 0 && (
              <div>
                <div className="text-xs text-claude-text-muted mb-1">Ligands</div>
                <div className="flex flex-wrap gap-1">
                  {ligandList.map((lig, i) => (
                    <span key={i} className="ligand-chip">{lig}</span>
                  ))}
                </div>
              </div>
            )}

            {/* PubMed Abstract */}
            {(row as any).pubmedAbstract && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <BookOpen className="h-3 w-3 text-claude-text-muted" />
                  <span className="text-xs text-claude-text-muted">PubMed Abstract</span>
                </div>
                <div className="text-xs text-claude-text-secondary leading-relaxed p-3 rounded-lg bg-claude-border-light/50 dark:bg-[#1a1917]/50 border border-claude-border/50 dark:border-[#3d3832]/50">
                  {(row as any).pubmedAbstract}
                </div>
              </div>
            )}

            {/* External Links */}
            <div className="pt-2 border-t border-claude-border dark:border-[#3d3832] space-y-2">
              <a href={`https://www.rcsb.org/structure/${row.pdbId}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-claude-accent hover:underline">
                <Database className="h-3.5 w-3.5" /> View on RCSB PDB
              </a>
              {row.doi && (
                <a href={`https://doi.org/${row.doi}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-claude-accent hover:underline">
                  <FileText className="h-3.5 w-3.5" /> View DOI Publication
                </a>
              )}
              {row.pubmedId && (
                <a href={`https://pubmed.ncbi.nlm.nih.gov/${row.pubmedId}/`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-claude-accent hover:underline">
                  <ExternalLink className="h-3.5 w-3.5" /> View on PubMed
                </a>
              )}
            </div>

            {/* Back to Evaluation button */}
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => setSelectedEvalStructure(null)}
              >
                <ChevronRight className="h-3 w-3 mr-1 rotate-180" />
                Back to {selectedEval?.proteinName || selectedEval?.uniprotId || 'Evaluation'}
              </Button>
            </div>
          </div>
      </>);

      return renderDetailPanelWrapper(evalStructureDetailContent, () => { setSelectedEvalStructure(null); setDetailPanelOpen(false); });
    }

    // Evaluation detail — tabbed panel
    if (mode === 'evaluation' && selectedEval) {
      const evalTabNames = ['Summary', 'Structures', 'BLAST', 'Report'] as const;

      // Inline Structures tab content
      const evalStructuresTab = (
        <div className="space-y-2">
          {selectedEval.pdbStructures.length === 0 ? (
            <div className="text-xs text-claude-text-muted py-4 text-center">No PDB structures found</div>
          ) : (
            selectedEval.pdbStructures.map((s) => {
              const methodStyle = getMethodColor(s.method || '');
              const resDotColor = s.resolution != null
                ? s.resolution < 2.5 ? 'bg-emerald-500'
                  : s.resolution < 3.5 ? 'bg-amber-500'
                  : 'bg-red-500'
                : null;
              return (
                <div key={s.id} className="p-2.5 rounded-lg border border-claude-border/60 dark:border-[#3d3832]/60 bg-claude-border-light/30 dark:bg-[#1a1917]/30 hover:bg-claude-border-light/60 dark:hover:bg-[#2b2926]/60 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedEvalStructure({ ...s, _type: 'structure' as const });
                  }}>
                  <div className="flex items-center gap-2 mb-1">
                    {resDotColor && (
                      <span className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${resDotColor}`} title={
                        s.resolution! < 2.5 ? 'High resolution (<2.5Å)' :
                        s.resolution! < 3.5 ? 'Medium resolution (<3.5Å)' :
                        'Low resolution (≥3.5Å)'
                      } />
                    )}
                    <a href={`https://www.rcsb.org/structure/${s.pdbId}`} target="_blank" rel="noopener noreferrer"
                      className="text-xs font-mono font-bold text-claude-accent dark:text-claude-accent-hover hover:underline"
                      onClick={(e) => e.stopPropagation()}>
                      {s.pdbId}
                    </a>
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-medium ${methodStyle.bg} ${methodStyle.text} ${methodStyle.border} border`}>
                      {getMethodLabel(s.method || '')}
                    </span>
                    {s.resolution != null && (
                      <span className="text-[10px] text-claude-text-muted font-mono ml-auto">
                        {s.resolution.toFixed(2)}Å
                      </span>
                    )}
                  </div>
                  {s.title && (
                    <div className="text-[11px] text-claude-text-secondary leading-snug line-clamp-2">{s.title}</div>
                  )}
                  {s.organism && (
                    <div className="text-[10px] text-claude-text-muted mt-1">{s.organism}</div>
                  )}
                </div>
              );
            })
          )}
        </div>
      );

      // Inline BLAST tab content
      const evalBlastTab = (
        <div className="space-y-2">
          {selectedEval.blastResults.length === 0 ? (
            <div className="text-xs text-claude-text-muted py-4 text-center">No BLAST results found</div>
          ) : (
            selectedEval.blastResults.map((b) => {
              const methodStyle = getMethodColor(b.method || '');
              const identityColor = b.identity != null
                ? b.identity >= 90 ? 'text-green-600 dark:text-green-400'
                  : b.identity >= 70 ? 'text-teal-600 dark:text-teal-400'
                  : b.identity >= 50 ? 'text-amber-600 dark:text-amber-400'
                  : 'text-red-500 dark:text-red-400'
                : 'text-claude-text-muted';
              const evalueNum = b.evalue != null ? parseFloat(b.evalue) : null;
              const evalueFormatted = evalueNum != null
                ? evalueNum === 0 ? '0'
                  : evalueNum < 0.001 ? evalueNum.toExponential(1)
                  : evalueNum.toFixed(2)
                : '—';
              return (
                <div key={b.id} className="p-2.5 rounded-lg border border-claude-border/60 dark:border-[#3d3832]/60 bg-claude-border-light/30 dark:bg-[#1a1917]/30 hover:bg-claude-border-light/60 dark:hover:bg-[#2b2926]/60 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedEvalStructure({
                      ...b,
                      _type: 'blast' as const,
                      ifTier: b.ifTier || '',
                      journalIf: b.journalIf ?? null,
                      title: b.title || b.description || null,
                      releaseDate: b.releaseDate || null,
                      pubmedId: b.pubmedId || null,
                      pubmedTitle: b.pubmedTitle || null,
                      pubmedAuthors: b.pubmedAuthors || null,
                      pubmedAbstract: b.pubmedAbstract || null,
                    });
                  }}>
                  <div className="flex items-center gap-2 mb-1">
                    <a href={`https://www.rcsb.org/structure/${b.pdbId}`} target="_blank" rel="noopener noreferrer"
                      className="text-xs font-mono font-bold text-claude-accent dark:text-claude-accent-hover hover:underline"
                      onClick={(e) => e.stopPropagation()}>
                      {b.pdbId}
                    </a>
                    {b.identity != null && (
                      <span className={`text-xs font-mono font-semibold ${identityColor}`}>
                        {b.identity.toFixed(1)}%
                      </span>
                    )}
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-medium ${methodStyle.bg} ${methodStyle.text} ${methodStyle.border} border`}>
                      {getMethodLabel(b.method || '')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-claude-text-muted">
                    <span>E-value: <span className="font-mono">{evalueFormatted}</span></span>
                    {b.resolution != null && (
                      <span>Resolution: <span className="font-mono">{b.resolution.toFixed(2)}Å</span></span>
                    )}
                  </div>
                  {b.description && (
                    <div className="text-[10px] text-claude-text-secondary mt-1 line-clamp-2">{b.description}</div>
                  )}
                </div>
              );
            })
          )}
        </div>
      );

      // Inline Report tab content
      const evalReportTab = (
        <div className="space-y-3">
          {evalReportContent ? (
            <div className="text-xs text-claude-text-secondary leading-relaxed whitespace-pre-wrap p-3 rounded-lg bg-claude-border-light/50 dark:bg-[#1a1917]/50 border border-claude-border/50 dark:border-[#3d3832]/50">
              <div className="markdown-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{evalReportContent}</ReactMarkdown>
              </div>
            </div>
          ) : selectedEval.report ? (
            <div className="text-xs text-claude-text-secondary leading-relaxed whitespace-pre-wrap p-3 rounded-lg bg-claude-border-light/50 dark:bg-[#1a1917]/50 border border-claude-border/50 dark:border-[#3d3832]/50">
              <div className="markdown-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedEval.report}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="text-xs text-claude-text-muted py-4 text-center">No report available</div>
          )}
        </div>
      );

      const evalDetailContent = (<>
          {/* Accent gradient top bar */}
          <div className="glass-detail-panel-accent" />
          {/* Noise texture overlay */}
          <div className="glass-noise-overlay" />
          {/* Header */}
          <div className="px-4 py-3 border-b border-claude-border dark:border-[#3d3832] flex items-center justify-between relative z-[1]">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-claude-accent" />
              <span className="font-mono font-bold text-sm text-claude-accent">{selectedEval.uniprotId}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setDetailPanelOpen(false); setSelectedEvalStructure(null); }} className="h-7 w-7 p-0 rounded-full bg-claude-border-light/80 dark:bg-[#2b2926]/80 hover:bg-red-100 dark:hover:bg-red-900/30 text-claude-text-muted hover:text-red-500 transition-all duration-200">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Tab buttons */}
          <div className="flex border-b border-claude-border dark:border-[#3d3832]">
            {evalTabNames.map(tab => (
              <button
                key={tab}
                onClick={() => setEvalDetailTab(tab)}
                className={`px-3 py-2 text-[11px] font-medium transition-colors ${
                  evalDetailTab === tab
                    ? 'text-claude-accent border-b-2 border-claude-accent'
                    : 'text-claude-text-muted hover:text-claude-text-secondary'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto preview-scroll p-4">
            {evalDetailTab === 'Summary' && <EvalSummary evaluation={selectedEval} comparisonEvaluations={allEvaluations.filter(e => e.uniprotId !== selectedEval.uniprotId)} />}
            {evalDetailTab === 'Structures' && evalStructuresTab}
            {evalDetailTab === 'BLAST' && evalBlastTab}
            {evalDetailTab === 'Report' && evalReportTab}
          </div>
      </>);

      return renderDetailPanelWrapper(evalDetailContent, () => { setDetailPanelOpen(false); setSelectedEvalStructure(null); });
    }

    // Weekly detail - enhanced with AI analysis, quality ring, PubMed abstract, etc.
    if (mode === 'weekly' && selectedEntry) {
      const qualityScore = computeQualityScore(selectedEntry);
      const qualityBorderClass = getQualityBorderClass(selectedEntry);

      const weeklyDetailContent = (<>
          {/* Accent gradient top bar */}
          <div className="glass-detail-panel-accent" />
          {/* Noise texture overlay */}
          <div className="glass-noise-overlay" />
          <div className="px-4 py-3 border-b border-claude-border dark:border-[#3d3832] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Atom className="h-4 w-4 text-claude-accent" />
              <span className="font-mono font-bold text-sm text-claude-accent">{selectedEntry.pdbId}</span>
              {/* Quality Score Ring */}
              <div className="relative">
                <QualityRing score={qualityScore.score} size={32} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[8px] font-bold text-claude-text">{qualityScore.score}</span>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setDetailPanelOpen(false)} className="h-7 w-7 p-0 rounded-full bg-claude-border-light/80 dark:bg-[#2b2926]/80 hover:bg-red-100 dark:hover:bg-red-900/30 text-claude-text-muted hover:text-red-500 transition-all duration-200">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto preview-scroll p-4 space-y-4 detail-scroll-container">
            {/* 3D Structure Preview */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Box className="h-3.5 w-3.5 text-claude-accent" />
                <span className="text-[10px] font-medium text-claude-text-muted uppercase tracking-wider">3D Structure</span>
              </div>
              <PdbThumbnailPreview
                pdbId={selectedEntry.pdbId || ''}
                title={selectedEntry.title ?? undefined}
                onClick={() => { setViewerModalPdbId(selectedEntry.pdbId); setViewerModalOpen(true); }}
              />
            </div>

            {/* Title */}
            <div>
              <div className="text-xs text-claude-text-muted mb-1">Title</div>
              <div className="text-sm text-claude-text font-medium leading-snug">{selectedEntry.title || '—'}</div>
            </div>

            {/* Quality Score Breakdown */}
            <div>
              <div className="text-xs text-claude-text-muted mb-2">Quality Score</div>
              <div className="flex items-center gap-4">
                <div className="relative score-ring-glow">
                  <QualityRing score={qualityScore.score} size={56} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-claude-text">{qualityScore.score}</span>
                  </div>
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-claude-text-muted">Resolution</span>
                    <span className="font-mono font-medium" style={{ color: qualityScore.resolution >= 25 ? '#2d8f8f' : qualityScore.resolution >= 15 ? '#c9872e' : '#e55a4f' }}>{qualityScore.resolution}/35</span>
                  </div>
                  <div className="h-1.5 bg-claude-border-light dark:bg-[#2b2926] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(qualityScore.resolution / 35) * 100}%`, backgroundColor: qualityScore.resolution >= 25 ? '#2d8f8f' : qualityScore.resolution >= 15 ? '#c9872e' : '#e55a4f' }} />
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-claude-text-muted">Method</span>
                    <span className="font-mono font-medium" style={{ color: qualityScore.method >= 20 ? '#2d8f8f' : qualityScore.method >= 15 ? '#c9872e' : '#e55a4f' }}>{qualityScore.method}/25</span>
                  </div>
                  <div className="h-1.5 bg-claude-border-light dark:bg-[#2b2926] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(qualityScore.method / 25) * 100}%`, backgroundColor: qualityScore.method >= 20 ? '#2d8f8f' : qualityScore.method >= 15 ? '#c9872e' : '#e55a4f' }} />
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-claude-text-muted">Impact</span>
                    <span className="font-mono font-medium" style={{ color: qualityScore.impact >= 20 ? '#2d8f8f' : qualityScore.impact >= 10 ? '#c9872e' : '#e55a4f' }}>{qualityScore.impact}/30</span>
                  </div>
                  <div className="h-1.5 bg-claude-border-light dark:bg-[#2b2926] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(qualityScore.impact / 30) * 100}%`, backgroundColor: qualityScore.impact >= 20 ? '#2d8f8f' : qualityScore.impact >= 10 ? '#c9872e' : '#e55a4f' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Method & Resolution */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-claude-text-muted mb-1">Method</div>
                <span className={`method-badge inline-flex px-2 py-0.5 rounded text-[11px] font-medium border ${
                  selectedEntry.isCryoem ? 'method-badge-cryoem bg-claude-cryoem-bg text-claude-cryoem border-claude-cryoem/30' :
                  selectedEntry.isXray ? 'method-badge-xray bg-claude-xray-bg text-claude-xray border-claude-xray/30' :
                  'method-badge-nmr bg-claude-nmr-bg text-claude-nmr border-claude-nmr/30'
                }`}>
                  {selectedEntry.method || 'Unknown'}
                </span>
              </div>
              <div>
                <div className="text-xs text-claude-text-muted mb-1">Resolution</div>
                <div className={`text-sm font-mono font-semibold ${
                  selectedEntry.resolution != null
                    ? selectedEntry.resolution <= 2.0 ? 'text-green-600 dark:text-green-400'
                      : selectedEntry.resolution <= 3.5 ? 'text-amber-600 dark:text-amber-400'
                      : 'text-red-500 dark:text-red-400'
                    : 'text-claude-text-muted'
                }`}>
                  {selectedEntry.resolution != null ? `${selectedEntry.resolution.toFixed(2)}Å` : '—'}
                </div>
              </div>
            </div>

            {/* Authors */}
            {selectedEntry.authors && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Users className="h-3 w-3 text-claude-text-muted" />
                  <span className="text-xs text-claude-text-muted">Authors</span>
                </div>
                <div className="text-xs text-claude-text-secondary leading-relaxed">{selectedEntry.authors}</div>
              </div>
            )}

            {/* Journal & IF */}
            <div>
              <div className="text-xs text-claude-text-muted mb-1">Journal</div>
              <div className="text-sm text-claude-text">{selectedEntry.journal || '—'}</div>
              {selectedEntry.journalIf != null && (
                <span className={`inline-flex mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  selectedEntry.ifTier === 'top' ? 'bg-claude-top-bg text-claude-top' :
                  selectedEntry.ifTier === 'high' ? 'bg-claude-high-bg text-claude-high' :
                  selectedEntry.ifTier === 'mid' ? 'bg-claude-mid-bg text-claude-mid' :
                  'bg-claude-low-bg text-claude-low'
                }`}>
                  IF: {selectedEntry.journalIf.toFixed(1)}
                </span>
              )}
            </div>

            {/* DOI as clickable link */}
            {selectedEntry.doi && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Link2 className="h-3 w-3 text-claude-text-muted" />
                  <span className="text-xs text-claude-text-muted">DOI</span>
                </div>
                <a
                  href={`https://doi.org/${selectedEntry.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-claude-accent dark:text-claude-accent-hover hover:underline break-all"
                >
                  {selectedEntry.doi}
                </a>
              </div>
            )}

            {/* Organism */}
            <div>
              <div className="text-xs text-claude-text-muted mb-1">Organism</div>
              <div className="text-sm text-claude-text">{selectedEntry.organisms || '—'}</div>
            </div>

            {/* Release Date */}
            <div>
              <div className="text-xs text-claude-text-muted mb-1">Release Date</div>
              <div className="text-sm text-claude-text">{formatDate(selectedEntry.releaseDate)}</div>
            </div>

            {/* Ligands */}
            {selectedEntry.ligands && (
              <div>
                <div className="text-xs text-claude-text-muted mb-1">Ligands</div>
                <div className="flex flex-wrap gap-1">
                  {selectedEntry.ligands.split(/[|;,]/).filter(Boolean).map((lig, i) => (
                    <span key={i} className="ligand-chip">{lig.trim()}</span>
                  ))}
                </div>
              </div>
            )}

            {/* PubMed Abstract */}
            {selectedEntry.pubmedAbstract && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <BookOpen className="h-3 w-3 text-claude-text-muted" />
                  <span className="text-xs text-claude-text-muted">PubMed Abstract</span>
                </div>
                <div className="text-xs text-claude-text-secondary leading-relaxed p-3 rounded-lg bg-claude-border-light/50 dark:bg-[#1a1917]/50 border border-claude-border/50 dark:border-[#3d3832]/50">
                  {selectedEntry.pubmedAbstract}
                </div>
              </div>
            )}

            {/* AI Analysis */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="h-3.5 w-3.5 text-claude-accent" />
                <span className="text-xs text-claude-text-muted font-medium uppercase tracking-wider">AI Analysis</span>
              </div>
              {aiAnalysisLoading ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-claude-border-light/50 dark:bg-[#1a1917]/50">
                  <Loader2 className="h-4 w-4 animate-spin text-claude-accent" />
                  <span className="text-xs text-claude-text-muted">Generating analysis...</span>
                </div>
              ) : aiAnalysis ? (
                <div className="space-y-3">
                  {aiAnalysis.sections.map((section) => (
                    <div key={section.id} className="p-3 rounded-lg bg-gradient-to-br from-claude-accent/5 to-purple-500/5 dark:from-claude-accent/10 dark:to-purple-500/10 border border-claude-accent/20 dark:border-claude-accent/30">
                      <div className={`text-[11px] font-semibold ${section.color} mb-1`}>
                        {section.title}
                      </div>
                      <div className="text-[11px] text-claude-text-secondary leading-relaxed whitespace-pre-line">
                        {section.content}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-claude-text-muted">Analysis not available</div>
              )}
            </div>

            {/* External Links */}
            <div className="pt-2 border-t border-claude-border dark:border-[#3d3832] space-y-2">
              <a href={`https://www.rcsb.org/structure/${selectedEntry.pdbId}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-claude-accent hover:underline">
                <Database className="h-3.5 w-3.5" /> View on RCSB PDB
              </a>
              {selectedEntry.doi && (
                <a href={`https://doi.org/${selectedEntry.doi}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-claude-accent hover:underline">
                  <FileText className="h-3.5 w-3.5" /> View DOI Publication
                </a>
              )}
              {selectedEntry.pubmedId && (
                <a href={`https://pubmed.ncbi.nlm.nih.gov/${selectedEntry.pubmedId}/`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-claude-accent hover:underline">
                  <ExternalLink className="h-3.5 w-3.5" /> View on PubMed
                </a>
              )}
            </div>
          </div>
      </>);

      return renderDetailPanelWrapper(weeklyDetailContent, () => setDetailPanelOpen(false));
    }

    return null;
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  // ALL modes now use the SAME unified layout structure
  return (
    <TooltipProvider delayDuration={300}>
    <div className="h-full w-full flex flex-col bg-claude-bg overflow-hidden">
      {/* Custom Toast Container */}
      <CustomToastContainer />
      {/* Scroll Progress */}
      <ScrollProgress mode={mode} />

      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <header className="header-gradient-border relative z-10 bg-claude-surface dark:bg-[#242220] flex-shrink-0 min-w-0">
        <HeaderParticles />
        <div className="relative z-10 px-4 py-2.5 flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-2.5 flex-shrink-0">
            {/* Mobile menu button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden h-8 w-8 p-0 text-claude-text-muted hover:text-claude-text"
                  onClick={() => setMobileMenuOpen(true)}
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>Menu</p></TooltipContent>
            </Tooltip>
            <div className="h-7 w-7 rounded-md bg-gradient-to-br from-claude-accent to-claude-accent-hover flex items-center justify-center shadow-sm">
              <Atom className="h-4 w-4 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="header-title text-sm font-bold text-claude-text leading-none">PDB Structure Tracker</h1>
              <p className="text-[10px] text-claude-text-muted leading-none mt-0.5">Protein Data Bank Weekly Monitor</p>
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="flex items-center bg-claude-border-light/60 dark:bg-[#2b2926]/60 backdrop-blur-sm rounded-xl p-1 ml-4 gap-1 border border-claude-border/30 dark:border-[#3d3832]/30">
            {MODE_TABS.map(tab => (
              <button
                key={tab.mode}
                onClick={() => handleModeSwitch(tab.mode)}
                className={`relative flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium transition-all duration-200 claude-focus-ring min-w-[96px] ${
                  mode === tab.mode
                    ? 'bg-claude-surface dark:bg-[#242220] text-claude-accent shadow-sm shadow-claude-accent/5 border border-claude-border/50 dark:border-[#3d3832]/50'
                    : 'text-claude-text-muted hover:text-claude-text-secondary hover:bg-claude-surface/50 dark:hover:bg-[#242220]/50'
                }`}
                title={`${tab.label} (${tab.shortcut})`}
              >
                <span className={`transition-colors duration-200 ${mode === tab.mode ? 'text-claude-accent' : 'text-claude-text-muted'}`}>
                  {tab.icon}
                </span>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden text-[11px]">{tab.labelCn}</span>
                {mode === tab.mode && (
                  <motion.div
                    layoutId="mode-tab-indicator"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-6 rounded-full bg-claude-accent"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Search (desktop) */}
          <div className="relative max-w-xs w-full hidden md:block">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-claude-text-muted" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder={
                mode === 'evaluation' ? 'Search evaluations...' :
                mode === 'literature' ? 'Search literature...' :
                'Search structures...'
              }
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-7 pl-8 pr-8 text-xs bg-claude-bg dark:bg-[#1a1917] border-claude-border dark:border-[#3d3832] input-focus-glow"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-claude-text-muted hover:text-claude-text">
                <X className="h-3 w-3" />
              </button>
            )}
            {/* Keyboard shortcut hint */}
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 hidden lg:inline-flex items-center gap-0.5 text-[9px] text-claude-text-muted bg-claude-border-light dark:bg-[#2b2926] px-1 py-0 rounded border border-claude-border dark:border-[#3d3832] pointer-events-none">
              {!searchQuery && '⌘K'}
            </kbd>
          </div>

          {/* Mobile search button (visible < md) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden h-7 w-7 p-0 text-claude-text-muted hover:text-claude-text active:scale-95 transition-transform duration-100"
                onClick={() => setMobileSearchOpen(true)}
              >
                <Search className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p>Search</p></TooltipContent>
          </Tooltip>

          {mode === 'weekly' && (
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={() => setShowSummary(!showSummary)}
                    className={`h-7 w-7 p-0 active:scale-95 transition-transform duration-100 ${showSummary ? 'text-claude-accent' : 'text-claude-text-muted hover:text-claude-text'}`}>
                    <BarChart3 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Summary Charts</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-claude-text-muted hover:text-claude-text active:scale-95 transition-transform duration-100">
                    <TrendingUp className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Trends</p></TooltipContent>
              </Tooltip>
            </div>
          )}

          {mode === 'literature' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm"
                  onClick={() => setLitShowCharts(!litShowCharts)}
                  className={`h-7 w-7 p-0 active:scale-95 transition-transform duration-100 ${litShowCharts ? 'text-claude-accent' : 'text-claude-text-muted hover:text-claude-text'}`}>
                  <BarChart3 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>Literature Charts</p></TooltipContent>
            </Tooltip>
          )}

          {/* Import Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm"
                onClick={() => setImportDialogOpen(true)}
                className="h-7 w-7 p-0 text-claude-text-muted hover:text-claude-text active:scale-95 transition-transform duration-100"
              >
                <Upload className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p>Import Data</p></TooltipContent>
          </Tooltip>

          {/* Notification Bell */}
          <NotificationBell />

          {/* Settings Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}
                className="h-7 w-7 p-0 text-claude-text-muted hover:text-claude-text active:scale-95 transition-transform duration-100">
                <Settings className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p>Settings</p></TooltipContent>
          </Tooltip>

          {mounted && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={() => setTheme(isDark ? 'light' : 'dark')}
                  className="h-7 w-7 p-0 text-claude-text-muted hover:text-claude-text active:scale-95 transition-transform duration-100">
                  {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>{isDark ? 'Light Mode' : 'Dark Mode'}</p></TooltipContent>
            </Tooltip>
          )}
        </div>
      </header>

      {/* ─── Breadcrumb Navigation ───────────────────────────────────────── */}
      <BreadcrumbNav
        mode={mode}
        weekLabel={selectedSnapshot?.replace('2025-', '')}
        entryId={selectedEntry?.pdbId}
        evalName={selectedEval?.proteinName}
        evalBatchName={evalBatches.find(b =>
          batchSubTargets[b.batchId]?.some(st => st.uniprotId === selectedEvalId)
        )?.title}
        litYear={litSelectedDate}
        litPmid={litSelectedPaper?.pmid}
        onModeClick={() => {
          // Reset to mode overview
          if (mode === 'weekly') {
            setSelectedEntry(null);
            setDetailPanelOpen(false);
          } else if (mode === 'evaluation') {
            setSelectedEvalId(null);
            setSelectedEval(null);
            setSelectedEvalStructure(null);
            setDetailPanelOpen(false);
          } else if (mode === 'literature') {
            setLitIsDetailOpen(false);
            setLitSelectedPaper(null);
          }
        }}
        onSubClick={() => {
          // Go back one level
          if (mode === 'weekly') {
            setSelectedEntry(null);
            setDetailPanelOpen(false);
          } else if (mode === 'evaluation') {
            // If viewing a structure detail, go back to eval tabs; else go back to eval list
            if (selectedEvalStructure) {
              setSelectedEvalStructure(null);
            } else {
              setSelectedEvalId(null);
              setSelectedEval(null);
              setDetailPanelOpen(false);
            }
          } else if (mode === 'literature') {
            setLitIsDetailOpen(false);
            setLitSelectedPaper(null);
          }
        }}
      />

      {/* Settings Panel */}
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={appSettings}
        updateSetting={updateSetting}
        updateSettings={updateSettings}
        resetSettings={resetSettings}
        toggleActivityType={toggleActivityType}
      />

      {/* ─── Body ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden min-w-0">
        {/* Sidebar (desktop only) */}
        {mode === 'weekly' && renderWeeklySidebar()}
        {mode === 'evaluation' && renderEvalSidebar()}
        {mode === 'literature' && renderLiteratureSidebar()}

        {/* Mobile Drawer Sidebar */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                onClick={() => setMobileMenuOpen(false)}
              />
              <motion.div
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed left-0 top-0 bottom-0 w-[280px] z-50 lg:hidden mobile-drawer-shadow"
              >
                {mode === 'weekly' && renderWeeklySidebar(true)}
                {mode === 'evaluation' && renderEvalSidebar(true)}
                {mode === 'literature' && renderLiteratureSidebar(true)}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Mobile Search Overlay */}
        <AnimatePresence>
          {mobileSearchOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/30 z-40 md:hidden"
                onClick={() => setMobileSearchOpen(false)}
              />
              <motion.div
                initial={{ y: -40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -40, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed top-0 left-0 right-0 z-50 md:hidden bg-claude-surface dark:bg-[#242220] border-b border-claude-border dark:border-[#3d3832] p-3 shadow-lg"
              >
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-claude-text-muted" />
                  <Input
                    autoFocus
                    type="text"
                    placeholder={
                      mode === 'evaluation' ? 'Search evaluations...' :
                      mode === 'literature' ? 'Search literature...' :
                      'Search structures...'
                    }
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="h-9 pl-10 pr-10 text-sm bg-claude-bg dark:bg-[#1a1917] border-claude-border dark:border-[#3d3832] input-focus-glow"
                  />
                  <button
                    onClick={() => { setMobileSearchOpen(false); setSearchQuery(''); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-claude-text-muted hover:text-claude-text"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <div ref={mainContentRef} className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {/* Toolbar (weekly only) */}
          {mode === 'weekly' && (
            <WeeklyPageControls
              activeFilter={activeFilter}
              onFilterChange={(f) => { setActiveFilter(f); setCurrentPage(1); }}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              sortField={sortField}
              sortDir={sortDir}
              onSort={handleSort}
              totalCount={filteredEntries.length}
              selectedWeek={selectedSnapshot}
              filteredEntries={filteredEntries}
            />
          )}
          {/* Toolbar (evaluation) */}
          {mode === 'evaluation' && (
            <EvalPageControls
              activeFilter={evalFilter}
              onFilterChange={(f) => { setEvalFilter(f); }}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              sortField={evalSortField}
              sortDir={evalSortDir}
              onSort={handleEvalSort}
              totalCount={filteredEvaluations.length}
              selectedEvalId={selectedEvalId}
              filteredEvaluations={filteredEvaluations}
            />
          )}

          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
              className="flex-1 flex flex-col min-h-0 overflow-hidden relative"
            >
              {mode === 'weekly' && (
                <div key="weekly" className="mode-content-enter flex flex-col min-h-0 flex-1 custom-scrollbar">
                  <WeeklyView
                    entries={entries}
                    snapshots={snapshots}
                    currentSnapshot={currentSnapshot}
                    loading={loading}
                    sortField={sortField}
                    sortDir={sortDir}
                    currentPage={currentPage}
                    pageSize={pageSize}
                    filteredEntries={filteredEntries}
                    paginatedEntries={paginatedEntries}
                    totalPages={totalPages}
                    bookmarks={bookmarks}
                    selectedEntryIds={selectedEntryIds}
                    highlightedRowId={highlightedRowId}
                    showSummary={showSummary}
                    showHeatmap={showHeatmap}
                    showTrend={showTrend}
                    weeklyDateFilter={weeklyDateFilter}
                    selectedSnapshot={selectedSnapshot}
                    onSort={handleSort}
                    onRowClick={handleRowClick}
                    onToggleBookmark={toggleBookmark}
                    onSelectEntries={setSelectedEntryIds}
                    onHighlightRow={setHighlightedRowId}
                    onSetShowSummary={setShowSummary}
                    onSetShowHeatmap={setShowHeatmap}
                    onSetShowTrend={setShowTrend}
                    onSetWeeklyDateFilter={setWeeklyDateFilter}
                    onSetCurrentPage={setCurrentPage}
                    onSetPageSize={setPageSize}
                  />
                </div>
              )}
              {mode === 'evaluation' && (
                <div key="eval" className="mode-content-enter flex flex-col min-h-0 flex-1 custom-scrollbar">
                  <EvaluationView
                    evaluations={evaluations}
                    allEvaluations={allEvaluations}
                    evalBatches={evalBatches}
                    batchSubTargets={batchSubTargets}
                    selectedEvalId={selectedEvalId}
                    selectedEval={selectedEval}
                    evalLoading={evalLoading}
                    evalSubView={evalSubView}
                    evalDetailTab={evalDetailTab}
                    selectedEvalStructure={selectedEvalStructure}
                    evalReportContent={evalReportContent}
                    detailPanelOpen={detailPanelOpen}
                    onSelectEvalId={setSelectedEvalId}
                    onSetEvalSubView={setEvalSubView}
                    onSetEvalDetailTab={setEvalDetailTab}
                    onSetSelectedEvalStructure={setSelectedEvalStructure}
                  />
                </div>
              )}
              {mode === 'literature' && (
                <div key="lit" className="mode-content-enter flex flex-col min-h-0 flex-1 overflow-y-auto custom-scrollbar">
                  <LiteratureView
                    stats={litStats}
                    papers={litPapers}
                    reports={litReports}
                    isLoading={litLoading}
                    showCharts={litShowCharts}
                    selectedDate={litSelectedDate}
                    externalSearch={searchQuery}
                    readingListFilter={litReadingListFilter}
                    paperNotesHook={paperNotesState}
                    openNotePmid={litOpenNotePmid}
                    paperTagsHook={paperTagsState}
                    tagFilter={litTagFilter}
                    sourceFilter={litSourceFilter}
                    onSourceFilterChange={() => setLitSourceFilter(litSourceFilter === 'all' ? 'daily' : 'all')}
                    ifFilter={litIfFilter}
                    onIfFilterChange={setLitIfFilter}
                    readingProgressHook={readingProgressState}
                    readingListHook={readingListState}
                    totalPapersCount={litPapers.length}
                    onToggleCharts={() => setLitShowCharts(!litShowCharts)}
                    onClearDateFilter={handleLitClearDateFilter}
                    onSelectPaper={handleLitSelectPaper}
                    hasActiveFilters={litHasActiveFilters || !!litReadingListFilter || !!litTagFilter}
                    onClearAllFilters={() => { handleLitClearAllFilters(); setLitReadingListFilter(null); setLitTagFilter(null); setLitSourceFilter('all'); setLitIfFilter('all'); }}
                    onClearReadingListFilter={() => setLitReadingListFilter(null)}
                    onOpenNote={setLitOpenNotePmid}
                    onTagFilterChange={setLitTagFilter}
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Scroll-to-Top FAB */}
        <ScrollToTop scrollContainerRef={mainContentRef} threshold={300} />

        {/* Weekly Bulk Actions Bar */}
        {mode === 'weekly' && selectedEntryIds.size > 0 && (
          <WeeklyBulkActions
            selectedCount={selectedEntryIds.size}
            totalCount={filteredEntries.length}
            onBookmarkAll={handleBookmarkAll}
            onExportSelected={handleExportSelected}
            onCompare={handleCompare}
            onClearSelection={handleClearSelection}
            canCompare={selectedEntryIds.size >= 2 && selectedEntryIds.size <= 4}
          />
        )}

        {/* Weekly Structure Compare Modal */}
        {mode === 'weekly' && compareMode && selectedEntryIds.size >= 2 && selectedEntryIds.size <= 4 && (
          <WeeklyStructureCompare
            entries={entries.filter(e => selectedEntryIds.has(e.pdbId))}
            onClose={() => setCompareMode(false)}
          />
        )}

        {/* Detail Panel */}
        <AnimatePresence>
          {renderDetailPanel()}
        </AnimatePresence>
      </div>

      {/* ─── Footer ──────────────────────────────────────────────────────── */}
      <footer className="relative flex-shrink-0 w-full max-w-full overflow-hidden">
        {/* Animated gradient line at top of footer (mode-specific accent) */}
        <motion.div
          className="h-px w-full"
          animate={{
            background: mode === 'weekly'
              ? 'linear-gradient(90deg, transparent, #2d8f8f, #c96442, #2d8f8f, transparent)'
              : mode === 'evaluation'
                ? 'linear-gradient(90deg, transparent, #7c5cbf, #c96442, #7c5cbf, transparent)'
                : 'linear-gradient(90deg, transparent, #c9872e, #c96442, #c9872e, transparent)',
          }}
          transition={{ duration: 0.3 }}
        />
        <div className="flex items-center justify-between px-4 py-1.5 border-t border-claude-border dark:border-[#3d3832] bg-claude-surface dark:bg-[#242220] text-[10px] text-claude-text-muted">
          <div className="flex items-center gap-2">
            <Atom className="h-3 w-3" />
            <span>PDB Tracker v2.0</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">
              {mode === 'weekly' ? `${filteredEntries.length} structures` :
               mode === 'evaluation' ? `${evaluations.length} evaluations` :
               `${litPapers.length} papers`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Mode icon indicator */}
            {mode === 'weekly' && <Database className="h-3 w-3 text-[#2d8f8f]" />}
            {mode === 'evaluation' && <Microscope className="h-3 w-3 text-[#7c5cbf]" />}
            {mode === 'literature' && <BookOpen className="h-3 w-3 text-[#c9872e]" />}
            <span className="hidden sm:inline capitalize">{mode}</span>
            <span className="hidden sm:inline text-claude-border dark:text-[#3d3832]">|</span>
            {/* Data freshness indicator */}
            {dataFetchedAt && (
              <span className="hidden sm:flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Updated {getTimeAgo(dataFetchedAt)}</span>
              </span>
            )}
            <span className="hidden sm:inline text-claude-border dark:text-[#3d3832]">|</span>
            <span className="hidden sm:inline">
              <kbd className="inline-flex items-center gap-0.5 text-[9px] bg-claude-border-light dark:bg-[#2b2926] px-1 py-0 rounded border border-claude-border dark:border-[#3d3832]">1</kbd>
              <kbd className="inline-flex items-center gap-0.5 text-[9px] bg-claude-border-light dark:bg-[#2b2926] px-1 py-0 rounded border border-claude-border dark:border-[#3d3832] ml-0.5">2</kbd>
              <kbd className="inline-flex items-center gap-0.5 text-[9px] bg-claude-border-light dark:bg-[#2b2926] px-1 py-0 rounded border border-claude-border dark:border-[#3d3832] ml-0.5">3</kbd>
              {' '}switch mode
            </span>
            <FooterClock />
            {/* Back to top button */}
            <AnimatePresence>
              {showBackToTop && (
                <motion.button
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="ml-1 h-5 w-5 rounded flex items-center justify-center text-claude-text-muted hover:text-claude-accent hover:bg-claude-accent/10 transition-colors"
                  title="Back to top"
                >
                  <ArrowUp className="h-3 w-3" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </footer>

      {/* ─── Command Palette ──────────────────────────────────────────────── */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onSwitchMode={handleModeSwitch}
        onToggleTheme={() => setTheme(isDark ? 'light' : 'dark')}
        onToggleCharts={() => {
          if (mode === 'literature') setLitShowCharts(!litShowCharts);
          else setShowSummary(!showSummary);
        }}
        currentMode={mode}
        isDark={isDark}
        onSelectPdbEntry={handleCommandSelectPdbEntry}
        onSelectEvaluation={handleCommandSelectEvaluation}
        onSelectPaper={handleCommandSelectPaper}
        evaluations={allEvaluations}
      />

      {/* ─── Weekly Report Modal ───────────────────────────────────────────── */}
      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        title={selectedReport?.title || ''}
        content={selectedReport?.content || ''}
      />

      {/* ─── Evaluation Report Generator ──────────────────────────────────── */}
      {selectedEval && (
        <EvalReportGenerator
          evaluation={selectedEval}
          isOpen={evalReportOpen}
          onClose={() => setEvalReportOpen(false)}
        />
      )}

      {/* Keyboard Hints Overlay */}
      <KeyboardHints
        open={keyboardHintsOpen}
        onClose={() => setKeyboardHintsOpen(false)}
      />

      {/* Data Import Dialog */}
      <DataImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        defaultType={mode === 'literature' ? 'pubmed' : 'pdb'}
      />

      {/* 3D Viewer Modal */}
      <PdbViewerModal
        pdbId={viewerModalPdbId}
        open={viewerModalOpen}
        onOpenChange={setViewerModalOpen}
      />
    </div>
    </TooltipProvider>
  );
}
