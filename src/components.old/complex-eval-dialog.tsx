'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ComplexEvalDialogProps {
  open: boolean;
  onClose: () => void;
  complexName: string;
  onComplexNameChange: (value: string) => void;
  complexInput: string;
  onComplexInputChange: (value: string) => void;
  onCreateGroup: () => void;
}

export function ComplexEvalDialog({
  open,
  onClose,
  complexName,
  onComplexNameChange,
  complexInput,
  onComplexInputChange,
  onCreateGroup,
}: ComplexEvalDialogProps) {
  const detectedIds = complexInput
    .split(/[\s,;]+/)
    .filter(id => id.trim().length > 0).length;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center no-print"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <motion.div
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            className="relative bg-claude-surface dark:bg-[#242220] border border-claude-border dark:border-[#4a4540] rounded-xl shadow-2xl w-[420px] max-w-[90vw] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-claude-text flex items-center gap-2">
                <Layers className="h-4 w-4 text-claude-accent" />
                Create Complex Evaluation Group
              </h3>
              <button
                onClick={onClose}
                className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-claude-border-light dark:hover:bg-[#3d3832] transition-colors"
              >
                <X className="h-4 w-4 text-claude-text-muted" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-claude-text-secondary mb-1 block">Group Name (optional)</label>
                <input
                  type="text"
                  value={complexName}
                  onChange={e => onComplexNameChange(e.target.value)}
                  placeholder="e.g. EGFR Complex"
                  className="w-full px-3 py-2 text-xs rounded-md border border-claude-border dark:border-[#3d3832] bg-white dark:bg-[#1a1917] dark:text-[#e8e4dd] focus:outline-none focus:ring-2 focus:ring-claude-accent/40 focus:border-claude-accent/40 placeholder:text-claude-text-muted/60"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-claude-text-secondary mb-1 block">UniProt IDs <span className="text-claude-text-muted">(space, comma, or semicolon separated)</span></label>
                <textarea
                  value={complexInput}
                  onChange={e => onComplexInputChange(e.target.value)}
                  placeholder="e.g. P00533 P04637 Q9Y6K9"
                  rows={3}
                  className="w-full px-3 py-2 text-xs rounded-md border border-claude-border dark:border-[#3d3832] bg-white dark:bg-[#1a1917] dark:text-[#e8e4dd] focus:outline-none focus:ring-2 focus:ring-claude-accent/40 focus:border-claude-accent/40 placeholder:text-claude-text-muted/60 resize-none font-mono"
                />
                {complexInput && (
                  <div className="mt-1 text-[10px] text-claude-text-muted">
                    {detectedIds} IDs detected
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={onCreateGroup}
                  disabled={detectedIds < 2}
                  className="flex-1 h-8 text-xs bg-claude-accent hover:bg-claude-accent/90 text-white"
                >
                  <Layers className="h-3 w-3 mr-1" />
                  Create Group
                </Button>
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
