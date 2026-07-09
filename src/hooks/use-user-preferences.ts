'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface UserPreferences {
  // Table preferences
  defaultSortField: 'pdb_id' | 'resolution' | 'release_date' | 'journal_if';
  defaultSortDesc: boolean;
  defaultPageSize: 25 | 50 | 100;
  tableDensity: 'compact' | 'comfortable' | 'dense' | 'spacious';
  visibleColumns: string[];
  showRowNumbers: boolean;
  showLigandChips: boolean;

  // UI preferences
  defaultViewMode: 'table' | 'literature';
  compactTable: boolean;
  showQualityDots: boolean;
  showHoverCards: boolean;

  // Sidebar preferences
  sidebarCollapsed: boolean;
  sidebarWidth: number;

  // Advanced
  showNotifications: boolean;
  animationsEnabled: boolean;
  animationSpeed: 'slow' | 'normal' | 'fast';

  // Theme
  theme: 'light' | 'dark' | 'system';
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  defaultSortField: 'release_date',
  defaultSortDesc: true,
  defaultPageSize: 25,
  tableDensity: 'comfortable',
  visibleColumns: ['pdb_id', 'method', 'resolution', 'if', 'organism', 'title', 'ligands', 'release_date', 'journal'],
  showRowNumbers: true,
  showLigandChips: true,

  defaultViewMode: 'table',
  compactTable: false,
  showQualityDots: true,
  showHoverCards: true,

  sidebarCollapsed: false,
  sidebarWidth: 280,

  showNotifications: true,
  animationsEnabled: true,
  animationSpeed: 'normal',

  theme: 'system',
};

const STORAGE_KEY = 'pdb-user-preferences';

// ─── Helpers ───────────────────────────────────────────────────────────────

function loadPreferences(): UserPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(stored) as Partial<UserPreferences>;
    // Merge with defaults so new preference keys always have a value
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function savePreferences(prefs: UserPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage full or unavailable — ignore
  }
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const initializedRef = useRef(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const stored = loadPreferences();
    // Hydrate from localStorage on mount — suppress lint warning for setState in effect
    // eslint-disable-next-line react-hooks/set-state-in-effect -- needed for SSR hydration pattern
    setPreferences(stored);
  }, []);

  // Persist on every change (after initial hydration)
  const isInitial = useRef(true);
  useEffect(() => {
    if (!initializedRef.current) return;
    if (isInitial.current) {
      isInitial.current = false;
      return;
    }
    savePreferences(preferences);
  }, [preferences]);

  const updatePreference = useCallback(
    <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      setPreferences((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
    savePreferences(DEFAULT_PREFERENCES);
  }, []);

  return { preferences, updatePreference, resetPreferences } as const;
}
