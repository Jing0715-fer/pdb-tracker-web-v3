'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Atom, BookOpen, FlaskConical, FileText, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLocalStorageSet } from '@/hooks/use-local-storage';

// ─── Types ──────────────────────────────────────────────────────────────────────

interface ActivityItem {
  id: string;
  type: 'new_structure' | 'new_paper' | 'new_evaluation' | 'report_published';
  title: string;
  description: string;
  timestamp: string;
  relatedId: string;
}

// ─── Relative Time Helper ───────────────────────────────────────────────────────

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return 'just now';

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  // For older dates, show month + day
  const d = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

// ─── Activity Type Config ────────────────────────────────────────────────────────

const ACTIVITY_CONFIG: Record<string, {
  icon: React.ElementType;
  color: string;
  borderColor: string;
  bgColor: string;
}> = {
  new_structure: {
    icon: Atom,
    color: 'text-claude-cryoem',
    borderColor: 'border-l-claude-cryoem',
    bgColor: 'bg-claude-cryoem/5',
  },
  new_paper: {
    icon: BookOpen,
    color: 'text-claude-xray',
    borderColor: 'border-l-claude-xray',
    bgColor: 'bg-claude-xray/5',
  },
  new_evaluation: {
    icon: FlaskConical,
    color: 'text-claude-accent',
    borderColor: 'border-l-claude-accent',
    bgColor: 'bg-claude-accent/5',
  },
  report_published: {
    icon: FileText,
    color: 'text-claude-nmr',
    borderColor: 'border-l-claude-nmr',
    bgColor: 'bg-claude-nmr/5',
  },
};

// ─── Wiggle Animation Keyframes ─────────────────────────────────────────────────

const wiggleVariants = {
  idle: { rotate: 0 },
  wiggle: {
    rotate: [0, -12, 10, -8, 6, -3, 0],
    transition: {
      duration: 0.6,
      ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
      repeat: 2,
      repeatDelay: 1.5,
    },
  },
};

// ─── Notification Bell Component ─────────────────────────────────────────────────

export function NotificationBell() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [readItems, updateReadItems] = useLocalStorageSet('pdb-read-activities');

  // Fetch activity feed
  const fetchActivities = useCallback(async () => {
    try {
      const res = await fetch('/api/activity?limit=20');
      if (res.ok) {
        const data = await res.json();
        setActivities(data);
      }
    } catch (err) {
      console.error('Failed to fetch activity feed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Compute unread count
  const unreadCount = activities.filter(a => !readItems.has(a.id)).length;

  // Mark all as read
  const handleMarkAllRead = useCallback(() => {
    updateReadItems(prev => {
      const next = new Set(prev);
      for (const a of activities) {
        next.add(a.id);
      }
      return next;
    });
  }, [activities, updateReadItems]);

  // Mark single item as read on click
  const handleItemClick = useCallback((item: ActivityItem) => {
    updateReadItems(prev => {
      const next = new Set(prev);
      next.add(item.id);
      return next;
    });
  }, [updateReadItems]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-claude-text-muted hover:text-claude-text relative active:scale-95 transition-transform duration-100"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'No new notifications'}
        >
          <motion.div
            variants={wiggleVariants}
            animate={unreadCount > 0 ? 'wiggle' : 'idle'}
            className="relative"
          >
            <Bell className="h-3.5 w-3.5" />
          </motion.div>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-[#c96442] text-white text-[8px] font-bold leading-none px-[3px] badge-bounce"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
          {unreadCount > 0 && (
            <motion.span
              className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full bg-[#c96442]"
              animate={{
                scale: [1, 1.4, 1],
                opacity: [0.7, 0, 0.7],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[380px] p-0 bg-claude-surface dark:bg-[#242220] border-claude-border dark:border-[#3d3832] shadow-xl rounded-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-claude-border dark:border-[#3d3832] bg-gradient-to-r from-[#faf7f4] to-[#f5f0ea] dark:from-[#242220] dark:to-[#2b2926]">
          <div className="flex items-center gap-2">
            <Bell className="h-3.5 w-3.5 text-claude-accent" />
            <span className="text-xs font-semibold text-claude-text">Activity Feed</span>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-[#c96442] text-white text-[9px] font-bold px-1 badge-bounce">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1 text-[10px] font-medium text-claude-accent dark:text-claude-accent-hover hover:underline"
            >
              <Check className="h-3 w-3" />
              Mark all read
            </button>
          )}
        </div>

        {/* Activity List */}
        <ScrollArea className="max-h-[480px]">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 animate-pulse">
                  <div className="h-8 w-8 rounded-lg bg-claude-border-light dark:bg-[#2b2926] flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-3/4 rounded bg-claude-border-light dark:bg-[#2b2926]" />
                    <div className="h-2.5 w-1/2 rounded bg-claude-border-light dark:bg-[#2b2926]" />
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 text-claude-text-muted mx-auto mb-2 opacity-50" />
              <p className="text-xs text-claude-text-muted">No recent activity</p>
            </div>
          ) : (
            <div className="py-1">
              <AnimatePresence>
                {activities.map((item, idx) => {
                  const config = ACTIVITY_CONFIG[item.type] || ACTIVITY_CONFIG.new_structure;
                  const Icon = config.icon;
                  const isUnread = !readItems.has(item.id);

                  return (
                    <motion.button
                      key={item.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03, duration: 0.2 }}
                      onClick={() => handleItemClick(item)}
                      className={`w-full text-left px-4 py-2.5 flex items-start gap-3 border-l-[3px] transition-colors duration-150 ${
                        isUnread
                          ? `${config.borderColor} ${config.bgColor} dark:bg-opacity-10`
                          : 'border-l-transparent hover:bg-claude-border-light/50 dark:hover:bg-[#2b2926]/50'
                      }`}
                    >
                      {/* Type Icon */}
                      <div className={`flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center ${
                        isUnread
                          ? `${config.bgColor} ${config.color}`
                          : 'bg-claude-border-light/50 dark:bg-[#2b2926]/50 text-claude-text-muted'
                      }`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {isUnread && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#c96442] flex-shrink-0" />
                          )}
                          <p className={`text-[11px] font-medium leading-tight truncate ${
                            isUnread ? 'text-claude-text' : 'text-claude-text-secondary'
                          }`}>
                            {item.title}
                          </p>
                        </div>
                        <p className="text-[10px] text-claude-text-muted leading-snug mt-0.5 line-clamp-2">
                          {item.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] text-claude-text-muted">
                            {getRelativeTime(item.timestamp)}
                          </span>
                          <span className="text-[9px] font-mono text-claude-text-muted opacity-70">
                            {item.relatedId}
                          </span>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-claude-border dark:border-[#3d3832] px-4 py-2 bg-claude-bg/50 dark:bg-[#1a1917]/50">
          <button
            className="text-[10px] font-medium text-claude-accent dark:text-claude-accent-hover hover:underline"
            onClick={() => setOpen(false)}
          >
            View all activity →
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
