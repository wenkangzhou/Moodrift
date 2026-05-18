import { NextRequest, NextResponse } from 'next/server';

const MOONSHOT_API_KEY = process.env.MOONSHOT_API_KEY;
const MOONSHOT_API_URL = 'https://api.moonshot.cn/v1/chat/completions';

export async function POST(request: NextRequest) {
  if (!MOONSHOT_API_KEY) {
    return NextResponse.json(
      { error: 'MOONSHOT_API_KEY not configured' },
      { status: 500 }
    );
  }

  const { trackName, artist, locale } = await request.json();

  const prompt = locale === 'zh'
    ? `你是一位音乐氛围诗人。请为下面这首歌创作一段氛围描述。

歌曲：${trackName}
艺术家：${artist}

要求：
1. 标题（title）：2-4 个中文词，诗意、有画面感，不要直接出现歌曲名。
2. 描述（description）：一句话，40-60 字，描述听这首歌时的氛围、场景和情绪。要有沉浸感。
3. 标签（tags）：3 个关键词标签，描述这首音乐的氛围特质，如"雨夜钢琴"、"城市霓虹"、"旷野微风"。

请严格按照以下 JSON 格式返回，不要有任何其他文字：
{"title":"...","description":"...","tags":["...","...","..."]}`
    : `You are a music atmosphere poet. Create an atmosphere description for the following song.

Song: ${trackName}
Artist: ${artist}

Requirements:
1. Title: 2-4 words, poetic, cinematic. Do not use the song title directly.
2. Description: One sentence, 60-90 characters, describing the atmosphere, scene, and emotion of listening to this song. Immersive and evocative.
3. Tags: 3 keyword tags describing the atmospheric quality of this music, e.g., "Rainy Night Piano", "Urban Neon", "Wilderness Breeze".

Return ONLY the following JSON format, no other text:
{"title":"...","description":"...","tags":["...","...","..."]}`;

  try {
    const response = await fetch(MOONSHOT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MOONSHOT_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'moonshot-v1-8k',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        max_tokens: 256,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `Kimi API error: ${error}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? '';

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: 'Failed to parse Kimi response', raw: content },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json({
      title: parsed.title ?? 'Untitled',
      description: parsed.description ?? '',
      tags: Array.isArray(parsed.tags) ? parsed.tags : ['Ambient'],
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
