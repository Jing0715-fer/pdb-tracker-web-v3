'use client';

import React from 'react';
import {
  Calendar,
  Microscope,
  Download,
  FileJson,
  Table as TableIcon,
  ClipboardCopy,
  Printer,
  Upload,
  GitCompareArrows,
  RotateCcw,
  BookmarkPlus,
  Bookmark,
  StickyNote,
  AlignJustify,
  SlidersHorizontal,
  Eye,
  EyeOff,
  PanelRightOpen,
  Sun,
  Moon,
  BookOpen,
  ZoomIn,
  ZoomOut,
  Settings,
  Search,
  Compass,
  HelpCircle,
  Pin,
} from 'lucide-react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from '@/components/ui/command';
import type { PdbEntry, WeeklySnapshot } from '@/lib/pdb-types';

interface FilterPreset {
  id: string;
  name: string;
  filters: {
    searchQuery: string;
    methodFilter: string;
    resolutionRange: [number, number];
    ifRange: [number, number];
    organismFilter: string[];
    ligandFilter: boolean;
    dateRange: { from: string; to: string };
    qualityFilter: string;
  };
  createdAt: string;
  color: string;
}

export interface PdbCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshots: WeeklySnapshot[];
  selectedWeekId: string | null;
  setSelectedWeekId: (weekId: string) => void;
  setMode: (mode: 'evaluation' | 'weekly') => void;
  handleExportCsv: () => void;
  handleExportJson: () => void;
  handleExportJsonFull: () => void;
  handleExportMarkdown: () => void;
  handleExportClipboard: () => void;
  setImportDialogOpen: (open: boolean) => void;
  compareMode: boolean;
  setCompareMode: (mode: boolean) => void;
  setCompareWeekId: (weekId: string | null) => void;
  setMethodFilter: (filter: string) => void;
  setSearchQuery: (query: string) => void;
  clearAdvancedFilters: () => void;
  setShowBookmarksOnly: (show: boolean | ((prev: boolean) => boolean)) => void;
  setSelectedTagFilter: (tag: string | null) => void;
  setActiveCollection: (collection: string | null) => void;
  setQuickFilters: (filters: Set<string>) => void;
  handleSavePresetPrompt: () => void;
  filterPresets: Record<string, FilterPreset>;
  loadFilterPreset: (presetId: string) => void;
  focusedRowIndex: number | null;
  paginatedEntries: PdbEntry[];
  structureNotes: Record<string, string>;
  updateNote: (pdbId: string, note: string) => void;
  addNote: (pdbId: string, note: string) => void;
  setCompactMode: (compact: boolean | ((prev: boolean) => boolean)) => void;
  setAdvancedFiltersOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  previewOpen: boolean;
  setPreviewOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  selectedEntry: PdbEntry | null;
  setDetailPanelOpen: (open: boolean) => void;
  mounted: boolean;
  theme: string;
  setTheme: (theme: string) => void;
  mainViewMode: string;
  setMainViewMode: (mode: string) => void;
  setPreferencesDialogOpen: (open: boolean) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  startTour: () => void;
  toast: (message: string, options?: { description?: string }) => void;
  pinSelectedEntries: () => void;
  selectedRows: Set<string>;
}

export function PdbCommandPalette({
  open,
  onOpenChange,
  snapshots,
  selectedWeekId,
  setSelectedWeekId,
  setMode,
  handleExportCsv,
  handleExportJson,
  handleExportJsonFull,
  handleExportMarkdown,
  handleExportClipboard,
  setImportDialogOpen,
  compareMode,
  setCompareMode,
  setCompareWeekId,
  setMethodFilter,
  setSearchQuery,
  clearAdvancedFilters,
  setShowBookmarksOnly,
  setSelectedTagFilter,
  setActiveCollection,
  setQuickFilters,
  handleSavePresetPrompt,
  filterPresets,
  loadFilterPreset,
  focusedRowIndex,
  paginatedEntries,
  structureNotes,
  updateNote,
  addNote,
  setCompactMode,
  setAdvancedFiltersOpen,
  previewOpen,
  setPreviewOpen,
  selectedEntry,
  setDetailPanelOpen,
  mounted,
  theme,
  setTheme,
  mainViewMode,
  setMainViewMode,
  setPreferencesDialogOpen,
  searchInputRef,
  startTour,
  toast,
  pinSelectedEntries,
  selectedRows,
}: PdbCommandPaletteProps) {
  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command Palette"
      description="Search for a command to run..."
      className="sm:max-w-lg glass-card glass-enhanced shadow-depth-3"
    >
      <CommandInput placeholder="Type a command or search..." />
      <CommandList className="max-h-[360px] animate-scale-in slide-in-stagger fade-mask-bottom">
        <CommandEmpty>No commands found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => { onOpenChange(false); if (snapshots.length > 0) setSelectedWeekId(snapshots[0].weekId); }}>
            <Calendar className="h-4 w-4 mr-2 text-claude-text-muted" />
            <span>Go to First Week</span>
          </CommandItem>
          <CommandItem onSelect={() => { onOpenChange(false); if (snapshots.length > 0) setSelectedWeekId(snapshots[snapshots.length - 1].weekId); }}>
            <Calendar className="h-4 w-4 mr-2 text-claude-text-muted" />
            <span>Go to Latest Week</span>
          </CommandItem>
          <CommandItem onSelect={() => { onOpenChange(false); setMode('evaluation'); }}>
            <Microscope className="h-4 w-4 mr-2 text-claude-text-muted" />
            <span>Switch to Evaluation Mode</span>
            <CommandShortcut>⌘E</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => { onOpenChange(false); setMode('weekly'); }}>
            <Calendar className="h-4 w-4 mr-2 text-claude-text-muted" />
            <span>Switch to Weekly Mode</span>
            <CommandShortcut>⌘E</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Data">
          <CommandItem onSelect={() => { onOpenChange(false); handleExportCsv(); }}>
            <Download className="h-4 w-4 mr-2 text-claude-text-muted" />
            <span>Export Current View as CSV</span>
          </CommandItem>
          <CommandItem onSelect={() => { onOpenChange(false); handleExportJson(); }}>
            <FileJson className="h-4 w-4 mr-2 text-claude-text-muted" />
            <span>Export as JSON</span>
          </CommandItem>
          <CommandItem onSelect={() => { onOpenChange(false); handleExportJsonFull(); }}>
            <FileJson className="h-4 w-4 mr-2 text-claude-text-muted" />
            <span>Export as JSON (Full)</span>
          </CommandItem>
          <CommandItem onSelect={() => { onOpenChange(false); handleExportMarkdown(); }}>
            <TableIcon className="h-4 w-4 mr-2 text-claude-text-muted" />
            <span>Export as Markdown Table</span>
          </CommandItem>
          <CommandItem onSelect={() => { onOpenChange(false); handleExportClipboard(); }}>
            <ClipboardCopy className="h-4 w-4 mr-2 text-claude-text-muted" />
            <span>Copy to Clipboard (TSV)</span>
          </CommandItem>
          <CommandItem onSelect={() => { onOpenChange(false); window.print(); }}>
            <Printer className="h-4 w-4 mr-2 text-claude-text-muted" />
            <span>Print Report</span>
          </CommandItem>
          <CommandItem onSelect={() => { onOpenChange(false); setImportDialogOpen(true); }}>
            <Upload className="h-4 w-4 mr-2 text-claude-text-muted" />
            <span>Import Data…</span>
            <CommandShortcut>⌘I</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => { onOpenChange(false); if (compareMode) { setCompareMode(false); setCompareWeekId(null); } else setCompareMode(true); }}>
            <GitCompareArrows className="h-4 w-4 mr-2 text-claude-text-muted" />
            <span>Toggle Compare Mode</span>
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Filters">
          <CommandItem onSelect={() => { onOpenChange(false); setMethodFilter('all'); setSearchQuery(''); clearAdvancedFilters(); setShowBookmarksOnly(false); setSelectedTagFilter(null); setActiveCollection(null); setQuickFilters(new Set()); }}>
            <RotateCcw className="h-4 w-4 mr-2 text-claude-text-muted" />
            <span>Clear All Filters</span>
          </CommandItem>
          <CommandItem onSelect={() => { onOpenChange(false); handleSavePresetPrompt(); }}>
            <BookmarkPlus className="h-4 w-4 mr-2 text-claude-text-muted" />
            <span>Save Current Filters as Preset</span>
          </CommandItem>
          {Object.values(filterPresets).map(preset => (
            <CommandItem key={preset.id} onSelect={() => { onOpenChange(false); loadFilterPreset(preset.id); }}>
              <span className="w-2 h-2 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: preset.color }} />
              <span className="line-clamp-3">Load Preset: {preset.name}</span>
            </CommandItem>
          ))}
          <CommandItem onSelect={() => { onOpenChange(false); setShowBookmarksOnly(prev => !prev); }}>
            <Bookmark className="h-4 w-4 mr-2 text-claude-text-muted" />
            <span>Show Bookmarked Only</span>
            <CommandShortcut>⌘B</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => {
            onOpenChange(false);
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
              toast('Select a row first', { description: 'Use arrow keys to highlight a row, then press N' });
            }
          }}>
            <StickyNote className="h-4 w-4 mr-2 text-amber-500" />
            <span>Add Note to Current Entry</span>
            <CommandShortcut>N</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => { onOpenChange(false); pinSelectedEntries(); }} disabled={selectedRows.size === 0}>
            <Pin className="h-4 w-4 mr-2 text-claude-text-muted" />
            <span>Pin Selected{selectedRows.size > 0 ? ` (${selectedRows.size})` : ''}</span>
          </CommandItem>
          <CommandItem onSelect={() => { onOpenChange(false); setCompactMode(prev => !prev); }}>
            <AlignJustify className="h-4 w-4 mr-2 text-claude-text-muted" />
            <span>Toggle Compact Mode</span>
          </CommandItem>
          <CommandItem onSelect={() => { onOpenChange(false); setAdvancedFiltersOpen(prev => !prev); }}>
            <SlidersHorizontal className="h-4 w-4 mr-2 text-claude-text-muted" />
            <span>Open Advanced Filters</span>
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="View">
          <CommandItem onSelect={() => { onOpenChange(false); setPreviewOpen(prev => !prev); }}>
            {previewOpen ? <EyeOff className="h-4 w-4 mr-2 text-claude-text-muted" /> : <Eye className="h-4 w-4 mr-2 text-claude-text-muted" />}
            <span>Toggle Preview Panel</span>
          </CommandItem>
          <CommandItem onSelect={() => { onOpenChange(false); if (selectedEntry) setDetailPanelOpen(true); else toast('Select a row first', { description: 'Click a PDB entry row to open the detail panel' }); }}>
            <PanelRightOpen className="h-4 w-4 mr-2 text-claude-text-muted" />
            <span>Open Detail Panel</span>
          </CommandItem>
          <CommandItem onSelect={() => {
            onOpenChange(false);
            document.body.classList.add('theme-transitioning');
            setTheme(theme === 'dark' ? 'light' : 'dark');
            setTimeout(() => document.body.classList.remove('theme-transitioning'), 400);
          }}>
            {mounted && theme === 'dark' ? <Sun className="h-4 w-4 mr-2 text-claude-text-muted" /> : <Moon className="h-4 w-4 mr-2 text-claude-text-muted" />}
            <span>Toggle Dark Mode</span>
          </CommandItem>
          <CommandItem onSelect={() => { onOpenChange(false); setMainViewMode(mainViewMode === 'table' ? 'literature' : 'table'); }}>
            <BookOpen className="h-4 w-4 mr-2 text-claude-text-muted" />
            <span>{mainViewMode === 'table' ? 'Switch to Literature View' : 'Switch to Table View'}</span>
          </CommandItem>
          <CommandItem onSelect={() => { onOpenChange(false); toast('Zoomed in! 🔍', { description: '(Just for fun — no actual zoom)' }); }}>
            <ZoomIn className="h-4 w-4 mr-2 text-claude-text-muted" />
            <span>Zoom In</span>
          </CommandItem>
          <CommandItem onSelect={() => { onOpenChange(false); toast('Zoomed out! 👀', { description: '(Just for fun — no actual zoom)' }); }}>
            <ZoomOut className="h-4 w-4 mr-2 text-claude-text-muted" />
            <span>Zoom Out</span>
          </CommandItem>
          <CommandItem onSelect={() => { onOpenChange(false); setPreferencesDialogOpen(true); }}>
            <Settings className="h-4 w-4 mr-2 text-claude-text-muted" />
            <span>Open Preferences</span>
            <CommandShortcut>⌘,</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Help">
          <CommandItem onSelect={() => { onOpenChange(false); searchInputRef.current?.focus(); }}>
            <Search className="h-4 w-4 mr-2 text-claude-text-muted" />
            <span>Show Keyboard Shortcuts</span>
            <CommandShortcut>⌘K</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => { onOpenChange(false); startTour(); }}>
            <Compass className="h-4 w-4 mr-2 text-claude-text-muted" />
            <span>Start Tour</span>
          </CommandItem>
          <CommandItem onSelect={() => { onOpenChange(false); toast('PDB Structure Tracker', { description: 'Track and evaluate protein structures from the PDB database. Use ⌘⇧P to open this palette anytime.' }); }}>
            <HelpCircle className="h-4 w-4 mr-2 text-claude-text-muted" />
            <span>Show Help</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
