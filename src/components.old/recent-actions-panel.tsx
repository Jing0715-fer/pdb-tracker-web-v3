'use client';

import React, { useMemo } from 'react';
import { Clock, Bookmark, StickyNote, Star, GitMerge, Layers, Download, Filter, CheckCircle, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RecentAction, ActionType } from '@/hooks/use-recent-actions';

interface RecentActionsPanelProps {
  open: boolean;
  onClose: () => void;
  actions: RecentAction[];
  onClear: () => void;
  onSelectEntry: (pdbId: string) => void;
}

const ACTION_CONFIG: Record<ActionType, { icon: React.ElementType; label: string; color: string }> = {
  bookmark: { icon: Bookmark, label: 'Bookmarked', color: 'text-amber-500' },
  unbookmark: { icon: Bookmark, label: 'Unbookmarked', color: 'text-claude-text-muted' },
  note: { icon: StickyNote, label: 'Noted', color: 'text-blue-500' },
  rating: { icon: Star, label: 'Rated', color: 'text-amber-400' },
  compare: { icon: GitMerge, label: 'Compared', color: 'text-teal-500' },
  collection: { icon: Layers, label: 'Collected', color: 'text-purple-500' },
  export: { icon: Download, label: 'Exported', color: 'text-green-500' },
  filter: { icon: Filter, label: 'Filtered', color: 'text-orange-500' },
  review: { icon: CheckCircle, label: 'Reviewed', color: 'text-emerald-500' },
};

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function RecentActionsPanel({ open, onClose, actions, onClear, onSelectEntry }: RecentActionsPanelProps) {
  const { todayActions, earlierActions } = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return {
      todayActions: actions.filter(a => a.timestamp >= todayStart),
      earlierActions: actions.filter(a => a.timestamp < todayStart),
    };
  }, [actions]);

  const renderGroup = (label: string, items: RecentAction[]) => {
    if (items.length === 0) return null;
    return (
      <div key={label}>
        <h4 className="text-[10px] font-semibold text-claude-text-muted uppercase tracking-wider px-3 py-1.5">
          {label}
        </h4>
        {items.slice(0, 20).map(action => {
          const config = ACTION_CONFIG[action.type];
          const Icon = config.icon;
          return (
            <button
              key={`${action.type}-${action.pdbId}-${action.timestamp}`}
              onClick={() => { onSelectEntry(action.pdbId); onClose(); }}
              className="action-feed-item flex items-center gap-2 px-3 py-1.5 w-full text-left rounded-md cursor-pointer"
            >
              <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${config.color}`} />
              <span className="text-[11px] font-medium text-claude-text-secondary flex-1 truncate">
                {action.detail || config.label}
              </span>
              <span className="text-[10px] text-claude-text-muted flex-shrink-0 tabular-nums">
                {action.pdbId}
              </span>
              <span className="text-[9px] text-claude-text-muted/60 flex-shrink-0">
                {timeAgo(action.timestamp)}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white dark:bg-[#1e1c1a] border-l border-claude-border dark:border-[#3d3832] shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-claude-border/50 dark:border-[#3d3832]/50">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-claude-accent" />
                <h3 className="text-sm font-semibold text-claude-text-primary">Recent Actions</h3>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-claude-accent/10 text-claude-accent">
                  {actions.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {actions.length > 0 && (
                  <button
                    onClick={onClear}
                    className="p-1 rounded text-claude-text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Clear all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1 rounded text-claude-text-muted hover:text-claude-text-secondary hover:bg-claude-border-light/30 dark:hover:bg-[#2b2926]/50 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Actions List */}
            <div className="flex-1 overflow-y-auto py-2 thin-scrollbar">
              {actions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <Clock className="h-8 w-8 text-claude-text-muted/30 mb-2" />
                  <p className="text-xs text-claude-text-muted">No recent actions yet</p>
                  <p className="text-[10px] text-claude-text-muted/60 mt-1">
                    Bookmark, rate, or add notes to entries to see activity here
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {renderGroup('Today', todayActions)}
                  {earlierActions.length > 0 && renderGroup('Earlier', earlierActions)}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
