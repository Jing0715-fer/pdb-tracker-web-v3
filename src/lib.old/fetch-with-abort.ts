/**
 * Fetch utility with AbortController cancellation support.
 * Prevents stale request responses from overwriting fresh data when
 * user navigates between pages/filters or component unmounts.
 */

export interface FetchWithAbortOptions extends RequestInit {
  /** Timeout in ms before auto-abort (default 30s) */
  timeoutMs?: number;
}

/**
 * Fetch wrapper that returns [data, abort] tuple.
 * Call abort() to cancel in-flight request and avoid stale data updates.
 *
 * @example
 * const [data, abort] = await fetchWithAbort('/api/entries');
 * // Later: abort() — e.g. on component unmount or filter change
 */
export async function fetchWithAbort<T = unknown>(
  url: string,
  options: FetchWithAbortOptions = {},
): Promise<[T, () => void]> {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 30000;
  let timeoutId: ReturnType<typeof setTimeout>;

  const fetchPromise = fetch(url, { ...options, signal: controller.signal })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<T>;
    });

  timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const abort = () => {
    clearTimeout(timeoutId);
    controller.abort();
  };

  try {
    const data = await fetchPromise;
    clearTimeout(timeoutId);
    return [data, abort];
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}