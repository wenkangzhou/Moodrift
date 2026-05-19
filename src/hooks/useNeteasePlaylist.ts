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

const INITIAL_BATCH = 2;  // playlists to fetch for first song (fast)
const EXPAND_BATCH = 3;   // playlists to fetch in background

export function useNeteasePlaylist(playlistIds?: number[]) {
  const [candidates, setCandidates] = useState<NeteaseTrack[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const triedPlaylists = useRef<Set<number>>(new Set());
  const autoFetchRef = useRef(false);
  const prevPlaylistKeyRef = useRef<string>('');

  const playlistIdsKey = playlistIds?.join(',') ?? '';

  // Low-level fetch helper: fetch given playlist IDs and optionally append to pool
  const doFetch = useCallback(async (ids: number[], append: boolean): Promise<NeteaseTrack[]> => {
    const responses = await Promise.allSettled(
      ids.map(async (pid) => {
        try {
          const res = await fetch(`/api/netease/playlist?id=${pid}`);
          if (!res.ok) return [];
          const data = await res.json();
          return (data?.playlist?.tracks ?? []) as RawNeteaseTrack[];
        } catch {
          return [];
        }
      })
    );

    const allTracks: NeteaseTrack[] = [];
    responses.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value.length > 0) {
        const tracks = r.value.map((t) => ({
          id: t.id,
          name: t.name,
          artist: t.artists?.[0]?.name ?? t.ar?.[0]?.name ?? 'Unknown',
          cover: t.album?.picUrl ?? t.al?.picUrl ?? '',
          duration: Math.round((t.duration ?? t.dt ?? 0) / 1000),
        }));
        allTracks.push(...tracks);
        triedPlaylists.current.add(ids[i]);
      }
    });

    if (allTracks.length === 0) return [];

    if (append) {
      let addedCount = 0;
      setCandidates((prev) => {
        const seen = new Set(prev.map((c) => c.id));
        const newTracks = allTracks.filter((t) => {
          if (seen.has(t.id)) return false;
          seen.add(t.id);
          return true;
        });
        addedCount = newTracks.length;
        if (newTracks.length === 0) return prev;
        return shuffle([...prev, ...newTracks]);
      });
      if (addedCount > 0) {
        console.log('[useNeteasePlaylist] Expanded pool with', addedCount, 'new tracks');
      }
      return allTracks;
    } else {
      const seen = new Set<number>();
      const uniqueTracks = allTracks.filter((t) => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      });
      setCandidates(shuffle(uniqueTracks));
      setIndex(0);
      console.log('[useNeteasePlaylist] Loaded', uniqueTracks.length, 'tracks from', triedPlaylists.current.size, 'playlists');
      return uniqueTracks;
    }
  }, []);

  const fetchCandidates = useCallback(async (): Promise<NeteaseTrack[]> => {
    const isFirstLoad = candidates.length === 0;

    setLoading(true);
    setError(null);
    triedPlaylists.current = new Set();

    // Use AI-curated playlists if provided, otherwise fallback to random pool
    const targetPool = playlistIds && playlistIds.length > 0 ? playlistIds : allPlaylistIds;
    const shuffledIds = shuffle(targetPool).slice(0, INITIAL_BATCH);

    const uniqueTracks = await doFetch(shuffledIds, false);

    if (uniqueTracks.length === 0) {
      setError('Could not load tracks from Netease');
      if (isFirstLoad) {
        setCandidates([]);
        setIndex(0);
      }
      console.warn('[useNeteasePlaylist] No tracks loaded, tried', triedPlaylists.current.size, 'playlists');
    }

    setLoading(false);
    return uniqueTracks;
  }, [candidates.length, playlistIds, doFetch]);

  // Background expansion: fetch more playlists and append silently
  const expandPool = useCallback(async (): Promise<void> => {
    const targetPool = playlistIds && playlistIds.length > 0 ? playlistIds : allPlaylistIds;
    const remainingIds = shuffle(targetPool).filter((id) => !triedPlaylists.current.has(id)).slice(0, EXPAND_BATCH);

    if (remainingIds.length === 0) return;

    await doFetch(remainingIds, true);
  }, [playlistIds, doFetch]);

  // Auto-fetch on mount when pool is empty — fetch 2 playlists fast, then expand in background
  useEffect(() => {
    if (autoFetchRef.current) return;
    if (candidates.length === 0 && !loading && !error) {
      autoFetchRef.current = true;
      const raf = requestAnimationFrame(async () => {
        await fetchCandidates();
        // After first tracks are available, silently expand the pool
        expandPool();
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [candidates.length, loading, error, fetchCandidates, expandPool]);

  // Refetch when AI-curated playlistIds change — same fast-then-expand pattern
  useEffect(() => {
    if (!playlistIdsKey || playlistIdsKey === prevPlaylistKeyRef.current || loading) return;
    prevPlaylistKeyRef.current = playlistIdsKey;
    const raf = requestAnimationFrame(async () => {
      await fetchCandidates();
      expandPool();
    });
    return () => cancelAnimationFrame(raf);
  }, [playlistIdsKey, fetchCandidates, expandPool, loading]);

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
