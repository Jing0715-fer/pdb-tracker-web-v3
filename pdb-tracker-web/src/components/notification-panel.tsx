'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Bell, BellOff, Check, CheckCheck, Trash2, Filter,
  Microscope, BookOpen, AlertTriangle, Info, Star, GitCompareArrows,
  Clock, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  type: 'new_structure' | 'weekly_update' | 'comparison_ready' | 'bookmark_added' | 'system' | 'achievement';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  pdbId?: string;
  weekId?: string;
  actionUrl?: string;
  actionLabel?: string;
}

export type NotificationFilter = 'all' | 'unread' | 'structures' | 'updates';

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
  notifications?: Notification[];
}

// ─── Relative Time Helper ──────────────────────────────────────────────────

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// ─── Notification Type Config ──────────────────────────────────────────────

function getNotifTypeConfig(type: Notification['type']) {
  switch (type) {
    case 'new_structure':
      return { icon: Microscope, label: 'Structure', cssClass: 'notif-type-new_structure' };
    case 'weekly_update':
      return { icon: BookOpen, label: 'Update', cssClass: 'notif-type-weekly_update' };
    case 'comparison_ready':
      return { icon: GitCompareArrows, label: 'Compare', cssClass: 'notif-type-comparison_ready' };
    case 'bookmark_added':
      return { icon: Star, label: 'Bookmark', cssClass: 'notif-type-bookmark_added' };
    case 'system':
      return { icon: Info, label: 'System', cssClass: 'notif-type-system' };
    case 'achievement':
      return { icon: AlertTriangle, label: 'Achievement', cssClass: 'notif-type-achievement' };
  }
}

// ─── Filter Tabs ───────────────────────────────────────────────────────────

const FILTER_TABS: { key: NotificationFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'structures', label: 'Structures' },
  { key: 'updates', label: 'Updates' },
];

// ─── NotificationPanel Component ───────────────────────────────────────────

export function NotificationPanel({
  open,
  onClose,
  onMarkAllRead,
  onClearAll,
  onMarkRead,
  onDismiss,
  notifications: externalNotifications,
}: NotificationPanelProps) {
  const { notifications, setNotifications } = useSampleNotifications();
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');
  const panelRef = useRef<HTMLDivElement>(null);

  // Use external notifications if provided, otherwise use sample data
  const effectiveNotifications = externalNotifications ?? notifications;

  const unreadCount = useMemo(
    () => effectiveNotifications.filter((n) => !n.read).length,
    [effectiveNotifications]
  );

  // Apply filter
  const filteredNotifications = useMemo(() => {
    switch (activeFilter) {
      case 'unread':
        return effectiveNotifications.filter((n) => !n.read);
      case 'structures':
        return effectiveNotifications.filter(
          (n) => n.type === 'new_structure' || n.type === 'bookmark_added'
        );
      case 'updates':
        return effectiveNotifications.filter(
          (n) => n.type === 'weekly_update' || n.type === 'comparison_ready'
        );
      default:
        return effectiveNotifications;
    }
  }, [effectiveNotifications, activeFilter]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Mark all read handler
  const handleMarkAllRead = () => {
    if (externalNotifications) {
      onMarkAllRead();
    } else {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      onMarkAllRead();
    }
  };

  // Clear all handler
  const handleClearAll = () => {
    if (externalNotifications) {
      onClearAll();
    } else {
      setNotifications([]);
      onClearAll();
    }
  };

  // Mark single read
  const handleMarkRead = (id: string) => {
    if (externalNotifications) {
      onMarkRead(id);
    } else {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      onMarkRead(id);
    }
  };

  // Dismiss single
  const handleDismiss = (id: string) => {
    if (externalNotifications) {
      onDismiss(id);
    } else {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      onDismiss(id);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/20 z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="notification-panel dropdown-enhanced glass-card gradient-border fixed right-0 top-0 bottom-0 w-full sm:w-[380px] z-50 flex flex-col"
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8e4dd] dark:border-[#3d3832]">
              <div className="flex items-center gap-2.5">
                <Bell className="h-4 w-4 text-[#c96442] dark:text-[#d4784f]" />
                <h2 className="text-sm font-semibold text-[#1a1a1a] dark:text-[#e8e4dd]">
                  Notifications
                </h2>
                {unreadCount > 0 && (
                  <span className="notif-badge-pulse badge-glow inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#c96442] dark:bg-[#d4784f] text-[10px] font-bold text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {effectiveNotifications.length > 0 && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleMarkAllRead}
                      className="h-7 px-2 text-[11px] text-[#6b6560] dark:text-[#9b9590] hover:text-[#1a1a1a] dark:hover:text-[#e8e4dd] hover:bg-[#f5f0ea] dark:hover:bg-[#2b2926]"
                      title="Mark all as read"
                    >
                      <CheckCheck className="h-3.5 w-3.5 mr-1" />
                      Mark all read
                    </Button>
                    <Separator orientation="vertical" className="h-4 mx-1" />
                  </>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-7 w-7 text-[#9b9590] hover:text-[#1a1a1a] dark:hover:text-[#e8e4dd] hover:bg-[#f5f0ea] dark:hover:bg-[#2b2926]"
                  aria-label="Close notifications"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* ── Filter Tabs ── */}
            {effectiveNotifications.length > 0 && (
              <div className="flex items-center gap-1 px-5 py-3 border-b border-[#e8e4dd] dark:border-[#3d3832]">
                {FILTER_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveFilter(tab.key)}
                    className={`notif-filter-pill chip ${activeFilter === tab.key ? 'chip-active' : ''}`}
                  >
                    {tab.label}
                    {tab.key === 'unread' && unreadCount > 0 && (
                      <span className="ml-1 text-[9px] opacity-70">({unreadCount})</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* ── Notification List ── */}
            <ScrollArea className="flex-1 scroll-shadow-bottom">
              <div className="py-1">
                {filteredNotifications.length === 0 ? (
                  <EmptyState hasFilter={effectiveNotifications.length > 0} />
                ) : (
                  filteredNotifications.map((notif, index) => (
                    <NotificationCard
                      key={notif.id}
                      notification={notif}
                      index={index}
                      onMarkRead={handleMarkRead}
                      onDismiss={handleDismiss}
                    />
                  ))
                )}
              </div>
            </ScrollArea>

            {/* ── Footer ── */}
            {effectiveNotifications.length > 0 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-[#e8e4dd] dark:border-[#3d3832]">
                <span className="text-[11px] text-[#9b9590]">
                  {effectiveNotifications.length} notification{effectiveNotifications.length !== 1 ? 's' : ''}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="h-7 px-2 text-[11px] text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear all
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Notification Card ─────────────────────────────────────────────────────

function NotificationCard({
  notification,
  index,
  onMarkRead,
  onDismiss,
}: {
  notification: Notification;
  index: number;
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const typeConfig = getNotifTypeConfig(notification.type);
  const IconComponent = typeConfig.icon;
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`notification-card glass-card card-hover-scale relative flex items-start gap-3 px-5 py-3.5 cursor-pointer notif-enter dropdown-item ${
        !notification.read ? 'unread' : ''
      }`}
      style={{ animationDelay: `${index * 40}ms` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => {
        if (!notification.read) onMarkRead(notification.id);
      }}
    >
      {/* Type icon */}
      <div
        className={`notif-type-${notification.type} flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg`}
      >
        <IconComponent className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <h4 className="text-[13px] font-semibold text-[#1a1a1a] dark:text-[#e8e4dd] truncate">
            {notification.title}
          </h4>
          {!notification.read && (
            <span className="flex-shrink-0 h-2 w-2 rounded-full bg-[#c96442] dark:bg-[#d4784f]" />
          )}
        </div>
        <p className="text-[12px] text-[#6b6560] dark:text-[#9b9590] leading-relaxed line-clamp-2">
          {notification.message}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <Clock className="h-3 w-3 text-[#9b9590]" />
          <span className="text-[10px] text-[#9b9590]">
            {formatRelativeTime(notification.timestamp)}
          </span>
          {notification.actionUrl && (
            <a
              href={notification.actionUrl}
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] font-medium text-[#c96442] dark:text-[#d4784f] hover:underline ml-auto"
            >
              {notification.actionLabel || 'View'}
            </a>
          )}
        </div>
      </div>

      {/* Dismiss button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(notification.id);
        }}
        className="dismiss-btn flex-shrink-0 p-1 rounded-md hover:bg-[#f5f0ea] dark:hover:bg-[#2b2926] transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="h-3.5 w-3.5 text-[#9b9590]" />
      </button>
    </div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────

function EmptyState({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      {hasFilter ? (
        <>
          <div className="w-14 h-14 rounded-full bg-[#f5f0ea] dark:bg-[#2b2926] flex items-center justify-center mb-4 animate-float">
            <Filter className="h-6 w-6 text-[#9b9590]" />
          </div>
          <p className="text-sm font-medium text-[#1a1a1a] dark:text-[#e8e4dd] mb-1">
            No matching notifications
          </p>
          <p className="text-[12px] text-[#9b9590] text-center">
            Try changing the filter to see more notifications
          </p>
        </>
      ) : (
        <>
          <div className="w-14 h-14 rounded-full bg-[#f5f0ea] dark:bg-[#2b2926] flex items-center justify-center mb-4 animate-float">
            <BellOff className="h-6 w-6 text-[#9b9590]" />
          </div>
          <p className="text-sm font-medium text-[#1a1a1a] dark:text-[#e8e4dd] mb-1">
            All caught up!
          </p>
          <p className="text-[12px] text-[#9b9590] text-center">
            You have no pending notifications. New updates will appear here.
          </p>
        </>
      )}
    </div>
  );
}

// ─── useSampleNotifications Hook ──────────────────────────────────────────

export function useSampleNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const initializedRef = useRef(false);

  // Generate sample notifications only on client to avoid SSR/CSR hydration mismatch
  // (generateSampleNotifications uses new Date() which produces different timestamps)
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    // Defer setState to avoid synchronous setState in effect
    const timer = setTimeout(() => setNotifications(generateSampleNotifications()), 0);
    return () => clearTimeout(timer);
  }, []);

  return { notifications, setNotifications };
}

function generateSampleNotifications(): Notification[] {
  const now = new Date();

  return [
    {
      id: 'sample-1',
      type: 'new_structure',
      title: 'New Structure: 8XYZ',
      message:
        'A new Cryo-EM structure of SARS-CoV-2 spike protein has been released with 2.1Å resolution.',
      timestamp: new Date(now.getTime() - 2 * 60000), // 2 min ago
      read: false,
      pdbId: '8XYZ',
      actionUrl: '#',
      actionLabel: 'View structure',
    },
    {
      id: 'sample-2',
      type: 'new_structure',
      title: 'New Structure: 9ABC',
      message:
        'X-ray crystallography structure of human DNA polymerase delta resolved at 1.8Å.',
      timestamp: new Date(now.getTime() - 15 * 60000), // 15 min ago
      read: false,
      pdbId: '9ABC',
      actionUrl: '#',
      actionLabel: 'View structure',
    },
    {
      id: 'sample-3',
      type: 'weekly_update',
      title: 'Weekly Summary Available',
      message:
        'Week 2025-W12: 47 new structures released — 23 Cryo-EM, 19 X-ray, 5 NMR.',
      timestamp: new Date(now.getTime() - 2 * 3600000), // 2 hours ago
      read: false,
      weekId: '2025-W12',
      actionUrl: '#',
      actionLabel: 'View summary',
    },
    {
      id: 'sample-4',
      type: 'weekly_update',
      title: 'Weekly Summary Available',
      message:
        'Week 2025-W11: 52 new structures released — 28 Cryo-EM, 18 X-ray, 6 NMR.',
      timestamp: new Date(now.getTime() - 26 * 3600000), // 26 hours ago (yesterday)
      read: true,
      weekId: '2025-W11',
    },
    {
      id: 'sample-5',
      type: 'comparison_ready',
      title: 'Comparison Report Ready',
      message:
        'Your comparison of 8XYZ vs 7ABC has been generated. 12 structural differences found.',
      timestamp: new Date(now.getTime() - 45 * 60000), // 45 min ago
      read: false,
      actionUrl: '#',
      actionLabel: 'View comparison',
    },
    {
      id: 'sample-6',
      type: 'bookmark_added',
      title: 'Bookmark Added',
      message: 'Structure 7K3M (Ribosome assembly factor) has been added to your bookmarks.',
      timestamp: new Date(now.getTime() - 5 * 3600000), // 5 hours ago
      read: true,
      pdbId: '7K3M',
    },
    {
      id: 'sample-7',
      type: 'system',
      title: 'System Update',
      message:
        'New filtering options are now available. You can filter structures by ligand count and experimental method.',
      timestamp: new Date(now.getTime() - 24 * 3600000), // 1 day ago
      read: true,
    },
    {
      id: 'sample-8',
      type: 'system',
      title: 'Data Refresh Complete',
      message:
        'The PDB database has been refreshed. 3 new entries were added since your last visit.',
      timestamp: new Date(now.getTime() - 48 * 3600000), // 2 days ago
      read: true,
    },
    {
      id: 'sample-9',
      type: 'achievement',
      title: 'You\'ve viewed 100 structures!',
      message:
        'Congratulations! You\'ve explored 100 structures so far. Keep up the great research!',
      timestamp: new Date(now.getTime() - 30 * 60000), // 30 min ago
      read: false,
    },
    {
      id: 'sample-10',
      type: 'achievement',
      title: 'Collection Milestone',
      message:
        'Your "Cryo-EM Favorites" collection now has 25 structures. Consider exporting your findings.',
      timestamp: new Date(now.getTime() - 3 * 3600000), // 3 hours ago
      read: false,
    },
  ];
}
