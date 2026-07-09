/**
 * GET /api/literature/daily/reports
 *
 * List past daily literature digests persisted in WeeklyReport (reportType =
 * 'literature-daily'). Each row is keyed by title `Literature Daily Digest -
 * YYYY-MM-DD` so re-runs of the same date overwrite rather than duplicate.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { safeJsonParse } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const rows = await db.$queryRaw<any[]>`
      SELECT id, weekId, title, content, filename, createdAt
      FROM WeeklyReport
      WHERE reportType = 'literature-daily'
      ORDER BY weekId DESC
      LIMIT 90
    `;
    const reports = (rows as any[]).map(r => ({
      id: r.id,
      weekId: r.weekId,
      date: r.weekId,
      title: r.title,
      content: r.content,
      filename: r.filename,
      createdAt: r.createdAt,
    }));
    return NextResponse.json(safeJsonParse(reports));
  } catch (e: any) {
    console.error('[literature/daily/reports] error', e);
    return NextResponse.json({ error: e?.message || 'fetch failed' }, { status: 500 });
  }
}
