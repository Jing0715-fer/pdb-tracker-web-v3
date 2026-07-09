'use client';

import React, { useState, useCallback } from 'react';
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  RotateCcw,
  Microscope,
  Dna,
  Atom,
  FileText,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Target,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { PdbEntry } from './types';

// ─── Types ─────────────────────────────────────────────────────────────────

interface AiAnalysisPanelProps {
  entry: PdbEntry | null;
}

interface AnalysisSection {
  id: string;
  title: string;
  icon: React.ElementType;
  content: string;
  color: string;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function AiAnalysisPanel({ entry }: AiAnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<AnalysisSection[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copySection = (id: string, content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const runAnalysis = useCallback(async () => {
    if (!entry) return;
    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const response = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdbId: entry.pdbId,
          title: entry.title,
          method: entry.method,
          resolution: entry.resolution,
          organism: entry.organisms,
          journal: entry.journal,
          journalIf: entry.journalIf,
          ligands: entry.ligands,
          releaseDate: entry.releaseDate,
        }),
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const data = await response.json();
      setAnalysis(data.sections);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }, [entry]);

  if (!entry) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-claude-accent/20 to-purple-500/20 flex items-center justify-center mb-4 animate-gentle-float">
          <Sparkles className="h-7 w-7 text-claude-accent" />
        </div>
        <p className="text-sm text-claude-text-muted text-center">Select a structure to analyze</p>
        <p className="text-[11px] text-claude-text-muted/50 text-center mt-1">AI-powered insights will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-claude-accent/20 to-purple-500/20">
          <Sparkles className="h-4 w-4 text-claude-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-claude-text dark:text-[#e8e4dd]">AI Analysis</h4>
          <p className="text-[10px] text-claude-text-muted truncate">{entry.pdbId} — {entry.title?.slice(0, 60)}...</p>
        </div>
      </div>

      {/* Info badges */}
      <div className="flex flex-wrap gap-1.5">
        {entry.method && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400">
            <Microscope className="h-2.5 w-2.5" />
            {entry.method}
          </span>
        )}
        {entry.resolution != null && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">
            <Atom className="h-2.5 w-2.5" />
            {entry.resolution}Å
          </span>
        )}
        {entry.organisms && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
            <Dna className="h-2.5 w-2.5" />
            {entry.organisms.length > 25 ? entry.organisms.slice(0, 25) + '...' : entry.organisms}
          </span>
        )}
      </div>

      {/* Analyze Button */}
      <Button
        onClick={runAnalysis}
        disabled={loading}
        className="w-full gap-2 bg-gradient-to-r from-claude-accent to-purple-600 hover:from-claude-accent/90 hover:to-purple-600/90 text-white shadow-lg shadow-claude-accent/20 transition-all duration-200 hover:shadow-xl hover:shadow-claude-accent/30"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing...
          </>
        ) : analysis ? (
          <>
            <RotateCcw className="h-4 w-4" />
            Re-analyze
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Analyze with AI
          </>
        )}
      </Button>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30">
          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-red-700 dark:text-red-400">Analysis Failed</p>
            <p className="text-[10px] text-red-600/70 dark:text-red-400/60 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-1.5">
          {analysis.map((section) => {
            const isExpanded = expandedSections.has(section.id);
            const isCopied = copiedId === section.id;
            return (
              <Collapsible
                key={section.id}
                open={isExpanded}
                onOpenChange={() => toggleSection(section.id)}
              >
                <CollapsibleTrigger className="w-full flex items-center gap-2 p-2.5 rounded-lg hover:bg-claude-border-light/50 dark:hover:bg-claude-border/30 transition-colors duration-150 group">
                  <section.icon className={`h-3.5 w-3.5 flex-shrink-0 ${section.color}`} />
                  <span className="text-[11px] font-semibold text-claude-text dark:text-[#e8e4dd] flex-1 text-left">{section.title}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); copySection(section.id, section.content); }}
                    className="p-1 rounded-md hover:bg-claude-border-light dark:hover:bg-claude-border transition-colors opacity-0 group-hover:opacity-100"
                    title="Copy section"
                  >
                    {isCopied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-claude-text-muted" />}
                  </button>
                  <ChevronDown className={`h-3 w-3 text-claude-text-muted transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pl-8 pr-2 pb-2">
                    <div className="text-[11px] text-claude-text-secondary dark:text-[#c8c3bc] leading-relaxed whitespace-pre-wrap">
                      {section.content}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-2">
              <div className="h-3 bg-claude-border-light dark:bg-claude-border rounded w-1/3" />
              <div className="h-2.5 bg-claude-border-light/50 dark:bg-claude-border/30 rounded w-full" />
              <div className="h-2.5 bg-claude-border-light/50 dark:bg-claude-border/30 rounded w-5/6" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
