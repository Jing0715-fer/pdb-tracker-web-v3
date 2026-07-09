'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import type { PdbEntry } from '@/lib/pdb-types';

export interface UsePdbSelectionReturn {
  // Row Selection State
  selectedRows: Set<string>;
  setSelectedRows: React.Dispatch<React.SetStateAction<Set<string>>>;
  lastSelectedRowRef: React.MutableRefObject<string | null>;

  // Bookmarks
  bookmarks: Set<string>;
  setBookmarks: React.Dispatch<React.SetStateAction<Set<string>>>;
  showBookmarksOnly: boolean;
  setShowBookmarksOnly: React.Dispatch<React.SetStateAction<boolean>>;
  bookmarksExpanded: boolean;
  setBookmarksExpanded: React.Dispatch<React.SetStateAction<boolean>>;

  // Collections
  collections: Record<string, string[]>;
  setCollections: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  activeCollection: string | null;
  setActiveCollection: React.Dispatch<React.SetStateAction<string | null>>;
  collectionsExpanded: boolean;
  setCollectionsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  expandedCollections: Set<string>;
  setExpandedCollections: React.Dispatch<React.SetStateAction<Set<string>>>;

  // Structure Notes
  structureNotes: Record<string, string>;
  setStructureNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  noteSavedIndicator: string | null;
  setNoteSavedIndicator: React.Dispatch<React.SetStateAction<string | null>>;
  notePopoverPdbId: string | null;
  setNotePopoverPdbId: React.Dispatch<React.SetStateAction<string | null>>;

  // Imported Entries
  importedEntries: Record<string, PdbEntry & { importedAt: string }>;
  setImportedEntries: React.Dispatch<React.SetStateAction<Record<string, PdbEntry & { importedAt: string }>>>;
  importedPdbIds: Set<string>;
  setImportedPdbIds: React.Dispatch<React.SetStateAction<Set<string>>>;

  // Reviewed Entries
  reviewedEntries: Set<string>;
  setReviewedEntries: React.Dispatch<React.SetStateAction<Set<string>>>;

  // Callbacks
  addNote: (pdbId: string, note: string) => void;
  deleteNote: (pdbId: string) => void;
  updateNote: (pdbId: string, note: string) => void;
  toggleBookmark: (pdbId: string) => void;
  toggleReviewedEntry: (pdbId: string) => void;
  addToCollection: (name: string, pdbId: string) => void;
  removeFromCollection: (name: string, pdbId: string) => void;
  deleteCollection: (name: string) => void;
  createAndAddToCollection: (pdbId: string) => void;
  toggleRowSelection: (pdbId: string, shiftKey?: boolean, paginatedEntries?: PdbEntry[]) => void;
  toggleAllPageRows: (paginatedEntries?: PdbEntry[]) => void;
  clearSelection: () => void;
}

export interface UsePdbSelectionOptions {
  addNotification?: (icon: string, title: string, description: string) => void;
  addActivity?: (type: string, message: string, meta?: Record<string, any>) => void;
}

export function usePdbSelection(options?: UsePdbSelectionOptions): UsePdbSelectionReturn {
  const { addNotification, addActivity } = options || {};

  // ── Row Selection ──
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const lastSelectedRowRef = useRef<string | null>(null);

  // ── Bookmarks ──
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set<string>());
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [bookmarksExpanded, setBookmarksExpanded] = useState(true);

  // ── Collections ──
  const [collections, setCollections] = useState<Record<string, string[]>>({});
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [collectionsExpanded, setCollectionsExpanded] = useState(true);
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());

  // ── Structure Notes ──
  const [structureNotes, setStructureNotes] = useState<Record<string, string>>({});
  const [importedEntries, setImportedEntries] = useState<Record<string, PdbEntry & { importedAt: string }>>({});
  const [importedPdbIds, setImportedPdbIds] = useState<Set<string>>(new Set());
  const [reviewedEntries, setReviewedEntries] = useState<Set<string>>(new Set());
  const [noteSavedIndicator, setNoteSavedIndicator] = useState<string | null>(null);
  const [notePopoverPdbId, setNotePopoverPdbId] = useState<string | null>(null);

  // ── Persist bookmarks to localStorage ──
  useEffect(() => {
    try {
      localStorage.setItem('pdb-bookmarks', JSON.stringify([...bookmarks]));
    } catch { /* ignore */ }
  }, [bookmarks]);

  // ── Persist collections to localStorage ──
  useEffect(() => {
    try { localStorage.setItem('pdb-collections', JSON.stringify(collections)); } catch { /* ignore */ }
  }, [collections]);

  // ── Persist notes to localStorage ──
  useEffect(() => {
    try {
      localStorage.setItem('pdb-structure-notes', JSON.stringify(structureNotes));
    } catch { /* ignore */ }
  }, [structureNotes]);

  // ── Persist imported entries to localStorage ──
  useEffect(() => {
    try { localStorage.setItem('pdb-imported-entries', JSON.stringify(importedEntries)); } catch { /* ignore */ }
  }, [importedEntries]);

  // ── Persist reviewed entries to localStorage ──
  useEffect(() => {
    try { localStorage.setItem('pdb-reviewed-entries', JSON.stringify(Array.from(reviewedEntries))); } catch { /* ignore */ }
  }, [reviewedEntries]);

  // ── Note Callbacks ──
  const addNote = useCallback((pdbId: string, note: string) => {
    setStructureNotes(prev => ({ ...prev, [pdbId]: note }));
    setNoteSavedIndicator(pdbId);
    setTimeout(() => setNoteSavedIndicator(prev => prev === pdbId ? null : prev), 2000);
    toast('Note added', { description: `${pdbId}` });
  }, []);

  const deleteNote = useCallback((pdbId: string) => {
    setStructureNotes(prev => {
      const next = { ...prev };
      delete next[pdbId];
      return next;
    });
    toast('Note deleted', { description: `${pdbId}` });
  }, []);

  const updateNote = useCallback((pdbId: string, note: string) => {
    setStructureNotes(prev => {
      const next = { ...prev };
      if (note.trim()) {
        next[pdbId] = note;
      } else {
        delete next[pdbId];
      }
      return next;
    });
    setNoteSavedIndicator(pdbId);
    setTimeout(() => setNoteSavedIndicator(prev => prev === pdbId ? null : prev), 2000);
    toast('Note saved');
  }, []);

  // ── Bookmark Toggle ──
  const toggleBookmark = useCallback((pdbId: string) => {
    let wasAdded = false;
    setBookmarks(prev => {
      const next = new Set(prev);
      const wasBookmarked = next.has(pdbId);
      if (wasBookmarked) {
        next.delete(pdbId);
        toast(`Removed ${pdbId} from bookmarks`, {
          action: { label: 'Undo', onClick: () => { setBookmarks(prev => { const n = new Set(prev); n.add(pdbId); return n; }); } },
          duration: 5000,
        });
        wasAdded = false;
      } else {
        next.add(pdbId);
        toast(`Bookmarked ${pdbId}`, {
          description: 'Added to your bookmarked structures',
          action: { label: 'Undo', onClick: () => { setBookmarks(prev => { const n = new Set(prev); n.delete(pdbId); return n; }); } },
          duration: 5000,
        });
        wasAdded = true;
      }
      return next;
    });
    // Use setTimeout to ensure notifications read the latest state
    setTimeout(() => {
      if (wasAdded) {
        addNotification?.('bookmark', `Bookmarked ${pdbId}`, 'Added to your bookmarked structures');
        addActivity?.('bookmark', `Bookmarked ${pdbId}`, { pdbId });
      } else {
        addNotification?.('bookmark', `Removed ${pdbId} from bookmarks`, 'Removed from your bookmarked structures');
        addActivity?.('bookmark', `Removed ${pdbId} from bookmarks`, { pdbId });
      }
    }, 0);
  }, [addNotification, addActivity]);

  // ── Reviewed Entry Toggle ──
  const toggleReviewedEntry = useCallback((pdbId: string) => {
    setReviewedEntries(prev => {
      const next = new Set(prev);
      if (next.has(pdbId)) {
        next.delete(pdbId);
        toast(`Unmarked ${pdbId} as reviewed`);
      } else {
        next.add(pdbId);
        toast(`Marked ${pdbId} as reviewed`);
      }
      return next;
    });
    addActivity?.('review', `Toggled review for ${pdbId}`, { pdbId });
  }, [addActivity]);

  // ── Collection Callbacks ──
  const addToCollection = useCallback((name: string, pdbId: string) => {
    setCollections(prev => ({
      ...prev,
      [name]: [...(prev[name] || []), pdbId].filter((v, i, a) => a.indexOf(v) === i)
    }));
    toast(`Added ${pdbId} to "${name}"`, { description: 'Structure added to collection' });
    addActivity?.('collection', `Added ${pdbId} to "${name}"`, { pdbId, collectionName: name });
  }, [addActivity]);

  const removeFromCollection = useCallback((name: string, pdbId: string) => {
    setCollections(prev => ({
      ...prev,
      [name]: (prev[name] || []).filter(id => id !== pdbId)
    }));
    toast(`Removed ${pdbId} from "${name}"`);
    addActivity?.('collection', `Removed ${pdbId} from "${name}"`, { pdbId, collectionName: name });
  }, [addActivity]);

  const deleteCollection = useCallback((name: string) => {
    const currentCollections = collections;
    const oldEntries = currentCollections[name] || [];
    setCollections(prev => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
    setActiveCollection(prev => prev === name ? null : prev);
    toast(`Deleted collection "${name}"`, {
      action: {
        label: 'Undo',
        onClick: () => {
          setCollections(prev => ({ ...prev, [name]: oldEntries }));
        },
      },
      duration: 5000,
    });
    addActivity?.('collection', `Deleted collection "${name}"`, { collectionName: name });
  }, [activeCollection, addActivity, collections]);

  const createAndAddToCollection = useCallback((pdbId: string) => {
    const name = prompt('Enter collection name:');
    if (!name?.trim()) return;
    setCollections(prev => ({
      ...prev,
      [name.trim()]: [...(prev[name.trim()] || []), pdbId].filter((v, i, a) => a.indexOf(v) === i)
    }));
    toast(`Created "${name.trim()}" and added ${pdbId}`, { description: 'New collection created' });
    addActivity?.('collection', `Created "${name.trim()}" and added ${pdbId}`, { pdbId, collectionName: name.trim() });
  }, [addActivity]);

  // ── Row Selection Callbacks ──
  const toggleRowSelection = useCallback((pdbId: string, shiftKey?: boolean, paginatedEntries?: PdbEntry[]) => {
    if (shiftKey && lastSelectedRowRef.current && paginatedEntries) {
      // Range selection: select all rows between lastSelected and current
      const pageIds = paginatedEntries.map(e => e.pdbId);
      const lastIdx = pageIds.indexOf(lastSelectedRowRef.current);
      const curIdx = pageIds.indexOf(pdbId);
      if (lastIdx !== -1 && curIdx !== -1) {
        const start = Math.min(lastIdx, curIdx);
        const end = Math.max(lastIdx, curIdx);
        const rangeIds = pageIds.slice(start, end + 1);
        setSelectedRows(prev => {
          const next = new Set(prev);
          rangeIds.forEach(id => next.add(id));
          return next;
        });
        return;
      }
    }
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(pdbId)) next.delete(pdbId);
      else next.add(pdbId);
      return next;
    });
    lastSelectedRowRef.current = pdbId;
  }, []);

  const toggleAllPageRows = useCallback((paginatedEntries?: PdbEntry[]) => {
    if (!paginatedEntries) return;
    setSelectedRows(prev => {
      const pageIds = paginatedEntries.map(e => e.pdbId);
      const allSelected = pageIds.every(id => prev.has(id));
      const next = new Set(prev);
      if (allSelected) {
        pageIds.forEach(id => next.delete(id));
      } else {
        pageIds.forEach(id => next.add(id));
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedRows(new Set());
  }, []);

  return {
    // Row Selection State
    selectedRows,
    setSelectedRows,
    lastSelectedRowRef,

    // Bookmarks
    bookmarks,
    setBookmarks,
    showBookmarksOnly,
    setShowBookmarksOnly,
    bookmarksExpanded,
    setBookmarksExpanded,

    // Collections
    collections,
    setCollections,
    activeCollection,
    setActiveCollection,
    collectionsExpanded,
    setCollectionsExpanded,
    expandedCollections,
    setExpandedCollections,

    // Structure Notes
    structureNotes,
    setStructureNotes,
    noteSavedIndicator,
    setNoteSavedIndicator,
    notePopoverPdbId,
    setNotePopoverPdbId,

    // Imported Entries
    importedEntries,
    setImportedEntries,
    importedPdbIds,
    setImportedPdbIds,

    // Reviewed Entries
    reviewedEntries,
    setReviewedEntries,

    // Callbacks
    addNote,
    deleteNote,
    updateNote,
    toggleBookmark,
    toggleReviewedEntry,
    addToCollection,
    removeFromCollection,
    deleteCollection,
    createAndAddToCollection,
    toggleRowSelection,
    toggleAllPageRows,
    clearSelection,
  };
}
