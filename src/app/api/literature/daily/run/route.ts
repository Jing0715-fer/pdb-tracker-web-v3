/**
 * POST /api/literature/daily/run
 *
 * Skills-panel module ① — Structure-Biology Daily Literature Report.
 * SSE-streamed pipeline with real LLM (z-ai-web-dev-sdk) digest generation.
 * Pure mock data for PubMed/RCSB (no external network) so the module is
 * fully testable in the sandbox.
 */
import { sseStream, sleep, type SseEvent } from '@/lib/sse';
import { generateText } from '@/lib/llm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const date: string = body.date || new Date().toISOString().slice(0, 10);
  const windowDays: number = Number(body.windowDays ?? 3);
  const maxPathA: number = Number(body.maxPathA ?? 300);
  const maxPathB: number = Number(body.maxPathB ?? 50);
  const maxPapers: number = Number(body.maxPapers ?? 20);
  const skipWikiFiles: boolean = !!body.skipWikiFiles;
  const provider: string = body.llm?.provider || 'zai';
  const model: string = body.llm?.model || 'glm-4.6';

  const { stream, progress, done } = sseStream();

  (async () => {
    const t0 = Date.now();
    const emit = (e: SseEvent) => progress(e);

    emit({ stage: 'init', level: 'info', message: `启动 literature-daily · date=${date} ±${windowDays}d`, progress: 2 });
    await sleep(400);

    emit({ stage: 'pubmed-pathA', level: 'info', message: `Path A: MeSH + 方法关键词检索 (上限 ${maxPathA})`, progress: 8 });
    await sleep(700);
    const pathACount = Math.min(maxPathA, 180 + Math.floor(Math.random() * 120));
    emit({ stage: 'pubmed-pathA', level: 'success', message: `Path A 命中 ${pathACount} 篇`, progress: 18 });

    emit({ stage: 'pubmed-pathB', level: 'info', message: `Path B: 高 IF 期刊 + 方法关键词 (上限 ${maxPathB})`, progress: 24 });
    await sleep(600);
    const pathBCount = Math.min(maxPathB, 28 + Math.floor(Math.random() * 24));
    emit({ stage: 'pubmed-pathB', level: 'success', message: `Path B 命中 ${pathBCount} 篇`, progress: 34 });

    emit({ stage: 'dedup', level: 'info', message: '去重 + 排序 + 时间窗口过滤', progress: 42 });
    await sleep(500);
    const totalCandidates = pathACount + pathBCount;
    emit({ stage: 'dedup', level: 'success', message: `去重后候选 ${totalCandidates} 篇`, progress: 48 });

    emit({ stage: 'method-filter', level: 'info', message: '方法分类：Cryo-EM / X-ray / NMR / AlphaFold', progress: 54 });
    await sleep(600);
    const methodStats: Record<string, number> = {
      'Cryo-EM': Math.floor(maxPapers * 0.35),
      'X-ray': Math.floor(maxPapers * 0.40),
      'NMR': Math.floor(maxPapers * 0.15),
      'AlphaFold': Math.floor(maxPapers * 0.10),
    };
    const finalCount = Object.values(methodStats).reduce((a, b) => a + b, 0);
    emit({ stage: 'method-filter', level: 'success', message: `最终入选 ${finalCount} 篇`, progress: 62 });

    emit({ stage: 'llm-digest', level: 'info', message: `逐篇 LLM 中文研究概要 (${provider}/${model})`, progress: 66 });
    await sleep(900);

    let digest = '';
    let llmFallback = false;
    if (!skipWikiFiles) {
      const paperTitles = Array.from({ length: Math.min(finalCount, 5) }, (_, i) =>
        `Paper #${i + 1}: ${['GPCR active-state complex', 'Kinase-inhibitor co-crystal', 'Ribosome-Sec61 translocon', 'IDR conformational ensemble', 'SARS-CoV-2 Mpro variant'][i % 5]}`,
      ).join('\n');

      const digestResult = await generateText(
        '你是结构生物学领域的资深研究员。请用中文生成一段（150-250 字）结构生物学每日精选执行摘要，概括当日筛选论文的方法学分布与关键发现，使用 Markdown 格式，以 "## YYYY-MM-DD 结构生物学每日精选" 开头。',
        `日期：${date}\n最终入选 ${finalCount} 篇，方法分布：${Object.entries(methodStats).map(([m, c]) => `${m}=${c}`).join(', ')}。\n代表性论文：\n${paperTitles}`,
        { maxChars: 1200 },
      );
      digest = digestResult.content;
      llmFallback = digestResult.fallback;
      emit({
        stage: 'llm-digest',
        level: digestResult.fallback ? 'warn' : 'success',
        message: `LLM 摘要${digestResult.fallback ? ' (fallback)' : ''} · ${digest.length} chars · ${(digestResult.durationMs / 1000).toFixed(1)}s`,
        progress: 90,
      });

      emit({ stage: 'exec-summary', level: 'info', message: '生成执行摘要 + 写入 LLM-Wiki 索引', progress: 94 });
      await sleep(300);
      emit({ stage: 'exec-summary', level: 'success', message: `执行摘要已生成${llmFallback ? ' (fallback)' : ''}`, progress: 97 });
    } else {
      for (let i = 0; i < finalCount; i++) {
        await sleep(120);
        emit({ stage: 'llm-digest', level: 'info', message: `#${i + 1}/${finalCount} · PMID ${10000000 + Math.floor(Math.random() * 90000000)}`, progress: 66 + Math.round(((i + 1) / finalCount) * 24) });
      }
    }

    emit({ stage: 'write-db', level: 'info', message: '写入 PubMedArticle 表 + daily-reports 索引', progress: 99 });
    await sleep(300);

    const result = {
      date, totalCandidates, pathACount, pathBCount, finalCount, methodStats,
      files: skipWikiFiles ? undefined : { dailyIndex: `daily-reports/structural-biology/${date}/index.md`, mainIndex: 'daily-reports/structural-biology/index.md' },
      digest, llmFallback, durationMs: Date.now() - t0, provider, model,
    };
    emit({ stage: 'done', level: 'success', message: `完成 · ${finalCount} 篇 · ${((Date.now() - t0) / 1000).toFixed(1)}s${llmFallback ? ' · LLM fallback' : ''}`, progress: 100 });
    await sleep(150);
    done(result);
  })();

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' },
  });
}
