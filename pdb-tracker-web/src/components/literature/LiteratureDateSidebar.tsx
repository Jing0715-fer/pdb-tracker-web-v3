'use client';

import React, { useState, useMemo } from 'react';
import { Search, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { LitReport } from '@/lib/pdb-types';

interface LiteratureDateSidebarProps {
  reports: LitReport[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  isLoading: boolean;
  /** When true, removes own border-r and width (used inside pdb-tracker aside wrapper) */
  inline?: boolean;
}

export function LiteratureDateSidebar({
  reports,
  selectedDate,
  onSelectDate,
  isLoading,
  inline = false,
}: LiteratureDateSidebarProps) {
  const [sidebarSearch, setSidebarSearch] = useState('');

  const filteredReports = useMemo(() => {
    if (!sidebarSearch) return reports;
    const q = sidebarSearch.toLowerCase();
    return reports.filter(r =>
      r.date.toLowerCase().includes(q) ||
      r.title?.toLowerCase().includes(q)
    );
  }, [reports, sidebarSearch]);

  return (
    <div className={`flex-shrink-0 bg-claude-surface dark:bg-[#242220] flex flex-col ${
      inline ? 'w-full' : 'w-full xl:w-[220px] border-r border-claude-border dark:border-[#3d3832]'
    }`}>
      {/* Header */}
      <div className="px-3 py-3 border-b border-claude-border dark:border-[#3d3832] bg-claude-surface dark:bg-[#242220]">
        <div className="text-xs font-semibold text-claude-text-secondary mb-2">Reports by Date</div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-claude-text-muted" />
          <Input
            type="text"
            value={sidebarSearch}
            onChange={(e) => setSidebarSearch(e.target.value)}
            placeholder="Filter dates..."
            className="h-7 pl-7 pr-2 text-[11px] bg-claude-bg dark:bg-[#1a1917] border-claude-border dark:border-[#3d3832] focus:ring-claude-accent/30 input-focus-glow"
          />
        </div>
      </div>

      {/* Report list */}
      <div className="flex-1 overflow-y-auto sidebar-scroll p-2 space-y-1">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-2.5 rounded-md shimmer-skeleton h-14" />
          ))
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-6 text-[11px] text-claude-text-muted">
            No reports found
          </div>
        ) : (
          filteredReports.map((report) => {
            const isActive = selectedDate === report.date;
            return (
              <button
                key={report.id}
                onClick={() => onSelectDate(report.date)}
                className={`w-full text-left p-2.5 rounded-md transition-all duration-150 hover:pl-2 group ${
                  isActive
                    ? 'bg-claude-accent-light dark:bg-[#3d2a22] border-l-2 border-claude-accent sidebar-active-card'
                    : 'hover:bg-claude-border-light dark:hover:bg-[#2b2926] border border-transparent'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-xs font-semibold ${
                    isActive ? 'text-claude-accent' : 'text-claude-text'
                  }`}>
                    {report.date || 'Unknown'}
                  </span>
                  <span className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded ${
                    isActive
                      ? 'bg-claude-accent/15 text-claude-accent dark:bg-claude-accent/25'
                      : 'bg-claude-border-light dark:bg-[#2b2926] text-claude-text-muted'
                  }`}>
                    {report.paperCount}
                  </span>
                </div>
                {report.title && (
                  <div className="text-[10px] text-claude-text-muted truncate">
                    {report.title}
                  </div>
                )}
                <div className="flex items-center gap-1 mt-0.5">
                  <FileText className="h-2.5 w-2.5 text-claude-text-muted" />
                  <span className="text-[9px] text-claude-text-muted">
                    {report.paperCount} paper{report.paperCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-claude-border dark:border-[#3d3832] text-[10px] text-claude-text-muted text-center">
        {reports.length} report{reports.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
