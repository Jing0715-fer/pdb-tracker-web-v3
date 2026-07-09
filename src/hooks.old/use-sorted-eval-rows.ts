'use client';

import { useMemo } from 'react';
import type {
  Evaluation,
  EvalPdbStructure,
  EvalBlastResult,
  EvalRow,
  SortDir,
} from '@/lib/pdb-types';
import { sortEvalEntries } from '@/lib/pdb-utils';
import type { BatchSubTarget } from '@/hooks/use-pdb-evaluation';

export interface ComplexEvalData {
  group: any;
  subEvals: Evaluation[];
  allStructures: (EvalPdbStructure & { _type: 'structure'; _sourceUniport: string })[];
  allBlasts: (EvalBlastResult & { _type: 'blast'; _sourceUniport: string })[];
  sharedStructureMap: Map<string, number>;
}

export interface UseSortedEvalRowsParams {
  selectedEval: Evaluation | null;
  selectedComplexId: string | null;
  complexEvalData: ComplexEvalData | null;
  selectedBatchId: string | null;
  evalBatchSubTargets: Record<string, BatchSubTarget[]>;
  evaluations: Evaluation[];
  batchFetchedEvals: Record<string, Evaluation>;
  sortField: string;
  sortDir: SortDir;
  batchUniprotSources: Map<string, string[]> | null;
}

export interface UseSortedEvalRowsReturn {
  sortedEvalRows: EvalRow[];
}

export function useSortedEvalRows(params: UseSortedEvalRowsParams): UseSortedEvalRowsReturn {
  const {
    selectedEval,
    selectedComplexId,
    complexEvalData,
    selectedBatchId,
    evalBatchSubTargets,
    evaluations,
    batchFetchedEvals,
    sortField,
    sortDir,
    batchUniprotSources,
  } = params;

  const sortedEvalRows = useMemo(() => {
    // If a batch eval is selected (without specific sub-eval), show merged data for the batch
    if (selectedBatchId && !selectedEval && !selectedComplexId) {
      const subs = evalBatchSubTargets[selectedBatchId] || [];
      const batchEvals = subs.map((sub: any) => evaluations.find(e => e.uniprotId === sub.uniprotId) || batchFetchedEvals[sub.uniprotId]).filter(Boolean) as Evaluation[];
      const allBlasts: (EvalBlastResult & { _type: 'blast'; _sourceUniport: string })[] = [];
      batchEvals.forEach(ev => {
        (ev.blastResults || []).forEach(b => allBlasts.push({ ...b, _type: 'blast', _sourceUniport: ev.uniprotId }));
      });
      const firstOccurrenceMap = new Map<string, string>(); // pdbId → first uniprotId
      const duplicatePdbIds = new Set<string>(); // pdbIds that appear in multiple sub-targets
      batchEvals.forEach(ev => {
        const pdbIds = (ev.pdbStructures || []).map((s: EvalPdbStructure) => s.pdbId);
        const seen = new Set<string>();
        pdbIds.forEach(pdbId => {
          if (seen.has(pdbId)) return; // skip duplicate within same eval
          seen.add(pdbId);
          if (firstOccurrenceMap.has(pdbId)) {
            duplicatePdbIds.add(pdbId); // appears in multiple sub-targets
          } else {
            firstOccurrenceMap.set(pdbId, ev.uniprotId);
          }
        });
      });
      // Build allStructures: only first occurrence per pdbId (deduplicated across sub-targets)
      const allStructures: (EvalPdbStructure & { _type: 'structure'; _sourceUniport: string })[] = [];
      const seenPdbIds = new Set<string>();
      batchEvals.forEach(ev => {
        (ev.pdbStructures || []).forEach((s: EvalPdbStructure) => {
          if (seenPdbIds.has(s.pdbId)) return; // skip duplicate
          seenPdbIds.add(s.pdbId);
          allStructures.push({ ...s, _type: 'structure' as const, _sourceUniport: ev.uniprotId });
        });
      });
      // Build shared structure map: PDB ID → count of sub-targets it appears in
      const batchSharedStructureMap = new Map<string, number>();
      batchEvals.forEach(ev => {
        const pdbIds = new Set((ev.pdbStructures || []).map((s: EvalPdbStructure) => s.pdbId));
        pdbIds.forEach(pdbId => {
          batchSharedStructureMap.set(pdbId, (batchSharedStructureMap.get(pdbId) || 0) + 1);
        });
      });
      // Deduplicate: remove BLAST entries whose pdbId already exists in structures
      const structurePdbIds = new Set(allStructures.map(s => s.pdbId));
      const filteredBlasts = allBlasts.filter(b => !structurePdbIds.has(b.pdbId ?? ''));
      const all = [...allStructures, ...filteredBlasts];
      // Attach shared count and first occurrence uniprot to each row
      all.forEach(row => {
        (row as any)._sharedCount = batchSharedStructureMap.get(row.pdbId ?? "") || 0;
        (row as any)._firstUniport = firstOccurrenceMap.get(row.pdbId ?? "") || ((row as any)._sourceUniport ?? "");
        (row as any)._allSources = batchUniprotSources?.get(row.pdbId ?? "") || [row._sourceUniport ?? ""];
      });
      // Final deduplicate: same pdbId only once (prefer structure over blast)
      // When both are same type (both blast), prefer the one with more info (method, resolution, title)
      const finalDeduped = all.reduce((acc: typeof all, row) => {
        if (!row.pdbId) return acc;
        const existingIdx = acc.findIndex(r => r.pdbId === row.pdbId);
        if (existingIdx === -1) { acc.push(row); return acc; }
        // Prefer structure over blast
        if (row._type === 'structure' && acc[existingIdx]._type === 'blast') {
          acc.splice(existingIdx, 1, row);
          return acc;
        }
        // If same type (both blast or both structure) and existing has less info, replace with better one
        if (row._type === acc[existingIdx]._type) {
          const existing = acc[existingIdx];
          const existingScore = (existing.method ? 1 : 0) + (existing.resolution != null ? 1 : 0) + (existing.title ? 1 : 0) + (existing.ligand ? 1 : 0);
          const newScore = (row.method ? 1 : 0) + (row.resolution != null ? 1 : 0) + (row.title ? 1 : 0) + (row.ligand ? 1 : 0);
          if (newScore > existingScore) {
            acc.splice(existingIdx, 1, row);
          }
        }
        return acc;
      }, []);
      return sortEvalEntries(finalDeduped, sortField, sortDir);
    }
    // If a sub-target is selected within a complex group, show only that target's PDB list
    if (selectedComplexId && selectedEval && complexEvalData) {
      const structures: (EvalPdbStructure & { _type: 'structure' })[] =
        (selectedEval.pdbStructures || []).map(s => ({ ...s, _type: 'structure' as const }));
      const structurePdbIds = new Set(structures.map(s => s.pdbId));
      const blasts: (EvalBlastResult & { _type: 'blast' })[] =
        (selectedEval.blastResults || []).filter(b => !structurePdbIds.has(b.pdbId ?? "")).map(b => ({ ...b, _type: 'blast' as const }));
      const all = [...structures, ...blasts];
      all.forEach(row => { (row as any)._sharedCount = 0; });
      return sortEvalEntries(all, sortField, sortDir);
    }
    // If a complex group is selected (no sub-target), show merged data for all sub-targets
    if (selectedComplexId && complexEvalData) {
      // Deduplicate: remove BLAST entries whose pdbId already exists in structures
      const structurePdbIds = new Set(complexEvalData.allStructures.map(s => s.pdbId));
      const filteredBlasts = complexEvalData.allBlasts.filter(b => !structurePdbIds.has(b.pdbId ?? ""));
      const all = [...complexEvalData.allStructures, ...filteredBlasts];
      all.forEach(row => { (row as any)._sharedCount = 0; });
      return sortEvalEntries(all, sortField, sortDir);
    }

    if (!selectedEval) return [];
    const structures: (EvalPdbStructure & { _type: 'structure' })[] =
      (selectedEval.pdbStructures || []).map(s => ({ ...s, _type: 'structure' as const }));
    const structurePdbIds = new Set(structures.map(s => s.pdbId));
    const blasts: (EvalBlastResult & { _type: 'blast' })[] =
      (selectedEval.blastResults || []).filter(b => !structurePdbIds.has(b.pdbId ?? "")).map(b => ({ ...b, _type: 'blast' as const }));

    const all = [...structures, ...blasts];
    all.forEach(row => { (row as any)._sharedCount = 0; });
    return sortEvalEntries(all, sortField, sortDir);
  }, [selectedEval, selectedComplexId, complexEvalData, selectedBatchId, evalBatchSubTargets, evaluations, batchFetchedEvals, sortField, sortDir, batchUniprotSources]);

  return { sortedEvalRows };
}
