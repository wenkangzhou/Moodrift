import { useState, useCallback } from 'react';

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
  const [data, setData] = useState<AtmosphereData | null>(() => {
    if (!trackName || !artist) return null;
    return getCached(trackName, artist, locale);
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAtmosphere = useCallback(async () => {
    if (!trackName || !artist) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/generate-atmosphere', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackName, artist, locale }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? `HTTP ${res.status}`);
      }

      const result = await res.json();
      setCached(trackName, artist, locale, result);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate atmosphere');
    } finally {
      setLoading(false);
    }
  }, [trackName, artist, locale]);

  return { data, loading, error, refetch: fetchAtmosphere };
}
