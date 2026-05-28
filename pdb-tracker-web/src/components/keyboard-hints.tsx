'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, X, Navigation, Search, PanelTopClose, Bookmark, ToggleLeft, List, Command } from 'lucide-react';

// ─── Shortcut Definitions ────────────────────────────────────────────────────

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutCategory {
  label: string;
  icon: React.ReactNode;
  shortcuts: ShortcutItem[];
}

const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    label: 'Navigation',
    icon: <Navigation className="h-3.5 w-3.5" />,
    shortcuts: [
      { keys: ['1'], description: 'Switch to Weekly mode' },
      { keys: ['2'], description: 'Switch to Evaluation mode' },
      { keys: ['3'], description: 'Switch to Literature mode' },
      { keys: ['↑', '↓'], description: 'Navigate table rows' },
      { keys: ['Enter'], description: 'Open highlighted row detail' },
    ],
  },
  {
    label: 'Search & Commands',
    icon: <Search className="h-3.5 w-3.5" />,
    shortcuts: [
      { keys: ['⌘', 'K'], description: 'Command palette' },
      { keys: ['/'], description: 'Focus search input' },
    ],
  },
  {
    label: 'Actions',
    icon: <List className="h-3.5 w-3.5" />,
    shortcuts: [
      { keys: ['B'], description: 'Toggle bookmark on row' },
      { keys: ['T'], description: 'Toggle theme' },
    ],
  },
  {
    label: 'Panels',
    icon: <PanelTopClose className="h-3.5 w-3.5" />,
    shortcuts: [
      { keys: ['Esc'], description: 'Close panel / dialog' },
      { keys: ['?'], description: 'Show this help' },
    ],
  },
];

// ─── Kbd Badge ──────────────────────────────────────────────────────────────

function KbdBadge({ children, small }: { children: React.ReactNode; small?: boolean }) {
  return (
    <kbd className={`inline-flex items-center justify-center min-w-[22px] ${small ? 'h-5 px-1 text-[9px]' : 'h-6 px-1.5 text-[11px]'} font-mono font-medium rounded-md bg-claude-surface dark:bg-[#2b2926] text-claude-text border border-claude-border dark:border-[#3d3832] shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.3)]`}>
      {children}
    </kbd>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

interface KeyboardHintsProps {
  /** External control: set true to show overlay */
  open?: boolean;
  /** Callback when overlay should close */
  onClose?: () => void;
}

export function KeyboardHints({ open: externalOpen, onClose }: KeyboardHintsProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = externalOpen ?? internalOpen;

  const close = useCallback(() => {
    setInternalOpen(false);
    onClose?.();
  }, [onClose]);

  // Listen for "?" key to toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (isInput) return;

      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setInternalOpen(prev => !prev);
      }

      if (e.key === 'Escape' && isOpen) {
        close();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, close]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] bg-black/30 dark:bg-black/50 backdrop-blur-sm"
            onClick={close}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="fixed inset-0 z-[101] flex items-center justify-center pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-lg mx-4 bg-claude-surface dark:bg-[#242220] rounded-xl border border-claude-border dark:border-[#3d3832] shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-claude-border dark:border-[#3d3832] bg-gradient-to-r from-claude-accent/5 to-transparent">
                <div className="flex items-center gap-2">
                  <Keyboard className="h-4 w-4 text-claude-accent" />
                  <h3 className="text-sm font-semibold text-claude-text">Keyboard Shortcuts</h3>
                </div>
                <button
                  onClick={close}
                  className="h-6 w-6 rounded-md flex items-center justify-center text-claude-text-muted hover:text-claude-text hover:bg-claude-border-light dark:hover:bg-[#2b2926] transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Shortcuts by category */}
              <div className="px-5 py-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-4">
                  {SHORTCUT_CATEGORIES.map((category) => (
                    <div key={category.label}>
                      {/* Category header */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-claude-accent">{category.icon}</span>
                        <span className="text-[11px] font-semibold text-claude-text uppercase tracking-wider">{category.label}</span>
                        <div className="flex-1 h-px bg-claude-border-light dark:bg-[#2b2926]" />
                      </div>
                      {/* Shortcut rows */}
                      <div className="space-y-2 pl-1">
                        {category.shortcuts.map((shortcut) => (
                          <div key={shortcut.description} className="flex items-center justify-between">
                            <span className="text-xs text-claude-text-secondary">{shortcut.description}</span>
                            <div className="flex items-center gap-1">
                              {shortcut.keys.map((key, i) => (
                                <React.Fragment key={key}>
                                  {i > 0 && (
                                    <span className="text-[9px] text-claude-text-muted mx-0.5">+</span>
                                  )}
                                  <KbdBadge small>{key}</KbdBadge>
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer hint */}
              <div className="px-5 py-2.5 border-t border-claude-border/50 dark:border-[#3d3832]/50 bg-claude-bg/50 dark:bg-[#1a1917]/50">
                <p className="text-[10px] text-claude-text-muted text-center flex items-center justify-center gap-1">
                  Press <KbdBadge small>?</KbdBadge> or <KbdBadge small>Esc</KbdBadge> to close
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
