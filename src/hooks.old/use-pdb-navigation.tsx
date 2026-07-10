'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { PdbEntry } from '@/lib/pdb-types';

export type Mode = 'weekly' | 'evaluation';

export interface UsePdbNavigationReturn {
  // Mode & Navigation
  mode: Mode;
  setMode: React.Dispatch<React.SetStateAction<Mode>>;
  selectedWeekId: string | null;
  setSelectedWeekId: React.Dispatch<React.SetStateAction<string | null>>;
  rowEntranceKey: number;
  setRowEntranceKey: React.Dispatch<React.SetStateAction<number>>;
  selectedEvalId: string | null;
  setSelectedEvalId: React.Dispatch<React.SetStateAction<string | null>>;

  // Pagination
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;

  // Preview Panel
  previewOpen: boolean;
  setPreviewOpen: React.Dispatch<React.SetStateAction<boolean>>;
  previewTab: string;
  setPreviewTab: React.Dispatch<React.SetStateAction<string>>;

  // Detail Panel
  selectedEntry: PdbEntry | null;
  setSelectedEntry: React.Dispatch<React.SetStateAction<PdbEntry | null>>;
  detailPanelOpen: boolean;
  setDetailPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  bottomSheetSnap: number;
  setBottomSheetSnap: React.Dispatch<React.SetStateAction<number>>;
  detailSlideDirection: 'left' | 'right' | null;
  setDetailSlideDirection: React.Dispatch<React.SetStateAction<'left' | 'right' | null>>;

  // Mobile State
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  mobilePreviewOpen: boolean;
  setMobilePreviewOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Desktop Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Dialogs & Panels
  showWelcome: boolean;
  setShowWelcome: React.Dispatch<React.SetStateAction<boolean>>;
  preferencesDialogOpen: boolean;
  setPreferencesDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  importDialogOpen: boolean;
  setImportDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  shortcutsPanelOpen: boolean;
  setShortcutsPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  mobileMoreMenuOpen: boolean;
  setMobileMoreMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Scroll Progress
  scrollProgress: number;
  setScrollProgress: React.Dispatch<React.SetStateAction<number>>;

  // Keyboard Navigation
  focusedRowIndex: number | null;
  setFocusedRowIndex: React.Dispatch<React.SetStateAction<number | null>>;
  keyboardNavActive: boolean;
  setKeyboardNavActive: React.Dispatch<React.SetStateAction<boolean>>;
  keyboardNavHintVisible: boolean;
  setKeyboardNavHintVisible: React.Dispatch<React.SetStateAction<boolean>>;
  keyboardActivityTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;

  // Callbacks
  dismissWelcome: () => void;
  setKeyboardNavHintAutoHide: () => void;
}

export function usePdbNavigation(): UsePdbNavigationReturn {
  // ── Mode & Navigation ──
  const [mode, setMode] = useState<Mode>('weekly');
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [rowEntranceKey, setRowEntranceKey] = useState(0);
  const [selectedEvalId, setSelectedEvalId] = useState<string | null>(null);

  // ── Pagination ──
  const [currentPage, setCurrentPage] = useState(1);

  // ── Welcome Card ──
  const [showWelcome, setShowWelcome] = useState(false);

  // ── Preview Panel ──
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTab, setPreviewTab] = useState<string>('summary');

  // ── Detail Panel ──
  const [selectedEntry, setSelectedEntry] = useState<PdbEntry | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);

  // ── Bottom Sheet Snap State ──
  const [bottomSheetSnap, setBottomSheetSnap] = useState<number>(0.5);

  // ── Detail Panel Swipe Navigation (mobile) ──
  const [detailSlideDirection, setDetailSlideDirection] = useState<'left' | 'right' | null>(null);

  // ── Mobile State ──
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  // ── Desktop Sidebar Toggle State ──
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  // ── Dialogs & Panels ──
  const [preferencesDialogOpen, setPreferencesDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [shortcutsPanelOpen, setShortcutsPanelOpen] = useState(false);
  const [mobileMoreMenuOpen, setMobileMoreMenuOpen] = useState(false);

  // ── Keyboard Navigation ──
  const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null);
  const [keyboardNavActive, setKeyboardNavActive] = useState(false);
  const [keyboardNavHintVisible, setKeyboardNavHintVisible] = useState(false);
  const keyboardActivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Scroll Progress ──
  const [scrollProgress, setScrollProgress] = useState(0);

  // ── Welcome Card: Initialize from localStorage ──
  useEffect(() => {
    const welcomed = localStorage.getItem('pdb-welcomed');
    if (!welcomed) setShowWelcome(true);
  }, []);

  const dismissWelcome = useCallback(() => {
    setShowWelcome(false);
    localStorage.setItem('pdb-welcomed', 'true');
  }, []);

  // ── Keyboard Navigation Hint Auto-hide ──
  const setKeyboardNavHintAutoHide = useCallback(() => {
    setKeyboardNavHintVisible(true);
    if (keyboardActivityTimerRef.current) clearTimeout(keyboardActivityTimerRef.current);
    keyboardActivityTimerRef.current = setTimeout(() => setKeyboardNavHintVisible(false), 5000);
  }, []);

  return {
    // Mode & Navigation
    mode,
    setMode,
    selectedWeekId,
    setSelectedWeekId,
    rowEntranceKey,
    setRowEntranceKey,
    selectedEvalId,
    setSelectedEvalId,

    // Pagination
    currentPage,
    setCurrentPage,

    // Preview Panel
    previewOpen,
    setPreviewOpen,
    previewTab,
    setPreviewTab,

    // Detail Panel
    selectedEntry,
    setSelectedEntry,
    detailPanelOpen,
    setDetailPanelOpen,
    bottomSheetSnap,
    setBottomSheetSnap,
    detailSlideDirection,
    setDetailSlideDirection,

    // Mobile State
    mobileSidebarOpen,
    setMobileSidebarOpen,
    mobilePreviewOpen,
    setMobilePreviewOpen,

    // Desktop Sidebar
    sidebarOpen,
    setSidebarOpen,

    // Dialogs & Panels
    showWelcome,
    setShowWelcome,
    preferencesDialogOpen,
    setPreferencesDialogOpen,
    importDialogOpen,
    setImportDialogOpen,
    shortcutsPanelOpen,
    setShortcutsPanelOpen,
    mobileMoreMenuOpen,
    setMobileMoreMenuOpen,

    // Scroll Progress
    scrollProgress,
    setScrollProgress,

    // Keyboard Navigation
    focusedRowIndex,
    setFocusedRowIndex,
    keyboardNavActive,
    setKeyboardNavActive,
    keyboardNavHintVisible,
    setKeyboardNavHintVisible,
    keyboardActivityTimerRef,

    // Callbacks
    dismissWelcome,
    setKeyboardNavHintAutoHide,
  };
}
