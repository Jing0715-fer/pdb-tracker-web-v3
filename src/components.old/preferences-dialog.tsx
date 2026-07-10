'use client';

import React from 'react';
import {
  Settings,
  RotateCcw,
  Table2,
  BookOpen,
  Sparkles,
  Monitor,
  Moon,
  Sun,
  LayoutGrid,
  Sidebar,
  Hash,
  FlaskConical,
  Gauge,
  Calendar,
  Globe,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  type UserPreferences,
  DEFAULT_PREFERENCES,
} from '@/hooks/use-user-preferences';

// ─── Types ─────────────────────────────────────────────────────────────────

interface PreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preferences: UserPreferences;
  updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
  resetPreferences: () => void;
  resetColumnOrder?: () => void;
}

// ─── Section Helper ────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="flex items-center justify-center w-6 h-6 rounded-md bg-claude-accent/10 text-claude-accent">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <h3 className="text-xs font-semibold text-claude-text dark:text-[#e8e4dd] uppercase tracking-wider">
        {title}
      </h3>
    </div>
  );
}

function PreferenceRow({ label, description, children }: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="min-w-0 flex-1">
        <Label className="text-sm font-medium text-claude-text dark:text-[#e8e4dd]">
          {label}
        </Label>
        {description && (
          <p className="text-[11px] text-claude-text-muted dark:text-[#9b9590] mt-0.5 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

// ─── Column Definitions ────────────────────────────────────────────────────

const COLUMN_GROUPS = [
  {
    label: 'Core',
    columns: [
      { key: 'pdb_id', label: 'PDB ID', icon: Hash },
      { key: 'method', label: 'Method', icon: FlaskConical },
      { key: 'resolution', label: 'Resolution', icon: Gauge },
    ],
  },
  {
    label: 'Details',
    columns: [
      { key: 'if', label: 'Impact Factor', icon: Gauge },
      { key: 'organism', label: 'Organism', icon: Globe },
      { key: 'title', label: 'Title', icon: BookOpen },
    ],
  },
  {
    label: 'Extra',
    columns: [
      { key: 'ligands', label: 'Ligands', icon: FlaskConical },
      { key: 'release_date', label: 'Release Date', icon: Calendar },
      { key: 'journal', label: 'Journal', icon: BookOpen },
    ],
  },
] as const;

const ALL_COLUMN_KEYS = COLUMN_GROUPS.flatMap(g => g.columns.map(c => c.key));

// ─── Component ─────────────────────────────────────────────────────────────

export function PreferencesDialog({
  open,
  onOpenChange,
  preferences,
  updatePreference,
  resetPreferences,
  resetColumnOrder,
}: PreferencesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto bg-white dark:bg-[#1e1d1b] border border-claude-border dark:border-[#3d3832]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-claude-text dark:text-[#e8e4dd]">
            <Settings className="h-4 w-4 text-claude-accent" />
            Preferences
          </DialogTitle>
          <DialogDescription className="text-claude-text-muted dark:text-[#9b9590]">
            Customize your PDB Structure Tracker experience. Changes are saved automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* ── Table ─────────────────────────── */}
          <section>
            <SectionHeader icon={Table2} title="Table" />
            <div className="space-y-1 pl-8">
              <PreferenceRow
                label="Default Sort Field"
                description="Which column to sort by when loading a new week"
              >
                <Select
                  value={preferences.defaultSortField}
                  onValueChange={(v) => updatePreference('defaultSortField', v as UserPreferences['defaultSortField'])}
                >
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="pdb_id">PDB ID</SelectItem>
                    <SelectItem value="resolution">Resolution</SelectItem>
                    <SelectItem value="release_date">Release Date</SelectItem>
                    <SelectItem value="journal_if">Impact Factor</SelectItem>
                  </SelectContent>
                </Select>
              </PreferenceRow>

              <PreferenceRow
                label="Default Sort Order"
                description="Direction for the default sort"
              >
                <Select
                  value={preferences.defaultSortDesc ? 'desc' : 'asc'}
                  onValueChange={(v) => updatePreference('defaultSortDesc', v === 'desc')}
                >
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="desc">Descending</SelectItem>
                    <SelectItem value="asc">Ascending</SelectItem>
                  </SelectContent>
                </Select>
              </PreferenceRow>

              <PreferenceRow
                label="Page Size"
                description="Number of entries per page"
              >
                <Select
                  value={String(preferences.defaultPageSize)}
                  onValueChange={(v) => updatePreference('defaultPageSize', Number(v) as UserPreferences['defaultPageSize'])}
                >
                  <SelectTrigger className="w-[100px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </PreferenceRow>

              {/* Table Density */}
              <div className="py-2">
                <Label className="text-sm font-medium text-claude-text dark:text-[#e8e4dd]">
                  Table Density
                </Label>
                <p className="text-[11px] text-claude-text-muted dark:text-[#9b9590] mt-0.5 leading-relaxed">
                  Row spacing in the data table
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    className={`density-btn density-compact-btn ${preferences.tableDensity === 'compact' ? 'active' : ''}`}
                    onClick={() => updatePreference('tableDensity', 'compact')}
                  >
                    <Table2 className="h-4 w-4" style={{ fontSize: '8px' }} />
                    <div className="flex flex-col items-center">
                      <div className="flex flex-col gap-[1px]">
                        <div className="w-10 h-[3px] bg-current opacity-30 rounded-sm" />
                        <div className="w-10 h-[3px] bg-current opacity-30 rounded-sm" />
                        <div className="w-10 h-[3px] bg-current opacity-30 rounded-sm" />
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-claude-text-secondary dark:text-[#9b9590]">Compact</span>
                  </button>
                  <button
                    type="button"
                    className={`density-btn density-comfortable-btn ${preferences.tableDensity === 'comfortable' ? 'active' : ''}`}
                    onClick={() => updatePreference('tableDensity', 'comfortable')}
                  >
                    <Table2 className="h-4 w-4" />
                    <div className="flex flex-col items-center">
                      <div className="flex flex-col gap-[2px]">
                        <div className="w-10 h-[4px] bg-current opacity-30 rounded-sm" />
                        <div className="w-10 h-[4px] bg-current opacity-30 rounded-sm" />
                        <div className="w-10 h-[4px] bg-current opacity-30 rounded-sm" />
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-claude-text-secondary dark:text-[#9b9590]">Comfortable</span>
                  </button>
                  <button
                    type="button"
                    className={`density-btn density-spacious-btn ${preferences.tableDensity === 'spacious' ? 'active' : ''}`}
                    onClick={() => updatePreference('tableDensity', 'spacious')}
                  >
                    <Table2 className="h-4 w-4" style={{ fontSize: '16px' }} />
                    <div className="flex flex-col items-center">
                      <div className="flex flex-col gap-[4px]">
                        <div className="w-10 h-[5px] bg-current opacity-30 rounded-sm" />
                        <div className="w-10 h-[5px] bg-current opacity-30 rounded-sm" />
                        <div className="w-10 h-[5px] bg-current opacity-30 rounded-sm" />
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-claude-text-secondary dark:text-[#9b9590]">Spacious</span>
                  </button>
                </div>
              </div>

              {/* Column Visibility */}
              <div className="py-2">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <Label className="text-sm font-medium text-claude-text dark:text-[#e8e4dd]">
                      Column Visibility
                    </Label>
                    <p className="text-[11px] text-claude-text-muted dark:text-[#9b9590] mt-0.5 leading-relaxed">
                      Choose which columns to display
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="text-[10px] px-1.5 py-0.5 rounded text-claude-accent hover:bg-claude-accent/10 transition-colors"
                      onClick={() => updatePreference('visibleColumns', [...ALL_COLUMN_KEYS])}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      className="text-[10px] px-1.5 py-0.5 rounded text-claude-text-muted hover:bg-claude-accent/10 hover:text-claude-accent transition-colors"
                      onClick={() => updatePreference('visibleColumns', [])}
                    >
                      None
                    </button>
                  </div>
                </div>
                <div className="space-y-2 mt-2">
                  {COLUMN_GROUPS.map((group) => (
                    <div key={group.label}>
                      <p className="text-[10px] font-semibold text-claude-text-muted dark:text-[#6b6560] uppercase tracking-wider mb-1">
                        {group.label}
                      </p>
                      <div className="grid grid-cols-3 gap-1">
                        {group.columns.map((col) => {
                          const ColIcon = col.icon;
                          const isChecked = preferences.visibleColumns.includes(col.key);
                          return (
                            <label
                              key={col.key}
                              className="flex items-center gap-1.5 cursor-pointer py-0.5 px-1 rounded hover:bg-claude-accent/5 transition-colors"
                            >
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={(checked) => {
                                  const next = checked
                                    ? [...preferences.visibleColumns, col.key]
                                    : preferences.visibleColumns.filter((k) => k !== col.key);
                                  updatePreference('visibleColumns', next);
                                }}
                                className="h-3.5 w-3.5"
                              />
                              <ColIcon className="h-3 w-3 text-claude-text-muted dark:text-[#6b6560] shrink-0" />
                              <span className="text-[11px] text-claude-text dark:text-[#e8e4dd] truncate">
                                {col.label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <Separator />

          {/* ── Display ────────────────────────── */}
          <section>
            <SectionHeader icon={LayoutGrid} title="Display" />
            <div className="space-y-1 pl-8">
              <PreferenceRow
                label="Default View Mode"
                description="Which view to show when switching weeks"
              >
                <Select
                  value={preferences.defaultViewMode}
                  onValueChange={(v) => updatePreference('defaultViewMode', v as UserPreferences['defaultViewMode'])}
                >
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="table">Table</SelectItem>
                    <SelectItem value="literature">Literature</SelectItem>
                  </SelectContent>
                </Select>
              </PreferenceRow>

              <PreferenceRow
                label="Compact Table"
                description="Use tighter row heights in the table"
              >
                <Switch
                  checked={preferences.compactTable}
                  onCheckedChange={(checked) => updatePreference('compactTable', checked)}
                />
              </PreferenceRow>

              <PreferenceRow
                label="Quality Score Dots"
                description="Show colored quality dots next to PDB IDs"
              >
                <Switch
                  checked={preferences.showQualityDots}
                  onCheckedChange={(checked) => updatePreference('showQualityDots', checked)}
                />
              </PreferenceRow>

              <PreferenceRow
                label="Hover Cards"
                description="Show preview cards when hovering over PDB IDs"
              >
                <Switch
                  checked={preferences.showHoverCards}
                  onCheckedChange={(checked) => updatePreference('showHoverCards', checked)}
                />
              </PreferenceRow>

              <PreferenceRow
                label="Show Row Numbers"
                description="Display row index numbers in the table"
              >
                <Switch
                  checked={preferences.showRowNumbers}
                  onCheckedChange={(checked) => updatePreference('showRowNumbers', checked)}
                />
              </PreferenceRow>

              <PreferenceRow
                label="Show Ligand Chips"
                description="Display ligand molecules as colored chips"
              >
                <Switch
                  checked={preferences.showLigandChips}
                  onCheckedChange={(checked) => updatePreference('showLigandChips', checked)}
                />
              </PreferenceRow>
            </div>
          </section>

          <Separator />

          {/* ── Sidebar ────────────────────────── */}
          <section>
            <SectionHeader icon={Sidebar} title="Sidebar" />
            <div className="space-y-1 pl-8">
              <PreferenceRow
                label="Collapsed by Default"
                description="Start with the sidebar collapsed"
              >
                <Switch
                  checked={preferences.sidebarCollapsed}
                  onCheckedChange={(checked) => updatePreference('sidebarCollapsed', checked)}
                />
              </PreferenceRow>
            </div>
          </section>

          <Separator />

          {/* ── Advanced ──────────────────────── */}
          <section>
            <SectionHeader icon={Sparkles} title="Advanced" />
            <div className="space-y-1 pl-8">
              <PreferenceRow
                label="Show Notifications"
                description="Display notification bell in the header"
              >
                <Switch
                  checked={preferences.showNotifications}
                  onCheckedChange={(checked) => updatePreference('showNotifications', checked)}
                />
              </PreferenceRow>

              <PreferenceRow
                label="Enable Animations"
                description="Disable for reduced motion preferences"
              >
                <Switch
                  checked={preferences.animationsEnabled}
                  onCheckedChange={(checked) => updatePreference('animationsEnabled', checked)}
                />
              </PreferenceRow>

              {/* Animation Speed */}
              <div className="py-2">
                <Label className="text-sm font-medium text-claude-text dark:text-[#e8e4dd]">
                  Animation Speed
                </Label>
                <p className="text-[11px] text-claude-text-muted dark:text-[#9b9590] mt-0.5 leading-relaxed">
                  Speed for UI transitions and animations
                </p>
                <div className="flex gap-2 mt-2">
                  {(['slow', 'normal', 'fast'] as const).map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      className={`density-btn ${preferences.animationSpeed === speed ? 'active' : ''}`}
                      onClick={() => updatePreference('animationSpeed', speed)}
                    >
                      <Gauge className="h-4 w-4" />
                      <span className="text-[10px] font-medium text-claude-text-secondary dark:text-[#9b9590] capitalize">
                        {speed}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <Separator />

          {/* ── Theme ──────────────────────────── */}
          <section>
            <SectionHeader icon={Monitor} title="Theme" />
            <div className="space-y-1 pl-8">
              <PreferenceRow
                label="Color Theme"
                description="Application color scheme"
              >
                <Select
                  value={preferences.theme}
                  onValueChange={(v) => updatePreference('theme', v as UserPreferences['theme'])}
                >
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="system">
                      <span className="flex items-center gap-1.5">
                        <Monitor className="h-3 w-3" />
                        System
                      </span>
                    </SelectItem>
                    <SelectItem value="light">
                      <span className="flex items-center gap-1.5">
                        <Sun className="h-3 w-3" />
                        Light
                      </span>
                    </SelectItem>
                    <SelectItem value="dark">
                      <span className="flex items-center gap-1.5">
                        <Moon className="h-3 w-3" />
                        Dark
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </PreferenceRow>
            </div>
          </section>
        </div>

        <DialogFooter className="mt-2 flex gap-2">
          {resetColumnOrder && (
          <Button
            variant="outline"
            size="sm"
            onClick={resetColumnOrder}
            className="text-xs gap-1.5 text-claude-accent hover:text-claude-accent-hover hover:bg-claude-accent-light dark:hover:bg-claude-accent/10 border-claude-border dark:border-[#3d3832]"
          >
            <RotateCcw className="h-3 w-3" />
            Reset Column Order
          </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              resetPreferences();
            }}
            className="text-xs gap-1.5 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800/30"
          >
            <RotateCcw className="h-3 w-3" />
            Reset to Defaults
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
