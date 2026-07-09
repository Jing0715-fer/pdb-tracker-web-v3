'use client';

import { useState, useEffect, useMemo } from 'react';
import type { PdbEntry, WeeklySnapshot } from '@/lib/pdb-types';

export interface DiffResult {
  newIds: Set<string>;
  removedIds: Set<string>;
  unchangedIds: Set<string>;
  removedEntries: PdbEntry[];
}

export interface UseDiffModeOptions {
  selectedWeekId: string | null;
  snapshots: WeeklySnapshot[];
  entries: PdbEntry[];
}

export interface UseDiffModeReturn {
  diffMode: boolean;
  setDiffMode: React.Dispatch<React.SetStateAction<boolean>>;
  prevWeekEntries: PdbEntry[];
  prevWeekId: string | null;
  diffResult: DiffResult;
}

export function useDiffMode({
  selectedWeekId,
  snapshots,
  entries,
}: UseDiffModeOptions): UseDiffModeReturn {
  const [diffMode, setDiffMode] = useState(false);
  const [prevWeekEntries, setPrevWeekEntries] = useState<PdbEntry[]>([]);

  // ── Find previous week for Diff Mode ──
  const prevWeekId = useMemo(() => {
    if (!diffMode || !selectedWeekId || snapshots.length === 0) return null;
    const sorted = [...snapshots].sort((a, b) => a.weekId.localeCompare(b.weekId));
    const currentIdx = sorted.findIndex(s => s.weekId === selectedWeekId);
    if (currentIdx <= 0) return null; // No previous week
    return sorted[currentIdx - 1].weekId;
  }, [diffMode, selectedWeekId, snapshots]);

  // ── Fetch Previous Week Entries for Diff Mode ──
  useEffect(() => {
    if (!diffMode || !prevWeekId) { return; }
    let cancelled = false;
    async function load() {
      try {
        const params = new URLSearchParams();
        params.set('week', prevWeekId ?? '');
        const res = await fetch(`/api/entries?${params}`);
        if (!cancelled) {
          const data = await res.json();
          setPrevWeekEntries(data);
        }
      } catch (e) { console.error('Failed to fetch previous week entries for diff:', e); }
    }
    load();
    return () => { cancelled = true; };
  }, [diffMode, prevWeekId]);

  // ── Diff Computation ──
  const diffResult = useMemo((): DiffResult => {
    if (!diffMode || !selectedWeekId || prevWeekEntries.length === 0 && entries.length === 0) {
      return { newIds: new Set<string>(), removedIds: new Set<string>(), unchangedIds: new Set<string>(), removedEntries: [] };
    }
    const currentIds = new Set(entries.map(e => e.pdbId));
    const prevIds = new Set(prevWeekEntries.map(e => e.pdbId));
    const newIds = new Set([...currentIds].filter(id => !prevIds.has(id)));
    const removedIds = new Set([...prevIds].filter(id => !currentIds.has(id)));
    const unchangedIds = new Set([...currentIds].filter(id => prevIds.has(id)));
    const removedEntries = prevWeekEntries.filter(e => removedIds.has(e.pdbId));
    return { newIds, removedIds, unchangedIds, removedEntries };
  }, [diffMode, selectedWeekId, entries, prevWeekEntries]);

  return {
    diffMode,
    setDiffMode,
    prevWeekEntries,
    prevWeekId,
    diffResult,
  };
}
