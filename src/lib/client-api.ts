type CacheEntry<T> = {
  expiresAt: number;
  promise: Promise<T>;
};

const jsonCache = new Map<string, CacheEntry<unknown>>();
const MAX_ENTRIES = 200;
const DEFAULT_TTL_MS = 5 * 60 * 1000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchJson<T = any>(
  url: string,
  options: { ttlMs?: number; signal?: AbortSignal } = {},
): Promise<T> {
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const now = Date.now();
  const parsed = new URL(url, "http://cache.local");
  parsed.searchParams.sort();
  const key = url.startsWith("/") ? `${parsed.pathname}${parsed.search}` : parsed.toString();

  if (!options.signal && ttlMs > 0) {
    const cached = jsonCache.get(key) as CacheEntry<T> | undefined;
    if (cached && cached.expiresAt > now) {
      jsonCache.delete(key);
      jsonCache.set(key, cached);
      return cached.promise;
    }
    if (cached) jsonCache.delete(key);
  }

  const promise = fetch(url, {
    headers: { accept: "application/json" },
    signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000),
  }).then(async (response) => {
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error ?? `Request failed: ${response.status}`);
    }
    if (payload === null) throw new Error("The server returned an invalid response.");
    const entry = jsonCache.get(key);
    if (entry?.promise === promise) {
      if (response.headers?.get("Cache-Control")?.includes("no-store") || payload.partial === true) jsonCache.delete(key);
      else entry.expiresAt = Date.now() + ttlMs;
    }
    return payload as T;
  });

  if (!options.signal && ttlMs > 0) {
    for (const [cachedKey, entry] of jsonCache) {
      if (entry.expiresAt <= now) jsonCache.delete(cachedKey);
    }
    while (jsonCache.size >= MAX_ENTRIES) jsonCache.delete(jsonCache.keys().next().value!);
    jsonCache.set(key, { expiresAt: now + ttlMs, promise });
    promise.catch(() => {
      // An older failed request must not evict a newer request for this URL.
      if (jsonCache.get(key)?.promise === promise) jsonCache.delete(key);
    });
  }

  return promise;
}

export function clearJsonCache(url?: string) {
  if (url) {
    const parsed = new URL(url, "http://cache.local");
    parsed.searchParams.sort();
    jsonCache.delete(url.startsWith("/") ? `${parsed.pathname}${parsed.search}` : parsed.toString());
  }
  else jsonCache.clear();
}
