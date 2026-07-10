'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_COLUMN_ORDER = [
  'pdbId', 'method', 'resolution', 'journalIf',
  'organisms', 'title', 'releaseDate', '_ligands', 'journal',
];

const DEFAULT_COLUMN_VISIBILITY: Record<string, boolean> = {
  pdbId: true,
  method: true,
  resolution: true,
  journalIf: true,
  organisms: true,
  title: true,
  releaseDate: true,
  _ligands: true,
};

const STORAGE_KEYS = {
  visibility: 'pdb-column-visibility',
  order: 'pdb-column-order',
  widths: 'pdb-column-widths',
} as const;

// ─── Helpers ────────────────────────────────────────────────────────────────

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored) as T;
  } catch { /* ignore */ }
  return fallback;
}

function saveToStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* ignore */ }
}

function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch { /* ignore */ }
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useColumnSettings() {
  // ── Column Visibility ──
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(
    () => loadFromStorage(STORAGE_KEYS.visibility, { ...DEFAULT_COLUMN_VISIBILITY })
  );

  // ── Column Order ──
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const stored = loadFromStorage<string[]>(STORAGE_KEYS.order, DEFAULT_COLUMN_ORDER);
    // Merge with default to include any new columns added in updates
    const merged = [...stored];
    for (const col of DEFAULT_COLUMN_ORDER) {
      if (!merged.includes(col)) merged.push(col);
    }
    return merged;
  });

  // ── Column Widths ──
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    () => loadFromStorage(STORAGE_KEYS.widths, {})
  );

  // ── Resize Ref ──
  const resizeRef = useRef<{ field: string; startX: number; startWidth: number } | null>(null);

  // ── Persist visibility ──
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.visibility, columnVisibility);
  }, [columnVisibility]);

  // ── Persist order ──
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.order, columnOrder);
  }, [columnOrder]);

  // ── Persist widths ──
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.widths, columnWidths);
  }, [columnWidths]);

  // ── Resize effect ──
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const { field, startX, startWidth } = resizeRef.current;
      const delta = e.clientX - startX;
      const newWidth = Math.max(50, startWidth + delta);
      setColumnWidths(prev => ({ ...prev, [field]: newWidth }));
    };
    const handleMouseUp = () => {
      if (resizeRef.current) {
        resizeRef.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // ── Actions ──

  const toggleColumn = useCallback((columnId: string) => {
    setColumnVisibility(prev => ({
      ...prev,
      [columnId]: prev[columnId] === false ? true : false,
    }));
  }, []);

  const setColumnOrderValue = useCallback((order: string[]) => {
    setColumnOrder(order);
  }, []);

  const setColumnWidth = useCallback((columnId: string, width: number) => {
    setColumnWidths(prev => ({ ...prev, [columnId]: width }));
  }, []);

  const resetColumns = useCallback(() => {
    setColumnVisibility({ ...DEFAULT_COLUMN_VISIBILITY });
    setColumnOrder([...DEFAULT_COLUMN_ORDER]);
    setColumnWidths({});
    removeFromStorage(STORAGE_KEYS.visibility);
    removeFromStorage(STORAGE_KEYS.order);
    removeFromStorage(STORAGE_KEYS.widths);
  }, []);

  const resetColumnVisibility = useCallback(() => {
    setColumnVisibility({ ...DEFAULT_COLUMN_VISIBILITY });
    removeFromStorage(STORAGE_KEYS.visibility);
  }, []);

  const resetColumnOrder = useCallback(() => {
    setColumnOrder([...DEFAULT_COLUMN_ORDER]);
    removeFromStorage(STORAGE_KEYS.order);
  }, []);

  const resetColumnWidths = useCallback(() => {
    setColumnWidths({});
    removeFromStorage(STORAGE_KEYS.widths);
  }, []);

  const startResize = useCallback((e: React.MouseEvent, field: string) => {
    e.preventDefault();
    e.stopPropagation();
    const th = (e.target as HTMLElement).closest('th');
    if (!th) return;
    resizeRef.current = { field, startX: e.clientX, startWidth: th.offsetWidth };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const getColStyle = useCallback((field: string): React.CSSProperties | undefined => {
    const w = columnWidths[field];
    if (w != null) return { width: w, minWidth: w, maxWidth: w };
    return undefined;
  }, [columnWidths]);

  return {
    // State
    columnVisibility,
    columnOrder,
    columnWidths,

    // Setters
    setColumnVisibility,
    setColumnOrder: setColumnOrderValue,
    setColumnWidths,

    // Actions
    toggleColumn,
    toggleColumnVisibility: toggleColumn,
    resetColumns,
    resetColumnVisibility,
    resetColumnOrder,
    resetColumnWidths,
    startResize,
    getColStyle,

    // Drag refs
    defaultColumnOrder: DEFAULT_COLUMN_ORDER,
    defaultColumnVisibility: DEFAULT_COLUMN_VISIBILITY,
  };
}
