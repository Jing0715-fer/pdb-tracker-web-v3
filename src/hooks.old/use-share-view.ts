'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

interface UseShareViewParams {
  mode: string;
  selectedWeekId: string | null;
  selectedEvalId: string | null;
  methodFilter: string;
  searchQuery: string;
  compareMode: boolean;
  compareWeekId: string | null;
  previewTab: string;
  compactMode: boolean;
  showBookmarksOnly: boolean;
  setMode: (mode: string) => void;
  setSelectedWeekId: (id: string) => void;
  setSelectedEvalId: (id: string) => void;
  setMethodFilter: (method: string) => void;
  setSearchQuery: (query: string) => void;
  setDebouncedSearch: (query: string) => void;
  setCompareMode: (mode: boolean) => void;
  setCompareWeekId: (id: string) => void;
  setPreviewTab: (tab: string) => void;
  setCompactMode: (compact: boolean) => void;
  setShowBookmarksOnly: (show: boolean) => void;
}

export function useShareView({
  mode, selectedWeekId, selectedEvalId, methodFilter, searchQuery,
  compareMode, compareWeekId, previewTab, compactMode, showBookmarksOnly,
  setMode, setSelectedWeekId, setSelectedEvalId, setMethodFilter,
  setSearchQuery, setDebouncedSearch, setCompareMode, setCompareWeekId,
  setPreviewTab, setCompactMode, setShowBookmarksOnly,
}: UseShareViewParams) {
  const searchParams = useSearchParams();
  const urlParamsApplied = useRef(false);

  const buildShareUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (mode !== 'weekly') params.set('mode', mode);
    if (selectedWeekId) params.set('week', selectedWeekId);
    if (selectedEvalId) params.set('eval', selectedEvalId);
    if (methodFilter !== 'all') params.set('method', methodFilter);
    if (searchQuery) params.set('q', searchQuery);
    if (compareMode) {
      params.set('compare', '1');
      if (compareWeekId) params.set('compareWeek', compareWeekId);
    }
    if (previewTab !== 'summary') params.set('tab', previewTab);
    if (compactMode) params.set('compact', '1');
    if (showBookmarksOnly) params.set('bookmarks', '1');
    const qs = params.toString();
    return `${window.location.origin}${window.location.pathname}${qs ? '?' + qs : ''}`;
  }, [mode, selectedWeekId, selectedEvalId, methodFilter, searchQuery, compareMode, compareWeekId, previewTab, compactMode, showBookmarksOnly]);

  const handleShareView = useCallback(() => {
    const url = buildShareUrl();
    navigator.clipboard.writeText(url).then(() => {
      toast('Link copied to clipboard', { description: 'Share this view with others' });
    }).catch(() => {
      toast('Failed to copy link', { description: 'Please copy the URL manually' });
    });
  }, [buildShareUrl]);

  // Apply URL params on mount
  useEffect(() => {
    if (urlParamsApplied.current) return;
    if (!searchParams) return;
    urlParamsApplied.current = true;

    const modeParam = searchParams.get('mode');
    const weekParam = searchParams.get('week');
    const evalParam = searchParams.get('eval');
    const methodParam = searchParams.get('method');
    const qParam = searchParams.get('q');
    const compareParam = searchParams.get('compare');
    const compareWeekParam = searchParams.get('compareWeek');
    const tabParam = searchParams.get('tab');
    const compactParam = searchParams.get('compact');
    const bookmarksParam = searchParams.get('bookmarks');

    if (modeParam === 'evaluation' || modeParam === 'weekly') setMode(modeParam);
    if (weekParam) setSelectedWeekId(weekParam);
    if (evalParam) setSelectedEvalId(evalParam);
    if (methodParam && methodParam !== 'all') setMethodFilter(methodParam);
    if (qParam) { setSearchQuery(qParam); setDebouncedSearch(qParam); }
    if (compareParam === '1') setCompareMode(true);
    if (compareWeekParam) setCompareWeekId(compareWeekParam);
    if (tabParam) setPreviewTab(tabParam);
    if (compactParam === '1') setCompactMode(true);
    if (bookmarksParam === '1') setShowBookmarksOnly(true);
  }, [searchParams]);

  return { buildShareUrl, handleShareView };
}
