import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { safeJsonParse } from '@/lib/utils';
import { decodeJsonEscapes } from '@/lib/pdb-utils';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get('q') || '';

    // Build search conditions
    let whereClause = '';
    const queryParams: any[] = [];

    if (q) {
      const escapedQ = q.replace(/[%_]/g, '\\$&');
      whereClause = `WHERE (a.title LIKE ? OR a.authors LIKE ? OR a.journal LIKE ? OR a.abstract LIKE ?)`;
      const pattern = `%${escapedQ}%`;
      queryParams.push(pattern, pattern, pattern, pattern);
    }

    // Fetch all PubMed articles with optional search
    const articles = await db.$queryRawUnsafe<any[]>(
      `SELECT a.* FROM PubMedArticle a ${whereClause} ORDER BY a.createdAt DESC`,
      ...queryParams
    );

    // Fetch associated PDB structures for articles that have pubmedId
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

    // Format as LitPaper
    const papers = articles.map((a: any) => ({
      pmid: a.pubmedId,
      title: decodeJsonEscapes(a.title) || '',
      authors: decodeJsonEscapes(a.authors) || '',
      journal: a.journal || '',
      IF: null as number | null,
      pubdate: a.pubYear || '',
      abstract: decodeJsonEscapes(a.abstract) || '',
      abstractCn: '',
      doi: a.doi || '',
      pdbs: pdbMap[a.pubmedId] || [],
    }));

    return NextResponse.json(safeJsonParse(papers));
  } catch (error) {
    console.error('Error fetching literature papers:', error);
    return NextResponse.json([], { status: 500 });
  }
}
