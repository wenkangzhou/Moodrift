export interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

export type ServerCache<T> = Map<string, CacheEntry<T>>;

export function getServerCache<T>(cache: ServerCache<T>, key: string) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

export function setServerCache<T>(
  cache: ServerCache<T>,
  key: string,
  value: T,
  ttlMs: number
) {
  cache.set(key, {
    expiresAt: Date.now() + ttlMs,
    value,
  });
}

export function stableKey(parts: Array<string | number | boolean | null | undefined>) {
  return parts
    .map((part) => String(part ?? ''))
    .join('|')
    .toLowerCase()
    .trim();
}
