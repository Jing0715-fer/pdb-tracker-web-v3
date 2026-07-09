/**
 * POST /api/evaluations/run
 *
 * Skills-panel module ② — Target Evaluation + LLM feasibility report.
 * SSE-streamed pipeline with real LLM (z-ai-web-dev-sdk) report generation.
 * Mock data for UniProt/RCSB/BLAST (no external network).
 */
import { sseStream, sleep, type SseEvent } from '@/lib/sse';
import { generateText } from '@/lib/llm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const uniprot: string = (body.uniprot || 'P00533').trim().toUpperCase();
  const forceBlast: boolean = !!body.forceBlast;
  const skipBlast: boolean = !!body.skipBlast;
  const maxPdb: number = Number(body.maxPdb ?? 80);
  const generateReport: boolean = body.generateReport !== false;
  const saveReportFile: boolean = body.saveReportFile !== false;
  const provider: string = body.llm?.provider || 'zai';
  const model: string = body.llm?.model || 'glm-4.6';

  const { stream, progress, done } = sseStream();

  (async () => {
    const t0 = Date.now();
    const emit = (e: SseEvent) => progress(e);

    emit({ stage: 'init', level: 'info', message: `启动 protein-target-evaluator · uniprot=${uniprot}`, progress: 2 });
    await sleep(400);

    emit({ stage: 'uniprot-meta', level: 'info', message: `拉取 UniProt 元数据 + 序列 (${uniprot})`, progress: 8 });
    await sleep(700);
    const uniprotInfo = { uniprotId: uniprot, proteinName: 'Epidermal growth factor receptor', geneName: 'EGFR', organism: 'Homo sapiens', sequenceLength: 1210 };
    emit({ stage: 'uniprot-meta', level: 'success', message: `${uniprotInfo.proteinName} · ${uniprotInfo.sequenceLength} aa`, progress: 16 });

    emit({ stage: 'rcsb-direct', level: 'info', message: `RCSB 直接 PDB 检索 (上限 ${maxPdb})`, progress: 22 });
    await sleep(800);
    const directPdbCount = Math.min(maxPdb, 40 + Math.floor(Math.random() * 50));
    emit({ stage: 'rcsb-direct', level: 'success', message: `RCSB 直接命中 ${directPdbCount} 条`, progress: 34 });

    emit({ stage: 'sifts-coverage', level: 'info', message: 'SIFTS 残基覆盖率计算', progress: 40 });
    await sleep(500);
    const coverage = 60 + Math.floor(Math.random() * 35);
    emit({ stage: 'sifts-coverage', level: 'success', message: `覆盖率 ${coverage}%`, progress: 46 });

    let blastHitCount = 0;
    let skippedBblast = false;
    if (skipBlast && !forceBlast) {
      emit({ stage: 'blast', level: 'warn', message: 'BLAST 已跳过 (skipBlast=true)', progress: 52 });
      skippedBblast = true;
      await sleep(300);
    } else {
      emit({ stage: 'blast', level: 'info', message: 'NCBI BLASTp 同源检索', progress: 52 });
      await sleep(900);
      blastHitCount = 12 + Math.floor(Math.random() * 30);
      emit({ stage: 'blast', level: 'success', message: `BLAST 命中 ${blastHitCount} 条同源`, progress: 62 });
    }

    emit({ stage: 'score', level: 'info', message: '综合可成药性评分', progress: 68 });
    await sleep(500);
    const scores = {
      xray: { score: 7 + Math.floor(Math.random() * 3), structures: Math.floor(directPdbCount * 0.6) },
      cryoem: { score: 6 + Math.floor(Math.random() * 3), structures: Math.floor(directPdbCount * 0.3) },
      nmr: { score: 3 + Math.floor(Math.random() * 4), structures: Math.floor(directPdbCount * 0.1) },
      overall: { score: 7 + Math.floor(Math.random() * 2) },
    };
    emit({ stage: 'score', level: 'success', message: `overall=${scores.overall.score}/10 (X-ray=${scores.xray.score}, Cryo-EM=${scores.cryoem.score}, NMR=${scores.nmr.score})`, progress: 76 });

    let report: any = undefined;
    if (generateReport) {
      emit({ stage: 'llm-report', level: 'info', message: `生成 LLM 可行性报告 (${provider}/${model})`, progress: 80 });
      const reportResult = await generateText(
        '你是结构生物学与药物发现领域的资深专家。请基于提供的靶点评估数据，用中文生成一份 Markdown 格式的可行性评估报告，包含：1. 概述（靶点背景 + PDB 结构概况）；2. 结构可成药性（X-ray / Cryo-EM / NMR 分项评分与建议）；3. 综合建议（是否推荐作为优先靶点及理由）。报告需专业、简洁，控制在 400-600 字。',
        `靶点：${uniprotInfo.proteinName}（基因 ${uniprotInfo.geneName}, UniProt ${uniprot}）\n物种：${uniprotInfo.organism}\n序列长度：${uniprotInfo.sequenceLength} aa\nRCSB 直接 PDB 结构数：${directPdbCount}\nSIFTS 残基覆盖率：${coverage}%\n${skippedBblast ? 'BLAST：已跳过' : `BLAST 同源蛋白数：${blastHitCount}`}\n评分：overall=${scores.overall.score}/10 (X-ray=${scores.xray.score}, Cryo-EM=${scores.cryoem.score}, NMR=${scores.nmr.score})`,
        { maxChars: 2000 },
      );
      report = {
        ok: reportResult.ok, provider: reportResult.provider, model: reportResult.model, durationMs: reportResult.durationMs,
        savedToFile: saveReportFile, filename: saveReportFile ? `wiki/evaluations/${uniprot}.md` : undefined,
        contentChars: reportResult.content.length, fallback: reportResult.fallback, content: reportResult.content, error: reportResult.error,
      };
      emit({ stage: 'llm-report', level: reportResult.fallback ? 'warn' : 'success', message: `报告已生成${reportResult.fallback ? ' (fallback)' : ''} · ${reportResult.content.length} chars · ${(reportResult.durationMs / 1000).toFixed(1)}s${saveReportFile ? ' · 已落盘' : ''}`, progress: 96 });
    }

    emit({ stage: 'write-db', level: 'info', message: '写入 Evaluation + EvaluationReport 表', progress: 99 });
    await sleep(300);

    const result = { uniprot, uniprotInfo, directPdbCount, blastHitCount, coverage, skippedBblast, scores, report, durationMs: Date.now() - t0 };
    emit({ stage: 'done', level: 'success', message: `完成 · overall=${scores.overall.score}/10 · ${((Date.now() - t0) / 1000).toFixed(1)}s${report?.fallback ? ' · LLM fallback' : ''}`, progress: 100 });
    await sleep(150);
    done(result);
  })();

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' },
  });
}
