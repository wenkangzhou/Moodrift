import { useState, useCallback, useRef, useEffect } from 'react';
import { fetchPlaylistTracks, checkNeteaseUrls, type NeteaseTrack } from '@/lib/netease';
import {
  type AtmosphereData,
  getCachedAtmosphere,
  setCachedAtmosphere,
} from '@/lib/atmosphere-cache';
import { logger } from '@/lib/logger';

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
  const cached = getCachedAtmosphere(song.name, song.artist, locale);
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
    setCachedAtmosphere(song.name, song.artist, locale, result);
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
const MIN_POOL_SIZE = 5;
const ATMOSPHERE_PREFETCH_LIMIT = 3;

export function useSongPool(locale: string, playlistIds?: number[], enableAtmosphere = false) {
  const [songs, setSongs] = useState<SongWithAtmosphere[]>([]);
  const [index, setIndex] = useState(0);
  const [poolLoading, setPoolLoading] = useState(false);
  const [poolError, setPoolError] = useState<string | null>(null);
  const autoFetchRef = useRef(false);
  const prevPlaylistKeyRef = useRef<string>('');
  const prefetchedIdsRef = useRef<Set<number>>(new Set());
  const retriedIdsRef = useRef<Set<number>>(new Set());
  const hasSongsRef = useRef(false);
  const loadRequestIdRef = useRef(0);

  const playlistIdsKey = playlistIds?.join(',') ?? '';

  useEffect(() => {
    hasSongsRef.current = songs.length > 0;
  }, [songs.length]);

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
      if (!enableAtmosphere) return;

      const BATCH_LIMIT = ATMOSPHERE_PREFETCH_LIMIT;
      const toProcess = tracks.slice(0, BATCH_LIMIT);

      // 1. Apply cached results immediately, collect uncached
      const uncached: NeteaseTrack[] = [];
      for (const t of toProcess) {
        const cached = getCachedAtmosphere(t.name, t.artist, locale);
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
            setCachedAtmosphere(t.name, t.artist, locale, data);
            updateSongAtmosphere(t.id, data, 'done');
          } else {
            updateSongAtmosphere(t.id, undefined, 'error');
          }
        });
      } catch {
        uncached.forEach((t) => updateSongAtmosphere(t.id, undefined, 'error'));
      }
    },
    [enableAtmosphere, locale, updateSongAtmosphere]
  );

  const loadPool = useCallback(async (): Promise<SongWithAtmosphere[]> => {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;
    const isCurrentRequest = () => loadRequestIdRef.current === requestId;

    const isFirstLoad = !hasSongsRef.current;
    setPoolLoading(true);
    setPoolError(null);

    const targetPool = playlistIds && playlistIds.length > 0 ? playlistIds : allPlaylistIds;

    // Step 1: Fetch initial tracks from 2 playlists (fast)
    const initialIds = shuffle(targetPool).slice(0, INITIAL_PLAYLIST_BATCH);
    const initialTracks = await fetchPlaylistTracks(initialIds);
    if (!isCurrentRequest()) return [];

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

    // Step 2.5: Batch-check URL availability — filter out tracks that Netease has no URL for
    const validIds = await checkNeteaseUrls(poolTracks.map((t) => t.id));
    if (!isCurrentRequest()) return [];
    const validTracks = poolTracks.filter((t) => validIds.has(t.id));

    // If too few valid tracks, try one more playlist batch before giving up
    if (validTracks.length < MIN_POOL_SIZE) {
      const extraIds = shuffle(targetPool)
        .filter((id) => !initialIds.includes(id))
        .slice(0, INITIAL_PLAYLIST_BATCH);
      if (extraIds.length > 0) {
        const extraTracks = await fetchPlaylistTracks(extraIds);
        if (!isCurrentRequest()) return [];
        const extraPool = shuffle(extraTracks).slice(0, POOL_SIZE - validTracks.length);
        const extraValidIds = await checkNeteaseUrls(extraPool.map((t) => t.id));
        if (!isCurrentRequest()) return [];
        validTracks.push(...extraPool.filter((t) => extraValidIds.has(t.id)));
      }
    }

    const newSongs: SongWithAtmosphere[] = validTracks.map((t) => ({
      ...t,
      atmosphereStatus: 'idle',
    }));

    setSongs(newSongs);
    setIndex(0);
    setPoolLoading(false);
    prefetchedIdsRef.current.clear();
    retriedIdsRef.current.clear();
    logger.log('[useSongPool] Pool ready with', newSongs.length, 'valid tracks');

    // Step 3: Defer AI atmosphere generation until the user starts listening.
    // Loading the app should not spend Kimi tokens for a whole pool.
    if (enableAtmosphere) {
      const initialAtmosphereTracks = validTracks.slice(0, ATMOSPHERE_PREFETCH_LIMIT);
      initialAtmosphereTracks.forEach((t) => prefetchedIdsRef.current.add(t.id));
      prefetchAtmospheres(initialAtmosphereTracks);
    }

    // Step 4: Expand pool with more tracks in background
    const remainingIds = shuffle(targetPool)
      .filter((id) => !initialIds.includes(id))
      .slice(0, EXPAND_PLAYLIST_BATCH);
    if (remainingIds.length > 0) {
      fetchPlaylistTracks(remainingIds).then(async (extraTracks) => {
        if (!isCurrentRequest()) return;
        if (extraTracks.length === 0) return;
        const shuffledExtra = shuffle(extraTracks);
        const candidates = shuffledExtra.slice(0, POOL_SIZE);
        const validExtraIds = await checkNeteaseUrls(candidates.map((t) => t.id));
        if (!isCurrentRequest()) return;
        const validExtra = candidates.filter((t) => validExtraIds.has(t.id));

        setSongs((prev) => {
          const seen = new Set(prev.map((s) => s.id));
          const newOnes = validExtra
            .filter((t) => !seen.has(t.id))
            .slice(0, POOL_SIZE - prev.length)
            .map((t) => ({ ...t, atmosphereStatus: 'idle' as const }));
          if (newOnes.length === 0) return prev;
          logger.log('[useSongPool] Expanded pool with', newOnes.length, 'valid tracks');
          return [...prev, ...newOnes];
        });
      });
    }

    return newSongs;
  }, [enableAtmosphere, playlistIds, prefetchAtmospheres]);

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
    if (!enableAtmosphere) return;
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
  }, [enableAtmosphere, index, songs, locale, updateSongAtmosphere]);

  // Lazy batch prefetch: when user skips, look ahead for idle/error songs and batch them
  useEffect(() => {
    if (!enableAtmosphere || songs.length === 0) return;
    const idleAhead = songs
      .slice(index + 1)
      .filter((s) => {
        if (s.atmosphereStatus === 'idle') return !prefetchedIdsRef.current.has(s.id);
        if (s.atmosphereStatus === 'error') return !retriedIdsRef.current.has(s.id);
        return false;
      })
      .slice(0, ATMOSPHERE_PREFETCH_LIMIT);

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
  }, [enableAtmosphere, index, songs, prefetchAtmospheres]);

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
