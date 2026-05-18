import { NextRequest, NextResponse } from 'next/server';
import { playlistCatalog } from '@/lib/netease';

const MOONSHOT_API_KEY = process.env.MOONSHOT_API_KEY;
const MOONSHOT_API_URL = 'https://api.moonshot.cn/v1/chat/completions';

function buildCatalogText(): string {
  return Object.entries(playlistCatalog)
    .map(([id, desc]) => `- ${id}: ${desc}`)
    .join('\n');
}

export async function POST(request: NextRequest) {
  if (!MOONSHOT_API_KEY) {
    return NextResponse.json(
      { error: 'MOONSHOT_API_KEY not configured' },
      { status: 500 }
    );
  }

  const { energy, environment, activity, emotion, locale } = await request.json();

  const envLabels: Record<string, { zh: string; en: string }> = {
    rain: { zh: '雨天', en: 'rainy' },
    city: { zh: '城市', en: 'urban' },
    mountain: { zh: '山野', en: 'mountain' },
    night: { zh: '深夜', en: 'night' },
    sunset: { zh: '日落', en: 'sunset' },
  };

  const activityLabels: Record<string, { zh: string; en: string }> = {
    run: { zh: '奔跑', en: 'running' },
    walk: { zh: '漫步', en: 'walking' },
    focus: { zh: '专注', en: 'focusing' },
    work: { zh: '工作', en: 'working' },
    drive: { zh: '驾驶', en: 'driving' },
  };

  const emotionLabels: Record<string, { zh: string; en: string }> = {
    lonely: { zh: '孤独', en: 'lonely' },
    dreamy: { zh: '梦幻', en: 'dreamy' },
    happy: { zh: '愉悦', en: 'happy' },
    melancholy: { zh: '忧郁', en: 'melancholy' },
  };

  const env = envLabels[environment]?.en ?? environment;
  const act = activityLabels[activity]?.en ?? activity;
  const emo = emotionLabels[emotion]?.en ?? emotion;
  const catalog = buildCatalogText();

  const prompt = locale === 'zh'
    ? `你是一个音乐策展人。请根据用户当前状态，生成氛围描述并从可用歌单中选出最匹配的 1-3 个。

当前状态：
- 环境：${envLabels[environment]?.zh ?? environment}
- 活动：${activityLabels[activity]?.zh ?? activity}
- 情绪：${emotionLabels[emotion]?.zh ?? emotion}
- 能量等级：${energy}%

可用歌单：
${catalog}

要求：
1. 标题（title）：2-4 个中文词，诗意、电影感。
2. 描述（description）：一句话，50-80 字，描述这个氛围场景和适合的音乐风格。
3. 标签（tags）：3 个音乐风格标签。
4. BPM：根据能量等级推荐一个 BPM 数值（60-160）。
5. 推荐歌单（playlistIds）：从可用歌单中选出 1-3 个最匹配的 ID 数组。必须只返回数组中存在的数字 ID。

请严格按照以下 JSON 格式返回，不要有任何其他文字：
{"title":"...","description":"...","tags":["...","...","..."],"bpm":120,"playlistIds":[123456789]}`
    : `You are a music curator. Generate an atmosphere description and pick the best 1-3 playlists from the available catalog for the user's current mood.

Current state:
- Environment: ${env}
- Activity: ${act}
- Emotion: ${emo}
- Energy level: ${energy}%

Available playlists:
${catalog}

Requirements:
1. Title: 2-4 words, poetic, cinematic.
2. Description: One sentence, 80-120 characters, describing the scene and suitable music style.
3. Tags: 3 music genre tags.
4. BPM: Suggest a BPM value (60-160) based on energy level.
5. Recommended playlists (playlistIds): Pick 1-3 most suitable playlist IDs from the catalog. Must only return numeric IDs that exist in the catalog.

Return ONLY the following JSON format, no other text:
{"title":"...","description":"...","tags":["...","...","..."],"bpm":120,"playlistIds":[123456789]}`;

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
        temperature: 0.8,
        max_tokens: 512,
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

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: 'Failed to parse Kimi response', raw: content },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate playlistIds — filter out any IDs not in our catalog
    const rawIds = Array.isArray(parsed.playlistIds) ? parsed.playlistIds : [];
    const validIds = rawIds.filter(
      (id: unknown) => typeof id === 'number' && id in playlistCatalog
    );

    return NextResponse.json({
      title: parsed.title ?? 'Untitled Atmosphere',
      description: parsed.description ?? '',
      tags: Array.isArray(parsed.tags) ? parsed.tags : ['Ambient'],
      bpm: typeof parsed.bpm === 'number' ? parsed.bpm : 100,
      playlistIds: validIds.length > 0 ? validIds : undefined,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
