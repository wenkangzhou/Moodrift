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

export function getNeteaseAudioUrl(id: number): string {
  return `https://music.163.com/song/media/outer/url?id=${id}.mp3`;
}

export function pickRandomTrack(tracks: NeteaseTrack[]): NeteaseTrack | null {
  if (!tracks.length) return null;
  return tracks[Math.floor(Math.random() * tracks.length)];
}
