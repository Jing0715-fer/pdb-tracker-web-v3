'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  icon: string;
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
}

interface NotificationHistoryItem {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  description?: string;
  timestamp: number;
  read: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const HISTORY_STORAGE_KEY = 'pdb-notification-history';
const MAX_NOTIFICATIONS = 20;
const MAX_HISTORY = 50;

// ─── Helpers ────────────────────────────────────────────────────────────────

function loadHistory(): NotificationHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as NotificationHistoryItem[];
  } catch {
    return [];
  }
}

function saveHistory(items: NotificationHistoryItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items.slice(0, MAX_HISTORY)));
  } catch {
    // localStorage full or unavailable
  }
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useNotifications() {
  // ── In-Memory Notifications (active, shown in UI) ──
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // ── Notification History (persisted to localStorage) ──
  const [notificationHistory, setNotificationHistory] = useState<NotificationHistoryItem[]>([]);
  const initializedRef = useRef(false);

  // Hydrate history from localStorage on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const stored = loadHistory();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR hydration pattern
    setNotificationHistory(stored);
  }, []);

  // Persist history on change (skip initial hydration)
  const isInitial = useRef(true);
  useEffect(() => {
    if (!initializedRef.current) return;
    if (isInitial.current) {
      isInitial.current = false;
      return;
    }
    saveHistory(notificationHistory);
  }, [notificationHistory]);

  // ── Add Notification (in-memory + update history) ──
  const addNotification = useCallback((icon: string, title: string, description: string) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setNotifications(prev => {
      const next = [{ id, icon, title, description, timestamp: new Date(), read: false }, ...prev];
      return next.slice(0, MAX_NOTIFICATIONS);
    });
  }, []);

  // ── Mark single notification as read ──
  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  // ── Mark all notifications as read ──
  const markAllNotificationsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  // ── Clear all notifications ──
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // ── Remove single notification ──
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // ── Computed: unread count ──
  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  // ── Add to notification history (persisted) ──
  const addNotificationHistory = useCallback((type: NotificationHistoryItem['type'], message: string, description?: string) => {
    setNotificationHistory(prev => [{
      id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      message,
      description,
      timestamp: Date.now(),
      read: false,
    }, ...prev].slice(0, MAX_HISTORY));
  }, []);

  // ── Mark all history as read ──
  const markAllNotificationHistoryRead = useCallback(() => {
    setNotificationHistory(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  // ── Clear notification history ──
  const clearNotificationHistory = useCallback(() => {
    setNotificationHistory([]);
    saveHistory([]);
  }, []);

  // ── Computed: history unread count ──
  const notifHistoryUnreadCount = useMemo(() => notificationHistory.filter(n => !n.read).length, [notificationHistory]);

  return {
    // In-memory notifications
    notifications,
    addNotification,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
    removeNotification,
    unreadCount,

    // Persisted notification history
    notificationHistory,
    addNotificationHistory,
    markAllNotificationHistoryRead,
    clearNotificationHistory,
    notifHistoryUnreadCount,
  } as const;
}
