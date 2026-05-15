import { NextRequest, NextResponse } from 'next/server';

const JAMENDO_CLIENT_ID = process.env.JAMENDO_CLIENT_ID;
const JAMENDO_API_URL = 'https://api.jamendo.com/v3.0/tracks';

export async function POST(request: NextRequest) {
  if (!JAMENDO_CLIENT_ID) {
    return NextResponse.json(
      { error: 'JAMENDO_CLIENT_ID not configured' },
      { status: 500 }
    );
  }

  const { query } = await request.json();

  try {
    const searchParams = new URLSearchParams({
      client_id: JAMENDO_CLIENT_ID,
      format: 'json',
      limit: '5',
      search: query,
      include: 'musicinfo',
      audioformat: 'mp32',
    });

    const response = await fetch(`${JAMENDO_API_URL}?${searchParams.toString()}`);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Jamendo API error: ${await response.text()}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    const tracks = (data.results ?? []).map((item: JamendoTrackItem) => ({
      title: item.name,
      artist: item.artist_name,
      cover: item.album_image ?? item.image ?? '',
      previewUrl: item.audio,
      spotifyUrl: item.shareurl ?? item.shorturl ?? '#',
      genre: item.musicinfo?.tags?.[0] ?? 'Ambient',
    }));

    return NextResponse.json({ tracks });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

interface JamendoTrackItem {
  name: string;
  artist_name: string;
  album_image: string;
  image: string;
  audio: string;
  shareurl: string;
  shorturl: string;
  musicinfo?: {
    tags: string[];
  };
}
