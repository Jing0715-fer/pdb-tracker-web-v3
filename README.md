# PDB Tracker Web

A full-featured Next.js web application for tracking, analyzing, and managing protein structures from the PDB (Protein Data Bank). Built with React 19, TypeScript, Tailwind CSS, and Shadcn UI.

## Screenshots

> **3D Viewer**: Per-chain colored protein structure with Molstar, entity panel, and ligand highlighting
> **Evaluation Dashboard**: BLAST results table, feasibility radar chart, and domain coverage analysis
> **Literature Mode**: Citation network graph, paper reading lists, and journal IF tracking

---

## Three Main Modes

PDB Tracker Web has three fully-featured modes accessible from the sidebar. Press `1`, `2`, or `3` to switch between them.

### 1. Weekly Mode 📅

Browse and track newly published PDB structures by publication week.

- **Weekly Reports**: Browse structures published each week, with auto-generated text reports
- **Timeline View**: Year calendar heatmap + bar chart of publication trends
- **Advanced Filtering**: By resolution, method (Cryo-EM / X-ray / NMR), IF tier, date range, journal
- **Sortable Table**: PDB ID, method, resolution, journal IF, publication date
- **PDB Detail Panel**: Title, authors, journal, method, resolution, ligand info
- **Activity Feed**: Real-time updates of new structures, papers, and evaluations
- **Command Palette**: Press `Cmd+K` / `Ctrl+K` for quick search across all entries

### 2. Evaluation Mode 🔬

Evaluate structural coverage for any UniProt ID using BLAST homology detection.

- **UniProt Search**: Enter any UniProt ID to evaluate its structural coverage
- **BLAST Homology Detection**: Automatic detection of homologous PDB structures via RCSB BLAST API
- **PDB Coverage Table**: All homologous structures with resolution, method, organism, identity %
- **Feasibility Scoring**: Multi-factor scoring — resolution quality, identity threshold, BLAST coverage, method diversity
- **Radar Chart**: Visual representation of all evaluation factors on one chart
- **Domain Coverage**: Analyze coverage across protein domains
- **Ramachandran Plot**: Real phi/psi scatter computed from PDB atomic coordinates
- **Validation Metrics**: Clash score, rotamer outliers, bond/angle RMSZ, MolProbity score from RCSB PDB Validation API
- **Batch Evaluation**: Compare multiple UniProt targets side-by-side
- **Gantt Timeline**: Visualize structural coverage history across years
- **Scatter Plot**: Resolution vs. BLAST identity distribution
- **Evaluation Reports**: Generate and download structured evaluation documents

### 3. Literature Mode 📚

Manage and organize related scientific papers and citations.

- **Paper Management**: Track and organize PubMed articles with full metadata
- **Citation Network**: Interactive graph visualization of paper citation relationships
- **Reading Lists**: Organize papers into custom lists with notes and tags
- **IF Tracking**: Monitor and display journal impact factors over time
- **Advanced Filters**: Filter by tags, date range, journal, authors, citation count
- **Paper Detail Panel**: Abstract, citation count, authors, journal with IF badge

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| UI | React 19, Tailwind CSS, Shadcn UI, Radix UI |
| 3D Viewer | Mol* (molstar) v5.9 |
| Database | SQLite via Prisma ORM |
| Charts | Recharts |
| Icons | Lucide React |
| State | React hooks + Context API |
| Package Manager | npm / bun |

---

## Getting Started

### Prerequisites

- Node.js 20+

### Installation

```bash
# Clone the repository
git clone https://github.com/Jing0715-fer/pdb-tracker-web-v3.git
cd pdb-tracker-web-v3

# The Next.js app lives in the subdirectory
cd pdb-tracker-web

# Install dependencies
npm install

# Push database schema to SQLite
npx prisma db push

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Database Setup

```bash
# Generate Prisma client (if needed)
npx prisma generate

# Reset database — erases all data, use with caution
npx prisma db push --force-reset
```

---

## Project Structure

```
pdb-tracker-web/
├── src/
│   ├── app/
│   │   ├── api/                        # Next.js Route Handlers
│   │   │   ├── entities/[pdbId]/       # PDB entity data (PDBe + RCSB fallback)
│   │   │   ├── evaluations/             # UniProt evaluation API
│   │   │   ├── pdb-download/[pdbId]/   # Structure CIF file download
│   │   │   ├── rama/[pdbId]/            # Ramachandran plot data
│   │   │   ├── validation/[pdbId]/      # Validation metrics (MolProbity)
│   │   │   ├── literature/              # Literature/paper management API
│   │   │   └── reports/                 # Weekly report API
│   │   ├── layout.tsx                   # Root layout
│   │   └── page.tsx                     # Home page
│   │
│   ├── components/
│   │   ├── pdb-tracker.tsx             # Main app shell (~3200 lines)
│   │   │                                # Mode switching (weekly / eval / literature)
│   │   │                                # Manages sidebar, command palette, notifications
│   │   │
│   │   ├── # ── Weekly Mode ── #
│   │   ├── WeeklyTimeline.tsx           # Year calendar heatmap
│   │   ├── WeeklyPdbTable.tsx           # Sortable PDB table
│   │   ├── WeeklySummary.tsx            # Summary stats cards
│   │   ├── WeeklyActivityFeed.tsx      # Activity feed panel
│   │   ├── weekly-heatmap.tsx          # Weekly heatmap
│   │   └── weekly-page.tsx              # Weekly view page
│   │   │
│   │   ├── # ── 3D Viewer ── #
│   │   ├── PdbStructureViewer.tsx        # Molstar 3D viewer (~2500 lines)
│   │   │                                # Entity panel, chain coloring, ligand detection
│   │   ├── PdbViewerModal.tsx            # Dialog wrapper for 3D viewer
│   │   ├── molecule-plugin-init.ts       # Molstar plugin initialization
│   │   └── molecule-controls.tsx        # Viewer toolbar controls
│   │   │
│   │   ├── # ── Evaluation Mode ── #
│   │   ├── eval-dashboard.tsx           # Evaluation dashboard
│   │   ├── EvalPdbTable.tsx            # BLAST results table
│   │   ├── EvalDomainCoverage.tsx       # Domain coverage
│   │   ├── EvalScoreRadar.tsx          # Radar chart
│   │   ├── EvalBatchCompare.tsx         # Batch comparison
│   │   ├── eval-summary.tsx            # Summary panel
│   │   ├── eval-gantt-timeline.tsx     # Gantt timeline
│   │   ├── eval-scatter-plot.tsx       # Scatter plot
│   │   └── eval-report-generator.tsx   # Report generator
│   │   │
│   │   ├── # ── Literature Mode ── #
│   │   ├── literature/LiteratureView.tsx        # Literature main view
│   │   ├── literature/LiteraturePaperList.tsx   # Paper list
│   │   ├── literature/LiteraturePaperCard.tsx   # Paper card
│   │   ├── literature/LiteratureDetailPanel.tsx # Detail panel
│   │   ├── literature/LiteratureCitationNetwork.tsx # Citation graph
│   │   ├── literature/LiteratureReadingList.tsx  # Reading list
│   │   └── literature/LiteratureAdvancedFilter.tsx # Advanced filter
│   │   │
│   │   ├── # ── Layout / Shared ── #
│   │   ├── pdb-sidebar.tsx             # Sidebar + mode tabs
│   │   ├── pdb-header.tsx              # Header bar
│   │   ├── pdb-detail-panel.tsx        # Right detail panel
│   │   ├── command-palette.tsx         # Cmd+K palette
│   │   ├── notification-panel.tsx      # Notification bell panel
│   │   └── context-menu-overlay.tsx    # Right-click menu
│   │
│   ├── hooks/
│   │   ├── use-pdb-filters.tsx         # Filter state management
│   │   ├── use-pdb-evaluation.tsx       # Evaluation logic
│   │   ├── use-keyboard-shortcuts.ts    # Keyboard shortcuts
│   │   ├── use-resizable-panels.ts      # Panel resizing
│   │   └── use-sorted-entries.ts       # Sort logic
│   │
│   └── lib/
│       ├── db.ts                      # Prisma client singleton
│       ├── pdb-types.ts               # TypeScript interfaces
│       ├── pdb-utils.ts               # PDB utility functions
│       ├── biopython_server.ts         # Ramachandran computation
│       └── export-utils.ts            # CSV export utilities
│
└── prisma/
    └── schema.prisma                   # SQLite database schema
```

---

## API Reference

### Structure Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/entries` | List PDB entries, filterable by week, method, resolution |
| GET | `/api/entities/[pdbId]` | Entity details — chains, ligands, organism, sequence |
| GET | `/api/pdb-download/[pdbId]` | Download CIF structure file |
| GET | `/api/pdb-image/[pdbId]` | RCSB structure thumbnail |
| GET | `/api/rama/[pdbId]` | Ramachandran phi/psi data |
| GET | `/api/validation/[pdbId]` | Validation metrics (clashscore, rotamer, MolProbity) |
| GET | `/api/sequence/[pdbId]` | Sequence data |
| GET | `/api/contacts/[pdbId]` | Contact map data |
| GET | `/api/annotations/[pdbId]` | Structural annotations |

### Evaluation Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/evaluations` | List all evaluations |
| GET | `/api/evaluations/[uniprotId]` | Evaluation for a specific UniProt ID |
| GET | `/api/batches/[batchId]` | Batch evaluation data |
| GET | `/api/evaluation-reports` | List evaluation reports |

### Literature Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/literature/papers` | List papers |
| GET | `/api/literature/reports` | Literature reports |
| GET | `/api/pubmed-fetch?pmid=...` | Fetch paper from PubMed |

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1` | Switch to Weekly mode |
| `2` | Switch to Evaluation mode |
| `3` | Switch to Literature mode |
| `Cmd+K` / `Ctrl+K` | Open command palette |
| `Esc` | Close dialog / modal |
| `↑ ↓` | Navigate table rows |
| `Enter` | Select row |

---

## Environment Variables

```bash
# .env.local (create in pdb-tracker-web/ if missing)
DATABASE_URL="file:../pdb_tracker.db"
```

---

## License

MIT