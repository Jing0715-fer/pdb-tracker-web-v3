import { PrismaClient } from '@prisma/client'
import { promises as fs } from 'node:fs'
import * as path from 'node:path'

const CONFIG_FILE = path.resolve(process.cwd(), '.hermes', 'db-config.json')

/** Read the persisted database path from config file, falling back to env or default. */
async function resolveDatabaseUrl(): Promise<string> {
  try {
    const raw = await fs.readFile(CONFIG_FILE, 'utf-8')
    const cfg = JSON.parse(raw)
    if (cfg.dbPath && typeof cfg.dbPath === 'string') return cfg.dbPath
  } catch { /* file missing or invalid — use fallback */ }
  return process.env.DATABASE_URL || 'file:./db/custom.db'
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/** Lazily initialised PrismaClient — reads db path from .hermes/db-config.json. */
export async function createDb(): Promise<PrismaClient> {
  if (globalForPrisma.prisma) return globalForPrisma.prisma

  const url = await resolveDatabaseUrl()
  // Override env so Prisma picks it up
  process.env.DATABASE_URL = url

  const client = new PrismaClient({
    datasources: { db: { url } },
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  })

  globalForPrisma.prisma = client
  return client
}

/** Synchronous export for existing callers that use `db` at module scope.
 *  IMPORTANT: At module-load time the config file may not be readable yet,
 *  so we create a client with the env default. Call `await createDb()` early
 *  in your route handler to re-initialise with the correct path. */
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL || 'file:./db/custom.db' } },
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
