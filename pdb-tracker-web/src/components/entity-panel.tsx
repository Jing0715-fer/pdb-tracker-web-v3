'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  Check,
  Palette,
  Dna,
  FlaskConical,
  Boxes,
  Loader2,
  Atom,
  AlignLeft,
  Crosshair,
  Download,
  PieChart,
  ShieldCheck,
  ExternalLink,
  AlertTriangle,
  Bookmark,
  Beaker,
  Activity,
  Zap,
  Pill,
  Trophy,
  BarChart2,
  Network,
  Table,
  X,
  Info,
  Maximize2,
  Minimize2,
  MousePointerClick,
  Grid3x3,
  Clock,
  TrendingUp,
  Search,
  RotateCcw,
  Layers,
  UnfoldVertical,
  FoldVertical,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Copy,
} from 'lucide-react';
import type { EntityInfo } from './molecule-viewer';
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from '@/components/ui/hover-card';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

import { SequenceView } from './sequence-viewer';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

// ─── Types ───────────────────────────────────────────────────────────────

// ─── Constants ───────────────────────────────────────────────────────────

const SITE_TYPE_COLORS: Record<string, string> = {
  cofactor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  metal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  inhibitor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  substrate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  activator: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  antibody: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-800/30 dark:text-gray-400',
};

// ─── Types ───────────────────────────────────────────────────────────────

interface EntityPanelProps {
  pdbId: string;
  entities: EntityInfo[];
  ligandCodes: string[];
  entityColors: Record<string, string>;
  ligandColors: Record<string, string>;
  ligandVisibility: Record<string, boolean>;
  selectedEntity: string | null;
  selectedLigand: string | null;
  hoveredEntity: string | null;
  hoveredLigand: string | null;
  onEntityClick: (entityKey: string) => void;
  onEntityHover: (entityKey: string | null) => void;
  onEntityColorChange: (entityKey: string, color: string) => void;
  onLigandClick: (ligandCode: string) => void;
  onLigandHover: (ligandCode: string | null) => void;
  onLigandColorChange: (ligandCode: string, color: string) => void;
  onLigandVisibilityChange: (ligandCode: string, visible: boolean) => void;
  onLigandFocus?: (ligandCode: string) => void;
  onSoloLigand?: (ligandCode: string | null) => void;
  onResetView?: () => void;
  soloLigand?: string | null;
  representation: 'cartoon' | 'ball-stick' | 'surface';
  onRepresentationChange: (rep: 'cartoon' | 'ball-stick' | 'surface') => void;
  onExportLigands?: () => void;
  onExportAll?: () => void;
  onLoadStructure?: (pdbId: string) => void;
  onResidueRangeSelect?: (chainId: string, start: number, end: number) => void;
  hoveredEntityFrom3D?: boolean;
  hoveredLigandFrom3D?: boolean;
  onFocusIn3D?: (entityKey: string) => void;
  onOpenColorPicker?: (type: 'entity' | 'ligand', key: string) => void;
  onDeselect?: () => void;
  entityVisibility?: Record<string, boolean>;
  soloEntity?: string | null;
  onEntityVisibilityChange?: (entityKey: string, visible: boolean) => void;
  onEntityFocus?: (entityKey: string) => void;
  onSoloEntity?: (entityKey: string | null) => void;
  onResidueClick?: (chainId: string, residueNumber: number) => void;
  collapsed?: boolean;
}

interface LigandData {
  code: string;
  name: string;
  formula: string | null;
  weight: number | null;
  type: string | null;
  description: string | null;
  imageUrl: string | null;
}

interface ValidationData {
  pdb_id: string;
  molprobity_score: number | null;
  ramachandran_favored: number | null;
  ramachandran_outliers: number | null;
  clash_score: number | null;
  rmsd_bonds: number | null;
  rmsd_angles: number | null;
  clash_percentile: number | null;
  ramachandran_percentile: number | null;
  chain_scores: { chain: string; favored: number; outliers: number }[] | null;
  error?: string;
}

interface BindingSite {
  ligandCode: string;
  chains: string[];
  residues: string[];
  type: string;
}

interface EnzymeClassification {
  ecNumber: string;
  name: string;
  entityId: number;
}

interface DiseaseMutation {
  chain: string;
  position: number;
  wildType: string;
  mutation: string;
  disease: string;
}

interface SecondaryStructure {
  helices: number;
  strands: number;
  helixPercentage: number;
  strandPercentage: number;
}

interface AnnotationsData {
  pdbId: string;
  bindingSites: BindingSite[];
  enzymeClassification: EnzymeClassification[];
  diseaseMutations: DiseaseMutation[];
  secondaryStructure: Record<string, SecondaryStructure>;
}

// ─── Constants ───────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#e53e3e', '#dd6b20', '#d69e2e', '#38a169', '#3182ce',
  '#805ad5', '#d53f8c', '#00b5d8', '#718096', '#1a202c',
  '#48bb78', '#ed8936', '#9f7aea', '#fc8181', '#f6e05e',
];

type MoleculeBadge = 'POL' | 'DNA' | 'RNA' | 'WAT' | 'LIG' | 'OTHER';

const BADGE_STYLES: Record<MoleculeBadge, string> = {
  POL: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  DNA: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  RNA: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  WAT: 'bg-gray-100 text-gray-600 dark:bg-gray-800/60 dark:text-gray-400',
  LIG: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  OTHER: 'bg-gray-100 text-gray-600 dark:bg-gray-800/60 dark:text-gray-400',
};

const LIGAND_TYPE_COLORS: Record<string, string> = {
  ION: 'text-blue-600 dark:text-blue-400',
  COENZYME: 'text-green-600 dark:text-green-400',
  NUCLEOTIDE: 'text-purple-600 dark:text-purple-400',
  COFACTOR: 'text-amber-600 dark:text-amber-400',
  SUGAR: 'text-pink-600 dark:text-pink-400',
  SOLVENT: 'text-gray-500 dark:text-gray-400',
  'REDUCING AGENT': 'text-red-500 dark:text-red-400',
  CHELATOR: 'text-teal-600 dark:text-teal-400',
};

const LIGAND_TYPE_BADGE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  ION: { bg: 'bg-blue-100 dark:bg-blue-900/30', border: '#3b82f6', text: 'text-blue-700 dark:text-blue-300' },
  COENZYME: { bg: 'bg-green-100 dark:bg-green-900/30', border: '#22c55e', text: 'text-green-700 dark:text-green-300' },
  NUCLEOTIDE: { bg: 'bg-purple-100 dark:bg-purple-900/30', border: '#a855f7', text: 'text-purple-700 dark:text-purple-300' },
  COFACTOR: { bg: 'bg-amber-100 dark:bg-amber-900/30', border: '#f59e0b', text: 'text-amber-700 dark:text-amber-300' },
  SUGAR: { bg: 'bg-pink-100 dark:bg-pink-900/30', border: '#ec4899', text: 'text-pink-700 dark:text-pink-300' },
  SOLVENT: { bg: 'bg-gray-100 dark:bg-gray-800/30', border: '#6b7280', text: 'text-gray-600 dark:text-gray-400' },
  'REDUCING AGENT': { bg: 'bg-red-100 dark:bg-red-900/30', border: '#ef4444', text: 'text-red-700 dark:text-red-300' },
  CHELATOR: { bg: 'bg-teal-100 dark:bg-teal-900/30', border: '#14b8a6', text: 'text-teal-700 dark:text-teal-300' },
};

// ─── Residue coloring maps ───────────────────────────────────────────────

const AMINO_ACID_COLORS: Record<string, { color: string; label: string }> = {
  A: { color: '#f97316', label: 'Ala (Hydrophobic)' },
  V: { color: '#f97316', label: 'Val (Hydrophobic)' },
  L: { color: '#f97316', label: 'Leu (Hydrophobic)' },
  I: { color: '#f97316', label: 'Ile (Hydrophobic)' },
  M: { color: '#f97316', label: 'Met (Hydrophobic)' },
  F: { color: '#f97316', label: 'Phe (Hydrophobic)' },
  W: { color: '#f97316', label: 'Trp (Hydrophobic)' },
  P: { color: '#f97316', label: 'Pro (Hydrophobic)' },
  S: { color: '#22c55e', label: 'Ser (Polar)' },
  T: { color: '#22c55e', label: 'Thr (Polar)' },
  N: { color: '#22c55e', label: 'Asn (Polar)' },
  Q: { color: '#22c55e', label: 'Gln (Polar)' },
  Y: { color: '#22c55e', label: 'Tyr (Polar)' },
  C: { color: '#22c55e', label: 'Cys (Polar)' },
  K: { color: '#3b82f6', label: 'Lys (Positive)' },
  R: { color: '#3b82f6', label: 'Arg (Positive)' },
  H: { color: '#3b82f6', label: 'His (Positive)' },
  D: { color: '#ef4444', label: 'Asp (Negative)' },
  E: { color: '#ef4444', label: 'Glu (Negative)' },
  G: { color: '#9ca3af', label: 'Gly (Special)' },
};

const NUCLEOTIDE_COLORS: Record<string, { color: string; label: string }> = {
  A: { color: '#22c55e', label: 'Adenine' },
  T: { color: '#ef4444', label: 'Thymine' },
  G: { color: '#f97316', label: 'Guanine' },
  C: { color: '#3b82f6', label: 'Cytosine' },
  U: { color: '#a855f7', label: 'Uracil' },
};

function getMoleculeBadge(moleculeType: string): MoleculeBadge {
  const mt = moleculeType.toLowerCase();
  if (mt.includes('polydeoxyribonucleotide')) return 'DNA';
  if (mt.includes('polyribonucleotide')) return 'RNA';
  if (mt.includes('carbohydrate')) return 'POL';
  if (mt.includes('polypeptide')) return 'POL';
  if (mt.includes('water')) return 'WAT';
  if (mt.includes('bound') || mt.includes('non-polymer') || mt.includes('ligand')) return 'LIG';
  return 'OTHER';
}

function isNucleotideType(moleculeType: string): boolean {
  const mt = moleculeType.toLowerCase();
  return mt.includes('nucleotide');
}

// ─── Sequence Data Cache ─────────────────────────────────────────────────

const MAX_CACHE_SIZE = 50;

function evictOldestEntry(cache: Map<string, any>): void {
  const firstKey = cache.keys().next().value;
  if (firstKey !== undefined) cache.delete(firstKey);
}

const sequenceCache = new Map<string, Record<string, string> | null>();

function useSequenceData(pdbId: string): {
  sequences: Record<string, string> | null;
  loading: boolean;
} {
  const cached = sequenceCache.get(pdbId) ?? null;
  const isCached = sequenceCache.has(pdbId);
  const [data, setData] = useState<Record<string, string> | null>(cached);
  const [loading, setLoading] = useState(!isCached);

  useEffect(() => {
    if (isCached) return;

    let cancelled = false;

    fetch(`/api/sequence/${pdbId}`)
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        const seqs = json?.sequences || null;
        if (sequenceCache.size >= MAX_CACHE_SIZE) evictOldestEntry(sequenceCache);
        sequenceCache.set(pdbId, seqs);
        setData(seqs);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        if (sequenceCache.size >= MAX_CACHE_SIZE) evictOldestEntry(sequenceCache);
        sequenceCache.set(pdbId, null);
        setData(null);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pdbId, isCached]);

  return { sequences: data, loading };
}

// ─── Validation Data Cache ────────────────────────────────────────────────

const validationCache = new Map<string, ValidationData | null>();

function useValidationData(pdbId: string): {
  data: ValidationData | null;
  loading: boolean;
} {
  const cached = validationCache.get(pdbId) ?? null;
  const isCached = validationCache.has(pdbId);
  const [data, setData] = useState<ValidationData | null>(cached);
  const [loading, setLoading] = useState(!isCached);

  useEffect(() => {
    if (isCached) return;

    let cancelled = false;

    fetch(`/api/validation/${pdbId}`)
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        if (validationCache.size >= MAX_CACHE_SIZE) evictOldestEntry(validationCache);
        validationCache.set(pdbId, json || null);
        setData(json || null);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        if (validationCache.size >= MAX_CACHE_SIZE) evictOldestEntry(validationCache);
        validationCache.set(pdbId, null);
        setData(null);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pdbId, isCached]);

  return { data, loading };
}

// ─── Ramachandran Real Phi/Psi Data Cache ──────────────────────────────────

interface ChainScore {
  chain: string;
  favored: number;
  allowed: number;
  outliers: number;
  total: number;
}

interface RamaData {
  pdb_id: string;
  residue_count: number;
  favored: number | null;
  allowed: number | null;
  outliers: number | null;
  points: { phi: number; psi: number; region: string; chain?: string }[];
  chain_scores: ChainScore[] | null;
}

const ramaCache = new Map<string, RamaData | null>();

function useRamaData(pdbId: string): {
  data: RamaData | null;
  loading: boolean;
} {
  const cached = ramaCache.get(pdbId) ?? null;
  const isCached = ramaCache.has(pdbId);
  const [data, setData] = useState<RamaData | null>(cached);
  const [loading, setLoading] = useState(!isCached);

  useEffect(() => {
    if (isCached) return;

    let cancelled = false;

    fetch(`/api/rama/${pdbId}`)
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        ramaCache.set(pdbId, json || null);
        setData(json || null);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        ramaCache.set(pdbId, null);
        setData(null);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pdbId, isCached]);

  return { data, loading };
}

// ─── Annotations Data Cache ─────────────────────────────────────────────

const annotationsCache = new Map<string, AnnotationsData | null>();

function useAnnotationsData(pdbId: string): {
  data: AnnotationsData | null;
  loading: boolean;
} {
  const cached = annotationsCache.get(pdbId) ?? null;
  const isCached = annotationsCache.has(pdbId);
  const [data, setData] = useState<AnnotationsData | null>(cached);
  const [loading, setLoading] = useState(!isCached);

  useEffect(() => {
    if (isCached) return;

    let cancelled = false;

    fetch(`/api/annotations/${pdbId}`)
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        annotationsCache.set(pdbId, json || null);
        setData(json || null);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        annotationsCache.set(pdbId, null);
        setData(null);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pdbId, isCached]);

  return { data, loading };
}

// ─── Contacts Data Cache ─────────────────────────────────────────────────

interface ResidueContact {
  chain1: string;
  residue1: string;
  chain2: string;
  residue2: string;
  distance: number;
  type: string;
}

interface ContactsData {
  pdbId: string;
  contacts: ResidueContact[];
  error?: string;
}

const contactsCache = new Map<string, ContactsData | null>();

function useContactsData(pdbId: string): {
  data: ContactsData | null;
  loading: boolean;
} {
  const cached = contactsCache.get(pdbId) ?? null;
  const isCached = contactsCache.has(pdbId);
  const [data, setData] = useState<ContactsData | null>(cached);
  const [loading, setLoading] = useState(!isCached);

  useEffect(() => {
    if (isCached) return;

    let cancelled = false;

    fetch(`/api/contacts/${pdbId}`)
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        contactsCache.set(pdbId, json || null);
        setData(json || null);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        contactsCache.set(pdbId, null);
        setData(null);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pdbId, isCached]);

  return { data, loading };
}

// ─── Ligand Data Cache ───────────────────────────────────────────────────

const ligandCache = new Map<string, LigandData | null>();

function useLigandData(code: string): {
  data: LigandData | null;
  loading: boolean;
} {
  const cached = ligandCache.get(code) ?? null;
  const isCached = ligandCache.has(code);
  const [data, setData] = useState<LigandData | null>(cached);
  const [loading, setLoading] = useState(!isCached);

  useEffect(() => {
    if (isCached) return;

    let cancelled = false;

    fetch(`/api/ligand/${code}`)
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        const ligandData: LigandData | null = json
          ? {
              code: json.code || code,
              name: json.name || code,
              formula: json.formula || null,
              weight: (() => { const w = json.weight; return typeof w === 'number' && !isNaN(w) ? w : null; })(),
              type: json.type || null,
              description: json.description || null,
              imageUrl: json.imageUrl || null,
            }
          : null;
        ligandCache.set(code, ligandData);
        setData(ligandData);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        ligandCache.set(code, null);
        setData(null);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [code, isCached]);

  return { data, loading };
}

// ─── Color Picker Popup ──────────────────────────────────────────────────

function ColorPickerPopup({
  currentColor,
  onColorChange,
  onClose,
  anchorRef,
}: {
  currentColor: string;
  onColorChange: (color: string) => void;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
  }, [anchorRef]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const popupContent = (
    <div
      ref={ref}
      className={`fixed z-[9999] p-2 rounded-lg shadow-xl border border-claude-border
                 bg-claude-surface scale-in-bounce color-picker-transition`}
      style={{ minWidth: 150, ...(pos ? { top: pos.top, left: pos.left } : { visibility: 'hidden' }) }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="grid grid-cols-5 gap-1.5 mb-2">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            onClick={(e) => {
              e.stopPropagation();
              onColorChange(color);
            }}
            className="w-6 h-6 rounded-md border-2 transition-transform hover:scale-110
                       focus:outline-none focus:ring-2 focus:ring-claude-accent/50"
            style={{
              backgroundColor: color,
              borderColor:
                currentColor.toLowerCase() === color.toLowerCase()
                  ? 'var(--claude-accent)'
                  : 'transparent',
            }}
            title={color}
          >
            {currentColor.toLowerCase() === color.toLowerCase() && (
              <Check className="w-3.5 h-3.5 text-white mx-auto drop-shadow-sm" />
            )}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 pt-1 border-t border-claude-border-light">
        <label className="text-[10px] text-claude-text-muted font-medium">Custom:</label>
        <input
          type="color"
          value={currentColor}
          onChange={(e) => onColorChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="w-6 h-6 rounded cursor-pointer border border-claude-border bg-transparent"
        />
        <span className="text-[10px] font-mono text-claude-text-secondary">
          {currentColor.toUpperCase()}
        </span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="mt-2 w-full py-1 text-[10px] font-medium rounded
                   bg-claude-accent-light text-claude-accent
                   hover:bg-claude-accent hover:text-white transition-colors"
      >
        Done
      </button>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(popupContent, document.body);
  }
  return popupContent;
}

// ─── Molecule Type Badge ─────────────────────────────────────────────────

function MoleculeBadgeTag({ type }: { type: string }) {
  const badge = getMoleculeBadge(type);
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold rounded
                  tracking-wider uppercase ${BADGE_STYLES[badge]}`}
    >
      {badge}
    </span>
  );
}

// ─── Gene Badge ──────────────────────────────────────────────────────────

function GeneBadge({ geneName }: { geneName: string }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 text-[8px] font-semibold rounded
                     bg-claude-accent-light text-claude-accent tracking-wide uppercase
                     border border-claude-accent/20">
      {geneName}
    </span>
  );
}

// ─── Ligand Hover Card ───────────────────────────────────────────────────

function LigandHoverCard({
  code,
  children,
}: {
  code: string;
  children: React.ReactNode;
}) {
  const { data, loading } = useLigandData(code);

  return (
    <HoverCard openDelay={400} closeDelay={200}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent
        side="left"
        align="start"
        className="w-72 p-0 overflow-hidden border border-claude-border bg-claude-surface shadow-xl"
      >
        <div className="h-28 bg-claude-bg flex items-center justify-center border-b border-claude-border-light overflow-hidden relative">
          {loading ? (
            <Loader2 className="w-5 h-5 text-claude-accent animate-spin" />
          ) : data?.imageUrl ? (
            <img
              src={data.imageUrl}
              alt={`${code} 2D structure`}
              className={`${/^ion$|^mg$|^ca$|^na$|^cl$|^k$|^zn$|^fe$|^cu$|^mn$/i.test(code) ? 'w-[150%] h-[150%]' : 'w-full h-full'} object-cover object-center`}
              style={/^ion$|^mg$|^ca$|^na$|^cl$|^k$|^zn$|^fe$|^cu$|^mn$/i.test(code) ? { margin: '0 -25%' } : undefined}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const container = target.parentElement;
                if (container) {
                  container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;"><span style="font-family:monospace;font-size:${/^ion$|^mg$|^ca$|^na$|^cl$|^k$|^zn$|^fe$|^cu$|^mn$/i.test(code) ? '120' : '48'}px;font-weight:bold;color:#9b9590;">${code}</span></div>`;
                }
              }}
            />
          ) : (
            <span className="font-mono text-5xl font-bold text-claude-text-muted">
              {code}
            </span>
          )}
        </div>

        <div className="p-3">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-claude-text leading-tight truncate">
                {loading ? code : (data?.name || code)}
              </p>
              <p className="text-[10px] font-mono text-claude-accent font-bold">
                {code}
              </p>
            </div>
            {data?.type && (
              <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ligand-type-border chip-hover whitespace-nowrap
                              bg-claude-border-light ${LIGAND_TYPE_COLORS[data.type] || 'text-claude-text-secondary'}`}
                style={{ '--ligand-type-color': 'currentColor' } as React.CSSProperties}>
                {data.type}
              </span>
            )}
          </div>

          {data?.formula && (
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[9px] text-claude-text-muted font-medium uppercase">Formula:</span>
              <span className="text-[10px] font-mono text-claude-text-secondary">{data.formula}</span>
            </div>
          )}

          {data?.weight != null && typeof data.weight === 'number' && !isNaN(data.weight) && (
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[9px] text-claude-text-muted font-medium uppercase">MW:</span>
              <span className="text-[10px] font-mono text-claude-text-secondary">{data.weight.toFixed(2)} Da</span>
            </div>
          )}

          {data?.description && (
            <p className="text-[10px] text-claude-text-muted leading-relaxed mt-1.5 line-clamp-3">
              {data.description}
            </p>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

// ─── Selected Indicator Dot ──────────────────────────────────────────────

function SelectedIndicator({ color }: { color: string }) {
  return (
    <span
      className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse shadow-sm"
      style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}60` }}
    />
  );
}

// ─── Chain Row ───────────────────────────────────────────────────────────

function ChainRow({
  chain,
  pdbId,
  entityColors,
  selectedEntity,
  hoveredEntity,
  hoveredFrom3D,
  colorPickerTarget,
  onEntityClick,
  onEntityHover,
  handleColorDotClick,
  onEntityColorChange,
  closeColorPicker,
  entityVisibility,
  soloEntity,
  onEntityVisibilityChange,
  onEntityFocus,
  onSoloEntity,
}: {
  chain: { chain: string; asym_id: string; length: number | null };
  pdbId: string;
  entityColors: Record<string, string>;
  selectedEntity: string | null;
  hoveredEntity: string | null;
  hoveredFrom3D?: boolean;
  colorPickerTarget: { type: 'entity' | 'ligand'; key: string } | null;
  onEntityClick: (entityKey: string) => void;
  onEntityHover: (entityKey: string | null) => void;
  handleColorDotClick: (e: React.MouseEvent, type: 'entity' | 'ligand', key: string) => void;
  onEntityColorChange: (entityKey: string, color: string) => void;
  closeColorPicker: () => void;
  entityVisibility?: Record<string, boolean>;
  soloEntity?: string | null;
  onEntityVisibilityChange?: (entityKey: string, visible: boolean) => void;
  onEntityFocus?: (entityKey: string) => void;
  onSoloEntity?: (entityKey: string | null) => void;
}) {
  const entityKey = `${pdbId}.${chain.chain}`;
  const color = entityColors[entityKey] || '#718096';
  const isSelected = selectedEntity === entityKey;
  const isHovered = hoveredEntity === entityKey;
  const isHoveredFrom3D = isHovered && hoveredFrom3D;
  const isColorPickerOpen =
    colorPickerTarget?.type === 'entity' &&
    colorPickerTarget?.key === entityKey;
  const isEntityVisible = entityVisibility ? entityVisibility[entityKey] !== false : true;
  const isEntitySoloMode = soloEntity === entityKey;
  const colorDotRef = useRef<HTMLButtonElement>(null);

  return (
    <div
      data-entity-key={entityKey}
      className={`relative flex items-center gap-1.5 px-2 py-1 rounded-md w-full max-w-full
                 cursor-pointer transition-all duration-150 slide-in-right entity-row-hover entity-color-border
                 ${isSelected
                   ? 'bg-claude-accent-light shadow-sm entity-row-selected pulsing-border-selected'
                   : isHoveredFrom3D
                   ? 'bg-claude-accent-light/70 shadow-sm viewer-synced-glow viewer-sync-pulse'
                   : isHovered
                   ? 'bg-claude-accent-light/60 shadow-sm viewer-hover-indicator'
                   : 'hover:bg-claude-border-light'
                 }
                 ${isEntitySoloMode ? 'ring-2 ring-amber-400/60 bg-amber-50 dark:bg-amber-900/20' : ''}
                 ${!isEntityVisible ? 'opacity-40' : ''}
                 ${isHovered && !isHoveredFrom3D ? 'ring-1 ring-claude-accent/20' : ''}
                 ${isSelected && hoveredFrom3D ? 'selected-from-3d' : ''}`}
      style={{ '--entity-color': color } as React.CSSProperties}
      title={isHoveredFrom3D ? '↔ Synced from 3D viewer' : undefined}
    >
      {/* Selection indicator */}
      {isSelected && <SelectedIndicator color={color} />}

      {/* 3D hover indicator */}
      {isHoveredFrom3D && !isSelected && (
        <span className="w-2.5 h-2.5 flex-shrink-0 flex items-center justify-center" title="Synced from 3D viewer">
          <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-claude-accent animate-pulse"><path d="M6 1L11 6L6 11L1 6Z" fill="currentColor" opacity={0.8} /></svg>
        </span>
      )}
      {isHovered && !isSelected && !isHoveredFrom3D && (
        <span className="w-2.5 h-2.5 flex-shrink-0 flex items-center justify-center" title="Highlighted in 3D">
          <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-claude-accent/60"><path d="M6 1L11 6L6 11L1 6Z" fill="currentColor" opacity={0.4} /></svg>
        </span>
      )}

      {/* Color dot */}
      <button
        ref={colorDotRef}
        onClick={(e) => handleColorDotClick(e, 'entity', entityKey)}
        className="w-3.5 h-3.5 rounded-full flex-shrink-0 border border-white/30 dark:border-gray-500/50
                   shadow-sm hover:scale-125 transition-transform focus:outline-none
                   focus:ring-2 focus:ring-claude-accent/40"
        style={{ backgroundColor: color }}
        aria-label="Change color" title="Change color"
      >
        <Palette className="w-2 h-2 text-white/70 mx-auto opacity-0 hover:opacity-100 transition-opacity" />
      </button>

      {/* Chain ID - monospace badge */}
      <span className="text-[10px] font-mono font-bold text-claude-text bg-claude-border-light
                       px-1.5 py-0.5 rounded tracking-wider btn-icon-hover">
        {chain.chain}
      </span>

      {/* Length */}
      {chain.length != null && (
        <span className="text-[9px] text-claude-text-muted">
          {chain.length} residues
        </span>
      )}

      {/* Focus in 3D button */}
      {onEntityFocus && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEntityFocus(entityKey);
              }}
              className="p-0.5 rounded text-claude-text-muted hover:text-claude-accent
                         hover:bg-claude-accent-light transition-colors flex-shrink-0 btn-click-ripple"
            >
              <Crosshair className="w-3 h-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="bg-claude-surface text-claude-text border border-claude-border shadow-lg">
            Focus in 3D
          </TooltipContent>
        </Tooltip>
      )}

      {/* Solo mode button */}
      {onSoloEntity && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSoloEntity(isEntitySoloMode ? null : entityKey);
              }}
              className={`p-0.5 rounded transition-colors flex-shrink-0 btn-click-ripple
                         ${isEntitySoloMode
                           ? 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30'
                           : 'text-claude-text-muted hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                         }`}
              title={isEntitySoloMode ? 'Exit solo mode' : 'Solo: show only this chain'}
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="bg-claude-surface text-claude-text border border-claude-border shadow-lg">
            {isEntitySoloMode ? 'Exit Solo Mode' : 'Solo Mode'}
          </TooltipContent>
        </Tooltip>
      )}

      {/* Visibility toggle */}
      {onEntityVisibilityChange && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEntityVisibilityChange(entityKey, !isEntityVisible);
          }}
          className={`p-0.5 rounded transition-colors flex-shrink-0 btn-click-ripple btn-press
                     ${
                       isEntityVisible
                         ? 'text-claude-text-secondary hover:text-claude-accent'
                         : 'text-claude-text-muted'
                     }`}
          title={isEntityVisible ? 'Hide chain' : 'Show chain'}
        >
          {isEntityVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
        </button>
      )}

      {/* Color Picker Popup */}
      {isColorPickerOpen && (
        <ColorPickerPopup
          currentColor={color}
          onColorChange={(newColor) => onEntityColorChange(entityKey, newColor)}
          onClose={closeColorPicker}
          anchorRef={colorDotRef}
        />
      )}
    </div>
  );
}

// ─── Ligand Row (Enhanced) ───────────────────────────────────────────────

function LigandRow({
  code,
  ligandColors,
  ligandVisibility,
  selectedLigand,
  hoveredLigand,
  hoveredFrom3D,
  colorPickerTarget,
  onLigandClick,
  onLigandHover,
  onLigandColorChange,
  onLigandVisibilityChange,
  onLigandFocus,
  onSoloLigand,
  handleColorDotClick,
  closeColorPicker,
  entityDescription,
  entityChainId,
  onShowSequence,
  soloLigand,
}: {
  code: string;
  ligandColors: Record<string, string>;
  ligandVisibility: Record<string, boolean>;
  selectedLigand: string | null;
  hoveredLigand: string | null;
  hoveredFrom3D?: boolean;
  colorPickerTarget: { type: 'entity' | 'ligand'; key: string } | null;
  onLigandClick: (ligandCode: string) => void;
  onLigandHover: (ligandCode: string | null) => void;
  onLigandColorChange: (ligandCode: string, color: string) => void;
  onLigandVisibilityChange: (ligandCode: string, visible: boolean) => void;
  onLigandFocus?: (ligandCode: string) => void;
  onSoloLigand?: (ligandCode: string | null) => void;
  handleColorDotClick: (e: React.MouseEvent, type: 'entity' | 'ligand', key: string) => void;
  closeColorPicker: () => void;
  entityDescription?: string;
  entityChainId?: string;
  onShowSequence?: (chainId: string) => void;
  soloLigand?: string | null;
}) {
  const { data, loading } = useLigandData(code);
  const color = ligandColors[code] || '#d69e2e';
  const isVisible = ligandVisibility[code] !== false;
  const isSelected = selectedLigand === code;
  const isHovered = hoveredLigand === code;
  const isHoveredFrom3D = isHovered && hoveredFrom3D;
  const isColorPickerOpen =
    colorPickerTarget?.type === 'ligand' &&
    colorPickerTarget?.key === code;
  const isPeptideInhibitor = code.startsWith('PEP_');
  const isSoloMode = soloLigand === code;
  const colorDotRef = useRef<HTMLButtonElement>(null);

  return (
    /* Outer wrapper positions the color picker popup outside the HoverCard trigger
       to prevent HoverCard interference when the color picker is open */
    <div className="relative">
      <LigandHoverCard code={code}>
        <div
          id={`ligand-row-${code}`}
          data-ligand-code={code}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md w-full max-w-full
                     cursor-pointer transition-all duration-150 slide-in-right entity-row-hover entity-color-border
                     ${isSelected
                       ? 'bg-claude-accent-light shadow-sm entity-row-selected pulsing-border-selected'
                       : isHoveredFrom3D
                       ? 'bg-claude-accent-light/70 shadow-sm viewer-synced-glow viewer-sync-pulse'
                       : isHovered
                       ? 'bg-claude-accent-light/60 shadow-sm ring-1 ring-claude-accent/20 viewer-hover-indicator'
                       : 'hover:bg-claude-border-light'
                     }
                     ${isSoloMode ? 'ring-2 ring-amber-400/60 bg-amber-50 dark:bg-amber-900/20' : ''}
                     ${!isVisible ? 'opacity-40' : ''}${isSelected ? ' ligand-focused-ring' : ''}
                     ${isSelected && hoveredFrom3D ? ' selected-from-3d' : ''}`}
          style={{ '--entity-color': color } as React.CSSProperties}
          title={isHoveredFrom3D ? '↔ Synced from 3D viewer' : undefined}
        >
          {/* Selection indicator */}
          {isSelected && <SelectedIndicator color={color} />}

          {/* 3D hover indicator */}
          {isHoveredFrom3D && !isSelected && (
            <span className="w-2.5 h-2.5 flex-shrink-0 flex items-center justify-center" title="Synced from 3D viewer">
              <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-claude-accent animate-pulse"><path d="M6 1L11 6L6 11L1 6Z" fill="currentColor" opacity={0.8} /></svg>
            </span>
          )}
          {isHovered && !isSelected && !isHoveredFrom3D && (
            <span className="w-2.5 h-2.5 flex-shrink-0 flex items-center justify-center" title="Highlighted in 3D">
              <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-claude-accent/60"><path d="M6 1L11 6L6 11L1 6Z" fill="currentColor" opacity={0.4} /></svg>
            </span>
          )}

          {/* Color dot */}
          <button
            ref={colorDotRef}
            onClick={(e) => handleColorDotClick(e, 'ligand', code)}
            className="w-3.5 h-3.5 rounded-full flex-shrink-0 border border-white/30 dark:border-gray-500/50
                       shadow-sm hover:scale-125 transition-transform focus:outline-none
                       focus:ring-2 focus:ring-claude-accent/40"
            style={{ backgroundColor: color }}
            aria-label="Change color" title="Change color"
          />

          {/* Peptide inhibitor icon for PEP_ ligands */}
          {isPeptideInhibitor && (
            <Pill className="w-3 h-3 text-purple-500 dark:text-purple-400 flex-shrink-0" />
          )}

          {/* 2D Structure thumbnail (enhanced size) */}
          {!isPeptideInhibitor && !loading && data?.imageUrl && (
            <div className="w-9 h-9 flex-shrink-0 rounded overflow-hidden bg-claude-bg border border-claude-border-light shadow-sm">
              <img
                src={data.imageUrl}
                alt={`${code} 2D`}
                className="w-full h-full object-contain p-0.5"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Ligand code + name with color preview */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              {/* Color preview circle */}
              <span
                className="w-2 h-2 rounded-full flex-shrink-0 border border-white/20"
                style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}40` }}
              />
              <span
                className={`text-[10px] font-mono font-bold text-claude-text
                           ${!isVisible ? 'line-through' : ''}`}
              >
                {code}
              </span>
              {/* PEPTIDE INHIBITOR badge for PEP_ ligands */}
              {isPeptideInhibitor && (
                <span className="text-[6px] font-bold uppercase tracking-wider px-1 py-px rounded whitespace-nowrap
                                bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                  PEPTIDE INHIBITOR
                </span>
              )}
              {/* Type badge inline (enhanced) */}
              {!loading && data?.type && !isPeptideInhibitor && (
                <span className={`ligand-type-badge ${LIGAND_TYPE_BADGE_COLORS[data.type]?.bg || 'bg-claude-border-light'} ${LIGAND_TYPE_BADGE_COLORS[data.type]?.text || 'text-claude-text-secondary'}`}>
                  {data.type}
                </span>
              )}
            </div>
            {/* Entity description for peptide ligands */}
            {isPeptideInhibitor && entityDescription && (
              <p className="text-[8px] text-claude-text-muted truncate leading-tight">
                {entityDescription}
              </p>
            )}
            {/* Ligand name for non-peptide ligands */}
            {!isPeptideInhibitor && !loading && data?.name && data.name !== code && (
              <p className="text-[8px] text-claude-text-muted truncate leading-tight">
                {data.name}
              </p>
            )}
          </div>

          {/* Show in Sequence button for peptide ligands */}
          {isPeptideInhibitor && entityChainId && onShowSequence && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowSequence(entityChainId);
                  }}
                  className="p-0.5 rounded text-claude-text-muted hover:text-purple-600 dark:hover:text-purple-400
                             hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors flex-shrink-0"
                  title="Show in Sequence"
                >
                  <AlignLeft className="w-3 h-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="bg-claude-surface text-claude-text border border-claude-border shadow-lg">
                Show in Sequence
              </TooltipContent>
            </Tooltip>
          )}

          {/* Focus button */}
          {onLigandFocus && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onLigandFocus(code);
                  }}
                  className="p-0.5 rounded text-claude-text-muted hover:text-claude-accent
                             hover:bg-claude-accent-light transition-colors flex-shrink-0 btn-click-ripple"
                  title="Focus in viewer"
                >
                  <Crosshair className="w-3 h-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="bg-claude-surface text-claude-text border border-claude-border shadow-lg">
                Focus in 3D viewer
              </TooltipContent>
            </Tooltip>
          )}

          {/* Solo mode button */}
          {onSoloLigand && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSoloLigand(isSoloMode ? null : code);
                  }}
                  className={`p-0.5 rounded transition-colors flex-shrink-0 btn-click-ripple
                             ${isSoloMode
                               ? 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30'
                               : 'text-claude-text-muted hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                             }`}
                  title={isSoloMode ? 'Exit solo mode' : 'Solo: show only this ligand + surroundings'}
                >
                  <Maximize2 className="w-3 h-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="bg-claude-surface text-claude-text border border-claude-border shadow-lg">
                {isSoloMode ? 'Exit Solo Mode' : 'Solo Mode (ligand + 5Å)'}
              </TooltipContent>
            </Tooltip>
          )}

          {/* Visibility toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLigandVisibilityChange(code, !isVisible);
            }}
            className={`p-0.5 rounded transition-colors flex-shrink-0 btn-click-ripple btn-press
                       ${
                         isVisible
                           ? 'text-claude-text-secondary hover:text-claude-accent'
                           : 'text-claude-text-muted'
                       }`}
            title={isVisible ? 'Hide ligand' : 'Show ligand'}
          >
            {isVisible ? (
              <Eye className="w-3 h-3" />
            ) : (
              <EyeOff className="w-3 h-3" />
            )}
          </button>
        </div>
      </LigandHoverCard>

      {/* Color Picker Popup - rendered outside HoverCard trigger to prevent interference */}
      {isColorPickerOpen && (
        <ColorPickerPopup
          currentColor={color}
          onColorChange={(newColor) =>
            onLigandColorChange(code, newColor)
          }
          onClose={closeColorPicker}
          anchorRef={colorDotRef}
        />
      )}
    </div>
  );
}

// ─── Composition Pie Chart (SVG) ─────────────────────────────────────────

function CompositionPieChart({
  segments,
}: {
  segments: { label: string; value: number; color: string }[];
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;

  const cx = 40;
  const cy = 40;
  const r = 32;
  const circumference = 2 * Math.PI * r;

  // Pre-compute cumulative offsets for each segment
  const segmentData = segments.map((seg) => {
    const fraction = seg.value / total;
    return { ...seg, fraction, dashLength: circumference * fraction };
  });
  const cumulativeOffsets: number[] = [];
  let runningTotal = 0;
  for (const seg of segmentData) {
    cumulativeOffsets.push(circumference - runningTotal);
    runningTotal += seg.dashLength;
  }

  return (
    <div className="flex items-center gap-3">
      <svg width="80" height="80" viewBox="0 0 80 80" className="flex-shrink-0 pie-chart-shadow">
        {/* Background circle */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--claude-border-light)" strokeWidth="6" />

        {/* Segments */}
        {segmentData.map((seg, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth="6"
              strokeDasharray={`${seg.dashLength} ${circumference - seg.dashLength}`}
              strokeDashoffset={cumulativeOffsets[i]}
              transform={`rotate(-90 ${cx} ${cy})`}
              className="transition-all duration-300"
            />
        ))}

        {/* Center text */}
        <text x={cx} y={cy - 4} textAnchor="middle" className="fill-claude-text text-[8px] font-bold">
          {total.toLocaleString()}
        </text>
        <text x={cx} y={cy + 6} textAnchor="middle" className="fill-claude-text-muted text-[6px]">
          residues
        </text>
      </svg>

      {/* Legend */}
      <div className="flex flex-col gap-0.5">
        {segments.map((seg, i) => {
          const pct = total > 0 ? ((seg.value / total) * 100).toFixed(0) : '0';
          return (
            <div key={i} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: seg.color }} />
              <span className="text-[8px] text-claude-text-secondary">
                {seg.label}
              </span>
              <span className="text-[8px] font-mono text-claude-text-muted">
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Quality Metrics Section ─────────────────────────────────────────────

function getQualityLevel(score: number | null): 'high' | 'medium' | 'low' | 'unknown' {
  if (score == null) return 'unknown';
  if (score <= 2.0) return 'high';
  if (score <= 3.0) return 'medium';
  return 'low';
}

function getQualityColor(level: 'high' | 'medium' | 'low' | 'unknown'): string {
  switch (level) {
    case 'high': return 'text-green-600 dark:text-green-400';
    case 'medium': return 'text-amber-600 dark:text-amber-400';
    case 'low': return 'text-red-600 dark:text-red-400';
    default: return 'text-claude-text-muted';
  }
}

function getQualityBgColor(level: 'high' | 'medium' | 'low' | 'unknown'): string {
  switch (level) {
    case 'high': return 'bg-green-100 dark:bg-green-900/30';
    case 'medium': return 'bg-amber-100 dark:bg-amber-900/30';
    case 'low': return 'bg-red-100 dark:bg-red-900/30';
    default: return 'bg-claude-border-light';
  }
}

function getQualityStrokeColor(level: 'high' | 'medium' | 'low' | 'unknown'): string {
  switch (level) {
    case 'high': return '#22c55e';
    case 'medium': return '#f59e0b';
    case 'low': return '#ef4444';
    default: return '#9ca3af';
  }
}

function QualityGauge({ score }: { score: number | null }) {
  const level = getQualityLevel(score);
  const pct = score != null ? Math.max(0, Math.min(100, ((5 - score) / 5) * 100)) : 0;
  const stroke = getQualityStrokeColor(level);

  // SVG arc gauge
  const cx = 40;
  const cy = 40;
  const r = 30;
  const circumference = Math.PI * r; // Half-circle
  const dashOffset = circumference - (circumference * pct) / 100;

  return (
    <div className={`flex items-center gap-3 ${level === 'high' ? 'card-border-glow rounded-lg p-1' : ''}`}>
      <svg width="80" height="50" viewBox="0 0 80 50" className={`flex-shrink-0 ${level === 'high' ? 'quality-gauge-glow breathing-glow' : ''}`}>
        {/* Background arc */}
        <path
          d="M 10 42 A 30 30 0 0 1 70 42"
          fill="none"
          stroke="var(--claude-border-light)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* Value arc */}
        <path
          d="M 10 42 A 30 30 0 0 1 70 42"
          fill="none"
          stroke={stroke}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={dashOffset}
          className="validation-gauge-arc"
          style={{ '--gauge-offset': dashOffset } as React.CSSProperties}
        />
        {/* Center text */}
        <text x={cx} y={cy} textAnchor="middle" className={`fill-current text-[12px] font-bold ${getQualityColor(level)}`}>
          {score != null ? score.toFixed(1) : 'N/A'}
        </text>
      </svg>
      <div className="flex flex-col">
        <span className={`text-[9px] font-bold uppercase tracking-wider ${getQualityColor(level)}`}>
          {level === 'high' ? 'High Quality' : level === 'medium' ? 'Medium Quality' : level === 'low' ? 'Low Quality' : 'Unknown'}
        </span>
        <span className="text-[7px] text-claude-text-muted">MolProbity Score</span>
      </div>
    </div>
  );
}

function MetricBar({ label, value, max, suffix, percentile, trend }: {
  label: string;
  value: number | null;
  max: number;
  suffix?: string;
  percentile?: number | null;
  trend?: 'up' | 'down' | 'stable';
}) {
  const pct = value != null ? Math.min(100, (value / max) * 100) : 0;
  // Color based on metric type
  const isOutlier = label.toLowerCase().includes('outlier');
  const isClash = label.toLowerCase().includes('clash');
  const barColor = isOutlier || isClash
    ? (value != null && value > (isOutlier ? 2 : 10) ? '#ef4444' : value != null && value > (isOutlier ? 1 : 5) ? '#f59e0b' : '#22c55e')
    : '#3b82f6';

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-claude-text-secondary">{label}</span>
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-mono font-bold text-claude-text">
            {value != null ? value.toFixed(value < 10 ? 2 : 1) : 'N/A'}{suffix || ''}
          </span>
          {trend && <TrendArrow direction={trend} />}
          {percentile != null && (
            <span className="text-[8px] font-semibold px-1 py-px rounded
                             bg-claude-accent-light text-claude-accent">
              {percentile}th
            </span>
          )}
        </div>
      </div>
      <div className="h-1.5 bg-claude-border-light rounded-full overflow-hidden">
        <div
          className="h-full rounded-full metric-bar-fill shimmer-highlight chart-bar-animate"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}

// ─── Percentile Bar Visualization ──────────────────────────────────────

function PercentileBar({ label, percentile, icon }: {
  label: string;
  percentile: number | null;
  icon?: React.ReactNode;
}) {
  if (percentile == null) return null;

  // Color based on percentile rank
  const color = percentile > 75 ? '#22c55e' : percentile >= 25 ? '#f59e0b' : '#ef4444';
  const bgColor = percentile > 75
    ? 'bg-green-100 dark:bg-green-900/30'
    : percentile >= 25
    ? 'bg-amber-100 dark:bg-amber-900/30'
    : 'bg-red-100 dark:bg-red-900/30';
  const textColor = percentile > 75
    ? 'text-green-700 dark:text-green-400'
    : percentile >= 25
    ? 'text-amber-700 dark:text-amber-400'
    : 'text-red-700 dark:text-red-400';

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-claude-text-secondary flex items-center gap-0.5">
          {icon}
          {label}
        </span>
        <span className={`text-[10px] font-mono font-bold ${textColor}`}>
          {percentile}th percentile
        </span>
      </div>
      <div className="h-2 bg-claude-border-light rounded-full overflow-hidden relative">
        <div
          className="h-full rounded-full metric-bar-fill transition-all duration-500 chart-bar-animate"
          style={{ width: `${percentile}%`, backgroundColor: color }}
        />
        {/* 25th and 75th percentile markers */}
        <div className="absolute top-0 bottom-0 w-px bg-claude-text-muted/30" style={{ left: '25%' }} />
        <div className="absolute top-0 bottom-0 w-px bg-claude-text-muted/30" style={{ left: '75%' }} />
      </div>
      {/* Scale labels */}
      <div className="flex justify-between text-[6px] text-claude-text-muted">
        <span>0th</span>
        <span>25th</span>
        <span>50th</span>
        <span>75th</span>
        <span>100th</span>
      </div>
    </div>
  );
}

// ─── Ramachandran Plot Component ─────────────────────────────────────────

function RamachandranPlot({
  favored,
  outliers,
  residueCount,
  realPoints,
}: {
  favored: number | null;
  outliers: number | null;
  residueCount: number;
  realPoints?: { phi: number; psi: number; region: string; chain?: string }[];
}) {
  const svgSize = 200;
  const padding = 25;
  const plotSize = svgSize - padding * 2;
  const center = svgSize / 2;
  const [selectedRegion, setSelectedRegion] = useState<'favored' | 'allowed' | 'disallowed' | null>(null);
  const [showOutliersOnly, setShowOutliersOnly] = useState(false);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; point: { phi: number; psi: number; chain: string; resName: string; resSeq: number } } | null>(null);

  // Extract unique chains from real data
  const chains = useMemo(() => {
    if (!realPoints || realPoints.length === 0) return [];
    const chainSet = new Set<string>();
    for (const p of realPoints) {
      if (p.chain) chainSet.add(p.chain);
    }
    return Array.from(chainSet).sort();
  }, [realPoints]);

  const [selectedChain, setSelectedChain] = useState<string>('all');

  // Convert phi/psi to SVG coordinates
  const toX = (angle: number) => center + (angle / 180) * (plotSize / 2);
  const toY = (angle: number) => center - (angle / 180) * (plotSize / 2);

  // Compute filtered and classified points for display
  const allClassifiedPoints = useMemo(() => {
    if (realPoints && realPoints.length > 0) {
      return realPoints.map((p) => ({
        phi: p.phi,
        psi: p.psi,
        region: p.region as 'favored' | 'allowed' | 'disallowed',
        chain: p.chain || '',
      }));
    }
    // Fallback: simulate — only when no real data available
    const pts: { phi: number; psi: number; region: 'favored' | 'allowed' | 'disallowed'; chain: string }[] = [];
    const count = Math.min(Math.max(residueCount, 20), 300);
    const outliersPct = outliers ?? 0;
    const favoredPct = favored ?? 97;
    const allowedPct = Math.max(0, 100 - favoredPct - outliersPct);
    const favoredCount = Math.round(count * (favoredPct / 100));
    for (let i = 0; i < favoredCount; i++) {
      const isHelix = Math.random() < 0.55;
      if (isHelix) {
        pts.push({ phi: -60 + (Math.random() - 0.5) * 40, psi: -45 + (Math.random() - 0.5) * 40, region: 'favored', chain: '' });
      } else {
        pts.push({ phi: -120 + (Math.random() - 0.5) * 40, psi: 120 + (Math.random() - 0.5) * 50, region: 'favored', chain: '' });
      }
    }
    const allowedCount = Math.round(count * (allowedPct / 100));
    for (let i = 0; i < allowedCount; i++) {
      const regionType = Math.random();
      if (regionType < 0.4) {
        pts.push({ phi: 60 + (Math.random() - 0.5) * 50, psi: 40 + (Math.random() - 0.5) * 50, region: 'allowed', chain: '' });
      } else if (regionType < 0.7) {
        pts.push({ phi: -80 + (Math.random() - 0.5) * 60, psi: 0 + (Math.random() - 0.5) * 80, region: 'allowed', chain: '' });
      } else {
        pts.push({ phi: -100 + (Math.random() - 0.5) * 60, psi: 80 + (Math.random() - 0.5) * 80, region: 'allowed', chain: '' });
      }
    }
    const outlierCount = Math.round(count * (outliersPct / 100));
    for (let i = 0; i < outlierCount; i++) {
      pts.push({ phi: (Math.random() - 0.5) * 300, psi: (Math.random() - 0.5) * 300, region: 'disallowed', chain: '' });
    }
    return pts.map((p) => ({
      ...p,
      phi: Math.max(-180, Math.min(180, p.phi)),
      psi: Math.max(-180, Math.min(180, p.psi)),
    }));
  }, [favored, outliers, residueCount, realPoints]);


  // Apply chain and outlier filters
  const points = useMemo(() => {
    return allClassifiedPoints.filter((p) => {
      if (showOutliersOnly && p.region !== 'disallowed') return false;
      if (selectedChain !== 'all' && p.chain !== selectedChain) return false;
      return true;
    });
  }, [allClassifiedPoints, selectedChain, showOutliersOnly]);

  // Region colors
  const regionColors = {
    favored: '#60a5fa',
    allowed: '#93c5fd',
    disallowed: '#f87171',
  };

  const regionFills = {
    // Allowed: pale peach/salmon fill with contour outline
    allowed: 'rgba(255, 210, 170, 0.45)',
    // Favored: lavender/purple core, layered on top of allowed
    favored: 'rgba(185, 145, 210, 0.70)',
    disallowed: 'rgba(255, 255, 255, 0)',
  };
  const regionStrokes = {
    allowed: 'rgba(180, 145, 110, 0.50)',
    favored: 'rgba(150, 110, 170, 0.40)',
    disallowed: 'rgba(180, 180, 180, 0.30)',
  };

  // Full-shaped allowed/favored regions (reference image style)
  // Allowed = large light-beige blobs; Favored = smaller pinker cores inside
  const alphaAllowedPath = `M ${toX(-120)},${toY(-100)} Q ${toX(-70)},${toY(-115)} ${toX(-20)},${toY(-100)} Q ${toX(20)},${toY(-60)} ${toX(20)},${toY(-10)} Q ${toX(20)},${toY(40)} ${toX(-20)},${toY(70)} Q ${toX(-70)},${toY(80)} ${toX(-120)},${toY(60)} Q ${toX(-140)},${toY(20)} ${toX(-120)},${toY(-100)} Z`;
  const betaAllowedPath = `M ${toX(-180)},${toY(10)} Q ${toX(-160)},${toY(-60)} ${toX(-80)},${toY(-40)} Q ${toX(-20)},${toY(-20)} ${toX(20)},${toY(30)} Q ${toX(30)},${toY(100)} ${toX(0)},${toY(160)} Q ${toX(-50)},${toY(180)} ${toX(-120)},${toY(180)} Q ${toX(-180)},${toY(170)} ${toX(-180)},${toY(100)} Q ${toX(-180)},${toY(55)} ${toX(-180)},${toY(10)} Z`;
  const leftAllowedPath = `M ${toX(30)},${toY(-125)} Q ${toX(70)},${toY(-115)} ${toX(110)},${toY(-100)} Q ${toX(140)},${toY(-60)} ${toX(145)},${toY(-10)} Q ${toX(140)},${toY(40)} ${toX(120)},${toY(80)} Q ${toX(80)},${toY(95)} ${toX(40)},${toY(90)} Q ${toX(10)},${toY(80)} ${toX(5)},${toY(30)} Q ${toX(5)},${toY(-20)} ${toX(10)},${toY(-70)} Q ${toX(15)},${toY(-110)} ${toX(30)},${toY(-125)} Z`;

  const alphaFavoredPath = `M ${toX(-95)},${toY(-70)} Q ${toX(-60)},${toY(-82)} ${toX(-30)},${toY(-70)} Q ${toX(-15)},${toY(-40)} ${toX(-30)},${toY(-10)} Q ${toX(-55)},${toY(0)} ${toX(-80)},${toY(-5)} Q ${toX(-100)},${toY(-40)} ${toX(-95)},${toY(-70)} Z`;
  const betaFavoredPath = `M ${toX(-160)},${toY(55)} Q ${toX(-125)},${toY(35)} ${toX(-85)},${toY(50)} Q ${toX(-55)},${toY(85)} ${toX(-70)},${toY(140)} Q ${toX(-105)},${toY(165)} ${toX(-145)},${toY(155)} Q ${toX(-165)},${toY(120)} ${toX(-165)},${toY(80)} Q ${toX(-170)},${toY(65)} ${toX(-160)},${toY(55)} Z`;
  const leftFavoredPath = `M ${toX(50)},${toY(-95)} Q ${toX(75)},${toY(-90)} ${toX(95)},${toY(-80)} Q ${toX(110)},${toY(-50)} ${toX(110)},${toY(-15)} Q ${toX(108)},${toY(20)} ${toX(90)},${toY(45)} Q ${toX(70)},${toY(60)} ${toX(48)},${toY(55)} Q ${toX(35)},${toY(45)} ${toX(35)},${toY(10)} Q ${toX(35)},${toY(-30)} ${toX(40)},${toY(-65)} Q ${toX(42)},${toY(-85)} ${toX(50)},${toY(-95)} Z`;

  // Percentages for display - derived from RCSB outliers
  // Note: favored% here means favored+allowed (as reported by MolProbity)
  // true favored = favored - allowed, but we don't have that breakdown
  const displayFavoredPct = favored != null ? favored.toFixed(1) : 'N/A';
  const displayOutliersPct = outliers != null ? outliers.toFixed(1) : 'N/A';
  const displayAllowedPct = favored != null && outliers != null
    ? Math.max(0, 100 - favored - outliers).toFixed(1)
    : 'N/A';

  return (
    <div className="bg-claude-bg/50 rounded-lg border border-claude-border-light p-2">
      <svg
        width="100%"
        viewBox={`0 0 ${svgSize} ${svgSize}`}
        className="mx-auto"
        style={{ maxHeight: '200px' }}
      >
        {/* Background: disallowed region (entire plot - white) */}
        <rect
          x={padding}
          y={padding}
          width={plotSize}
          height={plotSize}
          fill="#ffffff"
          rx={4}
          onClick={() => setSelectedRegion('disallowed')}
          style={{ cursor: 'pointer' }}
        />

        {/* Allowed regions: pale peach blobs with contour lines */}
        <path d={alphaAllowedPath} fill={regionFills.allowed} stroke={regionStrokes.allowed} strokeWidth={1} onClick={() => setSelectedRegion('allowed')} style={{ cursor: 'pointer' }} />
        <path d={betaAllowedPath} fill={regionFills.allowed} stroke={regionStrokes.allowed} strokeWidth={1} onClick={() => setSelectedRegion('allowed')} style={{ cursor: 'pointer' }} />
        <path d={leftAllowedPath} fill={regionFills.allowed} stroke={regionStrokes.allowed} strokeWidth={1} onClick={() => setSelectedRegion('allowed')} style={{ cursor: 'pointer' }} />

        {/* Favored regions: lavender/purple cores with contour lines */}
        <path d={alphaFavoredPath} fill={regionFills.favored} stroke={regionStrokes.favored} strokeWidth={0.8} onClick={(e) => { e.stopPropagation(); setSelectedRegion(selectedRegion === 'favored' ? null : 'favored'); }} style={{ cursor: 'pointer' }} />
        <path d={betaFavoredPath} fill={regionFills.favored} stroke={regionStrokes.favored} strokeWidth={0.8} onClick={(e) => { e.stopPropagation(); setSelectedRegion(selectedRegion === 'favored' ? null : 'favored'); }} style={{ cursor: 'pointer' }} />
        <path d={leftFavoredPath} fill={regionFills.favored} stroke={regionStrokes.favored} strokeWidth={0.8} onClick={(e) => { e.stopPropagation(); setSelectedRegion(selectedRegion === 'favored' ? null : 'favored'); }} style={{ cursor: 'pointer' }} />

        {/* Grid lines */}
        {[-180, -90, 0, 90, 180].map((v) => (
          <React.Fragment key={`grid-${v}`}>
            <line x1={toX(v)} y1={padding} x2={toX(v)} y2={svgSize - padding} stroke="var(--claude-border)" strokeWidth={0.5} strokeDasharray={v === 0 ? '2,2' : '1,3'} />
            <line x1={padding} y1={toY(v)} x2={svgSize - padding} y2={toY(v)} stroke="var(--claude-border)" strokeWidth={0.5} strokeDasharray={v === 0 ? '2,2' : '1,3'} />
          </React.Fragment>
        ))}

        {/* Axis tick labels */}
        {[-180, -90, 0, 90, 180].map((v) => (
          <React.Fragment key={`tick-${v}`}>
            <text x={toX(v)} y={svgSize - 6} textAnchor="middle" fontSize={7} fill="currentColor" className="fill-claude-text-muted">{v}</text>
            <text x={13} y={toY(v) + 3} textAnchor="start" fontSize={7} fill="currentColor" className="fill-claude-text-muted">{v}</text>
          </React.Fragment>
        ))}

        {/* Axis labels */}
        <text x={center} y={svgSize - 1} textAnchor="middle" fontSize={8} fill="currentColor" className="fill-claude-text-muted font-medium">φ</text>
        <text x={10} y={center} textAnchor="middle" fontSize={8} transform={`rotate(-90, 10, ${center})`} fill="currentColor" className="fill-claude-text-muted font-medium">ψ</text>

        {/* Plot border */}
        <rect x={padding} y={padding} width={plotSize} height={plotSize} fill="none" stroke="var(--claude-border)" strokeWidth={1} rx={4} />

        {/* Scatter points with hover tooltips */}
        {points.map((pt, i) => (
          <circle
            key={i}
            cx={toX(pt.phi)}
            cy={toY(pt.psi)}
            r={pt.region === 'disallowed' ? 2.5 : 2}
            fill={pt.region === 'favored' ? '#60a5fa' : pt.region === 'allowed' ? '#93c5fd' : '#f87171'}
            opacity={0.85}
            className="rama-plot-dot"
            style={{ animationDelay: `${i * 2}ms` }}
            onMouseEnter={(e) => {
              const svgRect = (e.currentTarget.ownerSVGElement as unknown as SVGSVGElement)?.getBoundingClientRect();
              if (!svgRect) return;
              const cx = e.currentTarget.cx.baseVal.value;
              const cy = e.currentTarget.cy.baseVal.value;
              setTooltip({ x: cx, y: cy, point: { phi: pt.phi, psi: pt.psi, chain: pt.chain, resName: (pt as any).resName || '', resSeq: (pt as any).resSeq || 0 } });
            }}
            onMouseLeave={() => setTooltip(null)}
          />
        ))}

        {/* Tooltip for hover */}
        {tooltip && (
          <g>
            <rect
              x={tooltip.x + 6}
              y={tooltip.y - 14}
              width={55}
              height={22}
              fill="rgba(15,23,42,0.95)"
              rx={4}
              stroke="rgba(96,165,250,0.4)"
              strokeWidth={1}
            />
            <text
              x={tooltip.x + 9}
              y={tooltip.y - 4}
              fontSize={7}
              fontFamily="monospace"
              fill="#60a5fa"
              fontWeight={600}
            >
              {tooltip.point.resSeq > 0 ? `${tooltip.point.resSeq}` : `${tooltip.point.phi.toFixed(0)},${tooltip.point.psi.toFixed(0)}`}
              {tooltip.point.resName && ` ${tooltip.point.resName}`}
            </text>
          </g>
        )}
      </svg>

      {/* Stats below the plot */}
      <div className="flex items-center justify-center gap-3 mt-1.5 text-[8px]">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: regionColors.favored }} />
          <span className="text-claude-text-secondary">{displayFavoredPct}% favored</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: regionColors.allowed }} />
          <span className="text-claude-text-secondary">{displayAllowedPct}% allowed</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: regionColors.disallowed }} />
          <span className="text-claude-text-secondary">{displayOutliersPct}% outliers</span>
        </span>
      </div>

      {/* Filter controls */}
      {chains.length > 0 && (
        <div className="flex items-center gap-2 mt-1.5 text-[8px]">
          <span className="text-claude-text-muted">Chain:</span>
          <select
            value={selectedChain}
            onChange={(e) => setSelectedChain(e.target.value)}
            className="px-1 py-0.5 rounded border border-claude-border bg-claude-surface text-claude-text text-[8px] cursor-pointer"
          >
            <option value="all">All ({chains.length})</option>
            {chains.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {(outliers ?? 0) > 0 && (
            <button
              onClick={() => setShowOutliersOnly(!showOutliersOnly)}
              className={`px-1.5 py-0.5 rounded border text-[8px] transition-colors ${
                showOutliersOnly
                  ? 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400'
                  : 'border-claude-border bg-claude-surface text-claude-text-muted hover:text-red-500'
              }`}
            >
              Outliers only
            </button>
          )}
        </div>
      )}

      {/* Selected region info */}
      {selectedRegion && (
        <div className="mt-1.5 px-2 py-1 rounded-md border border-claude-border-light bg-claude-surface/60 text-[8px]">
          <span className="font-semibold text-claude-text">
            {selectedRegion === 'favored' ? 'Favored' : selectedRegion === 'allowed' ? 'Allowed' : 'Disallowed'} region:
          </span>
          {' '}
          <span className="text-claude-text-secondary">
            {selectedRegion === 'favored'
              ? `${points.filter(p => p.region === 'favored').length} residues in α-helix and β-sheet conformations`
              : selectedRegion === 'allowed'
              ? `${points.filter(p => p.region === 'allowed').length} residues in allowed conformations`
              : `${points.filter(p => p.region === 'disallowed').length} residues in disallowed conformations`
            }
          </span>
        </div>
      )}
    </div>
  );
}
// MetricBar, PercentileBar, RamachandranPlot, TrendArrow are defined locally

// ─── Ligand Interaction Network (Force-Directed Graph) ───────────────────

interface LigandNetworkNode {
  id: string;
  label: string;
  type: 'chain' | 'ligand';
  size: number;
  color: string;
  description: string;
  residueCount: number;
}

interface LigandNetworkEdge {
  source: string;
  target: string;
  weight: number;
  label: string;
}

export function LigandInteractionNetwork({
  pdbId,
  entities,
  ligandCodes,
  entityColors,
  ligandColors,
  contacts,
  bindingSites,
}: {
  pdbId: string;
  entities: EntityInfo[];
  ligandCodes: string[];
  entityColors: Record<string, string>;
  ligandColors: Record<string, string>;
  contacts?: ResidueContact[];
  bindingSites?: BindingSite[];
}) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const animRef = useRef<number>(0);
  const nodePositionsRef = useRef<Record<string, { x: number; y: number; vx: number; vy: number }>>({});

  // Build nodes from entities and ligands
  const nodes = useMemo(() => {
    const nodeList: LigandNetworkNode[] = [];

    for (const entity of entities) {
      const mt = entity.molecule_type.toLowerCase();
      if (mt === 'water') continue;
      const mainChain = entity.chains[0];
      if (!mainChain) continue;

      const chainId = mainChain.chain;
      const entityKey = `${pdbId}.${chainId}`;
      const color = entityColors[entityKey] || '#718096';
      const chainLen = mainChain.length ?? 0;
      const isLigand = mt.includes('bound') || mt === 'non-polymer' ||
        ((mt.includes('polypeptide') && chainLen <= 10 && chainLen > 0));

      if (isLigand) continue;

      nodeList.push({
        id: `chain_${chainId}`,
        label: chainId,
        type: 'chain',
        size: Math.max(14, Math.min(30, 10 + Math.sqrt(chainLen) * 1.6)),
        color,
        description: entity.description || `Chain ${chainId}`,
        residueCount: chainLen,
      });
    }

    for (const code of ligandCodes.slice(0, 8)) {
      const color = ligandColors[code] || '#d69e2e';
      nodeList.push({
        id: `ligand_${code}`,
        label: code.length > 3 ? code.slice(0, 3) : code,
        type: 'ligand',
        size: 12,
        color,
        description: `Ligand ${code}`,
        residueCount: 0,
      });
    }

    return nodeList;
  }, [pdbId, entities, ligandCodes, entityColors, ligandColors]);

  // Build edges from contacts and binding sites
  const edges = useMemo(() => {
    const edgeList: LigandNetworkEdge[] = [];
    const edgeMap = new Map<string, { weight: number; label: string }>();

    if (contacts) {
      for (const c of contacts) {
        if (!c.chain1 || !c.chain2) continue;
        const src = `chain_${c.chain1}`;
        const tgt = `chain_${c.chain2}`;
        const key = [src, tgt].sort().join('|');
        const existing = edgeMap.get(key);
        if (existing) {
          existing.weight++;
        } else {
          edgeMap.set(key, { weight: 1, label: 'contacts' });
        }
      }
    }

    if (bindingSites) {
      for (const site of bindingSites) {
        const ligId = `ligand_${site.ligandCode}`;
        for (const chain of site.chains) {
          const chainId = `chain_${chain}`;
          const key = [ligId, chainId].sort().join('|');
          const existing = edgeMap.get(key);
          if (existing) {
            existing.weight += 2;
            existing.label = site.type;
          } else {
            edgeMap.set(key, { weight: 2, label: site.type });
          }
        }
      }
    }

    if (edgeMap.size === 0 && entities.length > 0 && ligandCodes.length > 0) {
      const entityNodes = nodes.filter(n => n.type === 'chain');
      const ligNodes = nodes.filter(n => n.type === 'ligand');
      for (let i = 0; i < Math.min(entityNodes.length, 3); i++) {
        for (let j = 0; j < Math.min(ligNodes.length, 2); j++) {
          const key = [entityNodes[i].id, ligNodes[j].id].sort().join('|');
          edgeMap.set(key, { weight: 1, label: 'binding' });
        }
      }
      for (let i = 0; i < entityNodes.length - 1; i++) {
        const key = [entityNodes[i].id, entityNodes[i + 1].id].sort().join('|');
        edgeMap.set(key, { weight: 1, label: 'interface' });
      }
    }

    for (const [key, val] of edgeMap) {
      const [src, tgt] = key.split('|');
      if (nodes.find(n => n.id === src) && nodes.find(n => n.id === tgt)) {
        edgeList.push({ source: src, target: tgt, weight: val.weight, label: val.label });
      }
    }

    return edgeList;
  }, [contacts, bindingSites, entities, ligandCodes, nodes]);

  // Simple force-directed layout simulation
  const svgW = 220;
  const svgH = 180;
  const cx = svgW / 2;
  const cy = svgH / 2;

  const positions = useMemo(() => {
    const pos: Record<string, { x: number; y: number }> = {};
    const chainNodes = nodes.filter(n => n.type === 'chain');
    const ligNodes = nodes.filter(n => n.type === 'ligand');

    const outerRadius = Math.min(cx, cy) - 28;
    for (let i = 0; i < chainNodes.length; i++) {
      const angle = (2 * Math.PI * i) / chainNodes.length - Math.PI / 2;
      pos[chainNodes[i].id] = {
        x: cx + outerRadius * Math.cos(angle),
        y: cy + outerRadius * Math.sin(angle),
      };
    }

    const innerRadius = outerRadius * 0.4;
    for (let i = 0; i < ligNodes.length; i++) {
      const angle = (2 * Math.PI * i) / Math.max(ligNodes.length, 1) - Math.PI / 4;
      pos[ligNodes[i].id] = {
        x: cx + innerRadius * Math.cos(angle),
        y: cy + innerRadius * Math.sin(angle),
      };
    }

    // Initialize ref positions for animation
    for (const [id, p] of Object.entries(pos)) {
      if (!nodePositionsRef.current[id]) {
        nodePositionsRef.current[id] = { x: p.x, y: p.y, vx: 0, vy: 0 };
      }
    }

    return pos;
  }, [nodes, cx, cy]);

  // Simple force-directed animation tick
  useEffect(() => {
    const posRef = nodePositionsRef.current;
    const nodeIds = nodes.map(n => n.id);
    // Initialize missing nodes
    for (const id of nodeIds) {
      if (!posRef[id]) {
        const p = positions[id];
        if (p) posRef[id] = { x: p.x, y: p.y, vx: 0, vy: 0 };
      }
    }

    let frame = 0;
    const maxFrames = 60;
    function animate() {
      if (frame >= maxFrames) return;
      frame++;
      // Apply forces
      for (const id of nodeIds) {
        if (!posRef[id]) continue;
        // Center gravity
        posRef[id].vx += (cx - posRef[id].x) * 0.005;
        posRef[id].vy += (cy - posRef[id].y) * 0.005;
      }
      // Repulsion between nodes
      for (let i = 0; i < nodeIds.length; i++) {
        for (let j = i + 1; j < nodeIds.length; j++) {
          const a = posRef[nodeIds[i]];
          const b = posRef[nodeIds[j]];
          if (!a || !b) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 800 / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx -= fx;
          a.vy -= fy;
          b.vx += fx;
          b.vy += fy;
        }
      }
      // Attraction along edges
      for (const edge of edges) {
        const a = posRef[edge.source];
        const b = posRef[edge.target];
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const idealDist = 60;
        const force = (dist - idealDist) * 0.01;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }
      // Apply velocity with damping
      for (const id of nodeIds) {
        if (!posRef[id]) continue;
        posRef[id].vx *= 0.6;
        posRef[id].vy *= 0.6;
        posRef[id].x += posRef[id].vx;
        posRef[id].y += posRef[id].vy;
        // Boundary clamp
        posRef[id].x = Math.max(20, Math.min(svgW - 20, posRef[id].x));
        posRef[id].y = Math.max(20, Math.min(svgH - 20, posRef[id].y));
      }
      setTick(frame);
      animRef.current = requestAnimationFrame(animate);
    }

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [nodes, edges, positions, cx, cy]);

  // Use animated positions if available, else fall back to static
  const finalPositions = useMemo(() => {
    const pos: Record<string, { x: number; y: number }> = {};
    for (const n of nodes) {
      const ref = nodePositionsRef.current[n.id];
      pos[n.id] = ref ? { x: ref.x, y: ref.y } : (positions[n.id] || { x: cx, y: cy });
    }
    return pos;
    // tick is used to trigger re-render during animation
  }, [nodes, positions, tick]);

  if (nodes.length === 0) return null;

  const maxWeight = Math.max(...edges.map(e => e.weight), 1);

  // Determine highlighted nodes from selected
  const connectedNodeIds = new Set<string>();
  const highlightedEdgeKeys = new Set<string>();
  if (selectedNode) {
    connectedNodeIds.add(selectedNode);
    for (const edge of edges) {
      if (edge.source === selectedNode || edge.target === selectedNode) {
        connectedNodeIds.add(edge.source);
        connectedNodeIds.add(edge.target);
        highlightedEdgeKeys.add([edge.source, edge.target].sort().join('|'));
      }
    }
  }

  return (
    <div className="flex items-center justify-center p-1 rounded-md bg-claude-bg/50 border border-claude-border-light">
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} className="flex-shrink-0">
        <defs>
          <filter id="ligNetGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Edges */}
        {edges.map((edge, i) => {
          const src = finalPositions[edge.source];
          const tgt = finalPositions[edge.target];
          if (!src || !tgt) return null;
          const thickness = 1 + (edge.weight / maxWeight) * 3;
          const isHov = hoveredEdge === `${edge.source}|${edge.target}`;
          const isSel = highlightedEdgeKeys.has([edge.source, edge.target].sort().join('|'));
          const isDim = selectedNode && !isSel;
          return (
            <g key={i}>
              <line
                x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                stroke="transparent"
                strokeWidth={Math.max(thickness + 6, 10)}
                strokeLinecap="round"
                onMouseEnter={() => setHoveredEdge(`${edge.source}|${edge.target}`)}
                onMouseLeave={() => setHoveredEdge(null)}
                style={{ cursor: 'pointer' }}
              />
              <line
                x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                stroke={isHov || isSel ? 'var(--claude-accent)' : 'var(--claude-accent)'}
                strokeWidth={isHov || isSel ? thickness + 1 : thickness}
                opacity={isDim ? 0.06 : isHov || isSel ? 0.8 : 0.2 + (edge.weight / maxWeight) * 0.3}
                strokeLinecap="round"
                pointerEvents="none"
              />
              {(isHov || isSel) && (
                <g>
                  <rect
                    x={(src.x + tgt.x) / 2 - 20} y={(src.y + tgt.y) / 2 - 8}
                    width={40} height={14} rx={3}
                    fill="var(--claude-surface)" stroke="var(--claude-border-light)"
                    strokeWidth={0.5} opacity={0.92}
                  />
                  <text
                    x={(src.x + tgt.x) / 2} y={(src.y + tgt.y) / 2}
                    textAnchor="middle" dominantBaseline="central"
                    className="fill-claude-text font-bold pointer-events-none"
                    style={{ fontSize: '7px' }}
                  >
                    {edge.weight} {edge.label}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const pos = finalPositions[node.id];
          if (!pos) return null;
          const isHov = hoveredNode === node.id;
          const isSel = selectedNode === node.id;
          const isConn = connectedNodeIds.has(node.id);
          const isDim = selectedNode && !isConn;
          const r = node.size / 2;
          const opacity = isDim ? 0.15 : 1;

          return (
            <g
              key={node.id}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={() => setSelectedNode(isSel ? null : node.id)}
              style={{ cursor: 'pointer', opacity, transition: 'opacity 0.2s ease' }}
            >
              {isSel && (
                <circle cx={pos.x} cy={pos.y} r={r + 6} fill="none" stroke={node.color} strokeWidth={1.5} opacity={0.6}>
                  <animate attributeName="r" values={`${r + 4};${r + 10};${r + 4}`} dur="1.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.6;0.1;0.6" dur="1.5s" repeatCount="indefinite" />
                </circle>
              )}
              {isHov && !isSel && (
                <circle cx={pos.x} cy={pos.y} r={r + 4} fill={node.color} opacity={0.12} />
              )}
              {node.type === 'chain' ? (
                <circle
                  cx={pos.x} cy={pos.y} r={r}
                  fill={node.color} opacity={0.2}
                  stroke={node.color} strokeWidth={isSel ? 2.5 : 1.5}
                  filter={isSel ? 'url(#ligNetGlow)' : undefined}
                />
              ) : (
                <rect
                  x={pos.x - r * 0.7} y={pos.y - r * 0.7}
                  width={r * 1.4} height={r * 1.4}
                  fill={node.color} opacity={0.25}
                  stroke={node.color} strokeWidth={isSel ? 2.5 : 1.5}
                  rx={2} transform={`rotate(45, ${pos.x}, ${pos.y})`}
                  filter={isSel ? 'url(#ligNetGlow)' : undefined}
                />
              )}
              <text
                x={pos.x} y={pos.y}
                textAnchor="middle" dominantBaseline="central"
                className="fill-claude-text font-bold font-mono pointer-events-none"
                style={{ fontSize: node.type === 'ligand' ? '6px' : '8px' }}
              >
                {node.label}
              </text>
              {/* Tooltip on hover */}
              {isHov && (
                <g>
                  <rect
                    x={pos.x - 52} y={pos.y - r - 28}
                    width={104} height={22} rx={4}
                    fill="var(--claude-surface)" stroke="var(--claude-border-light)"
                    strokeWidth={0.5} opacity={0.95}
                  />
                  <text
                    x={pos.x} y={pos.y - r - 17}
                    textAnchor="middle" dominantBaseline="central"
                    className="fill-claude-text-secondary pointer-events-none"
                    style={{ fontSize: '7px' }}
                  >
                    {node.type === 'chain' ? `Chain ${node.label}` : `Ligand ${node.label}`}
                    {node.residueCount > 0 ? ` · ${node.residueCount} res` : ''}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Legend */}
        <g transform={`translate(6, ${svgH - 30})`}>
          <rect x={-2} y={-4} width={82} height={26} rx={4}
                fill="var(--claude-surface)" opacity={0.85} stroke="var(--claude-border-light)" strokeWidth={0.5} />
          <circle cx={8} cy={4} r={4} fill="var(--claude-accent)" opacity={0.3} stroke="var(--claude-accent)" strokeWidth={1} />
          <text x={16} y={4} dominantBaseline="central" className="fill-claude-text-muted" style={{ fontSize: '6px' }}>Chain</text>
          <rect x={4} y={13} width={5.6} height={5.6} rx={1} fill="#d69e2e" opacity={0.3}
                stroke="#d69e2e" strokeWidth={1} transform="rotate(45, 6.8, 15.8)" />
          <text x={16} y={16} dominantBaseline="central" className="fill-claude-text-muted" style={{ fontSize: '6px' }}>Ligand</text>
          <line x1={46} y1={4} x2={56} y2={4} stroke="var(--claude-accent)" strokeWidth={1.5} opacity={0.5} />
          <text x={59} y={4} dominantBaseline="central" className="fill-claude-text-muted" style={{ fontSize: '6px' }}>Edge</text>
        </g>
      </svg>
    </div>
  );
}

// ─── Legacy alias for backward compatibility ──────────────────────────────
function NetworkGraph(props: Parameters<typeof LigandInteractionNetwork>[0]) {
  return <LigandInteractionNetwork {...props} />;
}

// ─── Annotations Section ────────────────────────────────────────────────

// ─── Contact Network Graph (Interactive SVG) ───────────────────────────────

interface ContactNode {
  id: string;
  label: string;
  type: 'chain' | 'ligand';
  size: number;
  color: string;
  residueCount: number;
}

interface ContactEdge {
  source: string;
  target: string;
  weight: number;
  contacts: ResidueContact[];
}

function getDistanceEdgeColor(distance: number): string {
  if (distance <= 3) return '#22c55e';
  if (distance <= 4) return '#f59e0b';
  return '#ef4444';
}

function getDistanceLabelClass(distance: number): string {
  if (distance <= 3) return 'text-green-600 dark:text-green-400';
  if (distance <= 4) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function getDistanceDotClass(distance: number): string {
  if (distance <= 3) return 'bg-green-500';
  if (distance <= 4) return 'bg-amber-500';
  return 'bg-red-500';
}

function ContactNetworkGraph({
  contacts,
  entities,
  ligandCodes,
  entityColors,
  ligandColors,
  pdbId,
  onNodeClick,
  onEdgeClick,
  selectedNode,
}: {
  contacts: ResidueContact[];
  entities: EntityInfo[];
  ligandCodes: string[];
  entityColors: Record<string, string>;
  ligandColors: Record<string, string>;
  pdbId: string;
  onNodeClick: (nodeId: string | null) => void;
  onEdgeClick: (edgeKey: string | null) => void;
  selectedNode: string | null;
}) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const [graphExpanded, setGraphExpanded] = useState(false);

  // Build nodes from contacts data + entity/ligand info
  const nodes = useMemo(() => {
    const nodeMap = new Map<string, ContactNode>();

    // Collect all unique chains from contacts
    const chainSet = new Set<string>();
    for (const c of contacts) {
      if (c.chain1) chainSet.add(c.chain1);
      if (c.chain2) chainSet.add(c.chain2);
    }

    // Also add ligand codes from contacts (chain IDs that match ligand codes)
    const ligandSet = new Set<string>(ligandCodes);

    // Create chain nodes
    for (const chain of chainSet) {
      const isLigand = ligandSet.has(chain);
      // Find entity info for this chain
      const entity = entities.find(e => e.chains.some(ch => ch.chain === chain));
      const entityKey = `${pdbId}.${chain}`;
      const color = isLigand
        ? (ligandColors[chain] || '#d69e2e')
        : (entityColors[entityKey] || entity
          ? (entityColors[entityKey] || '#718096')
          : '#718096');
      const chainLength = entity?.chains.find(ch => ch.chain === chain)?.length ?? 0;

      if (isLigand) {
        nodeMap.set(chain, {
          id: chain,
          label: chain.length > 3 ? chain.slice(0, 3) : chain,
          type: 'ligand',
          size: 12,
          color,
          residueCount: chainLength,
        });
      } else {
        nodeMap.set(chain, {
          id: chain,
          label: chain,
          type: 'chain',
          size: Math.max(14, Math.min(26, 10 + Math.sqrt(chainLength) * 1.2)),
          color,
          residueCount: chainLength,
        });
      }
    }

    // Also add ligand nodes that may not appear in contacts but are in ligandCodes
    for (const code of ligandCodes) {
      if (!nodeMap.has(code)) {
        const color = ligandColors[code] || '#d69e2e';
        nodeMap.set(code, {
          id: code,
          label: code.length > 3 ? code.slice(0, 3) : code,
          type: 'ligand',
          size: 12,
          color,
          residueCount: 0,
        });
      }
    }

    return Array.from(nodeMap.values());
  }, [contacts, entities, ligandCodes, entityColors, ligandColors, pdbId]);

  // Build edges from contacts
  const edges = useMemo(() => {
    const edgeMap = new Map<string, ContactEdge>();

    for (const c of contacts) {
      if (!c.chain1 || !c.chain2) continue;
      if (c.chain1 === c.chain2) continue;
      const key = [c.chain1, c.chain2].sort().join('|');
      const existing = edgeMap.get(key);
      if (existing) {
        existing.weight++;
        existing.contacts.push(c);
      } else {
        edgeMap.set(key, {
          source: c.chain1,
          target: c.chain2,
          weight: 1,
          contacts: [c],
        });
      }
    }

    return Array.from(edgeMap.values());
  }, [contacts]);

  // Circular layout
  const positions = useMemo(() => {
    const pos: Record<string, { x: number; y: number }> = {};
    const svgW = graphExpanded ? 340 : 260;
    const svgH = graphExpanded ? 280 : 220;
    const cx = svgW / 2;
    const cy = svgH / 2;

    const chainNodes = nodes.filter(n => n.type === 'chain');
    const ligandNodes = nodes.filter(n => n.type === 'ligand');

    // Place chain nodes in outer circle
    const outerRadius = Math.min(cx, cy) - 30;
    for (let i = 0; i < chainNodes.length; i++) {
      const angle = (2 * Math.PI * i) / chainNodes.length - Math.PI / 2;
      pos[chainNodes[i].id] = {
        x: cx + outerRadius * Math.cos(angle),
        y: cy + outerRadius * Math.sin(angle),
      };
    }

    // Place ligand nodes in inner circle
    const innerRadius = outerRadius * 0.42;
    for (let i = 0; i < ligandNodes.length; i++) {
      const angle = (2 * Math.PI * i) / Math.max(ligandNodes.length, 1) - Math.PI / 4;
      pos[ligandNodes[i].id] = {
        x: cx + innerRadius * Math.cos(angle),
        y: cy + innerRadius * Math.sin(angle),
      };
    }

    return pos;
  }, [nodes, graphExpanded]);

  if (nodes.length === 0) return null;

  const svgW = graphExpanded ? 340 : 260;
  const svgH = graphExpanded ? 280 : 220;
  const maxWeight = Math.max(...edges.map(e => e.weight), 1);

  // Determine highlighted edges/nodes based on selection
  const connectedNodeIds = new Set<string>();
  const highlightedEdgeKeys = new Set<string>();

  if (selectedNode) {
    for (const edge of edges) {
      const edgeKey = [edge.source, edge.target].sort().join('|');
      if (edge.source === selectedNode || edge.target === selectedNode) {
        connectedNodeIds.add(edge.source);
        connectedNodeIds.add(edge.target);
        highlightedEdgeKeys.add(edgeKey);
      }
    }
    connectedNodeIds.add(selectedNode);
  }

  const avgEdgeDistance = (edge: ContactEdge): number => {
    const withDist = edge.contacts.filter(c => c.distance > 0);
    if (withDist.length === 0) return 0;
    return withDist.reduce((s, c) => s + c.distance, 0) / withDist.length;
  };

  return (
    <div className="relative">
      {/* Expand/collapse button */}
      <button
        onClick={() => setGraphExpanded(!graphExpanded)}
        className="absolute top-1 right-1 z-10 p-1 rounded-md
                   bg-claude-surface/60 backdrop-blur-sm border border-claude-border-light
                   text-claude-text-muted hover:text-claude-text hover:border-claude-accent/30
                   transition-all"
        title={graphExpanded ? 'Collapse graph' : 'Expand graph'}
      >
        {graphExpanded ? <Minimize2 className="w-2.5 h-2.5" /> : <Maximize2 className="w-2.5 h-2.5" />}
      </button>

      <div className="flex items-center justify-center p-2 rounded-lg
                      bg-claude-surface/40 backdrop-blur-md border border-claude-border-light
                      shadow-inner">
        <svg
          width={svgW}
          height={svgH}
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="flex-shrink-0"
          style={{ transition: 'width 0.3s ease, height 0.3s ease' }}
        >
          <defs>
            {/* Glow filter for selected nodes */}
            <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Subtle shadow for tooltips */}
            <filter id="tooltipShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.15" />
            </filter>
          </defs>

          {/* Background circle hint */}
          <circle
            cx={svgW / 2} cy={svgH / 2}
            r={Math.min(svgW, svgH) / 2 - 18}
            fill="none"
            stroke="var(--claude-border-light)"
            strokeWidth={0.5}
            strokeDasharray="3,3"
            opacity={0.4}
          />

          {/* Edges */}
          {edges.map((edge) => {
            const src = positions[edge.source];
            const tgt = positions[edge.target];
            if (!src || !tgt) return null;
            const edgeKey = [edge.source, edge.target].sort().join('|');
            const thickness = 1 + (edge.weight / maxWeight) * 4;
            const isHovered = hoveredEdge === edgeKey;
            const isSelected = highlightedEdgeKeys.has(edgeKey);
            const isDimmed = selectedNode && !isSelected;
            const avgDist = avgEdgeDistance(edge);
            const edgeColor = avgDist > 0 ? getDistanceEdgeColor(avgDist) : 'var(--claude-accent)';

            return (
              <g key={edgeKey}>
                {/* Hit area (wider invisible line for easier clicking) */}
                <line
                  x1={src.x} y1={src.y}
                  x2={tgt.x} y2={tgt.y}
                  stroke="transparent"
                  strokeWidth={Math.max(thickness + 6, 10)}
                  strokeLinecap="round"
                  onMouseEnter={() => setHoveredEdge(edgeKey)}
                  onMouseLeave={() => setHoveredEdge(null)}
                  onClick={() => onEdgeClick(edgeKey)}
                  style={{ cursor: 'pointer' }}
                />
                {/* Visible edge */}
                <line
                  x1={src.x} y1={src.y}
                  x2={tgt.x} y2={tgt.y}
                  stroke={isHovered || isSelected ? edgeColor : 'var(--claude-accent)'}
                  strokeWidth={isHovered || isSelected ? thickness + 1 : thickness}
                  opacity={isDimmed ? 0.08 : isHovered || isSelected ? 0.8 : 0.2 + (edge.weight / maxWeight) * 0.35}
                  strokeLinecap="round"
                  className={isSelected ? 'network-edge-flow' : ''}
                  style={{ transition: 'all 0.2s ease' }}
                  pointerEvents="none"
                />
                {/* Edge count label on hover */}
                {(isHovered || isSelected) && (
                  <g>
                    <rect
                      x={(src.x + tgt.x) / 2 - 16}
                      y={(src.y + tgt.y) / 2 - 8}
                      width={32} height={14}
                      rx={3}
                      fill="var(--claude-surface)"
                      stroke="var(--claude-border-light)"
                      strokeWidth={0.5}
                      filter="url(#tooltipShadow)"
                      opacity={0.95}
                    />
                    <text
                      x={(src.x + tgt.x) / 2}
                      y={(src.y + tgt.y) / 2}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="fill-claude-text font-bold pointer-events-none"
                      style={{ fontSize: '8px' }}
                    >
                      {edge.weight}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const pos = positions[node.id];
            if (!pos) return null;
            const isHovered = hoveredNode === node.id;
            const isSelected = selectedNode === node.id;
            const isConnected = connectedNodeIds.has(node.id);
            const isDimmed = selectedNode && !isConnected;
            const r = node.size / 2;
            const nodeOpacity = isDimmed ? 0.15 : 1;

            return (
              <g
                key={node.id}
                onMouseEnter={() => { setHoveredNode(node.id); }}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => onNodeClick(isSelected ? null : node.id)}
                className={isSelected ? 'network-node-pulse' : ''}
                style={{ cursor: 'pointer', opacity: nodeOpacity, transition: 'opacity 0.2s ease' }}
              >
                {/* Pulse ring on selected */}
                {isSelected && (
                  <circle
                    cx={pos.x} cy={pos.y} r={r + 6}
                    fill="none"
                    stroke={node.color}
                    strokeWidth={1.5}
                    opacity={0.6}
                  >
                    <animate attributeName="r" values={`${r + 4};${r + 10};${r + 4}`} dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.6;0.1;0.6" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Hover glow */}
                {isHovered && !isSelected && (
                  <circle
                    cx={pos.x} cy={pos.y} r={r + 4}
                    fill={node.color}
                    opacity={0.12}
                  />
                )}

                {/* Node shape: circle for chains, diamond for ligands */}
                {node.type === 'chain' ? (
                  <circle
                    cx={pos.x} cy={pos.y} r={r}
                    fill={node.color}
                    opacity={0.2}
                    stroke={node.color}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    style={{ transition: 'all 0.2s ease' }}
                    filter={isSelected ? 'url(#nodeGlow)' : undefined}
                  />
                ) : (
                  <rect
                    x={pos.x - r * 0.7}
                    y={pos.y - r * 0.7}
                    width={r * 1.4}
                    height={r * 1.4}
                    fill={node.color}
                    opacity={0.25}
                    stroke={node.color}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    rx={2}
                    transform={`rotate(45, ${pos.x}, ${pos.y})`}
                    style={{ transition: 'all 0.2s ease' }}
                    filter={isSelected ? 'url(#nodeGlow)' : undefined}
                  />
                )}

                {/* Node label */}
                <text
                  x={pos.x} y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-claude-text font-bold font-mono pointer-events-none"
                  style={{ fontSize: node.type === 'ligand' ? '7px' : '9px' }}
                >
                  {node.label}
                </text>

                {/* Tooltip on hover */}
                {isHovered && (
                  <g filter="url(#tooltipShadow)">
                    <rect
                      x={pos.x - 48}
                      y={pos.y - r - 28}
                      width={96} height={22}
                      rx={4}
                      fill="var(--claude-surface)"
                      stroke="var(--claude-border-light)"
                      strokeWidth={0.5}
                      opacity={0.95}
                    />
                    <text
                      x={pos.x}
                      y={pos.y - r - 17}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="fill-claude-text-secondary pointer-events-none"
                      style={{ fontSize: '7px' }}
                    >
                      {node.type === 'chain' ? `Chain ${node.label}` : `Ligand ${node.label}`}
                      {node.residueCount > 0 ? ` · ${node.residueCount} res` : ''}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Legend */}
          <g transform={`translate(8, ${svgH - 34})`}>
            <rect x={-2} y={-4} width={90} height={30} rx={4}
                  fill="var(--claude-surface)" opacity={0.85} stroke="var(--claude-border-light)" strokeWidth={0.5} />
            {/* Chain legend */}
            <circle cx={8} cy={4} r={4} fill="var(--claude-accent)" opacity={0.3} stroke="var(--claude-accent)" strokeWidth={1} />
            <text x={16} y={4} dominantBaseline="central" className="fill-claude-text-muted" style={{ fontSize: '7px' }}>Chain</text>
            {/* Ligand legend */}
            <rect x={4} y={14} width={5.6} height={5.6} rx={1} fill="#d69e2e" opacity={0.3}
                  stroke="#d69e2e" strokeWidth={1} transform="rotate(45, 6.8, 16.8)" />
            <text x={16} y={17} dominantBaseline="central" className="fill-claude-text-muted" style={{ fontSize: '7px' }}>Ligand</text>
            {/* Edge legend */}
            <line x1={50} y1={4} x2={62} y2={4} stroke="var(--claude-accent)" strokeWidth={1.5} opacity={0.5} />
            <text x={65} y={4} dominantBaseline="central" className="fill-claude-text-muted" style={{ fontSize: '7px' }}>Edge</text>
            {/* Distance colors */}
            <circle cx={54} cy={17} r={2.5} fill="#22c55e" />
            <text x={58} y={17} dominantBaseline="central" className="fill-claude-text-muted" style={{ fontSize: '6px' }}>≤3Å</text>
            <circle cx={68} cy={17} r={2.5} fill="#f59e0b" />
            <text x={72} y={17} dominantBaseline="central" className="fill-claude-text-muted" style={{ fontSize: '6px' }}>≤4Å</text>
            <circle cx={82} cy={17} r={2.5} fill="#ef4444" />
            <text x={86} y={17} dominantBaseline="central" className="fill-claude-text-muted" style={{ fontSize: '6px' }}>4Å+</text>
          </g>
        </svg>
      </div>
    </div>
  );
}

// ─── Contact Details Panel ──────────────────────────────────────────────────

function ContactDetailsPanel({
  contacts,
  selectedNode,
  selectedEdgeKey,
  onClose,
}: {
  contacts: ResidueContact[];
  selectedNode: string | null;
  selectedEdgeKey: string | null;
  onClose: () => void;
}) {
  // Get contacts to display
  const displayContacts = useMemo(() => {
    if (selectedEdgeKey) {
      const [c1, c2] = selectedEdgeKey.split('|');
      return contacts.filter(c =>
        (c.chain1 === c1 && c.chain2 === c2) || (c.chain1 === c2 && c.chain2 === c1)
      );
    }
    if (selectedNode) {
      return contacts.filter(c => c.chain1 === selectedNode || c.chain2 === selectedNode);
    }
    return [];
  }, [contacts, selectedNode, selectedEdgeKey]);

  if (!selectedNode && !selectedEdgeKey) return null;

  const title = selectedEdgeKey
    ? `${selectedEdgeKey.replace('|', ' ↔ ')} contacts`
    : `Chain ${selectedNode} contacts`;

  return (
    <div className="mt-2 rounded-md border border-claude-border-light
                    bg-claude-surface/60 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-claude-border-light/50
                      bg-claude-bg/30">
        <div className="flex items-center gap-1.5">
          <MousePointerClick className="w-2.5 h-2.5 text-claude-accent" />
          <span className="text-[8px] font-semibold uppercase tracking-wider text-claude-text-muted">
            {title}
          </span>
          <span className="text-[7px] font-bold px-1 py-px rounded bg-claude-accent-light text-claude-accent">
            {displayContacts.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-0.5 rounded hover:bg-claude-border-light text-claude-text-muted
                     hover:text-claude-text transition-colors"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      </div>

      {/* Contact list */}
      <div className="max-h-36 overflow-y-auto custom-scrollbar">
        {displayContacts.length === 0 ? (
          <div className="px-2 py-2 text-[8px] text-claude-text-muted italic text-center">
            No residue details available
          </div>
        ) : (
          <div className="px-1 py-1 space-y-px">
            {displayContacts.slice(0, 30).map((c, i) => (
              <div
                key={i}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px]
                           hover:bg-claude-bg/50 transition-colors"
              >
                <span className="font-mono font-bold text-claude-text">{c.chain1}</span>
                <span className="font-mono text-claude-text-secondary">{c.residue1}</span>
                <span className="text-claude-text-muted mx-0.5">→</span>
                <span className="font-mono font-bold text-claude-text">{c.chain2}</span>
                <span className="font-mono text-claude-text-secondary">{c.residue2}</span>
                {c.distance > 0 && (
                  <span className={`ml-auto font-mono font-bold flex items-center gap-0.5 ${getDistanceLabelClass(c.distance)}`}>
                    <span className={`w-1 h-1 rounded-full ${getDistanceDotClass(c.distance)}`} />
                    {c.distance}Å
                  </span>
                )}
                {c.type && c.type !== 'contact' && (
                  <span className="text-[6px] px-1 py-px rounded bg-claude-border-light text-claude-text-muted ml-1">
                    {c.type}
                  </span>
                )}
              </div>
            ))}
            {displayContacts.length > 30 && (
              <div className="text-[7px] text-claude-text-muted text-center py-1">
                +{displayContacts.length - 30} more contacts
              </div>
            )}
          </div>
        )}
      </div>

      {/* Distance legend */}
      <div className="flex items-center gap-2 px-2 py-1 border-t border-claude-border-light/50 bg-claude-bg/20">
        <span className="text-[6px] text-claude-text-muted uppercase font-medium">Distance:</span>
        <span className="flex items-center gap-0.5 text-[6px] text-claude-text-muted">
          <span className="w-1.5 h-1.5 rounded-sm bg-green-500" />≤3Å
        </span>
        <span className="flex items-center gap-0.5 text-[6px] text-claude-text-muted">
          <span className="w-1.5 h-1.5 rounded-sm bg-amber-500" />3-4Å
        </span>
        <span className="flex items-center gap-0.5 text-[6px] text-claude-text-muted">
          <span className="w-1.5 h-1.5 rounded-sm bg-red-500" />&gt;4Å
        </span>
      </div>
    </div>
  );
}

// ─── Contacts Section (Enhanced with Network Graph) ─────────────────────────

function getDistanceColor(distance: number): string {
  if (distance < 3.5) return 'text-green-600 dark:text-green-400';
  if (distance < 4.5) return 'text-yellow-600 dark:text-yellow-400';
  if (distance < 5.5) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

function getDistanceBgColor(distance: number): string {
  if (distance < 3.5) return 'bg-green-100 dark:bg-green-900/30';
  if (distance < 4.5) return 'bg-yellow-100 dark:bg-yellow-900/30';
  if (distance < 5.5) return 'bg-orange-100 dark:bg-orange-900/30';
  return 'bg-red-100 dark:bg-red-900/30';
}

export function ContactsSection({ pdbId, entities, ligandCodes, entityColors, ligandColors }: {
  pdbId: string;
  entities: EntityInfo[];
  ligandCodes: string[];
  entityColors: Record<string, string>;
  ligandColors: Record<string, string>;
}) {
  const { data, loading } = useContactsData(pdbId);
  const [expanded, setExpanded] = useState(true);
  const [viewMode, setViewMode] = useState<'network' | 'heatmap' | 'table'>('network');
  const [selection, setSelection] = useState<{ pdbId: string; node: string | null; edgeKey: string | null }>({
    pdbId,
    node: null,
    edgeKey: null,
  });
  // When pdbId changes, the derived values reset automatically
  const selectedNode = selection.pdbId === pdbId ? selection.node : null;
  const selectedEdgeKey = selection.pdbId === pdbId ? selection.edgeKey : null;

  // Group contacts by chain pair
  const groupedContacts = useMemo(() => {
    if (!data?.contacts) return {};
    const groups: Record<string, ResidueContact[]> = {};
    for (const c of data.contacts) {
      if (!c.chain1 || !c.chain2) continue;
      const key = [c.chain1, c.chain2].sort().join('↔');
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    }
    return groups;
  }, [data]);

  const hasData = data && data.contacts && data.contacts.length > 0;

  const handleCloseDetails = useCallback(() => {
    setSelection({ pdbId, node: null, edgeKey: null });
  }, [pdbId]);

  return (
    <div className="border-t border-claude-border">
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <div className="px-3 py-2 flex items-center justify-between">
          <CollapsibleTrigger className="flex items-center gap-1 group btn-press">
            <ChevronDown
              className={`w-3 h-3 text-claude-text-muted transition-transform duration-200
                         ${expanded ? '' : '-rotate-90'}`}
            />
            <Atom className="w-3 h-3 text-claude-accent" />
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-claude-text-muted">
              Residue Contacts
            </h3>
          </CollapsibleTrigger>
          <div className="flex items-center gap-1">
            {!loading && hasData && (
              <>
                {/* View toggle - 3 way: Network | Heatmap | Table */}
                <div className="flex items-center rounded-md border border-claude-border-light overflow-hidden">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setViewMode('network')}
                        className={`p-1 transition-colors ${
                          viewMode === 'network'
                            ? 'bg-claude-accent text-white'
                            : 'bg-claude-bg/50 text-claude-text-muted hover:text-claude-text'
                        }`}
                      >
                        <Network className="w-2.5 h-2.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="bg-claude-surface text-claude-text border border-claude-border shadow-lg">Network</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setViewMode('heatmap')}
                        className={`p-1 transition-colors ${
                          viewMode === 'heatmap'
                            ? 'bg-claude-accent text-white'
                            : 'bg-claude-bg/50 text-claude-text-muted hover:text-claude-text'
                        }`}
                      >
                        <Grid3x3 className="w-2.5 h-2.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="bg-claude-surface text-claude-text border border-claude-border shadow-lg">Heatmap</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setViewMode('table')}
                        className={`p-1 transition-colors ${
                          viewMode === 'table'
                            ? 'bg-claude-accent text-white'
                            : 'bg-claude-bg/50 text-claude-text-muted hover:text-claude-text'
                        }`}
                      >
                        <Table className="w-2.5 h-2.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="bg-claude-surface text-claude-text border border-claude-border shadow-lg">Table</TooltipContent>
                  </Tooltip>
                </div>
                {/* Count badge */}
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded
                                 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400">
                  {data.contacts.length}
                </span>
              </>
            )}
          </div>
        </div>

        <CollapsibleContent>
          <div className="px-3 pb-3">
            {loading ? (
              <div className="space-y-2">
                <div className="w-24 h-2.5 validation-skeleton-enhanced" />
                <div className="flex gap-2">
                  <div className="w-16 h-10 validation-skeleton-enhanced rounded" />
                  <div className="w-16 h-10 validation-skeleton-enhanced rounded" />
                </div>
              </div>
            ) : !hasData ? (
              <div className="text-center py-3">
                <Atom className="w-5 h-5 text-claude-text-muted mx-auto mb-1" />
                <p className="text-[9px] text-claude-text-muted italic">
                  No contact data available
                </p>
              </div>
            ) : viewMode === 'network' ? (
              <div className="space-y-2">
                {/* Interactive Network Graph */}
                <ContactNetworkGraph
                  contacts={data.contacts}
                  entities={entities}
                  ligandCodes={ligandCodes}
                  entityColors={entityColors}
                  ligandColors={ligandColors}
                  pdbId={pdbId}
                  onNodeClick={(nodeId) => {
                    setSelection({ pdbId, node: nodeId, edgeKey: null });
                  }}
                  onEdgeClick={(edgeKey) => {
                    setSelection({ pdbId, node: null, edgeKey });
                  }}
                  selectedNode={selectedNode}
                />

                {/* Contact Details Panel */}
                <ContactDetailsPanel
                  contacts={data.contacts}
                  selectedNode={selectedNode}
                  selectedEdgeKey={selectedEdgeKey}
                  onClose={handleCloseDetails}
                />

                {/* Hint text */}
                {!selectedNode && !selectedEdgeKey && (
                  <div className="flex items-center gap-1 justify-center">
                    <Info className="w-2.5 h-2.5 text-claude-text-muted" />
                    <span className="text-[7px] text-claude-text-muted">
                      Click a node or edge to see contact details
                    </span>
                  </div>
                )}
              </div>
            ) : viewMode === 'heatmap' ? (
              <ResidueHeatmap contacts={data.contacts} entities={entities} />
            ) : (
              <div className="space-y-3">
                {/* Table view - contacts by chain pair */}
                {Object.entries(groupedContacts || {}).map(([pair, contacts]) => (
                  <div key={pair}>
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-[8px] font-semibold uppercase tracking-wider text-claude-text-muted">
                        Chains
                      </span>
                      <span className="text-[9px] font-mono font-bold text-claude-text">
                        {pair}
                      </span>
                      <span className="text-[7px] text-claude-text-muted ml-auto">
                        {contacts.length} contacts
                      </span>
                    </div>
                    <div className="max-h-40 overflow-y-auto custom-scrollbar rounded-md border border-claude-border-light">
                      <table className="w-full text-[8px]">
                        <thead>
                          <tr className="border-b border-claude-border-light bg-claude-bg/50">
                            <th className="text-left px-2 py-1 font-semibold text-claude-text-muted">Residue 1</th>
                            <th className="text-center px-1 py-1 font-semibold text-claude-text-muted w-4" />
                            <th className="text-left px-2 py-1 font-semibold text-claude-text-muted">Residue 2</th>
                            <th className="text-right px-2 py-1 font-semibold text-claude-text-muted">Dist</th>
                          </tr>
                        </thead>
                        <tbody>
                          {contacts.slice(0, 20).map((c, i) => (
                            <tr key={i} className="border-b border-claude-border-light/50 last:border-0 hover:bg-claude-bg/30">
                              <td className="px-2 py-0.5">
                                <span className="font-mono font-bold text-claude-text">{c.chain1}</span>
                                <span className="font-mono text-claude-text-secondary ml-0.5">{c.residue1}</span>
                              </td>
                              <td className="text-center px-1 text-claude-text-muted">↔</td>
                              <td className="px-2 py-0.5">
                                <span className="font-mono font-bold text-claude-text">{c.chain2}</span>
                                <span className="font-mono text-claude-text-secondary ml-0.5">{c.residue2}</span>
                              </td>
                              <td className="px-2 py-0.5 text-right">
                                <span className={`font-mono font-bold px-1 py-px rounded ${getDistanceBgColor(c.distance)} ${getDistanceColor(c.distance)}`}>
                                  {c.distance > 0 ? `${c.distance}Å` : '—'}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {contacts.length > 20 && (
                            <tr>
                              <td colSpan={4} className="px-2 py-1 text-center text-[7px] text-claude-text-muted">
                                +{contacts.length - 20} more contacts
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}

                {/* Distance legend */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[7px] text-claude-text-muted uppercase font-medium">Distance:</span>
                  <span className="flex items-center gap-0.5 text-[7px]"><span className="w-1.5 h-1.5 rounded-sm bg-green-500" />&lt;3.5Å</span>
                  <span className="flex items-center gap-0.5 text-[7px]"><span className="w-1.5 h-1.5 rounded-sm bg-yellow-500" />3.5-4.5Å</span>
                  <span className="flex items-center gap-0.5 text-[7px]"><span className="w-1.5 h-1.5 rounded-sm bg-orange-500" />4.5-5.5Å</span>
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// ─── Similarity Data Cache ─────────────────────────────────────────────────

interface SimilarMember {
  pdbId: string;
  title: string;
  method: string;
  resolution: number | null;
  releaseDate: string;
}

interface SimilarityCluster {
  identity: number;
  clusterId: string;
  members: SimilarMember[];
}

interface SimilarityData {
  pdbId: string;
  clusters: SimilarityCluster[];
}

const similarityCache = new Map<string, SimilarityData | null>();

function useSimilarityData(pdbId: string): {
  data: SimilarityData | null;
  loading: boolean;
} {
  const cached = similarityCache.get(pdbId) ?? null;
  const isCached = similarityCache.has(pdbId);
  const [data, setData] = useState<SimilarityData | null>(cached);
  const [loading, setLoading] = useState(!isCached);

  useEffect(() => {
    if (isCached) return;

    let cancelled = false;

    fetch(`/api/similarity/${pdbId}`)
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        similarityCache.set(pdbId, json || null);
        setData(json || null);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        similarityCache.set(pdbId, null);
        setData(null);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pdbId, isCached]);

  return { data, loading };
}

// ─── Similarity Section ──────────────────────────────────────────────────

export function SimilaritySection({
  pdbId,
  onLoadStructure,
}: {
  pdbId: string;
  onLoadStructure?: (pdbId: string) => void;
}) {
  const { data, loading } = useSimilarityData(pdbId);
  const [expanded, setExpanded] = useState(true);
  const [selectedIdentity, setSelectedIdentity] = useState<number>(90);

  const identityLevels = [30, 50, 70, 90];

  // Find the cluster for the selected identity level
  const activeCluster = data?.clusters.find((c) => c.identity === selectedIdentity);

  // Find which identity levels have data
  const availableIdentities = data?.clusters.map((c) => c.identity) || [];

  // Get method badge class
  function getMethodBadgeClass(method: string): string {
    const m = method.toLowerCase();
    if (m.includes('cryo') || m.includes('electron')) return 'method-badge-cryoem';
    if (m.includes('x-ray') || m.includes('diffraction')) return 'method-badge-xray';
    if (m.includes('nmr')) return 'method-badge-nmr';
    return 'method-badge method-badge-cryoem';
  }

  // Get method label
  function getMethodLabel(method: string): string {
    const m = method.toLowerCase();
    if (m.includes('cryo') || m.includes('electron')) return 'Cryo-EM';
    if (m.includes('x-ray') || m.includes('diffraction')) return 'X-Ray';
    if (m.includes('nmr')) return 'NMR';
    return method.length > 12 ? method.slice(0, 12) + '...' : method;
  }

  // Get resolution badge color
  function getResBadgeClass(resolution: number | null): string {
    if (resolution == null) return 'bg-claude-border-light text-claude-text-muted';
    if (resolution <= 2.0) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (resolution <= 3.5) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  }

  const totalMembers = data?.clusters.reduce((sum, c) => sum + c.members.length, 0) || 0;

  return (
    <div className="border-t border-claude-border">
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <div className="px-3 py-2 flex items-center justify-between">
          <CollapsibleTrigger className="flex items-center gap-1 group btn-press">
            <ChevronDown
              className={`w-3 h-3 text-claude-text-muted transition-transform duration-200
                         ${expanded ? '' : '-rotate-90'}`}
            />
            <Search className="w-3 h-3 text-claude-accent" />
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-claude-text-muted">
              Similar Structures
            </h3>
          </CollapsibleTrigger>
          {!loading && totalMembers > 0 && (
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded
                             bg-claude-accent-light text-claude-accent">
              {totalMembers}
            </span>
          )}
        </div>

        <CollapsibleContent>
          <div className="px-3 pb-3">
            {loading ? (
              /* Loading skeleton */
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="validation-skeleton-enhanced p-3 rounded-lg border border-claude-border-light bg-claude-surface"
                  >
                    <div className="flex items-start gap-2">
                      <div className="w-12 h-3 rounded bg-claude-border-light shimmer" />
                      <div className="w-16 h-3 rounded bg-claude-border-light shimmer" />
                    </div>
                    <div className="w-full h-2.5 rounded bg-claude-border-light shimmer mt-2" />
                    <div className="flex gap-2 mt-1.5">
                      <div className="w-12 h-3 rounded bg-claude-border-light shimmer" />
                      <div className="w-10 h-3 rounded bg-claude-border-light shimmer" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !data || data.clusters.length === 0 ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Search className="w-6 h-6 text-claude-text-muted mb-2" />
                <p className="text-[10px] text-claude-text-muted">
                  No similar structures found at this identity level
                </p>
                <p className="text-[9px] text-claude-text-muted/60 mt-0.5">
                  This structure may not have cluster data available
                </p>
              </div>
            ) : (
              <>
                {/* Cluster identity selector */}
                <div className="flex items-center gap-1 mb-3">
                  <span className="text-[8px] text-claude-text-muted font-medium uppercase tracking-wider mr-1">
                    Identity:
                  </span>
                  {identityLevels.map((level) => {
                    const isAvailable = availableIdentities.includes(level);
                    const isActive = selectedIdentity === level;
                    return (
                      <button
                        key={level}
                        onClick={() => setSelectedIdentity(level)}
                        disabled={!isAvailable}
                        className={`px-2 py-1 text-[9px] font-bold rounded-md transition-all duration-150 btn-press
                                   ${isActive
                                     ? 'bg-claude-accent text-white shadow-sm'
                                     : isAvailable
                                       ? 'bg-claude-border-light text-claude-text-secondary hover:bg-claude-accent-light hover:text-claude-accent cursor-pointer'
                                       : 'bg-claude-border-light/50 text-claude-text-muted/40 cursor-not-allowed'
                                   }`}
                      >
                        {level}%
                      </button>
                    );
                  })}
                </div>

                {/* Results list */}
                <div className="max-h-[280px] overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                  {activeCluster && activeCluster.members.length > 0 ? (
                    activeCluster.members.map((member, idx) => (
                      <div
                        key={member.pdbId}
                        className="glass-panel p-2.5 rounded-lg border border-claude-border-light
                                   hover:border-claude-accent/30 transition-all duration-150
                                   hover-lift-2 table-row-animate cursor-pointer group"
                        style={{ animationDelay: `${idx * 30}ms` }}
                        onClick={() => onLoadStructure?.(member.pdbId)}
                      >
                        <div className="flex items-start gap-2">
                          {/* PDB ID + RCSB link */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-[11px] font-mono font-bold text-claude-text">
                              {member.pdbId}
                            </span>
                            <a
                              href={`https://www.rcsb.org/structure/${member.pdbId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-claude-text-muted
                                         hover:text-claude-accent"
                            title="View on RCSB"
                            >
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        </div>

                        {/* Title */}
                        <p className="text-[9px] text-claude-text-secondary line-clamp-1 mt-0.5 leading-tight">
                          {member.title}
                        </p>

                        {/* Badges row */}
                        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                          {/* Method badge */}
                          <span
                            className={`method-badge text-[7px] px-1 py-px rounded ${getMethodBadgeClass(member.method)}`}
                          >
                            {getMethodLabel(member.method)}
                          </span>

                          {/* Resolution badge */}
                          {member.resolution != null && (
                            <span
                              className={`text-[7px] font-mono font-bold px-1 py-px rounded ${getResBadgeClass(member.resolution)}`}
                            >
                              {member.resolution.toFixed(1)}Å
                            </span>
                          )}

                          {/* Sequence identity badge */}
                          <span className="text-[7px] font-bold px-1 py-px rounded
                                           bg-claude-accent-light text-claude-accent">
                            {activeCluster.identity}% identity
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <Search className="w-5 h-5 text-claude-text-muted mb-1.5" />
                      <p className="text-[10px] text-claude-text-muted">
                        No similar structures found at {selectedIdentity}% identity level
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export function AnnotationsSection({ pdbId, entities, ligandCodes, entityColors, ligandColors }: {
  pdbId: string;
  entities: EntityInfo[];
  ligandCodes: string[];
  entityColors: Record<string, string>;
  ligandColors: Record<string, string>;
}) {
  const { data, loading } = useAnnotationsData(pdbId);
  const { data: contactsData } = useContactsData(pdbId);
  const [expanded, setExpanded] = useState(true);

  const secondaryStructureEntries = data?.secondaryStructure
    ? Object.entries(data.secondaryStructure || {}).map(([chain, ss]) => ({ chain, ...ss }))
    : [];

  const hasData = data && (
    data.bindingSites.length > 0 ||
    data.enzymeClassification.length > 0 ||
    data.diseaseMutations.length > 0 ||
    secondaryStructureEntries.length > 0
  );

  return (
    <div className="border-t border-claude-border">
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <div className="px-3 py-2 flex items-center justify-between">
          <CollapsibleTrigger className="flex items-center gap-1 group btn-press">
            <ChevronDown
              className={`w-3 h-3 text-claude-text-muted transition-transform duration-200
                         ${expanded ? '' : '-rotate-90'}`}
            />
            <Bookmark className="w-3 h-3 text-claude-accent" />
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-claude-text-muted">
              Annotations
            </h3>
          </CollapsibleTrigger>
          {!loading && hasData && (
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded
                             bg-claude-accent-light text-claude-accent">
              {data.bindingSites.length + data.enzymeClassification.length + data.diseaseMutations.length}
            </span>
          )}
        </div>

        <CollapsibleContent>
          <div className="px-3 pb-3">
            {/* Network Graph - shown first for visual impact */}
            {(entities.length > 0 || ligandCodes.length > 0) && (
              <div className="mb-3">
                <div className="flex items-center gap-1 mb-1.5">
                  <Activity className="w-2.5 h-2.5 text-claude-accent" />
                  <span className="text-[8px] font-semibold uppercase tracking-wider text-claude-text-muted">
                    Interaction Network
                  </span>
                </div>
                <NetworkGraph
                  pdbId={pdbId}
                  entities={entities}
                  ligandCodes={ligandCodes}
                  entityColors={entityColors}
                  ligandColors={ligandColors}
                  contacts={contactsData?.contacts}
                  bindingSites={data?.bindingSites}
                />
              </div>
            )}
            {loading ? (
              <div className="space-y-3">
                {/* Skeleton for annotations */}
                <div className="space-y-2">
                  <div className="w-24 h-2.5 validation-skeleton-enhanced" />
                  <div className="flex gap-2">
                    <div className="w-16 h-10 validation-skeleton-enhanced rounded" />
                    <div className="w-16 h-10 validation-skeleton-enhanced rounded" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="w-20 h-2.5 validation-skeleton-enhanced" />
                  <div className="w-full h-8 validation-skeleton-enhanced rounded" />
                </div>
              </div>
            ) : !hasData ? (
              <div className="text-center py-3">
                <Bookmark className="w-5 h-5 text-claude-text-muted mx-auto mb-1" />
                <p className="text-[9px] text-claude-text-muted italic typing-cursor">
                  No annotation data available
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* ─── Binding Sites ──────────────────────────────── */}
                {data.bindingSites.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1 mb-1.5">
                      <Beaker className="w-2.5 h-2.5 text-claude-accent" />
                      <span className="text-[8px] font-semibold uppercase tracking-wider text-claude-text-muted">
                        Binding Sites
                      </span>
                      <span className="text-[8px] font-medium px-1 py-px rounded bg-claude-border-light text-claude-text-secondary ml-auto">
                        {data.bindingSites.length}
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                      {data.bindingSites.map((site, i) => (
                        <div
                          key={i}
                          className="p-2 rounded-md border border-claude-border-light bg-claude-bg/50
                                     hover:border-claude-accent/30 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            {/* Ligand code badge */}
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded
                                           bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                              {site.ligandCode}
                            </span>
                            {/* Site type badge */}
                            <span className={`text-[7px] font-semibold uppercase tracking-wider px-1 py-px rounded
                                            ${SITE_TYPE_COLORS[site.type] || SITE_TYPE_COLORS.other}`}>
                              {site.type}
                            </span>
                          </div>
                          {/* Chain labels */}
                          {site.chains.length > 0 && (
                            <div className="flex items-center gap-1 mb-0.5">
                              <span className="text-[7px] text-claude-text-muted uppercase font-medium">Chains:</span>
                              {site.chains.map((chain) => (
                                <span key={chain} className="text-[8px] font-mono font-bold px-1 py-px rounded bg-claude-border-light text-claude-text">
                                  {chain}
                                </span>
                              ))}
                            </div>
                          )}
                          {/* Residue chips */}
                          {site.residues.length > 0 && (
                            <div className="flex flex-wrap gap-0.5 mt-0.5">
                              {site.residues.slice(0, 12).map((res, j) => (
                                <span key={j} className="text-[7px] font-mono px-1 py-px rounded bg-claude-surface text-claude-text-secondary border border-claude-border-light">
                                  {res}
                                </span>
                              ))}
                              {site.residues.length > 12 && (
                                <span className="text-[7px] text-claude-text-muted">
                                  +{site.residues.length - 12} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ─── Enzyme Classification ─────────────────────── */}
                {data.enzymeClassification.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1 mb-1.5">
                      <Zap className="w-2.5 h-2.5 text-claude-accent" />
                      <span className="text-[8px] font-semibold uppercase tracking-wider text-claude-text-muted">
                        Enzyme Classification
                      </span>
                    </div>
                    <div className="space-y-1">
                      {data.enzymeClassification.map((ec, i) => (
                        <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-claude-bg/50 border border-claude-border-light">
                          {/* EC number badge */}
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded
                                         bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 flex-shrink-0">
                            EC {ec.ecNumber}
                          </span>
                          {/* Enzyme name */}
                          <span className="text-[9px] text-claude-text-secondary truncate">
                            {ec.name}
                          </span>
                          {/* Entity ID reference */}
                          <span className="text-[7px] text-claude-text-muted ml-auto flex-shrink-0">
                            Entity {ec.entityId}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ─── Disease Mutations ──────────────────────────── */}
                {data.diseaseMutations.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1 mb-1.5">
                      <AlertTriangle className="w-2.5 h-2.5 text-red-500" />
                      <span className="text-[8px] font-semibold uppercase tracking-wider text-claude-text-muted">
                        Disease Mutations
                      </span>
                      <span className="text-[8px] font-medium px-1 py-px rounded bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 ml-auto">
                        {data.diseaseMutations.length}
                      </span>
                    </div>
                    <div className="max-h-36 overflow-y-auto custom-scrollbar rounded-md border border-claude-border-light">
                      <table className="w-full text-[8px]">
                        <thead>
                          <tr className="border-b border-claude-border-light bg-claude-bg/50">
                            <th className="text-left px-2 py-1 font-semibold text-claude-text-muted">Chain</th>
                            <th className="text-left px-2 py-1 font-semibold text-claude-text-muted">Position</th>
                            <th className="text-left px-2 py-1 font-semibold text-claude-text-muted">Mutation</th>
                            <th className="text-left px-2 py-1 font-semibold text-claude-text-muted">Disease</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.diseaseMutations.map((mut, i) => (
                            <tr key={i} className="border-b border-claude-border-light/50 last:border-0 hover:bg-claude-bg/30">
                              <td className="px-2 py-0.5 font-mono font-bold text-claude-text">{mut.chain}</td>
                              <td className="px-2 py-0.5 font-mono text-claude-text">{mut.position}</td>
                              <td className="px-2 py-0.5">
                                <span className="font-mono">
                                  <span className="text-claude-text">{mut.wildType}</span>
                                  <span className="text-claude-text-muted mx-0.5">&rarr;</span>
                                  <span className="text-red-600 dark:text-red-400 font-bold">{mut.mutation}</span>
                                </span>
                              </td>
                              <td className="px-2 py-0.5">
                                <span className="text-claude-text-secondary truncate max-w-[100px] inline-block align-bottom">
                                  {mut.disease || 'Unknown'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ─── Secondary Structure Summary ───────────────── */}
                {secondaryStructureEntries.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1 mb-1.5">
                      <Activity className="w-2.5 h-2.5 text-claude-accent" />
                      <span className="text-[8px] font-semibold uppercase tracking-wider text-claude-text-muted">
                        Secondary Structure
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {secondaryStructureEntries.map((ss) => {
                        const coilPct = Math.max(0, 100 - ss.helixPercentage - ss.strandPercentage);
                        return (
                          <div key={ss.chain} className="px-2 py-1.5 rounded-md bg-claude-bg/50 border border-claude-border-light">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[9px] font-mono font-bold text-claude-text">
                                Chain {ss.chain}
                              </span>
                              <div className="flex items-center gap-2 text-[7px] text-claude-text-muted">
                                <span>Helix: {ss.helices}</span>
                                <span>Strand: {ss.strands}</span>
                              </div>
                            </div>
                            {/* Mini bar showing helix/strand/coil percentages */}
                            <div className="flex h-2 rounded-full overflow-hidden bg-claude-border-light">
                              <div
                                className="bg-rose-400 dark:bg-rose-500 transition-all duration-500"
                                style={{ width: `${ss.helixPercentage}%` }}
                                title={`Helix: ${ss.helixPercentage}%`}
                              />
                              <div
                                className="bg-amber-400 dark:bg-amber-500 transition-all duration-500"
                                style={{ width: `${ss.strandPercentage}%` }}
                                title={`Strand: ${ss.strandPercentage}%`}
                              />
                              <div
                                className="bg-gray-300 dark:bg-gray-600 transition-all duration-500"
                                style={{ width: `${coilPct}%` }}
                                title={`Coil: ${coilPct}%`}
                              />
                            </div>
                            {/* Percentage labels */}
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="flex items-center gap-0.5 text-[7px]">
                                <span className="w-1.5 h-1.5 rounded-sm bg-rose-400 dark:bg-rose-500" />
                                <span className="text-claude-text-muted">{ss.helixPercentage}%</span>
                              </span>
                              <span className="flex items-center gap-0.5 text-[7px]">
                                <span className="w-1.5 h-1.5 rounded-sm bg-amber-400 dark:bg-amber-500" />
                                <span className="text-claude-text-muted">{ss.strandPercentage}%</span>
                              </span>
                              <span className="flex items-center gap-0.5 text-[7px]">
                                <span className="w-1.5 h-1.5 rounded-sm bg-gray-300 dark:bg-gray-600" />
                                <span className="text-claude-text-muted">{coilPct}%</span>
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// ─── Summary Section ─────────────────────────────────────────────────────

export function SummarySection({
  entities,
  ligandCodes,
  pdbId,
  onExportAll,
}: {
  entities: EntityInfo[];
  ligandCodes: string[];
  pdbId: string;
  onExportAll?: () => void;
}) {
  // Count entities by type
  let proteinResidues = 0;
  let rnaResidues = 0;
  let dnaResidues = 0;
  let ligandResidues = ligandCodes.length; // Use ligand count as proxy

  for (const entity of entities) {
    const mt = entity.molecule_type.toLowerCase();
    const totalLength = entity.chains.reduce((s, c) => s + (c.length || 0), 0);

    if (mt.includes('polypeptide')) {
      proteinResidues += totalLength;
    } else if (mt.includes('polyribonucleotide') && !mt.includes('polydeoxyribonucleotide')) {
      rnaResidues += totalLength;
    } else if (mt.includes('polydeoxyribonucleotide')) {
      dnaResidues += totalLength;
    }
  }

  // Build segments (filter out zero values)
  const segments: { label: string; value: number; color: string }[] = [];
  if (proteinResidues > 0) segments.push({ label: 'Protein', value: proteinResidues, color: '#3b82f6' });
  if (rnaResidues > 0) segments.push({ label: 'RNA', value: rnaResidues, color: '#f97316' });
  if (dnaResidues > 0) segments.push({ label: 'DNA', value: dnaResidues, color: '#a855f7' });
  if (ligandResidues > 0) segments.push({ label: 'Ligand', value: ligandResidues, color: '#d69e2e' });

  const totalChains = entities.reduce((s, e) => s + e.chains.length, 0);
  const polymerEntities = entities.filter((e) => {
    const mt = e.molecule_type.toLowerCase();
    return mt.includes('polypeptide') || mt.includes('nucleotide');
  }).length;

  return (
    <div className="px-3 py-2 border-t border-claude-border">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-claude-text-muted flex items-center gap-1">
          <PieChart className="w-3 h-3" />
          Summary
        </h3>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        <div className="text-center p-1.5 rounded bg-claude-bg/50 border border-claude-border-light">
          <p className="text-xs font-bold text-claude-text count-tick">{polymerEntities}</p>
          <p className="text-[7px] text-claude-text-muted uppercase">Entities</p>
        </div>
        <div className="text-center p-1.5 rounded bg-claude-bg/50 border border-claude-border-light">
          <p className="text-xs font-bold text-claude-text count-tick">{totalChains}</p>
          <p className="text-[7px] text-claude-text-muted uppercase">Chains</p>
        </div>
        <div className="text-center p-1.5 rounded bg-claude-bg/50 border border-claude-border-light">
          <p className="text-xs font-bold text-claude-text count-tick">{ligandCodes.length}</p>
          <p className="text-[7px] text-claude-text-muted uppercase">Ligands</p>
        </div>
      </div>

      {/* Composition pie chart */}
      {segments.length > 0 && (
        <div className="mb-2">
          <CompositionPieChart segments={segments} />
        </div>
      )}

      {/* Export & Download actions */}
      <div className="flex flex-col gap-1.5">
        {onExportAll && (
          <button
            onClick={onExportAll}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] font-medium
                       text-claude-accent hover:bg-claude-accent-light transition-colors btn-click-ripple
                       border border-claude-border-light w-full"
          >
            <Download className="w-3 h-3" />
            Export All Data (CSV)
          </button>
        )}
        <a
          href={`https://files.rcsb.org/download/${pdbId.toUpperCase()}.cif`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] font-medium
                     text-claude-accent hover:bg-claude-accent-light transition-colors
                     border border-claude-border-light"
        >
          <Download className="w-3 h-3" />
          Download CIF
        </a>
      </div>
    </div>
  );
}

// ─── PDB Timeline Section ────────────────────────────────────────────────

interface PdbMilestone {
  year: number;
  entries: number;
  label: string;
}

const PDB_MILESTONES: PdbMilestone[] = [
  { year: 1971, entries: 7, label: 'First structures' },
  { year: 1977, entries: 50, label: '1MBN Myoglobin' },
  { year: 1990, entries: 500, label: '500 entries' },
  { year: 2000, entries: 13000, label: '13K entries' },
  { year: 2010, entries: 68000, label: '68K entries' },
  { year: 2020, entries: 170000, label: '170K entries' },
  { year: 2024, entries: 220000, label: '220K+ entries' },
];

// Approximate growth data points for the curve
const PDB_GROWTH_DATA: { year: number; entries: number }[] = [
  { year: 1971, entries: 7 },
  { year: 1975, entries: 20 },
  { year: 1980, entries: 100 },
  { year: 1985, entries: 250 },
  { year: 1990, entries: 500 },
  { year: 1995, entries: 3000 },
  { year: 2000, entries: 13000 },
  { year: 2005, entries: 33000 },
  { year: 2010, entries: 68000 },
  { year: 2015, entries: 110000 },
  { year: 2020, entries: 170000 },
  { year: 2022, entries: 195000 },
  { year: 2024, entries: 220000 },
];

export function PdbTimelineSection({ pdbId }: { pdbId: string }) {
  const [expanded, setExpanded] = useState(true);
  const [hoveredMilestone, setHoveredMilestone] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // SVG dimensions
  const width = 260;
  const height = 110;
  const padL = 30;
  const padR = 10;
  const padT = 10;
  const padB = 20;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const currentYear = new Date().getFullYear();
  const yearMin = 1970;
  const yearMax = currentYear + 1;
  const logMin = Math.log10(1);
  const logMax = Math.log10(250000);

  // Scales
  const xScale = (year: number) => padL + ((year - yearMin) / (yearMax - yearMin)) * chartW;
  const yScale = (entries: number) => padT + chartH - ((Math.log10(Math.max(entries, 1)) - logMin) / (logMax - logMin)) * chartH;

  // Build SVG path for the area curve
  const curvePoints = PDB_GROWTH_DATA.map((d) => ({ x: xScale(d.year), y: yScale(d.entries) }));
  const linePath = curvePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${curvePoints[curvePoints.length - 1].x.toFixed(1)} ${padT + chartH} L ${curvePoints[0].x.toFixed(1)} ${padT + chartH} Z`;

  // Release year is fetched from summary API below

  // Use the contacts/summary API to get release year
  const [releaseYear, setReleaseYear] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/summary/${pdbId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return;
        if (json?.releaseDate) {
          const d = json.releaseDate;
          let yr: number | null = null;
          if (typeof d === 'string' && d.length >= 4) {
            yr = parseInt(d.substring(0, 4), 10);
          }
          if (yr && yr >= 1971 && yr <= currentYear) {
            setReleaseYear(yr);
          }
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [pdbId, currentYear]);

  // Y-axis ticks (log scale)
  const yTicks = [1, 10, 100, 1000, 10000, 100000, 220000];
  // X-axis ticks
  const xTicks = [1970, 1980, 1990, 2000, 2010, 2020];

  const handleMilestoneHover = (idx: number, e: React.MouseEvent<SVGCircleElement>) => {
    setHoveredMilestone(idx);
    const svg = (e.target as SVGElement).closest('svg');
    if (svg) {
      const rect = svg.getBoundingClientRect();
      const pt = (e.target as SVGCircleElement);
      const ctm = pt.getScreenCTM();
      if (ctm) {
        setTooltipPos({
          x: ctm.e - rect.left,
          y: ctm.f - rect.top - 10,
        });
      }
    }
  };

  return (
    <div className="border-t border-claude-border">
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <div className="px-3 py-2 flex items-center justify-between">
          <CollapsibleTrigger className="flex items-center gap-1 group btn-press">
            <ChevronDown
              className={`w-3 h-3 text-claude-text-muted transition-transform duration-200
                         ${expanded ? '' : '-rotate-90'}`}
            />
            <TrendingUp className="w-3 h-3 text-claude-accent" />
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-claude-text-muted">
              PDB Timeline
            </h3>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <div className="px-3 pb-3">
            <div className="glass-panel rounded-md p-2 relative">
              <svg
                viewBox={`0 0 ${width} ${height}`}
                width="100%"
                style={{ maxWidth: width }}
                className="overflow-visible"
              >
                <defs>
                  <linearGradient id="pdb-timeline-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--claude-accent)" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="var(--claude-accent)" stopOpacity="0.05" />
                  </linearGradient>
                  <filter id="timeline-glow">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Y-axis labels */}
                {yTicks.map((v) => (
                  <g key={v}>
                    <line
                      x1={padL}
                      y1={yScale(v)}
                      x2={padL + chartW}
                      y2={yScale(v)}
                      stroke="var(--claude-border-light)"
                      strokeWidth="0.5"
                      strokeDasharray="2,2"
                    />
                    <text
                      x={padL - 3}
                      y={yScale(v) + 2}
                      textAnchor="end"
                      fontSize="5"
                      fill="var(--claude-text-muted)"
                      fontFamily="var(--font-geist-mono), monospace"
                    >
                      {v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
                    </text>
                  </g>
                ))}

                {/* X-axis labels */}
                {xTicks.map((yr) => (
                  <text
                    key={yr}
                    x={xScale(yr)}
                    y={padT + chartH + 12}
                    textAnchor="middle"
                    fontSize="5"
                    fill="var(--claude-text-muted)"
                    fontFamily="var(--font-geist-mono), monospace"
                  >
                    {yr}
                  </text>
                ))}

                {/* Area fill */}
                <path
                  d={areaPath}
                  fill="url(#pdb-timeline-gradient)"
                />

                {/* Curve line */}
                <path
                  d={linePath}
                  fill="none"
                  stroke="var(--claude-accent)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Current entry release year vertical line */}
                {releaseYear && (
                  <line
                    x1={xScale(releaseYear)}
                    y1={padT}
                    x2={xScale(releaseYear)}
                    y2={padT + chartH}
                    stroke="var(--claude-accent)"
                    strokeWidth="1"
                    strokeDasharray="3,2"
                    opacity="0.7"
                  />
                )}
                {releaseYear && (
                  <text
                    x={xScale(releaseYear)}
                    y={padT - 2}
                    textAnchor="middle"
                    fontSize="4.5"
                    fill="var(--claude-accent)"
                    fontWeight="bold"
                    fontFamily="var(--font-geist-mono), monospace"
                  >
                    {pdbId.toUpperCase()} {releaseYear}
                  </text>
                )}

                {/* Milestone dots */}
                {PDB_MILESTONES.map((m, idx) => (
                  <circle
                    key={m.year}
                    cx={xScale(m.year)}
                    cy={yScale(m.entries)}
                    r="2.5"
                    fill="var(--claude-accent)"
                    stroke="var(--claude-surface)"
                    strokeWidth="1"
                    className="cursor-pointer"
                    onMouseEnter={(e) => handleMilestoneHover(idx, e)}
                    onMouseLeave={() => { setHoveredMilestone(null); setTooltipPos(null); }}
                  >
                    <animate
                      attributeName="r"
                      values="2.5;3;2.5"
                      dur="3s"
                      begin={`${idx * 0.4}s`}
                      repeatCount="indefinite"
                    />
                  </circle>
                ))}
              </svg>

              {/* Tooltip */}
              {hoveredMilestone !== null && tooltipPos && (
                <div
                  className="absolute z-10 px-2 py-1 rounded text-[8px] font-medium pointer-events-none
                             bg-claude-surface border border-claude-border shadow-md"
                  style={{
                    left: tooltipPos.x,
                    top: tooltipPos.y - 30,
                    transform: 'translateX(-50%)',
                  }}
                >
                  <span className="font-bold text-claude-accent">{PDB_MILESTONES[hoveredMilestone].year}</span>
                  {' · '}
                  <span className="text-claude-text">{PDB_MILESTONES[hoveredMilestone].entries.toLocaleString()}</span>
                  {' entries'}
                  <br />
                  <span className="text-claude-text-muted">{PDB_MILESTONES[hoveredMilestone].label}</span>
                </div>
              )}
            </div>

            {/* Milestone labels below chart */}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 px-1">
              {PDB_MILESTONES.map((m) => (
                <span key={m.year} className="text-[6px] text-claude-text-muted">
                  <span className="font-bold text-claude-accent">{m.year}</span> {m.entries >= 1000 ? `${(m.entries / 1000).toFixed(0)}K` : m.entries}
                </span>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// ─── Residue Interaction Heatmap ──────────────────────────────────────────

function ResidueHeatmap({
  contacts,
  entities,
}: {
  contacts: ResidueContact[];
  entities: EntityInfo[];
}) {
  // Extract unique chains from contacts
  const chains = useMemo(() => {
    const chainSet = new Set<string>();
    for (const c of contacts) {
      if (c.chain1) chainSet.add(c.chain1);
      if (c.chain2) chainSet.add(c.chain2);
    }
    return Array.from(chainSet).sort();
  }, [contacts]);

  const [chainA, setChainA] = useState(chains[0] || '');
  const [chainB, setChainB] = useState(chains.length > 1 ? chains[1] : chains[0] || '');
  const [hoveredCell, setHoveredCell] = useState<{ r1: string; r2: string; dist: number; chain1: string; chain2: string } | null>(null);

  // Update chains when the chains list changes (useMemo-driven)
  const effectiveChainA = chains.includes(chainA) ? chainA : (chains[0] || '');
  const effectiveChainB = chains.includes(chainB) ? chainB : (chains.length > 1 ? chains[1] : chains[0] || '');

  // Filter contacts for selected chain pair
  const pairContacts = useMemo(() => {
    return contacts.filter((c) => {
      return (c.chain1 === effectiveChainA && c.chain2 === effectiveChainB) || (c.chain1 === effectiveChainB && c.chain2 === effectiveChainA);
    });
  }, [contacts, effectiveChainA, effectiveChainB]);

  // Build residue lists and matrix
  const { residuesA, residuesB, matrix } = useMemo(() => {
    const resASet = new Set<string>();
    const resBSet = new Set<string>();
    for (const c of pairContacts) {
      if (c.chain1 === effectiveChainA) {
        resASet.add(c.residue1);
        resBSet.add(c.residue2);
      } else {
        resASet.add(c.residue2);
        resBSet.add(c.residue1);
      }
    }

    const resA = Array.from(resASet).sort((a, b) => {
      const na = parseInt(a, 10);
      const nb = parseInt(b, 10);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });
    const resB = Array.from(resBSet).sort((a, b) => {
      const na = parseInt(a, 10);
      const nb = parseInt(b, 10);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });

    // Build distance matrix: matrix[resA_idx][resB_idx] = distance
    const mat: (number | null)[][] = resA.map(() => resB.map(() => null));
    for (const c of pairContacts) {
      let rA: string;
      let rB: string;
      if (c.chain1 === effectiveChainA) {
        rA = c.residue1;
        rB = c.residue2;
      } else {
        rA = c.residue2;
        rB = c.residue1;
      }
      const iA = resA.indexOf(rA);
      const iB = resB.indexOf(rB);
      if (iA >= 0 && iB >= 0) {
        const existing = mat[iA][iB];
        if (existing === null || c.distance < existing) {
          mat[iA][iB] = c.distance;
        }
      }
    }

    return { residuesA: resA, residuesB: resB, matrix: mat };
  }, [pairContacts, effectiveChainA, effectiveChainB]);

  const getCellColor = (dist: number | null): string => {
    if (dist === null) return 'transparent';
    if (dist < 3.5) return '#ef4444';
    if (dist < 5) return '#f97316';
    if (dist < 7) return '#eab308';
    return 'var(--claude-border-light)';
  };

  const getCellOpacity = (dist: number | null): number => {
    if (dist === null) return 0;
    if (dist < 3.5) return 0.9;
    if (dist < 5) return 0.7;
    if (dist < 7) return 0.5;
    return 0.3;
  };

  // Heatmap SVG dimensions
  const cellSize = Math.min(8, Math.max(3, 200 / Math.max(residuesA.length, residuesB.length, 1)));
  const svgW = Math.min(220, residuesB.length * cellSize + 40);
  const svgH = Math.min(220, residuesA.length * cellSize + 40);
  const labelArea = 30;

  // Label every Nth residue
  const labelEvery = Math.max(1, Math.floor(Math.max(residuesA.length, residuesB.length) / 8));

  if (pairContacts.length === 0) {
    return (
      <div className="text-center py-3">
        <Grid3x3 className="w-5 h-5 text-claude-text-muted mx-auto mb-1" />
        <p className="text-[9px] text-claude-text-muted italic">
          No contacts between Chain {effectiveChainA} and Chain {effectiveChainB}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Chain selectors */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <span className="text-[7px] text-claude-text-muted uppercase font-medium">Chain:</span>
          <select
            value={effectiveChainA}
            onChange={(e) => setChainA(e.target.value)}
            className="text-[8px] font-mono font-bold bg-claude-bg border border-claude-border-light rounded px-1 py-0.5
                       text-claude-text focus:outline-none focus:ring-1 focus:ring-claude-accent/40"
          >
            {chains.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <span className="text-[8px] text-claude-text-muted">↔</span>
        <select
          value={effectiveChainB}
          onChange={(e) => setChainB(e.target.value)}
          className="text-[8px] font-mono font-bold bg-claude-bg border border-claude-border-light rounded px-1 py-0.5
                     text-claude-text focus:outline-none focus:ring-1 focus:ring-claude-accent/40"
        >
          {chains.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <span className="text-[7px] text-claude-text-muted ml-auto">
          {pairContacts.length} contacts
        </span>
      </div>

      {/* Heatmap grid */}
      <div className="glass-panel rounded-md p-2 relative overflow-x-auto custom-scrollbar">
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          width="100%"
          style={{ maxWidth: svgW }}
          className="overflow-visible"
        >
          {/* Y-axis residue labels (Chain A) */}
          {residuesA.map((r, i) => (
            i % labelEvery === 0 && (
              <text
                key={r}
                x={labelArea - 2}
                y={labelArea + i * cellSize + cellSize / 2 + 2}
                textAnchor="end"
                fontSize={Math.min(5, cellSize * 0.7)}
                fill="var(--claude-text-muted)"
                fontFamily="var(--font-geist-mono), monospace"
              >
                {r}
              </text>
            )
          ))}

          {/* X-axis residue labels (Chain B) */}
          {residuesB.map((r, j) => (
            j % labelEvery === 0 && (
              <text
                key={r}
                x={labelArea + j * cellSize + cellSize / 2}
                y={labelArea - 3}
                textAnchor="middle"
                fontSize={Math.min(5, cellSize * 0.7)}
                fill="var(--claude-text-muted)"
                fontFamily="var(--font-geist-mono), monospace"
              >
                {r}
              </text>
            )
          ))}

          {/* Chain labels */}
          <text
            x={labelArea + (residuesB.length * cellSize) / 2}
            y={8}
            textAnchor="middle"
            fontSize="5"
            fontWeight="bold"
            fill="var(--claude-accent)"
            fontFamily="var(--font-geist-mono), monospace"
          >
            Chain {effectiveChainB}
          </text>
          <text
            x={4}
            y={labelArea + (residuesA.length * cellSize) / 2}
            textAnchor="middle"
            fontSize="5"
            fontWeight="bold"
            fill="var(--claude-accent)"
            fontFamily="var(--font-geist-mono), monospace"
            transform={`rotate(-90, 4, ${labelArea + (residuesA.length * cellSize) / 2})`}
          >
            Chain {effectiveChainA}
          </text>

          {/* Grid cells */}
          {matrix.map((row, i) =>
            row.map((dist, j) => {
              if (dist === null) return null;
              return (
                <rect
                  key={`${i}-${j}`}
                  x={labelArea + j * cellSize}
                  y={labelArea + i * cellSize}
                  width={cellSize - 0.5}
                  height={cellSize - 0.5}
                  rx={cellSize > 4 ? 1 : 0}
                  fill={getCellColor(dist)}
                  opacity={getCellOpacity(dist)}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredCell({
                    r1: residuesA[i],
                    r2: residuesB[j],
                    dist,
                    chain1: effectiveChainA,
                    chain2: effectiveChainB,
                  })}
                  onMouseLeave={() => setHoveredCell(null)}
                />
              );
            })
          )}
        </svg>

        {/* Tooltip */}
        {hoveredCell && (
          <div
            className="absolute z-10 px-2 py-1 rounded text-[8px] font-mono pointer-events-none
                       bg-claude-surface border border-claude-border shadow-md whitespace-nowrap"
            style={{ top: 8, right: 8 }}
          >
            <span className="font-bold text-claude-accent">{hoveredCell.chain1}</span>
            <span className="text-claude-text">:{hoveredCell.r1}</span>
            <span className="text-claude-text-muted"> → </span>
            <span className="font-bold text-claude-accent">{hoveredCell.chain2}</span>
            <span className="text-claude-text">:{hoveredCell.r2}</span>
            <span className="ml-1 text-claude-text-secondary">({hoveredCell.dist.toFixed(1)}Å)</span>
          </div>
        )}
      </div>

      {/* Color legend */}
      <div className="flex items-center gap-2">
        <span className="text-[7px] text-claude-text-muted uppercase font-medium">Distance:</span>
        <span className="flex items-center gap-0.5 text-[7px]">
          <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: '#ef4444', opacity: 0.9 }} />
          &lt;3.5Å
        </span>
        <span className="flex items-center gap-0.5 text-[7px]">
          <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: '#f97316', opacity: 0.7 }} />
          3.5-5Å
        </span>
        <span className="flex items-center gap-0.5 text-[7px]">
          <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: '#eab308', opacity: 0.5 }} />
          5-7Å
        </span>
      </div>
    </div>
  );
}

// ─── Quick Actions Toolbar ────────────────────────────────────────────────

// Distinct colors for different chains — palette order matches default MoleculeViewer assignment
const DEFAULT_ENTITY_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
];
const DEFAULT_LIGAND_COLOR = '#d69e2e';
const DEFAULT_LIGAND_COLORS = [
  '#d69e2e', '#e53e3e', '#805ad5', '#00b5d8', '#d53f8c',
  '#38a169', '#dd6b20', '#3182ce', '#718096', '#f6e05e',
];

function QuickActionsToolbar({
  pdbId,
  ligandCodes,
  ligandVisibility,
  onLigandVisibilityChange,
  entityColors,
  ligandColors,
  onEntityColorChange,
  onLigandColorChange,
  expandedEntities,
  setExpandedEntities,
  displayEntities,
}: {
  pdbId: string;
  ligandCodes: string[];
  ligandVisibility: Record<string, boolean>;
  onLigandVisibilityChange: (code: string, visible: boolean) => void;
  entityColors: Record<string, string>;
  ligandColors: Record<string, string>;
  onEntityColorChange: (key: string, color: string) => void;
  onLigandColorChange: (code: string, color: string) => void;
  expandedEntities: Set<number>;
  setExpandedEntities: React.Dispatch<React.SetStateAction<Set<number>>>;
  displayEntities: EntityInfo[];
}) {
  const allLigandsVisible = ligandCodes.every(c => ligandVisibility[c] !== false);
  const allExpanded = displayEntities.every(e => expandedEntities.has(e.entity_id));

  const handleResetColors = useCallback(() => {
    // Reset entity colors for ALL chains (not just those already in entityColors)
    let idx = 0;
    for (const entity of displayEntities) {
      for (const chain of entity.chains) {
        const entityKey = `${pdbId}.${chain.chain}`;
        onEntityColorChange(entityKey, DEFAULT_ENTITY_COLORS[idx % DEFAULT_ENTITY_COLORS.length]);
        idx++;
      }
    }
    // Reset ligand colors
    ligandCodes.forEach((code, i) => {
      onLigandColorChange(code, DEFAULT_LIGAND_COLORS[i % DEFAULT_LIGAND_COLORS.length]);
    });
  }, [displayEntities, ligandCodes, onEntityColorChange, onLigandColorChange, pdbId]);

  const handleToggleAllLigands = useCallback(() => {
    const newVisible = !allLigandsVisible;
    ligandCodes.forEach((code) => {
      onLigandVisibilityChange(code, newVisible);
    });
  }, [allLigandsVisible, ligandCodes, onLigandVisibilityChange]);

  const handleToggleAllExpanded = useCallback(() => {
    if (allExpanded) {
      setExpandedEntities(new Set());
    } else {
      setExpandedEntities(new Set(displayEntities.map(e => e.entity_id)));
    }
  }, [allExpanded, displayEntities, setExpandedEntities]);

  return (
    <div className="flex items-center gap-1 mb-2">
      {/* Reset all colors */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleResetColors}
            className="p-1.5 rounded text-claude-text-muted hover:text-claude-accent
                       hover:bg-claude-accent-light transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center"
            title="Reset all colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-claude-surface text-claude-text border border-claude-border shadow-lg text-[9px]">
          Reset all colors to defaults
        </TooltipContent>
      </Tooltip>

      {/* Show/Hide all ligands */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleToggleAllLigands}
            className="p-1.5 rounded text-claude-text-muted hover:text-claude-accent
                       hover:bg-claude-accent-light transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center"
            title={allLigandsVisible ? 'Hide all ligands' : 'Show all ligands'}
          >
            {allLigandsVisible ? <Layers className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-claude-surface text-claude-text border border-claude-border shadow-lg text-[9px]">
          {allLigandsVisible ? 'Hide all ligands' : 'Show all ligands'}
        </TooltipContent>
      </Tooltip>

      {/* Expand/Collapse all sections */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleToggleAllExpanded}
            className="p-1.5 rounded text-claude-text-muted hover:text-claude-accent
                       hover:bg-claude-accent-light transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center"
            title={allExpanded ? 'Collapse all sections' : 'Expand all sections'}
          >
            {allExpanded ? <FoldVertical className="w-3.5 h-3.5" /> : <UnfoldVertical className="w-3.5 h-3.5" />}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-claude-surface text-claude-text border border-claude-border shadow-lg text-[9px]">
          {allExpanded ? 'Collapse all sections' : 'Expand all sections'}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

// ─── Quality Score Badge ──────────────────────────────────────────────────

function QualityScoreBadge({ pdbId }: { pdbId: string }) {
  const { data } = useValidationData(pdbId);

  if (!data || data.molprobity_score == null) return null;

  const level = getQualityLevel(data.molprobity_score);
  const bgClass = level === 'high' ? 'bg-green-100 dark:bg-green-900/40'
    : level === 'medium' ? 'bg-amber-100 dark:bg-amber-900/40'
    : 'bg-red-100 dark:bg-red-900/40';
  const textClass = level === 'high' ? 'text-green-700 dark:text-green-300'
    : level === 'medium' ? 'text-amber-700 dark:text-amber-300'
    : 'text-red-700 dark:text-red-300';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`inline-flex items-center px-1.5 py-0.5 text-[8px] font-bold rounded ${bgClass} ${textClass}`}>
          {data.molprobity_score.toFixed(1)}
          {level === 'high' ? ' ✓' : level === 'medium' ? ' ⚠' : ' ✗'}
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="bg-claude-surface text-claude-text border border-claude-border shadow-lg text-[9px]">
        MolProbity Score: {data.molprobity_score.toFixed(2)} — {level === 'high' ? 'High Quality' : level === 'medium' ? 'Medium Quality' : 'Low Quality'}
      </TooltipContent>
    </Tooltip>
  );
}

// ─── Trend Arrow for Metrics ──────────────────────────────────────────────

function TrendArrow({ direction }: { direction: 'up' | 'down' | 'stable' }) {
  if (direction === 'up') return <ArrowUpRight className="w-2.5 h-2.5 text-green-500" />;
  if (direction === 'down') return <ArrowDownRight className="w-2.5 h-2.5 text-red-500" />;
  return <ArrowRight className="w-2.5 h-2.5 text-claude-text-muted" />;
}

// ─── Chain Summary Bar ─────────────────────────────────────────────────────

function ChainSummaryBar({
  entities,
  pdbId,
  entityColors,
  onEntityClick,
}: {
  entities: EntityInfo[];
  pdbId: string;
  entityColors: Record<string, string>;
  onEntityClick: (entityKey: string) => void;
}) {
  // Build chain segments with their colors and residue counts
  const segments: { chain: string; color: string; residueCount: number; entityKey: string; description: string }[] = [];
  for (const entity of entities) {
    for (const chain of entity.chains) {
      const entityKey = `${pdbId}.${chain.chain}`;
      const color = entityColors[entityKey] || '#718096';
      segments.push({
        chain: chain.chain,
        color,
        residueCount: chain.length ?? 50,
        entityKey,
        description: entity.description || `Chain ${chain.chain}`,
      });
    }
  }

  const totalResidues = segments.reduce((sum, s) => sum + s.residueCount, 0);
  if (totalResidues === 0 || segments.length === 0) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="chain-summary-bar">
          {segments.map((seg) => {
            const widthPct = Math.max(2, (seg.residueCount / totalResidues) * 100);
            return (
              <div
                key={seg.chain}
                className="chain-summary-segment"
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: seg.color,
                }}
                onClick={() => onEntityClick(seg.entityKey)}
                title={`Chain ${seg.chain}: ${seg.description} (${seg.residueCount} residues)`}
              >
                {seg.chain}
              </div>
            );
          })}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="bg-claude-surface text-claude-text border border-claude-border shadow-lg text-[9px]">
        Click a segment to focus that chain in 3D. Hover to expand.
      </TooltipContent>
    </Tooltip>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────

export function EntityPanel({
  pdbId,
  entities,
  ligandCodes,
  entityColors,
  ligandColors,
  ligandVisibility,
  selectedEntity,
  selectedLigand,
  hoveredEntity,
  hoveredLigand,
  onEntityClick,
  onEntityHover,
  onEntityColorChange,
  onLigandClick,
  onLigandHover,
  onLigandColorChange,
  onLigandVisibilityChange,
  onLigandFocus,
  onSoloLigand,
  onResetView,
  soloLigand,
  representation,
  onRepresentationChange,
  onExportLigands,
  onExportAll,
  onLoadStructure,
  onResidueRangeSelect,
  hoveredEntityFrom3D,
  hoveredLigandFrom3D,
  onFocusIn3D,
  onOpenColorPicker,
  onDeselect,
  entityVisibility,
  soloEntity,
  onEntityVisibilityChange,
  onEntityFocus,
  onSoloEntity,
  onResidueClick,
  collapsed: initialCollapsed,
}: EntityPanelProps) {
  const [collapsed, setCollapsedState] = useState(initialCollapsed ?? true);
  const setCollapsed = setCollapsedState;
  const [colorPickerTarget, setColorPickerTarget] = useState<{
    type: 'entity' | 'ligand';
    key: string;
  } | null>(null);
  const [entitySearchQuery, setEntitySearchQuery] = useState('');

  // Count polymer entities (exclude ligands and water)
  const polymerEntities = entities.filter((e) => {
    const mt = e.molecule_type.toLowerCase();
    return (
      !mt.includes('water') &&
      !mt.includes('bound') &&
      mt !== 'non-polymer'
    );
  });

  // Filtered entities for display (exclude water and ligand-like entities)
  const displayEntities = entities.filter((e) => {
    const mt = e.molecule_type.toLowerCase();
    if (mt.includes('water')) return false;
    if (mt.includes('bound') || mt === 'non-polymer') return false;
    return true;
  });

  // Search-filtered entities
  const filteredDisplayEntities = entitySearchQuery.trim()
    ? displayEntities.filter((e) => {
        const q = entitySearchQuery.toLowerCase();
        const matchDesc = e.description?.toLowerCase().includes(q);
        const matchChain = e.chains.some(c => c.chain.toLowerCase().includes(q) || c.asym_id.toLowerCase().includes(q));
        const matchOrg = e.organism?.toLowerCase().includes(q);
        const matchGene = e.gene_name?.toLowerCase().includes(q);
        const matchType = e.molecule_type?.toLowerCase().includes(q);
        return matchDesc || matchChain || matchOrg || matchGene || matchType;
      })
    : displayEntities;

  // Initialize all entities as expanded
  const initialExpanded = useMemo(() => {
    return new Set(entities.filter((e) => {
      const mt = e.molecule_type.toLowerCase();
      return !mt.includes('water') && !mt.includes('bound') && mt !== 'non-polymer';
    }).map((e) => e.entity_id));
  }, [entities]);
  const [expandedEntities, setExpandedEntities] = useState<Set<number>>(initialExpanded);

  // Track which entities have sequence shown
  const [showSequence, setShowSequence] = useState<Set<number>>(new Set());

  // Helper: show sequence for a specific entity (used by peptide ligand "Show in Sequence")
  const setShowSequenceForEntity = useCallback((entityId: number) => {
    setShowSequence((prev) => {
      const next = new Set(prev);
      if (next.has(entityId)) {
        // Already shown - do nothing (keep it visible)
      } else {
        next.add(entityId);
      }
      return next;
    });
  }, []);

  // Sync when displayEntities changes and current set is stale
  if (displayEntities.length > 0 && expandedEntities.size === 0) {
    setExpandedEntities(initialExpanded);
  }

  // Fetch sequence data
  const { sequences, loading: sequencesLoading } = useSequenceData(pdbId);

  const handleColorDotClick = useCallback(
    (e: React.MouseEvent, type: 'entity' | 'ligand', key: string) => {
      e.stopPropagation();
      setColorPickerTarget((prev) => {
        if (prev && prev.type === type && prev.key === key) return null;
        return { type, key };
      });
    },
    []
  );

  const closeColorPicker = useCallback(() => {
    setColorPickerTarget(null);
  }, []);

  const toggleEntityExpanded = useCallback((entityId: number) => {
    setExpandedEntities((prev) => {
      const next = new Set(prev);
      if (next.has(entityId)) {
        next.delete(entityId);
      } else {
        next.add(entityId);
      }
      return next;
    });
  }, []);

  // ─── Auto-scroll and expand on selection from 3D viewer ───────────────
  const toggleEntityExpandedRef = useRef(toggleEntityExpanded);
  const displayEntitiesRef = useRef(displayEntities);
  const expandedEntitiesRef = useRef(expandedEntities);

  useEffect(() => {
    toggleEntityExpandedRef.current = toggleEntityExpanded;
    displayEntitiesRef.current = displayEntities;
    expandedEntitiesRef.current = expandedEntities;
  }); // update refs in effect

  // Auto-scroll and expand on selection from 3D viewer (or panel)
  useEffect(() => {
    if (!selectedEntity) return;
    const chainId = selectedEntity.split('.')[1];
    if (!chainId) return;

    const de = displayEntitiesRef.current;
    const matchingEntity = de.find((e) =>
      e.chains.some((c) => c.chain === chainId)
    );
    if (matchingEntity) {
      const ee = expandedEntitiesRef.current;
      if (!ee.has(matchingEntity.entity_id)) {
        toggleEntityExpandedRef.current(matchingEntity.entity_id);
      }
      setTimeout(() => {
        // Try data-entity-key first, fallback to id-based lookup
        let el = document.querySelector(`[data-entity-key="${selectedEntity}"]`);
        if (!el) {
          el = document.getElementById(`entity-row-${matchingEntity.entity_id}`);
        }
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          // Add pulse animation class
          el.classList.add('selection-pulse-highlight');
          setTimeout(() => el?.classList.remove('selection-pulse-highlight'), 1500);
        }
      }, 150);
    }
  }, [selectedEntity]);

  // Auto-scroll to selected ligand
  useEffect(() => {
    if (!selectedLigand) return;
    setTimeout(() => {
      // Try data-ligand-code first, fallback to id-based lookup
      let el = document.querySelector(`[data-ligand-code="${selectedLigand}"]`);
      if (!el) {
        el = document.getElementById(`ligand-row-${selectedLigand}`);
      }
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        // Add pulse animation class
        el.classList.add('selection-pulse-highlight');
        setTimeout(() => el?.classList.remove('selection-pulse-highlight'), 1500);
      }
    }, 150);
  }, [selectedLigand]);

  // ─── Auto-scroll on hover from 3D viewer ───────────────────────────────
  // Only auto-scroll when the hover originates from the 3D viewer,
  // not when the user is hovering directly in the entity panel.
  useEffect(() => {
    if (!hoveredEntity || !hoveredEntityFrom3D) return;
    const chainId = hoveredEntity.split('.')[1];
    if (!chainId) return;

    const de = displayEntitiesRef.current;
    const matchingEntity = de.find((e) =>
      e.chains.some((c) => c.chain === chainId)
    );
    if (matchingEntity) {
      const ee = expandedEntitiesRef.current;
      if (!ee.has(matchingEntity.entity_id)) {
        toggleEntityExpandedRef.current(matchingEntity.entity_id);
      }
      setTimeout(() => {
        const el = document.querySelector(`[data-entity-key="${hoveredEntity}"]`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    }
  }, [hoveredEntity, hoveredEntityFrom3D]);

  // Auto-scroll on ligand hover from 3D viewer
  useEffect(() => {
    if (!hoveredLigand || !hoveredLigandFrom3D) return;
    setTimeout(() => {
      const el = document.querySelector(`[data-ligand-code="${hoveredLigand}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  }, [hoveredLigand, hoveredLigandFrom3D]);

  // ─── Auto-expand collapsed entity when hovered from 3D ────────────────
  // Use ref-based approach to avoid lint error from setState in effect
  const autoExpandFor3DHover = useCallback((entityId: number) => {
    setExpandedEntities((prev) => {
      if (prev.has(entityId)) return prev;
      const next = new Set(prev);
      next.add(entityId);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!hoveredEntity || !hoveredEntityFrom3D) return;
    const chainId = hoveredEntity.split('.')[1];
    if (!chainId) return;

    const de = displayEntitiesRef.current;
    const matchingEntity = de.find((e) =>
      e.chains.some((c) => c.chain === chainId)
    );
    if (matchingEntity) {
      autoExpandFor3DHover(matchingEntity.entity_id);
    }
  }, [hoveredEntity, hoveredEntityFrom3D, autoExpandFor3DHover]);

  const toggleShowSequence = useCallback((entityId: number) => {
    setShowSequence((prev) => {
      const next = new Set(prev);
      if (next.has(entityId)) {
        next.delete(entityId);
      } else {
        next.add(entityId);
      }
      return next;
    });
  }, []);

  // Close color picker on Escape
  useEffect(() => {
    if (!colorPickerTarget) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeColorPicker();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [colorPickerTarget, closeColorPicker]);

  return (
    <div
      className={`flex flex-col h-full bg-claude-surface border-l border-claude-border
                  transition-all duration-200 ease-in-out relative
                  ${collapsed ? 'w-12' : 'w-[280px] min-w-[280px]'}`}
    >
      {/* ─── Collapse Toggle ─────────────────────────────────────── */}
      <button
        onClick={() => setCollapsedState((c) => !c)}
        className="absolute -left-5 top-3 z-20 w-5 h-9 flex items-center justify-center
                   bg-claude-surface border border-claude-border border-r-0 rounded-l-md
                   text-claude-text-muted hover:text-claude-accent hover:bg-claude-accent-light
                   transition-colors"
        title={collapsed ? 'Expand panel' : 'Collapse panel'}
      >
        {collapsed ? (
          <ChevronLeft className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
      </button>

      {/* ─── Header ──────────────────────────────────────────────── */}
      {!collapsed && (
        <div className="flex-shrink-0 p-3 border-b border-claude-border">
          {/* Quality Badge + Label */}
          <div className="flex items-center gap-2 mb-2">
            <QualityScoreBadge pdbId={pdbId} />
            <span className="text-[10px] text-claude-text-muted font-semibold uppercase tracking-wider">
              Structure Details
            </span>
          </div>

          {/* Actions row removed — moved to molstar toolbar in 3D viewer */}

          {/* Entity Search/Filter Input */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-claude-text-muted" />
            <input
              type="text"
              value={entitySearchQuery}
              onChange={(e) => setEntitySearchQuery(e.target.value)}
              placeholder="Filter entities by name, chain, organism..."
              className="w-full pl-7 pr-6 py-1.5 text-[10px] rounded-md border border-claude-border-light
                         bg-claude-bg text-claude-text placeholder:text-claude-text-muted
                         focus:outline-none focus:ring-1 focus:ring-claude-accent/40 focus:border-claude-accent
                         entity-search-input"
            />
            {entitySearchQuery && (
              <button
                onClick={() => setEntitySearchQuery('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded
                           text-claude-text-muted hover:text-claude-text transition-colors"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── Quick Action Bar (selection sync) ─────────────────────── */}
      {!collapsed && (selectedEntity || selectedLigand) && (
        <div className="quick-action-bar quick-action-bar-enter px-3 py-1.5 flex items-center gap-2">
          {/* Selection info */}
          {selectedEntity && (
            <>
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entityColors[selectedEntity] || '#718096' }} />
              <span className="text-[10px] font-medium text-claude-text truncate max-w-[110px]">
                Chain {selectedEntity.split('.')[1]}
              </span>
              {(() => {
                const chainId = selectedEntity.split('.')[1];
                const matchEntity = displayEntities.find((e) => e.chains.some((c) => c.chain === chainId));
                const chain = matchEntity?.chains.find((c) => c.chain === chainId);
                return chain?.length ? (
                  <span className="text-[9px] text-claude-text-muted">({chain.length} res)</span>
                ) : null;
              })()}
            </>
          )}
          {selectedLigand && (
            <>
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ligandColors[selectedLigand] || '#d69e2e' }} />
              <span className="text-[10px] font-medium text-claude-text truncate max-w-[110px]">
                {selectedLigand}
              </span>
            </>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Action buttons */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => {
                  const key = selectedEntity || selectedLigand;
                  if (key) {
                    if (onFocusIn3D) {
                      onFocusIn3D(key);
                    } else if (selectedEntity) {
                      onEntityClick(key);
                    }
                  }
                }}
                className="p-1 rounded text-claude-text-muted hover:text-claude-accent
                           hover:bg-claude-accent-light transition-colors"
                title="Focus in 3D"
              >
                <Crosshair className="w-3 h-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-claude-surface text-claude-text border border-claude-border shadow-lg">
              Focus in 3D
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => {
                  const type = selectedEntity ? 'entity' : 'ligand';
                  const key = selectedEntity || selectedLigand;
                  if (key) {
                    handleColorDotClick({ stopPropagation: () => {} } as React.MouseEvent, type, key);
                  }
                }}
                className="p-1 rounded text-claude-text-muted hover:text-claude-accent
                           hover:bg-claude-accent-light transition-colors"
                aria-label="Change color" title="Change color"
              >
                <Palette className="w-3 h-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-claude-surface text-claude-text border border-claude-border shadow-lg">
              Change Color
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => {
                  if (onDeselect) {
                    onDeselect();
                  } else {
                    onEntityClick(selectedEntity || '');
                    if (!selectedEntity && selectedLigand) onLigandClick(selectedLigand);
                  }
                }}
                className="p-1 rounded text-claude-text-muted hover:text-claude-accent
                           hover:bg-claude-accent-light transition-colors"
                title="Deselect"
              >
                <X className="w-3 h-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-claude-surface text-claude-text border border-claude-border shadow-lg">
              Deselect
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* ─── Scrollable Content ──────────────────────────────────── */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {/* ─── Chain Summary Bar ──────────────────────────────── */}
          {filteredDisplayEntities.length > 0 && (
            <div className="px-3 pt-2 pb-1">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[8px] font-semibold uppercase tracking-wider text-claude-text-muted">
                  Chain Composition
                </span>
              </div>
              <ChainSummaryBar
                entities={filteredDisplayEntities}
                pdbId={pdbId}
                entityColors={entityColors}
                onEntityClick={onEntityClick}
              />
            </div>
          )}

          {/* ─── Entities Section ─────────────────────────────────── */}
          <div className="border-b border-claude-border">
            <div className="section-header-enhanced">
              <div className="section-title">
                <Dna className="w-3 h-3 text-claude-accent" />
                <span>Chains &amp; Entities</span>
              </div>
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-claude-border-light text-claude-text-secondary">
                {entitySearchQuery.trim() ? `${filteredDisplayEntities.length}/${displayEntities.length}` : filteredDisplayEntities.length}
              </span>
            </div>

            <div className="px-1.5 pb-2">
              {filteredDisplayEntities.length === 0 && entitySearchQuery.trim() && (
                <p className="text-[10px] text-claude-text-muted px-2 py-3 text-center italic">
                  No entities match "{entitySearchQuery}"
                </p>
              )}

              {filteredDisplayEntities.map((entity, entityIdx) => {
                const badge = getMoleculeBadge(entity.molecule_type);
                if (badge === 'LIG' || badge === 'WAT') return null;

                const isExpanded = expandedEntities.has(entity.entity_id);
                const isSeqShown = showSequence.has(entity.entity_id);

                // Get sequences for chains in this entity
                const entitySequences: { chain: string; sequence: string }[] = [];
                if (sequences) {
                  for (const chain of entity.chains) {
                    const seq = sequences[chain.chain] || sequences[chain.chain.toUpperCase()];
                    if (seq) {
                      entitySequences.push({ chain: chain.chain, sequence: seq });
                    }
                  }
                }

                return (
                  <div key={entity.entity_id} id={`entity-row-${entity.entity_id}`} className="mb-1 stagger-item entity-group-color-border entity-hover-3d-link" 
                       style={{ 
                         animationDelay: `${entityIdx * 40}ms`,
                         '--entity-color': entityColors[`${pdbId}.${entity.chains[0]?.chain}`] || '#718096',
                       } as React.CSSProperties}>
                    <Collapsible
                      open={isExpanded}
                      onOpenChange={() => toggleEntityExpanded(entity.entity_id)}
                    >
                      {/* Entity header - collapsible trigger */}
                      <div className="flex items-start gap-1.5 px-1.5 py-1.5 rounded-md
                                    hover:bg-claude-border-light transition-colors cursor-pointer group btn-press">
                        <CollapsibleTrigger className="flex-shrink-0 mt-0.5">
                          <ChevronDown
                            className={`w-3 h-3 text-claude-text-muted transition-transform duration-200
                                       ${isExpanded ? '' : '-rotate-90'}`}
                          />
                        </CollapsibleTrigger>
                        <MoleculeBadgeTag type={entity.molecule_type} />
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-[10px] font-medium text-claude-text leading-tight truncate group-hover:text-claude-accent transition-colors"
                            title={entity.description}
                          >
                            {entity.description}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {entity.organism && (
                              <span className="text-[9px] text-claude-text-muted italic truncate max-w-[120px]">
                                {entity.organism}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Show Sequence toggle */}
                        {entitySequences.length > 0 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleShowSequence(entity.entity_id);
                                }}
                                className={`p-0.5 rounded transition-colors flex-shrink-0
                                           ${isSeqShown
                                             ? 'text-claude-accent bg-claude-accent-light'
                                             : 'text-claude-text-muted hover:text-claude-accent hover:bg-claude-accent-light'
                                           }`}
                              >
                                <AlignLeft className="w-3 h-3" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="bg-claude-surface text-claude-text border border-claude-border shadow-lg">
                              {isSeqShown ? 'Hide Sequence' : 'Show Sequence'}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>

                      {/* Chain rows */}
                      <CollapsibleContent>
                        <div className="ml-3 border-l-2 border-claude-border-light pl-1">
                          {entity.chains.map((chain) => (
                            <ChainRow
                              key={chain.chain}
                              chain={chain}
                              pdbId={pdbId}
                              entityColors={entityColors}
                              selectedEntity={selectedEntity}
                              hoveredEntity={hoveredEntity}
                              hoveredFrom3D={hoveredEntityFrom3D}
                              colorPickerTarget={colorPickerTarget}
                              onEntityClick={onEntityClick}
                              onEntityHover={onEntityHover}
                              handleColorDotClick={handleColorDotClick}
                              onEntityColorChange={onEntityColorChange}
                              closeColorPicker={closeColorPicker}
                              entityVisibility={entityVisibility}
                              soloEntity={soloEntity}
                              onEntityVisibilityChange={onEntityVisibilityChange}
                              onEntityFocus={onEntityFocus}
                              onSoloEntity={onSoloEntity}
                            />
                          ))}

                          {/* Sequence display */}
                          {isSeqShown && (
                            <div className="mt-1 mb-1">
                              {sequencesLoading ? (
                                <div className="px-2 py-2 flex items-center gap-1.5 text-[9px] text-claude-text-muted">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Loading sequence...
                                </div>
                              ) : entitySequences.length > 0 ? (
                                entitySequences.map((seqData) => {
                                  // Compute residue type breakdown for this sequence
                                  const seq = seqData.sequence;
                                  let hydrophobic = 0;
                                  let polar = 0;
                                  let chargedPos = 0;
                                  let chargedNeg = 0;
                                  let special = 0;
                                  const hydrophobicAAs = new Set(['A','V','L','I','M','F','W','P']);
                                  const polarAAs = new Set(['S','T','N','Q','Y','C']);
                                  const chargedPosAAs = new Set(['K','R','H']);
                                  const chargedNegAAs = new Set(['D','E']);
                                  for (const ch of seq) {
                                    const u = ch.toUpperCase();
                                    if (hydrophobicAAs.has(u)) hydrophobic++;
                                    else if (polarAAs.has(u)) polar++;
                                    else if (chargedPosAAs.has(u)) chargedPos++;
                                    else if (chargedNegAAs.has(u)) chargedNeg++;
                                    else if (u !== '-' && u !== 'X') special++;
                                  }
                                  const total = hydrophobic + polar + chargedPos + chargedNeg + special;

                                  return (
                                    <div key={seqData.chain} className="mb-1">
                                      <div className="flex items-center gap-1.5 text-[8px] font-mono text-claude-text-muted px-1 mb-0.5">
                                        <span>Chain {seqData.chain}</span>
                                        {total > 0 && (
                                          <>
                                            <span className="text-claude-border">·</span>
                                            {/* Residue type breakdown mini bar */}
                                            <div className="residue-breakdown-bar w-16" title={`H:${hydrophobic} P:${polar} +:${chargedPos} -:${chargedNeg} S:${special}`}>
                                              <div style={{ width: `${(hydrophobic / total) * 100}%`, backgroundColor: '#f97316' }} />
                                              <div style={{ width: `${(polar / total) * 100}%`, backgroundColor: '#22c55e' }} />
                                              <div style={{ width: `${(chargedPos / total) * 100}%`, backgroundColor: '#3b82f6' }} />
                                              <div style={{ width: `${(chargedNeg / total) * 100}%`, backgroundColor: '#ef4444' }} />
                                              {special > 0 && <div style={{ width: `${(special / total) * 100}%`, backgroundColor: '#9ca3af' }} />}
                                            </div>
                                          </>
                                        )}
                                      </div>
                                      <SequenceView
                                        sequence={seqData.sequence}
                                        moleculeType={entity.molecule_type}
                                        chainId={seqData.chain}
                                        onResidueRangeSelect={onResidueRangeSelect}
                                        onResidueClick={onResidueClick}
                                        className="w-full"
                                      />
                                    </div>
                                  );
                                })
                              ) : (
                                <p className="text-[9px] text-claude-text-muted px-2 py-1 italic">
                                  No sequence data available
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─── Ligands Section ──────────────────────────────────── */}
          <div className="border-b border-claude-border">
            <div className="section-header-enhanced">
              <div className="section-title">
                <FlaskConical className="w-3 h-3 text-claude-accent" />
                <span>Ligands</span>
              </div>
              <div className="flex items-center gap-1.5">
                {onResetView && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={onResetView}
                        className="p-0.5 rounded text-claude-text-muted hover:text-claude-accent
                                   hover:bg-claude-accent-light transition-colors btn-click-ripple"
                        title="Reset view: show all ligands and chains"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="bg-claude-surface text-claude-text border border-claude-border shadow-lg">
                      Reset View
                    </TooltipContent>
                  </Tooltip>
                )}
                {onExportLigands && ligandCodes.length > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={onExportLigands}
                        className="p-0.5 rounded text-claude-text-muted hover:text-claude-accent
                                   hover:bg-claude-accent-light transition-colors btn-click-ripple"
                        title="Export ligand data as CSV"
                      >
                        <Download className="w-3 h-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="bg-claude-surface text-claude-text border border-claude-border shadow-lg">
                      Export ligands CSV
                    </TooltipContent>
                  </Tooltip>
                )}
                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-claude-border-light text-claude-text-secondary">
                  {ligandCodes.length}
                </span>
              </div>
            </div>

            <div className="px-1.5 pb-2">
              {ligandCodes.length === 0 && (
                <p className="text-[10px] text-claude-text-muted px-2 py-3 text-center italic">
                  No ligands detected
                </p>
              )}

              {ligandCodes.map((code, ligIdx) => {
                // For PEP_ ligands, look up the entity description and chain ID
                const isPeptide = code.startsWith('PEP_');
                const peptideChainId = isPeptide ? code.replace('PEP_', '') : undefined;
                const peptideEntity = isPeptide
                  ? entities.find((e) =>
                      e.chains.some((c) => c.chain === peptideChainId) &&
                      (e.molecule_type.toLowerCase().includes('polypeptide'))
                    )
                  : undefined;
                const peptideDescription = peptideEntity?.description;

                return (
                <div key={code} className="stagger-item" style={{ animationDelay: `${ligIdx * 40}ms` }}>
                <LigandRow
                  key={code}
                  code={code}
                  ligandColors={ligandColors}
                  ligandVisibility={ligandVisibility}
                  selectedLigand={selectedLigand}
                  hoveredLigand={hoveredLigand}
                  hoveredFrom3D={hoveredLigandFrom3D}
                  colorPickerTarget={colorPickerTarget}
                  onLigandClick={onLigandClick}
                  onLigandHover={onLigandHover}
                  onLigandColorChange={onLigandColorChange}
                  onLigandVisibilityChange={onLigandVisibilityChange}
                  onLigandFocus={onLigandFocus}
                  onSoloLigand={onSoloLigand}
                  handleColorDotClick={handleColorDotClick}
                  closeColorPicker={closeColorPicker}
                  entityDescription={peptideDescription}
                  entityChainId={peptideChainId}
                  soloLigand={soloLigand}
                  onShowSequence={(chainId: string) => {
                    // Find and expand the entity containing this chain, then toggle sequence
                    const entity = entities.find((e) =>
                      e.chains.some((c) => c.chain === chainId)
                    );
                    if (entity) {
                      setExpandedEntities((prev) => {
                        const next = new Set(prev);
                        next.add(entity.entity_id);
                        return next;
                      });
                      setShowSequenceForEntity(entity.entity_id);
                    }
                  }}
                />
                </div>
                );
              })}
            </div>
          </div>


        </div>
      )}

      {/* ─── Collapsed View (Icon Sidebar) ─────────────────────────── */}
      {collapsed && (
        <div className="flex flex-col items-center py-2 gap-1.5 w-full">
          {/* PDB ID badge - click to expand */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setCollapsedState(false)}
                className="w-9 h-9 rounded-lg bg-claude-accent-light flex items-center justify-center
                           hover:bg-claude-accent hover:text-white transition-colors group"
                title="Expand panel"
              >
                <span className="text-[8px] font-mono font-bold text-claude-accent group-hover:text-white leading-none">
                  {pdbId.toUpperCase()}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-claude-surface text-claude-text border border-claude-border shadow-lg text-[10px]">
              {pdbId.toUpperCase()} — Click to expand
            </TooltipContent>
          </Tooltip>

          {/* Divider */}
          <div className="w-6 h-px bg-claude-border-light" />

          {/* Representation icons */}
          {([
            { value: 'cartoon' as const, icon: <Boxes className="w-3.5 h-3.5" />, label: 'Cartoon' },
            { value: 'ball-stick' as const, icon: <FlaskConical className="w-3.5 h-3.5" />, label: 'Ball & Stick' },
            { value: 'surface' as const, icon: <Dna className="w-3.5 h-3.5" />, label: 'Surface' },
          ]).map((opt) => (
            <Tooltip key={opt.value}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onRepresentationChange(opt.value)}
                  className={`w-9 h-7 rounded-md flex items-center justify-center
                             transition-colors ${
                               representation === opt.value
                                 ? 'bg-claude-accent text-white shadow-sm'
                                 : 'bg-claude-border-light text-claude-text-muted hover:bg-claude-accent-light hover:text-claude-accent'
                             }`}
                >
                  {opt.icon}
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="bg-claude-surface text-claude-text border border-claude-border shadow-lg text-[10px]">
                {opt.label}
              </TooltipContent>
            </Tooltip>
          ))}

          {/* Divider */}
          <div className="w-6 h-px bg-claude-border-light" />

          {/* Section icons with counts */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setCollapsedState(false)}
                className="w-9 h-8 rounded-md flex flex-col items-center justify-center gap-0
                           bg-claude-border-light text-claude-text-muted hover:bg-claude-accent-light
                           hover:text-claude-accent transition-colors"
              >
                <Atom className="w-3 h-3" />
                <span className="text-[7px] font-bold leading-none">{polymerEntities.length}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-claude-surface text-claude-text border border-claude-border shadow-lg text-[10px]">
              {polymerEntities.length} Entities
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setCollapsedState(false)}
                className="w-9 h-8 rounded-md flex flex-col items-center justify-center gap-0
                           bg-claude-border-light text-claude-text-muted hover:bg-claude-accent-light
                           hover:text-claude-accent transition-colors"
              >
                <Pill className="w-3 h-3" />
                <span className="text-[7px] font-bold leading-none">{ligandCodes.length}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-claude-surface text-claude-text border border-claude-border shadow-lg text-[10px]">
              {ligandCodes.length} Ligands
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setCollapsedState(false)}
                className="w-9 h-8 rounded-md flex flex-col items-center justify-center
                           bg-claude-border-light text-claude-text-muted hover:bg-claude-accent-light
                           hover:text-claude-accent transition-colors"
              >
                <ShieldCheck className="w-3 h-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-claude-surface text-claude-text border border-claude-border shadow-lg text-[10px]">
              Quality Metrics
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setCollapsedState(false)}
                className="w-9 h-8 rounded-md flex flex-col items-center justify-center
                           bg-claude-border-light text-claude-text-muted hover:bg-claude-accent-light
                           hover:text-claude-accent transition-colors"
              >
                <Bookmark className="w-3 h-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-claude-surface text-claude-text border border-claude-border shadow-lg text-[10px]">
              Annotations
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setCollapsedState(false)}
                className="w-9 h-8 rounded-md flex flex-col items-center justify-center
                           bg-claude-border-light text-claude-text-muted hover:bg-claude-accent-light
                           hover:text-claude-accent transition-colors"
              >
                <PieChart className="w-3 h-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-claude-surface text-claude-text border border-claude-border shadow-lg text-[10px]">
              Summary & Composition
            </TooltipContent>
          </Tooltip>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Expand chevron at bottom */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setCollapsedState(false)}
                className="w-9 h-7 rounded-md flex items-center justify-center
                           text-claude-text-muted hover:bg-claude-accent-light
                           hover:text-claude-accent transition-colors"
                title="Expand panel"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-claude-surface text-claude-text border border-claude-border shadow-lg text-[10px]">
              Expand Panel
            </TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  );
}

export default EntityPanel;
