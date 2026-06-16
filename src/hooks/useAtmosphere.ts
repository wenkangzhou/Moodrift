import { useState, useCallback, useEffect, useRef } from 'react';
import {
  getCachedAtmosphere,
  setCachedAtmosphere,
  type AtmosphereData,
} from '@/lib/atmosphere-cache';

export type { AtmosphereData } from '@/lib/atmosphere-cache';

export function useAtmosphere(trackName: string | null, artist: string | null, locale: string) {
  const [data, setData] = useState<AtmosphereData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchAtmosphere = useCallback(async () => {
    if (!trackName || !artist) {
      setData(null);
      return;
    }

    // Clear old data immediately so UI enters loading state
    setData(null);

    const cached = getCachedAtmosphere(trackName, artist, locale);
    if (cached) {
      setData(cached);
      setError(null);
      return;
    }

    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);
    const timeoutId = setTimeout(() => abortRef.current?.abort(), 4000);
    try {
      const res = await fetch('/api/generate-atmosphere', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackName, artist, locale }),
        signal: abortRef.current.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? `HTTP ${res.status}`);
      }

      const result = await res.json();
      setCachedAtmosphere(trackName, artist, locale, result);
      setData(result);
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Atmosphere generation timed out');
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to generate atmosphere');
    } finally {
      setLoading(false);
    }
  }, [trackName, artist, locale]);

  // Auto-fetch when track changes — no debounce, loading state is intentional
  useEffect(() => {
    if (!trackName || !artist) {
      const raf = requestAnimationFrame(() => setData(null));
      return () => cancelAnimationFrame(raf);
    }
    const raf = requestAnimationFrame(() => {
      fetchAtmosphere();
    });
    return () => cancelAnimationFrame(raf);
  }, [trackName, artist, locale, fetchAtmosphere]);

  return { data, loading, error, refetch: fetchAtmosphere };
}
