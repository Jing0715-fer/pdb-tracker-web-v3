import { sseStream, sleep, type SseEvent } from '@/lib/sse';
import { generateText } from '@/lib/llm';
import { esearch, efetch, classifyMethod, PATH_A_QUERY, PATH_B_QUERY, type FetchedPaper } from '@/lib/pubmed';
import { db } from '@/lib/db';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const date = body.date || new Date().toISOString().slice(0, 10);
  const windowDays = Number(body.windowDays ?? 3);
  const maxPathA = Number(body.maxPathA ?? 300);
  const maxPathB = Number(body.maxPathB ?? 50);
  const skipWikiFiles = !!body.skipWikiFiles;
  const provider = body.llm?.provider || 'cli:hermes';
  const model = body.llm?.model || 'hermes';
  const { stream, progress, done } = sseStream();
  (async () => {
    const t0 = Date.now();
    const emit = (e: SseEvent) => progress(e);
    emit({ stage: 'init', level: 'info', message: `启动 literature-daily · date=${date} ±${windowDays}d`, progress: 2 });
    await sleep(300);
    emit({ stage: 'pubmed-pathA', level: 'info', message: `Path A: MeSH + 方法关键词 (上限 ${maxPathA}) · PubMed 真实检索`, progress: 6 });
    let pathAIds: string[] = [];
    try { pathAIds = await esearch(PATH_A_QUERY, date, windowDays, maxPathA); emit({ stage: 'pubmed-pathA', level: 'success', message: `✓ Path A 命中 ${pathAIds.length} 篇 (PubMed)`, progress: 16 }); } catch (err: any) { emit({ stage: 'pubmed-pathA', level: 'error', message: `✗ Path A 检索失败：${err?.message}`, progress: 16 }); }
    emit({ stage: 'pubmed-pathB', level: 'info', message: `Path B: 高 IF 期刊 + 方法关键词 (上限 ${maxPathB}) · PubMed 真实检索`, progress: 22 });
    let pathBIds: string[] = [];
    try { pathBIds = await esearch(PATH_B_QUERY, date, windowDays, maxPathB); emit({ stage: 'pubmed-pathB', level: 'success', message: `✓ Path B 命中 ${pathBIds.length} 篇 (PubMed)`, progress: 30 }); } catch (err: any) { emit({ stage: 'pubmed-pathB', level: 'error', message: `✗ Path B 检索失败：${err?.message}`, progress: 30 }); }
    const allIdsRaw = [...pathAIds, ...pathBIds];
    const allIds = [...new Set(allIdsRaw)];
    const dupCount = allIdsRaw.length - allIds.length;
    emit({ stage: 'dedup', level: 'success', message: `去重完成：Path A ${pathAIds.length} + Path B ${pathBIds.length} = ${allIdsRaw.length} 篇 → 去重 ${dupCount} 篇 → ${allIds.length} 篇候选`, progress: 36 });
    await sleep(200);
    emit({ stage: 'efetch', level: 'info', message: `eFetch 拉取 ${allIds.length} 篇全文元数据`, progress: 40 });
    let papers: FetchedPaper[] = [];
    try { papers = await efetch(allIds); emit({ stage: 'efetch', level: 'success', message: `✓ eFetch 成功获取 ${papers.length} 篇`, progress: 48 }); } catch (err: any) { emit({ stage: 'efetch', level: 'error', message: `✗ eFetch 失败：${err?.message}`, progress: 48 }); }
    emit({ stage: 'method-filter', level: 'info', message: 'LLM 方法分类（基于标题+摘要关键词）', progress: 52 });
    await sleep(200);
    const methodStats: Record<string, number> = { 'Cryo-EM': 0, 'X-ray': 0, 'NMR': 0, 'AlphaFold': 0 };
    for (const p of papers) { const m = classifyMethod(`${p.title} ${p.abstract}`); if (m) methodStats[m] = (methodStats[m] || 0) + 1; }
    const finalCount = papers.length;
    emit({ stage: 'method-filter', level: 'success', message: `方法分布：${Object.entries(methodStats).map(([m, c]) => `${m}=${c}`).join(', ')}（共 ${finalCount} 篇）`, progress: 58 });
    emit({ stage: 'write-pubmed', level: 'info', message: `写入 PubMedArticle 表（${papers.length} 篇，全部写入）`, progress: 62 });
    let pubmedSaved = 0;
    try {
      // Batch insert in chunks of 20 to avoid blocking + show progress
      const batchSize = 20;
      for (let i = 0; i < papers.length; i += batchSize) {
        const batch = papers.slice(i, i + batchSize);
        for (const p of batch) {
          await db.$executeRaw`INSERT INTO PubMedArticle (pubmedId, title, authors, journal, pubYear, pubMonth, pubDay, abstract, doi, createdAt) VALUES (${p.pmid}, ${p.title}, ${p.authors}, ${p.journal}, ${p.pubYear}, ${p.pubMonth}, ${p.pubDay}, ${p.abstract}, ${p.doi}, CURRENT_TIMESTAMP) ON CONFLICT(pubmedId) DO UPDATE SET title = excluded.title, authors = excluded.authors, journal = excluded.journal, pubYear = COALESCE(NULLIF(excluded.pubYear, ''), PubMedArticle.pubYear), pubMonth = COALESCE(NULLIF(excluded.pubMonth, ''), PubMedArticle.pubMonth), pubDay = COALESCE(NULLIF(excluded.pubDay, ''), PubMedArticle.pubDay), abstract = COALESCE(NULLIF(excluded.abstract, ''), PubMedArticle.abstract), doi = COALESCE(NULLIF(excluded.doi, ''), PubMedArticle.doi)`;
          pubmedSaved++;
        }
        // Emit progress every batch
        if (i + batchSize < papers.length) {
          emit({ stage: 'write-pubmed', level: 'info', message: `写入中… ${pubmedSaved}/${papers.length}`, progress: 62 + Math.round((pubmedSaved / papers.length) * 8) });
        }
      }
      emit({ stage: 'write-pubmed', level: 'success', message: `✓ 已写入 ${pubmedSaved} 篇 PubMedArticle`, progress: 70 });
    } catch (err: any) { emit({ stage: 'write-pubmed', level: 'error', message: `✗ PubMedArticle 写入失败：${err?.message}`, progress: 70 }); }
    let digest = '', llmOk = false, llmFallback = false, llmError: string | undefined, llmDurationMs = 0, actualModel = model;
    if (!skipWikiFiles && papers.length > 0) {
      emit({ stage: 'llm-digest', level: 'info', message: `调用 LLM 生成每日精选摘要 (${provider})…`, progress: 74 });
      const paperTitles = papers.slice(0, 5).map((p, i) => `Paper #${i + 1}: ${p.title} (${p.journal}, PMID:${p.pmid})`).join('\n');
      const r = await generateText('你是结构生物学领域的资深研究员。请用中文生成一段（150-250 字）结构生物学每日精选执行摘要，概括当日筛选论文的方法学分布与关键发现，使用 Markdown 格式，以 "## YYYY-MM-DD 结构生物学每日精选" 开头。', `日期：${date}\nPubMed 真实检索 ${finalCount} 篇结构生物学论文，方法分布：${Object.entries(methodStats).map(([m, c]) => `${m}=${c}`).join(', ')}。\n代表性论文：\n${paperTitles}`, { maxChars: 1200 });
      digest = r.content; llmOk = r.ok; llmFallback = r.fallback; llmError = r.error; llmDurationMs = r.durationMs; actualModel = r.model;
      if (r.ok) emit({ stage: 'llm-digest', level: 'success', message: `✓ LLM 真实生成成功 · ${digest.length} chars · ${(r.durationMs / 1000).toFixed(1)}s · ${r.provider}/${actualModel}`, progress: 90 });
      else emit({ stage: 'llm-digest', level: 'error', message: `✗ LLM 调用失败：${llmError}（已跳过摘要，无 fallback 伪造文本）`, progress: 90 });
    }
    emit({ stage: 'write-db', level: 'info', message: '写入 LiteratureDigest + SkillRunRecord', progress: 94 });
    let dbSaved = false;
    try {
      if (!skipWikiFiles) { await db.literatureDigest.upsert({ where: { date }, create: { date, paperCount: finalCount, methodStats: JSON.stringify(methodStats), digest: digest || '(LLM 失败，无摘要)', llmOk, llmProvider: provider, llmModel: actualModel, llmDurationMs, filePath: `daily-reports/structural-biology/${date}/index.md` }, update: { paperCount: finalCount, methodStats: JSON.stringify(methodStats), digest: digest || '(LLM 失败，无摘要)', llmOk, llmProvider: provider, llmModel: actualModel, llmDurationMs, filePath: `daily-reports/structural-biology/${date}/index.md` } }); }
      await db.skillRunRecord.create({ data: { module: 'literature', status: llmOk || skipWikiFiles ? 'success' : 'error', summary: `${date}: PubMed ${finalCount} 篇 (真实) · ${pubmedSaved} 入库${llmOk ? ' · LLM ✓' : skipWikiFiles ? '' : ' · LLM ✗'}`, details: JSON.stringify({ pathACount: pathAIds.length, pathBCount: pathBIds.length, finalCount, methodStats, pubmedSaved, llmOk, llmError }), provider, model: actualModel, llmOk: skipWikiFiles ? null : llmOk, llmFallback: skipWikiFiles ? false : llmFallback, llmError: skipWikiFiles ? null : llmError, durationMs: Date.now() - t0, resultJson: JSON.stringify({ date, finalCount, methodStats, pubmedSaved, digest: digest.slice(0, 500), llmOk }) } });
      dbSaved = true; emit({ stage: 'write-db', level: 'success', message: `✓ 已写入 LiteratureDigest + SkillRunRecord`, progress: 99 });
    } catch (err: any) { emit({ stage: 'write-db', level: 'error', message: `✗ 数据库写入失败：${err?.message}`, progress: 99 }); }
    const result = { date, totalCandidates: allIds.length, pathACount: pathAIds.length, pathBCount: pathBIds.length, finalCount, methodStats, pubmedSaved, paperSample: papers.slice(0, 5).map(p => ({ pmid: p.pmid, title: p.title.slice(0, 60), journal: p.journal, doi: p.doi })), files: skipWikiFiles ? undefined : { dailyIndex: `daily-reports/structural-biology/${date}/index.md`, mainIndex: 'daily-reports/structural-biology/index.md' }, digest, llmOk, llmFallback, llmError, llmModel: actualModel, llmDurationMs, dbSaved, durationMs: Date.now() - t0, provider, model: actualModel, dataSource: 'PubMed (NCBI E-utilities)' };
    emit({ stage: 'done', level: llmOk || skipWikiFiles ? 'success' : 'warn', message: `完成 · PubMed ${finalCount} 篇 (真实) · ${pubmedSaved} 入库 · ${((Date.now() - t0) / 1000).toFixed(1)}s${llmOk ? ' · LLM ✓' : skipWikiFiles ? '' : ' · LLM ✗'}${dbSaved ? ' · DB ✓' : ' · DB ✗'}`, progress: 100 });
    await sleep(150); done(result);
  })();
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' } });
}
