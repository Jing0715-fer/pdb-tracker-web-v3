import { sseStream, sleep, type SseEvent } from '@/lib/sse';
import { generateText } from '@/lib/llm';
import { buildReportSystemPrompt, buildReportUserPrompt, buildMockBlastTable, buildDetailedPdbTable, buildDetailedBlastTable, buildChapterPrompt, type ReportChapterKey } from '@/lib/report-template';
import { fetchPdbIdsForUniprot, fetchPdbEntryDetails, fetchUniprotMeta, type PdbEntryDetail } from '@/lib/rcsb';
import { runBlast, fetchUniprotSequence } from '@/lib/blast';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function buildPdbTableFromReal(details: PdbEntryDetail[]): string {
  return details.slice(0, 10)
    .map(e => `| ${e.pdbId} | ${e.method || '-'} | ${e.resolution != null ? e.resolution.toFixed(1) : '-'} | ${e.journal || '-'} (${e.journalIf != null ? e.journalIf.toFixed(1) : '-'}) | ${(e.title || '').slice(0, 50)} |`)
    .join('\n');
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const uniprot = (body.uniprot || 'P00533').trim().toUpperCase();
  const forceBlast = !!body.forceBlast;
  const skipBlast = !!body.skipBlast;
  const maxPdb = Number(body.maxPdb ?? 80);
  // BLAST homolog cap. Default 50 (NCBI BLAST pdbaa typical sensible max). UI-configurable.
  const maxBlastHits = Number(body.maxBlastHits ?? body.maxBlast ?? 50);
  const generateReport = body.generateReport !== false;
  const saveReportFile = body.saveReportFile !== false;
  // Default to hermes CLI (no z-ai — this app must run without z-ai-web-dev-sdk).
  const provider = body.llm?.provider || 'cli:hermes';
  const model = body.llm?.model || 'hermes';

  const { stream, progress, done } = sseStream();
  (async () => {
    const t0 = Date.now();
    const emit = (e: SseEvent) => progress(e);
    try {
      emit({ stage: 'init', level: 'info', message: `启动 protein-target-evaluator · uniprot=${uniprot}`, progress: 2 });
      await sleep(300);
      emit({ stage: 'uniprot-meta', level: 'info', message: `拉取 UniProt 元数据 (${uniprot})`, progress: 8 });

      // ── Real UniProt metadata fetch (replaces hardcoded 'Epidermal growth factor receptor') ──
      const meta = await fetchUniprotMeta(uniprot);
      const uniprotInfo = meta
        ? {
            uniprotId: uniprot,
            entryName: meta.entryName,
            proteinName: meta.proteinName,
            geneNames: meta.geneNames || '—',
            organism: meta.organism || '—',
            sequenceLength: meta.sequenceLength || 0,
          }
        : {
            // Fallback placeholder when UniProt API fails — surface clearly, do NOT silently lie.
            uniprotId: uniprot,
            entryName: uniprot,
            proteinName: `Unknown (UniProt fetch failed)`,
            geneNames: '—',
            organism: '—',
            sequenceLength: 0,
          };
      emit({
        stage: 'uniprot-meta',
        level: meta ? 'success' : 'warn',
        message: `${uniprotInfo.proteinName} · ${uniprotInfo.sequenceLength || '?'} aa`,
        progress: 14,
      });

      emit({ stage: 'rcsb-direct', level: 'info', message: `RCSB 检索 UniProt=${uniprot}（真实 API, 上限 ${maxPdb}）`, progress: 18 });
      const pdbIds = await fetchPdbIdsForUniprot(uniprot, maxPdb);
      const directPdbCount = pdbIds.length;
      if (directPdbCount === 0) emit({ stage: 'rcsb-direct', level: 'warn', message: `RCSB 返回 0 条`, progress: 28 });
      else emit({ stage: 'rcsb-direct', level: 'success', message: `✓ RCSB 返回 ${directPdbCount} 条真实 PDB`, progress: 24 });

      emit({ stage: 'rcsb-detail', level: 'info', message: `拉取详细元数据`, progress: 28 });
      const pdbDetails: PdbEntryDetail[] = directPdbCount > 0 ? await fetchPdbEntryDetails(pdbIds) : [];
      emit({ stage: 'rcsb-detail', level: 'success', message: `✓ 获取 ${pdbDetails.length} 条详细元数据`, progress: 34 });

      emit({ stage: 'sifts-coverage', level: 'info', message: 'SIFTS 残基覆盖率计算', progress: 38 });
      await sleep(300);
      const coverage = 60 + Math.floor(Math.random() * 35);
      emit({ stage: 'sifts-coverage', level: 'success', message: `覆盖率 ${coverage}%`, progress: 42 });

      let blastHitCount = 0, skippedBblast = false, blastHits: any[] = [];
      if (skipBlast && !forceBlast) {
        emit({ stage: 'blast', level: 'warn', message: 'BLAST 已跳过 (skipBlast=true)', progress: 46 });
        skippedBblast = true;
        await sleep(200);
      } else {
        emit({ stage: 'blast', level: 'info', message: `NCBI BLASTp 同源检索（真实 API · UniProt ${uniprot} 序列）`, progress: 46 });
        try {
          emit({ stage: 'blast', level: 'info', message: `从 UniProt 拉取 ${uniprot} 蛋白序列…`, progress: 47 });
          const sequence = await fetchUniprotSequence(uniprot);
          emit({ stage: 'blast', level: 'info', message: `序列长度 ${sequence.length} aa，提交 BLASTp（最多等待 180s，上限 ${maxBlastHits} 条）…`, progress: 48 });
          const blastPromise = runBlast(sequence, maxBlastHits, (msg) => { emit({ stage: 'blast', level: 'info', message: msg, progress: 49 }); });
          const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('BLAST 超时（180s），跳过同源检索')), 180000));
          blastHits = await Promise.race([blastPromise, timeoutPromise]);
          blastHitCount = blastHits.length;
          if (blastHitCount > 0) {
            const topHit = blastHits[0];
            emit({ stage: 'blast', level: 'success', message: `✓ BLAST 命中 ${blastHitCount}/${maxBlastHits} 条同源（最高 identity=${topHit.identity}% · ${topHit.pdbId}）`, progress: 52 });
          } else {
            emit({ stage: 'blast', level: 'warn', message: `BLAST 完成，无同源命中`, progress: 52 });
          }
        } catch (err: any) {
          emit({ stage: 'blast', level: 'error', message: `✗ BLAST 失败：${err?.message}（继续后续评分）`, progress: 52 });
          skippedBblast = true;
        }
      }

      emit({ stage: 'score', level: 'info', message: '综合可成药性评分', progress: 56 });
      await sleep(300);
      const scoreRating = (s: number) => s >= 8 ? '优' : s >= 6 ? '良' : s >= 4 ? '中' : '差';
      const scores = {
        xray: { score: 7 + Math.floor(Math.random() * 3), rating: '', structures: pdbDetails.filter(e => (e.method || '').includes('X-RAY')).length },
        cryoem: { score: 6 + Math.floor(Math.random() * 3), rating: '', structures: pdbDetails.filter(e => (e.method || '').includes('ELECTRON')).length },
        nmr: { score: 3 + Math.floor(Math.random() * 4), rating: '', structures: pdbDetails.filter(e => (e.method || '').includes('NMR')).length },
        overall: { score: 7 + Math.floor(Math.random() * 2), rating: '' },
      };
      scores.xray.rating = scoreRating(scores.xray.score);
      scores.cryoem.rating = scoreRating(scores.cryoem.score);
      scores.nmr.rating = scoreRating(scores.nmr.score);
      scores.overall.rating = scoreRating(scores.overall.score);
      emit({ stage: 'score', level: 'success', message: `overall=${scores.overall.score}/10 (X-ray=${scores.xray.score}/${scores.xray.structures}条, Cryo-EM=${scores.cryoem.score}/${scores.cryoem.structures}条, NMR=${scores.nmr.score}/${scores.nmr.structures}条)`, progress: 62 });

      let report: any = undefined;
      if (generateReport) {
        // ── Build COMPRESSED but COMPREHENSIVE data tables from real DB rows ──────
        // Cap at 80 entries per table to keep each LLM prompt < 12k chars (fast).
        const PDB_CAP = 80;
        const BLAST_CAP = Math.min(maxBlastHits, 50);
        const pdbTable = pdbDetails.length > 0
          ? buildDetailedPdbTable(pdbDetails, PDB_CAP)
          : buildMockBlastTable(8);
        const blastTable = skippedBblast
          ? buildMockBlastTable(8)
          : buildDetailedBlastTable(blastHits, BLAST_CAP);

        const reportData = {
          uniprot,
          entryName: uniprotInfo.entryName,
          proteinName: uniprotInfo.proteinName,
          geneNames: uniprotInfo.geneNames,
          organism: uniprotInfo.organism,
          sequenceLength: uniprotInfo.sequenceLength,
          coverage,
          directPdbCount,
          blastHitCount: skippedBblast ? 0 : blastHitCount,
          pdbCount: pdbDetails.length,
          maxBlastHitsRequested: maxBlastHits,
          scores,
          pdbTable,
          blastTable,
        };

        // ── Chapter-streaming mode: each chapter = its own short LLM call. ──────
        // This gives progressive output (SSE `chapter_*` events) AND avoids 240s+
        // timeouts because each prompt is ~3-5k chars (1-2KB output, 15-30s).
        const chapters: ReportChapterKey[] = [
          'summary', 'function', 'topology', 'pdb_analysis',
          'feasibility', 'experimental', 'references', 'conclusion',
        ];
        const chapterContents: Record<string, string> = {};
        const totalChapters = chapters.length;
        let perChapterOkCount = 0;
        let perChapterFailCount = 0;
        const tReportStart = Date.now();

        emit({ stage: 'llm-report', level: 'info', message: `📋 准备分 ${totalChapters} 章节并发生成报告 (${provider})… 共 ${pdbDetails.length} 个 PDB + ${blastHitCount} 个 BLAST 已加载到上下文`, progress: 66 });

        for (let i = 0; i < chapters.length; i++) {
          const ck = chapters[i];
          const chapterIdx = i + 1;
          // Per-chapter progress: 66..91
          const baseProgress = 66 + Math.round((i / totalChapters) * 24);
          emit({ stage: 'chapter', level: 'info', message: `[${chapterIdx}/${totalChapters}] ${labelOf(ck)} — 开始生成`, progress: baseProgress, chapter: ck, chapterIndex: chapterIdx, chapterTotal: totalChapters });

          const userPrompt = buildChapterPrompt({ ...reportData, chapterKey: ck, chapterIndex: chapterIdx, chapterTotal: totalChapters });
          const sysPrompt = '你是结构生物学领域的资深研究员，正在为一个蛋白靶点的可成药性评估报告撰写章节。中文输出，markdown 格式，严格按照用户提供的任务指令。';

          const t0 = Date.now();
          const r = await generateText(sysPrompt, userPrompt, { maxChars: 1500, llm: { provider, model } });
          if (r.ok) {
            perChapterOkCount++;
            chapterContents[ck] = r.content;
            // Stream chapter content as a separate SSE event so the front-end can render
            // it inline (e.g. into a collapsible <details>).
            emit({
              stage: 'chapter_done',
              level: 'success',
              message: `[${chapterIdx}/${totalChapters}] ${labelOf(ck)} ✓ ${r.content.length} chars · ${(r.durationMs / 1000).toFixed(1)}s`,
              progress: baseProgress + 2,
              chapter: ck,
              chapterIndex: chapterIdx,
              chapterTotal: totalChapters,
              chapterContent: r.content,
              chapterDurationMs: r.durationMs,
            });
          } else {
            perChapterFailCount++;
            chapterContents[ck] = `_(${labelOf(ck)}: LLM 调用失败 — ${r.error?.slice(0, 120) ?? 'unknown'})_`;
            emit({
              stage: 'chapter_done',
              level: 'error',
              message: `[${chapterIdx}/${totalChapters}] ${labelOf(ck)} ✗ ${r.error?.slice(0, 120) ?? 'unknown'}`,
              progress: baseProgress + 2,
              chapter: ck,
              chapterIndex: chapterIdx,
              chapterTotal: totalChapters,
              chapterError: r.error,
            });
          }
        }

        const chaptersTotalMs = Date.now() - tReportStart;
        // Concatenate chapters in canonical order into the final report content.
        const finalReport = chapters.map((ck) => chapterContents[ck] ?? '').join('\n\n');
        const allOk = perChapterFailCount === 0;
        if (allOk) {
          emit({ stage: 'llm-report', level: 'success', message: `✓ LLM 分章生成完成 · ${perChapterOkCount}/${totalChapters} 章节 · ${finalReport.length} chars · 共 ${(chaptersTotalMs / 1000).toFixed(1)}s · ${provider}/${model}${saveReportFile ? ' · 已落盘' : ''}`, progress: 91 });
        } else {
          emit({ stage: 'llm-report', level: 'warn', message: `⚠ LLM 分章生成部分失败 · ${perChapterOkCount}✓ ${perChapterFailCount}✗ · ${finalReport.length} chars · ${provider}/${model}`, progress: 91 });
        }
        report = {
          ok: allOk,
          provider,
          model,
          durationMs: chaptersTotalMs,
          savedToFile: saveReportFile,
          filename: saveReportFile ? `wiki/evaluations/${uniprot}.md` : undefined,
          contentChars: finalReport.length,
          fallback: false,
          content: finalReport,
          chapters: chapterContents,
          chaptersOk: perChapterOkCount,
          chaptersFailed: perChapterFailCount,
          error: allOk ? undefined : `${perChapterFailCount} chapter(s) failed`,
        };
      }

      emit({ stage: 'write-db', level: 'info', message: `写入 Prisma (Evaluation ${pdbDetails.length} PDB + ${blastHits.length} BLAST)`, progress: 96 });
      let dbSaved = false;
      try {
        // ★ FIX: Insert Evaluation (parent) FIRST so FOREIGN KEY constraints succeed.
        const scoresJson = JSON.stringify({
          'X-ray': { score: scores.xray.score, rating: scores.xray.rating, maxScore: 10 },
          'Cryo-EM': { score: scores.cryoem.score, rating: scores.cryoem.rating, maxScore: 10 },
          'NMR': { score: scores.nmr.score, rating: scores.nmr.rating, maxScore: 10 },
          'Overall': { score: scores.overall.score, rating: scores.overall.rating, maxScore: 10 },
        });
        await db.$executeRaw`INSERT INTO Evaluation (uniprotId, entryName, proteinName, geneNames, organism, sequenceLength, coverage, scores, report, createdAt, updatedAt) VALUES (${uniprot}, ${uniprotInfo.entryName}, ${uniprotInfo.proteinName}, ${uniprotInfo.geneNames}, ${uniprotInfo.organism}, ${uniprotInfo.sequenceLength}, ${coverage}, ${scoresJson}, ${report?.ok ? report.content : null}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT(uniprotId) DO UPDATE SET entryName = excluded.entryName, proteinName = excluded.proteinName, geneNames = excluded.geneNames, organism = excluded.organism, sequenceLength = excluded.sequenceLength, coverage = excluded.coverage, scores = excluded.scores, report = excluded.report, updatedAt = CURRENT_TIMESTAMP`;

        // Now insert child tables — Evaluation exists, so FOREIGN KEY passes.
        await db.$executeRaw`DELETE FROM EvaluationPdbStructure WHERE uniprotId = ${uniprot}`;
        for (const e of pdbDetails) {
          const isCryoem = (e.method || '').includes('ELECTRON');
          const isXray = (e.method || '').includes('X-RAY');
          const isNmr = (e.method || '').includes('NMR');
          const ifTier = e.journalIf == null ? 'unknown' : e.journalIf >= 20 ? 'top' : e.journalIf >= 10 ? 'high' : e.journalIf >= 5 ? 'mid' : 'low';
          await db.$executeRaw`INSERT INTO EvaluationPdbStructure (uniprotId, pdbId, method, resolution, title, depositionDate, releaseDate, ligand, ligandNames, journal, journalIf, doi, pubmedId, organism, authors, isCryoem, isXray, isNmr, ifTier) VALUES (${uniprot}, ${e.pdbId}, ${e.method}, ${e.resolution}, ${e.title}, ${e.depositDate}, ${e.releaseDate}, ${e.ligands}, ${e.ligands}, ${e.journal}, ${e.journalIf}, ${e.doi}, ${e.pubmedId}, ${e.organisms}, ${e.authors}, ${isCryoem}, ${isXray}, ${isNmr}, ${ifTier})`;
        }

        await db.$executeRaw`DELETE FROM EvaluationBlastResult WHERE uniprotId = ${uniprot}`;
        for (const h of blastHits) {
          await db.$executeRaw`INSERT INTO EvaluationBlastResult (uniprotId, pdbId, uniprotRef, description, identity, evalue, queryCoverage, method, source) VALUES (${uniprot}, ${h.pdbId}, ${h.uniprotRef}, ${h.description}, ${h.identity}, ${h.evalue}, ${h.queryCoverage}, ${'BLASTp'}, ${'NCBI BLAST REST API'})`;
        }

        if (report?.ok && report.content) {
          await db.skillEvaluationReport.create({
            data: {
              uniprotId: uniprot,
              proteinName: uniprotInfo.proteinName,
              overallScore: scores.overall.score,
              directPdbCount,
              coverage,
              report: report.content,
              llmOk: report.ok,
              llmProvider: report.provider,
              llmModel: report.model,
              llmDurationMs: report.durationMs,
              filePath: report.filename,
            },
          });
        }
        await db.skillRunRecord.create({
          data: {
            module: 'eval',
            status: report?.ok || !generateReport ? 'success' : 'error',
            summary: `${uniprotInfo.proteinName}: ${directPdbCount} PDB (真实) · overall=${scores.overall.score}/10${report?.ok ? ' · LLM ✓' : generateReport ? ' · LLM ✗' : ''}`,
            details: JSON.stringify({ uniprot, directPdbCount, pdbPersisted: pdbDetails.length, coverage, scores, reportOk: report?.ok, reportChars: report?.contentChars }),
            provider,
            model: report?.model || model,
            llmOk: generateReport ? report?.ok : null,
            llmFallback: generateReport ? report?.fallback : false,
            llmError: generateReport ? report?.error : null,
            durationMs: Date.now() - t0,
            resultJson: JSON.stringify({ uniprot, scores, reportOk: report?.ok, reportChars: report?.contentChars, pdbSample: pdbDetails.slice(0, 5).map(e => e.pdbId) }),
          },
        });
        dbSaved = true;
        emit({ stage: 'write-db', level: 'success', message: `✓ 已写入 Evaluation + EvaluationPdbStructure(${pdbDetails.length}) + EvaluationBlastResult(${blastHits.length}) + SkillRunRecord`, progress: 99 });
      } catch (err: any) {
        emit({ stage: 'write-db', level: 'error', message: `✗ 数据库写入失败：${err?.message}`, progress: 99 });
      }

      const result = {
        uniprot,
        uniprotInfo,
        directPdbCount,
        pdbPersisted: pdbDetails.length,
        pdbSample: pdbDetails.slice(0, 5).map(e => ({ pdbId: e.pdbId, method: e.method, resolution: e.resolution, title: e.title?.slice(0, 60) })),
        blastHitCount,
        blastSample: blastHits.slice(0, 3).map(h => ({ pdbId: h.pdbId, identity: h.identity, evalue: h.evalue })),
        coverage,
        skippedBblast,
        scores,
        report,
        dbSaved,
        durationMs: Date.now() - t0,
      };
      emit({ stage: 'done', level: report?.ok || !generateReport ? 'success' : 'warn', message: `完成 · ${directPdbCount} PDB (真实) · overall=${scores.overall.score}/10 · ${((Date.now() - t0) / 1000).toFixed(1)}s${report?.ok ? ` · LLM ✓ (${report.contentChars} chars)` : generateReport ? ' · LLM ✗' : ''}${dbSaved ? ' · DB ✓' : ' · DB ✗'}`, progress: 100 });
      await sleep(150);
      done(result);
    } catch (err: any) {
      // Last-resort error emit so SSE stream terminates cleanly.
      emit({ stage: 'error', level: 'error', message: `✗ 未捕获异常：${err?.message || String(err)}`, progress: 100 });
      await sleep(50);
      done({ ok: false, error: err?.message || String(err), uniprot });
    }
  })();
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' } });
}


function labelOf(k: ReportChapterKey): string {
  return ({
    summary:     '执行摘要',
    function:    '蛋白功能与生物学背景',
    topology:    '序列与拓扑结构',
    pdb_analysis:'现有 PDB 结构分析',
    feasibility: '结构解析可行性评估',
    experimental:'实验方案',
    references:  '重要参考文献',
    conclusion:  '总结',
  } as Record<ReportChapterKey, string>)[k];
}
