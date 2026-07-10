'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bookmark,
  Crosshair,
  Snowflake,
  Scan,
  FlaskConical,
  TrendingUp,
  Star,
  SlidersHorizontal,
  Save,
  Trash2,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocalStorage } from '@/hooks/use-local-storage';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FilterPreset {
  id: string;
  name: string;
  icon: string;
  filters: {
    methodFilter?: string;
    quickFilters?: string[];
    searchQuery?: string;
    minResolution?: number;
    maxResolution?: number;
    minIf?: number;
  };
  isCustom: boolean;
}

interface FilterPresetsProps {
  currentFilters: {
    methodFilter: string;
    quickFilters: Set<string>;
    searchQuery: string;
  };
  onApplyPreset: (preset: FilterPreset) => void;
  activePresetId: string | null;
}

// ─── Built-in Presets ─────────────────────────────────────────────────────────

const BUILT_IN_PRESETS: FilterPreset[] = [
  { id: 'high-res', name: 'High Resolution', icon: 'Crosshair', filters: { methodFilter: 'all', quickFilters: ['high-res'] }, isCustom: false },
  { id: 'cryoem-only', name: 'Cryo-EM Only', icon: 'Snowflake', filters: { methodFilter: 'Cryo-EM', quickFilters: [] }, isCustom: false },
  { id: 'xray-only', name: 'X-ray Only', icon: 'Scan', filters: { methodFilter: 'X-ray', quickFilters: [] }, isCustom: false },
  { id: 'high-impact', name: 'High Impact', icon: 'TrendingUp', filters: { methodFilter: 'all', quickFilters: ['high-if'] }, isCustom: false },
  { id: 'with-ligands', name: 'With Ligands', icon: 'FlaskConical', filters: { methodFilter: 'all', quickFilters: ['with-ligands'] }, isCustom: false },
  { id: 'bookmarked', name: 'Bookmarked', icon: 'Bookmark', filters: { methodFilter: 'all', quickFilters: ['bookmarked'] }, isCustom: false },
];

// ─── Icon Map ─────────────────────────────────────────────────────────────────

const iconMap: Record<string, React.ElementType> = {
  Crosshair,
  Snowflake,
  Scan,
  FlaskConical,
  TrendingUp,
  Bookmark,
  Star,
};

// ─── Component ────────────────────────────────────────────────────────────────

export function FilterPresets({ currentFilters, onApplyPreset, activePresetId }: FilterPresetsProps) {
  const [customPresets, setCustomPresets] = useLocalStorage<FilterPreset[]>(
    'pdb-filter-presets',
    [],
  );
  const allPresets = [...BUILT_IN_PRESETS, ...customPresets];
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  const handleSavePreset = useCallback(() => {
    if (!newPresetName.trim()) return;
    const preset: FilterPreset = {
      id: `custom-${Date.now()}`,
      name: newPresetName.trim(),
      icon: 'Star',
      filters: {
        methodFilter: currentFilters.methodFilter,
        quickFilters: Array.from(currentFilters.quickFilters),
        searchQuery: currentFilters.searchQuery,
      },
      isCustom: true,
    };
    setCustomPresets(prev => [...prev, preset]);
    setNewPresetName('');
    setShowSaveDialog(false);
  }, [newPresetName, currentFilters, setCustomPresets]);

  const handleDeletePreset = useCallback((id: string) => {
    setCustomPresets(prev => prev.filter(p => p.id !== id));
  }, [setCustomPresets]);

  return (
    <div className="space-y-2">
      {/* Preset chips */}
      <div className="chip-group scroll-snap-x flex-wrap gap-2">
        {allPresets.map(preset => {
          const Icon = iconMap[preset.icon] || SlidersHorizontal;
          const isActive = activePresetId === preset.id;
          return (
            <button
              key={preset.id}
              onClick={(e) => {
                onApplyPreset(preset);
                // Ripple effect
                const btn = e.currentTarget;
                const existing = btn.querySelector('.ripple-wave');
                if (existing) existing.remove();
                const ripple = document.createElement('span');
                ripple.className = 'ripple-wave';
                const rect = btn.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                ripple.style.width = ripple.style.height = `${size}px`;
                ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
                ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
                btn.style.position = 'relative';
                btn.style.overflow = 'hidden';
                btn.appendChild(ripple);
                setTimeout(() => ripple.remove(), 500);
              }}
              className={`chip ripple-effect morph-card accent-underline ${isActive ? 'chip-active' : ''} flex items-center gap-1.5`}
            >
              <Icon className="h-3 w-3" />
              <span>{preset.name}</span>
              {isActive && <Check className="h-3 w-3 ml-1" />}
              {preset.isCustom && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeletePreset(preset.id); }}
                  className="ml-1 p-0.5 rounded hover:bg-red-500/20 text-red-400"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              )}
            </button>
          );
        })}
        <button
          onClick={() => setShowSaveDialog(!showSaveDialog)}
          className="chip flex items-center gap-1.5 border-dashed"
        >
          <Save className="h-3 w-3" />
          <span>Save Current</span>
        </button>
      </div>

      {/* Save dialog */}
      <AnimatePresence>
        {showSaveDialog && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/5 border border-accent/20">
              <input
                type="text"
                value={newPresetName}
                onChange={e => setNewPresetName(e.target.value)}
                placeholder="Preset name..."
                className="glass-input flex-1 px-2 py-1 text-sm rounded-md"
                onKeyDown={e => e.key === 'Enter' && handleSavePreset()}
                autoFocus
              />
              <button onClick={handleSavePreset} className="p-1 rounded-md hover:bg-accent/20">
                <Check className="h-4 w-4 text-accent" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export type { FilterPreset };
