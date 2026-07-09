'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Clock, FileText, Target } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EvalSummary } from '@/components/eval-summary';
import { EvalTimeline } from '@/components/evaluation-timeline';
import { EvalScatterPlot } from '@/components/eval-scatter-plot';
import { ReportModal } from '@/components/ui/pdb-ui';
import type { Evaluation, EvalRow } from '@/lib/pdb-types';

interface EvalPreviewPanelProps {
  evaluation: Evaluation | null;
  rows: EvalRow[];
  selectedPdbId?: string | null;
  onSelectPdb?: (pdbId: string) => void;
  allEvaluations?: Evaluation[];
}

export function EvalPreviewPanel({
  evaluation,
  rows,
  selectedPdbId,
  onSelectPdb,
  allEvaluations = [],
}: EvalPreviewPanelProps) {
  const [reportOpen, setReportOpen] = useState(false);

  if (!evaluation) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-claude-text-muted">
        <div className="text-center">
          <Target className="h-8 w-8 mx-auto mb-2 text-claude-border dark:text-[#3d3832] animate-float" />
          <p className="text-xs">Select an evaluation to preview</p>
        </div>
      </div>
    );
  }

  const hasReport = !!evaluation.report;

  return (
    <div className="flex flex-col h-full preview-gradient-border">
      <Tabs defaultValue="summary" className="flex flex-col h-full">
        <div className="px-3 pt-2 border-b border-claude-border dark:border-[#3d3832] bg-claude-surface dark:bg-[#242220]">
          <TabsList className="h-8 bg-transparent p-0 gap-0">
            <TabsTrigger
              value="summary"
              className="tab-gradient-active h-8 px-3 text-[11px] font-medium data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-claude-accent text-claude-text-muted rounded-b-none border-b-2 border-transparent data-[state=active]:border-claude-accent"
            >
              <Target className="h-3 w-3 mr-1" />
              Summary
            </TabsTrigger>
            <TabsTrigger
              value="timeline"
              className="tab-gradient-active h-8 px-3 text-[11px] font-medium data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-claude-accent text-claude-text-muted rounded-b-none border-b-2 border-transparent data-[state=active]:border-claude-accent"
            >
              <Clock className="h-3 w-3 mr-1" />
              Timeline
            </TabsTrigger>
            <TabsTrigger
              value="scatter"
              className="tab-gradient-active h-8 px-3 text-[11px] font-medium data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-claude-accent text-claude-text-muted rounded-b-none border-b-2 border-transparent data-[state=active]:border-claude-accent"
            >
              <BarChart3 className="h-3 w-3 mr-1" />
              Scatter
            </TabsTrigger>
            <TabsTrigger
              value="report"
              className="tab-gradient-active h-8 px-3 text-[11px] font-medium data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-claude-accent text-claude-text-muted rounded-b-none border-b-2 border-transparent data-[state=active]:border-claude-accent"
              disabled={!hasReport}
            >
              <FileText className="h-3 w-3 mr-1" />
              Report
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto preview-scroll">
          <TabsContent value="summary" className="mt-0 p-4">
            <EvalSummary evaluation={evaluation} comparisonEvaluations={allEvaluations.filter(e => e.uniprotId !== evaluation.uniprotId)} />
          </TabsContent>

          <TabsContent value="timeline" className="mt-0 p-4">
            <div className="space-y-3">
              <h4 className="text-[11px] font-semibold text-claude-text uppercase tracking-wider">
                Structure Timeline
              </h4>
              <EvalTimeline
                rows={rows}
                onSelectPdb={onSelectPdb}
                selectedPdbId={selectedPdbId}
              />
            </div>
          </TabsContent>

          <TabsContent value="scatter" className="mt-0 p-4">
            <div className="space-y-3">
              <h4 className="text-[11px] font-semibold text-claude-text uppercase tracking-wider">
                Resolution vs Impact Factor
              </h4>
              <EvalScatterPlot
                rows={rows}
                onSelectPdb={onSelectPdb}
                selectedPdbId={selectedPdbId}
              />
            </div>
          </TabsContent>

          <TabsContent value="report" className="mt-0 p-4">
            {hasReport ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-claude-text">
                    Evaluation Report
                  </h3>
                  <button
                    onClick={() => setReportOpen(true)}
                    className="text-[11px] text-claude-accent hover:text-claude-accent-hover transition-colors"
                  >
                    View Full Report →
                  </button>
                </div>
                <div className="text-xs max-h-[60vh] overflow-y-auto custom-scrollbar">
                  <ReportPreview content={evaluation.report!} />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-sm text-claude-text-muted">
                <div className="text-center">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-claude-border dark:text-[#3d3832]" />
                  <p className="text-xs">No report available</p>
                </div>
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>

      {/* Full Report Modal */}
      {hasReport && (
        <ReportModal
          isOpen={reportOpen}
          onClose={() => setReportOpen(false)}
          title={`${evaluation.proteinName || evaluation.uniprotId} — Evaluation Report`}
          content={evaluation.report!}
        />
      )}
    </div>
  );
}

function ReportPreview({ content }: { content: string }) {
  const stripped = content
    .replace(/^---[\s\S]*?---\s*/m, '')
    .replace(/^#\s+.+\n/, '');
  const preview = stripped.slice(0, 1500);
  const isTruncated = stripped.length > 1500;

  return (
    <div className="prose prose-xs max-w-none">
      <pre className="whitespace-pre-wrap text-[11px] text-claude-text-secondary leading-relaxed font-sans bg-transparent p-0 m-0 border-0">
        {preview}
        {isTruncated && (
          <span className="text-claude-text-muted">...</span>
        )}
      </pre>
    </div>
  );
}
