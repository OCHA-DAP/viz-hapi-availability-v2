export const RETRY_ATTEMPTS = 3;
export const RETRY_DELAY = 1000;
export const FETCH_TIMEOUT = 20000;

// timeout spans fetch AND body read, so a stalled download (not just a stalled
// connection) also gets aborted and retried instead of hanging forever
export async function fetchTextWithRetry(url, {
  attempts = RETRY_ATTEMPTS,
  retryDelay = RETRY_DELAY,
  timeout = FETCH_TIMEOUT
} = {}) {
  for (let i = 0; i < attempts; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      if (i === attempts - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, retryDelay * 2 ** i));
    } finally {
      clearTimeout(timeoutId);
    }
  }
  throw new Error('fetchTextWithRetry: exhausted retries');
}
