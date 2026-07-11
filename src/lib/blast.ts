export interface BlastHit { pdbId: string; uniprotRef: string; description: string; identity: number; evalue: string; queryCoverage: number; targetCoverage?: number; taxonomyId?: string; }
const BLAST_URL = 'https://blast.ncbi.nlm.nih.gov/blast/Blast.cgi';
export async function runBlast(sequence: string, maxHits = 20, onProgress?: (msg: string) => void): Promise<BlastHit[]> {
  if (!sequence || sequence.length < 30) { onProgress?.('序列过短（<30 aa），跳过 BLAST'); return []; }
  onProgress?.('提交 BLASTp 任务到 NCBI…');
  const submitBody = new URLSearchParams({ CMD: 'Put', PROGRAM: 'blastp', DATABASE: 'pdbaa', QUERY: sequence, HITLIST_SIZE: String(maxHits), EXPECT: '1e-5', FILTER: 'F' });
  const submitRes = await fetch(BLAST_URL, { method: 'POST', body: submitBody, signal: AbortSignal.timeout(30000) });
  if (!submitRes.ok) throw new Error(`BLAST submit ${submitRes.status}`);
  const submitText = await submitRes.text();
  const ridMatch = submitText.match(/RID\s*=\s*(\S+)/);
  const rtoeMatch = submitText.match(/RTOE\s*=\s*(\d+)/);
  if (!ridMatch) throw new Error('BLAST submit: no RID returned');
  const rid = ridMatch[1];
  const rtoe = parseInt(rtoeMatch?.[1] || '10', 10);
  onProgress?.(`BLAST 已提交 (RID=${rid}, 预计 ${rtoe}s)`);
  let attempts = 0;
  const maxAttempts = 30;
  while (attempts < maxAttempts) {
    const waitMs = Math.max(3000, rtoe * 1000);
    await new Promise(r => setTimeout(r, waitMs));
    onProgress?.(`轮询 BLAST 结果 (${attempts + 1}/${maxAttempts})…`);
    const pollRes = await fetch(`${BLAST_URL}?CMD=Get&FORMAT_TYPE=XML&RID=${rid}`, { signal: AbortSignal.timeout(30000) });
    if (!pollRes.ok) { attempts++; continue; }
    const xml = await pollRes.text();
    if (xml.includes('<BlastOutput>') || xml.includes('<BlastOutput_iterations>')) { onProgress?.(`BLAST 完成，解析结果…`); return parseBlastXml(xml); }
    if (xml.includes('Status=FAILED')) throw new Error('BLAST job failed on NCBI side');
    if (xml.includes('Status=UNKNOWN')) throw new Error(`BLAST RID ${rid} unknown (expired?)`);
    attempts++;
  }
  throw new Error(`BLAST polling timed out after ${maxAttempts} attempts (RID=${rid})`);
}
function parseBlastXml(xml: string): BlastHit[] {
  const hits: BlastHit[] = [];
  const hitRe = /<Hit>([\s\S]*?)<\/Hit>/g;
  let m: RegExpExecArray | null;
  while ((m = hitRe.exec(xml))) {
    const h = m[1];
    const def = h.match(/<Hit_def>([\s\S]*?)<\/Hit_def>/)?.[1]?.trim() || '';
    const acc = h.match(/<Hit_accession>([\s\S]*?)<\/Hit_accession>/)?.[1]?.trim() || '';
    if (!acc) continue;
    const pdbIdMatch = acc.match(/^([0-9][A-Za-z0-9]{3})([A-Za-z]?)/);
    const pdbId = pdbIdMatch ? pdbIdMatch[1] : acc.slice(0, 4);
    const firstHsp = /<Hsp>([\s\S]*?)<\/Hsp>/.exec(h);
    let identity = 0; let evalue = '0'; let queryCoverage = 0;
    if (firstHsp) {
      const hsp = firstHsp[1];
      const identityRaw = parseFloat(hsp.match(/<Hsp_identity>([\s\S]*?)<\/Hsp_identity>/)?.[1] || '0');
      const alignLen = parseFloat(hsp.match(/<Hsp_align-len>([\s\S]*?)<\/Hsp_align-len>/)?.[1] || '1');
      identity = alignLen > 0 ? (identityRaw / alignLen) * 100 : 0;
      evalue = hsp.match(/<Hsp_evalue>([\s\S]*?)<\/Hsp_evalue>/)?.[1]?.trim() || '0';
      const queryFrom = parseInt(hsp.match(/<Hsp_query-from>([\s\S]*?)<\/Hsp_query-from>/)?.[1] || '0', 10);
      const queryTo = parseInt(hsp.match(/<Hsp_query-to>([\s\S]*?)<\/Hsp_query-to>/)?.[1] || '0', 10);
      queryCoverage = queryTo > queryFrom ? queryTo - queryFrom + 1 : 0;
    }
    hits.push({ pdbId, uniprotRef: acc, description: def, identity: Math.round(identity * 10) / 10, evalue, queryCoverage });
  }
  return hits;
}
export async function fetchUniprotSequence(uniprotId: string): Promise<string> {
  const res = await fetch(`https://rest.uniprot.org/uniprotkb/${uniprotId}.fasta`, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`UniProt fetch ${res.status} for ${uniprotId}`);
  const fasta = await res.text();
  const seq = fasta.split('\n').slice(1).join('');
  if (!seq || seq.length < 30) throw new Error(`UniProt sequence too short for ${uniprotId}`);
  return seq;
}
