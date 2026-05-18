import { useState, useCallback, useRef, useEffect } from 'react';
import {
  type NeteaseTrack,
  moodPlaylistMap,
} from '@/lib/netease';

interface RawNeteaseTrack {
  id: number;
  name: string;
  artists?: { name: string }[];
  ar?: { name: string }[];
  album?: { picUrl: string };
  al?: { picUrl: string };
  duration?: number;
  dt?: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// All preset playlist IDs merged into one pool
const allPlaylistIds = Object.values(moodPlaylistMap).flat();

// Module-level guard to prevent Strict Mode double-invocation from refetching twice
let autoFetchInitiated = false;

export function useNeteasePlaylist() {
  const [candidates, setCandidates] = useState<NeteaseTrack[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const triedPlaylists = useRef<Set<number>>(new Set());

  const fetchCandidates = useCallback(async (): Promise<NeteaseTrack[]> => {
    const isFirstLoad = candidates.length === 0;

    setLoading(true);
    setError(null);
    if (isFirstLoad) {
      setCandidates([]);
      setIndex(0);
    }
    triedPlaylists.current = new Set();

    const allTracks: NeteaseTrack[] = [];

    // Shuffle playlist order so we don't always hit the same ones first
    const shuffledIds = shuffle(allPlaylistIds);

    for (const pid of shuffledIds) {
      try {
        const res = await fetch(`/api/netease/playlist?id=${pid}`);
        if (!res.ok) continue;

        const data = await res.json();
        const rawTracks = data?.result?.tracks ?? data?.playlist?.tracks ?? [];
        const tracks: NeteaseTrack[] = (rawTracks as RawNeteaseTrack[]).map((t) => ({
          id: t.id,
          name: t.name,
          artist: t.artists?.[0]?.name ?? t.ar?.[0]?.name ?? 'Unknown',
          cover: t.album?.picUrl ?? t.al?.picUrl ?? '',
          duration: Math.round((t.duration ?? t.dt ?? 0) / 1000),
        }));

        allTracks.push(...tracks);
        triedPlaylists.current.add(pid);
      } catch {
        // try next playlist
      }
    }

    // Deduplicate by track id since official toplists and mood playlists overlap
    const seen = new Set<number>();
    const uniqueTracks = allTracks.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });

    if (uniqueTracks.length > 0) {
      setCandidates(shuffle(uniqueTracks));
      console.log('[useNeteasePlaylist] Loaded', uniqueTracks.length, 'tracks from', triedPlaylists.current.size, 'playlists');
    } else {
      setError('Could not load tracks from Netease');
      if (isFirstLoad) {
        setCandidates([]);
      }
      console.warn('[useNeteasePlaylist] No tracks loaded, tried', triedPlaylists.current.size, 'playlists');
    }

    if (isFirstLoad) {
      setIndex(0);
    }

    setLoading(false);
    return uniqueTracks;
  }, [candidates.length]);

  // Auto-fetch on mount when pool is empty
  useEffect(() => {
    if (autoFetchInitiated) return;
    if (candidates.length === 0 && !loading && !error) {
      autoFetchInitiated = true;
      const raf = requestAnimationFrame(() => {
        fetchCandidates();
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [candidates.length, loading, error, fetchCandidates]);

  const nextTrack = useCallback((): NeteaseTrack | null => {
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];
    const nextIndex = index < candidates.length - 1 ? index + 1 : 0;
    setIndex(nextIndex);
    return candidates[nextIndex] ?? null;
  }, [candidates, index]);

  const track = candidates[index] ?? null;

  return { track, candidates, loading, error, refetch: fetchCandidates, nextTrack };
}
