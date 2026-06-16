import { useCallback, useEffect, useRef, useState } from 'react';

export interface CurateData {
  playlistIds: number[];
  title: string;
  description: string;
}

const CURATE_CACHE_TTL = 24 * 60 * 60 * 1000;

interface LocaleState<T> {
  locale: string;
  value: T;
}

function curateCacheKey(locale: string) {
  return `moodrift-curate-night-focus-dreamy-50-${locale}`;
}

function getCachedCurate(locale: string): CurateData | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(curateCacheKey(locale));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { data?: CurateData; timestamp?: number };
    if (!parsed.data || !parsed.timestamp || Date.now() - parsed.timestamp > CURATE_CACHE_TTL) {
      window.localStorage.removeItem(curateCacheKey(locale));
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}

function setCachedCurate(locale: string, data: CurateData) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      curateCacheKey(locale),
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {
    // Ignore private mode / quota errors; API cache still protects the server.
  }
}

export function useCurate(locale: string) {
  const [dataState, setDataState] = useState<LocaleState<CurateData> | null>(null);
  const [loadingLocale, setLoadingLocale] = useState<string | null>(null);
  const [errorState, setErrorState] = useState<LocaleState<string> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const data = dataState && dataState.locale === locale ? dataState.value : null;
  const loading = loadingLocale === locale;
  const error = errorState && errorState.locale === locale ? errorState.value : null;

  const curate = useCallback(async () => {
    const requestLocale = locale;
    if (dataState?.locale === requestLocale) {
      return dataState.value;
    }

    const cached = getCachedCurate(requestLocale);
    if (cached) {
      abortRef.current?.abort();
      abortRef.current = null;
      requestIdRef.current += 1;
      setLoadingLocale(null);
      setDataState({ locale: requestLocale, value: cached });
      setErrorState(null);
      return cached;
    }

    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setLoadingLocale(requestLocale);
    setErrorState(null);
    try {
      const res = await fetch('/api/curate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          environment: 'night',
          activity: 'focus',
          emotion: 'dreamy',
          energy: 50,
          locale: requestLocale,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? `HTTP ${res.status}`);
      }

      const result: CurateData = await res.json();
      if (requestIdRef.current === requestId) {
        setCachedCurate(requestLocale, result);
        setDataState({ locale: requestLocale, value: result });
      }
      return result;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return null;
      if (requestIdRef.current === requestId) {
        setErrorState({
          locale: requestLocale,
          value: err instanceof Error ? err.message : 'Failed to curate',
        });
      }
      return null;
    } finally {
      if (requestIdRef.current === requestId) {
        setLoadingLocale((current) => (current === requestLocale ? null : current));
      }
    }
  }, [dataState, locale]);

  return { data, loading, error, curate };
}
