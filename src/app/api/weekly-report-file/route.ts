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

    // Extract actual LLM-generated content from cycles
    const cycleContents = cycles.filter(c => c.content).map(c => ({
      cycle: c.cycle,
      role: c.role,
      content: c.content,
      llmOk: c.llmOk,
      model: c.model,
      durationMs: c.durationMs,
    }));

    // The final report is the last cycle's content (synthesis or generator)
    const finalContent = cycles.length > 0 && cycles[cycles.length - 1].content
      ? cycles[cycles.length - 1].content
      : (cycles[0]?.content || '');

    // Build the full markdown report with actual content
    const md = `# PDB 周报 — ${weekId}

**报告日期**: ${weekId}
**报告类型**: ${reportType}
**Cycle 数**: ${run.cycles}
**LLM 提供方**: ${providers}
**耗时**: ${duration}
**生成时间**: ${run.createdAt.toISOString()}

---

${finalContent || '（无报告内容 — LLM 生成失败）'}

---

## 生成器 Cycle 详情

${cycles.map((c) => `
### Cycle ${c.cycle} — ${c.role}

- **报告类型**: ${c.reportType || 'N/A'}
- **LLM 模型**: ${c.provider}/${c.model}
- **耗时**: ${c.durationMs ? `${(c.durationMs / 1000).toFixed(1)}s` : 'N/A'}
- **内容长度**: ${c.contentChars || 0} 字符
${c.verdict ? `- **评审结果**: ${c.verdict}` : ''}
${c.llmOk === true ? '- **LLM 状态**: ✓ 真实生成' : c.llmOk === false ? '- **LLM 状态**: ✗ 失败' : ''}
`).join('\n')}

---

## 落盘文件

${filesWritten.map(f => `- \`${f}\``).join('\n')}

---

*本报告由 PDB Tracker 运行中心自动生成 · 数据来源: RCSB PDB, PubMed, NCBI BLAST*
*生成时间: ${run.createdAt.toISOString()}*
`;

    return NextResponse.json({
      weekId,
      files: [{ filename: `${weekId}_weekly_report.md`, content: md, type: reportType }],
      cycles: cycles.length,
      finalContent,
      cycleContents,
      createdAt: run.createdAt.toISOString(),
    });
  } catch (error: any) {
    console.error('[weekly-report-file] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch weekly report: ' + (error?.message || 'unknown') }, { status: 500 });
  }
}
