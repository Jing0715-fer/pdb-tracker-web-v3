# PDB Tracker Web

A full-featured Next.js web application for tracking, analyzing, and managing protein structures from the PDB (Protein Data Bank). Built with React 19, TypeScript, Tailwind CSS, and Shadcn UI.

## Screenshot

> (3D structure viewer with per-chain coloring, entity panel, and evaluation dashboard)

## Overview

PDB Tracker Web provides two main modes:

- **Weekly Mode** — Browse and track newly published PDB structures by week, filter by method (Cryo-EM, X-ray, NMR), resolution, impact factor, and more
- **Evaluation Mode** — Evaluate structural coverage for any UniProt ID using BLAST homology detection, with feasibility scoring and domain analysis

## Features

### Weekly Structure Tracking

- **Weekly Reports**: Browse structures published each week, with full-text reports generated automatically
- **Advanced Filtering**: Filter by resolution, method, journal impact factor tier, publication date
- **Timeline View**: Year calendar heatmap and bar chart showing structure publication trends
- **Sidebar Navigation**: Weekly report list with report generation status indicators
- **Table View**: Sortable columns — PDB ID, method, resolution, journal IF, publication date
- **PDB Detail Panel**: Click any entry to see title, authors, journal, method, resolution, ligand info

### Structure Analysis & 3D Viewer

- **3D Molstar Viewer**: Interactive protein structure visualization with Mol*
- **Per-Chain Coloring**: Distinct colors for each chain, applied via the entity panel
- **Entity Panel**: Hierarchical list showing all entities, chains, and ligands with residue counts
- **Ligand Detection**: Automatic detection and display of bound ligands (ions, small molecules, peptides)
- **Representation Switching**: Toggle between cartoon, ball-stick, and surface representations
- **3D Focus & Highlight**: Click an entity or ligand in the sidebar to highlight/focus it in 3D view
- **Residue Count Display**: Each entity shows total residue count for its chains

### Evaluation Mode

- **UniProt Search**: Search by UniProt ID to evaluate structural coverage
- **BLAST Homology Detection**: Automatic detection of homologous PDB structures via RCSB BLAST API
- **PDB Coverage Table**: Lists all homologous structures with resolution, method, organism, and identity %
- **Batch Evaluation**: Compare multiple targets side-by-side
- **Domain Coverage**: Analyze coverage across protein domains
- **Feasibility Scoring**: Multi-factor assessment (resolution, identity, BLAST coverage, method diversity)
- **Radar Chart**: Visual representation of evaluation scores across multiple factors
- **Gantt Timeline**: Visualize structural coverage timeline across years
- **Scatter Plot**: Resolution vs. BLAST identity distribution
- **Evaluation Reports**: Generate and download structured PDF-style reports

### Literature Integration

- **Paper Management**: Track and organize related PubMed articles
- **Citation Network**: Visual graph of paper citation relationships
- **Reading List**: Organize papers into custom reading lists with notes and tags
- **IF Tracking**: Monitor and display journal impact factors
- **Literature Sidebar**: Paper list with filtering by tags, date, journal

### UI Features

- **Command Palette**: Press `Cmd+K` / `Ctrl+K` to open global command palette
- **Keyboard Shortcuts**: Number keys `1-3` to switch modes, `Esc` to close dialogs
- **Resizable Panels**: Drag panel borders to resize sidebar and content areas
- **Mobile Support**: Collapsible sidebar and mobile-optimized layout
- **Dark/Light Mode**: Full dark mode support
- **Notification Bell**: Activity feed and notification panel
- **Export**: Export table data as CSV

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI | React 19, Tailwind CSS, Shadcn UI, Radix UI |
| 3D Viewer | Mol* (molstar) |
| Database | SQLite via Prisma ORM |
| Charts | Recharts |
| Icons | Lucide React |
| State | React hooks + Context |
| Package Manager | npm / bun |

## Getting Started

### Prerequisites

- Node.js 20+ (LTS recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/Jing0715-fer/pdb-tracker-web-v3.git
cd pdb-tracker-web-v3

# Install dependencies
npm install

# Push database schema to SQLite
npx prisma db push

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Reset database (erases all data — use with caution)
npx prisma db push --force-reset

# Seed sample data (if seed script exists)
npx prisma db seed
```

## Project Structure

```
src/
├── app/
│   ├── api/                        # Next.js Route Handlers
│   │   ├── entities/[pdbId]/       # PDB entity data (PDBe + RCSB fallback)
│   │   ├── evaluations/             # UniProt evaluation API
│   │   ├── pdb-download/[pdbId]/   # Structure CIF file download
│   │   ├── rama/[pdbId]/            # Ramachandran plot data
│   │   ├── validation/[pdbId]/      # Validation metrics API
│   │   ├── literature/              # Paper management API
│   │   └── reports/                 # Weekly report API
│   ├── layout.tsx                   # Root layout with sidebar
│   └── page.tsx                     # Home page (redirects to main app)
│
├── components/
│   ├── pdb-tracker.tsx              # Main app shell (~3200 lines)
│   │                                  # Handles mode switching (weekly/eval/literature)
│   │                                  # Manages sidebar, command palette, notifications
│   │
│   │   # ── Weekly Mode Components ── #
│   │   ├── WeeklyTimeline.tsx         # Year calendar heatmap
│   │   ├── WeeklyPdbTable.tsx         # Main structure table
│   │   ├── WeeklySummary.tsx           # Summary stats cards
│   │   ├── WeeklyActivityFeed.tsx      # Activity feed panel
│   │   ├── weekly-page.tsx            # Weekly view page
│   │   └── weekly-heatmap.tsx          # Weekly heatmap chart
│   │
│   │   # ── 3D Viewer Components ── #
│   │   ├── PdbStructureViewer.tsx      # Molstar 3D viewer (~2500 lines)
│   │   │                                # Entity panel, chain coloring, ligand detection
│   │   ├── PdbViewerModal.tsx           # Dialog wrapper for 3D viewer
│   │   ├── molecule-plugin-init.ts       # Molstar plugin initialization
│   │   ├── molecule-viewer.tsx          # Old molecule viewer (reference)
│   │   └── molecule-controls.tsx         # Viewer toolbar controls
│   │
│   │   # ── Evaluation Mode Components ── #
│   │   ├── evaluation-page.tsx           # Evaluation view page
│   │   ├── eval-dashboard.tsx           # Main evaluation dashboard
│   │   ├── EvalPdbTable.tsx             # BLAST results table
│   │   ├── EvalDomainCoverage.tsx       # Domain coverage analysis
│   │   ├── EvalScoreRadar.tsx           # Radar chart for scores
│   │   ├── EvalBatchCompare.tsx         # Batch comparison view
│   │   ├── EvalBatchCompare.tsx         # Batch comparison view
│   │   ├── eval-summary.tsx             # Summary panel
│   │   ├── eval-gantt-timeline.tsx      # Gantt timeline
│   │   ├── eval-scatter-plot.tsx        # Scatter plot
│   │   ├── eval-heatmap.tsx             # Heatmap
│   │   ├── ComplexEvalSummary.tsx       # Complex/batch summary
│   │   └── eval-report-generator.tsx    # Report generation
│   │
│   │   # ── Literature Components ── #
│   │   ├── literature/LiteratureView.tsx       # Literature mode main view
│   │   ├── literature/LiteraturePaperList.tsx  # Paper list
│   │   ├── literature/LiteraturePaperCard.tsx  # Paper card
│   │   ├── literature/LiteratureDetailPanel.tsx # Paper detail
│   │   ├── literature/LiteratureCitationNetwork.tsx  # Citation graph
│   │   ├── literature/LiteratureReadingList.tsx  # Reading list
│   │   └── literature/LiteratureAdvancedFilter.tsx # Filter panel
│   │
│   │   # ── Shared / Layout Components ── #
│   │   ├── pdb-sidebar.tsx             # Sidebar with mode tabs
│   │   ├── pdb-header.tsx              # Header bar
│   │   ├── pdb-detail-panel.tsx        # Detail panel (right side)
│   │   ├── StructureAnalysisSection.tsx # Structure analysis section
│   │   ├── command-palette.tsx         # Cmd+K command palette
│   │   ├── notification-panel.tsx       # Notification bell panel
│   │   ├── context-menu-overlay.tsx    # Right-click context menu
│   │   ├── comparison-panel.tsx        # Side-by-side comparison
│   │   ├── structure-comparison-modal.tsx # Structure comparison modal
│   │   └── ai-analysis-panel.tsx       # AI summary/analysis panel
│   │
│   │   # ── UI Components (Shadcn) ── #
│   │   ├── ui/                        # Shadcn UI component library
│   │   │   ├── dialog.tsx
│   │   │   ├── button.tsx
│   │   │   ├── table.tsx
│   │   │   ├── collapsible.tsx
│   │   │   ├── sheet.tsx               # Mobile drawer
│   │   │   ├── tooltip.tsx
│   │   │   └── ... (many more)
│   │   └── quality-components.tsx      # Validation quality components
│   │
│   └── hooks/
│       ├── use-pdb-filters.tsx         # Filter state management
│       ├── use-pdb-selection.tsx        # Row selection
│       ├── use-pdb-evaluation.tsx       # Evaluation logic
│       ├── use-keyboard-shortcuts.ts    # Keyboard shortcuts
│       ├── use-resizable-panels.ts      # Panel resizing
│       ├── use-command-palette.ts       # Command palette
│       └── use-sorted-entries.ts        # Sort logic
│
├── lib/
│   ├── db.ts                          # Prisma client singleton
│   ├── pdb-types.ts                   # TypeScript interfaces
│   ├── pdb-utils.ts                   # PDB utility functions
│   ├── biopython_server.ts            # Biopython server for Ramachandran
│   ├── import-utils.ts                # Data import utilities
│   └── export-utils.ts                # CSV/export utilities
│
└── prisma/
    └── schema.prisma                  # SQLite schema (PdbStructure, Evaluation, etc.)
```

## Key Data Flows

### Weekly Mode
```
User selects week → API /api/entries?weekId=2026-W22 → PdbEntry[] → WeeklyPdbTable
User clicks PDB → viewerModalOpen=true → PdbViewerModal → /api/pdb-download/7SYD → Molstar CIF
User opens 3D viewer → /api/entities/7SYD → EntityInfo[] → PdbStructureViewer entity panel
```

### Evaluation Mode
```
User enters UniProt → API /api/evaluations/P00533 → BLAST search via RCSB → EvalPdbTable
EvalPdbTable rows → click to show EvalPreviewPanel → /api/rama/8Q2D → RamachandranPlot
Batch mode → EvalBatchCompare → compare multiple targets side-by-side
```

## API Reference

### Structure Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/entries` | List PDB entries with filtering |
| GET | `/api/entries?weekId=2026-W22` | Entries for specific week |
| GET | `/api/entities/[pdbId]` | Entity details (chains, ligands, organism) |
| GET | `/api/pdb-download/[pdbId]` | Download CIF structure file |
| GET | `/api/pdb-image/[pdbId]` | RCSB structure thumbnail |
| GET | `/api/rama/[pdbId]` | Ramachandran plot data |
| GET | `/api/validation/[pdbId]` | Validation metrics (MolProbity) |
| GET | `/api/sequence/[pdbId]` | Sequence data |
| GET | `/api/contacts/[pdbId]` | Contact map data |
| GET | `/api/annotations/[pdbId]` | Structural annotations |

### Evaluation Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/evaluations` | List all evaluations |
| GET | `/api/evaluations/[uniprotId]` | Evaluation for specific UniProt |
| GET | `/api/batches/[batchId]` | Batch evaluation data |
| GET | `/api/batch-report/[batchId]` | Batch report |
| GET | `/api/evaluation-reports` | List evaluation reports |

### Literature Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/literature/papers` | List papers |
| GET | `/api/literature/reports` | Literature reports |
| GET | `/api/pubmed-fetch?pmid=...` | Fetch from PubMed |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1` | Switch to Weekly mode |
| `2` | Switch to Evaluation mode |
| `3` | Switch to Literature mode |
| `Cmd+K` / `Ctrl+K` | Open command palette |
| `Esc` | Close dialog/modal |
| `↑↓` | Navigate table rows |
| `Enter` | Select row / confirm |

## Environment Variables

```bash
# .env (create if missing)
DATABASE_URL="file:../pdb_tracker.db"
# Optional: PubMed API key for faster literature fetching
PUBMED_API_KEY=""
```

## License

MIT