import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const reports = await db.evaluation_reports.findMany({
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        uniprot_id: true,
        title: true,
        created_at: true,
      },
    });

    // Transform to camelCase for frontend
    const result = reports.map((r: any) => ({
      id: r.id,
      uniprotId: r.uniprot_id,
      title: r.title,
      createdAt: r.created_at,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching evaluation reports:', error);
    return NextResponse.json([], { status: 500 });
  }
}
