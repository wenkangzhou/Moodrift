import { useState, useCallback, useRef, useEffect } from 'react';
import { fetchPlaylistTracks, type NeteaseTrack } from '@/lib/netease';
import { type AtmosphereData, getCached, setCached } from '@/hooks/useAtmosphere';

interface SongWithAtmosphere extends NeteaseTrack {
  atmosphere?: AtmosphereData;
  atmosphereStatus: 'idle' | 'loading' | 'done' | 'error';
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function fetchAtmosphereForSong(
  song: NeteaseTrack,
  locale: string
): Promise<{ data?: AtmosphereData; error?: string }> {
  const cached = getCached(song.name, song.artist, locale);
  if (cached) {
    return { data: cached };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch('/api/generate-atmosphere', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackName: song.name, artist: song.artist, locale }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error ?? `HTTP ${res.status}`);
    }

    const result: AtmosphereData = await res.json();
    setCached(song.name, song.artist, locale, result);
    return { data: result };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { error: 'timeout' };
    }
    return { error: err instanceof Error ? err.message : 'failed' };
  }
}

async function fetchAtmospheresBatch(
  tracks: NeteaseTrack[],
  locale: string
): Promise<AtmosphereData[]> {
  if (tracks.length === 0) return [];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);
  const res = await fetch('/api/generate-atmosphere', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tracks: tracks.map((t) => ({ name: t.name, artist: t.artist })),
      locale,
    }),
    signal: controller.signal,
  });
  clearTimeout(timeoutId);

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error ?? `HTTP ${res.status}`);
  }

  return res.json();
}

const allPlaylistIds = Object.values(
  // Use dynamic import to avoid circular dependency with netease.ts
  // but moodPlaylistMap is statically defined, so inline it here:
  {
    rain: [2420545066, 2734818440, 535795534],
    city: [7682120567, 2420545066],
    mountain: [386311163, 701624380],
    night: [6665721796, 2199538031, 7682120567],
    sunset: [12323068903, 386311163],
    toplist: [
      3778678, 7785066739, 5059661515, 1978921795, 71384707,
      71385702, 12225155968, 991319590, 6723173524, 5453912201,
    ],
  } as Record<string, number[]>
).flat();

const POOL_SIZE = 20;
const INITIAL_PLAYLIST_BATCH = 2;
const EXPAND_PLAYLIST_BATCH = 3;

export function useSongPool(locale: string, playlistIds?: number[]) {
  const [songs, setSongs] = useState<SongWithAtmosphere[]>([]);
  const [index, setIndex] = useState(0);
  const [poolLoading, setPoolLoading] = useState(false);
  const [poolError, setPoolError] = useState<string | null>(null);
  const autoFetchRef = useRef(false);
  const prevPlaylistKeyRef = useRef<string>('');
  const prefetchedIdsRef = useRef<Set<number>>(new Set());
  const retriedIdsRef = useRef<Set<number>>(new Set());

  const playlistIdsKey = playlistIds?.join(',') ?? '';

  const updateSongAtmosphere = useCallback(
    (songId: number, atmosphere?: AtmosphereData, status: SongWithAtmosphere['atmosphereStatus'] = 'done') => {
      setSongs((prev) =>
        prev.map((s) => (s.id === songId ? { ...s, atmosphere, atmosphereStatus: status } : s))
      );
    },
    []
  );

  const prefetchAtmospheres = useCallback(
    async (tracks: NeteaseTrack[]) => {
      // Cap batch size — AI token limit can't handle hundreds at once.
      // The rest are fetched on-demand when the user reaches them.
      const BATCH_LIMIT = 20;
      const toProcess = tracks.slice(0, BATCH_LIMIT);

      // 1. Apply cached results immediately, collect uncached
      const uncached: NeteaseTrack[] = [];
      for (const t of toProcess) {
        const cached = getCached(t.name, t.artist, locale);
        if (cached) {
          updateSongAtmosphere(t.id, cached, 'done');
        } else {
          uncached.push(t);
        }
      }

      if (uncached.length === 0) return;

      // 2. Mark uncached as loading
      uncached.forEach((t) => updateSongAtmosphere(t.id, undefined, 'loading'));

      // 3. Single batch request for uncached tracks
      try {
        const results = await fetchAtmospheresBatch(uncached, locale);
        uncached.forEach((t, i) => {
          const data = results[i];
          if (data) {
            setCached(t.name, t.artist, locale, data);
            updateSongAtmosphere(t.id, data, 'done');
          } else {
            updateSongAtmosphere(t.id, undefined, 'error');
          }
        });
      } catch {
        uncached.forEach((t) => updateSongAtmosphere(t.id, undefined, 'error'));
      }
    },
    [locale, updateSongAtmosphere]
  );

  const loadPool = useCallback(async (): Promise<SongWithAtmosphere[]> => {
    const isFirstLoad = songs.length === 0;
    setPoolLoading(true);
    setPoolError(null);

    const targetPool = playlistIds && playlistIds.length > 0 ? playlistIds : allPlaylistIds;

    // Step 1: Fetch initial tracks from 2 playlists (fast)
    const initialIds = shuffle(targetPool).slice(0, INITIAL_PLAYLIST_BATCH);
    const initialTracks = await fetchPlaylistTracks(initialIds);

    if (initialTracks.length === 0) {
      setPoolError('output.loadTracksError');
      if (isFirstLoad) {
        setSongs([]);
        setIndex(0);
      }
      setPoolLoading(false);
      return [];
    }

    // Step 2: Build pool of 20 tracks max
    const poolTracks = shuffle(initialTracks).slice(0, POOL_SIZE);
    const newSongs: SongWithAtmosphere[] = poolTracks.map((t) => ({
      ...t,
      atmosphereStatus: 'idle',
    }));

    setSongs(newSongs);
    setIndex(0);
    setPoolLoading(false);
    prefetchedIdsRef.current.clear();
    retriedIdsRef.current.clear();
    console.log('[useSongPool] Pool ready with', newSongs.length, 'tracks');

    // Step 3: Prefetch atmospheres for the initial pool in one batch
    poolTracks.forEach((t) => prefetchedIdsRef.current.add(t.id));
    prefetchAtmospheres(poolTracks);

    // Step 4: Expand pool with more tracks in background (no atmosphere prefetch here — lazy loaded later)
    const remainingIds = shuffle(targetPool)
      .filter((id) => !initialIds.includes(id))
      .slice(0, EXPAND_PLAYLIST_BATCH);
    if (remainingIds.length > 0) {
      fetchPlaylistTracks(remainingIds).then((extraTracks) => {
        if (extraTracks.length === 0) return;
        const shuffledExtra = shuffle(extraTracks);
        setSongs((prev) => {
          const seen = new Set(prev.map((s) => s.id));
          const newOnes = shuffledExtra
            .filter((t) => !seen.has(t.id))
            .slice(0, POOL_SIZE - prev.length)
            .map((t) => ({ ...t, atmosphereStatus: 'idle' as const }));
          if (newOnes.length === 0) return prev;
          console.log('[useSongPool] Expanded pool with', newOnes.length, 'tracks');
          return [...prev, ...newOnes];
        });
      });
    }

    return newSongs;
  }, [playlistIds, prefetchAtmospheres, songs.length]);

  // Auto-load on mount
  useEffect(() => {
    if (autoFetchRef.current) return;
    if (songs.length === 0 && !poolLoading && !poolError) {
      autoFetchRef.current = true;
      const raf = requestAnimationFrame(() => {
        loadPool();
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [songs.length, poolLoading, poolError, loadPool]);

  // Reload when curated playlistIds change
  useEffect(() => {
    if (!playlistIdsKey || playlistIdsKey === prevPlaylistKeyRef.current || poolLoading) return;
    prevPlaylistKeyRef.current = playlistIdsKey;
    const raf = requestAnimationFrame(() => {
      loadPool();
    });
    return () => cancelAnimationFrame(raf);
  }, [playlistIdsKey, loadPool, poolLoading]);

  // If user skips faster than prefetch, ensure current song still gets atmosphere.
  // Also retry failed atmospheres once per pool.
  useEffect(() => {
    const song = songs[index];
    if (!song) return;
    const canFetch =
      song.atmosphereStatus === 'idle' ||
      (song.atmosphereStatus === 'error' && !retriedIdsRef.current.has(song.id));
    if (!canFetch) return;

    if (song.atmosphereStatus === 'error') {
      retriedIdsRef.current.add(song.id);
    }
    updateSongAtmosphere(song.id, undefined, 'loading');
    fetchAtmosphereForSong(song, locale).then(({ data, error }) => {
      updateSongAtmosphere(song.id, data, error ? 'error' : 'done');
    });
  }, [index, songs, locale, updateSongAtmosphere]);

  // Lazy batch prefetch: when user skips, look ahead for idle/error songs and batch them
  useEffect(() => {
    if (songs.length === 0) return;
    const idleAhead = songs
      .slice(index + 1)
      .filter((s) => {
        if (s.atmosphereStatus === 'idle') return !prefetchedIdsRef.current.has(s.id);
        if (s.atmosphereStatus === 'error') return !retriedIdsRef.current.has(s.id);
        return false;
      })
      .slice(0, 20);

    if (idleAhead.length === 0) return;

    idleAhead.forEach((s) => {
      if (s.atmosphereStatus === 'error') {
        retriedIdsRef.current.add(s.id);
      } else {
        prefetchedIdsRef.current.add(s.id);
      }
    });

    const timer = setTimeout(() => {
      prefetchAtmospheres(idleAhead);
    }, 500);
    return () => clearTimeout(timer);
  }, [index, songs, prefetchAtmospheres]);

  const nextSong = useCallback((): SongWithAtmosphere | null => {
    if (songs.length === 0) return null;
    if (songs.length === 1) return songs[0];
    const nextIndex = index < songs.length - 1 ? index + 1 : 0;
    setIndex(nextIndex);
    return songs[nextIndex] ?? null;
  }, [songs, index]);

  const currentSong = songs[index] ?? null;

  return {
    currentSong,
    songs,
    poolLoading,
    poolError,
    nextSong,
    refetch: loadPool,
  };
}
