'use client';

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'pdb-entry-tags';
const MAX_TAGS_PER_ENTRY = 10;

interface UseTagsReturn {
  tags: Record<string, string[]>;
  getTags: (pdbId: string) => string[];
  addTag: (pdbId: string, tag: string) => void;
  removeTag: (pdbId: string, tag: string) => void;
  setTags: (pdbId: string, tags: string[]) => void;
  clearTags: (pdbId: string) => void;
  getAllTagCounts: () => Record<string, number>;
  hasTags: (pdbId: string) => boolean;
  tagCount: (pdbId: string) => number;
}

const TAG_COLORS = ['blue', 'green', 'purple', 'amber', 'rose'] as const;
type TagColor = typeof TAG_COLORS[number];

export function getTagColor(tag: string): TagColor {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

export function getTagPillClass(tag: string): string {
  const color = getTagColor(tag);
  return `tag-pill tag-pill-${color}`;
}

export function useTags(): UseTagsReturn {
  const [tags, setTagsState] = useState<Record<string, string[]>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tags));
    } catch {
      // ignore storage errors
    }
  }, [tags]);

  const getTags = useCallback(
    (pdbId: string): string[] => tags[pdbId] || [],
    [tags]
  );

  const addTag = useCallback((pdbId: string, tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    setTagsState(prev => {
      const existing = prev[pdbId] || [];
      if (existing.includes(trimmed)) return prev;
      if (existing.length >= MAX_TAGS_PER_ENTRY) return prev;
      return { ...prev, [pdbId]: [...existing, trimmed] };
    });
  }, []);

  const removeTag = useCallback((pdbId: string, tag: string) => {
    setTagsState(prev => {
      const existing = prev[pdbId] || [];
      const filtered = existing.filter(t => t !== tag);
      if (filtered.length === 0) {
        const next = { ...prev };
        delete next[pdbId];
        return next;
      }
      return { ...prev, [pdbId]: filtered };
    });
  }, []);

  const setTagsForEntry = useCallback((pdbId: string, newTags: string[]) => {
    setTagsState(prev => {
      if (newTags.length === 0) {
        const next = { ...prev };
        delete next[pdbId];
        return next;
      }
      return { ...prev, [pdbId]: newTags.slice(0, MAX_TAGS_PER_ENTRY) };
    });
  }, []);

  const clearTags = useCallback((pdbId: string) => {
    setTagsState(prev => {
      const next = { ...prev };
      delete next[pdbId];
      return next;
    });
  }, []);

  const getAllTagCounts = useCallback((): Record<string, number> => {
    const counts: Record<string, number> = {};
    for (const entryTags of Object.values(tags)) {
      for (const tag of entryTags) {
        counts[tag] = (counts[tag] || 0) + 1;
      }
    }
    return counts;
  }, [tags]);

  const hasTags = useCallback(
    (pdbId: string): boolean => (tags[pdbId]?.length || 0) > 0,
    [tags]
  );

  const tagCount = useCallback(
    (pdbId: string): number => tags[pdbId]?.length || 0,
    [tags]
  );

  return {
    tags,
    getTags,
    addTag,
    removeTag,
    setTags: setTagsForEntry,
    clearTags,
    getAllTagCounts,
    hasTags,
    tagCount,
  };
}
