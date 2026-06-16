export interface NeteaseTrack {
  id: number;
  name: string;
  artist: string;
  cover: string;
  duration: number;
}

export interface NeteasePlaylist {
  id: number;
  name: string;
  tracks: NeteaseTrack[];
}

const CLIENT_URL_TIMEOUT_MS = 4_500;
const CLIENT_POOL_TIMEOUT_MS = 5_000;
const PLAYLIST_CACHE_TTL = 6 * 60 * 60 * 1000;
const URL_CHECK_CACHE_TTL = 30 * 60 * 1000;

interface CacheEnvelope<T> {
  data: T;
  timestamp: number;
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = CLIENT_POOL_TIMEOUT_MS
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function getClientCache<T>(key: string, ttl: number): T | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (Date.now() - parsed.timestamp > ttl) {
      window.localStorage.removeItem(key);
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}

function setClientCache<T>(key: string, data: T) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // Ignore storage quota / private mode errors.
  }
}

function playlistCacheKey(id: number) {
  return `moodrift-playlist-${id}`;
}

function urlCheckCacheKey(id: number) {
  return `moodrift-url-valid-${id}`;
}

// Pre-curated public playlist IDs mapped to mood environments.
// These are public NetEase Cloud Music playlists; users can swap IDs
// or add their own in a config file later.
export const moodPlaylistMap: Record<string, number[]> = {
  rain: [2420545066, 2734818440, 535795534],
  city: [7682120567, 2420545066],
  mountain: [386311163, 701624380],
  night: [6665721796, 2199538031, 7682120567],
  sunset: [12323068903, 386311163],
  // Official Netease toplists — constantly updated, broad variety
  toplist: [
    3778678, // 热歌榜
    7785066739, // 黑胶 VIP 热歌榜
    5059661515, // 网易云民谣榜
    1978921795, // 网易云电音榜
    71384707, // 网易云古典榜
    71385702, // 网易云 ACG 榜
    12225155968, // 欧美 R&B 榜
    991319590, // 网易云中文说唱榜
    6723173524, // 网络热歌榜
    5453912201, // 黑胶 VIP 爱听榜
  ],
};

// Human-readable descriptions for each playlist ID,
// used by the AI curator to pick the best match.
export const playlistCatalog: Record<number, string> = {
  2420545066: '雨天氛围，轻柔钢琴与雨声交织，适合低能量冥想和独处',
  2734818440: '雨天治愈，温暖民谣与木吉他，适合漫步和放松心情',
  535795534: '雨夜电子，氛围合成器与低频律动，适合专注和深夜工作',
  7682120567: '城市节奏，电子与 Hip-hop 混合，适合奔跑、驾驶和高能量状态',
  386311163: '山野自然，原声吉他与自然采样，适合放松、冥想和低能量静息',
  701624380: '山野晨光，清新民谣与轻快节奏，适合晨跑和愉悦心情',
  6665721796: '深夜氛围，低保真 Lo-fi 与轻柔节拍，适合独处和专注学习',
  2199538031: '深夜电子，深邃氛围与缓慢律动，适合冥想和梦幻情绪',
  12323068903: '日落浪漫，独立流行与温暖人声，适合驾驶和怀旧情绪',
  3778678: '热歌榜，全平台最热门的华语与欧美流行，曲风多样',
  7785066739: '黑胶 VIP 热歌榜，高品质热门单曲，覆盖流行摇滚电子',
  5059661515: '网易云民谣榜，独立民谣与叙事歌谣，温暖安静',
  1978921795: '网易云电音榜，House/Techno/Trance，高能量律动',
  71384707: '网易云古典榜，古典音乐精选，专注冥想放松',
  71385702: '网易云 ACG 榜，动画游戏音乐，日系流行与史诗配乐',
  12225155968: '欧美 R&B 榜，节奏布鲁斯与 Soul，浪漫慵懒氛围',
  991319590: '网易云中文说唱榜，Hip-hop 与说唱，城市态度高能量',
  6723173524: '网络热歌榜， viral 短视频热歌，新鲜流行',
  5453912201: '黑胶 VIP 爱听榜，深度听众精选，品质与口碑兼具',
};

export async function getNeteaseAudioUrl(
  id: number,
  timeoutMs = CLIENT_URL_TIMEOUT_MS
): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(`/api/netease/url?id=${id}`, {}, timeoutMs);
    if (!res.ok) return null;
    const data = await res.json();
    return data.url ?? null;
  } catch {
    return null;
  }
}

export async function checkNeteaseUrls(ids: number[]): Promise<Set<number>> {
  if (ids.length === 0) return new Set();

  const valid = new Set<number>();
  const missing: number[] = [];
  for (const id of ids) {
    const cached = getClientCache<boolean>(urlCheckCacheKey(id), URL_CHECK_CACHE_TTL);
    if (cached === true) {
      valid.add(id);
    } else if (cached === null) {
      missing.push(id);
    }
  }

  if (missing.length === 0) return valid;

  try {
    const res = await fetchWithTimeout(`/api/netease/url?ids=${missing.join(',')}`);
    if (!res.ok) return valid;
    const data = await res.json();
    const urls: Record<string, string | null> = data.urls ?? {};
    for (const id of missing) {
      const hasUrl = Boolean(urls[String(id)]);
      setClientCache(urlCheckCacheKey(id), hasUrl);
      if (hasUrl) valid.add(id);
    }
    return valid;
  } catch {
    return valid;
  }
}

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

function normalizeTrack(t: RawNeteaseTrack): NeteaseTrack {
  return {
    id: t.id,
    name: t.name,
    artist: t.artists?.[0]?.name ?? t.ar?.[0]?.name ?? 'Unknown',
    cover: t.album?.picUrl ?? t.al?.picUrl ?? '',
    duration: Math.round((t.duration ?? t.dt ?? 0) / 1000),
  };
}

async function fetchPlaylistTrackSet(pid: number): Promise<NeteaseTrack[]> {
  const cached = getClientCache<NeteaseTrack[]>(playlistCacheKey(pid), PLAYLIST_CACHE_TTL);
  if (cached) return cached;

  try {
    const res = await fetchWithTimeout(`/api/netease/playlist?id=${pid}`);
    if (!res.ok) return [];
    const data = await res.json();
    const tracks = ((data?.playlist?.tracks ?? []) as RawNeteaseTrack[]).map(normalizeTrack);
    setClientCache(playlistCacheKey(pid), tracks);
    return tracks;
  } catch {
    return [];
  }
}

export async function fetchPlaylistTracks(ids: number[]): Promise<NeteaseTrack[]> {
  const responses = await Promise.allSettled(
    ids.map((pid) => fetchPlaylistTrackSet(pid))
  );

  const allTracks: NeteaseTrack[] = [];
  responses.forEach((r) => {
    if (r.status === 'fulfilled' && r.value.length > 0) {
      allTracks.push(...r.value);
    }
  });

  const seen = new Set<number>();
  return allTracks.filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });
}

export function pickRandomTrack(tracks: NeteaseTrack[]): NeteaseTrack | null {
  if (!tracks.length) return null;
  return tracks[Math.floor(Math.random() * tracks.length)];
}
