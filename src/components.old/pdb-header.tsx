'use client';

import React, { type RefObject } from 'react';
import {
  Dna,
  Terminal,
  Keyboard,
  HelpCircle,
  Bell,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Info,
  Sun,
  Moon,
  Menu,
  BarChart3,
  Settings,
  Clock,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { HeaderParticles } from '@/components/ui/pdb-animated';

// ── Notification History Item Type ──
export interface NotificationHistoryItem {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  description?: string;
  timestamp: number;
  read: boolean;
}

// ── Props Interface ──
export interface PdbHeaderProps {
  hasLoaded: boolean;
  tourTitleRef: RefObject<HTMLDivElement | null>;
  tourShortcutsRef: RefObject<HTMLButtonElement | null>;
  mounted: boolean;
  theme: string | undefined;
  setTheme: (theme: string) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setShortcutsPanelOpen: (open: boolean) => void;
  startTour: () => void;
  notificationHistoryOpen: boolean;
  setNotificationHistoryOpen: (open: boolean) => void;
  markAllNotificationHistoryRead: () => void;
  notificationHistory: NotificationHistoryItem[];
  notifHistoryUnreadCount: number;
  clearNotificationHistory: () => void;
  setPreferencesDialogOpen: (open: boolean) => void;
  setMobileSidebarOpen: (open: boolean) => void;
  setMobilePreviewOpen: (open: boolean) => void;
  onOpenRecentActions?: () => void;
  recentActionsCount?: number;
}

// ── PdbHeader Component ──
export default function PdbHeader({
  hasLoaded,
  tourTitleRef,
  tourShortcutsRef,
  mounted,
  theme,
  setTheme,
  setCommandPaletteOpen,
  setShortcutsPanelOpen,
  startTour,
  notificationHistoryOpen,
  setNotificationHistoryOpen,
  markAllNotificationHistoryRead,
  notificationHistory,
  notifHistoryUnreadCount,
  clearNotificationHistory,
  setPreferencesDialogOpen,
  setMobileSidebarOpen,
  setMobilePreviewOpen,
  onOpenRecentActions,
  recentActionsCount,
}: PdbHeaderProps) {
  return (
    <header className={`glass-card flex-shrink-0 h-[48px] sm:h-[52px] flex items-center px-2 sm:px-4 bg-claude-surface dark:bg-[#242220] border-b border-claude-border dark:border-[#3d3832] relative z-20 no-print ${hasLoaded ? 'animate-load-header' : 'opacity-0'}`}>
      {/* Noise texture overlay */}
      <div className="noise-overlay absolute inset-0 pointer-events-none z-[1]" />
      {/* Gradient border at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-claude-accent/20 to-transparent bg-[length:200%_100%] animate-[gradient-shift_3s_ease-in-out_infinite]" />
      {/* Header Particles */}
      <HeaderParticles />
      <div ref={tourTitleRef} className="flex items-center gap-1.5 sm:gap-3 relative z-10 min-w-0">
        <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-claude-accent-light dark:bg-[#3d2a22] flex-shrink-0">
          <Dna className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-claude-accent" />
        </div>
        <div className="hidden sm:block min-w-0">
          <h1 className="text-base font-semibold text-claude-text leading-tight header-title text-gradient-animated shimmer-text" style={{ letterSpacing: '-0.02em' }}>PDB Structure Tracker</h1>
          <p className="text-[10px] text-claude-text-muted leading-tight text-shadow-soft">Protein Data Bank Weekly Tracking &amp; Evaluation System</p>
        </div>
        <div className="sm:hidden min-w-0">
          <h1 className="text-sm font-semibold text-claude-text leading-tight" style={{ letterSpacing: '-0.02em' }}>PDB Tracker</h1>
        </div>
      </div>

      {/* Header Action Buttons */}
      <div className="flex items-center gap-1 relative z-10 ml-auto">
      {/* Command Palette Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="hidden sm:inline-flex items-center justify-center min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:h-8 sm:w-8 rounded-md hover:bg-claude-border-light dark:hover:bg-claude-border transition-colors duration-150 claude-focus-ring btn-press btn-press-enhanced ripple-btn btn-press-3d hover-scale-95"
            aria-label="Command palette"
          >
            <Terminal className="h-4 w-4 text-claude-text-secondary" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="tooltip-enter">
          <span className="text-[10px]">Command Palette <kbd className="ml-1 px-1 py-0.5 rounded text-[9px] font-mono bg-claude-border-light text-claude-text-muted border border-claude-border">⌘K</kbd></span>
        </TooltipContent>
      </Tooltip>

      {/* Keyboard Shortcuts Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            ref={tourShortcutsRef}
            onClick={() => setShortcutsPanelOpen(true)}
            className="hidden sm:inline-flex items-center justify-center min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:h-8 sm:w-8 rounded-md hover:bg-claude-border-light dark:hover:bg-claude-border transition-colors duration-150 claude-focus-ring btn-press btn-press-enhanced ripple-btn btn-press-3d hover-scale-95"
            aria-label="Keyboard shortcuts"
          >
            <Keyboard className="h-4 w-4 text-claude-text-secondary" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="tooltip-enter">
          <span className="text-[10px]">Keyboard Shortcuts <kbd className="ml-1 px-1 py-0.5 rounded text-[9px] font-mono bg-claude-border-light text-claude-text-muted border border-claude-border">?</kbd></span>
        </TooltipContent>
      </Tooltip>

      {/* Help / Restart Tour Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={startTour}
            className="hidden sm:inline-flex items-center justify-center min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:h-8 sm:w-8 rounded-md hover:bg-claude-border-light dark:hover:bg-claude-border transition-colors duration-150 claude-focus-ring btn-press btn-press-enhanced ripple-btn btn-press-3d hover-scale-95"
            aria-label="Help"
          >
            <HelpCircle className="h-4 w-4 text-claude-text-secondary" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="tooltip-enter">
          <span className="text-[10px]">Help &amp; Tour</span>
        </TooltipContent>
      </Tooltip>

      {/* Notification Center — Notification History Dropdown */}
      <Popover open={notificationHistoryOpen} onOpenChange={(open) => { setNotificationHistoryOpen(open); if (open) markAllNotificationHistoryRead(); }}>
        <PopoverTrigger asChild>
          <button
            className={`hidden sm:inline-flex items-center justify-center sm:h-8 sm:w-8 rounded-md hover:bg-claude-border-light dark:hover:bg-claude-border transition-colors duration-150 claude-focus-ring btn-press btn-press-enhanced ripple-btn btn-press-3d hover-scale-95 relative`}
            aria-label={`Notifications${notifHistoryUnreadCount > 0 ? ` (${notifHistoryUnreadCount} unread)` : ''}`}
          >
            <Bell className="h-4 w-4 text-claude-text-secondary" />
            {notifHistoryUnreadCount > 0 && (
              <span className="notification-badge-pulse notification-badge-ping badge-pulse absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white px-0.5 leading-none">
                {notifHistoryUnreadCount > 9 ? '9+' : notifHistoryUnreadCount}
              </span>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 pointer-events-none">
              <kbd className="text-[8px] leading-none px-0.5 py-px rounded font-mono bg-claude-border-light/80 dark:bg-claude-border/50 text-claude-text-muted/60 border border-claude-border/50">Alt+T</kbd>
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="end" className="w-80 p-0 glass-card-premium">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-claude-border/50 dark:border-[#3d3832]/50">
            <span className="text-xs font-semibold text-claude-text">Notification History</span>
            {notificationHistory.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); clearNotificationHistory(); }}
                className="text-[10px] text-claude-text-muted hover:text-red-500 transition-colors flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" />
                Clear All
              </button>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            {notificationHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 px-4">
                <Bell className="h-5 w-5 text-claude-text-muted/40 mb-2" />
                <p className="text-[10px] text-claude-text-muted text-center">No notifications yet</p>
              </div>
            ) : (
              notificationHistory.slice(0, 15).map((item) => {
                const notifIcon = item.type === 'success' ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : item.type === 'error' ? <AlertTriangle className="h-3.5 w-3.5 text-red-500" /> : item.type === 'warning' ? <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> : <Info className="h-3.5 w-3.5 text-blue-500" />;
                const timeAgo = (() => {
                  const diff = Math.floor((Date.now() - item.timestamp) / 1000);
                  if (diff < 60) return 'Just now';
                  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
                  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
                  return `${Math.floor(diff / 86400)}d ago`;
                })();
                return (
                  <div
                    key={item.id}
                    className={`flex items-start gap-2.5 px-3 py-2 hover:bg-claude-border-light/30 dark:hover:bg-[#2b2926] transition-colors border-b border-claude-border-light/30 dark:border-[#3d3832]/30 last:border-b-0 toast-enter ${!item.read ? 'bg-claude-accent-light/20 dark:bg-[#3d2a22]/20' : ''}`}
                  >
                    <span className="flex-shrink-0 mt-0.5">{notifIcon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-claude-text truncate">{item.message}</p>
                      {item.description && <p className="text-[9px] text-claude-text-muted truncate">{item.description}</p>}
                      <p className="text-[8px] text-claude-text-muted/50 mt-0.5">{timeAgo}</p>
                    </div>
                    {!item.read && <span className="w-1.5 h-1.5 rounded-full bg-claude-accent flex-shrink-0 mt-1.5" />}
                  </div>
                );
              })
            )}
          </div>
          {notificationHistory.length > 15 && (
            <div className="px-3 py-2 border-t border-claude-border/50 dark:border-[#3d3832]/50 text-center">
              <span className="text-[9px] text-claude-text-muted">Showing 15 of {notificationHistory.length}</span>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Recent Actions Button */}
      {onOpenRecentActions && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onOpenRecentActions}
              className="hidden sm:inline-flex items-center justify-center sm:h-8 sm:w-8 rounded-md hover:bg-claude-border-light dark:hover:bg-claude-border transition-colors duration-150 claude-focus-ring btn-press btn-press-enhanced ripple-btn btn-press-3d hover-scale-95 relative"
              aria-label="Recent actions"
            >
              <Clock className="h-4 w-4 text-claude-text-secondary" />
              {recentActionsCount && recentActionsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-claude-accent text-[8px] font-bold text-white px-0.5 leading-none badge-pulse">
                  {recentActionsCount > 9 ? '9+' : recentActionsCount}
                </span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="tooltip-enter">
            <span className="text-[10px]">Recent Actions <kbd className="ml-1 px-1 py-0.5 rounded text-[9px] font-mono bg-claude-border-light text-claude-text-muted border border-claude-border">Alt+R</kbd></span>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Dark mode toggle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => {
              document.body.classList.add('theme-transitioning');
              setTheme(theme === 'dark' ? 'light' : 'dark');
              setTimeout(() => document.body.classList.remove('theme-transitioning'), 400);
            }}
            className="hidden sm:inline-flex items-center justify-center sm:h-8 sm:w-8 rounded-md hover:bg-claude-border-light dark:hover:bg-claude-border transition-colors duration-150 claude-focus-ring btn-press btn-press-enhanced ripple-btn btn-press-3d hover-scale-95"
            aria-label="Toggle dark mode"
          >
            {mounted && theme === 'dark' ? (
              <Sun className="h-4 w-4 text-claude-text-secondary" />
            ) : (
              <Moon className="h-4 w-4 text-claude-text-secondary" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="tooltip-enter">
          <span className="text-[10px]">Toggle Theme <kbd className="ml-1 px-1 py-0.5 rounded text-[9px] font-mono bg-claude-border-light text-claude-text-muted border border-claude-border">⌘D</kbd></span>
        </TooltipContent>
      </Tooltip>

      {/* Preferences / Settings button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setPreferencesDialogOpen(true)}
            className="hidden sm:inline-flex items-center justify-center sm:h-8 sm:w-8 rounded-md hover:bg-claude-border-light dark:hover:bg-claude-border transition-colors duration-150 claude-focus-ring btn-press btn-press-enhanced ripple-btn btn-press-3d hover-scale-95"
            aria-label="Preferences"
          >
            <Settings className="h-4 w-4 text-claude-text-secondary" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="tooltip-enter">
          <span className="text-[10px]">Preferences <kbd className="ml-1 px-1 py-0.5 rounded text-[9px] font-mono bg-claude-border-light text-claude-text-muted border border-claude-border">⌘,</kbd></span>
        </TooltipContent>
      </Tooltip>

      {/* Mobile/tablet hamburger menu */}
      <button
        onClick={() => setMobileSidebarOpen(true)}
        className="lg:hidden inline-flex items-center justify-center min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:h-8 sm:w-8 h-11 w-11 rounded-md hover:bg-claude-border-light dark:hover:bg-claude-border transition-colors duration-150 btn-press-subtle"
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5 text-claude-text-secondary" />
      </button>

      {/* Mobile/tablet preview toggle */}
      <button
        onClick={() => setMobilePreviewOpen(true)}
        className="ml-0.5 lg:hidden inline-flex items-center justify-center min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:h-8 sm:w-8 h-11 w-11 rounded-md hover:bg-claude-border-light dark:hover:bg-claude-border transition-colors duration-150"
        aria-label="Open preview panel"
      >
        <BarChart3 className="h-5 w-5 text-claude-text-secondary" />
      </button>
      </div>
    </header>
  );
}
