'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import type { PdbEntry, WeeklySnapshot, Evaluation } from '@/lib/pdb-types';
import { getMethodLabel } from '@/components/pdb-helpers';
import { safeNum } from '@/lib/pdb-utils';

export interface UseExportOptions {
  sortedEntries: PdbEntry[];
  paginatedEntries: PdbEntry[];
  selectedRows: Set<string>;
  selectedWeekId: string | null;
  selectedSnapshot: WeeklySnapshot | null;
  evaluations: Evaluation[];
  methodFilter: string;
  searchQuery: string;
  addNotification: (type: string, message: string, description?: string) => void;
  addActivity: (type: string, message: string) => void;
}

export interface UseExportReturn {
  handleExportCsv: () => void;
  handleExportJson: () => void;
  handleExportJsonFull: () => void;
  handleExportMarkdown: () => void;
  handleExportClipboard: () => void;
  handleExportSelectedCsv: () => void;
  handleExportSelectedJson: () => void;
  handleExportSelectedMarkdown: () => void;
  handleExportRowCsv: (entry: PdbEntry) => void;
  handleCopySelectedIds: () => void;
  handleCopyIdsNewline: () => void;
  handleCopyAsTsv: () => void;
}

function escapeCsv(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

const HEADERS_FULL = ['PDB ID', 'Method', 'Resolution', 'IF', 'Organism', 'Title', 'Date', 'Ligands'];

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function useExport({
  sortedEntries,
  paginatedEntries: _paginatedEntries,
  selectedRows,
  selectedWeekId,
  selectedSnapshot,
  evaluations,
  methodFilter,
  searchQuery,
  addNotification,
  addActivity,
}: UseExportOptions): UseExportReturn {

  // ── CSV Export ──
  const handleExportCsv = useCallback(() => {
    if (!sortedEntries.length) return;
    const rows = sortedEntries.map(entry => [
      escapeCsv(entry.pdbId),
      escapeCsv(getMethodLabel(entry.method)),
      entry.resolution != null ? String(entry.resolution) : '',
      entry.journalIf != null ? String(entry.journalIf) : '',
      escapeCsv(entry.organisms || ''),
      escapeCsv(entry.title || ''),
      escapeCsv(entry.releaseDate || ''),
      escapeCsv(entry.ligands || ''),
    ].join(','));
    const csv = [HEADERS_FULL.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `pdb-structures-${selectedWeekId || 'export'}.csv`);
    toast(`Exported ${sortedEntries.length} structures`, { description: 'Downloaded as CSV file' });
    addNotification('export', `Exported ${sortedEntries.length} structures as CSV`, 'Downloaded as CSV file');
    addActivity('export', `Exported ${sortedEntries.length} entries as CSV`);
  }, [sortedEntries, selectedWeekId, addNotification, addActivity]);

  // ── JSON Export ──
  const handleExportJson = useCallback(() => {
    if (!sortedEntries.length) return;
    const data = sortedEntries.map(entry => ({
      pdbId: entry.pdbId,
      method: getMethodLabel(entry.method),
      resolution: entry.resolution,
      impactFactor: entry.journalIf,
      organism: entry.organisms,
      title: entry.title,
      releaseDate: entry.releaseDate,
      ligands: entry.ligands,
      journal: entry.journal,
      doi: entry.doi,
      authors: entry.authors,
      ifTier: entry.ifTier,
    }));
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    downloadBlob(blob, `pdb-structures-${selectedWeekId || 'export'}.json`);
    toast(`Exported as JSON`, { description: `${sortedEntries.length} structures downloaded` });
    addNotification('export', `Exported ${sortedEntries.length} structures as JSON`, 'Downloaded as JSON file');
    addActivity('export', `Exported ${sortedEntries.length} entries as JSON`);
  }, [sortedEntries, selectedWeekId, addNotification, addActivity]);

  // ── JSON Full Export ──
  const handleExportJsonFull = useCallback(() => {
    if (!sortedEntries.length) return;
    const data = {
      metadata: {
        exportedAt: new Date().toISOString(),
        weekId: selectedWeekId,
        weekStart: selectedSnapshot?.weekStart || null,
        weekEnd: selectedSnapshot?.weekEnd || null,
        totalStructures: sortedEntries.length,
        snapshot: selectedSnapshot ? {
          cryoemCount: selectedSnapshot.cryoemCount,
          xrayCount: selectedSnapshot.xrayCount,
          nmrCount: selectedSnapshot.nmrCount,
          otherCount: selectedSnapshot.otherCount,
          cryoemAvgRes: selectedSnapshot.cryoemAvgRes,
          xrayAvgRes: selectedSnapshot.xrayAvgRes,
          topJournals: selectedSnapshot.topJournals,
          ifDist: selectedSnapshot.ifDist,
        } : null,
        evaluations: evaluations.length,
        filters: {
          methodFilter,
          searchQuery,
        },
      },
      entries: sortedEntries.map(entry => ({
        pdbId: entry.pdbId,
        method: entry.method,
        methodLabel: getMethodLabel(entry.method),
        resolution: entry.resolution,
        impactFactor: entry.journalIf,
        ifTier: entry.ifTier,
        organism: entry.organisms,
        title: entry.title,
        releaseDate: entry.releaseDate,
        fetchDate: entry.fetchDate,
        ligands: entry.ligands,
        journal: entry.journal,
        doi: entry.doi,
        pubmedId: entry.pubmedId,
        authors: entry.authors,
        weekId: entry.weekId,
        isCryoem: entry.isCryoem,
        isXray: entry.isXray,
      })),
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    downloadBlob(blob, `pdb-structures-${selectedWeekId || 'export'}-full.json`);
    toast(`Exported as JSON (Full)`, { description: `${sortedEntries.length} structures with metadata` });
    addNotification('export', `Exported ${sortedEntries.length} structures as JSON (Full)`, 'Downloaded with metadata');
    addActivity('export', `Exported ${sortedEntries.length} entries as JSON (Full)`);
  }, [sortedEntries, selectedWeekId, selectedSnapshot, evaluations, methodFilter, searchQuery, addNotification, addActivity]);

  // ── Markdown Table Export ──
  const handleExportMarkdown = useCallback(() => {
    if (!sortedEntries.length) return;
    const headers = ['PDB ID', 'Method', 'Resolution', 'IF', 'Organism', 'Title', 'Date'];
    const rows = sortedEntries.map(entry =>
      `| ${entry.pdbId} | ${getMethodLabel(entry.method)} | ${entry.resolution != null ? entry.resolution + 'Å' : '—'} | ${entry.journalIf != null ? safeNum(entry.journalIf, '—') : '—'} | ${(entry.organisms || '—').split('|')[0]?.trim() || '—'} | ${entry.title || '—'} | ${entry.releaseDate || '—'} |`
    );
    const separator = `| ${headers.map(() => '---').join(' | ')} |`;
    const md = [`| ${headers.join(' | ')} |`, separator, ...rows].join('\n');
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    downloadBlob(blob, `pdb-structures-${selectedWeekId || 'export'}.md`);
    toast(`Exported as Markdown`, { description: `${sortedEntries.length} structures as table` });
    addNotification('export', `Exported ${sortedEntries.length} structures as Markdown`, 'Downloaded as Markdown table');
    addActivity('export', `Exported ${sortedEntries.length} entries as Markdown`);
  }, [sortedEntries, selectedWeekId, addNotification, addActivity]);

  // ── Clipboard Export ──
  const handleExportClipboard = useCallback(() => {
    if (!sortedEntries.length) return;
    const rows = sortedEntries.map(entry => [
      entry.pdbId,
      getMethodLabel(entry.method),
      entry.resolution != null ? String(entry.resolution) : '',
      entry.journalIf != null ? String(entry.journalIf) : '',
      (entry.organisms || '').split('|')[0]?.trim() || '',
      entry.title || '',
      entry.releaseDate || '',
      entry.ligands || '',
    ].join('\t'));
    const tsv = [HEADERS_FULL.join('\t'), ...rows].join('\n');
    navigator.clipboard.writeText(tsv).then(() => {
      toast('Copied to clipboard', { description: `${sortedEntries.length} structures as tab-separated values` });
      addNotification('export', `Copied ${sortedEntries.length} structures to clipboard`, 'Tab-separated values ready to paste');
      addActivity('export', `Copied ${sortedEntries.length} entries to clipboard`);
    }).catch(() => {
      toast('Failed to copy', { description: 'Please try again or use download export' });
    });
  }, [sortedEntries, addNotification, addActivity]);

  // ── Selected CSV Export ──
  const handleExportSelectedCsv = useCallback(() => {
    const selectedEntries = sortedEntries.filter(e => selectedRows.has(e.pdbId));
    if (!selectedEntries.length) return;
    const rows = selectedEntries.map(entry => [
      escapeCsv(entry.pdbId),
      escapeCsv(getMethodLabel(entry.method)),
      entry.resolution != null ? String(entry.resolution) : '',
      entry.journalIf != null ? String(entry.journalIf) : '',
      escapeCsv(entry.organisms || ''),
      escapeCsv(entry.title || ''),
      escapeCsv(entry.releaseDate || ''),
      escapeCsv(entry.ligands || ''),
    ].join(','));
    const csv = [HEADERS_FULL.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `pdb-selected-${selectedWeekId || 'export'}.csv`);
    toast(`Exported ${selectedEntries.length} structures`, { description: 'Downloaded as CSV file' });
  }, [sortedEntries, selectedRows, selectedWeekId]);

  // ── Selected JSON Export ──
  const handleExportSelectedJson = useCallback(() => {
    const selectedEntries = sortedEntries.filter(e => selectedRows.has(e.pdbId));
    if (!selectedEntries.length) return;
    const data = selectedEntries.map(entry => ({
      pdbId: entry.pdbId,
      method: getMethodLabel(entry.method),
      resolution: entry.resolution,
      impactFactor: entry.journalIf,
      organism: entry.organisms,
      title: entry.title,
      releaseDate: entry.releaseDate,
      ligands: entry.ligands,
      journal: entry.journal,
    }));
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    downloadBlob(blob, `pdb-selected-${selectedWeekId || 'export'}.json`);
    toast(`Exported ${selectedEntries.length} structures`, { description: 'Downloaded as JSON file' });
  }, [sortedEntries, selectedRows, selectedWeekId]);

  // ── Selected Markdown Export ──
  const handleExportSelectedMarkdown = useCallback(() => {
    const selectedEntries = sortedEntries.filter(e => selectedRows.has(e.pdbId));
    if (!selectedEntries.length) return;
    const headers = ['PDB ID', 'Method', 'Resolution', 'IF', 'Organism', 'Title', 'Date'];
    const rows = selectedEntries.map(entry =>
      `| ${entry.pdbId} | ${getMethodLabel(entry.method)} | ${entry.resolution != null ? entry.resolution + 'Å' : '—'} | ${entry.journalIf != null ? safeNum(entry.journalIf, '—') : '—'} | ${(entry.organisms || '—').split('|')[0]?.trim() || '—'} | ${entry.title || '—'} | ${entry.releaseDate || '—'} |`
    );
    const separator = `| ${headers.map(() => '---').join(' | ')} |`;
    const md = [`| ${headers.join(' | ')} |`, separator, ...rows].join('\n');
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    downloadBlob(blob, `pdb-selected-${selectedWeekId || 'export'}.md`);
    toast(`Exported ${selectedEntries.length} structures`, { description: 'Downloaded as Markdown file' });
  }, [sortedEntries, selectedRows, selectedWeekId]);

  // ── Row CSV Export ──
  const handleExportRowCsv = useCallback((entry: PdbEntry) => {
    const rows = [[
      escapeCsv(entry.pdbId),
      escapeCsv(getMethodLabel(entry.method)),
      entry.resolution != null ? String(entry.resolution) : '',
      entry.journalIf != null ? String(entry.journalIf) : '',
      escapeCsv(entry.organisms || ''),
      escapeCsv(entry.title || ''),
      escapeCsv(entry.releaseDate || ''),
      escapeCsv(entry.ligands || ''),
    ].join(',')];
    const csv = [HEADERS_FULL.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `pdb-${entry.pdbId}.csv`);
    toast(`Exported ${entry.pdbId}`, { description: 'Downloaded as CSV file' });
  }, []);

  // ── Copy Selected IDs (space-separated) ──
  const handleCopySelectedIds = useCallback(() => {
    const ids = sortedEntries.filter(e => selectedRows.has(e.pdbId)).map(e => e.pdbId);
    if (!ids.length) return;
    navigator.clipboard.writeText(ids.join(' ')).then(() => {
      toast(`Copied ${ids.length} PDB IDs`, { description: 'Space-separated' });
    }).catch(() => toast('Copy failed'));
  }, [sortedEntries, selectedRows]);

  // ── Copy Selected IDs (newline-separated) ──
  const handleCopyIdsNewline = useCallback(() => {
    const ids = sortedEntries.filter(e => selectedRows.has(e.pdbId)).map(e => e.pdbId);
    if (!ids.length) return;
    navigator.clipboard.writeText(ids.join('\n')).then(() => {
      toast(`Copied ${ids.length} PDB IDs`, { description: 'One per line' });
    }).catch(() => toast('Copy failed'));
  }, [sortedEntries, selectedRows]);

  // ── Copy as TSV ──
  const handleCopyAsTsv = useCallback(() => {
    const selected = sortedEntries.filter(e => selectedRows.has(e.pdbId));
    if (!selected.length) return;
    const rows = selected.map(entry => [
      entry.pdbId,
      getMethodLabel(entry.method),
      entry.resolution != null ? String(entry.resolution) : '',
      entry.journalIf != null ? String(entry.journalIf) : '',
      (entry.organisms || '').split('|')[0]?.trim() || '',
      entry.title || '',
      entry.releaseDate || '',
      entry.ligands || '',
    ].join('\t'));
    const tsv = [HEADERS_FULL.join('\t'), ...rows].join('\n');
    navigator.clipboard.writeText(tsv).then(() => {
      toast(`Copied ${selected.length} structures as TSV`, { description: 'Tab-separated, ready for spreadsheets' });
    }).catch(() => toast('Copy failed'));
  }, [sortedEntries, selectedRows]);

  return {
    handleExportCsv,
    handleExportJson,
    handleExportJsonFull,
    handleExportMarkdown,
    handleExportClipboard,
    handleExportSelectedCsv,
    handleExportSelectedJson,
    handleExportSelectedMarkdown,
    handleExportRowCsv,
    handleCopySelectedIds,
    handleCopyIdsNewline,
    handleCopyAsTsv,
  };
}
