import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

const EVALS_DIR = '/Users/lijing/Documents/my_note/LLM-Wiki/wiki/evaluations';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uniprotId: string }> }
) {
  try {
    const { uniprotId } = await params;
    
    // Read the directory to find matching file
    let files: string[];
    try {
      files = fs.readdirSync(EVALS_DIR);
    } catch {
      return NextResponse.json({ error: 'Evaluations directory not found' }, { status: 404 });
    }
    
    // Find file matching the uniprotId (e.g., P00533_EGFR_结构可行性评估.md)
    const matchingFile = files.find(f => f.startsWith(uniprotId + '_') && f.endsWith('_结构可行性评估.md'));
    
    if (!matchingFile) {
      return NextResponse.json({ error: 'Evaluation report file not found' }, { status: 404 });
    }
    
    const filePath = path.join(EVALS_DIR, matchingFile);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    return NextResponse.json({
      uniprotId,
      filename: matchingFile,
      content,
    });
  } catch (error) {
    console.error('Error reading evaluation report:', error);
    return NextResponse.json({ error: 'Failed to read evaluation report' }, { status: 500 });
  }
}