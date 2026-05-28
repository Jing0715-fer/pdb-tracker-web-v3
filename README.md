# PDB Tracker Web

A full-featured Next.js web application for tracking, analyzing, and managing protein structures from the PDB (Protein Data Bank). Built with React 19, TypeScript, Tailwind CSS, and Shadcn UI.

> **This is the Next.js version of PDB Tracker.** For the legacy Flask version, see the `pdb-tracker-web/` subdirectory.

## Three Main Modes

PDB Tracker Web provides three fully-featured modes accessible from the sidebar:

### 1. Weekly Mode 📅
Browse and track newly published PDB structures by publication week.

- Weekly Reports with auto-generated text summaries
- Timeline View: Year calendar heatmap + bar chart of publication trends
- Advanced Filtering by resolution, method (Cryo-EM/X-ray/NMR), IF tier, date
- Sortable Table: PDB ID, method, resolution, journal IF, publication date
- PDB Detail Panel: title, authors, journal, method, resolution, ligand info
- Activity Feed with real-time updates

### 2. Evaluation Mode 🔬
Evaluate structural coverage for any UniProt ID using BLAST homology detection.

- UniProt ID search for structural coverage evaluation
- BLAST Homology Detection via RCSB BLAST API
- PDB Coverage Table with resolution, method, organism, identity %
- Feasibility Scoring: multi-factor radar chart
- Domain Coverage analysis
- Ramachandran Plot (phi/psi from PDB coordinates)
- Validation Metrics: clash score, rotamer outliers, MolProbity score
- Batch Evaluation: compare multiple targets side-by-side
- Gantt Timeline and Scatter Plot visualizations
- Evaluation Report generation

### 3. Literature Mode 📚
Manage and organize scientific papers and citations.

- PubMed article tracking and management
- Citation Network: interactive graph of paper relationships
- Reading Lists with notes and tags
- Journal IF tracking and display
- Advanced filters by tags, date, journal, authors

## Quick Start

```bash
# Enter the Next.js project directory
cd pdb-tracker-web

# Install dependencies
npm install

# Push database schema
npx prisma db push

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tech Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS · Shadcn UI · Mol* (molstar) · Prisma + SQLite · Recharts

## License

MIT