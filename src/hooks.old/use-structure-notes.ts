'use client';

import { useState, useCallback, useEffect, useSyncExternalStore } from 'react';
import { toast } from 'sonner';

const STORAGE_KEY = 'pdb-structure-notes';

// SSR-safe localStorage reader
function getStorageSnapshot(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function subscribeToStorage(callback: () => void): () => void {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function getServerSnapshot(): Record<string, string> {
  return {};
}

export interface UseStructureNotesReturn {
  notes: Record<string, string>;
  addNote: (pdbId: string, note: string) => void;
  editNote: (pdbId: string, note: string) => void;
  deleteNote: (pdbId: string) => void;
  getNote: (pdbId: string) => string;
  hasNote: (pdbId: string) => boolean;
  notesCount: number;
  noteSavedIndicator: string | null;
}

export function useStructureNotes(): UseStructureNotesReturn {
  // SSR-safe initial hydration from localStorage
  const serverNotes = useSyncExternalStore(
    subscribeToStorage,
    getStorageSnapshot,
    getServerSnapshot,
  );

  const [notes, setNotes] = useState<Record<string, string>>(serverNotes);
  const [noteSavedIndicator, setNoteSavedIndicator] = useState<string | null>(null);

  // Sync from localStorage on mount (client-side)
  useEffect(() => {
    const stored = getStorageSnapshot();
    setNotes(stored);
  }, []);

  // Persist notes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch {
      // localStorage might be full or unavailable
    }
  }, [notes]);

  const flashIndicator = useCallback((pdbId: string) => {
    setNoteSavedIndicator(pdbId);
    setTimeout(() => setNoteSavedIndicator(prev => prev === pdbId ? null : prev), 2000);
  }, []);

  const addNote = useCallback((pdbId: string, note: string) => {
    if (!note.trim()) return;
    setNotes(prev => ({ ...prev, [pdbId]: note.trim() }));
    flashIndicator(pdbId);
    toast('Note added', { description: `${pdbId}` });
  }, [flashIndicator]);

  const editNote = useCallback((pdbId: string, note: string) => {
    setNotes(prev => {
      const next = { ...prev };
      if (note.trim()) {
        next[pdbId] = note.trim();
      } else {
        delete next[pdbId];
      }
      return next;
    });
    flashIndicator(pdbId);
    toast('Note saved');
  }, [flashIndicator]);

  const deleteNote = useCallback((pdbId: string) => {
    setNotes(prev => {
      const next = { ...prev };
      delete next[pdbId];
      return next;
    });
    flashIndicator(pdbId);
    toast('Note deleted', { description: `${pdbId}` });
  }, [flashIndicator]);

  const getNote = useCallback((pdbId: string): string => {
    return notes[pdbId] || '';
  }, [notes]);

  const hasNote = useCallback((pdbId: string): boolean => {
    return !!notes[pdbId];
  }, [notes]);

  const notesCount = Object.keys(notes).length;

  return {
    notes,
    addNote,
    editNote,
    deleteNote,
    getNote,
    hasNote,
    notesCount,
    noteSavedIndicator,
  };
}
