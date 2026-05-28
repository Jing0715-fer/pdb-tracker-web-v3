import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { safeJsonParse } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const { date } = await params;

    // Get articles for the given date/year
    const articles = await db.$queryRaw<any[]>`
      SELECT a.* FROM PubMedArticle a
      WHERE a.pubYear = ${date}
      ORDER BY a.createdAt DESC
    `;

    // Fetch associated PDB structures
    const pubmedIds = articles.map((a: any) => a.pubmedId).filter(Boolean);
    let pdbMap: Record<string, any[]> = {};

    if (pubmedIds.length > 0) {
      const placeholders = pubmedIds.map(() => '?').join(',');
      const pdbRows = await db.$queryRawUnsafe<any[]>(
        `SELECT pubmedId, pdbId, method, resolution FROM PdbStructure WHERE pubmedId IN (${placeholders})`,
        ...pubmedIds
      );
      for (const row of pdbRows) {
        const pmid = row.pubmedId as string;
        if (!pdbMap[pmid]) pdbMap[pmid] = [];
        pdbMap[pmid].push({
          pdbId: row.pdbId,
          method: row.method || null,
          resolution: row.resolution ?? null,
        });
      }
    }

    const papers = articles.map((a: any) => ({
      pmid: a.pubmedId,
      title: a.title || '',
      authors: a.authors || '',
      journal: a.journal || '',
      IF: null as number | null,
      pubdate: a.pubYear || '',
      abstract: a.abstract || '',
      abstractCn: '',
      doi: a.doi || '',
      pdbs: pdbMap[a.pubmedId] || [],
    }));

    return NextResponse.json(safeJsonParse({
      date,
      paperCount: papers.length,
      papers,
      title: `Literature Report - ${date}`,
    }));
  } catch (error) {
    console.error('Error fetching literature report by date:', error);
    return NextResponse.json({ error: 'Failed to fetch literature report' }, { status: 500 });
  }
}
