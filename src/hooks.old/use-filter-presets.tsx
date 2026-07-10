import { useState, useEffect, useCallback } from 'react';
import { Check, Filter, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

// ─── Constants ─────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
];

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface FilterPreset {
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

export interface UseFilterPresetsParams {
  currentFilters: {
    searchQuery: string;
    methodFilter: string;
    resolutionRange: [number, number];
    ifRange: [number, number];
    selectedOrganisms: Set<string>;
    hasLigandsFilter: boolean;
    dateRange: { from: string; to: string };
    qualityFilter: string;
  };
  setters: {
    setSearchQuery: (q: string) => void;
    setMethodFilter: (m: string) => void;
    setResolutionRange: (r: [number, number]) => void;
    setIfRange: (r: [number, number]) => void;
    setSelectedOrganisms: (o: Set<string>) => void;
    setHasLigandsFilter: (l: boolean) => void;
    setDateRange: (d: { from: string; to: string }) => void;
    setQualityFilter: (q: string) => void;
  };
  addActivity: (type: string, message: string) => void;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function loadPresetsFromStorage(): Record<string, FilterPreset> {
  try {
    const saved = localStorage.getItem('pdb-filter-presets');
    if (!saved) return {};
    const parsed = JSON.parse(saved);
    if (typeof parsed !== 'object' || parsed === null) return {};
    // Migrate stale preset data: add missing fields with defaults
    const migrated: Record<string, FilterPreset> = {};
    for (const [id, preset] of Object.entries(parsed)) {
      const p = preset as any;
      migrated[id] = {
        id,
        name: p.name || id,
        createdAt: p.createdAt || new Date().toISOString(),
        color: p.color || '#6b7280',
        filters: {
          searchQuery: '',
          methodFilter: 'all',
          resolutionRange: [0, 5],
          ifRange: [0, 50],
          organismFilter: [],
          ligandFilter: false,
          dateRange: { from: '', to: '' },
          qualityFilter: 'all',
          ...(p.filters || {}),
        },
      };
    }
    return migrated;
  } catch {
    return {};
  }
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useFilterPresets({ currentFilters, setters, addActivity }: UseFilterPresetsParams) {
  const {
    searchQuery, methodFilter, resolutionRange, ifRange,
    selectedOrganisms, hasLigandsFilter, dateRange, qualityFilter,
  } = currentFilters;

  const {
    setSearchQuery, setMethodFilter, setResolutionRange, setIfRange,
    setSelectedOrganisms, setHasLigandsFilter, setDateRange, setQualityFilter,
  } = setters;

  // ── State ──
  const [filterPresets, setFilterPresets] = useState<Record<string, FilterPreset>>(() =>
    loadPresetsFromStorage()
  );
  const [presetsExpanded, setPresetsExpanded] = useState(true);

  // ── Persist filter presets to localStorage ──
  useEffect(() => {
    try { localStorage.setItem('pdb-filter-presets', JSON.stringify(filterPresets)); } catch { /* ignore */ }
  }, [filterPresets]);

  // ── Count active filters in a preset ──
  const countPresetActiveFilters = useCallback((preset: FilterPreset): number => {
    const f = preset.filters;
    let count = 0;
    if (f.searchQuery) count++;
    if (f.methodFilter !== 'all') count++;
    if (f.resolutionRange && (f.resolutionRange[0] !== 0 || f.resolutionRange[1] !== 5)) count++;
    if (f.ifRange && (f.ifRange[0] !== 0 || f.ifRange[1] !== 50)) count++;
    if (f.organismFilter && f.organismFilter.length > 0) count++;
    if (f.ligandFilter) count++;
    if (f.dateRange && (f.dateRange.from || f.dateRange.to)) count++;
    if (f.qualityFilter && f.qualityFilter !== 'all') count++;
    return count;
  }, []);

  // ── Save ──
  const saveFilterPreset = useCallback((name: string) => {
    if (!name.trim()) return;
    const presetKeys = Object.keys(filterPresets);
    const colorIndex = presetKeys.length % PRESET_COLORS.length;
    const color = PRESET_COLORS[colorIndex];
    const id = `preset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newPreset: FilterPreset = {
      id,
      name: name.trim(),
      filters: {
        searchQuery,
        methodFilter,
        resolutionRange,
        ifRange,
        organismFilter: [...selectedOrganisms],
        ligandFilter: hasLigandsFilter,
        dateRange: { ...dateRange },
        qualityFilter,
      },
      createdAt: new Date().toISOString(),
      color,
    };
    setFilterPresets(prev => ({ ...prev, [id]: newPreset }));
    toast('Preset saved', {
      description: `"${name.trim()}" saved with current filters`,
      icon: <Check className="h-4 w-4 text-green-500" />,
    });
    addActivity('filter', `Saved filter preset "${name.trim()}"`);
  }, [filterPresets, searchQuery, methodFilter, resolutionRange, ifRange, selectedOrganisms, hasLigandsFilter, dateRange, qualityFilter, addActivity]);

  // ── Load ──
  const loadFilterPreset = useCallback((presetId: string) => {
    const preset = filterPresets[presetId];
    if (!preset) return;
    const f = preset.filters;
    setSearchQuery(f.searchQuery);
    setMethodFilter(f.methodFilter);
    setResolutionRange(f.resolutionRange);
    setIfRange(f.ifRange);
    setSelectedOrganisms(new Set(f.organismFilter));
    setHasLigandsFilter(f.ligandFilter);
    setDateRange({ from: f.dateRange.from, to: f.dateRange.to });
    setQualityFilter(f.qualityFilter);
    toast('Preset loaded', {
      description: `"${preset.name}" applied`,
      icon: <Filter className="h-4 w-4 text-claude-accent" />,
    });
    addActivity('filter', `Loaded filter preset "${preset.name}"`);
  }, [filterPresets, addActivity, setSearchQuery, setMethodFilter, setResolutionRange, setIfRange, setSelectedOrganisms, setHasLigandsFilter, setDateRange, setQualityFilter]);

  // ── Delete ──
  const deleteFilterPreset = useCallback((presetId: string) => {
    const preset = filterPresets[presetId];
    setFilterPresets(prev => {
      const next = { ...prev };
      delete next[presetId];
      return next;
    });
    toast('Preset deleted', {
      description: preset ? `"${preset.name}" removed` : 'Preset removed',
      icon: <Trash2 className="h-4 w-4 text-red-500" />,
    });
    if (preset) addActivity('filter', `Deleted filter preset "${preset.name}"`);
  }, [filterPresets, addActivity]);

  // ── Rename ──
  const renameFilterPreset = useCallback((presetId: string, newName: string) => {
    if (!newName.trim()) return;
    setFilterPresets(prev => ({
      ...prev,
      [presetId]: { ...prev[presetId], name: newName.trim() },
    }));
    toast('Preset renamed', { description: `Renamed to "${newName.trim()}"` });
  }, []);

  // ── Save prompt ──
  const handleSavePresetPrompt = useCallback(() => {
    const name = prompt('Enter preset name:');
    if (name?.trim()) {
      saveFilterPreset(name);
    }
  }, [saveFilterPreset]);

  return {
    filterPresets,
    presetsExpanded,
    setPresetsExpanded,
    countPresetActiveFilters,
    saveFilterPreset,
    loadFilterPreset,
    deleteFilterPreset,
    renameFilterPreset,
    handleSavePresetPrompt,
  };
}
