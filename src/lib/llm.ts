/**
 * Shared LLM helper backed by z-ai-web-dev-sdk.
 *
 * Used by the Skills-panel SSE endpoints to generate *real* text for:
 *   - module ① literature daily digest
 *   - module ② target-evaluation feasibility report
 *
 * If the SDK call fails (network / quota / etc.), we transparently fall back
 * to a deterministic mock so the SSE pipeline never hard-fails on the LLM
 * step alone — mirroring the original pdb-tracker-web-v3 graceful-degradation
 * behaviour.
 */

import ZAI from 'z-ai-web-dev-sdk';

let _zai: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getClient() {
  if (_zai) return _zai;
  try {
    _zai = await ZAI.create();
    return _zai;
  } catch (err) {
    console.error('[llm] ZAI.create() failed:', err);
    _zai = null;
    throw err;
  }
}

export interface LlmResult {
  ok: boolean;
  content: string;
  provider: string;
  model: string;
  durationMs: number;
  fallback: boolean;
  error?: string;
}

/**
 * Generate a chat completion. Always resolves (never throws) — on failure it
 * returns `ok: false` with a fallback body so callers can keep streaming.
 */
export async function generateText(
  systemPrompt: string,
  userPrompt: string,
  opts: { maxChars?: number } = {},
): Promise<LlmResult> {
  const t0 = Date.now();
  const maxChars = opts.maxChars ?? 4000;
  try {
    const zai = await getClient();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      thinking: { type: 'disabled' },
      stream: false,
    });
    const content = (completion.choices?.[0]?.message?.content || '').trim();
    if (!content) {
      throw new Error('empty response from LLM');
    }
    return {
      ok: true,
      content: content.slice(0, maxChars),
      provider: 'zai',
      model: 'glm-4.6',
      durationMs: Date.now() - t0,
      fallback: false,
    };
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.error('[llm] generateText failed, using fallback:', msg);
    return {
      ok: false,
      content: buildFallback(systemPrompt, userPrompt).slice(0, maxChars),
      provider: 'zai',
      model: 'glm-4.6 (fallback)',
      durationMs: Date.now() - t0,
      fallback: true,
      error: msg,
    };
  }
}

/** Build a deterministic, plausible-looking fallback body when the SDK fails. */
function buildFallback(systemPrompt: string, userPrompt: string): string {
  const isReport = /报告|report/i.test(systemPrompt);
  const isDigest = /摘要|digest|summary/i.test(systemPrompt);
  if (isReport) {
    return [
      '# 可行性评估报告（fallback）',
      '',
      '> ⚠️ LLM SDK 调用失败，以下为本地生成的占位报告。请检查网络 / 配额后重试。',
      '',
      '## 1. 概述',
      '本靶点在 PDB 结构数据库中已有较好的结构覆盖，结合 SIFTS 残基覆盖率与 BLAST 同源检索结果，可综合判断其可成药性。',
      '',
      '## 2. 结构可成药性',
      '- **X-ray 晶体学**: 结构数量充足，分辨率覆盖良好，适合基于结构的药物设计。',
      '- **Cryo-EM**: 近年新增结构较多，适合大分子复合体研究。',
      '- **NMR**: 结构数量有限，主要用于动态构象研究。',
      '',
      '## 3. 综合建议',
      '推荐作为优先靶点，建议进一步开展片段筛选与先导化合物优化。',
    ].join('\n');
  }
  if (isDigest) {
    return [
      '## 每日结构生物学精选（fallback）',
      '',
      '> ⚠️ LLM SDK 调用失败，以下为本地生成的占位摘要。',
      '',
      '本日筛选的高质量结构生物学论文涵盖 Cryo-EM、X-ray、NMR 与 AlphaFold 四大方法学方向。Cryo-EM 方向聚焦膜蛋白与大分子复合体的高分辨解析；X-ray 方向以药物靶点结构为主；NMR 集中于动态构象研究；AlphaFold 体现预测与实验结构的交叉验证趋势。',
    ].join('\n');
  }
  return `(fallback) ${userPrompt.slice(0, 200)}`;
}

/** Best-effort per-paper one-line digest (used by module ①). */
export async function generatePaperDigest(title: string, pmid: string): Promise<LlmResult> {
  return generateText(
    '你是结构生物学领域的资深研究员。请用一句中文（不超过 40 字）概括这篇论文的核心发现，要求准确、简洁、专业。',
    `论文标题：${title}\nPMID: ${pmid}`,
    { maxChars: 120 },
  );
}
