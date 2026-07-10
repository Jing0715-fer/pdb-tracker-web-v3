'use client';

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'pdb-ratings';

function loadRatings(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export interface UseRatingsReturn {
  ratings: Record<string, number>;
  setRating: (pdbId: string, rating: number) => void;
  clearRating: (pdbId: string) => void;
  getRating: (pdbId: string) => number;
  getAverageRating: () => number;
  getRatedCount: () => number;
  getRatingDistribution: () => Record<number, number>;
  ratingSavedIndicator: string | null;
}

export function useRatings(): UseRatingsReturn {
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [ratingSavedIndicator, setRatingSavedIndicator] = useState<string | null>(null);

  useEffect(() => {
    setRatings(loadRatings());
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ratings)); } catch {}
  }, [ratings]);

  const flashIndicator = useCallback((pdbId: string) => {
    setRatingSavedIndicator(pdbId);
    setTimeout(() => setRatingSavedIndicator(prev => prev === pdbId ? null : prev), 1500);
  }, []);

  const setRating = useCallback((pdbId: string, rating: number) => {
    if (rating < 1 || rating > 5) return;
    setRatings(prev => {
      if (prev[pdbId] === rating) {
        const next = { ...prev };
        delete next[pdbId];
        return next;
      }
      return { ...prev, [pdbId]: rating };
    });
    flashIndicator(pdbId);
  }, [flashIndicator]);

  const clearRating = useCallback((pdbId: string) => {
    setRatings(prev => {
      const next = { ...prev };
      delete next[pdbId];
      return next;
    });
    flashIndicator(pdbId);
  }, [flashIndicator]);

  const getRating = useCallback((pdbId: string): number => ratings[pdbId] || 0, [ratings]);

  const getAverageRating = useCallback((): number => {
    const values = Object.values(ratings);
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }, [ratings]);

  const getRatedCount = useCallback((): number => Object.keys(ratings).length, [ratings]);

  const getRatingDistribution = useCallback((): Record<number, number> => {
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of Object.values(ratings)) {
      if (r >= 1 && r <= 5) dist[r]++;
    }
    return dist;
  }, [ratings]);

  return {
    ratings, setRating, clearRating, getRating,
    getAverageRating, getRatedCount, getRatingDistribution,
    ratingSavedIndicator,
  };
}
