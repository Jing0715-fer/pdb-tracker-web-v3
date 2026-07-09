/**
 * GET /api/literature/daily/list
 *
 * Mock of the pdb-tracker-web-v3 endpoint that lists previously generated
 * daily literature reports. Returns a handful of plausible recent dates.
 */
export const runtime = 'nodejs';

export async function GET() {
  const today = new Date();
  const reports: Array<{ date: string; paperCount: number; hasLLMDigest: boolean }> = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const date = d.toISOString().slice(0, 10);
    reports.push({
      date,
      paperCount: 12 + Math.floor(Math.random() * 18),
      hasLLMDigest: i % 2 === 0,
    });
  }
  return Response.json({ reports });
}
