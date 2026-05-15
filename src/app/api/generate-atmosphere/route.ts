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

  const { energy, environment, activity, emotion, locale } = await request.json();

  const isHighEnergy = energy > 65;
  const isLowEnergy = energy < 35;

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

  const energyDesc = isHighEnergy ? 'high energy' : isLowEnergy ? 'low energy' : 'moderate energy';
  const env = envLabels[environment]?.en ?? environment;
  const act = activityLabels[activity]?.en ?? activity;
  const emo = emotionLabels[emotion]?.en ?? emotion;

  const prompt = locale === 'zh'
    ? `请为一个 AI 音乐氛围应用生成一个氛围标题和一段描述。

当前状态：
- 环境：${envLabels[environment]?.zh ?? environment}
- 活动：${activityLabels[activity]?.zh ?? activity}
- 情绪：${emotionLabels[emotion]?.zh ?? emotion}
- 能量等级：${energy}%

要求：
1. 标题（title）：2-4 个中文词，诗意、电影感，不要直译英文。例如"雨滴节奏"、"城市呼吸"。
2. 描述（description）：一句话，50-80 字，描述这个氛围场景和适合的音乐风格。要有画面感。
3. 标签（tags）：3 个音乐风格标签，如"氛围电子"、"低保真"、"深层环境音"等。
4. BPM：根据能量等级推荐一个 BPM 数值（60-160）。

请严格按照以下 JSON 格式返回，不要有任何其他文字：
{"title":"...","description":"...","tags":["...","...","..."],"bpm":120}`
    : `Generate an atmospheric title and description for an AI music ambiance app.

Current state:
- Environment: ${env}
- Activity: ${act}
- Emotion: ${emo}
- Energy level: ${energy}%

Requirements:
1. Title: 2-4 words, poetic, cinematic. Examples: "Midnight Drift", "City Breath".
2. Description: One sentence, 80-120 characters, describing the scene and suitable music style. Evocative and visual.
3. Tags: 3 music genre tags like "Ambient Electronic", "Lo-fi", "Deep Ambient".
4. BPM: Suggest a BPM value (60-160) based on energy level.

Return ONLY the following JSON format, no other text:
{"title":"...","description":"...","tags":["...","...","..."],"bpm":120}`;

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
    return NextResponse.json({
      title: parsed.title ?? 'Untitled Atmosphere',
      description: parsed.description ?? '',
      tags: Array.isArray(parsed.tags) ? parsed.tags : ['Ambient'],
      bpm: typeof parsed.bpm === 'number' ? parsed.bpm : 100,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
