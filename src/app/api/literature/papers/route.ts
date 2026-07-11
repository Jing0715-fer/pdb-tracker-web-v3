import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { safeJsonParse } from '@/lib/utils';
import { decodeJsonEscapes } from '@/lib/pdb-utils';
import {
  combineDate,
  normalizeMonth,
  buildJournalLookup,
  matchJournalIf,
} from '@/lib/journal-matching';


export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get('q') || '';

    let whereClause = '';
    const queryParams: any[] = [];

    if (q) {
      const escapedQ = q.replace(/[%_]/g, '\\$&');
      whereClause = `WHERE (a.title LIKE ? OR a.authors LIKE ? OR a.journal LIKE ? OR a.abstract LIKE ?)`;
      const pattern = `%${escapedQ}%`;
      queryParams.push(pattern, pattern, pattern, pattern);
    }

    const articles = await db.$queryRawUnsafe<any[]>(
      `SELECT a.* FROM PubMedArticle a ${whereClause} ORDER BY a.createdAt DESC`,
      ...queryParams
    );

    const pubmedIds = articles.map((a: any) => a.pubmedId).filter(Boolean);
    const pdbMap: Record<string, any[]> = {};
    const paperIfMap: Record<string, number | null> = {};

    if (pubmedIds.length > 0) {
      const placeholders = pubmedIds.map(() => '?').join(',');
      const pdbRows = await db.$queryRawUnsafe<any[]>(
        `SELECT pubmedId, pdbId, method, resolution, journalIf FROM PdbStructure WHERE pubmedId IN (${placeholders})`,
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
        if (paperIfMap[pmid] === undefined && row.journalIf != null) {
          paperIfMap[pmid] = row.journalIf;
        }
      }
    }

    // For papers without PDB match, try journal name → IF lookup via the
    // shared matcher (buildJournalLookup + matchJournalIf).
    const needsJournalMatch = articles.some(
      (a: any) => paperIfMap[a.pubmedId] === undefined && a.journal
    );
    if (needsJournalMatch) {
      const ifRows = await db.$queryRawUnsafe<any[]>(
        `SELECT DISTINCT journal, journalIf FROM PdbStructure WHERE journalIf IS NOT NULL AND journalIf > 0`
      );
      const { journalIfMap, pdbJournals } = buildJournalLookup(
        ifRows as { journal: string; journalIf: number | null }[]
      );
      for (const a of articles) {
        if (paperIfMap[a.pubmedId] === undefined && a.journal) {
          paperIfMap[a.pubmedId] = matchJournalIf(a.journal, journalIfMap, pdbJournals);
        }
      }
    }

    // Online IF fallback: for papers still without IF, fetch from Crossref API.
    const needsOnlineIf = articles.filter((a: any) => paperIfMap[a.pubmedId] === undefined && a.journal);
    if (needsOnlineIf.length > 0 && needsOnlineIf.length <= 20) {
      const { fetchJournalIFs } = await import('@/lib/journal-if-api');
      const uniqueJournals = [...new Set(needsOnlineIf.map((a: any) => a.journal).filter(Boolean))];
      const onlineIfMap = await fetchJournalIFs(uniqueJournals);
      for (const a of needsOnlineIf) {
        const ifVal = onlineIfMap.get(a.journal);
        if (ifVal != null) {
          paperIfMap[a.pubmedId] = ifVal;
        }
      }
    }

    const papers = articles.map((a: any) => ({
      pmid: a.pubmedId,
      title: decodeJsonEscapes(a.title) || '',
      authors: decodeJsonEscapes(a.authors) || '',
      journal: a.journal || '',
      IF: paperIfMap[a.pubmedId] ?? null,
      pubdate: combineDate(a.pubYear, a.pubMonth, a.pubDay),
      abstract: decodeJsonEscapes(a.abstract) || '',
      abstractCn: a.abstractCn || '',
      doi: a.doi || '',
      pdbs: pdbMap[a.pubmedId] || [],
      source: a.source || null,
    }));

    return NextResponse.json(safeJsonParse(papers));
  } catch (error) {
    console.error('Error fetching literature papers:', error);
    return NextResponse.json([], { status: 500 });
  }
}
