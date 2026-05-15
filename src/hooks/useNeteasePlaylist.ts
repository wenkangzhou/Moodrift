import { useState, useEffect, useCallback } from 'react';
import {
  type NeteaseTrack,
  type NeteasePlaylist,
  moodPlaylistMap,
  pickRandomTrack,
} from '@/lib/netease';

export function useNeteasePlaylist(environment: string) {
  const [track, setTrack] = useState<NeteaseTrack | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRandom = useCallback(async () => {
    const playlistIds = moodPlaylistMap[environment];
    if (!playlistIds || playlistIds.length === 0) {
      setError('No playlist mapped for this mood');
      return;
    }

    setLoading(true);
    setError(null);

    // Try each mapped playlist until we find one with tracks
    for (const pid of playlistIds) {
      try {
        const res = await fetch(`/api/netease/playlist?id=${pid}`);
        if (!res.ok) continue;

        const data = await res.json();
        const tracks: NeteaseTrack[] =
          data?.result?.tracks?.map((t: any) => ({
            id: t.id,
            name: t.name,
            artist: t.artists?.[0]?.name ?? 'Unknown',
            cover: t.album?.picUrl ?? '',
            duration: Math.round((t.duration ?? 0) / 1000),
          })) ?? [];

        if (tracks.length > 0) {
          const picked = pickRandomTrack(tracks);
          if (picked) {
            setTrack(picked);
            setLoading(false);
            return;
          }
        }
      } catch {
        // try next playlist
      }
    }

    setLoading(false);
    setError('Could not load tracks from Netease');
  }, [environment]);

  useEffect(() => {
    setTrack(null);
    setError(null);
  }, [environment]);

  return { track, loading, error, refetch: fetchRandom };
}
