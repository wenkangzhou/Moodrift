import { NextRequest, NextResponse } from 'next/server';

const MOONSHOT_API_KEY = process.env.MOONSHOT_API_KEY;
const MOONSHOT_API_URL = 'https://api.moonshot.cn/v1/chat/completions';

interface TrackRef {
  name: string;
  artist: string;
}

function buildSinglePrompt(trackName: string, artist: string, locale: string): string {
  return locale === 'zh'
    ? `你是一位音乐氛围诗人。请为下面这首歌创作一段氛围描述。\n\n歌曲：${trackName}\n艺术家：${artist}\n\n要求：\n1. 标题（title）：2-4 个中文词，诗意、有画面感，不要直接出现歌曲名。\n2. 描述（description）：一句话，40-60 字，描述听这首歌时的氛围、场景和情绪。要有沉浸感。\n3. 标签（tags）：3 个关键词标签，描述这首音乐的氛围特质，如"雨夜钢琴"、"城市霓虹"、"旷野微风"。\n\n请严格按照以下 JSON 格式返回，不要有任何其他文字：\n{"title":"...","description":"...","tags":["...","...","..."]}`
    : `You are a music atmosphere poet. Create an atmosphere description for the following song.\n\nSong: ${trackName}\nArtist: ${artist}\n\nRequirements:\n1. Title: 2-4 words, poetic, cinematic. Do not use the song title directly.\n2. Description: One sentence, 60-90 characters, describing the atmosphere, scene, and emotion of listening to this song. Immersive and evocative.\n3. Tags: 3 keyword tags describing the atmospheric quality of this music, e.g., "Rainy Night Piano", "Urban Neon", "Wilderness Breeze".\n\nReturn ONLY the following JSON format, no other text:\n{"title":"...","description":"...","tags":["...","...","..."]}`;
}

function buildBatchPrompt(tracks: TrackRef[], locale: string): string {
  const list = tracks.map((t, i) => `${i + 1}. ${locale === 'zh' ? `《${t.name}》- ${t.artist}` : `"${t.name}" by ${t.artist}`}`).join('\n');
  return locale === 'zh'
    ? `你是一位音乐氛围诗人。请为下面 ${tracks.length} 首歌各自创作独立的氛围描述。\n\n歌曲列表：\n${list}\n\n要求每首歌：\n1. 标题（title）：2-4 个中文词，诗意、有画面感，不要直接出现歌曲名。\n2. 描述（description）：一句话，40-60 字，描述听这首歌时的氛围、场景和情绪。\n3. 标签（tags）：3 个关键词标签。\n\n请严格按照以下 JSON 数组格式返回，顺序必须与上面歌曲列表完全一致，不要有任何其他文字：\n[{"title":"...","description":"...","tags":["...","...","..."]}, ...]`
    : `You are a music atmosphere poet. Create independent atmosphere descriptions for the following ${tracks.length} songs.\n\nSong list:\n${list}\n\nRequirements for each song:\n1. Title: 2-4 words, poetic, cinematic. Do not use the song title directly.\n2. Description: One sentence, 60-90 characters, describing the atmosphere, scene, and emotion.\n3. Tags: 3 keyword tags.\n\nReturn ONLY the following JSON array format, in the exact same order as the song list above, no other text:\n[{"title":"...","description":"...","tags":["...","...","..."]}, ...]`;
}

interface AtmosphereData {
  title: string;
  description: string;
  tags: string[];
}

async function callKimi(prompt: string, maxTokens: number): Promise<string> {
  const response = await fetch(MOONSHOT_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MOONSHOT_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'kimi-k2.5',
      messages: [
        {
          role: 'system',
          content:
            '你是一位国家级专业跨文化艺术评论家与音乐诗人。',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.6,
      max_tokens: maxTokens,
      thinking: { type: 'disabled' },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Kimi API error: ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

function sanitizeForJson(str: string): string {
  // Remove markdown code-block wrappers
  return str
    .replace(/^```json\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

function parseJsonFromContent(content: string): unknown {
  const raw = sanitizeForJson(content);

  // Try strict JSON parse first
  try {
    return JSON.parse(raw);
  } catch {
    // fallthrough
  }

  // Greedy regex fallback (from first { to last } / [ to last ])
  const objMatch = raw.match(/\{[\s\S]*\}/);
  const arrMatch = raw.match(/\[[\s\S]*\]/);
  if (arrMatch && objMatch) {
    const jsonStr = arrMatch[0].length >= objMatch[0].length ? arrMatch[0] : objMatch[0];
    try {
      return JSON.parse(jsonStr);
    } catch {
      // fallthrough
    }
  }
  if (arrMatch) {
    try {
      return JSON.parse(arrMatch[0]);
    } catch {
      // fallthrough
    }
  }
  if (objMatch) {
    try {
      return JSON.parse(objMatch[0]);
    } catch {
      // fallthrough
    }
  }

  throw new Error('No valid JSON found in response');
}

function normalizeAtmosphere(item: unknown): AtmosphereData {
  const obj = item as Record<string, unknown>;
  return {
    title: typeof obj.title === 'string' ? obj.title : 'Untitled',
    description: typeof obj.description === 'string' ? obj.description : '',
    tags: Array.isArray(obj.tags)
      ? obj.tags.filter((t): t is string => typeof t === 'string')
      : ['Ambient'],
  };
}

/** Extract balanced {} objects via a simple stack scanner. */
function extractJsonObjects(text: string): string[] {
  const objects: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escape = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        objects.push(text.slice(start, i + 1));
        start = -1;
      }
    }
  }
  return objects;
}

function parseBatchResponse(content: string, trackCount: number): AtmosphereData[] {
  const raw = sanitizeForJson(content);

  // Strategy 1: strict JSON array
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map(normalizeAtmosphere);
    }
  } catch {
    // fallthrough
  }

  // Strategy 2: greedy regex extraction
  try {
    const parsed = parseJsonFromContent(content);
    if (Array.isArray(parsed)) {
      return parsed.map(normalizeAtmosphere);
    }
  } catch {
    // fallthrough
  }

  // Strategy 3: extract individual JSON objects with a balanced-brace scanner
  const objects = extractJsonObjects(raw);
  const results: AtmosphereData[] = [];
  for (const objStr of objects) {
    try {
      const parsed = JSON.parse(objStr);
      if (typeof parsed === 'object' && parsed !== null) {
        results.push(normalizeAtmosphere(parsed));
      }
    } catch {
      // skip malformed fragment
    }
  }

  if (results.length < trackCount) {
    console.warn(
      `[generate-atmosphere] Parsed ${results.length}/${trackCount} items from Kimi. Falling back to defaults. Raw snippet:`,
      raw.slice(0, 200)
    );
  }

  while (results.length < trackCount) {
    results.push({ title: 'Untitled', description: '', tags: ['Ambient'] });
  }
  return results.slice(0, trackCount);
}

export async function POST(request: NextRequest) {
  if (!MOONSHOT_API_KEY) {
    return NextResponse.json(
      { error: 'MOONSHOT_API_KEY not configured' },
      { status: 500 }
    );
  }

  const body = await request.json();
  const { locale, tracks } = body;

  try {
    if (tracks && Array.isArray(tracks) && tracks.length > 0) {
      // Batch mode
      const prompt = buildBatchPrompt(tracks as TrackRef[], locale);
      const content = await callKimi(prompt, 16384);
      const results = parseBatchResponse(content, tracks.length);
      return NextResponse.json(results);
    }

    // Single mode
    const { trackName, artist } = body;
    if (!trackName || !artist) {
      return NextResponse.json(
        { error: 'Missing trackName/artist or tracks array' },
        { status: 400 }
      );
    }

    const prompt = buildSinglePrompt(trackName, artist, locale);
    const content = await callKimi(prompt, 8192);
    const parsed = parseJsonFromContent(content) as Record<string, unknown>;

    return NextResponse.json(normalizeAtmosphere(parsed));
  } catch (err) {
    console.error('[generate-atmosphere] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
