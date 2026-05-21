import { NextResponse } from 'next/server';

const NETEASE_API_BASE = 'https://api-netease-cloud-music.yibuu.com';

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

  if (!id) {
    return NextResponse.json({ error: 'Missing track id' }, { status: 400 });
  }

  const realIP = getClientIP(request);

  try {
    const res = await fetch(
      `${NETEASE_API_BASE}/song/url/v1?id=${id}&level=exhigh&realIP=${encodeURIComponent(realIP)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `API returned ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const url = data?.data?.[0]?.url ?? null;

    // Return 200 with null url so the client can gracefully fall back / skip
    return NextResponse.json({ url });
  } catch (err) {
    console.error('[Netease API] URL fetch failed:', err);
    return NextResponse.json(
      { error: 'Failed to fetch track URL' },
      { status: 502 }
    );
  }
}
