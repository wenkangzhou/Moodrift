import { useState, useCallback, useRef } from 'react';
import { useAppStore } from '@/stores/useAppStore';

export interface CurateData {
  playlistIds: number[];
  title: string;
  description: string;
}

const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

function cacheKey(env: string, act: string, emo: string, energy: number, locale: string) {
  return `moodrift-curate-${env}-${act}-${emo}-${energy}-${locale}`;
}

function getCached(
  env: string,
  act: string,
  emo: string,
  energy: number,
  locale: string
): CurateData | null {
  try {
    const raw = localStorage.getItem(cacheKey(env, act, emo, energy, locale));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > CACHE_TTL) {
      localStorage.removeItem(cacheKey(env, act, emo, energy, locale));
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function setCached(
  env: string,
  act: string,
  emo: string,
  energy: number,
  locale: string,
  data: CurateData
) {
  try {
    localStorage.setItem(
      cacheKey(env, act, emo, energy, locale),
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {
    // storage full, ignore
  }
}

export function useCurate(locale: string) {
  const { environment, activity, emotion, energy } = useAppStore();

  const [data, setData] = useState<CurateData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const curate = useCallback(async () => {
    const cached = getCached(environment, activity, emotion, energy, locale);
    if (cached) {
      setData(cached);
      setError(null);
      return cached;
    }

    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/curate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ environment, activity, emotion, energy, locale }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? `HTTP ${res.status}`);
      }

      const result: CurateData = await res.json();
      setCached(environment, activity, emotion, energy, locale, result);
      setData(result);
      return result;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return null;
      setError(err instanceof Error ? err.message : 'Failed to curate');
      return null;
    } finally {
      setLoading(false);
    }
  }, [environment, activity, emotion, energy, locale]);

  return { data, loading, error, curate };
}
