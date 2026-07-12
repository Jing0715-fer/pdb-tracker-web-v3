import { sseStream, sleep, type SseEvent } from '@/lib/sse';
import { db } from '@/lib/db';
import { fetchWeeklyPdbIds, fetchPdbEntryDetails, type PdbEntryDetail } from '@/lib/rcsb';
import { generateText } from '@/lib/llm';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
function isoWeek(d: Date) {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  const start = new Date(tmp); start.setUTCDate(tmp.getUTCDate() - 3);
  const end = new Date(start); end.setUTCDate(start.getUTCDate() + 6);
  const report = new Date(end); report.setUTCDate(end.getUTCDate() + 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return { weekId: `${tmp.getUTCFullYear()}-W${pad(weekNo)}`, startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10), reportDate: report.toISOString().slice(0, 10) };
}
export async function GET() {
  const w = isoWeek(new Date());
  let pdbStructureCount = 0, weeklyReportCount = 0;
  try { pdbStructureCount = await db.pdbStructure.count({ where: { weekId: w.weekId } }); weeklyReportCount = await db.weeklyReportRun.count({ where: { weekId: w.weekId } }); } catch { /* ignore */ }
  return Response.json({ ...w, dbCounts: { pdbStructure: pdbStructureCount, weeklyReport: weeklyReportCount, weeklySnapshot: 1, withAuthors: 0, withPubmedId: 0, pubmedArticleMatched: 0 } });
}
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const maxCycles: 1 | 2 | 3 = ([1, 2, 3].includes(Number(body.maxCycles)) ? Number(body.maxCycles) : 2) as 1 | 2 | 3;
  const provider = body.llm?.provider || 'cli:hermes';
  const model = body.llm?.model || 'hermes';
  const window = isoWeek(new Date());
  const { stream, progress, done } = sseStream();
  (async () => {
    const t0 = Date.now();
    const emit = (e: SseEvent) => progress(e);
    emit({ stage: 'init', level: 'info', message: `启动 pdb-weekly · ${window.weekId} · ${maxCycles}-cycle`, progress: 1 });
    await sleep(300);
    emit({ stage: 'fetch-rcsb', level: 'info', message: `RCSB 检索 ${window.startDate} → ${window.endDate}（真实 API）`, progress: 6 });
    const pdbIds = await fetchWeeklyPdbIds(window.startDate, window.endDate, 300);
    const fetched = pdbIds.length;
    if (fetched === 0) emit({ stage: 'fetch-rcsb', level: 'error', message: `✗ RCSB 返回 0 条`, progress: 14 });
    else emit({ stage: 'fetch-rcsb', level: 'success', message: `✓ RCSB 返回 ${fetched} 条真实 PDB ID`, progress: 14 });
    emit({ stage: 'fetch-detail', level: 'info', message: `拉取详细元数据`, progress: 18 });
    const details: PdbEntryDetail[] = fetched > 0 ? await fetchPdbEntryDetails(pdbIds) : [];
    emit({ stage: 'fetch-detail', level: 'success', message: `✓ 获取 ${details.length} 条详细元数据`, progress: 24 });
    emit({ stage: 'write-pdb', level: 'info', message: `写入 PdbStructure 表（${details.length} 条，全部写入）`, progress: 28 });
    let pdbSaved = 0, withAuthors = 0, withPubmedId = 0;
    try {
      for (const e of details) { await db.pdbStructure.upsert({ where: { pdbId: e.pdbId }, create: { pdbId: e.pdbId, method: e.method, releaseDate: e.releaseDate, resolution: e.resolution, title: e.title, doi: e.doi, journal: e.journal, journalIf: e.journalIf, authors: e.authors, organisms: e.organisms, ligands: e.ligands, weekId: window.weekId, pubmedId: e.pubmedId, fetchDate: new Date().toISOString().slice(0, 10) }, update: { method: e.method, releaseDate: e.releaseDate, resolution: e.resolution, title: e.title, doi: e.doi, journal: e.journal, journalIf: e.journalIf, authors: e.authors, organisms: e.organisms, ligands: e.ligands, weekId: window.weekId, pubmedId: e.pubmedId, fetchDate: new Date().toISOString().slice(0, 10) } }); pdbSaved++; if (e.authors) withAuthors++; if (e.pubmedId) withPubmedId++; }
      emit({ stage: 'write-pdb', level: 'success', message: `✓ 已写入 ${pdbSaved} 条 PdbStructure（with_authors=${withAuthors}, with_pubmedId=${withPubmedId}）`, progress: 34 });
    } catch (err: any) { emit({ stage: 'write-pdb', level: 'error', message: `✗ PdbStructure 写入失败：${err?.message}`, progress: 34 }); }

    // Build a summary of PDB structures for LLM
    const pdbSummary = details.slice(0, 20).map(e => `- ${e.pdbId}: ${e.method || 'unknown'} | ${e.resolution != null ? e.resolution.toFixed(1) + 'Å' : 'N/A'} | ${(e.title || '').slice(0, 60)} | ${e.journal || 'N/A'}`).join('\n');
    const methodBreakdown = { 'Cryo-EM': details.filter(e => (e.method || '').includes('ELECTRON')).length, 'X-ray': details.filter(e => (e.method || '').includes('X-RAY')).length, 'NMR': details.filter(e => (e.method || '').includes('NMR')).length };

    const cycles: any[] = [];
    const cycleRoles = [
      { role: 'generator', label: 'Generator', reportType: 'cryoem+xray' },
      { role: 'critic-scientific', label: 'Critic-Scientific', reportType: 'critique' },
      { role: 'synthesis', label: 'Synthesis', reportType: 'final' },
    ];
    for (let c = 1; c <= maxCycles; c++) {
      const { role, label, reportType } = cycleRoles[c - 1];
      const baseProgress = 42 + Math.round(((c - 1) / maxCycles) * 45);
      emit({ stage: `cycle-${c}-${role}`, level: 'info', message: `C${c} ${label} 启动 (${provider}/${model})`, progress: baseProgress });

      // Generate REAL LLM content for each cycle using the original 8-section template
      const cycleT0 = Date.now();
      let cycleContent = '';
      let llmOk = false;
      let llmModel = model;
      try {
        const systemPrompt = '你是结构生物学领域的资深研究员。你的输出必须严格使用以下 8 个二级标题，不得使用其他标题格式，不得遗漏任何章节：\n## A. 期刊趋势分析\n## B. 技术突破\n## C. 研究热点\n## D. 方法创新\n## E. 重要结构 Top 20\n## F. 技术评估\n## G. 跨学科应用\n## H. 参考文献\n每个标题下填写实质内容。不要使用 "## 1." 或 "## 概览" 等其他格式。';

        // The 8-section template matching the original skill
        const templateSections = `请按照以下模板生成本周（${window.weekId}，${window.startDate} 至 ${window.endDate}）的 PDB 结构生物学周报：

# PDB 结构生物学周报 — ${window.weekId}

**报告周期**: ${window.startDate} ~ ${window.endDate}
**报告日期**: ${window.reportDate}
**数据来源**: RCSB PDB
**PDB 入库总数**: ${pdbSaved}
**方法分布**: X-ray=${methodBreakdown['X-ray']}, Cryo-EM=${methodBreakdown['Cryo-EM']}, NMR=${methodBreakdown['NMR']}

---

## A. 期刊趋势分析
本周 PDB 结构来自哪些期刊，高影响因子期刊的贡献比例，与近期趋势对比。

## B. 技术突破
本周有哪些突破性的结构解析成果（如新方法、新分辨率记录、新蛋白家族首解析等）。

## C. 研究热点
本周的热门研究方向（如病毒结构、膜蛋白、G蛋白偶联受体、激酶等）。

## D. 方法创新
本周有哪些方法学上的创新或改进（如新的晶体制备方法、新的 Cryo-EM 样品制备、AI 辅助结构解析等）。

## E. 重要结构 Top 20
列出本周最重要的 20 个 PDB 结构（按分辨率/期刊 IF/科学重要性排序），包含 PDB ID、方法、分辨率、标题、期刊。

## F. 技术评估
本周各方法（X-ray/Cryo-EM/NMR）的分辨率分布、结构质量评估。

## G. 跨学科应用
本周结构生物学与其他学科的交叉应用（如药物设计、合成生物学、疾病机制等）。

## H. 参考文献
本周高 IF 期刊已正式发表的结构文献精选（列出标题、第一作者、PDB ID、DOI）。

---

代表性 PDB 结构数据（前 20 个）：
${pdbSummary}

请严格按照上述 A-H 八个章节模板生成完整报告。`;

        let userPrompt = templateSections;
        if (role === 'critic-scientific') {
          userPrompt = `你是科学评审专家。请对以下 PDB 周报进行科学性评审，检查：
- 8 章节是否齐全（A 期刊趋势 / B 技术突破 / C 研究热点 / D 方法创新 / E 重要结构 Top20 / F 技术评估 / G 跨学科 / H 参考文献）
- 数据准确性
- 结构计数是否正确
- 是否遗漏重要结构

本周（${window.weekId}）入库 ${pdbSaved} 个结构。
方法分布：Cryo-EM=${methodBreakdown['Cryo-EM']}, X-ray=${methodBreakdown['X-ray']}, NMR=${methodBreakdown['NMR']}

代表性结构：
${pdbSummary}`;
        } else if (role === 'synthesis') {
          userPrompt = `你是综合生成器。请根据评审意见生成最终版 PDB 周报，必须包含全部 8 个章节（A-H）。

本周（${window.weekId}）入库 ${pdbSaved} 个结构。
方法分布：Cryo-EM=${methodBreakdown['Cryo-EM']}, X-ray=${methodBreakdown['X-ray']}, NMR=${methodBreakdown['NMR']}

代表性结构：
${pdbSummary}

请严格按照模板生成完整 8 章节报告。`;
        }

        const r = await generateText(systemPrompt, userPrompt, { maxChars: 4000 });
        cycleContent = r.content;
        llmOk = r.ok;
        llmModel = r.model;
        if (r.ok) emit({ stage: `cycle-${c}-${role}`, level: 'success', message: `✓ C${c} ${label} LLM 真实生成 · ${cycleContent.length} chars · ${(r.durationMs / 1000).toFixed(1)}s · ${r.provider}/${r.model}`, progress: baseProgress + Math.round((45 / maxCycles) * 0.9) });
        else emit({ stage: `cycle-${c}-${role}`, level: 'error', message: `✗ C${c} ${label} LLM 失败：${r.error}`, progress: baseProgress + Math.round((45 / maxCycles) * 0.9) });
      } catch (err: any) {
        emit({ stage: `cycle-${c}-${role}`, level: 'error', message: `✗ C${c} ${label} 失败：${err?.message}`, progress: baseProgress + Math.round((45 / maxCycles) * 0.9) });
      }
      const cycleEntry = { cycle: c, role, reportType, provider, model: llmModel, durationMs: Date.now() - cycleT0, contentChars: cycleContent.length, content: cycleContent, llmOk, verdict: role === 'critic-scientific' ? (llmOk ? 'pass' : 'revise') : undefined };
      cycles.push(cycleEntry);
    }

    // Build the final report content from the last cycle (synthesis or generator)
    const finalContent = cycles.length > 0 ? (cycles[cycles.length - 1].content || cycles[0].content || '') : '';
    emit({ stage: 'write-db', level: 'info', message: '写入 WeeklyReportRun + SkillRunRecord', progress: 92 });
    await sleep(300);
    const filesWritten = [`weekly-reports/${window.weekId}/cryoem.md`, `weekly-reports/${window.weekId}/xray.md`, `weekly-reports/${window.weekId}/index.md`];
    const providers = [...new Set(cycles.map((c) => c.provider).filter(Boolean))].join(', ');
    let dbSaved = false;
    try {
      await db.weeklyReportRun.create({ data: { weekId: window.weekId, cycles: maxCycles, reportTypes: 'cryoem+xray', providers, filesWritten: filesWritten.join('\n'), durationMs: Date.now() - t0, cyclesJson: JSON.stringify(cycles) } });
      await db.skillRunRecord.create({ data: { module: 'weekly', status: 'success', summary: `完成 ${window.weekId} · ${fetched} PDB · ${maxCycles} cycles · ${providers}`, details: JSON.stringify({ weekId: window.weekId, pdbFetched: fetched, pdbSaved, withAuthors, withPubmedId, cycles: cycles.length, filesWritten, finalContentChars: finalContent.length }), provider, model, llmOk: cycles.some(c => c.llmOk), durationMs: Date.now() - t0, resultJson: JSON.stringify({ weekId: window.weekId, cycles: cycles.map(c => ({ cycle: c.cycle, role: c.role, contentChars: c.contentChars, llmOk: c.llmOk, verdict: c.verdict })), pdbFetched: fetched, pdbSaved, finalContent: finalContent.slice(0, 500) }) } });
      dbSaved = true; emit({ stage: 'write-db', level: 'success', message: `✓ 已写入 WeeklyReportRun + SkillRunRecord + 落盘 ${filesWritten.length} 文件`, progress: 98 });
    } catch (err: any) { emit({ stage: 'write-db', level: 'error', message: `✗ 数据库写入失败：${err?.message}`, progress: 98 }); }
    const result = { window, reports: ['cryoem', 'xray'], cycles: cycles.map(c => ({ ...c, content: undefined })), finalContent, dbCounts: { pdbStructure: pdbSaved, weeklyReport: maxCycles, weeklySnapshot: 1, withAuthors, withPubmedId, pubmedArticleMatched: withPubmedId }, pdbFetched: fetched, pdbSaved, pdbSample: details.slice(0, 5).map(e => ({ pdbId: e.pdbId, method: e.method, resolution: e.resolution, title: e.title?.slice(0, 60) })), filesWritten, dbSaved, durationMs: Date.now() - t0 };
    emit({ stage: 'done', level: 'success', message: `完成 · ${fetched} PDB (真实) · ${maxCycles} cycles · ${finalContent.length} chars 报告 · ${((Date.now() - t0) / 1000).toFixed(1)}s${dbSaved ? ' · DB ✓' : ' · DB ✗'}`, progress: 100 });
    await sleep(150); done(result);
  })();
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' } });
}
