'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { PdbTrackerSidebar } from './pdb-sidebar';

interface MobileSidebarPanelProps {
  open: boolean;
  onClose: () => void;
  sidebarProps: React.ComponentProps<typeof PdbTrackerSidebar>;
}

export default function MobileSidebarPanel({ open, onClose, sidebarProps }: MobileSidebarPanelProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="sidebar-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
          <motion.div
            key="sidebar-panel"
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-[280px] max-w-[85vw] bg-claude-surface dark:bg-[#242220] border-r border-claude-border dark:border-[#3d3832] flex flex-col lg:hidden shadow-2xl sidebar-gradient overflow-hidden relative"
          >
            <div className="sidebar-mesh-overlay" />
            {/* Close button header */}
            <div className="flex items-center justify-between px-3 border-b border-claude-border dark:border-[#3d3832] relative z-[1] h-12">
              <span className="text-xs font-semibold text-claude-text">Navigation</span>
              <button
                onClick={onClose}
                className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-claude-border-light dark:hover:bg-claude-border transition-colors duration-150 btn-press-subtle"
                aria-label="Close navigation menu"
              >
                <X className="h-4 w-4 text-claude-text-muted" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden relative z-[1]">
              <PdbTrackerSidebar {...sidebarProps} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
