import { useState, useEffect, useCallback } from 'react';

export interface MusicTrack {
  title: string;
  artist: string;
  cover: string;
  previewUrl: string | null;
  spotifyUrl: string;
  genre: string;
}

export function useMusicTracks(query: string) {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTracks = useCallback(async () => {
    if (!query) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/jamendo/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? `HTTP ${res.status}`);
      }

      const result = await res.json();
      setTracks(result.tracks ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tracks');
      setTracks([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  return { tracks, loading, error };
}
