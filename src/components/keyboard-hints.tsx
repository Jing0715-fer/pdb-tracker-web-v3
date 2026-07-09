'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Keyboard, X, Navigation, Search, PanelTopClose, List, Zap } from 'lucide-react';

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
    icon: <Zap className="h-3.5 w-3.5" />,
    shortcuts: [
      { keys: ['B'], description: 'Toggle bookmark on row' },
      { keys: ['E'], description: 'Export current view' },
      { keys: ['T'], description: 'Toggle theme' },
    ],
  },
  {
    label: 'View',
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
    <kbd className={`inline-flex items-center justify-center min-w-[22px] ${small ? 'h-5 px-1 text-[9px]' : 'h-6 px-1.5 text-[11px]'} font-mono font-semibold rounded-md bg-white dark:bg-[#2b2926] text-claude-text border border-claude-border dark:border-[#3d3832] shadow-[0_1px_2px_rgba(0,0,0,0.06),inset_0_-1px_0_rgba(0,0,0,0.06)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_-1px_0_rgba(0,0,0,0.2)] kbd-badge-enter`}>
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

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop with blur */}
      <div
        className="fixed inset-0 z-[100] bg-black/20 dark:bg-black/40 backdrop-blur-sm keyboard-hints-backdrop"
        onClick={close}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto w-full max-w-lg mx-4 bg-claude-surface dark:bg-[#242220] rounded-xl border border-claude-border dark:border-[#3d3832] shadow-2xl overflow-hidden keyboard-hints-modal">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-claude-border dark:border-[#3d3832] bg-gradient-to-r from-claude-accent/5 to-transparent">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-claude-accent/10 flex items-center justify-center">
                <Keyboard className="h-4 w-4 text-claude-accent" />
              </div>
              <h3 className="text-sm font-semibold text-claude-text">Keyboard Shortcuts</h3>
            </div>
            <button
              onClick={close}
              className="h-7 w-7 rounded-md flex items-center justify-center text-claude-text-muted hover:text-claude-text hover:bg-claude-border-light dark:hover:bg-[#2b2926] transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Shortcuts by category */}
          <div className="px-5 py-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
            <div className="space-y-5">
              {SHORTCUT_CATEGORIES.map((category, catIdx) => (
                <div key={category.label} className="keyboard-hints-category" style={{ animationDelay: `${catIdx * 60}ms` }}>
                  {/* Category header */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded-md bg-claude-accent/8 flex items-center justify-center flex-shrink-0">
                      <span className="text-claude-accent">{category.icon}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-claude-text uppercase tracking-wider">{category.label}</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-claude-border/60 to-transparent dark:from-[#3d3832]/60" />
                  </div>
                  {/* Shortcut rows */}
                  <div className="space-y-2 pl-1">
                    {category.shortcuts.map((shortcut) => (
                      <div key={shortcut.description} className="flex items-center justify-between py-0.5">
                        <span className="text-xs text-claude-text-secondary">{shortcut.description}</span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, i) => (
                            <React.Fragment key={key}>
                              {i > 0 && (
                                <span className="text-[9px] text-claude-text-muted mx-0.5 font-light">+</span>
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
            <p className="text-[10px] text-claude-text-muted text-center flex items-center justify-center gap-1.5">
              Press <KbdBadge small>?</KbdBadge> or <KbdBadge small>Esc</KbdBadge> to close
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
