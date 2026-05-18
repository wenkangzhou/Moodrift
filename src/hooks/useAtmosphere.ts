import { useState, useCallback } from 'react';

export interface AtmosphereData {
  title: string;
  description: string;
  tags: string[];
  bpm: number;
  playlistIds?: number[];
}

const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

function cacheKey(energy: number, environment: string, activity: string, emotion: string, locale: string) {
  return `moodrift-atmosphere-${energy}-${environment}-${activity}-${emotion}-${locale}`;
}

function getCached(
  energy: number,
  environment: string,
  activity: string,
  emotion: string,
  locale: string
): AtmosphereData | null {
  try {
    const raw = localStorage.getItem(cacheKey(energy, environment, activity, emotion, locale));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > CACHE_TTL) {
      localStorage.removeItem(cacheKey(energy, environment, activity, emotion, locale));
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function setCached(
  energy: number,
  environment: string,
  activity: string,
  emotion: string,
  locale: string,
  data: AtmosphereData
) {
  try {
    localStorage.setItem(
      cacheKey(energy, environment, activity, emotion, locale),
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {
    // storage full, ignore
  }
}

export function useAtmosphere(
  energy: number,
  environment: string,
  activity: string,
  emotion: string,
  locale: string
) {
  const [data, setData] = useState<AtmosphereData | null>(() =>
    getCached(energy, environment, activity, emotion, locale)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAtmosphere = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/generate-atmosphere', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ energy, environment, activity, emotion, locale }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? `HTTP ${res.status}`);
      }

      const result = await res.json();
      setCached(energy, environment, activity, emotion, locale, result);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate atmosphere');
    } finally {
      setLoading(false);
    }
  }, [energy, environment, activity, emotion, locale]);

  return { data, loading, error, refetch: fetchAtmosphere };
}
