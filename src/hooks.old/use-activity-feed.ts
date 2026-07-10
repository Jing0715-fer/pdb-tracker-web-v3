'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ActivityItem {
  id: string;
  type: 'bookmark' | 'collection' | 'export' | 'compare' | 'search' | 'filter';
  message: string;
  timestamp: number;
  pdbId?: string;
  collectionName?: string;
  read: boolean;
}

const STORAGE_KEY = 'pdb-activity-feed';
const MAX_ITEMS = 50;

// ─── Helpers ───────────────────────────────────────────────────────────────

function loadActivities(): ActivityItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as ActivityItem[];
  } catch {
    return [];
  }
}

function saveActivities(items: ActivityItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    // localStorage full or unavailable
  }
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const initializedRef = useRef(false);
  const [newItemPulse, setNewItemPulse] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const stored = loadActivities();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- needed for SSR hydration pattern
    setActivities(stored);
  }, []);

  // Persist on change (skip initial hydration)
  const isInitial = useRef(true);
  useEffect(() => {
    if (!initializedRef.current) return;
    if (isInitial.current) {
      isInitial.current = false;
      return;
    }
    saveActivities(activities);
  }, [activities]);

  const addActivity = useCallback(
    (type: ActivityItem['type'], message: string, extra?: { pdbId?: string; collectionName?: string }) => {
      const newItem: ActivityItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type,
        message,
        timestamp: Date.now(),
        pdbId: extra?.pdbId,
        collectionName: extra?.collectionName,
        read: false,
      };
      setActivities((prev) => [newItem, ...prev].slice(0, MAX_ITEMS));
      // Pulse animation
      setNewItemPulse(true);
      setTimeout(() => setNewItemPulse(false), 600);
    },
    [],
  );

  const markAllRead = useCallback(() => {
    setActivities((prev) => prev.map((item) => ({ ...item, read: true })));
  }, []);

  const clearActivities = useCallback(() => {
    setActivities([]);
    saveActivities([]);
  }, []);

  const unreadCount = activities.filter((a) => !a.read).length;

  return { activities, addActivity, markAllRead, clearActivities, unreadCount, newItemPulse } as const;
}
