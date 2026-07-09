'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash2, X, Bookmark, FolderOpen, Upload, ArrowRightLeft, Search, SlidersHorizontal, Pin } from 'lucide-react';
import type { ActivityItem } from '@/hooks/use-activity-feed';

// ─── Types ─────────────────────────────────────────────────────────────────

interface ActivityFeedProps {
  activities: ActivityItem[];
  unreadCount: number;
  newItemPulse: boolean;
  markAllRead: () => void;
  clearActivities: () => void;
  onItemClick: (item: ActivityItem) => void;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function getTypeIcon(type: ActivityItem['type']): React.ReactNode {
  switch (type) {
    case 'bookmark': return <Bookmark className="h-3 w-3 text-amber-500" />;
    case 'collection': return <FolderOpen className="h-3 w-3 text-[#7c5cbf]" />;
    case 'export': return <Upload className="h-3 w-3 text-[#2d8f8f]" />;
    case 'compare': return <ArrowRightLeft className="h-3 w-3 text-[#c9872e]" />;
    case 'search': return <Search className="h-3 w-3 text-claude-text-muted" />;
    case 'filter': return <SlidersHorizontal className="h-3 w-3 text-claude-text-muted" />;
    default: return <Pin className="h-3 w-3 text-claude-text-muted" />;
  }
}

function getTypeColor(type: ActivityItem['type']): string {
  switch (type) {
    case 'bookmark': return 'text-blue-400';
    case 'collection': return 'text-violet-400';
    case 'export': return 'text-green-400';
    case 'compare': return 'text-teal-400';
    case 'search': return 'text-purple-400';
    case 'filter': return 'text-orange-400';
    default: return 'text-claude-text-muted';
  }
}

// ─── Component ─────────────────────────────────────────────────────────────

export function ActivityFeed({
  activities,
  unreadCount,
  newItemPulse,
  markAllRead,
  clearActivities,
  onItemClick,
}: ActivityFeedProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  // Group activities by time period
  const grouped = React.useMemo(() => {
    const now = Date.now();
    const today: ActivityItem[] = [];
    const yesterday: ActivityItem[] = [];
    const earlier: ActivityItem[] = [];

    for (const item of activities) {
      const age = now - item.timestamp;
      if (age < 86400000) today.push(item);
      else if (age < 172800000) yesterday.push(item);
      else earlier.push(item);
    }
    return { today, yesterday, earlier };
  }, [activities]);

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button trigger */}
      <button
        onClick={() => {
          setOpen(!open);
          if (!open && unreadCount > 0) {
            // Mark as read after opening
            setTimeout(() => markAllRead(), 1500);
          }
        }}
        className={`hidden sm:inline-flex items-center justify-center sm:h-8 sm:w-8 rounded-md hover:bg-claude-border-light dark:hover:bg-claude-border transition-colors duration-150 claude-focus-ring btn-press ripple-btn relative ${newItemPulse ? 'animate-pulse' : ''}`}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={open}
      >
        <Bell className="h-4 w-4 text-claude-text-secondary" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white px-0.5 leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-[#1e1d1b] border border-claude-border dark:border-[#3d3832] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in-0 slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-claude-border dark:border-[#3d3832]">
            <h3 className="text-sm font-semibold text-claude-text dark:text-[#e8e4dd] flex items-center gap-2">
              <Bell className="h-3.5 w-3.5 text-claude-accent" />
              Activity Feed
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-claude-accent/10 text-[10px] font-bold text-claude-accent">
                  {unreadCount}
                </span>
              )}
            </h3>
            <div className="flex items-center gap-1">
              {activities.length > 0 && (
                <>
                  <button
                    onClick={markAllRead}
                    className="p-1 rounded-md hover:bg-claude-border-light dark:hover:bg-claude-border/50 transition-colors"
                    title="Mark all read"
                    aria-label="Mark all read"
                  >
                    <Check className="h-3.5 w-3.5 text-claude-text-muted" />
                  </button>
                  <button
                    onClick={clearActivities}
                    className="p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Clear all"
                    aria-label="Clear all activities"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-claude-text-muted hover:text-red-500" />
                  </button>
                </>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-md hover:bg-claude-border-light dark:hover:bg-claude-border/50 transition-colors"
                aria-label="Close"
              >
                <X className="h-3.5 w-3.5 text-claude-text-muted" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-80 overflow-y-auto thin-scrollbar">
            {activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4">
                <div className="w-12 h-12 rounded-full bg-claude-border-light dark:bg-claude-border/30 flex items-center justify-center mb-3">
                  <Bell className="h-5 w-5 text-claude-text-muted/40" />
                </div>
                <p className="text-sm text-claude-text-muted/60 text-center">No recent activity</p>
                <p className="text-[11px] text-claude-text-muted/40 text-center mt-1">
                  Your actions like bookmarking, exporting, and comparing will appear here
                </p>
              </div>
            ) : (
              <>
                {/* Today */}
                {grouped.today.length > 0 && (
                  <div>
                    <div className="px-4 pt-3 pb-1">
                      <span className="text-[10px] font-semibold text-claude-text-muted uppercase tracking-wider">Today</span>
                    </div>
                    {grouped.today.map((item, i) => (
                      <ActivityRow key={item.id} item={item} onClick={onItemClick} index={i} />
                    ))}
                  </div>
                )}

                {/* Yesterday */}
                {grouped.yesterday.length > 0 && (
                  <div>
                    <div className="px-4 pt-3 pb-1">
                      <span className="text-[10px] font-semibold text-claude-text-muted uppercase tracking-wider">Yesterday</span>
                    </div>
                    {grouped.yesterday.map((item, i) => (
                      <ActivityRow key={item.id} item={item} onClick={onItemClick} index={i} />
                    ))}
                  </div>
                )}

                {/* Earlier */}
                {grouped.earlier.length > 0 && (
                  <div>
                    <div className="px-4 pt-3 pb-1">
                      <span className="text-[10px] font-semibold text-claude-text-muted uppercase tracking-wider">Earlier</span>
                    </div>
                    {grouped.earlier.map((item, i) => (
                      <ActivityRow key={item.id} item={item} onClick={onItemClick} index={i} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {activities.length > 0 && (
            <div className="px-4 py-2 border-t border-claude-border dark:border-[#3d3832] text-center">
              <span className="text-[10px] text-claude-text-muted/50">
                {activities.length} activit{activities.length === 1 ? 'y' : 'ies'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Activity Row ──────────────────────────────────────────────────────────

function ActivityRow({ item, onClick, index }: { item: ActivityItem; onClick: (item: ActivityItem) => void; index: number }) {
  return (
    <div
      className={`flex items-start gap-3 px-4 py-2.5 hover:bg-claude-border-light/50 dark:hover:bg-claude-border/20 transition-colors duration-150 cursor-pointer ${!item.read ? 'bg-claude-accent/[0.03] dark:bg-claude-accent/[0.05]' : ''}`}
      onClick={() => onClick(item)}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      {/* Unread dot */}
      <div className="flex-shrink-0 mt-1.5 relative">
        {!item.read && (
          <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-claude-accent" />
        )}
        <span className="text-sm">{getTypeIcon(item.type)}</span>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${getTypeColor(item.type)}`}>
            {item.type}
          </span>
        </div>
        <p className="text-[11px] text-claude-text dark:text-[#e8e4dd] leading-snug mt-0.5 line-clamp-2">
          {item.message}
        </p>
      </div>

      {/* Time */}
      <span className="text-[9px] text-claude-text-muted/50 flex-shrink-0 mt-1">
        {formatRelativeTime(new Date(item.timestamp))}
      </span>
    </div>
  );
}
