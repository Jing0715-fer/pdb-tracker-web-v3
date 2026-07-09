/**
 * POST /api/literature/daily/run
 *
 * Mock of the pdb-tracker-web-v3 literature-daily skill. Faithfully mirrors
 * the original SSE event stream + final `done` payload shape, but with
 * simulated, deterministic latencies so the panel can be exercised end-to-end
 * without making real PubMed / LLM calls.
 */
import { sseStream, sleep, type SseEvent } from '@/lib/sse';

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
    for (let i = 0; i < finalCount; i++) {
      await sleep(120);
      emit({
        stage: 'llm-digest',
        level: 'info',
        message: `#${i + 1}/${finalCount} · PMID ${10000000 + Math.floor(Math.random() * 90000000)}`,
        progress: 66 + Math.round(((i + 1) / finalCount) * 24),
      });
    }

    let digest = '';
    if (!skipWikiFiles) {
      emit({ stage: 'exec-summary', level: 'info', message: '生成执行摘要 + 写入 LLM-Wiki 索引', progress: 94 });
      await sleep(500);
      digest = `## ${date} 结构生物学每日精选\n\n本日共筛选 ${finalCount} 篇高质量结构生物学论文，覆盖 Cryo-EM、X-ray、NMR 与 AlphaFold 四大方法学方向。其中 Cryo-EM 方向聚焦于膜蛋白与大分子复合体的高分辨解析；X-ray 晶体学方向以药物靶点结构为主；NMR 方向集中于动态构象研究；AlphaFold 方向则体现了预测结构与实验结构的交叉验证趋势。\n\n关键发现：多个研究团队报道了 GPCR 家族成员的激活态构象，为药物设计提供了新靶点。`;
      emit({ stage: 'exec-summary', level: 'success', message: '执行摘要已生成', progress: 97 });
    }

    emit({ stage: 'write-db', level: 'info', message: '写入 PubMedArticle 表 + daily-reports 索引', progress: 99 });
    await sleep(300);

    const result = {
      date,
      totalCandidates,
      pathACount,
      pathBCount,
      finalCount,
      methodStats,
      files: skipWikiFiles
        ? undefined
        : {
            dailyIndex: `daily-reports/structural-biology/${date}/index.md`,
            mainIndex: 'daily-reports/structural-biology/index.md',
          },
      digest,
      durationMs: Date.now() - t0,
      provider,
      model,
    };
    emit({ stage: 'done', level: 'success', message: `完成 · ${finalCount} 篇 · ${((Date.now() - t0) / 1000).toFixed(1)}s`, progress: 100 });
    await sleep(150);
    done(result);
  })();

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
