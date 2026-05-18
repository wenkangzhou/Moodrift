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
};

export function getNeteaseAudioUrl(id: number): string {
  return `https://music.163.com/song/media/outer/url?id=${id}.mp3`;
}

export function pickRandomTrack(tracks: NeteaseTrack[]): NeteaseTrack | null {
  if (!tracks.length) return null;
  return tracks[Math.floor(Math.random() * tracks.length)];
}
