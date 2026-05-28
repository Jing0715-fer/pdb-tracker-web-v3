# PDB Tracker Web

A Next.js-based web application for tracking and analyzing protein structures from the PDB (Protein Data Bank). Built with React, TypeScript, Tailwind CSS, and a Next.js API backend.

## Features

### Structure Tracking
- **Weekly Reports**: Browse PDB structures published each week, filtered by method (Cryo-EM, X-ray, NMR, etc.)
- **Advanced Filtering**: Filter by resolution, impact factor tier, publication date, and method
- **PDB ID Lookup**: Quick search for specific structures
- **Timeline View**: Visualize structure publication history across years

### Structure Analysis
- **3D Viewer**: Interactive protein structure visualization using Mol* (Molstar)
- **Per-Chain Coloring**: Distinct coloring for each chain in multi-chain structures
- **Ligand Detection**: Automatic detection and display of ligand molecules
- **Representation Switching**: Cartoon, ball-stick, and surface representations
- **Entity Panel**: Hierarchical view of all entities, chains, and ligands with residue counts

### Evaluation Mode
- **UniProt-Based Search**: Evaluate structural coverage for any UniProt ID
- **BLAST Homology Detection**: Automatic detection of homologous PDB structures
- **Batch Evaluation**: Compare multiple targets side-by-side
- **Domain Coverage**: Analyze coverage across protein domains
- **Feasibility Scoring**: Multi-factor assessment for structural biology study viability

### Quality Validation
- **Ramachandran Plot**: Real phi/psi scatter plot computed from PDB coordinates
- **Validation Metrics**: Clash score, rotamer outliers, bond/angle RMSZ from RCSB PDB Validation API
- **MolProbity Score**: Composite quality score combining multiple validation metrics

### Literature Integration
- **Paper Management**: Track and organize related PubMed articles
- **Citation Network**: Visualize paper relationships
- **IF Tracking**: Monitor journal impact factors

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS, Radix UI, Shadcn UI
- **3D Visualization**: Mol* (molstar) for protein structure viewing
- **Database**: SQLite via Prisma ORM
- **API**: Next.js Route Handlers
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 20+ (LTS recommended)
- npm or bun

### Installation

```bash
# Clone the repository
git clone https://github.com/Jing0715-fer/pdb-tracker-web-v3.git
cd pdb-tracker-web-v3

# Install dependencies
npm install

# Push database schema
npx prisma db push

# Start development server
npm run dev
```

The app will be available at http://localhost:3000

### Database Setup

```bash
# Generate Prisma client (if needed)
npx prisma generate

# Seed with sample data
npx prisma db seed

# Reset database (warning: erases all data)
npx prisma db push --force-reset
```

## Project Structure

```
pdb-tracker-web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API routes
│   │   │   ├── entities/       # PDB entity data
│   │   │   ├── evaluations/    # UniProt evaluation
│   │   │   ├── pdb-download/   # Structure files
│   │   │   ├── reports/        # Weekly reports
│   │   │   └── literature/     # Paper management
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Home page
│   ├── components/              # React components
│   │   ├── pdb-tracker.tsx     # Main application
│   │   ├── PdbStructureViewer.tsx  # 3D Molstar viewer
│   │   ├── evaluation-*.tsx    # Evaluation components
│   │   ├── literature/         # Literature module
│   │   ├── ui/                 # Shadcn UI components
│   │   └── weekly-*.tsx        # Weekly report components
│   ├── hooks/                  # React hooks
│   ├── lib/                    # Utilities
│   │   ├── db.ts              # Prisma client
│   │   ├── pdb-types.ts       # TypeScript types
│   │   └── pdb-utils.ts       # PDB utilities
│   └── app/globals.css        # Global styles
├── prisma/
│   └── schema.prisma          # Database schema
└── public/                    # Static assets
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/entries` | List all PDB entries |
| `GET /api/entities/[pdbId]` | Get entity details for a structure |
| `GET /api/evaluations/[uniprotId]` | Get evaluation data for a UniProt ID |
| `GET /api/pdb-download/[pdbId]` | Download structure file (CIF) |
| `GET /api/rama/[pdbId]` | Get Ramachandran plot data |
| `GET /api/validation/[pdbId]` | Get validation metrics |

## License

MIT