import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchTextWithRetry, fetchTextWithPolling } from './fetchWithRetry.js';

// real fetch() rejects with an AbortError when its signal is aborted -- mocks
// need to honor that or AbortController-based timeouts never actually resolve
function neverSettlingFetch() {
  return (url, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('AbortError')));
  });
}

describe('fetchTextWithRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('returns text on a successful response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('csv-body')
    }));

    const result = await fetchTextWithRetry('http://example.test', { timeout: 100, retryDelay: 10 });
    expect(result).toBe('csv-body');
  });

  it('retries after a connection that never settles, then succeeds', async () => {
    const fetchMock = vi.fn()
      // first attempt: fetch never resolves/rejects -- simulates a stalled connection
      .mockImplementationOnce(neverSettlingFetch())
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('ok-after-retry') });
    vi.stubGlobal('fetch', fetchMock);

    const promise = fetchTextWithRetry('http://example.test', { timeout: 100, retryDelay: 10 });
    await vi.runAllTimersAsync();

    expect(await promise).toBe('ok-after-retry');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries when the body stream stalls after headers arrive, then succeeds', async () => {
    const fetchMock = vi.fn()
      // headers resolve immediately, but body read hangs forever -- this is the
      // case the old fix (timeout only around fetch(), not response.text()) missed.
      // a real aborted fetch also rejects any in-flight response.text() read.
      .mockImplementationOnce((url, options) => Promise.resolve({
        ok: true,
        text: () => new Promise((resolve, reject) => {
          options.signal.addEventListener('abort', () => reject(new Error('AbortError')));
        })
      }))
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('ok-after-stall') });
    vi.stubGlobal('fetch', fetchMock);

    const promise = fetchTextWithRetry('http://example.test', { timeout: 100, retryDelay: 10 });
    await vi.runAllTimersAsync();

    expect(await promise).toBe('ok-after-stall');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects with an error instead of hanging forever once retries are exhausted', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(neverSettlingFetch()));

    const promise = fetchTextWithRetry('http://example.test', { attempts: 3, timeout: 100, retryDelay: 10 });
    const expectation = expect(promise).rejects.toThrow();
    await vi.runAllTimersAsync();
    await expectation;
  });

  it('retries on a non-2xx response and rejects once attempts are exhausted', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    vi.stubGlobal('fetch', fetchMock);

    const promise = fetchTextWithRetry('http://example.test', { attempts: 3, timeout: 100, retryDelay: 10 });
    const expectation = expect(promise).rejects.toThrow('HTTP 500');
    await vi.runAllTimersAsync();
    await expectation;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe('fetchTextWithPolling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('retries on a 202 Accepted response until the server returns real data', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 202 })
      .mockResolvedValueOnce({ ok: true, status: 202 })
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('csv-body') });
    vi.stubGlobal('fetch', fetchMock);

    const promise = fetchTextWithPolling('http://example.test', { pendingAttempts: 6, timeout: 100, retryDelay: 10 });
    await vi.runAllTimersAsync();

    expect(await promise).toBe('csv-body');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('rejects with HTTP 202 once the pending budget is exhausted, independent of the error-retry attempts', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 202 }));

    const promise = fetchTextWithPolling('http://example.test', { attempts: 3, pendingAttempts: 4, timeout: 100, retryDelay: 10 });
    const expectation = expect(promise).rejects.toThrow('HTTP 202');
    await vi.runAllTimersAsync();
    await expectation;
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('retries on a non-2xx response and rejects once attempts are exhausted', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    vi.stubGlobal('fetch', fetchMock);

    const promise = fetchTextWithPolling('http://example.test', { attempts: 3, timeout: 100, retryDelay: 10 });
    const expectation = expect(promise).rejects.toThrow('HTTP 500');
    await vi.runAllTimersAsync();
    await expectation;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
