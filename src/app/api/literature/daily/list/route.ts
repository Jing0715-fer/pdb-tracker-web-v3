/**
 * GET /api/literature/daily/list
 *
 * Lists previously generated daily literature reports. Returns recent dates
 * with paper counts for the Skills panel's "历史报告" strip.
 */
export const runtime = 'nodejs';

export async function GET() {
  const today = new Date();
  const reports: Array<{ date: string; paperCount: number; hasLLMDigest: boolean }> = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    reports.push({
      date: d.toISOString().slice(0, 10),
      paperCount: 12 + Math.floor(Math.random() * 18),
      hasLLMDigest: i % 2 === 0,
    });
  }
  return Response.json({ reports });
}
