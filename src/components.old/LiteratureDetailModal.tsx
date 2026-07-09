'use client';

import { useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';

interface LiteratureDetail {
  pubmedId: string;
  title: string;
  authors: string;
  journal: string | null;
  journalIf: number | null;
  abstract: string;
  pdbs: { pdbId: string; method: string | null; isBlast?: boolean; identity?: number | null }[];
}

interface LiteratureDetailModalProps {
  literature: LiteratureDetail | null;
  onClose: () => void;
}

export function LiteratureDetailModal({ literature, onClose }: LiteratureDetailModalProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!literature) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg mx-4 bg-white dark:bg-[#1c1a18] rounded-xl shadow-2xl border border-claude-border dark:border-[#3d3832] overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-4 border-b border-claude-border dark:border-[#3d3832]">
          <div className="flex-1 min-w-0">
            <h2 className="text-[13px] font-semibold text-claude-text leading-snug line-clamp-2">
              {literature.title || 'Untitled'}
            </h2>
            <p className="text-[10px] text-claude-text-muted mt-1">
              {literature.journal || 'Unknown Journal'}
              {literature.journalIf != null && (
                <span className="ml-2 font-medium text-claude-accent">IF {literature.journalIf.toFixed(1)}</span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1.5 rounded-md hover:bg-claude-border-light dark:hover:bg-[#3d3832] text-claude-text-muted hover:text-claude-text transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Authors */}
        <div className="px-4 py-2.5 border-b border-claude-border/50 dark:border-[#3d3832]/50">
          <p className="text-[10px] text-claude-text-muted mb-1">Authors</p>
          <p className="text-[11px] text-claude-text-secondary leading-relaxed">
            {literature.authors || 'Authors not available'}
          </p>
        </div>

        {/* Abstract */}
        {literature.abstract && (
          <div className="px-4 py-3 border-b border-claude-border/50 dark:border-[#3d3832]/50">
            <p className="text-[10px] text-claude-text-muted mb-1.5">Abstract</p>
            <p className="text-[11px] text-claude-text leading-relaxed line-clamp-6">
              {literature.abstract}
            </p>
          </div>
        )}

        {/* PDB IDs */}
        <div className="px-4 py-3">
          <p className="text-[10px] text-claude-text-muted mb-2">Associated PDB Structures ({literature.pdbs.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {literature.pdbs.map((p) => (
              <span
                key={`${p.pdbId}-${p.isBlast ? 'b' : 's'}`}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-claude-surface dark:bg-[#2b2926] border border-claude-border/50 dark:border-[#3d3832]/50"
              >
                <span className="font-mono text-[11px] font-semibold text-claude-accent">{p.pdbId}</span>
                {p.isBlast && (
                  <span className="text-[9px] px-1 py-0.5 rounded bg-claude-accent-light dark:bg-[#3d2a22] text-claude-accent border border-claude-accent/20">Homolog</span>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 bg-claude-bg/50 dark:bg-[#1a1917]/50 border-t border-claude-border/50 dark:border-[#3d3832]/50">
          <a
            href={`https://pubmed.gov/${literature.pubmedId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[10px] text-claude-accent hover:text-claude-accent-hover transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View on PubMed
          </a>
          <span className="text-[10px] text-claude-text-muted">PMID: {literature.pubmedId}</span>
        </div>
      </div>
    </div>
  );
}