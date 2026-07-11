const EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

/** Decode HTML entities in PubMed XML content (e.g. &#x3b2; → β, &#x2011; → ‑). */
function decodeHtmlEntities(str: string): string {
  if (!str) return str;
  return str
    // Hex entities: &#x3b2; → β
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    // Decimal entities: &#946; → β
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    // Named entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'");
}
export interface FetchedPaper { pmid: string; title: string; authors: string; journal: string; abstract: string; pubYear: string; pubMonth: string; pubDay: string; doi: string; }
export const PATH_A_QUERY = `(("cryo-electron microscopy"[MeSH Terms] OR "cryo-EM"[Title/Abstract] OR "X-ray crystallography"[MeSH Terms] OR "crystallography, X-Ray"[Title/Abstract] OR "nuclear magnetic resonance, biomolecular"[MeSH Terms] OR "NMR"[Title/Abstract] OR "AlphaFold"[Title/Abstract]) AND ("protein structure"[MeSH Terms] OR "protein conformation"[MeSH Terms] OR "structural biology"[Title/Abstract] OR "macromolecular structure"[Title/Abstract] OR "protein structure"[Title/Abstract]))`;
export const PATH_B_QUERY = `(("Nature"[Journal] OR "Science"[Journal] OR "Cell"[Journal] OR "Nature Communications"[Journal] OR "Nature Structural & Molecular Biology"[Journal] OR "Nature Methods"[Journal] OR "Nature Biotechnology"[Journal] OR "Molecular Cell"[Journal] OR "Cell Research"[Journal] OR "PNAS"[Journal] OR "Proceedings of the National Academy of Sciences"[Journal] OR "Science Advances"[Journal] OR "Cell Host & Microbe"[Journal] OR "Structure"[Journal] OR "Current Biology"[Journal] OR "eLife"[Journal] OR "PLOS Biology"[Journal]) AND ("cryo-EM"[Title/Abstract] OR "cryo-electron microscopy"[Title/Abstract] OR "X-ray crystallography"[Title/Abstract] OR "X-ray structure"[Title/Abstract] OR "NMR"[Title/Abstract] OR "AlphaFold"[Title/Abstract] OR "protein structure"[Title/Abstract] OR "structural biology"[Title/Abstract]))`;
const METHOD_KEYWORDS: Array<{ method: string; regex: RegExp }> = [
  { method: 'Cryo-EM', regex: /\b(cryo-?em|cryo-?electron|cryo electron microscopy|electron microscopy|EM structure|EM density|single[- ]particle)\b/i },
  { method: 'X-ray', regex: /\b(X[- ]ray|X-ray crystallography|crystal structure|crystallography|crystallographic|diffraction)\b/i },
  { method: 'NMR', regex: /\b(NMR|nuclear magnetic resonance|NMR spectroscopy|NMR structure)\b/i },
  { method: 'AlphaFold', regex: /\b(AlphaFold|ESMFold|RoseTTAFold|Chai-1|protein structure prediction|fold prediction)\b/i },
];
export function classifyMethod(text: string): string | null { if (!text) return null; for (const { method, regex } of METHOD_KEYWORDS) { if (regex.test(text)) return method; } return null; }
export async function esearch(query: string, date: string, windowDays: number, maxResults: number): Promise<string[]> {
  const center = new Date(date + 'T00:00:00Z');
  const start = new Date(center); start.setUTCDate(start.getUTCDate() - windowDays);
  const end = new Date(center); end.setUTCDate(end.getUTCDate() + windowDays);
  const fmt = (d: Date) => `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}`;
  const url = new URL(`${EUTILS}/esearch.fcgi`);
  url.searchParams.set('db', 'pubmed'); url.searchParams.set('term', query);
  url.searchParams.set('mindate', fmt(start)); url.searchParams.set('maxdate', fmt(end));
  url.searchParams.set('datetype', 'pdat'); url.searchParams.set('retmax', String(maxResults));
  url.searchParams.set('retmode', 'json'); url.searchParams.set('sort', 'relevance');
  const res = await fetch(url.toString(), { headers: { 'User-Agent': 'pdb-tracker-web-v3/1.0' }, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`eSearch ${res.status}: ${await res.text().catch(() => '')}`);
  const json: any = await res.json();
  return json?.esearchresult?.idlist || [];
}
function parseArticle(xml: string): FetchedPaper | null {
  const pmid = xml.match(/<PMID[^>]*>([\s\S]*?)<\/PMID>/)?.[1]?.trim();
  if (!pmid) return null;
  const title = decodeHtmlEntities(xml.match(/<ArticleTitle[^>]*>([\s\S]*?)<\/ArticleTitle>/)?.[1]?.replace(/<[^>]+>/g, '').trim() || '');
  const authorBlock = xml.match(/<AuthorList[^>]*>([\s\S]*?)<\/AuthorList>/)?.[1] || '';
  const authorRe = /<Author[^>]*>([\s\S]*?)<\/Author>/g;
  const authors: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = authorRe.exec(authorBlock))) {
    const inner = m[1];
    const collective = inner.match(/<CollectiveName[^>]*>([\s\S]*?)<\/CollectiveName>/)?.[1];
    if (collective) { authors.push(decodeHtmlEntities(collective.replace(/<[^>]+>/g, '').trim())); continue; }
    const last = decodeHtmlEntities(inner.match(/<LastName[^>]*>([\s\S]*?)<\/LastName>/)?.[1]?.trim() || '');
    const fore = decodeHtmlEntities(inner.match(/<ForeName[^>]*>([\s\S]*?)<\/ForeName>/)?.[1]?.trim() || '');
    const full = `${fore} ${last}`.trim();
    if (full) authors.push(full);
  }
  const journal = decodeHtmlEntities(xml.match(/<Journal>[\s\S]*?<Title[^>]*>([\s\S]*?)<\/Title>/)?.[1]?.trim() || '');
  const abstractMatch = xml.match(/<Abstract[^>]*>([\s\S]*?)<\/Abstract>/);
  let abstract = '';
  if (abstractMatch) {
    const parts: string[] = [];
    const txtRe = /<AbstractText(?:\s+Label="([^"]*)")?[^>]*>([\s\S]*?)<\/AbstractText>/g;
    let mm: RegExpExecArray | null;
    while ((mm = txtRe.exec(abstractMatch[1]))) { const label = mm[1]; const text = decodeHtmlEntities(mm[2].replace(/<[^>]+>/g, '').trim()); parts.push(label ? `${label}: ${text}` : text); }
    abstract = parts.join('\n\n');
  }
  const pubXml = xml.match(/<PubDate[^>]*>([\s\S]*?)<\/PubDate>/)?.[1] || '';
  const year = pubXml.match(/<Year[^>]*>([\s\S]*?)<\/Year>/)?.[1]?.trim() || pubXml.match(/<MedlineDate[^>]*>([\s\S]*?)<\/MedlineDate>/)?.[1]?.match(/(\d{4})/)?.[1] || '';
  const month = pubXml.match(/<Month[^>]*>([\s\S]*?)<\/Month>/)?.[1]?.trim() || '';
  const day = pubXml.match(/<Day[^>]*>([\s\S]*?)<\/Day>/)?.[1]?.trim() || '';
  const doi = xml.match(/<ArticleId[^>]*IdType="doi"[^>]*>([\s\S]*?)<\/ArticleId>/)?.[1]?.trim() || '';
  return { pmid, title, authors: authors.join(', '), journal, abstract, pubYear: year, pubMonth: month, pubDay: day, doi };
}
export async function efetch(pmids: string[]): Promise<FetchedPaper[]> {
  if (pmids.length === 0) return [];
  const out: FetchedPaper[] = [];
  for (let i = 0; i < pmids.length; i += 50) {
    const batch = pmids.slice(i, i + 50);
    const url = new URL(`${EUTILS}/efetch.fcgi`);
    url.searchParams.set('db', 'pubmed'); url.searchParams.set('id', batch.join(','));
    url.searchParams.set('rettype', 'xml'); url.searchParams.set('retmode', 'xml');
    const res = await fetch(url.toString(), { headers: { 'User-Agent': 'pdb-tracker-web-v3/1.0' }, signal: AbortSignal.timeout(60000) });
    if (!res.ok) throw new Error(`eFetch ${res.status}: ${await res.text().catch(() => '')}`);
    const xml = await res.text();
    const articleChunks = xml.split('<PubmedArticle>').slice(1);
    for (const chunk of articleChunks) {
      const end = chunk.indexOf('</PubmedArticle>');
      if (end < 0) continue;
      const paper = parseArticle('<PubmedArticle>' + chunk.slice(0, end));
      if (paper) out.push(paper);
    }
    if (i + 50 < pmids.length) await new Promise(r => setTimeout(r, 350));
  }
  return out;
}
