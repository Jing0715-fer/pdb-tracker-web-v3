/**
 * Shared helpers for emitting Server-Sent Events from Next.js route handlers.
 * Mirrors the contract expected by `useRunStream` on the client.
 */

export interface SseEvent {
  stage?: string;
  level?: 'info' | 'warn' | 'error' | 'success';
  message?: string;
  detail?: string;
  progress?: number;
  /** Caller-defined extras — e.g. chapter content for streaming SSE chapter events. */
  [key: string]: unknown;
}

export function sseStream() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      send.__controller = controller;
    },
  });

  function send(eventName: string, data: unknown) {
    const ctrl = (send as any).__controller as ReadableStreamDefaultController<Uint8Array> | undefined;
    if (!ctrl) return;
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    const frame = `event: ${eventName}\ndata: ${payload}\n\n`;
    try {
      ctrl.enqueue(encoder.encode(frame));
    } catch {
      /* controller already closed */
    }
  }

  function progress(ev: SseEvent) {
    send('progress', { ts: new Date().toISOString(), ...ev });
  }

  function done(result: unknown) {
    send('done', result);
    const ctrl = (send as any).__controller as ReadableStreamDefaultController<Uint8Array> | undefined;
    try { ctrl?.close(); } catch { /* ignore */ }
  }

  function error(message: string) {
    send('error', { message });
    const ctrl = (send as any).__controller as ReadableStreamDefaultController<Uint8Array> | undefined;
    try { ctrl?.close(); } catch { /* ignore */ }
  }

  return { stream, send, progress, done, error };
}

/** Promise-based sleep that doesn't block the event loop. */
export const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
