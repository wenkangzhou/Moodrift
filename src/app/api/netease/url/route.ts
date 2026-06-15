import { NextResponse } from 'next/server';
import { getServerCache, setServerCache, stableKey, type ServerCache } from '@/lib/server-cache';

const NETEASE_API_BASE = 'https://api-netease-cloud-music.yibuu.com';
const URL_CACHE_TTL = 5 * 60 * 1000;
const NETEASE_TIMEOUT_MS = 8_000;
const MAX_BATCH_IDS = 50;

const urlCache: ServerCache<Record<string, string | null>> = new Map();

function parseTrackIds(value: string) {
  return value
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((id) => Number.isInteger(id) && id > 0)
    .slice(0, MAX_BATCH_IDS);
}

async function fetchNetease(path: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), NETEASE_TIMEOUT_MS);
  return fetch(`${NETEASE_API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));
}

function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIP = request.headers.get('x-real-ip');
  if (realIP) return realIP;
  return '113.65.123.123';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const idsParam = searchParams.get('ids');

  const realIP = getClientIP(request);

  // Batch mode: ?ids=1,2,3
  if (idsParam) {
    const ids = parseTrackIds(idsParam);
    if (ids.length === 0) {
      return NextResponse.json({ error: 'Missing track ids' }, { status: 400 });
    }
    const cacheKey = stableKey(['netease-url-batch', realIP, ids.join(',')]);
    const cached = getServerCache(urlCache, cacheKey);
    if (cached) {
      return NextResponse.json({ urls: cached }, {
        headers: { 'x-moodrift-cache': 'hit' },
      });
    }

    try {
      const res = await fetchNetease(
        `/song/url/v1?id=${ids.join(',')}&level=exhigh&realIP=${encodeURIComponent(realIP)}`
      );

      if (!res.ok) {
        return NextResponse.json(
          { error: `API returned ${res.status}` },
          { status: 502 }
        );
      }

      const data = await res.json();
      const list: Array<{ id: number; url: string | null }> = data?.data ?? [];
      const urls: Record<string, string | null> = {};
      for (const item of list) {
        urls[String(item.id)] = item.url ?? null;
      }
      setServerCache(urlCache, cacheKey, urls, URL_CACHE_TTL);
      return NextResponse.json({ urls }, {
        headers: { 'x-moodrift-cache': 'miss' },
      });
    } catch (err) {
      console.error('[Netease API] Batch URL fetch failed:', err);
      return NextResponse.json(
        { error: 'Failed to fetch track URLs' },
        { status: 502 }
      );
    }
  }

  // Single mode: ?id=123
  if (!id) {
    return NextResponse.json({ error: 'Missing track id' }, { status: 400 });
  }
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return NextResponse.json({ error: 'Invalid track id' }, { status: 400 });
  }
  const cacheKey = stableKey(['netease-url', realIP, numericId]);
  const cached = getServerCache(urlCache, cacheKey);
  if (cached) {
    return NextResponse.json({ url: cached[String(numericId)] ?? null }, {
      headers: { 'x-moodrift-cache': 'hit' },
    });
  }

  try {
    const res = await fetchNetease(
      `/song/url/v1?id=${numericId}&level=exhigh&realIP=${encodeURIComponent(realIP)}`
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `API returned ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const url = data?.data?.[0]?.url ?? null;
    setServerCache(urlCache, cacheKey, { [String(numericId)]: url }, URL_CACHE_TTL);

    // Return 200 with null url so the client can gracefully fall back / skip
    return NextResponse.json({ url }, {
      headers: { 'x-moodrift-cache': 'miss' },
    });
  } catch (err) {
    console.error('[Netease API] URL fetch failed:', err);
    return NextResponse.json(
      { error: 'Failed to fetch track URL' },
      { status: 502 }
    );
  }
}
