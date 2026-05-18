import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing track id' }, { status: 400 });
  }

  try {
    const checkUrl = `https://music.163.com/song/media/outer/url?id=${id}.mp3`;
    const res = await fetch(checkUrl, {
      method: 'HEAD',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: 'https://music.163.com/',
      },
      redirect: 'manual',
    });

    // Netease redirects (302/307) to actual MP3 when track is available
    if (res.status >= 300 && res.status < 400) {
      return NextResponse.json({ available: true });
    }

    // 404 = definitely unavailable
    if (res.status === 404) {
      return NextResponse.json({ available: false });
    }

    // For 200 responses, inspect content-type and size
    if (res.status === 200) {
      const ct = res.headers.get('content-type') ?? '';
      const cl = parseInt(res.headers.get('content-length') ?? '0', 10);

      if (ct.includes('audio') && cl > 1000) {
        return NextResponse.json({ available: true });
      }

      if (ct.includes('text/html')) {
        return NextResponse.json({ available: false });
      }
    }

    // Conservative fallback: assume available to avoid false negatives
    return NextResponse.json({ available: true });
  } catch (err) {
    console.error('[Netease API] Check failed:', err);
    return NextResponse.json({ available: true });
  }
}
