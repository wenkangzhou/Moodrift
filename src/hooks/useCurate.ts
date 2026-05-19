import { useState, useCallback, useRef } from 'react';
import { useAppStore } from '@/stores/useAppStore';

export interface CurateData {
  playlistIds: number[];
  title: string;
  description: string;
}

export function useCurate(locale: string) {
  const { environment, activity, emotion, energy } = useAppStore();

  const [data, setData] = useState<CurateData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const curate = useCallback(async () => {
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
