'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import type { WeeklySnapshot, PdbEntry } from '@/lib/pdb-types';

// ── Local type (mirrored from pdb-tracker.tsx) ────────────────────────────────
export interface WeeklyReport {
  id: number;
  weekId: string;
  weekStart: string | null;
  weekEnd: string | null;
  reportType: string;
  title: string | null;
  filename: string | null;
  createdAt: string;
}

// ── Hook parameters ───────────────────────────────────────────────────────────
interface UseDataFetchingParams {
  mode: string;
  selectedWeekId: string | null;
  methodFilter: string;
  previewTab: string;
  /** Called after entries are fetched from the API (used for pulsing row animation). */
  onEntriesLoaded?: () => void;
}

// ── Hook return value ─────────────────────────────────────────────────────────
interface UseDataFetchingReturn {
  snapshots: WeeklySnapshot[];
  entries: PdbEntry[];
  weeklyReports: WeeklyReport[];
  heatmapEntries: PdbEntry[];
  loadingSnapshots: boolean;
  loadingEntries: boolean;
  heatmapLoading: boolean;
  refetchEntries: () => Promise<void>;
}

export function useDataFetching({
  mode,
  selectedWeekId,
  methodFilter,
  previewTab,
  onEntriesLoaded,
}: UseDataFetchingParams): UseDataFetchingReturn {
  const [snapshots, setSnapshots] = useState<WeeklySnapshot[]>([]);
  const [entries, setEntries] = useState<PdbEntry[]>([]);
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);
  const [heatmapEntries, setHeatmapEntries] = useState<PdbEntry[]>([]);
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [loadingSnapshots, setLoadingSnapshots] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(false);

  // ── Fetch Snapshots ──
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/snapshots');
        const data = await res.json();
        setSnapshots(data);
        if (data.length > 0 && !selectedWeekId) {
          // We cannot setSelectedWeekId here because that setter lives in
          // the navigation hook. Instead we rely on the navigation hook's
          // own initialisation logic. The effect simply populates the list.
        }
      } catch (e) { console.error('Failed to fetch snapshots:', e); }
      finally { setLoadingSnapshots(false); }
    }
    load();
  // Intentionally empty deps: fetch snapshots once on mount
  }, []);

  // ── Fetch Weekly Entries ──
  useEffect(() => {
    if (mode !== 'weekly') return;
    let cancelled = false;
    async function load() {
      setLoadingEntries(true);
      try {
        const params = new URLSearchParams();
        if (selectedWeekId) params.set('week', selectedWeekId);
        if (methodFilter !== 'all') params.set('method', methodFilter);
        // Note: search query not sent to API — we filter client-side to support notes search
        const res = await fetch(`/api/entries?${params}`);
        if (!cancelled) {
          const data = await res.json();
          setEntries(data);
          onEntriesLoaded?.();
        }
      } catch (e) { console.error('Failed to fetch entries:', e); }
      finally { if (!cancelled) setLoadingEntries(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [mode, selectedWeekId, methodFilter, onEntriesLoaded]);

  // ── Fetch All Entries for Heatmap ──
  useEffect(() => {
    if (mode !== 'weekly' || (previewTab !== 'heatmap' && previewTab !== 'timeline')) return;
    if (heatmapEntries.length > 0) return; // already loaded
    let cancelled = false;
    async function load() {
      setHeatmapLoading(true);
      try {
        const res = await fetch('/api/entries?limit=5000');
        if (!cancelled) {
          const data = await res.json();
          setHeatmapEntries(data);
        }
      } catch (e) { console.error('Failed to fetch heatmap entries:', e); }
      finally { if (!cancelled) setHeatmapLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [mode, previewTab, heatmapEntries.length]);

  // ── Fetch Weekly Reports ──
  useEffect(() => {
    if (mode !== 'weekly' || !selectedWeekId) return;
    async function load() {
      try {
        const res = await fetch('/api/reports');
        const data: WeeklyReport[] = await res.json();
        // Match reports by filename containing weekId (e.g., "W18" in "冷冻电镜结构周报-W18-2026-04-29.md")
        // Also match by weekId (date format, e.g., "2026-05-13") for older reports
        const snap = snapshots.find(s => s.weekId === selectedWeekId);
        setWeeklyReports(snap ? data.filter(r => {
          // Match by filename containing week ID (W18, W19, etc.)
          if (r.filename && selectedWeekId && r.filename.includes(selectedWeekId)) return true;
          // Also match by weekId date string
          if (r.weekId === snap.weekEnd) return true;
          return false;
        }) : []);
      } catch (e) { console.error('Failed to fetch reports:', e); }
    }
    load();
  }, [mode, selectedWeekId, snapshots]);

  // ── Refetch entries (used by LiteratureSection after PubMed metadata fetch) ──
  const refetchEntries = useCallback(async () => {
    if (mode !== 'weekly') return;
    setLoadingEntries(true);
    try {
      const params = new URLSearchParams();
      if (selectedWeekId) params.set('week', selectedWeekId);
      if (methodFilter !== 'all') params.set('method', methodFilter);
      const res = await fetch(`/api/entries?${params}`);
      const data = await res.json();
      setEntries(data);
      const fetchedCount = data.filter((e: any) => e.pubmedTitle).length;
      const totalWithPmid = data.filter((e: any) => e.pubmedId).length;
      if (fetchedCount > 0) {
        toast('PubMed metadata enriched', {
          description: `${fetchedCount}/${totalWithPmid} papers now have full metadata`,
        });
      }
    } catch (e) { console.error('Failed to refetch entries:', e); }
    finally { setLoadingEntries(false); }
  }, [mode, selectedWeekId, methodFilter]);

  return {
    snapshots,
    entries,
    weeklyReports,
    heatmapEntries,
    loadingSnapshots,
    loadingEntries,
    heatmapLoading,
    refetchEntries,
  };
}
