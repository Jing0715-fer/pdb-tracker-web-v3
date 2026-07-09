'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, GitCompare, Layers, FileDown, ChevronUp } from 'lucide-react';

interface QuickActionsFabProps {
  selectedCount: number;
  onCopyIds: () => void;
  onCompare: () => void;
  onAddToCollection: () => void;
  onExportCsv: () => void;
}

export function QuickActionsFab({
  selectedCount,
  onCopyIds,
  onCompare,
  onAddToCollection,
  onExportCsv,
}: QuickActionsFabProps) {
  const [expanded, setExpanded] = useState(false);

  if (selectedCount === 0) return null;

  const actions = [
    { icon: Copy, label: 'Copy IDs', onClick: onCopyIds, shortcut: 'C' },
    { icon: GitCompare, label: 'Compare', onClick: onCompare, disabled: selectedCount < 2 },
    { icon: Layers, label: 'Collection', onClick: onAddToCollection },
    { icon: FileDown, label: 'Export CSV', onClick: onExportCsv },
  ];

  return (
    <div className="fixed bottom-20 right-6 z-50 flex flex-col items-end gap-2">
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="glass-panel shadow-depth-4 rounded-xl p-2 flex flex-col gap-1 min-w-[160px]"
          >
            <div className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400 font-medium">
              {selectedCount} selected
            </div>
            {actions.map(action => (
              <button
                key={action.label}
                onClick={() => {
                  if (!action.disabled) {
                    action.onClick();
                    setExpanded(false);
                  }
                }}
                disabled={action.disabled}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150
                  hover:bg-gray-100 dark:hover:bg-white/10
                  disabled:opacity-30 disabled:cursor-not-allowed
                  text-gray-700 dark:text-gray-200"
              >
                <action.icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                {action.label}
                {action.shortcut && (
                  <kbd className="ml-auto text-[10px] text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded">
                    {action.shortcut}
                  </kbd>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setExpanded(!expanded)}
        className="w-12 h-12 rounded-full bg-amber-500 hover:bg-amber-600 text-white shadow-depth-4
          flex items-center justify-center transition-colors duration-200 press-effect"
      >
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronUp className="w-5 h-5" />
        </motion.span>
        <span className="floating-badge">{selectedCount}</span>
      </motion.button>
    </div>
  );
}
