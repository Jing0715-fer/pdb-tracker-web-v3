'use client';

import { useState, useCallback, useEffect } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface WeeklyContextMenuState {
  x: number;
  y: number;
  weekId: string;
}

interface EvalContextMenuState {
  x: number;
  y: number;
  uniprotId: string;
}

interface UseContextMenuOptions {
  /** Called when clicking "View Week" in the weekly context menu */
  onViewWeek?: (weekId: string) => void;
}

interface UseContextMenuReturn {
  /** Weekly mode context menu state */
  contextMenu: WeeklyContextMenuState | null;
  setContextMenu: React.Dispatch<React.SetStateAction<WeeklyContextMenuState | null>>;
  /** Open the weekly context menu at position */
  openWeekMenu: (e: React.MouseEvent | MouseEvent, weekId: string) => void;
  /** Close the weekly context menu */
  closeWeekMenu: () => void;
  /** Close all context menus */
  closeAllMenus: () => void;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useContextMenu(_options?: UseContextMenuOptions): UseContextMenuReturn {
  const [contextMenu, setContextMenu] = useState<WeeklyContextMenuState | null>(null);

  // Close context menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close context menu on scroll or window resize
  useEffect(() => {
    const handleClose = () => setContextMenu(null);
    window.addEventListener('scroll', handleClose, true);
    window.addEventListener('resize', handleClose);
    return () => {
      window.removeEventListener('scroll', handleClose, true);
      window.removeEventListener('resize', handleClose);
    };
  }, []);

  const openWeekMenu = useCallback((e: React.MouseEvent | MouseEvent, weekId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, weekId });
  }, []);

  const closeWeekMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const closeAllMenus = useCallback(() => {
    setContextMenu(null);
  }, []);

  return {
    contextMenu,
    setContextMenu,
    openWeekMenu,
    closeWeekMenu,
    closeAllMenus,
  };
}

// ─── Re-export types for use in components ──────────────────────────────────

export type { WeeklyContextMenuState, EvalContextMenuState };
