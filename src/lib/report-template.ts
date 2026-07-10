/**
 * Full 7-chapter Markdown report template for module ② (target evaluation),
 * ported faithfully from the original pdb-tracker-web-v3 skill
 * (src/lib/target-evaluation.ts lines 854-971). The previous mock used a
 * short 3-paragraph prompt which produced very short reports; this restores
 * the complete template with all 7 chapters.
 */

export interface EvalDataForReport {
  uniprot: string;
  entryName: string;
  proteinName: string;
  geneNames: string;
  organism: string;
  sequenceLength: number;
  coverage: number;
  directPdbCount: number;
  blastHitCount: number;
  scores: {
    xray: { score: number; rating?: string };
    cryoem: { score: number; rating?: string };
    nmr: { score: number; rating?: string };
    overall: { score: number; rating?: string };
  };
  pdbTable: string; // pre-formatted markdown table rows
  blastTable: string;
}

export function buildReportSystemPrompt(): string {
  return `You are a structural biology expert generating a feasibility report for a protein target. Output in Chinese, follow the markdown template strictly, no emoji in headings/tables. Generate ALL 7 chapters with substantive content — do not skip any section. The report should be comprehensive (1500-3000 chars).`;
}

export function buildReportUserPrompt(d: EvalDataForReport): string {
  const today = new Date().toISOString().slice(0, 10);
  return `Generate a Chinese protein structure feasibility report for:

UniProt: ${d.uniprot}
Entry: ${d.entryName}
Protein: ${d.proteinName}
Gene: ${d.geneNames}
Organism: ${d.organism}
Sequence length: ${d.sequenceLength} aa
Coverage: ${d.coverage}%
Direct PDB count: ${d.directPdbCount}
BLAST hit count: ${d.blastHitCount}

Scores (1-10):
- X-ray: ${d.scores.xray.score} (${d.scores.xray.rating || ''})
- Cryo-EM: ${d.scores.cryoem.score} (${d.scores.cryoem.rating || ''})
- NMR: ${d.scores.nmr.score} (${d.scores.nmr.rating || ''})
- Overall: ${d.scores.overall.score} (${d.scores.overall.rating || ''})

Top direct PDB structures:
| PDB | Method | Resolution (Å) | Journal (IF) | Title |
|-----|--------|----------------|--------------|-------|
${d.pdbTable}

Top BLAST homologs:
| PDB | Subject | Identity | E-value | Description |
|-----|---------|----------|---------|-------------|
${d.blastTable}

Output strictly in this markdown structure (Chinese), filling EVERY section with real content:

---
title: 蛋白结构解析可行性评估报告
created: ${today}
updated: ${today}
type: evaluation
tags: []
sources: []
---

# 蛋白结构解析可行性评估报告

**蛋白名称:** ${d.proteinName}
**UniProt ID:** ${d.uniprot} (${d.entryName})
**基因名称:** ${d.geneNames}
**物种:** ${d.organism}
**序列长度:** ${d.sequenceLength} 氨基酸
**报告生成日期:** ${today}

---

## 执行摘要

(2-4 段：蛋白功能 + 关键发现 + 推荐方向)

| 评估项目 | 结果 |
|---------|------|
| 蛋白类型 | (基于序列特征推断) |
| 序列长度 | ${d.sequenceLength} aa |
| 已有结构覆盖 | ${d.directPdbCount} 个直接 PDB，${d.blastHitCount} 个 BLAST 同源 |
| 推荐结构解析方法 | (基于评分给出) |

## 1. 蛋白功能与生物学背景

### 1.1 基本功能
### 1.2 调控机制
### 1.3 疾病关联
(基于蛋白名称和物种推断;无信息则说"暂无可靠数据")

## 2. 序列与拓扑结构

### 2.1 拓扑模型
(简短的拓扑描述;如膜蛋白/球状/酶)
### 2.2 结构域解析
(基于 UniProt 注释;无信息时简略)

## 3. 现有 PDB 结构分析

### 3.1 结构生物学里程碑
(挑 3-5 个重要 PDB 列出)
### 3.2 代表性 PDB 结构
(基于上面 PDB 表生成)
### 3.3 研究空白与发表机会
(3 个具体方向)

## 4. 结构解析可行性评估

### 4.1 方法比较
| 评估维度 | Cryo-EM | X-ray 结晶 | NMR |
|---------|---------|-----------|-----|
| 分子量适配性 | | | |
| 构象异质性处理 | | | |
| 已有成功先例 | | | |
| 总体评分 | ${d.scores.cryoem.score}/10 | ${d.scores.xray.score}/10 | ${d.scores.nmr.score}/10 |

### 4.2 综合结论
(2-3 段:推荐方法 + 理由 + 备选方案)

## 5. 实验方案（可选）

### 5.1 构建设计
### 5.2 表达与样品制备流程
### 5.3 时间规划
| 阶段 | 预计时间 | 预期结果 |
|------|---------|---------|
| 表达纯化 | 2-3 月 | 高纯度样品 |
| 结构解析 | 3-6 月 | 原子模型 |
| **总计** | **6-12 个月** | |

## 6. 重要参考文献
(基于 PDB 表中的 DOI/PMID 列出)

## 7. 总结
(3-4 段总结)

---
*本报告由 pdb-tracker-web-v3 运行中心自动生成 | 数据来源：UniProt, RCSB PDB, NCBI BLAST*
*报告生成时间: ${new Date().toISOString()}*`;
}

/** Build mock PDB table rows for the report prompt. */
export function buildMockPdbTable(count: number): string {
  const methods = ['X-RAY DIFFRACTION', 'ELECTRON MICROSCOPY', 'SOLUTION NMR'];
  const journals = ['Nature', 'Science', 'Cell', 'Nature Struct. Mol. Biol.', 'PNAS', 'eLife'];
  const titles = [
    'Crystal structure of EGFR kinase domain',
    'Cryo-EM structure of full-length EGFR',
    'Active-state GPCR complex',
    'Ligand-bound receptor ectodomain',
    'Mutant kinase with inhibitor',
    'Asymmetric dimer structure',
  ];
  const rows: string[] = [];
  for (let i = 0; i < Math.min(count, 8); i++) {
    const pdbId = `${String.fromCharCode(88, 71)}${(7 + i).toString().padStart(2, '0')}`;
    const m = methods[i % methods.length];
    const res = m === 'SOLUTION NMR' ? '-' : (1.5 + Math.random() * 2.5).toFixed(1);
    const j = journals[i % journals.length];
    const ifVal = (10 + Math.random() * 30).toFixed(1);
    const t = titles[i % titles.length];
    rows.push(`| ${pdbId} | ${m} | ${res} | ${j} (${ifVal}) | ${t} |`);
  }
  return rows.join('\n');
}

/** Build mock BLAST table rows. */
export function buildMockBlastTable(count: number): string {
  const descs = ['EGFR_HUMAN', 'Receptor tyrosine kinase', 'ErbB family member', 'Kinase domain homolog'];
  const rows: string[] = [];
  for (let i = 0; i < Math.min(count, 8); i++) {
    const pdbId = `${String.fromCharCode(88, 71)}${(10 + i).toString().padStart(2, '0')}`;
    const ident = (60 + Math.random() * 35).toFixed(1);
    const evalue = `e-${Math.floor(Math.random() * 100 + 10)}`;
    const d = descs[i % descs.length];
    rows.push(`| ${pdbId} | sp|P0${i} | ${ident}% | ${evalue} | ${d} |`);
  }
  return rows.join('\n');
}
