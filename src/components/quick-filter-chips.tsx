'use client';

import React, { useMemo } from 'react';
import { Crosshair, Snowflake, Scan, TrendingUp, FlaskConical, Bookmark, type LucideIcon } from 'lucide-react';
import type { PdbEntry } from '@/lib/pdb-types';
import { parseLigands } from '@/components/pdb-helpers';

// ─── Smart Quick Filter Chips ─────────────────────────────────────────────────

interface QuickFilterConfig {
  key: string;
  label: string;
  icon: LucideIcon;
  tagClass: string;
  desc: string;
  matchCount: (entries: PdbEntry[], bookmarks: Set<string>) => number;
  matchesEntry: (entry: PdbEntry, bookmarks: Set<string>) => boolean;
}

const QUICK_FILTERS: QuickFilterConfig[] = [
  {
    key: 'high_res',
    label: 'High Resolution (≤2Å)',
    icon: Crosshair,
    tagClass: 'tag-info',
    desc: 'Resolution ≤ 2.0Å',
    matchCount: (entries) => entries.filter(e => e.resolution !== null && e.resolution !== undefined && e.resolution <= 2.0).length,
    matchesEntry: (entry) => entry.resolution !== null && entry.resolution !== undefined && entry.resolution <= 2.0,
  },
  {
    key: 'cryoem_only',
    label: 'Cryo-EM Only',
    icon: Snowflake,
    tagClass: 'tag-info',
    desc: 'Cryo-EM or Electron Microscopy',
    matchCount: (entries) => entries.filter(e => {
      const m = (e.method || '').toUpperCase();
      return m.includes('CRYO-EM') || m.includes('ELECTRON MICROSCOPY') || e.isCryoem;
    }).length,
    matchesEntry: (entry) => {
      const m = (entry.method || '').toUpperCase();
      return m.includes('CRYO-EM') || m.includes('ELECTRON MICROSCOPY') || entry.isCryoem;
    },
  },
  {
    key: 'xray_only',
    label: 'X-ray Only',
    icon: Scan,
    tagClass: 'tag-success',
    desc: 'X-ray diffraction',
    matchCount: (entries) => entries.filter(e => {
      const m = (e.method || '').toUpperCase();
      return m.includes('X-RAY') || e.isXray;
    }).length,
    matchesEntry: (entry) => {
      const m = (entry.method || '').toUpperCase();
      return m.includes('X-RAY') || entry.isXray;
    },
  },
  {
    key: 'high_if',
    label: 'High Impact (IF≥10)',
    icon: TrendingUp,
    tagClass: 'tag-error',
    desc: 'Journal Impact Factor ≥ 10',
    matchCount: (entries) => entries.filter(e => e.journalIf !== null && e.journalIf !== undefined && e.journalIf >= 10).length,
    matchesEntry: (entry) => entry.journalIf !== null && entry.journalIf !== undefined && entry.journalIf >= 10,
  },
  {
    key: 'has_ligands',
    label: 'With Ligands',
    icon: FlaskConical,
    tagClass: 'tag-success',
    desc: 'Structures with bound ligands',
    matchCount: (entries) => entries.filter(e => {
      if (!e.ligands) return false;
      const list = parseLigands(e.ligands);
      return list.length > 0 && !list.every(l => l === 'N/A');
    }).length,
    matchesEntry: (entry) => {
      if (!entry.ligands) return false;
      const list = parseLigands(entry.ligands);
      return list.length > 0 && !list.every(l => l === 'N/A');
    },
  },
  {
    key: 'bookmarked',
    label: 'Bookmarked',
    icon: Bookmark,
    tagClass: 'tag-warning',
    desc: 'Your bookmarked structures',
    matchCount: (entries, bookmarks) => entries.filter(e => bookmarks.has(e.pdbId)).length,
    matchesEntry: (entry, bookmarks) => bookmarks.has(entry.pdbId),
  },
];

export { QUICK_FILTERS };

export function QuickFilterChips({
  quickFilters,
  onToggle,
  entries,
  bookmarks,
}: {
  quickFilters: Set<string>;
  onToggle: (key: string) => void;
  entries: PdbEntry[];
  bookmarks: Set<string>;
}) {
  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of QUICK_FILTERS) {
      counts[f.key] = f.matchCount(entries, bookmarks);
    }
    return counts;
  }, [entries, bookmarks]);

  return (
    <div className="chip-group scroll-snap-x px-3 sm:px-4 py-2.5 no-print gap-2 stagger-children">
      {QUICK_FILTERS.map((f, idx) => {
        const Icon = f.icon;
        const isActive = quickFilters.has(f.key);
        const count = filterCounts[f.key] ?? 0;

        return (
          <button
            key={f.key}
            onClick={() => onToggle(f.key)}
            title={`${f.desc} (${count} entries) — Press ${idx + 1}`}
            className={`
              chip ${isActive ? 'chip-active' : ''} transition-all duration-200
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
              text-[11px] font-medium cursor-pointer select-none
              border
              ${isActive
                ? `${f.tagClass} ring-1 ring-current/20 shadow-sm`
                : 'bg-white dark:bg-[#2a2725] border-claude-border dark:border-[#3d3832] text-claude-text-secondary dark:text-[#a09a93] hover:border-claude-accent/40 hover:text-claude-text dark:hover:text-[#e8e4dd]'
              }
            `}
          >
            <Icon className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="whitespace-nowrap">{f.label}</span>
            <span
              className={`
                stat-highlight inline-flex items-center justify-center min-w-[18px] h-[18px] px-1
                text-[10px] font-semibold rounded-full leading-none
                ${isActive
                  ? 'counter-badge ml-0.5'
                  : 'counter-badge-muted ml-1'
                }
              `}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
