# PDB Tracker Web

A Next.js-based web application for tracking and analyzing protein structures from the PDB (Protein Data Bank). Built with React, TypeScript, Tailwind CSS, and a Next.js API backend.

## Features

### Structure Tracking
- **Weekly Reports**: Browse PDB structures published each week, filtered by method (Cryo-EM, X-ray, NMR, etc.)
- **Advanced Filtering**: Filter by resolution, impact factor tier, publication date, and method
- **PDB ID Lookup**: Quick search for specific structures

### Structure Analysis
- **3D Viewer**: Interactive protein structure visualization using Mol* (Molstar)
- **Per-Chain Coloring**: Distinct coloring for each chain in multi-chain structures
- **Ligand Detection**: Automatic detection and display of ligand molecules
- **Representation Switching**: Cartoon, ball-stick, and surface representations
- **Entity Panel**: Hierarchical view of all entities, chains, and ligands

### Evaluation Mode
- **UniProt-Based Search**: Evaluate structural coverage for any UniProt ID
- **BLAST Homology Detection**: Automatic detection of homologous PDB structures
- **Feasibility Scoring**: Multi-factor assessment for structural biology study viability

### Quality Validation
- **Ramachandran Plot**: Real phi/psi scatter plot computed from PDB coordinates
- **Validation Metrics**: Clash score, rotamer outliers, bond/angle RMSZ from RCSB PDB Validation API
- **MolProbity Score**: Composite quality score combining multiple validation metrics

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS, Radix UI, Shadcn UI
- **3D Visualization**: Mol* (molstar) for protein structure viewing
- **Database**: SQLite via Prisma ORM
- **API**: Next.js Route Handlers
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm or bun

### Installation

```bash
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

# Reset database (warning: erases all data)
npx prisma db push --force-reset
```

## Project Structure

```
src/
├── app/
│   ├── api/              # Next.js API routes
│   │   ├── entities/     # PDB entity data API
│   │   ├── evaluations/ # Evaluation API
│   │   ├── pdb-download/# PDB structure download API
│   │   └── reports/      # Weekly report API
│   └── page.tsx         # Main page
├── components/
│   ├── pdb-tracker.tsx  # Main application component
│   ├── PdbStructureViewer.tsx  # 3D Molstar viewer
│   ├── PdbViewerModal.tsx      # Viewer modal wrapper
│   └── activity-heatmap.tsx    # Activity heatmap
├── lib/
│   ├── db.ts           # Prisma client
│   ├── pdb-types.ts    # TypeScript types
│   └── pdb-utils.ts    # Utility functions
└── prisma/
    └── schema.prisma   # Database schema
```

## License

MIT