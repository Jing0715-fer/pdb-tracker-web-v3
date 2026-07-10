'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, FileJson, ClipboardPaste, CheckCircle2, AlertTriangle, Columns3, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { PdbEntry } from '@/lib/pdb-types';
import { autoMapColumns, csvToEntries, parseCsvLine, jsonToEntries } from '@/lib/pdb-utils';

interface ImportDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (entries: PdbEntry[]) => void;
}

export function ImportDataDialog({ open, onOpenChange, onImport }: ImportDataDialogProps) {
  const [tab, setTab] = useState<'csv' | 'json'>('csv');
  const [csvText, setCsvText] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [csvPreview, setCsvPreview] = useState<string[][]>([]);
  const [jsonPreview, setJsonPreview] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setCsvText(''); setJsonText(''); setCsvHeaders([]); setColumnMapping({});
    setCsvPreview([]); setJsonPreview([]); setImporting(false); setError(null);
  }, []);

  // Reset when dialog opens/closes
  useEffect(() => { if (open) resetState(); }, [open, resetState]);

  const handleFileRead = useCallback((text: string, fileType: 'csv' | 'json') => {
    setError(null);
    if (fileType === 'csv') {
      setCsvText(text);
      const lines = text.trim().split(/\r?\n/);
      if (lines.length < 2) { setError('CSV file must have a header row and at least one data row'); return; }
      const headers = parseCsvLine(lines[0]).map(h => h.trim().replace(/^"|"$/g, ''));
      setCsvHeaders(headers);
      const mapping = autoMapColumns(headers);
      setColumnMapping(mapping);
      const previewRows = lines.slice(1, 6).map(l => parseCsvLine(l));
      setCsvPreview(previewRows);
    } else {
      setJsonText(text);
      try {
        const data = JSON.parse(text);
        if (!Array.isArray(data)) { setError('JSON must be an array of objects'); return; }
        setJsonPreview(data.slice(0, 3));
      } catch {
        setError('Invalid JSON format');
      }
    }
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'csv') { setTab('csv'); handleFileRead(text, 'csv'); }
      else if (ext === 'json') { setTab('json'); handleFileRead(text, 'json'); }
      else { setError('Unsupported file type. Please upload .csv or .json files.'); }
    };
    reader.onerror = () => setError('Failed to read file');
    reader.readAsText(file);
    e.target.value = '';
  }, [handleFileRead]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'csv') { setTab('csv'); handleFileRead(text, 'csv'); }
      else if (ext === 'json') { setTab('json'); handleFileRead(text, 'json'); }
      else { setError('Unsupported file type. Please upload .csv or .json files.'); }
    };
    reader.onerror = () => setError('Failed to read file');
    reader.readAsText(file);
  }, [handleFileRead]);

  const handleImport = useCallback(() => {
    setImporting(true); setError(null);
    try {
      let entries: PdbEntry[] = [];
      if (tab === 'csv') {
        entries = csvToEntries(csvText, columnMapping);
        if (entries.length === 0) { setError('No valid entries found. Ensure PDB ID column is mapped correctly.'); setImporting(false); return; }
      } else {
        entries = jsonToEntries(jsonText);
        if (entries.length === 0) { setError('No valid entries found in JSON. Each object must have a pdbId field.'); setImporting(false); return; }
      }
      onImport(entries);
    } catch (err: any) {
      setError(`Import failed: ${err.message}`);
    } finally {
      setImporting(false);
    }
  }, [tab, csvText, jsonText, columnMapping, onImport]);

  const PDB_FIELDS = ['pdbId', 'title', 'method', 'resolution', 'releaseDate', 'journal', 'journalIf', 'organisms', 'ligands', 'authors', 'pubmedId'];

  const mappedCount = tab === 'csv'
    ? csvToEntries(csvText, columnMapping).length
    : jsonToEntries(jsonText).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-hidden flex flex-col bg-white dark:bg-[#242220] border border-claude-border dark:border-[#4a4540] shadow-2xl">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base font-semibold text-claude-text dark:text-[#e8e4dd] flex items-center gap-2">
            <Upload className="h-4.5 w-4.5 text-claude-accent" />
            Import Data
          </DialogTitle>
          <DialogDescription className="text-[11px] text-claude-text-muted dark:text-[#9b9590]">
            Import PDB structures from CSV or JSON files. Imported entries will appear with an IMPORTED badge.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-claude-border-light/50 dark:bg-[#1a1917] rounded-lg">
          <button
            onClick={() => setTab('csv')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all duration-150 ${tab === 'csv' ? 'bg-white dark:bg-[#2b2926] text-claude-text shadow-sm' : 'text-claude-text-muted hover:text-claude-text-secondary'}`}
          >
            <ClipboardPaste className="h-3.5 w-3.5" />
            CSV
          </button>
          <button
            onClick={() => setTab('json')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all duration-150 ${tab === 'json' ? 'bg-white dark:bg-[#2b2926] text-claude-text shadow-sm' : 'text-claude-text-muted hover:text-claude-text-secondary'}`}
          >
            <FileJson className="h-3.5 w-3.5" />
            JSON
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
          {/* Upload Area */}
          {!csvText && !jsonText ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center py-12 px-6 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${dragOver ? 'border-claude-accent bg-claude-accent/5' : 'border-claude-border dark:border-[#4a4540] hover:border-claude-accent/50 hover:bg-claude-accent/[0.02]'}`}
            >
              <Upload className={`h-8 w-8 mb-3 transition-colors ${dragOver ? 'text-claude-accent' : 'text-claude-text-muted'}`} />
              <p className="text-sm font-medium text-claude-text dark:text-[#e8e4dd] mb-1">
                Drop {tab === 'csv' ? 'CSV' : 'JSON'} file here or click to browse
              </p>
              <p className="text-[10px] text-claude-text-muted">
                Supports .{tab === 'csv' ? 'csv' : 'json'} files
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept={tab === 'csv' ? '.csv' : '.json'}
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-3">
              {/* File loaded indicator */}
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-claude-accent/5 dark:bg-claude-accent/10 border border-claude-accent/20">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-[11px] font-medium text-claude-text dark:text-[#e8e4dd]">
                    File loaded — {tab === 'csv' ? `${csvPreview.length} preview rows` : `${jsonPreview.length} preview objects`}
                  </span>
                </div>
                <button onClick={resetState} className="text-[10px] text-claude-text-muted hover:text-red-500 transition-colors">
                  Clear
                </button>
              </div>

              {tab === 'csv' ? (
                <>
                  {/* CSV Preview Table */}
                  <div className="overflow-x-auto rounded-lg border border-claude-border dark:border-[#3d3832]">
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="bg-claude-border-light/50 dark:bg-[#1a1917]">
                          <th className="px-2 py-1.5 text-left font-semibold text-claude-text-muted uppercase">Row</th>
                          {csvHeaders.map(h => (
                            <th key={h} className="px-2 py-1.5 text-left font-semibold text-claude-text-muted uppercase max-w-[120px] truncate">
                              {h}
                              {columnMapping[h] && (
                                <span className="ml-1 inline-block px-1 py-0 rounded text-[8px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                                  → {columnMapping[h]}
                                </span>
                              )}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.map((row, i) => (
                          <tr key={i} className="border-t border-claude-border-light dark:border-[#3d3832]">
                            <td className="px-2 py-1 text-claude-text-muted tabular-nums">{i + 1}</td>
                            {row.map((cell, j) => (
                              <td key={j} className="px-2 py-1 text-claude-text-secondary max-w-[120px] truncate" title={cell}>
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Column Mapping */}
                  <div className="space-y-1.5">
                    <h4 className="text-[11px] font-semibold text-claude-text dark:text-[#e8e4dd] flex items-center gap-1.5">
                      <Columns3 className="h-3.5 w-3.5 text-claude-accent" />
                      Column Mapping
                    </h4>
                    <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                      {csvHeaders.map(header => (
                        <div key={header} className="flex items-center gap-1.5">
                          <span className="text-[10px] text-claude-text-muted truncate max-w-[100px]" title={header}>{header}</span>
                          <span className="text-[10px] text-claude-text-muted/50">→</span>
                          <select
                            value={columnMapping[header] || ''}
                            onChange={(e) => setColumnMapping(prev => ({ ...prev, [header]: e.target.value }))}
                            className="flex-1 text-[10px] bg-white dark:bg-[#1a1917] border border-claude-border dark:border-[#3d3832] rounded px-1 py-0.5 text-claude-text dark:text-[#e8e4dd] focus:outline-none focus:ring-1 focus:ring-claude-accent/30"
                          >
                            <option value="">— skip —</option>
                            {PDB_FIELDS.map(f => (
                              <option key={f} value={f}>{f}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* JSON Preview */}
                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                    {jsonPreview.map((item, i) => (
                      <div key={i} className="p-2 rounded-lg border border-claude-border-light dark:border-[#3d3832] bg-white/50 dark:bg-[#1a1917]/50">
                        <div className="text-[10px] text-claude-text-muted mb-1">Object {i + 1}</div>
                        <pre className="text-[10px] text-claude-text-secondary font-mono whitespace-pre-wrap break-all max-h-24 overflow-hidden">
                          {JSON.stringify(item, null, 2).slice(0, 500)}
                        </pre>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40">
              <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="pt-3 border-t border-claude-border-light dark:border-[#3d3832]">
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] text-claude-text-muted">
              {mappedCount > 0 && (
                <span className="text-green-600 dark:text-green-400 font-medium">{mappedCount} valid entries</span>
              )}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => onOpenChange(false)}
                className="px-3 py-1.5 rounded-md text-[11px] font-medium text-claude-text-muted hover:text-claude-text hover:bg-claude-border-light dark:hover:bg-[#3d3832] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={mappedCount === 0 || importing}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[11px] font-medium bg-claude-accent text-white hover:bg-claude-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {importing ? 'Importing…' : 'Import'}
              </button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
