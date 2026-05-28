import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

const WEEKLY_REPORT_DIR = '/Users/lijing/Documents/my_note/LLM-Wiki/wiki/pdb_weekly_report';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weekId = searchParams.get('weekId');

    if (!weekId) {
      return NextResponse.json({ error: 'weekId is required' }, { status: 400 });
    }

    // Extract week number from weekId like "2025-W20" or "W20"
    const wMatch = weekId.match(/W(\d+)/i);
    const weekNum = wMatch ? wMatch[1] : null;

    let files: string[];
    try {
      files = fs.readdirSync(WEEKLY_REPORT_DIR);
    } catch {
      return NextResponse.json({ error: 'Weekly report directory not found' }, { status: 404 });
    }

    // Find all matching files (X-ray and Cryo-EM for the week)
    const matchingFiles = files.filter(f => {
      const lower = f.toLowerCase();
      const hasWeekNum = weekNum && lower.includes(`w${weekNum.toLowerCase()}`);
      const hasWeekId = lower.includes(weekId.toLowerCase());
      return (hasWeekNum || hasWeekId) && f.endsWith('.md');
    }).slice(0, 2); // max 2 (X-ray + Cryo-EM)

    if (matchingFiles.length === 0) {
      return NextResponse.json({ error: 'Weekly report file not found' }, { status: 404 });
    }

    const filesContent = matchingFiles.map(f => ({
      filename: f,
      type: f.includes('冷冻电镜') || f.includes('Cryo-EM') || f.includes('cryoem') ? 'cryoem' : 'xray',
      content: fs.readFileSync(path.join(WEEKLY_REPORT_DIR, f), 'utf-8')
    }));

    return NextResponse.json({ files: filesContent });
  } catch (error) {
    console.error('Error reading weekly report:', error);
    return NextResponse.json({ error: 'Failed to read weekly report' }, { status: 500 });
  }
}