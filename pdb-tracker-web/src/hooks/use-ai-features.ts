'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import type { PdbEntry, WeeklySnapshot } from '@/lib/pdb-types';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface UseAiFeaturesParams {
  selectedWeekId: string | null;
  entries: PdbEntry[];
  snapshots: WeeklySnapshot[];
}

export interface UseAiFeaturesReturn {
  aiSummaries: Record<string, string>;
  aiSummaryLoading: string | null;
  aiSummaryError: string | null;
  aiInsight: string;
  aiInsightLoading: boolean;
  generateAiSummary: (entry: PdbEntry) => Promise<void>;
  generateInsight: () => Promise<void>;
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useAiFeatures({ selectedWeekId, entries, snapshots }: UseAiFeaturesParams): UseAiFeaturesReturn {
  // ── AI Summaries Cache ──
  const [aiSummaries, setAiSummaries] = useState<Record<string, string>>({});
  const [aiSummaryLoading, setAiSummaryLoading] = useState<string | null>(null);
  const [aiSummaryError, setAiSummaryError] = useState<string | null>(null);

  // ── AI Weekly Insight ──
  const [aiInsight, setAiInsight] = useState<string>('');
  const [aiInsightLoading, setAiInsightLoading] = useState(false);

  // ── AI Summary Generation ──
  const generateAiSummary = useCallback(async (entry: PdbEntry) => {
    if (aiSummaryLoading === entry.pdbId) return;
    setAiSummaryLoading(entry.pdbId);
    setAiSummaryError(null);
    try {
      const response = await fetch('/api/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdbId: entry.pdbId,
          title: entry.title,
          method: entry.method,
          resolution: entry.resolution,
          journal: entry.journal,
          journalIf: entry.journalIf,
          organisms: entry.organisms,
          ligands: entry.ligands,
        }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to generate summary');
      }
      const data = await response.json();
      setAiSummaries(prev => ({ ...prev, [entry.pdbId]: data.summary }));
    } catch (err: any) {
      setAiSummaryError(err?.message || 'Failed to generate AI summary');
      toast('AI Summary Error', { description: err?.message || 'Failed to generate summary' });
    } finally {
      setAiSummaryLoading(null);
    }
  }, [aiSummaryLoading]);

  // ── AI Weekly Insight ──
  const generateInsight = useCallback(async () => {
    if (aiInsightLoading) return;
    setAiInsightLoading(true);
    try {
      const latestSnap = snapshots[0];
      if (!latestSnap) {
        setAiInsight('No weekly data available yet.');
        setAiInsightLoading(false);
        return;
      }
      const totalCount = latestSnap.totalStructures || 0;
      const cryoemCount = latestSnap.cryoemCount || 0;
      const xrayCount = latestSnap.xrayCount || 0;
      const nmrCount = latestSnap.nmrCount || 0;
      const otherCount = latestSnap.otherCount || 0;
      const avgRes = latestSnap.cryoemAvgRes != null && latestSnap.xrayAvgRes != null
        ? ((latestSnap.cryoemAvgRes * latestSnap.cryoemCount + latestSnap.xrayAvgRes * latestSnap.xrayCount) / (latestSnap.cryoemCount + latestSnap.xrayCount)).toFixed(1)
        : latestSnap.cryoemAvgRes?.toFixed(1) ?? latestSnap.xrayAvgRes?.toFixed(1) ?? 'N/A';
      const topJournals = latestSnap.topJournals ? latestSnap.topJournals.split('|').filter(Boolean) : [];
      const methodBreakdown = [
        cryoemCount > 0 ? `${cryoemCount} Cryo-EM` : '',
        xrayCount > 0 ? `${xrayCount} X-ray` : '',
        nmrCount > 0 ? `${nmrCount} NMR` : '',
        otherCount > 0 ? `${otherCount} Other` : '',
      ].filter(Boolean).join(', ');

      // Compute top organism from current week entries
      const weekEntries = entries.filter(e => e.weekId === latestSnap.weekId);
      const orgCounts: Record<string, number> = {};
      for (const e of weekEntries) {
        if (e.organisms) {
          for (const org of e.organisms.split(';').map(o => o.trim()).filter(Boolean)) {
            orgCounts[org] = (orgCounts[org] || 0) + 1;
          }
        }
      }
      const topOrg = Object.entries(orgCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
      const topJournal = topJournals[0];

      const fallback = `${totalCount} structures this week — ${methodBreakdown}. Avg resolution: ${avgRes}Å.${topOrg ? ` Top organism: ${topOrg}.` : ''}${topJournal ? ` Top journal: ${topJournal}.` : ''}`;

      try {
        const response = await fetch('/api/ai-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `Provide a 2-3 sentence weekly insight about PDB structures. This week (${latestSnap.weekId}): ${totalCount} structures — ${methodBreakdown}. Average resolution: ${avgRes}Å.${topOrg ? ` Top organism: ${topOrg}.` : ''}${topJournal ? ` Top journal: ${topJournal}.` : ''} Highlight notable trends or patterns.`,
          }),
        });
        if (!response.ok) throw new Error('API failed');
        const data = await response.json();
        setAiInsight(data.summary || fallback);
      } catch {
        setAiInsight(fallback);
      }
    } catch {
      setAiInsight('Unable to generate insight at this time.');
    } finally {
      setAiInsightLoading(false);
    }
  }, [aiInsightLoading, snapshots, entries]);

  // ── Auto-generate AI Insight on week change (debounced 3s) ──
  const lastAutoInsightWeek = useRef<string | null>(null);
  const autoInsightTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!selectedWeekId || entries.length === 0) return;
    if (lastAutoInsightWeek.current === selectedWeekId) return;

    // Debounce 3s after week change
    autoInsightTimerRef.current = setTimeout(() => {
      lastAutoInsightWeek.current = selectedWeekId;
      generateInsight();
    }, 3000);

    return () => {
      if (autoInsightTimerRef.current) clearTimeout(autoInsightTimerRef.current);
    };
  }, [selectedWeekId, entries.length, generateInsight]);

  return {
    aiSummaries,
    aiSummaryLoading,
    aiSummaryError,
    aiInsight,
    aiInsightLoading,
    generateAiSummary,
    generateInsight,
  };
}
