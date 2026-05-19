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

export async function getNeteaseAudioUrl(id: number): Promise<string | null> {
  try {
    const res = await fetch(`/api/netease/url?id=${id}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.url ?? null;
  } catch {
    return null;
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

export async function fetchPlaylistTracks(ids: number[]): Promise<NeteaseTrack[]> {
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
  responses.forEach((r) => {
    if (r.status === 'fulfilled' && r.value.length > 0) {
      const tracks = r.value.map((t) => ({
        id: t.id,
        name: t.name,
        artist: t.artists?.[0]?.name ?? t.ar?.[0]?.name ?? 'Unknown',
        cover: t.album?.picUrl ?? t.al?.picUrl ?? '',
        duration: Math.round((t.duration ?? t.dt ?? 0) / 1000),
      }));
      allTracks.push(...tracks);
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
