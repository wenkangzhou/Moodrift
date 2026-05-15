export interface Track {
  title: string;
  artist: string;
  genre: string;
  cover: string;
}

export interface MoodPreset {
  title: string;
  description: string;
  bpm: number;
  tags: string[];
  tracks: Track[];
  orbColor: string;
  orbSecondary: string;
  bgGradient: string;
}

const coverPool = [
  'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1514525253440-b393452e8d26?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1525201548942-d8732f6617a0?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?w=300&h=300&fit=crop',
];

function pickCovers(seed: number, count = 5) {
  const picks: string[] = [];
  for (let i = 0; i < count; i++) {
    picks.push(coverPool[(seed + i * 7) % coverPool.length]);
  }
  return picks;
}

function hashString(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function generateMockMood(
  energy: number,
  environment: string,
  activity: string,
  emotion: string,
  locale: string
): MoodPreset {
  const key = `${energy}-${environment}-${activity}-${emotion}-${locale}`;
  const seed = hashString(key);

  const envLabels: Record<string, { zh: string; en: string }> = {
    rain: { zh: '雨天', en: 'Rain' },
    city: { zh: '城市', en: 'City' },
    mountain: { zh: '山野', en: 'Mountain' },
    night: { zh: '深夜', en: 'Night' },
    sunset: { zh: '日落', en: 'Sunset' },
  };

  const activityLabels: Record<string, { zh: string; en: string }> = {
    run: { zh: '奔跑', en: 'Run' },
    walk: { zh: '漫步', en: 'Walk' },
    focus: { zh: '专注', en: 'Focus' },
    work: { zh: '工作', en: 'Work' },
    drive: { zh: '驾驶', en: 'Drive' },
  };

  const emotionLabels: Record<string, { zh: string; en: string }> = {
    lonely: { zh: '孤独', en: 'Lonely' },
    dreamy: { zh: '梦幻', en: 'Dreamy' },
    happy: { zh: '愉悦', en: 'Happy' },
    melancholy: { zh: '忧郁', en: 'Melancholy' },
  };

  const envName = envLabels[environment]?.[locale as 'zh' | 'en'] ?? environment;
  const actName = activityLabels[activity]?.[locale as 'zh' | 'en'] ?? activity;
  const emoName = emotionLabels[emotion]?.[locale as 'zh' | 'en'] ?? emotion;

  const isHighEnergy = energy > 65;
  const isLowEnergy = energy < 35;

  const title = locale === 'zh'
    ? `${envName}${isHighEnergy ? '奔流' : isLowEnergy ? '静息' : '漫步'}`
    : `${envName} ${isHighEnergy ? 'Surge' : isLowEnergy ? 'Stillness' : 'Drift'}`;

  const descriptions: Record<string, string> = {
    'zh-rain-run': '雨滴击打在柏油路面上，电子节拍伴随你的步伐在城市中穿行。',
    'zh-rain-focus': '窗外细雨绵绵，柔和的合成器音色助你进入深度专注。',
    'zh-city-walk': '霓虹灯倒映在湿润的人行道上， lo-fi 节拍和都市夜风交织。',
    'zh-mountain-drive': '蜿蜒山路上，辽阔的氛围电子乐与引擎的低鸣融为一体。',
    'zh-night-dreamy': '深蓝色的夜空下，ambient textures 缓缓展开一场梦境漫游。',
    'zh-sunset-melancholy': '夕阳沉入地平线，温暖的钢琴与弦乐勾勒出淡淡的忧伤。',
    'en-rain-run': 'Raindrops on asphalt, electronic beats sync with your stride through the city.',
    'en-rain-focus': 'Soft rain outside the window. Gentle synth pads carry you into deep focus.',
    'en-city-walk': 'Neon reflections on wet pavement. Lo-fi beats blend with the urban breeze.',
    'en-mountain-drive': 'Winding mountain roads. Expansive ambient electronics merge with engine hum.',
    'en-night-dreamy': 'Under a deep navy sky, ambient textures unfold a dreamy drift.',
    'en-sunset-melancholy': 'Sunset sinks below the horizon. Warm piano and strings trace a quiet sorrow.',
  };

  const descKey = `${locale}-${environment}-${activity}`;
  const fallbackKey = `${locale}-${environment}-${emotion}`;
  const description = descriptions[descKey] ?? descriptions[fallbackKey]
    ?? (locale === 'zh' ? '一种专属于你的氛围正在生成...' : 'An atmosphere unique to you is forming...');

  const bpm = isHighEnergy ? 120 + (seed % 40) : isLowEnergy ? 60 + (seed % 20) : 85 + (seed % 30);

  const tagPool = locale === 'zh'
    ? ['低保真', '氛围电子', '深层环境音', '低语人声', '钢琴', '弦乐', '合成器', '田野录音']
    : ['Lo-fi', 'Ambient Electronic', 'Deep Ambient', 'Vocal Layers', 'Piano', 'Strings', 'Synth', 'Field Recording'];
  const tags = [
    tagPool[seed % tagPool.length],
    tagPool[(seed + 3) % tagPool.length],
    tagPool[(seed + 5) % tagPool.length],
  ];

  const artists = locale === 'zh'
    ? ['夜雨声烦', '浮光', '星尘漫游', '深蓝梦境', '城市底噪']
    : ['Nebula Drift', 'Quiet Hours', 'Midnight Static', 'Soft Echo', 'Urban Flora'];

  const titles = locale === 'zh'
    ? ['雨滴节奏', '城市呼吸', '远山回响', '夜空飞行', '迷雾中']
    : ['Drop Rhythm', 'City Breath', 'Distant Echo', 'Night Flight', 'Into the Mist'];

  const tracks: Track[] = pickCovers(seed, 5).map((cover, i) => ({
    title: titles[(seed + i * 2) % titles.length] + (i > 0 ? ` ${i + 1}` : ''),
    artist: artists[(seed + i * 3) % artists.length],
    genre: tags[i % tags.length],
    cover,
  }));

  const colorMap: Record<string, { primary: string; secondary: string; gradient: string }> = {
    rain: { primary: '#7DD3FC', secondary: '#A78BFA', gradient: 'from-[#0B1020] via-[#111827] to-[#1E3A5F]' },
    city: { primary: '#F9A8D4', secondary: '#7DD3FC', gradient: 'from-[#0B1020] via-[#1E1B2E] to-[#2D1B4E]' },
    mountain: { primary: '#A78BFA', secondary: '#94A3B8', gradient: 'from-[#0B1020] via-[#111827] to-[#1E293B]' },
    night: { primary: '#7DD3FC', secondary: '#A78BFA', gradient: 'from-[#0B1020] via-[#0F172A] to-[#1E1B2E]' },
    sunset: { primary: '#F9A8D4', secondary: '#A78BFA', gradient: 'from-[#1E1B2E] via-[#2D1B4E] to-[#4C1D3D]' },
  };

  const colors = colorMap[environment] ?? colorMap.night;

  return {
    title,
    description,
    bpm,
    tags,
    tracks,
    orbColor: colors.primary,
    orbSecondary: colors.secondary,
    bgGradient: colors.gradient,
  };
}
