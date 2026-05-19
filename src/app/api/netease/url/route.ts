import { NextResponse } from 'next/server';

const NETEASE_API_BASE = 'https://api-netease-cloud-music.yibuu.com';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing track id' }, { status: 400 });
  }

  try {
    const res = await fetch(`${NETEASE_API_BASE}/song/url/v1?id=${id}&level=exhigh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `API returned ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const url = data?.data?.[0]?.url ?? null;

    if (!url) {
      return NextResponse.json(
        { error: 'Track URL not available' },
        { status: 404 }
      );
    }

    return NextResponse.json({ url });
  } catch (err) {
    console.error('[Netease API] URL fetch failed:', err);
    return NextResponse.json(
      { error: 'Failed to fetch track URL' },
      { status: 502 }
    );
  }
}
