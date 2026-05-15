import { useState, useEffect, useCallback } from 'react';

export interface AtmosphereData {
  title: string;
  description: string;
  tags: string[];
  bpm: number;
}

export function useAtmosphere(
  energy: number,
  environment: string,
  activity: string,
  emotion: string,
  locale: string
) {
  const [data, setData] = useState<AtmosphereData | null>(null);
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
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate atmosphere');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [energy, environment, activity, emotion, locale]);

  useEffect(() => {
    fetchAtmosphere();
  }, [fetchAtmosphere]);

  return { data, loading, error, refetch: fetchAtmosphere };
}
