import { NextResponse } from 'next/server';

const NETEASE_API_BASE = 'https://api-netease-cloud-music.yibuu.com';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing track id' }, { status: 400 });
  }

  try {
    const res = await fetch(`${NETEASE_API_BASE}/check/music?id=${id}&br=999000`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!res.ok) {
      // Conservative fallback: assume available to avoid false negatives
      return NextResponse.json({ available: true });
    }

    const data = await res.json();
    return NextResponse.json({ available: data.success === true });
  } catch {
    return NextResponse.json({ available: true });
  }
}
