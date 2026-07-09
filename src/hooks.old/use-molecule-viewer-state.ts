'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@/hooks/use-toast';
import type { EntityInfo, ViewerActions } from '@/components/molecule-viewer';
import type { LigandInfo, PdbEntry, EvalPdbStructure } from '@/lib/pdb-types';

export interface UseMoleculeViewerStateOptions {
  /** The currently selected entry — used to sync the viewer */
  selectedEntry: PdbEntry | null;
  /** The currently selected eval structure (from BLAST / literature) */
  selectedEvalStructure: (EvalPdbStructure & { isBlast?: boolean }) | null;
  /** Called when a new entry is selected for activity tracking */
  addActivity?: (type: string, message: string, data?: Record<string, unknown>) => void;
  /** Recently viewed list setter (appended to) */
  setRecentlyViewed?: React.Dispatch<React.SetStateAction<Array<{ pdbId: string; title: string; timestamp: number }>>>;
  /** Open the preview panel when an entry is selected */
  setPreviewOpen?: (open: boolean) => void;
  /** Open the detail panel when an entry is selected */
  setDetailPanelOpen?: (open: boolean) => void;
  /** Reset the preview tab */
  setPreviewTab?: (tab: string) => void;
}

export function useMoleculeViewerState(options: UseMoleculeViewerStateOptions) {
  const {
    selectedEntry,
    selectedEvalStructure,
    addActivity,
    setRecentlyViewed,
    setPreviewOpen,
    setDetailPanelOpen,
    setPreviewTab,
  } = options;

  // ── Detail Panel 3D & Entity State ──
  const [selectedPdbId, setSelectedPdbId] = useState<string | null>(null);
  const [entities, setEntities] = useState<EntityInfo[]>([]);
  const [ligandCodes, setLigandCodes] = useState<string[]>([]);
  const [ligandColors, setLigandColors] = useState<Record<string, string>>({});
  const [ligandVisibility, setLigandVisibility] = useState<Record<string, boolean>>({});
  const [entityVisibility, setEntityVisibility] = useState<Record<string, boolean>>({});
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [selectedLigand, setSelectedLigand] = useState<string | null>(null);
  const [hoveredEntity, setHoveredEntity] = useState<string | null>(null);
  const [hoveredLigand, setHoveredLigand] = useState<string | null>(null);
  const [hoveredEntityFrom3D, setHoveredEntityFrom3D] = useState(false);
  const [hoveredLigandFrom3D, setHoveredLigandFrom3D] = useState(false);
  const [representation, setRepresentation] = useState<'cartoon' | 'ball-stick' | 'surface'>('cartoon');
  const [soloLigand, setSoloLigand] = useState<string | null>(null);
  const [soloEntity, setSoloEntity] = useState<string | null>(null);
  const viewerActionsRef = useRef<ViewerActions | null>(null);

  // ── Entity Colors (for 3D viewer) ──
  const [entityColors, setEntityColors] = useState<Record<string, string>>({});
  const [hoveredEntityInPanel, setHoveredEntityInPanel] = useState<string | null>(null);
  // Eval mode also supports entity interaction
  const [evalEntityColors, setEvalEntityColors] = useState<Record<string, string>>({});
  const [evalHoveredEntity, setEvalHoveredEntity] = useState<string | null>(null);

  // ── Ligand Cache ──
  const [ligandCache, setLigandCache] = useState<Record<string, LigandInfo>>({});

  // ── Entity Color Handler (for 3D viewer) ──
  const handleEntityColorChange = useCallback((entityId: string, color: string) => {
    setEntityColors(prev => ({ ...prev, [entityId]: color }));
    toast({ title: 'Color updated', description: `Entity ${entityId.split('.')[1]} color changed` });
  }, []);

  // ── Eval Entity Color Handler (for 3D viewer in eval mode) ──
  const handleEvalEntityColorChange = useCallback((entityId: string, color: string) => {
    setEvalEntityColors(prev => ({ ...prev, [entityId]: color }));
  }, []);

  // ── Focus in 3D viewer ──
  const handleFocusIn3D = useCallback((entityKey: string) => {
    // Delegate focus to the viewer via viewerActionsRef
    viewerActionsRef.current?.focusOnTarget(entityKey, 'entity');
  }, []);

  // ── Entity/Ligand Interaction Handlers ──
  const handleEntityClick = useCallback((entityKey: string) => {
    setSelectedEntity(prev => prev === entityKey ? null : entityKey);
  }, []);

  const handleEntityHoverFromPanel = useCallback((entityKey: string | null) => {
    setHoveredEntity(entityKey);
    setHoveredEntityFrom3D(false);
  }, []);

  const handleEntityHoverFrom3D = useCallback((entityKey: string | null) => {
    setHoveredEntity(entityKey);
    setHoveredEntityFrom3D(true);
  }, []);

  const handleLigandClick = useCallback((code: string) => {
    setSelectedLigand(prev => prev === code ? null : code);
  }, []);

  const handleLigandHoverFromPanel = useCallback((code: string | null) => {
    setHoveredLigand(code);
    setHoveredLigandFrom3D(false);
  }, []);

  const handleLigandHoverFrom3D = useCallback((code: string | null) => {
    setHoveredLigand(code);
    setHoveredLigandFrom3D(true);
  }, []);

  const handleLigandColorChange = useCallback((code: string, color: string) => {
    setLigandColors(prev => ({ ...prev, [code]: color }));
  }, []);

  const handleEntityVisibilityChange = useCallback((entityKey: string, visible: boolean) => {
    setEntityVisibility(prev => ({ ...prev, [entityKey]: visible }));
  }, []);

  const handleEntityFocus = useCallback((entityKey: string) => {
    // Focus: center on entity in 3D viewer without changing solo mode
    handleFocusIn3D(entityKey);
  }, [handleFocusIn3D]);

  const handleSoloEntity = useCallback((entityKey: string | null) => {
    setSoloEntity(prev => prev === entityKey ? null : entityKey);
  }, []);

  const handleLigandFocus = useCallback((code: string) => {
    // Focus: center on ligand in 3D viewer without changing solo mode
    handleFocusIn3D(code);
  }, [handleFocusIn3D]);

  const handleSoloLigand = useCallback((code: string | null) => {
    setSoloLigand(prev => prev === code ? null : code);
  }, []);

  const handleResetView = useCallback(() => {
    setSoloEntity(null);
    setSoloLigand(null);
    setRepresentation('cartoon');
  }, []);

  const handleResidueClick = useCallback((_chainId: string, _residueNumber: number) => {
    // Could focus 3D viewer on this residue
  }, []);

  // ── Fetch Ligand Info (on demand) ──
  const fetchLigandInfo = useCallback(async (code: string) => {
    if (ligandCache[code]) return;
    try {
      const res = await fetch(`/api/ligand/${code}`);
      const data = await res.json();
      if (data && data.code) { setLigandCache(prev => ({ ...prev, [code]: data })); }
    } catch { /* ignore */ }
  }, [ligandCache]);

  // ── Sync selectedPdbId with selectedEntry & reset entity states ──
  useEffect(() => {
    if (selectedEntry) {
      setSelectedPdbId(selectedEntry.pdbId);
      setPreviewOpen?.(true);
      setDetailPanelOpen?.(true);
      setPreviewTab?.('summary');
      // Reset entity/ligand selection states
      setSelectedEntity(null);
      setSelectedLigand(null);
      setSoloEntity(null);
      setSoloLigand(null);
      // Track activity
      addActivity?.('search', `Viewed ${selectedEntry.pdbId} detail`, { pdbId: selectedEntry.pdbId });
      // Add to recently viewed
      setRecentlyViewed?.(prev => {
        const filtered = prev.filter(r => r.pdbId !== selectedEntry.pdbId);
        return [{ pdbId: selectedEntry.pdbId, title: selectedEntry.title || '', timestamp: Date.now() }, ...filtered].slice(0, 10);
      });
    }
  }, [selectedEntry, addActivity, setRecentlyViewed, setPreviewOpen, setDetailPanelOpen, setPreviewTab]);

  // ── Sync selectedPdbId with selectedEvalStructure (BLAST entries from LiteratureSection) ──
  useEffect(() => {
    if (selectedEvalStructure) {
      setSelectedPdbId(selectedEvalStructure.pdbId ?? '');
      setDetailPanelOpen?.(true);
      setPreviewTab?.('summary');
      // Reset entity/ligand selection states
      setSelectedEntity(null);
      setSelectedLigand(null);
      setSoloEntity(null);
      setSoloLigand(null);
    }
  }, [selectedEvalStructure, setDetailPanelOpen, setPreviewTab]);

  // ── Fetch entities when selectedPdbId changes ──
  useEffect(() => {
    if (!selectedPdbId) return;
    let cancelled = false;

    fetch(`/api/entities/${selectedPdbId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (cancelled || !data?.entities) return;
        const loadedEntities: EntityInfo[] = data.entities;
        setEntities(loadedEntities);
        // Detect ligand codes
        const ligCodes: string[] = [];
        const known = new Set<string>();
        for (const e of loadedEntities) {
          const mt = e.molecule_type.toLowerCase();
          const maxLen = Math.max(...((e.chains || []).map(c => c.length ?? 0) || [0]), 0);
          const isPoly = (mt === 'polypeptide(l)' || mt === 'polypeptide(d)') && maxLen > 10 || mt === 'polyribonucleotide' || mt === 'polydeoxyribonucleotide';
          const isBound = mt.includes('bound') || mt === 'non-polymer';
          if (isBound && !mt.includes('water')) {
            for (const chem of e.chem_comp_ids || []) {
              if (!known.has(chem) && known.add(chem)) ligCodes.push(chem);
            }
          }
        }
        setLigandCodes(ligCodes);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [selectedPdbId]);

  return {
    // ── State ──
    selectedPdbId,
    setSelectedPdbId,
    entities,
    setEntities,
    entityColors,
    setEntityColors,
    evalEntityColors,
    setEvalEntityColors,
    evalHoveredEntity,
    setEvalHoveredEntity,
    hoveredEntityInPanel,
    setHoveredEntityInPanel,
    ligandCodes,
    setLigandCodes,
    ligandColors,
    setLigandColors,
    ligandVisibility,
    setLigandVisibility,
    entityVisibility,
    setEntityVisibility,
    selectedEntity,
    selectedLigand,
    hoveredEntity,
    hoveredLigand,
    hoveredEntityFrom3D,
    hoveredLigandFrom3D,
    representation,
    setRepresentation,
    soloLigand,
    soloEntity,
    viewerActionsRef,
    ligandCache,

    // ── Handlers ──
    handleEntityColorChange,
    handleEvalEntityColorChange,
    handleEntityClick,
    handleEntityHoverFromPanel,
    handleEntityHoverFrom3D,
    handleLigandClick,
    handleLigandHoverFromPanel,
    handleLigandHoverFrom3D,
    handleLigandColorChange,
    handleEntityVisibilityChange,
    handleEntityFocus,
    handleSoloEntity,
    handleLigandFocus,
    handleSoloLigand,
    handleResetView,
    handleResidueClick,
    handleFocusIn3D,
    fetchLigandInfo,
  };
}
