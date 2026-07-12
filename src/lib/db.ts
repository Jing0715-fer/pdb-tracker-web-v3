import { PrismaClient } from '@prisma/client'
import { existsSync, readFileSync } from 'node:fs'
import { isAbsolute, resolve } from 'node:path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}


/**
 * Resolve the database URL on EVERY instantiation so that:
 *   - the path in .env is computed against the project root (not the API route's CWD, which
 *     Prisma would otherwise mis-resolve `file:./db/custom.db` for);
 *   - users can override it at runtime via the UI (writes to .hermes/db-config.json);
 *   - on a fresh machine checkout with NO .env present, we still find the bundled
 *     ./db/custom.db file because we anchor the path to project root.
 */
function resolveDbUrl(): string {
  // 1. Try the config file written by the UI (/api/db-config).
  //    We need a synchronous read here because PrismaClient constructors
  //    do not accept async callbacks; for dynamic paths we'd have to
  //    reload the client. So we resolve synchronously via a small cache.
  try {
    
    
    const cfgPath = resolve(process.cwd(), '.hermes', 'db-config.json');
    if (existsSync(cfgPath)) {
      try {
        const raw = readFileSync(cfgPath, 'utf-8');
        const cfg = JSON.parse(raw);
        if (cfg && typeof cfg.dbPath === 'string' && cfg.dbPath.length > 0) {
          const trimmed = cfg.dbPath.replace(/^file:/, '');
          // Convert relative paths to absolute (anchored at project root)
          if (!isAbsolute(trimmed)) {
            return `file:${resolve(process.cwd(), trimmed)}`;
          }
          return `file:${trimmed}`;
        }
      } catch {
        /* malformed config — fall through to env */
      }
    }
  } catch {
    /* fs unavailable — fall through to env */
  }

  // 2. Fall back to DATABASE_URL from .env (relative paths anchored to project root).
  const envUrl = process.env.DATABASE_URL || 'file:./db/custom.db';
  const rel = envUrl.replace(/^file:/, '');
  if (!rel) return envUrl;
  try {
    
    if (!isAbsolute(rel)) return `file:${resolve(process.cwd(), rel)}`;
    return envUrl;
  } catch {
    return envUrl;
  }
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: resolveDbUrl() } },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

/** Test/clear helper — used by API routes that want to re-read the config file. */
export function _resetDbForTest(): void {
  if (globalForPrisma.prisma) {
    globalForPrisma.prisma.$disconnect()
  }
  globalForPrisma.prisma = undefined
}
