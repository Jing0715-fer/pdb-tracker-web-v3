'use client';

import React, { useMemo } from 'react';
import { useTheme } from 'next-themes';
import { Layers, Database, FileSearch } from 'lucide-react';
import { ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell } from 'recharts';
import type { Evaluation } from './pdb-tracker';

interface ComplexEvalSummaryProps {
  subEvals: Evaluation[];
  group: { id: string; name: string; uniprotIds: string[]; createdAt: number };
  openReport: (uniprotId: string, title: string) => void;
  onSelectEval: (uniprotId: string) => void;
}

const EVAL_COLORS = ['#c96442', '#2d8f8f', '#805ad5', '#d69e2e', '#e53e3e', '#00b5d8', '#38a169', '#d53f8c'];

function getScoreColor(score: number): string {
  if (score >= 80) return '#2d8f8f';
  if (score >= 50) return '#c9872e';
  if (score >= 25) return '#ea580c';
  return '#dc2626';
}

export function ComplexEvalSummary({
  subEvals,
  group,
  openReport,
  onSelectEval,
}: ComplexEvalSummaryProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const scores = useMemo(() => {
    return subEvals.map(ev => {
      try {
        const parsed = ev.scores ? JSON.parse(ev.scores) : {};
        const vals = Object.values(parsed).map((v: any) => typeof v === 'number' ? v : v?.score ?? 0) as number[];
        const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        return { uniprotId: ev.uniprotId, score: avg, categories: parsed };
      } catch {
        return { uniprotId: ev.uniprotId, score: 0, categories: {} };
      }
    });
  }, [subEvals]);

  const overallScores = useMemo(() => {
    const result: Record<string, number> = {};
    scores.forEach(s => { result[s.uniprotId] = s.score; });
    return result;
  }, [scores]);

  const evalScoresMap = useMemo(() => {
    const result: Record<string, Record<string, number>> = {};
    scores.forEach(s => { result[s.uniprotId] = s.categories; });
    return result;
  }, [scores]);

  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    scores.forEach(s => Object.keys(s.categories).forEach(c => cats.add(c)));
    return Array.from(cats);
  }, [scores]);

  const groupOverallAvg = useMemo(() => {
    if (!scores.length) return 0;
    return scores.reduce((s, ev) => s + ev.score, 0) / scores.length;
  }, [scores]);

  const scoreExtremes = useMemo(() => {
    const result: Record<string, { max: number; min: number; maxUid: string; minUid: string; diff: number }> = {};
    allCategories.forEach(cat => {
      let max = -Infinity, min = Infinity, maxUid = '', minUid = '';
      subEvals.forEach(ev => {
        const score = evalScoresMap[ev.uniprotId]?.[cat] ?? 0;
        if (score > max) { max = score; maxUid = ev.uniprotId; }
        if (score < min) { min = score; minUid = ev.uniprotId; }
      });
      result[cat] = { max, min, maxUid, minUid, diff: max - min };
    });
    return result;
  }, [allCategories, subEvals, evalScoresMap]);

  const overallExtremes = useMemo(() => {
    let max = -Infinity, min = Infinity, maxUid = '', minUid = '';
    for (const [uid, score] of Object.entries(overallScores)) {
      if (score > max) { max = score; maxUid = uid; }
      if (score < min) { min = score; minUid = uid; }
    }
    return { max, min, maxUid, minUid, diff: max - min };
  }, [overallScores]);

  const coverageData = useMemo(() => {
    return subEvals.map(ev => ({
      uniprotId: ev.uniprotId,
      proteinName: ev.proteinName || ev.entryName || ev.uniprotId,
      coverage: Math.min(ev.coverage ?? 0, 100),
      pdbCount: ev._count?.pdbStructures || ev.pdbStructures?.length || 0,
      blastCount: ev._count?.blastResults || ev.blastResults?.length || 0,
    }));
  }, [subEvals]);

  const radarData = useMemo(() => {
    if (allCategories.length < 3) return [];
    return allCategories.map(cat => {
      const entry: Record<string, any> = { metric: cat.charAt(0).toUpperCase() + cat.slice(1).replace(/([A-Z])/g, ' $1'), fullMark: 10 };
      subEvals.forEach((ev, idx) => {
        entry[ev.uniprotId] = evalScoresMap[ev.uniprotId]?.[cat] ?? 0;
      });
      return entry;
    });
  }, [allCategories, subEvals, evalScoresMap]);

  const pieData = useMemo(() => {
    const methodCounts: Record<string, number> = {};
    subEvals.forEach(ev => {
      const method = ev.pdbStructures?.[0]?.method || 'Unknown';
      methodCounts[method] = (methodCounts[method] || 0) + 1;
    });
    return Object.entries(methodCounts).map(([name, value]) => ({ name, value }));
  }, [subEvals]);

  const coverageChartData = useMemo(() => {
    return coverageData.map(c => ({
      uniprotId: c.uniprotId.length > 12 ? c.uniprotId.slice(0, 12) + '…' : c.uniprotId,
      fullId: c.uniprotId,
      coverage: c.coverage,
      pdbCount: c.pdbCount,
    }));
  }, [coverageData]);

  return (
    <div className="p-3 space-y-3">
      {/* ── Complex Group Hero Card ── */}
      <div className="rounded-[10px] border border-claude-border dark:border-[#3d3832] bg-claude-surface dark:bg-[#242220] p-3 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-[72px] h-[72px] rounded-xl bg-gradient-to-br from-claude-accent/20 to-purple-500/20 flex flex-col items-center justify-center border border-claude-accent/20">
            <Layers className="h-6 w-6 text-claude-accent" />
            <span className="text-[10px] font-bold font-mono text-claude-accent mt-0.5">{subEvals.length}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-claude-text leading-snug">{group.name}</h3>
            <p className="text-[10px] text-claude-text-muted mt-0.5">Complex Evaluation Group</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-claude-border-light/60 dark:bg-[#2b2926] text-claude-text-muted border border-claude-border/50">
                <Database className="h-2.5 w-2.5" />{coverageData.reduce((s, c) => s + c.pdbCount, 0)} PDB
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-claude-border-light/60 dark:bg-[#2b2926] text-claude-text-muted border border-claude-border/50">
                <FileSearch className="h-2.5 w-2.5" />{coverageData.reduce((s, c) => s + c.blastCount, 0)} BLAST
              </span>
              {groupOverallAvg > 0 && (
                <span className="text-[10px] font-mono font-bold" style={{ color: getScoreColor(groupOverallAvg) }}>
                  Avg {groupOverallAvg.toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Comparative Score Table ── */}
      {allCategories.length > 0 && (
        <div className="rounded-[10px] border border-claude-border dark:border-[#3d3832] bg-claude-surface dark:bg-[#242220] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-claude-text">Score Comparison</h4>
            {overallExtremes.diff > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/30">
                Δ {overallExtremes.diff.toFixed(1)} max diff
              </span>
            )}
          </div>

          {/* Table header */}
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-claude-border/30 dark:border-[#3d3832]/30">
                  <th className="text-left py-1 px-1.5 text-claude-text-muted font-medium">Category</th>
                  {subEvals.map((ev, idx) => (
                    <th key={ev.uniprotId} className="text-center py-1 px-1.5 font-medium min-w-[60px]">
                      <button
                        onClick={() => onSelectEval(ev.uniprotId)}
                        className="hover:underline"
                        style={{ color: EVAL_COLORS[idx % EVAL_COLORS.length] }}
                      >
                        {ev.uniprotId}
                      </button>
                    </th>
                  ))}
                  <th className="text-center py-1 px-1.5 text-claude-text-muted font-medium">Diff</th>
                </tr>
              </thead>
              <tbody>
                {allCategories.map(cat => {
                  const extremes = scoreExtremes[cat];
                  const hasDiff = extremes && extremes.diff > 0.5;
                  return (
                    <tr key={cat} className="border-b border-claude-border/10 dark:border-[#3d3832]/10">
                      <td className="py-1 px-1.5 text-claude-text-secondary font-medium">
                        {cat.charAt(0).toUpperCase() + cat.slice(1).replace(/([A-Z])/g, ' $1')}
                      </td>
                      {subEvals.map((ev, idx) => {
                        const score = evalScoresMap[ev.uniprotId]?.[cat];
                        if (score === undefined) return <td key={ev.uniprotId} className="text-center py-1 px-1.5 text-claude-text-muted">—</td>;
                        const isMax = ev.uniprotId === extremes?.maxUid && hasDiff;
                        const isMin = ev.uniprotId === extremes?.minUid && hasDiff;
                        return (
                          <td key={ev.uniprotId} className="text-center py-1 px-1.5">
                            <span
                              className={`font-mono font-semibold ${
                                isMax ? 'text-emerald-600 dark:text-emerald-400' :
                                isMin ? 'text-red-500 dark:text-red-400' :
                                ''
                              }`}
                              style={(!isMax && !isMin) ? { color: getScoreColor(score) } : undefined}
                            >
                              {score.toFixed(1)}
                              {isMax && ' ▲'}
                              {isMin && ' ▼'}
                            </span>
                          </td>
                        );
                      })}
                      <td className="text-center py-1 px-1.5">
                        {extremes ? (
                          <span className={`font-mono font-semibold ${extremes.diff > 2 ? 'text-red-500' : extremes.diff > 1 ? 'text-amber-500' : 'text-emerald-500'}`}>
                            {extremes.diff.toFixed(1)}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
                {/* Overall row */}
                <tr className="border-t-2 border-claude-border/50 dark:border-[#3d3832]/50 font-semibold">
                  <td className="py-1.5 px-1.5 text-claude-text">Overall</td>
                  {subEvals.map((ev, idx) => {
                    const score = overallScores[ev.uniprotId];
                    const isMax = ev.uniprotId === overallExtremes.maxUid && overallExtremes.diff > 0.5;
                    const isMin = ev.uniprotId === overallExtremes.minUid && overallExtremes.diff > 0.5;
                    return (
                      <td key={ev.uniprotId} className="text-center py-1.5 px-1.5">
                        <span
                          className={`font-mono ${
                            isMax ? 'text-emerald-600 dark:text-emerald-400' :
                            isMin ? 'text-red-500 dark:text-red-400' : ''
                          }`}
                          style={(!isMax && !isMin) ? { color: getScoreColor(score) } : undefined}
                        >
                          {score.toFixed(1)}
                          {isMax && ' ▲'}
                          {isMin && ' ▼'}
                        </span>
                      </td>
                    );
                  })}
                  <td className="text-center py-1.5 px-1.5">
                    <span className={`font-mono font-bold ${overallExtremes.diff > 2 ? 'text-red-500' : overallExtremes.diff > 1 ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {overallExtremes.diff.toFixed(1)}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Comparative Radar Chart ── */}
      {radarData.length > 0 && subEvals.length >= 2 && (
        <div className="rounded-[10px] border border-claude-border dark:border-[#3d3832] bg-claude-surface dark:bg-[#242220] p-3 space-y-2">
          <h4 className="text-xs font-semibold text-claude-text">Score Radar Comparison</h4>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
              <PolarGrid stroke={isDark ? '#3d3832' : '#e8e4dd'} />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 8, fill: isDark ? '#9b9590' : '#6b6560' }} />
              <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fontSize: 7, fill: isDark ? '#6b6560' : '#9b9590' }} axisLine={false} />
              {subEvals.map((ev, idx) => (
                <Radar
                  key={ev.uniprotId}
                  name={ev.uniprotId}
                  dataKey={ev.uniprotId}
                  stroke={EVAL_COLORS[idx % EVAL_COLORS.length]}
                  fill={EVAL_COLORS[idx % EVAL_COLORS.length]}
                  fillOpacity={0.08}
                  strokeWidth={2}
                />
              ))}
              <Legend wrapperStyle={{ fontSize: '9px', color: isDark ? '#9b9590' : '#7c756e' }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Coverage Comparison ── */}
      {coverageData.length > 0 && (
        <div className="rounded-[10px] border border-claude-border dark:border-[#3d3832] bg-claude-surface dark:bg-[#242220] p-3 space-y-2">
          <h4 className="text-xs font-semibold text-claude-text">Coverage Comparison</h4>
          <div className="space-y-1.5">
            {coverageData.map(c => {
              const covColor = c.coverage >= 80 ? '#2d8f8f' : c.coverage >= 50 ? '#c9872e' : c.coverage >= 25 ? '#ea580c' : '#dc2626';
              return (
                <div key={c.uniprotId} className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-claude-accent w-24 truncate">{c.uniprotId}</span>
                  <div className="flex-1 h-2 rounded-full bg-claude-border dark:bg-[#3d3832] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${c.coverage}%`, backgroundColor: covColor }}
                    />
                  </div>
                  <span className="text-[10px] font-mono font-semibold w-10 text-right" style={{ color: covColor }}>
                    {c.coverage.toFixed(0)}%
                  </span>
                  <span className="text-[9px] text-claude-text-muted w-16 text-right">
                    {c.pdbCount} PDB
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Method Distribution ── */}
      {pieData.length > 0 && (
        <div className="rounded-[10px] border border-claude-border dark:border-[#3d3832] bg-claude-surface dark:bg-[#242220] p-3 space-y-2">
          <h4 className="text-xs font-semibold text-claude-text">Method Distribution</h4>
          <div className="flex items-center gap-3">
            <div className="w-24 h-24">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={20}
                    outerRadius={40}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={EVAL_COLORS[index % EVAL_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1">
              {pieData.map((item, idx) => (
                <div key={item.name} className="flex items-center gap-1.5 text-[9px]">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: EVAL_COLORS[idx % EVAL_COLORS.length] }} />
                  <span className="text-claude-text-secondary">{item.name}</span>
                  <span className="ml-auto font-mono text-claude-text-muted">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── PDB Count Comparison ── */}
      {coverageChartData.length > 0 && (
        <div className="rounded-[10px] border border-claude-border dark:border-[#3d3832] bg-claude-surface dark:bg-[#242220] p-3 space-y-2">
          <h4 className="text-xs font-semibold text-claude-text">PDB Count per Target</h4>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={coverageChartData} layout="vertical" margin={{ left: 0, right: 10 }}>
              <XAxis type="number" tick={{ fontSize: 8, fill: isDark ? '#9b9590' : '#7c756e' }} />
              <YAxis dataKey="uniprotId" type="category" width={60} tick={{ fontSize: 8, fill: isDark ? '#9b9590' : '#7c756e' }} />
              <Bar dataKey="pdbCount" name="PDB Count" fill="#c96442" radius={[0, 3, 3, 0]} animationDuration={600} style={{ cursor: 'pointer' }}>
                {coverageChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={EVAL_COLORS[index % EVAL_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Sub-evaluation Quick Links ── */}
      <div className="rounded-[10px] border border-claude-border dark:border-[#3d3832] bg-claude-surface dark:bg-[#242220] p-3 space-y-1.5">
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-claude-text-muted mb-1.5">Open Individual Reports</h4>
        <div className="grid grid-cols-1 gap-1">
          {subEvals.map((ev, idx) => {
            const score = overallScores[ev.uniprotId] || 0;
            return (
              <button
                key={ev.uniprotId}
                onClick={() => openReport(ev.uniprotId, ev.proteinName || ev.uniprotId)}
                className="flex items-center gap-2 p-2 rounded-lg border border-claude-border/40 dark:border-[#3d3832]/40 hover:border-claude-accent/30 hover:bg-claude-border-light/30 dark:hover:bg-[#3d3832]/30 transition-all duration-150 text-left"
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: EVAL_COLORS[idx % EVAL_COLORS.length] }}
                >
                  {idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-mono font-semibold text-claude-text">{ev.uniprotId}</span>
                  <span className="text-[9px] text-claude-text-muted ml-2">{ev.proteinName || ''}</span>
                </div>
                {score > 0 && (
                  <span className="text-[10px] font-mono font-bold" style={{ color: getScoreColor(score) }}>
                    {score.toFixed(1)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}