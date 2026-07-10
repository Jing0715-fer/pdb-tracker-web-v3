'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface PanelWidths {
  sidebarWidth: number;
  previewWidth: number;
}

const SIDEBAR_DEFAULT = 280;
const PREVIEW_DEFAULT = 360;
const SIDEBAR_MIN = 200;
const SIDEBAR_MAX = 400;
const PREVIEW_MIN = 280;
const PREVIEW_MAX = 600;
const STORAGE_KEYS = {
  sidebar: 'pdb-sidebar-width',
  preview: 'pdb-preview-width',
} as const;

function loadFromStorage(): PanelWidths {
  let sidebarWidth = SIDEBAR_DEFAULT;
  let previewWidth = PREVIEW_DEFAULT;
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.sidebar);
    if (saved) sidebarWidth = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, Number(saved)));
  } catch { /* ignore */ }
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.preview);
    if (saved) previewWidth = Math.min(PREVIEW_MAX, Math.max(PREVIEW_MIN, Number(saved)));
  } catch { /* ignore */ }
  return { sidebarWidth, previewWidth };
}

export function useResizablePanels() {
  const [sidebarWidth, setSidebarWidth] = useState<number>(SIDEBAR_DEFAULT);
  const [previewWidth, setPreviewWidth] = useState<number>(PREVIEW_DEFAULT);
  const [resizingSidebar, setResizingSidebar] = useState(false);
  const [resizingPreview, setResizingPreview] = useState(false);

  const sidebarDragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const previewDragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const hydrated = useRef(false);

  // Hydrate from localStorage once on mount
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const { sidebarWidth: sw, previewWidth: pw } = loadFromStorage();
    setSidebarWidth(sw);
    setPreviewWidth(pw);
  }, []);

  // Persist panel widths to localStorage
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.sidebar, String(sidebarWidth)); } catch { /* ignore */ }
  }, [sidebarWidth]);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.preview, String(previewWidth)); } catch { /* ignore */ }
  }, [previewWidth]);

  // ── Resize Drag Handlers ──
  const startSidebarResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    sidebarDragRef.current = { startX: e.clientX, startWidth: sidebarWidth };
    setResizingSidebar(true);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  }, [sidebarWidth]);

  const startPreviewResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    previewDragRef.current = { startX: e.clientX, startWidth: previewWidth };
    setResizingPreview(true);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  }, [previewWidth]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (sidebarDragRef.current) {
        const delta = e.clientX - sidebarDragRef.current.startX;
        const newWidth = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, sidebarDragRef.current.startWidth + delta));
        setSidebarWidth(newWidth);
      }
      if (previewDragRef.current) {
        const delta = sidebarDragRef.current ? 0 : (previewDragRef.current.startX - e.clientX);
        const newWidth = Math.min(PREVIEW_MAX, Math.max(PREVIEW_MIN, previewDragRef.current.startWidth + delta));
        setPreviewWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      if (sidebarDragRef.current || previewDragRef.current) {
        sidebarDragRef.current = null;
        previewDragRef.current = null;
        setResizingSidebar(false);
        setResizingPreview(false);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return {
    sidebarWidth,
    previewWidth,
    resizingSidebar,
    resizingPreview,
    startSidebarResize,
    startPreviewResize,
  };
}
