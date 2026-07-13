/**
 * GET /api/db-list — list SQLite databases found in the project.
 *
 * Scans the `db/` directory (default location) for any `.db` files and returns
 * their absolute paths + display metadata so the DbSetupWizard can show them
 * in its "select existing database" step.
 *
 * Response:
 *   {
 *     databases: [
 *       { displayPath: 'db/custom.db', fsPath: 'D:\\AI-web-app\\db\\custom.db',
 *         sizeBytes: 12345, modifiedAt: '2026-07-12T...' }
 *     ],
 *     scannedDir: 'D:\\AI-web-app\\db',
 *     totalFound: 1,
 *   }
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { promises as fs } from 'node:fs'
import * as path from 'node:path'

const SCAN_DIRS = ['db']
const MAX_DEPTH = 2

async function scanDir(root: string, prefix: string, depth = 0): Promise<any[]> {
  if (depth > MAX_DEPTH) return []
  let entries: any[] = []
  try {
    const items = await fs.readdir(root, { withFileTypes: true })
    for (const item of items) {
      const full = path.join(root, item.name)
      const rel = prefix ? `${prefix}/${item.name}` : item.name
      if (item.isDirectory()) {
        // Skip noisy dirs.
        if (['node_modules', '.next', '.git', 'download', '.zscripts'].includes(item.name)) continue
        const nested = await scanDir(full, rel, depth + 1)
        entries.push(...nested)
      } else if (item.isFile() && item.name.endsWith('.db')) {
        try {
          const stat = await fs.stat(full)
          entries.push({
            displayPath: rel,
            fsPath: full,
            sizeBytes: stat.size,
            modifiedAt: stat.mtime.toISOString(),
          })
        } catch { /* ignore */ }
      }
    }
  } catch { /* dir missing or unreadable */ }
  return entries
}

export async function GET() {
  const cwd = process.cwd()
  const all: any[] = []
  const scanned: string[] = []
  for (const dir of SCAN_DIRS) {
    const abs = path.resolve(cwd, dir)
    scanned.push(abs)
    const found = await scanDir(abs, dir)
    all.push(...found)
  }
  // De-duplicate by absolute path.
  const seen = new Set<string>()
  const unique = all.filter((e) => {
    if (seen.has(e.fsPath)) return false
    seen.add(e.fsPath)
    return true
  })
  // Sort by modifiedAt desc (newest first).
  unique.sort((a, b) => (b.modifiedAt || '').localeCompare(a.modifiedAt || ''))
  return NextResponse.json({
    databases: unique,
    scannedDirs: scanned,
    totalFound: unique.length,
  })
}