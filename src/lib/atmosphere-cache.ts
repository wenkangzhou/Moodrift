export interface AtmosphereData {
  title: string;
  description: string;
  tags: string[];
}

const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

export function atmosphereCacheKey(trackName: string, artist: string, locale: string) {
  return `moodrift-track-${trackName}-${artist}-${locale}`;
}

export function getCachedAtmosphere(
  trackName: string,
  artist: string,
  locale: string
): AtmosphereData | null {
  if (typeof window === 'undefined') return null;

  try {
    const key = atmosphereCacheKey(trackName, artist, locale);
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { data?: AtmosphereData; timestamp?: number };
    if (!parsed.data || !parsed.timestamp || Date.now() - parsed.timestamp > CACHE_TTL) {
      window.localStorage.removeItem(key);
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}

export function setCachedAtmosphere(
  trackName: string,
  artist: string,
  locale: string,
  data: AtmosphereData
) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      atmosphereCacheKey(trackName, artist, locale),
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {
    // Ignore private mode / quota errors.
  }
}
