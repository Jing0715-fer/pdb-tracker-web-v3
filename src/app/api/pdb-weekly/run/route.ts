/**
 * GET  /api/pdb-weekly/run  — returns the current ISO-week window + DB counts
 * POST /api/pdb-weekly/run  — kicks off the adversarial weekly report pipeline
 *
 * Skills-panel module ③ — Manual PDB Weekly Report. SSE-streamed 1–3 cycle
 * Generator / Critic-Scientific / Synthesis orchestration. Mock data (no
 * external network) so the module is fully testable.
 */
import { sseStream, sleep, type SseEvent } from '@/lib/sse';

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
  return {
    weekId: `${tmp.getUTCFullYear()}-W${pad(weekNo)}`,
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    reportDate: report.toISOString().slice(0, 10),
  };
}

export async function GET() {
  const w = isoWeek(new Date());
  return Response.json({
    ...w,
    dbCounts: {
      pdbStructure: 180 + Math.floor(Math.random() * 40),
      weeklyReport: Math.floor(Math.random() * 3),
      weeklySnapshot: 1,
      withAuthors: 165, withPubmedId: 142, pubmedArticleMatched: 138,
    },
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const maxCycles: 1 | 2 | 3 = ([1, 2, 3].includes(Number(body.maxCycles)) ? Number(body.maxCycles) : 2) as 1 | 2 | 3;
  const provider: string = body.llm?.provider || 'zai';
  const model: string = body.llm?.model || 'glm-4.6';
  const window = isoWeek(new Date());

  const { stream, progress, done } = sseStream();

  (async () => {
    const t0 = Date.now();
    const emit = (e: SseEvent) => progress(e);

    emit({ stage: 'init', level: 'info', message: `启动 pdb-weekly · ${window.weekId} · ${maxCycles}-cycle`, progress: 1 });
    await sleep(400);

    emit({ stage: 'fetch-rcsb', level: 'info', message: `拉取本周 RCSB PDB (${window.startDate} → ${window.endDate})`, progress: 6 });
    await sleep(900);
    const fetched = 180 + Math.floor(Math.random() * 40);
    emit({ stage: 'fetch-rcsb', level: 'success', message: `RCSB 返回 ${fetched} 条`, progress: 14 });

    emit({ stage: 'backfill', level: 'info', message: '回填作者 / PubMed / 方法分类', progress: 18 });
    await sleep(700);
    emit({ stage: 'backfill', level: 'success', message: `回填完成 · with_authors=165, with_pubmedId=142`, progress: 24 });

    emit({ stage: 'pubmed-link', level: 'info', message: 'PubMed Article 关联 (matched=138/142)', progress: 28 });
    await sleep(600);
    emit({ stage: 'pubmed-link', level: 'success', message: 'PubMed 关联完成', progress: 32 });

    const cycles: any[] = [];
    const cycleRoles = [
      { role: 'generator', label: 'Generator', reportType: 'cryoem+xray' },
      { role: 'critic-scientific', label: 'Critic-Scientific', reportType: 'critique' },
      { role: 'synthesis', label: 'Synthesis', reportType: 'final' },
    ];

    for (let c = 1; c <= maxCycles; c++) {
      const { role, label, reportType } = cycleRoles[c - 1];
      const baseProgress = 32 + Math.round(((c - 1) / maxCycles) * 60);
      emit({ stage: `cycle-${c}-${role}`, level: 'info', message: `C${c} ${label} 启动 (${provider}/${model})`, progress: baseProgress });
      await sleep(1200);
      for (let j = 1; j <= 3; j++) {
        await sleep(500);
        emit({ stage: `cycle-${c}-${role}`, level: 'info', message: `C${c} ${label} · 推理 ${j}/3`, progress: baseProgress + Math.round((j / 3) * (60 / maxCycles) * 0.7) });
      }
      const contentChars = 4000 + Math.floor(Math.random() * 6000);
      const cycleT0 = Date.now();
      await sleep(600);
      const cycleEntry = { cycle: c, role, reportType, provider, model, durationMs: Date.now() - cycleT0 + 3500, contentChars, verdict: role === 'critic-scientific' ? (Math.random() > 0.5 ? 'pass' : 'revise') : undefined };
      cycles.push(cycleEntry);
      emit({ stage: `cycle-${c}-${role}`, level: 'success', message: `C${c} ${label} 完成 · ${contentChars} chars${cycleEntry.verdict ? ` · verdict=${cycleEntry.verdict}` : ''}`, progress: baseProgress + Math.round((60 / maxCycles) * 0.95) });
    }

    emit({ stage: 'write-db', level: 'info', message: '写入 WeeklyReport + WeeklySnapshot + 文件落盘', progress: 95 });
    await sleep(700);
    const filesWritten = [`weekly-reports/${window.weekId}/cryoem.md`, `weekly-reports/${window.weekId}/xray.md`, `weekly-reports/${window.weekId}/index.md`];
    emit({ stage: 'write-db', level: 'success', message: `落盘 ${filesWritten.length} 个文件`, progress: 98 });

    const result = {
      window, reports: ['cryoem', 'xray'], cycles,
      dbCounts: { pdbStructure: fetched, weeklyReport: maxCycles, weeklySnapshot: 1, withAuthors: 165, withPubmedId: 142, pubmedArticleMatched: 138 },
      filesWritten, durationMs: Date.now() - t0,
    };
    emit({ stage: 'done', level: 'success', message: `完成 · ${maxCycles} cycles · ${((Date.now() - t0) / 1000).toFixed(1)}s`, progress: 100 });
    await sleep(150);
    done(result);
  })();

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' },
  });
}
