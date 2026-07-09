/**
 * Sequential request queue to prevent concurrent API requests that crash the server.
 * All API calls should go through this queue to ensure they are processed one at a time.
 */

type QueueItem = {
  url: string;
  options?: RequestInit;
  resolve: (value: Response) => void;
  reject: (reason: any) => void;
};

let queue: QueueItem[] = [];
let isProcessing = false;

async function processQueue() {
  if (isProcessing || queue.length === 0) return;
  isProcessing = true;

  while (queue.length > 0) {
    const item = queue.shift()!;
    try {
      const response = await fetch(item.url, item.options);
      item.resolve(response);
    } catch (error) {
      item.reject(error);
    }
    // Small delay between requests to prevent server overload
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  isProcessing = false;
}

/**
 * Queue a fetch request to be executed sequentially.
 * This prevents concurrent API requests that can crash the Next.js server
 * in memory-constrained environments.
 */
export function queuedFetch(url: string, options?: RequestInit): Promise<Response> {
  return new Promise((resolve, reject) => {
    queue.push({ url, options, resolve, reject });
    processQueue();
  });
}

/**
 * Fetch with automatic retry and queuing.
 * Combines sequential request processing with retry logic.
 */
export async function queuedFetchWithRetry(
  url: string,
  options?: RequestInit,
  retries: number = 3,
  baseDelay: number = 1000
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await queuedFetch(url, options);
      if (response.ok || attempt === retries) return response;
    } catch (error) {
      if (attempt === retries) throw error;
    }
    if (attempt < retries) {
      await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(1.5, attempt)));
    }
  }
  throw new Error(`Failed after ${retries} retries: ${url}`);
}
