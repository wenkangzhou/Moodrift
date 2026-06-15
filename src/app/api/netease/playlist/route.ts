import { NextResponse } from 'next/server';
import { getServerCache, setServerCache, stableKey, type ServerCache } from '@/lib/server-cache';

const NETEASE_API_BASE = 'https://api-netease-cloud-music.yibuu.com';
const PLAYLIST_CACHE_TTL = 60 * 60 * 1000;
const NETEASE_TIMEOUT_MS = 8_000;

const playlistCache: ServerCache<unknown> = new Map();

async function fetchNeteasePlaylist(id: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), NETEASE_TIMEOUT_MS);
  return fetch(`${NETEASE_API_BASE}/playlist/detail?id=${id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing playlist id' }, { status: 400 });
  }
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return NextResponse.json({ error: 'Invalid playlist id' }, { status: 400 });
  }

  const cacheKey = stableKey(['netease-playlist', numericId]);
  const cached = getServerCache(playlistCache, cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { 'x-moodrift-cache': 'hit' },
    });
  }

  try {
    const res = await fetchNeteasePlaylist(numericId);

    if (!res.ok) {
      return NextResponse.json(
        { error: `API returned ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    setServerCache(playlistCache, cacheKey, data, PLAYLIST_CACHE_TTL);
    return NextResponse.json(data, {
      headers: { 'x-moodrift-cache': 'miss' },
    });
  } catch (err) {
    console.error('[Netease API] Playlist fetch failed:', err);
    return NextResponse.json(
      { error: 'Failed to fetch playlist' },
      { status: 502 }
    );
  }
}
