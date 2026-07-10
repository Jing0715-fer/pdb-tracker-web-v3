'use client';

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'pdb-recent-actions';
const MAX_ACTIONS = 50;

export type ActionType = 'bookmark' | 'unbookmark' | 'note' | 'rating' | 'compare' | 'collection' | 'export' | 'filter' | 'review';

export interface RecentAction {
  type: ActionType;
  pdbId: string;
  timestamp: number;
  detail?: string;
}

interface UseRecentActionsReturn {
  actions: RecentAction[];
  addAction: (type: ActionType, pdbId: string, detail?: string) => void;
  clearActions: () => void;
  actionCount: number;
  todayCount: number;
}

export function useRecentActions(): UseRecentActionsReturn {
  const [actions, setActions] = useState<RecentAction[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setActions(JSON.parse(stored));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(actions)); } catch {}
  }, [actions, hydrated]);

  const addAction = useCallback((type: ActionType, pdbId: string, detail?: string) => {
    setActions(prev => {
      const action: RecentAction = { type, pdbId, timestamp: Date.now(), detail };
      return [action, ...prev].slice(0, MAX_ACTIONS);
    });
  }, []);

  const clearActions = useCallback(() => setActions([]), []);

  const actionCount = actions.length;

  const todayCount = actions.filter(a => {
    const today = new Date();
    const d = new Date(a.timestamp);
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
  }).length;

  return { actions, addAction, clearActions, actionCount, todayCount };
}
