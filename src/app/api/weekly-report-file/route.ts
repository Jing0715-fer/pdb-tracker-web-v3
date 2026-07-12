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
    const providers = run.providers || 'cli:hermes';
    const duration = run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : 'unknown';

    // Extract actual LLM-generated content from cycles
    const finalContent = cycles.length > 0 && cycles[cycles.length - 1].content
      ? cycles[cycles.length - 1].content
      : (cycles[0]?.content || '');

    // Build X-ray specific report
    const xrayContent = `# X-ray 结构解析周报 — ${weekId}\n\n**报告日期**: ${weekId}\n**类型**: X-ray 晶体学\n**LLM 提供方**: ${providers}\n**耗时**: ${duration}\n**生成时间**: ${run.createdAt.toISOString()}\n\n---\n\n${finalContent || '（无报告内容 — LLM 生成失败）'}\n\n---\n\n*本报告由 PDB Tracker 运行中心自动生成 · 数据来源: RCSB PDB*\n*生成时间: ${run.createdAt.toISOString()}*\n`;

    // Build Cryo-EM specific report
    const cryoemContent = `# Cryo-EM 结构解析周报 — ${weekId}\n\n**报告日期**: ${weekId}\n**类型**: 冷冻电镜\n**LLM 提供方**: ${providers}\n**耗时**: ${duration}\n**生成时间**: ${run.createdAt.toISOString()}\n\n---\n\n${finalContent || '（无报告内容 — LLM 生成失败）'}\n\n---\n\n*本报告由 PDB Tracker 运行中心自动生成 · 数据来源: RCSB PDB*\n*生成时间: ${run.createdAt.toISOString()}*\n`;

    // Return separate files for X-ray and Cryo-EM so the E/X buttons can find them
    const files = [
      { filename: `${weekId}_xray_report.md`, content: xrayContent, type: 'xray' },
      { filename: `${weekId}_cryoem_report.md`, content: cryoemContent, type: 'cryoem' },
    ];

    return NextResponse.json({
      weekId,
      files,
      cycles: cycles.length,
      finalContent,
      createdAt: run.createdAt.toISOString(),
    });
  } catch (error: any) {
    console.error('[weekly-report-file] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch weekly report: ' + (error?.message || 'unknown') }, { status: 500 });
  }
}
