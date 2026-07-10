'use client';

import React, { type RefObject } from 'react';
import {
  Home,
  Search,
  SlidersHorizontal,
  Bookmark,
  BookmarkCheck,
  MoreHorizontal,
  Sun,
  Moon,
  StickyNote,
  GitMerge,
  Keyboard,
  Settings,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import type { PdbEntry } from '@/lib/pdb-types';

// ── Props Interface ──
export interface MobileBottomNavProps {
  isMobile: boolean;
  detailPanelOpen: boolean;
  searchQuery: string;
  advancedFiltersOpen: boolean;
  showBookmarksOnly: boolean;
  bookmarksLength: number;
  mobileMoreMenuOpen: boolean;
  activeAdvancedFilterCount: number;
  methodFilter: string;
  selectedTagFilter: string | null;
  activeCollection: string | null;
  searchInputRef: RefObject<HTMLInputElement | null>;
  paginatedEntries: PdbEntry[];
  focusedRowIndex: number | null;
  structureNotes: Record<string, string>;
  entryComparisonLength: number;
  mounted: boolean;
  theme: string | undefined;
  setTheme: (theme: string) => void;
  setMobileMoreMenuOpen: (open: boolean) => void;
  setAdvancedFiltersOpen: (open: boolean) => void;
  setShowBookmarksOnly: (show: boolean) => void;
  setActiveCollection: (id: string | null) => void;
  setEntryCompareModalOpen: (open: boolean) => void;
  setShortcutsPanelOpen: (open: boolean) => void;
  setPreferencesDialogOpen: (open: boolean) => void;
  addNote: (pdbId: string, note: string) => void;
  updateNote: (pdbId: string, note: string) => void;
}

// ── MobileBottomNav Component ──
export default function MobileBottomNav({
  isMobile,
  detailPanelOpen,
  searchQuery,
  advancedFiltersOpen,
  showBookmarksOnly,
  bookmarksLength,
  mobileMoreMenuOpen,
  activeAdvancedFilterCount,
  methodFilter,
  selectedTagFilter,
  activeCollection,
  searchInputRef,
  paginatedEntries,
  focusedRowIndex,
  structureNotes,
  entryComparisonLength,
  mounted,
  theme,
  setTheme,
  setMobileMoreMenuOpen,
  setAdvancedFiltersOpen,
  setShowBookmarksOnly,
  setActiveCollection,
  setEntryCompareModalOpen,
  setShortcutsPanelOpen,
  setPreferencesDialogOpen,
  addNote,
  updateNote,
}: MobileBottomNavProps) {
  if (!isMobile || detailPanelOpen) return null;

  return (
    <>
      <nav className="mobile-bottom-nav sm:hidden no-print" aria-label="Mobile navigation">
        {/* Home */}
        <button
          className="mobile-nav-btn mobile-nav-btn-active"
          onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setMobileMoreMenuOpen(false); }}
          aria-label="Scroll to top"
        >
          <Home className="nav-icon" />
          <span className="nav-label">Home</span>
        </button>

        {/* Search */}
        <button
          className={`mobile-nav-btn ${searchQuery ? 'mobile-nav-btn-active' : ''}`}
          onClick={() => { searchInputRef.current?.focus(); setMobileMoreMenuOpen(false); }}
          aria-label="Search"
        >
          <Search className="nav-icon" />
          <span className="nav-label">Search</span>
        </button>

        {/* Filters */}
        <button
          className={`mobile-nav-btn ${advancedFiltersOpen ? 'mobile-nav-btn-active' : ''}`}
          onClick={() => { setAdvancedFiltersOpen(!advancedFiltersOpen); setMobileMoreMenuOpen(false); }}
          aria-label="Filters"
        >
          <SlidersHorizontal className="nav-icon" />
          <span className="nav-label">Filters</span>
          {(() => {
            const totalFilterCount = activeAdvancedFilterCount + (methodFilter !== 'all' ? 1 : 0) + (searchQuery ? 1 : 0) + (selectedTagFilter ? 1 : 0) + (showBookmarksOnly ? 1 : 0) + (activeCollection ? 1 : 0);
            return totalFilterCount > 0 ? (
              <span className="mobile-nav-badge mobile-nav-badge-filter">{totalFilterCount}</span>
            ) : null;
          })()}
        </button>

        {/* Bookmarks */}
        <button
          className={`mobile-nav-btn ${showBookmarksOnly ? 'mobile-nav-btn-active' : ''}`}
          onClick={() => { setShowBookmarksOnly(!showBookmarksOnly); if (showBookmarksOnly) setActiveCollection(null); setMobileMoreMenuOpen(false); }}
          aria-label="Bookmarks"
        >
          {showBookmarksOnly ? <BookmarkCheck className="nav-icon" /> : <Bookmark className="nav-icon" />}
          <span className="nav-label">Saved</span>
          {bookmarksLength > 0 && (
            <span className="mobile-nav-badge">{bookmarksLength}</span>
          )}
        </button>

        {/* More */}
        <button
          className={`mobile-nav-btn ${mobileMoreMenuOpen ? 'mobile-nav-btn-active' : ''}`}
          onClick={() => setMobileMoreMenuOpen(!mobileMoreMenuOpen)}
          aria-label="More options"
          aria-expanded={mobileMoreMenuOpen}
        >
          <MoreHorizontal className="nav-icon" />
          <span className="nav-label">More</span>
        </button>
      </nav>

      {/* More Menu Action Sheet */}
      <AnimatePresence>
        {mobileMoreMenuOpen && (
          <>
            <motion.div
              key="more-menu-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[51] bg-black/20"
              onClick={() => setMobileMoreMenuOpen(false)}
            />
            <motion.div
              key="more-menu"
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="mobile-more-menu mobile-more-menu-animate"
            >
              <button
                className="mobile-more-menu-item"
                onClick={() => { setTheme(theme === 'dark' ? 'light' : 'dark'); setMobileMoreMenuOpen(false); }}
              >
                {mounted && theme === 'dark' ? <Sun className="item-icon" /> : <Moon className="item-icon" />}
                <span>Toggle Dark Mode</span>
              </button>
              <button
                className="mobile-more-menu-item"
                onClick={() => {
                  setMobileMoreMenuOpen(false);
                  if (focusedRowIndex !== null) {
                    const entry = paginatedEntries[focusedRowIndex];
                    if (entry) {
                      if (structureNotes[entry.pdbId]) {
                        const edited = prompt('Edit note:', structureNotes[entry.pdbId]);
                        if (edited !== null) updateNote(entry.pdbId, edited);
                      } else {
                        const note = prompt('Add a note:');
                        if (note?.trim()) addNote(entry.pdbId, note);
                      }
                    }
                  } else {
                    toast('Select a row first', { description: 'Tap a row to select it, then add a note' });
                  }
                }}
              >
                <StickyNote className="item-icon" />
                <span>Add Note to Current</span>
              </button>
              <button
                className="mobile-more-menu-item"
                onClick={() => {
                  setMobileMoreMenuOpen(false);
                  if (entryComparisonLength >= 2) {
                    setEntryCompareModalOpen(true);
                  } else {
                    toast('Select entries to compare', { description: 'Long-press rows to add them to comparison, then use this option' });
                  }
                }}
              >
                <GitMerge className="item-icon" />
                <span>Compare Entries</span>
              </button>
              <button
                className="mobile-more-menu-item"
                onClick={() => { setShortcutsPanelOpen(true); setMobileMoreMenuOpen(false); }}
              >
                <Keyboard className="item-icon" />
                <span>Open Shortcuts</span>
              </button>
              <button
                className="mobile-more-menu-item"
                onClick={() => { setPreferencesDialogOpen(true); setMobileMoreMenuOpen(false); }}
              >
                <Settings className="item-icon" />
                <span>Open Preferences</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
