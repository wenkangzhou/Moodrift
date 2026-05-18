import { useState, useCallback, useEffect, useRef } from 'react';

export interface AtmosphereData {
  title: string;
  description: string;
  tags: string[];
}

const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

function cacheKey(trackName: string, artist: string, locale: string) {
  return `moodrift-track-${trackName}-${artist}-${locale}`;
}

function getCached(trackName: string, artist: string, locale: string): AtmosphereData | null {
  try {
    const raw = localStorage.getItem(cacheKey(trackName, artist, locale));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > CACHE_TTL) {
      localStorage.removeItem(cacheKey(trackName, artist, locale));
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function setCached(trackName: string, artist: string, locale: string, data: AtmosphereData) {
  try {
    localStorage.setItem(
      cacheKey(trackName, artist, locale),
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {
    // storage full, ignore
  }
}

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

    const cached = getCached(trackName, artist, locale);
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
    try {
      const res = await fetch('/api/generate-atmosphere', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackName, artist, locale }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? `HTTP ${res.status}`);
      }

      const result = await res.json();
      setCached(trackName, artist, locale, result);
      setData(result);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Failed to generate atmosphere');
    } finally {
      setLoading(false);
    }
  }, [trackName, artist, locale]);

  // Auto-fetch when track changes, with debounce to avoid API spam during rapid skipping
  useEffect(() => {
    if (!trackName || !artist) {
      const raf = requestAnimationFrame(() => setData(null));
      return () => cancelAnimationFrame(raf);
    }
    const timer = setTimeout(() => {
      fetchAtmosphere();
    }, 600);
    return () => clearTimeout(timer);
  }, [trackName, artist, locale, fetchAtmosphere]);

  return { data, loading, error, refetch: fetchAtmosphere };
}
