import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing playlist id' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://music.163.com/api/playlist/detail?id=${id}&updateTime=-1`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Referer: 'https://music.163.com/',
        },
        cache: 'no-store',
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `Netease returned ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('[Netease API] Playlist fetch failed:', err);
    return NextResponse.json(
      { error: 'Failed to fetch playlist' },
      { status: 502 }
    );
  }
}
