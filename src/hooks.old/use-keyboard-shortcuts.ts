'use client';

import { useEffect, useCallback } from 'react';
import type { Mode } from '@/lib/pdb-types';

interface KeyboardShortcutOptions {
  onModeSwitch: (mode: Mode) => void;
  onCloseDetailPanel: () => void;
  onOpenCommandPalette: () => void;
  onToggleKeyboardHints?: () => void;
  onFocusSearch?: () => void;
  onNavigateRow?: (direction: 'up' | 'down') => void;
  onOpenHighlightedRow?: () => void;
  onToggleBookmarkHighlighted?: () => void;
  enabled?: boolean;
}

/**
 * Custom hook for PDB Tracker keyboard shortcuts.
 *
 * - Press 1 → Weekly mode
 * - Press 2 → Evaluation mode
 * - Press 3 → Literature mode
 * - Escape → Close detail panel
 * - Cmd/Ctrl+K → Open command palette
 * - / → Focus search input
 * - Arrow Up/Down → Navigate table rows
 * - Enter → Open detail panel for highlighted row
 * - b → Toggle bookmark on highlighted row
 * - ? → Toggle keyboard hints
 */
export function useKeyboardShortcuts({
  onModeSwitch,
  onCloseDetailPanel,
  onOpenCommandPalette,
  onToggleKeyboardHints,
  onFocusSearch,
  onNavigateRow,
  onOpenHighlightedRow,
  onToggleBookmarkHighlighted,
  enabled = true,
}: KeyboardShortcutOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore events when typing in input/textarea/contenteditable
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Cmd/Ctrl+K should work even in inputs
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenCommandPalette();
        return;
      }

      // Escape should work even in inputs
      if (e.key === 'Escape') {
        onCloseDetailPanel();
        return;
      }

      // Mode shortcuts only work when not in an input
      if (isInput) return;

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        onToggleKeyboardHints?.();
        return;
      }

      // Focus search with /
      if (e.key === '/' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onFocusSearch?.();
        return;
      }

      // Arrow Up/Down for row navigation
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        onNavigateRow?.('up');
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        onNavigateRow?.('down');
        return;
      }

      // Enter to open highlighted row detail
      if (e.key === 'Enter') {
        e.preventDefault();
        onOpenHighlightedRow?.();
        return;
      }

      // b to toggle bookmark on highlighted row
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        onToggleBookmarkHighlighted?.();
        return;
      }

      if (e.key === '1') {
        e.preventDefault();
        onModeSwitch('weekly');
      } else if (e.key === '2') {
        e.preventDefault();
        onModeSwitch('evaluation');
      } else if (e.key === '3') {
        e.preventDefault();
        onModeSwitch('literature');
      }
    },
    [enabled, onModeSwitch, onCloseDetailPanel, onOpenCommandPalette, onToggleKeyboardHints, onFocusSearch, onNavigateRow, onOpenHighlightedRow, onToggleBookmarkHighlighted],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
