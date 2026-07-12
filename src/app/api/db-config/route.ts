/**
 * GET /api/db-config — read current database path
 * POST /api/db-config — update database path (requires server restart to take effect)
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import * as path from "node:path";

const CONFIG_FILE = path.resolve(process.cwd(), ".hermes", "db-config.json");

interface DbConfig {
  dbPath: string;
}

async function readConfig(): Promise<DbConfig> {
  try {
    const raw = await fs.readFile(CONFIG_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { dbPath: "file:./db/custom.db" };
  }
}

async function writeConfig(cfg: DbConfig): Promise<void> {
  await fs.mkdir(path.dirname(CONFIG_FILE), { recursive: true });
  await fs.writeFile(CONFIG_FILE, JSON.stringify(cfg, null, 2), "utf-8");
}

export async function GET() {
  const cfg = await readConfig();
  return NextResponse.json({
    dbPath: cfg.dbPath,
    resolvedPath: cfg.dbPath.replace(/^file:/, ""),
    configFile: CONFIG_FILE,
    env: process.env.DATABASE_URL || "(not set)",
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const dbPath = (body.dbPath || "").trim();
    if (!dbPath) {
      return NextResponse.json({ error: "dbPath is required" }, { status: 400 });
    }
    await writeConfig({ dbPath });
    return NextResponse.json({
      ok: true,
      dbPath,
      message: "Database path saved. Restart the server for changes to take effect.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "unknown" }, { status: 500 });
  }
}
