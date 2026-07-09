'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Copy,
  Check,
  Download,
  FileSpreadsheet,
  FileJson,
  FileText,
  FileType2,
  GraduationCap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── Types ──────────────────────────────────────────────────────────────────

type ExportFormat = 'csv' | 'json' | 'tsv' | 'markdown' | 'bibtex';

interface DataExportPanelProps {
  entries: any[];
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

// ─── Format Metadata ───────────────────────────────────────────────────────

const FORMAT_CONFIG: {
  key: ExportFormat;
  label: string;
  icon: React.ElementType;
  mime: string;
  ext: string;
  description: string;
}[] = [
  { key: 'csv', label: 'CSV', icon: FileSpreadsheet, mime: 'text/csv', ext: '.csv', description: 'Comma-separated values' },
  { key: 'json', label: 'JSON', icon: FileJson, mime: 'application/json', ext: '.json', description: 'Structured JSON data' },
  { key: 'tsv', label: 'TSV', icon: FileText, mime: 'text/tab-separated-values', ext: '.tsv', description: 'Tab-separated values' },
  { key: 'markdown', label: 'Markdown', icon: FileType2, mime: 'text/markdown', ext: '.md', description: 'Markdown table format' },
  { key: 'bibtex', label: 'BibTeX', icon: GraduationCap, mime: 'text/x-bibtex', ext: '.bib', description: 'Academic citation format' },
];

// ─── Serialization Helpers ─────────────────────────────────────────────────

function extractFlatEntries(entries: any[]): Record<string, any>[] {
  return entries.map((entry) => {
    if (typeof entry === 'object' && entry !== null) {
      const flat: Record<string, any> = {};
      for (const [key, value] of Object.entries(entry)) {
        if (Array.isArray(value)) {
          flat[key] = value.join('; ');
        } else if (typeof value === 'object' && value !== null) {
          flat[key] = JSON.stringify(value);
        } else {
          flat[key] = value ?? '';
        }
      }
      return flat;
    }
    return { value: entry };
  });
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function serializeCsv(entries: any[]): string {
  const flat = extractFlatEntries(entries);
  if (flat.length === 0) return '';
  const headers = Object.keys(flat[0]);
  const headerLine = headers.map(escapeCsvField).join(',');
  const rows = flat.map((row) =>
    headers.map((h) => escapeCsvField(String(row[h] ?? ''))).join(',')
  );
  return [headerLine, ...rows].join('\n');
}

function serializeJson(entries: any[]): string {
  return JSON.stringify(entries, null, 2);
}

function serializeTsv(entries: any[]): string {
  const flat = extractFlatEntries(entries);
  if (flat.length === 0) return '';
  const headers = Object.keys(flat[0]);
  const headerLine = headers.join('\t');
  const rows = flat.map((row) =>
    headers.map((h) => String(row[h] ?? '').replace(/\t/g, ' ')).join('\t')
  );
  return [headerLine, ...rows].join('\n');
}

function serializeMarkdown(entries: any[]): string {
  const flat = extractFlatEntries(entries);
  if (flat.length === 0) return '';
  const headers = Object.keys(flat[0]);
  const headerLine = `| ${headers.join(' | ')} |`;
  const separatorLine = `| ${headers.map(() => '---').join(' | ')} |`;
  const rows = flat.map(
    (row) =>
      `| ${headers.map((h) => String(row[h] ?? '').replace(/\|/g, '\\|')).join(' | ')} |`
  );
  return [headerLine, separatorLine, ...rows].join('\n');
}

function serializeBibtex(entries: any[]): string {
  return entries
    .map((entry) => {
      const e = entry as Record<string, any>;
      const id = (e.pdbId || e.id || `entry_${Math.random().toString(36).slice(2, 8)}`).toLowerCase();
      const title = (e.title || id).replace(/[{}]/g, '');
      const authors = e.authors
        ? e.authors
            .split(/[,|]/)
            .map((a: string) => a.trim())
            .filter(Boolean)
        : [];
      const lastName =
        authors.length > 0 ? (authors[0].split(' ').pop() || 'Unknown') : 'Unknown';
      const firstNames =
        authors.length > 0
          ? authors
              .slice(0, 3)
              .map((a: string) => a.split(' ')[0])
              .join(', ')
          : 'Unknown';
      const year = e.releaseDate
        ? new Date(e.releaseDate).getFullYear()
        : e.year || new Date().getFullYear();
      const journal = e.journal || 'Unknown Journal';

      return [
        `@article{${id},`,
        `  title = {${title}},`,
        `  author = {${lastName}, ${firstNames}${authors.length > 3 ? ' and others' : ''}},`,
        `  journal = {${journal}},`,
        `  year = {${year}},`,
        `}`,
      ].join('\n');
    })
    .join('\n\n');
}

const SERIALIZERS: Record<ExportFormat, (entries: any[]) => string> = {
  csv: serializeCsv,
  json: serializeJson,
  tsv: serializeTsv,
  markdown: serializeMarkdown,
  bibtex: serializeBibtex,
};

// ─── Component ─────────────────────────────────────────────────────────────

export function DataExportPanel({
  entries,
  isOpen,
  onClose,
  title = 'Export Data',
}: DataExportPanelProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv');
  const [copied, setCopied] = useState(false);

  const serialized = useMemo(
    () => SERIALIZERS[selectedFormat](entries),
    [entries, selectedFormat]
  );

  const preview = serialized.slice(0, 500) + (serialized.length > 500 ? '…' : '');

  const activeConfig = FORMAT_CONFIG.find((f) => f.key === selectedFormat)!;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(serialized);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: textarea copy
      const ta = document.createElement('textarea');
      ta.value = serialized;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [serialized]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([serialized], { type: activeConfig.mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '-').toLowerCase()}${activeConfig.ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [serialized, activeConfig, title]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="glass-surface w-full max-w-lg mx-4 max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-claude-border/40 dark:border-[#3d3832]/40 flex-shrink-0">
              <div>
                <h2 className="text-sm font-semibold text-claude-text">{title}</h2>
                <p className="text-[10px] text-claude-text-muted mt-0.5">
                  {entries.length} {entries.length === 1 ? 'entry' : 'entries'} &middot;{' '}
                  {serialized.length.toLocaleString()} chars
                </p>
              </div>
              <button
                onClick={onClose}
                className="h-7 w-7 flex items-center justify-center rounded-md text-claude-text-muted hover:text-claude-text hover:bg-claude-border-light dark:hover:bg-[#3d3832] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Format Grid */}
            <div className="px-5 pt-4 pb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-claude-text-muted mb-2.5">
                Choose Format
              </p>
              <div className="grid grid-cols-5 gap-2">
                {FORMAT_CONFIG.map((fmt) => {
                  const Icon = fmt.icon;
                  const isActive = selectedFormat === fmt.key;
                  return (
                    <motion.button
                      key={fmt.key}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setSelectedFormat(fmt.key)}
                      className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all duration-150 ${
                        isActive
                          ? 'border-claude-accent bg-claude-accent-light dark:bg-[#3d2a22] text-claude-accent shadow-sm'
                          : 'border-claude-border/60 dark:border-[#3d3832]/60 text-claude-text-muted hover:border-claude-accent/40 hover:text-claude-text-secondary hover:bg-claude-border-light/30 dark:hover:bg-[#2b2926]/50'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-[10px] font-semibold leading-tight">{fmt.label}</span>
                    </motion.button>
                  );
                })}
              </div>
              <p className="text-[10px] text-claude-text-muted mt-1.5 text-center">
                {activeConfig.description}
              </p>
            </div>

            {/* Preview */}
            <div className="flex-1 mx-5 mb-3 rounded-lg border border-claude-border/40 dark:border-[#3d3832]/40 bg-white/40 dark:bg-[#1a1917]/40 overflow-hidden flex flex-col min-h-0">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-claude-border/30 dark:border-[#3d3832]/30 bg-claude-border-light/20 dark:bg-[#2b2926]/30">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-claude-text-muted">
                  Preview
                </span>
                <span className="text-[9px] text-claude-text-muted font-mono">
                  {serialized.length.toLocaleString()} chars
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                <pre className="text-[11px] font-mono text-claude-text-secondary whitespace-pre-wrap break-words leading-relaxed">
                  {preview}
                </pre>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 px-5 py-3 border-t border-claude-border/40 dark:border-[#3d3832]/40 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="flex-1 h-8 text-xs gap-1.5 border-claude-border dark:border-[#3d3832] text-claude-text-secondary hover:text-claude-text"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy to Clipboard
                  </>
                )}
              </Button>
              <Button
                size="sm"
                onClick={handleDownload}
                className="flex-1 h-8 text-xs gap-1.5 bg-claude-accent hover:bg-claude-accent-hover text-white"
              >
                <Download className="h-3.5 w-3.5" />
                Download {activeConfig.label}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
