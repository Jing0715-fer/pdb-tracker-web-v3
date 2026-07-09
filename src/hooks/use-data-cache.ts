'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getCacheEntry, setCacheEntry, clearCacheEntry, useOnlineStatus } from '@/lib/cache-utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface UseDataCacheOptions {
  /** Time-to-live for the cache entry in milliseconds. Default: 5 min */
  ttl?: number;
  /** Whether fetching is enabled. Set to false to skip. Default: true */
  enabled?: boolean;
  /** Delay in ms before background refresh after showing cached data. Default: 1000 */
  backgroundRefreshDelay?: number;
}

interface UseDataCacheReturn<T> {
  /** The fetched / cached data, or null if not yet loaded */
  data: T | null;
  /** True while an initial fetch is in progress (not during background refresh) */
  loading: boolean;
  /** True when the current data came from localStorage cache (may be stale) */
  fromCache: boolean;
  /** True when a background refresh is in progress */
  refreshing: boolean;
  /** Error message if the last fetch failed */
  error: string | null;
  /** Date when the data was last successfully refreshed from the API */
  lastRefreshed: Date | null;
  /** Manually trigger a refresh */
  refresh: () => Promise<void>;
  /** Remove the cache entry for this key */
  clearCache: () => void;
}

// ─── Default TTL ──────────────────────────────────────────────────────────────

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const DEFAULT_BG_DELAY = 1000; // 1 second

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * A data-fetching hook with transparent localStorage caching and background
 * refresh. On mount it loads from cache first (instant display), then triggers
 * a background refresh so the UI stays snappy while data stays fresh.
 *
 * If the API is unreachable, expired cache is served as a fallback.
 */
export function useDataCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: UseDataCacheOptions,
): UseDataCacheReturn<T> {
  const ttl = options?.ttl ?? DEFAULT_TTL;
  const enabled = options?.enabled ?? true;
  const bgDelay = options?.backgroundRefreshDelay ?? DEFAULT_BG_DELAY;

  const isOnline = useOnlineStatus();

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  // Keep a stable reference to the fetcher so we don't re-trigger effects
  // on every render when the caller uses an inline arrow function.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // ── Core fetch logic ──────────────────────────────────────────────────────
  const fetchData = useCallback(
    async (isBackgroundRefresh = false) => {
      if (!isBackgroundRefresh) setLoading(true);
      else setRefreshing(true);

      setError(null);

      try {
        const result = await fetcherRef.current();
        setData(result);
        setFromCache(false);
        setLastRefreshed(new Date());

        // Persist to localStorage
        setCacheEntry(key, result, ttl);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch';
        setError(message);

        // On error, try to fall back to cache (even if expired)
        const cached = getCacheEntry<T>(key);
        if (cached && data === null) {
          setData(cached.data);
          setFromCache(true);
          setLastRefreshed(new Date(cached.timestamp));
        }
      } finally {
        if (!isBackgroundRefresh) setLoading(false);
        else setRefreshing(false);
      }
    },
    [key, ttl, data],
  );

  // ── Initial load: cache first, then background refresh ────────────────────
  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function init() {
      // 1. Try cache
      const cached = getCacheEntry<T>(key);
      if (cached) {
        const isExpired = Date.now() - cached.timestamp > (cached.ttl || DEFAULT_TTL);

        if (!cancelled) {
          setData(cached.data);
          setFromCache(true);
          setLastRefreshed(new Date(cached.timestamp));
          setLoading(false);
        }

        // 2. Background refresh — even fresh cache gets a refresh to stay warm
        //    but expired cache gets a higher-priority refresh.
        if (!cancelled) {
          const delay = isExpired ? 0 : bgDelay;
          setTimeout(async () => {
            if (!cancelled) {
              await fetchData(true);
            }
          }, delay);
        }
        return;
      }

      // 3. No cache at all — fetch fresh
      if (!cancelled) {
        await fetchData(false);
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [key, enabled]);

  // ── Re-fetch when coming back online after being offline ───────────────────
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
      return;
    }

    if (wasOfflineRef.current && enabled) {
      wasOfflineRef.current = false;
      fetchData(true); // background refresh after reconnecting
    }
  }, [isOnline, enabled, fetchData]);

  // ── Public API ────────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    await fetchData(false);
  }, [fetchData]);

  const clear = useCallback(() => {
    clearCacheEntry(key);
  }, [key]);

  return {
    data,
    loading,
    fromCache,
    refreshing,
    error,
    lastRefreshed,
    refresh,
    clearCache: clear,
  };
}
