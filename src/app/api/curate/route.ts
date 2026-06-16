import { NextRequest, NextResponse } from 'next/server';
import { playlistCatalog } from '@/lib/netease';
import { getServerCache, setServerCache, stableKey, type ServerCache } from '@/lib/server-cache';

const MOONSHOT_API_KEY = process.env.MOONSHOT_API_KEY;
const MOONSHOT_API_URL = 'https://api.moonshot.cn/v1/chat/completions';
const CURATE_CACHE_TTL = 24 * 60 * 60 * 1000;
const KIMI_TIMEOUT_MS = 12_000;
const MAX_BODY_SIZE = 256 * 1024; // 256 KB

interface CurateResponse {
  playlistIds: number[];
  title: string;
  description: string;
}

const curateCache: ServerCache<CurateResponse> = new Map();

function buildCatalogText(): string {
  return Object.entries(playlistCatalog)
    .map(([id, desc]) => `${id}: ${desc}`)
    .join('\n');
}

function sanitizeString(value: unknown, maxLen: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  return trimmed.slice(0, maxLen);
}

function validateCurateBody(body: unknown) {
  if (!body || typeof body !== 'object') {
    return { error: 'Invalid JSON body' } as const;
  }

  const raw = body as Record<string, unknown>;
  const locale = raw.locale === 'en' ? 'en' : 'zh';
  const environment = sanitizeString(raw.environment, 40);
  const activity = sanitizeString(raw.activity, 40);
  const emotion = sanitizeString(raw.emotion, 40);

  let energy = 50;
  if (raw.energy !== undefined) {
    if (typeof raw.energy !== 'number' || !Number.isFinite(raw.energy)) {
      return { error: 'energy must be a number' } as const;
    }
    energy = Math.max(0, Math.min(100, Math.round(raw.energy)));
  }

  return { locale, environment, activity, emotion, energy };
}

export async function POST(request: NextRequest) {
  if (!MOONSHOT_API_KEY) {
    return NextResponse.json(
      { error: 'MOONSHOT_API_KEY not configured' },
      { status: 500 }
    );
  }

  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validation = validateCurateBody(body);
  if ('error' in validation) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { locale, environment, activity, emotion, energy } = validation;
  const cacheKey = stableKey(['curate', locale, environment, activity, emotion, energy]);
  const cached = getServerCache(curateCache, cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { 'x-moodrift-cache': 'hit' },
    });
  }

  const catalog = buildCatalogText();
  const validIds = Object.keys(playlistCatalog).map(Number);

  const prompt =
    locale === 'zh'
      ? `你是一位专业音乐策展人。以下是我们曲库中的歌单目录：

${catalog}

当前用户的心情状态：
- 环境：${environment ?? '未指定'}
- 活动：${activity ?? '未指定'}
- 情绪：${emotion ?? '未指定'}
- 能量值：${energy}/100

请从目录中挑选 1-3 个最适合当前心情的歌单，返回它们的 ID。
同时为这个心情组合起一个诗意的标题（2-4 个中文词）和一句简短的氛围描述（20-40 字）。

请严格按照以下 JSON 格式返回，不要有任何其他文字：
{"playlistIds":[...],"title":"...","description":"..."}`
      : `You are a professional music curator. Here is our playlist catalog:

${catalog}

The user's current mood state:
- Environment: ${environment ?? 'unspecified'}
- Activity: ${activity ?? 'unspecified'}
- Emotion: ${emotion ?? 'unspecified'}
- Energy: ${energy}/100

Please pick 1-3 playlists that best match this mood and return their IDs.
Also give this mood combination a poetic title (2-4 words) and a short atmosphere description (30-60 chars).

Return ONLY the following JSON format, no other text:
{"playlistIds":[...],"title":"...","description":"..."}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), KIMI_TIMEOUT_MS);
    const response = await fetch(MOONSHOT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${MOONSHOT_API_KEY}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'kimi-k2.5',
        messages: [
          {
            role: 'system',
            content:
              locale === 'zh'
                ? '你是一位国家级专业音乐策展人，擅长根据心情状态精准匹配音乐歌单。'
                : 'You are an expert music curator who precisely matches playlists to mood states.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.6,
        max_tokens: 4096,
        thinking: { type: 'disabled' },
      }),
    }).finally(() => clearTimeout(timeoutId));

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('[curate] Kimi API error:', response.status, errorText.slice(0, 500));
      return NextResponse.json(
        { error: 'AI service unavailable' },
        { status: 502 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? '';

    // Robust JSON parsing: strip markdown, try multiple strategies
    const raw = content
      .replace(/^```json\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    let parsed: Record<string, unknown> | null = null;

    // Strategy 1: strict parse
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      // Strategy 2: greedy regex
      const greedy = raw.match(/\{[\s\S]*\}/);
      if (greedy) {
        try {
          parsed = JSON.parse(greedy[0]) as Record<string, unknown>;
        } catch {
          /* fallthrough */
        }
      }
    }

    if (!parsed) {
      console.warn('[curate] Failed to parse Kimi response, using defaults. Raw:', raw.slice(0, 200));
      const fallback: CurateResponse = {
        playlistIds: [],
        title: '',
        description: '',
      };
      setServerCache(curateCache, cacheKey, fallback, CURATE_CACHE_TTL);
      return NextResponse.json(fallback);
    }

    const rawIds = Array.isArray(parsed.playlistIds) ? parsed.playlistIds : [];
    const playlistIds = rawIds
      .map((id: unknown) => (typeof id === 'string' ? parseInt(id, 10) : Number(id)))
      .filter((id: number) => validIds.includes(id));

    const result: CurateResponse = {
      playlistIds,
      title: typeof parsed.title === 'string' ? parsed.title : '',
      description: typeof parsed.description === 'string' ? parsed.description : '',
    };
    setServerCache(curateCache, cacheKey, result, CURATE_CACHE_TTL);
    return NextResponse.json(result, {
      headers: { 'x-moodrift-cache': 'miss' },
    });
  } catch (err) {
    console.error('[curate] Error:', err);
    return NextResponse.json(
      { error: 'Failed to curate playlists' },
      { status: 500 }
    );
  }
}
