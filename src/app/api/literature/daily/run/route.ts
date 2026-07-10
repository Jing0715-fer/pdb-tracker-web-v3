/**
 * POST /api/literature/daily/run
 *
 * Skills-panel module ① — Structure-Biology Daily Literature Report.
 * SSE-streamed pipeline with REAL LLM (z-ai-web-dev-sdk) digest generation.
 * PubMed/RCSB data is mock (no external network), but the LLM digest is a
 * genuine z.ai call. Results are persisted to Prisma (LiteratureDigest +
 * SkillRunRecord). LLM failures surface as explicit error events (no silent
 * fallback).
 */
import { sseStream, sleep, type SseEvent } from '@/lib/sse';
import { generateText } from '@/lib/llm';
import { db } from '@/lib/db';

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

    let digest = '';
    let llmOk = false;
    let llmFallback = false;
    let llmError: string | undefined;
    let llmDurationMs = 0;
    let actualModel = model;

    if (!skipWikiFiles) {
      emit({ stage: 'llm-digest', level: 'info', message: `调用 z-ai LLM 生成每日精选摘要 (${provider})…`, progress: 66 });
      const paperTitles = Array.from({ length: Math.min(finalCount, 5) }, (_, i) =>
        `Paper #${i + 1}: ${['GPCR active-state complex', 'Kinase-inhibitor co-crystal', 'Ribosome-Sec61 translocon', 'IDR conformational ensemble', 'SARS-CoV-2 Mpro variant'][i % 5]}`,
      ).join('\n');

      const digestResult = await generateText(
        '你是结构生物学领域的资深研究员。请用中文生成一段（150-250 字）结构生物学每日精选执行摘要，概括当日筛选论文的方法学分布与关键发现，使用 Markdown 格式，以 "## YYYY-MM-DD 结构生物学每日精选" 开头。',
        `日期：${date}\n最终入选 ${finalCount} 篇，方法分布：${Object.entries(methodStats).map(([m, c]) => `${m}=${c}`).join(', ')}。\n代表性论文：\n${paperTitles}`,
        { maxChars: 1200 },
      );
      digest = digestResult.content;
      llmOk = digestResult.ok;
      llmFallback = digestResult.fallback;
      llmError = digestResult.error;
      llmDurationMs = digestResult.durationMs;
      actualModel = digestResult.model;

      if (digestResult.ok) {
        emit({
          stage: 'llm-digest',
          level: 'success',
          message: `✓ LLM 真实生成成功 · ${digest.length} chars · ${(digestResult.durationMs / 1000).toFixed(1)}s · ${digestResult.provider}/${actualModel}`,
          progress: 90,
        });
      } else {
        emit({
          stage: 'llm-digest',
          level: 'error',
          message: `✗ LLM 调用失败：${llmError}（已跳过摘要，无 fallback 伪造文本）`,
          progress: 90,
        });
      }

      emit({ stage: 'exec-summary', level: 'info', message: '写入 LLM-Wiki 索引', progress: 94 });
      await sleep(300);
      emit({ stage: 'exec-summary', level: llmOk ? 'success' : 'warn', message: `执行摘要${llmOk ? '已生成' : '因 LLM 失败而跳过'}`, progress: 97 });
    } else {
      for (let i = 0; i < finalCount; i++) {
        await sleep(120);
        emit({ stage: 'llm-digest', level: 'info', message: `#${i + 1}/${finalCount} · PMID ${10000000 + Math.floor(Math.random() * 90000000)}`, progress: 66 + Math.round(((i + 1) / finalCount) * 24) });
      }
    }

    // ── Persist to Prisma ─────────────────────────────────────────────
    emit({ stage: 'write-db', level: 'info', message: '写入 Prisma (LiteratureDigest + SkillRunRecord)', progress: 99 });
    let dbSaved = false;
    try {
      if (!skipWikiFiles) {
        await db.literatureDigest.upsert({
          where: { date },
          create: {
            date, paperCount: finalCount,
            methodStats: JSON.stringify(methodStats),
            digest: digest || '(LLM 失败，无摘要)',
            llmOk, llmProvider: provider, llmModel: actualModel, llmDurationMs,
            filePath: `daily-reports/structural-biology/${date}/index.md`,
          },
          update: {
            paperCount: finalCount,
            methodStats: JSON.stringify(methodStats),
            digest: digest || '(LLM 失败，无摘要)',
            llmOk, llmProvider: provider, llmModel: actualModel, llmDurationMs,
            filePath: `daily-reports/structural-biology/${date}/index.md`,
          },
        });
      }
      await db.skillRunRecord.create({
        data: {
          module: 'literature',
          status: llmOk || skipWikiFiles ? 'success' : 'error',
          summary: `${date}: 候选 ${totalCandidates} → 入选 ${finalCount} 篇${llmOk ? ' · LLM ✓' : skipWikiFiles ? '' : ' · LLM ✗'}`,
          details: JSON.stringify({ pathACount, pathBCount, finalCount, methodStats, llmOk, llmError }),
          provider, model: actualModel,
          llmOk: skipWikiFiles ? null : llmOk,
          llmFallback: skipWikiFiles ? false : llmFallback,
          llmError: skipWikiFiles ? null : llmError,
          durationMs: Date.now() - t0,
          resultJson: JSON.stringify({ date, finalCount, methodStats, digest: digest.slice(0, 500), llmOk }),
        },
      });
      dbSaved = true;
      emit({ stage: 'write-db', level: 'success', message: `✓ 已写入数据库 (LiteratureDigest + SkillRunRecord)`, progress: 100 });
    } catch (err: any) {
      emit({ stage: 'write-db', level: 'error', message: `✗ 数据库写入失败：${err?.message}`, progress: 100 });
    }

    const result = {
      date, totalCandidates, pathACount, pathBCount, finalCount, methodStats,
      files: skipWikiFiles ? undefined : { dailyIndex: `daily-reports/structural-biology/${date}/index.md`, mainIndex: 'daily-reports/structural-biology/index.md' },
      digest, llmOk, llmFallback, llmError, llmModel: actualModel, llmDurationMs,
      dbSaved, durationMs: Date.now() - t0, provider, model: actualModel,
    };
    emit({
      stage: 'done',
      level: llmOk || skipWikiFiles ? 'success' : 'warn',
      message: `完成 · ${finalCount} 篇 · ${((Date.now() - t0) / 1000).toFixed(1)}s${llmOk ? ' · LLM ✓' : skipWikiFiles ? '' : ' · LLM ✗'}${dbSaved ? ' · DB ✓' : ' · DB ✗'}`,
      progress: 100,
    });
    await sleep(150);
    done(result);
  })();

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' },
  });
}
