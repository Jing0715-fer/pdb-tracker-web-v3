import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { decodeJsonEscapes } from '@/lib/pdb-utils';

function toCamelCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (obj instanceof Date) return obj.toISOString().slice(0, 10);
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  if (typeof obj !== 'object') return obj;
  // Handle empty Date-like objects that serialize as {}
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    // Skip createdAt fields that are empty objects (unserializable Date)
    if (camelKey === 'createdAt' && value && typeof value === 'object' && Object.keys(value).length === 0) {
      result[camelKey] = null;
      continue;
    }
    result[camelKey] = toCamelCase(value);
  }
  return result;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const week = searchParams.get('week');
    const method = searchParams.get('method');
    const q = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '5000');

    const conditions: any[] = [];

    if (week) {
      conditions.push(Prisma.sql`weekId = ${week}`);
    }

    if (method && method !== 'all') {
      if (method === 'Cryo-EM') {
        conditions.push(Prisma.sql`method LIKE ${'%Cryo-EM%'}`);
      } else if (method === 'X-RAY DIFFRACTION') {
        conditions.push(Prisma.sql`method LIKE ${'%X-RAY%'}`);
      } else if (method === 'SOLUTION NMR') {
        conditions.push(Prisma.sql`method LIKE ${'%NMR%'}`);
      } else if (method === 'ELECTRON CRYSTALLOGRAPHY') {
        conditions.push(Prisma.sql`method LIKE ${'%ELECTRON CRYSTALLOGRAPHY%'}`);
      }
    }

    if (q) {
      const escapedQ = q.replace(/[%_]/g, '\\$&');
      const upperEscapedQ = escapedQ.toUpperCase();
      conditions.push(Prisma.sql`(
        p.pdbId LIKE ${'%' + upperEscapedQ + '%'} OR
        p.title LIKE ${'%' + escapedQ + '%'} OR
        p.journal LIKE ${'%' + escapedQ + '%'} OR
        p.organisms LIKE ${'%' + escapedQ + '%'} OR
        p.ligands LIKE ${'%' + upperEscapedQ + '%'}
      )`);
    }

    const whereClause = conditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
      : Prisma.sql``;

    const entries = await db.$queryRaw`
      SELECT p.*,
             a.title AS pubmedTitle,
             a.authors AS pubmedAuthors,
             a.abstract AS pubmedAbstract,
             CASE WHEN p.method LIKE '%Cryo-EM%' OR p.method LIKE '%ELECTRON MICROSCOPY%' THEN 1 ELSE 0 END AS isCryoem,
             CASE WHEN p.method LIKE '%X-RAY%' OR p.method LIKE '%XRAY%' THEN 1 ELSE 0 END AS isXray,
             CASE
               WHEN p.journalIf >= 20 THEN 'top'
               WHEN p.journalIf >= 10 THEN 'high'
               WHEN p.journalIf >= 5 THEN 'mid'
               WHEN p.journalIf IS NOT NULL THEN 'low'
               ELSE 'unknown'
             END AS ifTier
      FROM PdbStructure p
      LEFT JOIN PubMedArticle a ON p.pubmedId = a.pubmedId
      ${whereClause}
      ORDER BY p.releaseDate DESC
      LIMIT ${limit}
    `;

    return NextResponse.json((entries as any[]).map((entry: any) => {
      const camel = toCamelCase(entry);
      // Decode JSON Unicode escapes in text fields
      if (camel.title) camel.title = decodeJsonEscapes(camel.title);
      if (camel.journal) camel.journal = decodeJsonEscapes(camel.journal);
      if (camel.pubmedTitle) camel.pubmedTitle = decodeJsonEscapes(camel.pubmedTitle);
      if (camel.pubmedAbstract) camel.pubmedAbstract = decodeJsonEscapes(camel.pubmedAbstract);
      if (camel.pubmedAuthors) camel.pubmedAuthors = decodeJsonEscapes(camel.pubmedAuthors);
      return camel;
    }));
  } catch (error) {
    console.error('Error fetching entries:', error);
    return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 });
  }
}
