import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weekId = searchParams.get('weekId');
    if (!weekId) return NextResponse.json({ error: 'weekId is required' }, { status: 400 });
    const run = await db.weeklyReportRun.findFirst({ where: { weekId }, orderBy: { createdAt: 'desc' } });
    if (!run) return NextResponse.json({ error: 'Weekly report not found for ' + weekId }, { status: 404 });
    let cycles: any[] = [];
    try { cycles = run.cyclesJson ? JSON.parse(run.cyclesJson) : []; } catch { cycles = []; }
    const reportType = run.reportTypes || 'cryoem+xray';
    const filesWritten = (run.filesWritten || '').split('\n').filter(Boolean);
    const providers = run.providers || 'zai';
    const duration = run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : 'unknown';
    const md = `# PDB 周报 — ${weekId}\n\n**报告日期**: ${weekId}\n**报告类型**: ${reportType}\n**Cycle 数**: ${run.cycles}\n**LLM 提供方**: ${providers}\n**耗时**: ${duration}\n**生成时间**: ${run.createdAt.toISOString()}\n\n---\n\n## 生成器 Cycle 详情\n\n${cycles.map((c) => `\n### Cycle ${c.cycle} — ${c.role}\n\n- **报告类型**: ${c.reportType || 'N/A'}\n- **LLM 模型**: ${c.provider}/${c.model}\n- **耗时**: ${c.durationMs ? `${(c.durationMs / 1000).toFixed(1)}s` : 'N/A'}\n- **内容长度**: ${c.contentChars || 0} 字符\n${c.verdict ? `- **评审结果**: ${c.verdict}` : ''}\n`).join('\n')}\n---\n\n## 落盘文件\n\n${filesWritten.map(f => `- \`${f}\``).join('\n')}\n\n---\n\n*本报告由 PDB Tracker 运行中心自动生成 · 数据来源: RCSB PDB, PubMed, NCBI BLAST*\n*生成时间: ${run.createdAt.toISOString()}*\n`;
    return NextResponse.json({ weekId, files: [{ filename: `${weekId}_weekly_report.md`, content: md, type: reportType }], cycles: cycles.length, createdAt: run.createdAt.toISOString() });
  } catch (error: any) {
    console.error('[weekly-report-file] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch weekly report: ' + (error?.message || 'unknown') }, { status: 500 });
  }
}
