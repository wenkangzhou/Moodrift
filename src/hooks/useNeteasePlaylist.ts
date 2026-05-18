import { useState, useCallback, useRef } from 'react';
import {
  type NeteaseTrack,
  moodPlaylistMap,
} from '@/lib/netease';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function useNeteasePlaylist(environment: string, playlistIds?: number[]) {
  const [candidates, setCandidates] = useState<NeteaseTrack[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const triedPlaylists = useRef<Set<number>>(new Set());

  const fetchCandidates = useCallback(async () => {
    const ids = playlistIds ?? moodPlaylistMap[environment];
    if (!ids || ids.length === 0) {
      setError('No playlist mapped for this mood');
      return;
    }

    setCandidates([]);
    setLoading(true);
    setError(null);
    setIndex(0);
    triedPlaylists.current = new Set();

    const allTracks: NeteaseTrack[] = [];

    // Fetch every mapped playlist and merge tracks
    for (const pid of ids) {
      try {
        const res = await fetch(`/api/netease/playlist?id=${pid}`);
        if (!res.ok) continue;

        const data = await res.json();
        const tracks: NeteaseTrack[] =
          data?.result?.tracks?.map((t: { id: number; name: string; artists?: { name: string }[]; album?: { picUrl: string }; duration?: number }) => ({
            id: t.id,
            name: t.name,
            artist: t.artists?.[0]?.name ?? 'Unknown',
            cover: t.album?.picUrl ?? '',
            duration: Math.round((t.duration ?? 0) / 1000),
          })) ?? [];

        allTracks.push(...tracks);
        triedPlaylists.current.add(pid);
      } catch {
        // try next playlist
      }
    }

    if (allTracks.length > 0) {
      setCandidates(shuffle(allTracks));
    } else {
      setError('Could not load tracks from Netease');
      setCandidates([]);
    }

    setLoading(false);
  }, [environment, playlistIds]);

  const nextTrack = useCallback(() => {
    if (index < candidates.length - 1) {
      setIndex((i) => i + 1);
      return candidates[index + 1];
    }
    return null;
  }, [candidates, index]);


  const track = candidates[index] ?? null;

  return { track, candidates, loading, error, refetch: fetchCandidates, nextTrack };
}
