import { useCallback, useMemo, useRef, useState } from 'react';
import { List, useListRef } from 'react-window';
import type { RowComponentProps } from 'react-window';

// Re-export react-window components for consumers
export { List, useListRef };
export type { RowComponentProps };

/**
 * Virtualized list configuration for large datasets.
 * Groups filter/sort parameters into a single stable config
 * to reduce useMemo dependency counts.
 */
export interface VirtualizedListConfig {
  /** Currently active filter/sort state snapshot */
  filterSortConfig: {
    sortField: string;
    sortDir: 'asc' | 'desc';
    searchQuery: string;
    resolutionRange: [number, number];
    ifRange: [number, number];
    qualityFilter: string;
    hasLigandsFilter: boolean;
    selectedTagFilter: string;
  };
  rowHeight: number;
  overscan?: number;
}

export interface UseVirtualizedListOptions<T> {
  /** All data items to virtualize */
  items: T[];
  /** Row height in pixels (default 53) */
  rowHeight?: number;
  /** Number of off-screen rows to render (default 3) */
  overscan?: number;
  /** Container height (auto-detected from containerRef if not provided) */
  containerHeight?: number;
  /** Called with container ref to attach scroll listener */
  onScroll?: (scrollTop: number, containerHeight: number, totalHeight: number) => void;
}

export function useVirtualizedList<T>(
  options: UseVirtualizedListOptions<T>
) {
  const {
    items,
    rowHeight = 53,
    overscan = 3,
    containerHeight: providedHeight,
    onScroll,
  } = options;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerHeight, setContainerHeight] = useState(providedHeight ?? 600);

  // Auto-detect container height via ResizeObserver
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const measuredHeightRef = useRef<number>(0);

  const startVirtualization = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el;
    if (!el) return;

    if (!providedHeight) {
      resizeObserverRef.current = new ResizeObserver(entries => {
        const entry = entries[0];
        if (entry) {
          measuredHeightRef.current = entry.contentRect.height;
          setContainerHeight(entry.contentRect.height);
        }
      });
      resizeObserverRef.current.observe(el);
      setContainerHeight(el.clientHeight || 600);
    }

    if (onScroll) {
      const handleScroll = () => {
        const scrollTop = el.scrollTop;
        const totalHeight = el.scrollHeight;
        onScroll(scrollTop, el.clientHeight, totalHeight);
      };
      el.addEventListener('scroll', handleScroll, { passive: true });
    }
  }, [providedHeight, onScroll]);

  const itemCount = items.length;
  const totalHeight = itemCount * rowHeight;

  // Memoized row renderer compatible with react-window v2 RowComponentProps
  const RowComponent = useCallback(
    ({ index, style }: RowComponentProps) => ({
      index,
      style,
    }),
    []
  );

  return {
    containerRef: startVirtualization,
    containerHeight,
    itemCount,
    totalHeight,
    rowHeight,
    overscan,
    RowComponent,
  };
}

export default useVirtualizedList;