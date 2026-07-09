'use client';

import React from 'react';
import type { PdbEntry, EvalPdbStructure, EvalBlastResult, LigandInfo } from '@/lib/pdb-types';
import { safeNum, escapeHtml } from '@/lib/pdb-utils';
import { parseLigands, getMethodColor, getMethodLabel, getResolutionColor, formatDate, formatEvalue, getIdentityColor } from '@/components/pdb-helpers';

// ─── PDB Tooltip Component ───────────────────────────────────────────────────

export function PdbTooltipContent({ entry }: { entry: PdbEntry | EvalPdbStructure }) {
  // Support both 'ligands' (weekly) and 'ligand' (eval/BLAST) field names
  const ligandString = 'ligands' in entry ? entry.ligands : ('ligand' in entry ? entry.ligand : null);
  const ligandList = parseLigands(ligandString);
  const method = entry.method || '';
  const methodColors = getMethodColor(method);

  return (
    <div className="w-[320px] sm:w-[400px] p-3 space-y-2">
      <div className="flex items-start gap-2">
        <img
          src={`https://cdn.rcsb.org/images/structures/${entry.pdbId.toLowerCase()}_assembly-1.jpeg`}
          alt={entry.pdbId}
          className="w-24 h-24 sm:w-40 sm:h-40 rounded-md bg-claude-border-light dark:bg-[#3d3832] object-cover flex-shrink-0 border border-claude-border-light dark:border-[#3d3832]"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono font-semibold text-claude-text dark:text-[#e8e4dd] text-sm">{entry.pdbId}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${methodColors.bg} ${methodColors.text}`}>
              {getMethodLabel(method)}
            </span>
          </div>
          <p className="text-xs text-claude-text-secondary dark:text-[#9b9590] line-clamp-2 leading-relaxed">
            {entry.title}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {entry.resolution != null && (
          <div>
            <span className="text-claude-text-muted dark:text-[#6b6560]">Resolution:</span>{' '}
            <span className={`font-medium ${getResolutionColor(entry.resolution)}`}>{entry.resolution}Å</span>
          </div>
        )}
        <div>
          <span className="text-claude-text-muted dark:text-[#6b6560]">Date:</span>{' '}
          <span className="text-claude-text-secondary dark:text-[#9b9590]">{formatDate(entry.releaseDate)}</span>
        </div>
        {'journal' in entry && entry.journal && (
          <div className="col-span-2">
            <span className="text-claude-text-muted dark:text-[#6b6560]">Journal:</span>{' '}
            <span className="text-claude-text-secondary dark:text-[#9b9590]">{entry.journal}</span>
            {entry.journalIf && <span className="text-claude-text-muted dark:text-[#6b6560] ml-1">({safeNum(entry.journalIf, '—')})</span>}
          </div>
        )}
      </div>
      {ligandList.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {ligandList.slice(0, 6).map((l, i) => (
            <span key={`tt-lig-${i}-${l}`} className="ligand-chip">{l}</span>
          ))}
          {ligandList.length > 6 && <span className="text-[10px] text-claude-text-muted dark:text-[#6b6560]">+{ligandList.length - 6}</span>}
        </div>
      )}
    </div>
  );
}

// ─── Ligand Tooltip Component ────────────────────────────────────────────────

export function LigandTooltipContent({ ligand }: { ligand: LigandInfo }) {
  return (
    <div className="w-72 p-3 space-y-2">
      <div className="flex items-start gap-3">
        <div className="w-24 h-24 rounded-lg bg-white dark:bg-[#1a1917] border border-claude-border dark:border-[#3d3832] flex-shrink-0 flex items-center justify-center overflow-hidden p-1">
          <img
            src={ligand.imageUrl || undefined}
            alt={ligand.name || 'Ligand'}
            className="max-w-full max-h-full object-contain"
            loading="lazy"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.style.display = 'none';
              const parent = img.parentElement;
              if (parent) {
                parent.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:#9b9590;font-size:10px;font-family:monospace;text-align:center;padding:4px">' + escapeHtml(ligand.code) + '</div>';
              }
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-claude-text dark:text-[#e8e4dd] text-sm font-mono">{ligand.code}</div>
          <div className="text-xs text-claude-text-secondary dark:text-[#9b9590] leading-relaxed mt-0.5">{ligand.name}</div>
          <div className="mt-1.5">
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
              ligand.type === 'NUCLEOTIDE' ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400' :
              ligand.type === 'COENZYME' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' :
              ligand.type === 'ION' ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400' :
              ligand.type === 'PROSTHETIC GROUP' ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400' :
              'bg-gray-50 text-gray-700 dark:bg-gray-800/30 dark:text-gray-400'
            }`}>{ligand.type}</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs pt-1 border-t border-claude-border-light dark:border-[#3d3832]">
        <div>
          <span className="text-claude-text-muted dark:text-[#6b6560]">Formula:</span>{' '}
          <span className="font-mono text-claude-text-secondary dark:text-[#9b9590]">{ligand.formula}</span>
        </div>
        <div>
          <span className="text-claude-text-muted dark:text-[#6b6560]">MW:</span>{' '}
          <span className="font-mono text-claude-text-secondary dark:text-[#9b9590]">{ligand.weight}</span>
        </div>
      </div>
      {ligand.description && (
        <p className="text-[10px] text-claude-text-muted dark:text-[#6b6560] leading-relaxed">{ligand.description}</p>
      )}
    </div>
  );
}

// ─── Blast Homolog Tooltip Component ─────────────────────────────────────────

export function BlastHomologTooltipContent({ result }: { result: EvalBlastResult }) {
  const ligandList = parseLigands(result.ligand);
  const method = result.method || '';
  const methodColors = getMethodColor(method);

  return (
    <div className="w-[320px] sm:w-[400px] p-3 space-y-2">
      <div className="flex items-start gap-2">
        <img
          src={`https://cdn.rcsb.org/images/structures/${(result.pdbId ?? '').toLowerCase()}_assembly-1.jpeg`}
          alt={result.pdbId ?? ''}
          className="w-24 h-24 sm:w-40 sm:h-40 rounded-md bg-claude-border-light dark:bg-[#3d3832] object-cover flex-shrink-0 border border-claude-border-light dark:border-[#3d3832]"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono font-semibold text-claude-text dark:text-[#e8e4dd] text-sm">{result.pdbId}</span>
            {method && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${methodColors.bg} ${methodColors.text}`}>
                {getMethodLabel(method)}
              </span>
            )}
          </div>
          <p className="text-xs text-claude-text-secondary dark:text-[#9b9590] line-clamp-2 leading-relaxed">
            {result.title || result.description}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {result.resolution != null && (
          <div>
            <span className="text-claude-text-muted dark:text-[#6b6560]">Resolution:</span>{' '}
            <span className={`font-medium ${getResolutionColor(result.resolution)}`}>{result.resolution}Å</span>
          </div>
        )}
        <div>
          <span className="text-claude-text-muted dark:text-[#6b6560]">Date:</span>{' '}
          <span className="text-claude-text-secondary dark:text-[#9b9590]">{formatDate(result.releaseDate)}</span>
        </div>
        {result.journal && (
          <div className="col-span-2">
            <span className="text-claude-text-muted dark:text-[#6b6560]">Journal:</span>{' '}
            <span className="text-claude-text-secondary dark:text-[#9b9590]">{result.journal}</span>
            {result.journalIf && <span className="text-claude-text-muted dark:text-[#6b6560] ml-1">({safeNum(result.journalIf, '—')})</span>}
          </div>
        )}
        {result.identity != null && (
          <div>
            <span className="text-claude-text-muted dark:text-[#6b6560]">Identity:</span>{' '}
            <span className={`font-medium ${getIdentityColor(result.identity)}`}>{result.identity}%</span>
          </div>
        )}
        {result.evalue != null && (
          <div>
            <span className="text-claude-text-muted dark:text-[#6b6560]">E-value:</span>{' '}
            <span className="font-mono text-claude-text-secondary dark:text-[#9b9590]">{result.evalue != null ? formatEvalue(parseFloat(result.evalue)) : '—'}</span>
          </div>
        )}
        {result.queryCoverage != null && (
          <div>
            <span className="text-claude-text-muted dark:text-[#6b6560]">Q. Coverage:</span>{' '}
            <span className="font-medium text-claude-text-secondary dark:text-[#9b9590]">{result.queryCoverage}%</span>
          </div>
        )}
        {result.uniprotRef && (
          <div>
            <span className="text-claude-text-muted dark:text-[#6b6560]">UniProt:</span>{' '}
            <span className="font-mono text-claude-text-secondary dark:text-[#9b9590]">{result.uniprotRef}</span>
          </div>
        )}
      </div>
      {ligandList.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {ligandList.slice(0, 6).map((l, i) => (
            <span key={`tt-blast-lig-${i}-${l}`} className="ligand-chip">{l}</span>
          ))}
          {ligandList.length > 6 && <span className="text-[10px] text-claude-text-muted dark:text-[#6b6560]">+{ligandList.length - 6}</span>}
        </div>
      )}
    </div>
  );
}
