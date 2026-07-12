'use client';

/**
 * useRunStream — client-side SSE consumer for long-running skill invocations.
 *
 * Faithful, slightly cleaned-up port of the pdb-tracker-web-v3 hook. Drives
 * the live progress feeds inside the Skills & Manual Run panel.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface StreamEvent {
  ts: string;            // ISO timestamp
  stage?: string;        // short stage label e.g. "fetch-pubmed"
  level?: 'info' | 'warn' | 'error' | 'success';
  message?: string;      // headline
  detail?: string;       // verbose payload
  progress?: number;     // 0..100 (optional)
  /** Chapter streaming: id of the chapter this event refers to. */
  chapter?: string;
  /** 1-based chapter index within the report. */
  chapterIndex?: number;
  /** Total chapters in the report. */
  chapterTotal?: number;
  /** Streamed chapter text (set on `chapter_done` events). */
  chapterContent?: string;
  /** Error message for the chapter (set on `chapter_done` failure). */
  chapterError?: string;
  /** Per-chapter generation duration (ms). */
  chapterDurationMs?: number;
  /** Caller-defined extras — forward-compatible. */
  [key: string]: unknown;
}

export interface StreamState {
  log: StreamEvent[];
  running: boolean;
  done: boolean;
  ok: boolean;
  error?: string;
  result?: any;
}

const INITIAL: StreamState = {
  log: [],
  running: false,
  done: false,
  ok: false,
};

export function useRunStream() {
  const [state, setState] = useState<StreamState>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState(INITIAL);
  }, []);

  const start = useCallback((url: string, body?: any) => {
    // cancel any in-flight stream first
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setState({ ...INITIAL, running: true });

    (async () => {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
          body: JSON.stringify(body ?? {}),
          signal: ctrl.signal,
        });

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          setState(s => ({
            ...s,
            running: false,
            done: true,
            ok: false,
            error: `HTTP ${res.status} ${res.statusText}${text ? ` — ${text.slice(0, 300)}` : ''}`,
          }));
          return;
        }

        if (!res.body) {
          setState(s => ({ ...s, running: false, done: true, ok: false, error: 'No response body' }));
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';

        // Parse SSE frames separated by a blank line.
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          let idx: number;
          while ((idx = buf.indexOf('\n\n')) >= 0) {
            const frame = buf.slice(0, idx);
            buf = buf.slice(idx + 2);

            // Each frame consists of `event:` and `data:` lines.
            let eventName = 'message';
            const dataLines: string[] = [];
            for (const line of frame.split('\n')) {
              if (line.startsWith('event:')) eventName = line.slice(6).trim();
              else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
            }
            const dataStr = dataLines.join('\n');
            let payload: any = dataStr;
            try { payload = JSON.parse(dataStr); } catch { /* keep as string */ }

            if (eventName === 'progress' || eventName === 'log' || eventName === 'message') {
              // Strip the noise (ts is generated server-side; everything else from payload).
              const ev: StreamEvent = {
                ts: payload?.ts || new Date().toISOString(),
                stage: payload?.stage,
                level: payload?.level,
                message: payload?.message,
                detail: payload?.detail,
                progress: typeof payload?.progress === 'number' ? payload.progress : undefined,
                chapter: payload?.chapter,
                chapterIndex: payload?.chapterIndex,
                chapterTotal: payload?.chapterTotal,
                chapterContent: payload?.chapterContent,
                chapterError: payload?.chapterError,
                chapterDurationMs: payload?.chapterDurationMs,
              };
              setState(s => ({ ...s, log: [...s.log, ev].slice(-300) }));
            } else if (eventName === 'done' || eventName === 'result') {
              setState(s => ({
                ...s,
                running: false,
                done: true,
                ok: true,
                result: payload,
              }));
              return;
            } else if (eventName === 'error') {
              setState(s => ({
                ...s,
                running: false,
                done: true,
                ok: false,
                error: (typeof payload === 'string' ? payload : payload?.message) || 'stream error',
              }));
              return;
            }
          }
        }

        // Stream ended without explicit done/error — treat as success.
        setState(s => ({ ...s, running: false, done: true, ok: true }));
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          setState(s => ({ ...s, running: false, done: true, ok: false, error: 'cancelled' }));
        } else {
          setState(s => ({
            ...s,
            running: false,
            done: true,
            ok: false,
            error: err?.message || String(err),
          }));
        }
      }
    })();
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  return { state, start, reset, cancel };
}
