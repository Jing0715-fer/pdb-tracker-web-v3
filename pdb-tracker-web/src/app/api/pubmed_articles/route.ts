import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const articles = await db.$queryRaw<any[]>`
      SELECT pubmed_id, title, authors, journal, pub_year as pubYear, abstract
      FROM pubmed_articles
      WHERE pubmed_id IS NOT NULL AND pubmed_id != ''
    `;

    const articleMap: Record<string, { title: string; authors: string; journal: string; pubYear: string; abstract: string }> = {};
    for (const a of articles) {
      articleMap[a.pubmed_id] = {
        title: a.title || '',
        authors: a.authors || '',
        journal: a.journal || '',
        pubYear: a.pub_year || '',
        abstract: a.abstract || '',
      };
    }

    return NextResponse.json(articleMap);
  } catch (error) {
    console.error('Error fetching pubmed articles:', error);
    return NextResponse.json({ error: 'Failed to fetch pubmed articles' }, { status: 500 });
  }
}