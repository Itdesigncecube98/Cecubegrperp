'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Silent background auto-refresh. Never flashes a full-page loader on interval ticks.
 * @param {() => Promise<void>} fetcher - async function that updates state
 * @param {{ intervalMs?: number, enabled?: boolean }} options
 */
export function useAutoRefresh(fetcher, { intervalMs = 10000, enabled = true } = {}) {
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(enabled);
  const busy = useRef(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setRefreshing(true);
    try {
      await fetcherRef.current();
      setLastRefreshed(new Date());
    } catch (e) {
      // Ignore transient network errors (dev server restart / offline)
      const msg = e?.message || '';
      if (msg !== 'Failed to fetch' && !msg.includes('NetworkError')) {
        console.error('Auto-refresh failed', e);
      }
    } finally {
      busy.current = false;
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const id = setInterval(() => {
      refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [autoRefresh, intervalMs, refresh]);

  return { refresh, refreshing, lastRefreshed, autoRefresh, setAutoRefresh };
}

export function formatRefreshTime(d) {
  if (!d) return '';
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
