'use client';

import React, { useMemo } from 'react';

interface TableMinimapProps {
  totalEntries: number;
  visibleStart: number;
  visibleEnd: number;
  selectedIds?: Set<string>;
  bookmarkedIds?: Set<string>;
  containerHeight?: number;
}

const MIN_ENTRIES = 30;

export function TableMinimap({
  totalEntries,
  visibleStart,
  visibleEnd,
  selectedIds,
  bookmarkedIds,
  containerHeight = 300,
}: TableMinimapProps) {
  const rows = useMemo(() => {
    const result: Array<{
      id: number;
      isSelected: boolean;
      isBookmarked: boolean;
    }> = [];
    for (let i = 0; i < totalEntries; i++) {
      result.push({
        id: i,
        isSelected: selectedIds?.has(String(i)) ?? false,
        isBookmarked: bookmarkedIds?.has(String(i)) ?? false,
      });
    }
    return result;
  }, [totalEntries, selectedIds, bookmarkedIds]);

  const selectedIndices = useMemo(() => {
    if (!selectedIds || selectedIds.size === 0) return new Set<number>();
    return selectedIds;
  }, [selectedIds]);

  if (totalEntries < MIN_ENTRIES) return null;

  const rowHeight = Math.max(1, Math.min(3, containerHeight / totalEntries));
  const viewportTop = (visibleStart / totalEntries) * containerHeight;
  const viewportHeight = ((visibleEnd - visibleStart) / totalEntries) * containerHeight;

  return (
    <div
      className="flex-shrink-0 w-[24px] relative rounded-full overflow-hidden cursor-pointer opacity-60 hover:opacity-100 transition-opacity"
      style={{ height: containerHeight }}
      title={`${totalEntries} entries · Showing ${visibleStart + 1}–${visibleEnd}`}
    >
      {/* Background track */}
      <div className="absolute inset-0 bg-gray-200/50 dark:bg-white/5 rounded-full" />

      {/* Entry dots */}
      <div className="absolute inset-0 flex flex-col justify-between py-0.5">
        {rows.map(row => {
          const isSelected = row.isSelected;
          const isBookmarked = row.isBookmarked;
          let colorClass = 'bg-gray-300 dark:bg-white/10';
          if (isSelected) colorClass = 'bg-amber-400 dark:bg-amber-500/80';
          else if (isBookmarked) colorClass = 'bg-blue-400 dark:bg-blue-500/60';
          return (
            <div
              key={row.id}
              className={`w-full rounded-full ${colorClass}`}
              style={{ height: `${rowHeight}px`, minHeight: '1px' }}
            />
          );
        })}
      </div>

      {/* Viewport indicator */}
      <div
        className="absolute left-0 right-0 bg-amber-500/30 dark:bg-amber-500/20 border-y border-amber-500/50 rounded-sm transition-all duration-150 pointer-events-none"
        style={{
          top: `${viewportTop}px`,
          height: `${Math.max(viewportHeight, 8)}px`,
        }}
      />
    </div>
  );
}
