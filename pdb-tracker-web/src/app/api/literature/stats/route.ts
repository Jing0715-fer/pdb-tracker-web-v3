import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { safeJsonParse } from '@/lib/utils';

export async function GET() {
  try {
    // Total papers
    const totalPapersRow = await db.$queryRaw<any[]>`
      SELECT CAST(COUNT(*) AS TEXT) as cnt FROM PubMedArticle
    `;
    const totalPapers = parseInt(totalPapersRow[0]?.cnt ?? '0', 10);

    // Total reports (distinct publication years as report groups)
    const totalReportsRow = await db.$queryRaw<any[]>`
      SELECT CAST(COUNT(DISTINCT pubYear) AS TEXT) as cnt FROM PubMedArticle WHERE pubYear IS NOT NULL
    `;
    const totalReports = parseInt(totalReportsRow[0]?.cnt ?? '0', 10);

    // Papers with journal info (non-null journal)
    const papersWithIfRow = await db.$queryRaw<any[]>`
      SELECT CAST(COUNT(*) AS TEXT) as cnt FROM PubMedArticle WHERE journal IS NOT NULL AND journal != ''
    `;
    const papersWithIf = parseInt(papersWithIfRow[0]?.cnt ?? '0', 10);

    // Latest date - format as ISO date string instead of raw timestamp
    const latestDateRow = await db.$queryRaw<any[]>`
      SELECT MAX(createdAt) as latest FROM PubMedArticle
    `;
    const rawLatestDate = latestDateRow[0]?.latest ?? null;
    let latestDate: string | null = null;
    if (rawLatestDate != null) {
      try {
        // Handle BigInt epoch ms, number epoch, Date object, or string
        let ms: number;
        if (typeof rawLatestDate === 'bigint') {
          ms = Number(rawLatestDate);
        } else if (typeof rawLatestDate === 'number') {
          ms = rawLatestDate;
        } else if (rawLatestDate instanceof Date) {
          latestDate = rawLatestDate.toISOString().slice(0, 10);
        } else if (typeof rawLatestDate === 'string') {
          if (/^\d+$/.test(rawLatestDate.trim())) {
            ms = parseInt(rawLatestDate.trim());
          } else {
            latestDate = rawLatestDate.slice(0, 10);
          }
        }
        if (ms !== undefined) {
          const d = new Date(ms);
          if (!isNaN(d.getTime())) {
            latestDate = d.toISOString().slice(0, 10);
          }
        }
      } catch {
        latestDate = typeof rawLatestDate === 'string' ? rawLatestDate.slice(0, 10) : null;
      }
    }

    // Average IF — from PdbStructure journalIf
    const avgIfRow = await db.$queryRaw<any[]>`
      SELECT CAST(AVG(journalIf) AS REAL) as avgIf FROM PdbStructure
      WHERE journalIf IS NOT NULL
    `;
    const avgIf = avgIfRow[0]?.avgIf != null ? Number(avgIfRow[0].avgIf) : null;

    // Top journal
    const topJournalRow = await db.$queryRaw<any[]>`
      SELECT journal FROM PubMedArticle
      WHERE journal IS NOT NULL AND journal != ''
      GROUP BY journal ORDER BY COUNT(*) DESC LIMIT 1
    `;
    const topJournal = topJournalRow[0]?.journal ?? null;

    // Method distribution from related PDB structures
    const methodDistributionRows = await db.$queryRaw<any[]>`
      SELECT
        CASE
          WHEN method LIKE '%Cryo-EM%' OR method LIKE '%ELECTRON MICROSCOPY%' THEN 'Cryo-EM'
          WHEN method LIKE '%X-RAY%' OR method LIKE '%XRAY%' THEN 'X-ray'
          WHEN method LIKE '%NMR%' THEN 'NMR'
          ELSE 'Other'
        END as method,
        CAST(COUNT(*) AS TEXT) as count
      FROM PdbStructure
      WHERE pubmedId IS NOT NULL
      GROUP BY method
      ORDER BY count DESC
    `;
    const methodDistribution = methodDistributionRows.map(r => ({
      method: r.method,
      count: parseInt(r.count, 10),
    }));

    // IF distribution (tier distribution from PdbStructure with pubmedId)
    const ifDistributionRows = await db.$queryRaw<any[]>`
      SELECT
        CASE
          WHEN journalIf >= 20 THEN 'top'
          WHEN journalIf >= 10 THEN 'high'
          WHEN journalIf >= 5 THEN 'mid'
          WHEN journalIf IS NOT NULL THEN 'low'
          ELSE 'unknown'
        END as tier,
        CAST(COUNT(*) AS TEXT) as count
      FROM PdbStructure
      WHERE pubmedId IS NOT NULL
      GROUP BY tier
      ORDER BY count DESC
    `;
    const ifDistribution = ifDistributionRows.map(r => ({
      tier: r.tier,
      count: parseInt(r.count, 10),
    }));

    return NextResponse.json(safeJsonParse({
      totalPapers,
      totalReports,
      papersWithIf,
      latestDate,
      avgIf: avgIf ? Math.round(avgIf * 100) / 100 : null,
      topJournal,
      methodDistribution,
      ifDistribution,
    }));
  } catch (error) {
    console.error('Error fetching literature stats:', error);
    return NextResponse.json({ error: 'Failed to fetch literature stats' }, { status: 500 });
  }
}
