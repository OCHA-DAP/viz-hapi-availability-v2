export const RETRY_ATTEMPTS = 10;
export const RETRY_DELAY = 3000;
export const FETCH_TIMEOUT = 20000;
// 202 responses can recur for as long as the backend takes to generate a
// large CSV from a cold cache, which is unrelated to genuine failures -- give
// it its own generous, fixed-interval budget instead of sharing the
// exponential-backoff error budget (40 * 3s = ~2 minutes).
export const PENDING_ATTEMPTS = 40;

// timeout spans fetch AND body read, so a stalled download (not just a stalled
// connection) also gets aborted and retried instead of hanging forever.
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

// for endpoints that respond 202 while a result is still being generated
// server-side. Only used by the data-fetch pipeline, which -- unlike a live
// page load -- can afford to poll patiently instead of guessing a short
// timeout. 202 polling and genuine-error backoff are independent budgets: a
// 202 never counts against `attempts`, and a network error never counts
// against `pendingAttempts`.
export async function fetchTextWithPolling(url, {
  attempts = RETRY_ATTEMPTS,
  retryDelay = RETRY_DELAY,
  timeout = FETCH_TIMEOUT,
  pendingAttempts = PENDING_ATTEMPTS
} = {}) {
  let pending = 0;
  let errorAttempt = 0;

  while (true) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (response.status === 202) {
        if (++pending >= pendingAttempts) throw new Error('HTTP 202');
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      if (error.message === 'HTTP 202') throw error;
      if (++errorAttempt >= attempts) throw error;
      await new Promise(resolve => setTimeout(resolve, retryDelay * 2 ** (errorAttempt - 1)));
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
