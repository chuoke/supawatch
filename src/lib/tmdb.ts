const TMDB_BASE = "https://api.themoviedb.org/3";
// Keep credentials in the server transport. The legacy name remains supported
// so existing deployments can migrate without an outage.
const TMDB_KEY = (process.env.TMDB_READ_ACCESS_TOKEN ?? process.env.TMDB_API_KEY ?? process.env.NEXT_PUBLIC_TMDB_API_KEY)?.trim();
const inFlight = new Map<string, Promise<unknown>>();
const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const MAX_PENDING = 100;
const MAX_CONCURRENT = 8;
let active = 0;
const waiting: (() => void)[] = [];

async function withSlot<T>(work: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) await new Promise<void>(resolve => waiting.push(resolve));
  else active++;
  try { return await work(); }
  finally {
    const next = waiting.shift();
    if (next) next();
    else active--;
  }
}

function retryDelay(value: string | null): number {
  if (!value) return 300 + Math.random() * 200;
  const seconds = Number(value);
  return Math.max(0, Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - Date.now()) || 500;
}

export const CACHE = {
  minute: 60,
  fiveMinutes: 300,
  fifteenMinutes: 900,
  hour: 3600,
  day: 86400,
} as const;

export type ParamValue = string | number | boolean | null | undefined;

export class TmdbError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "TmdbError";
    this.status = status;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function tmdbFetch<T = any>(
  endpoint: string,
  params: Record<string, ParamValue> = {},
  cache: { revalidate?: number } = { revalidate: CACHE.hour },
): Promise<T> {
  if (!TMDB_KEY) throw new TmdbError(500, "TMDB API key not configured");
  if (!/^\/[a-zA-Z0-9_/-]+$/.test(endpoint) || endpoint.includes("..")) {
    throw new TmdbError(500, "Invalid TMDB endpoint");
  }

  const url = new URL(`${TMDB_BASE}${endpoint}`);
  url.searchParams.set("language", "en-US");
  Object.entries(params).forEach(([key, value]) => {
    /* null drops the param entirely — the only way to shed the en-US default
       above, which /images treats as a language filter. undefined and "" stay
       "leave it alone". */
    if (value === null) {
      url.searchParams.delete(key);
    } else if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const headers: Record<string, string> = { accept: "application/json" };
  if (/^[a-f0-9]{32}$/i.test(TMDB_KEY)) url.searchParams.set("api_key", TMDB_KEY);
  else headers.Authorization = `Bearer ${TMDB_KEY}`;
  url.searchParams.sort();
  const revalidate = cache.revalidate ?? CACHE.hour;
  const key = `${revalidate}:${url}`;
  const pending = inFlight.get(key);
  if (pending) return pending as Promise<T>;
  if (inFlight.size >= MAX_PENDING) throw new TmdbError(503, "Catalogue is busy. Please try again.");

  const promise = withSlot(async () => {
    // At most two attempts; do not hammer missing titles or invalid credentials.
    for (let attempt = 0; attempt < 2; attempt++) {
      let delay = 400;
      try {
        const res = await fetch(url.toString(), {
          headers,
          next: { revalidate },
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) return await res.json() as T;
        delay = retryDelay(res.headers.get("Retry-After"));
        await res.body?.cancel();
        const error = new TmdbError(res.status, res.status === 404
          ? "Title not found."
          : "Catalogue is temporarily unavailable. Please try again.");
        if (!RETRYABLE.has(res.status) || attempt === 1 || delay > 2000) throw error;
      } catch (error) {
        if (error instanceof TmdbError) throw error;
        if (attempt === 1) {
          throw new TmdbError(error instanceof Error && error.name === "TimeoutError" ? 504 : 502,
            "Catalogue could not be reached. Please try again.");
        }
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    throw new TmdbError(502, "Catalogue could not be reached.");
  });
  inFlight.set(key, promise);
  try { return await promise; }
  finally { if (inFlight.get(key) === promise) inFlight.delete(key); }

}

export function jsonOk(
  data: unknown,
  status = 200,
  cache: { sMaxAge?: number; staleWhileRevalidate?: number } = {},
) {
  const sMaxAge = cache.sMaxAge ?? CACHE.hour;
  const stale = cache.staleWhileRevalidate ?? CACHE.day;

  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": sMaxAge > 0 ? `public, max-age=0, s-maxage=${sMaxAge}, stale-while-revalidate=${stale}` : "no-store",
    },
  });
}

export function jsonErr(msg: string, status = 500) {
  return Response.json(
    { error: msg },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

export function jsonFromError(error: unknown) {
  if (error instanceof TmdbError) {
    const status = error.status === 404 || error.status === 400 ? error.status
      : error.status === 429 || error.status === 503 ? 503
      : error.status === 504 ? 504 : 502;
    return jsonErr(error.message, status);
  }
  return jsonErr("Unexpected server error. Please try again.");
}

export function requirePositiveInt(value: string | null, name: string): string | Response {
  const trimmed = value?.trim() ?? "";
  if (!/^[1-9]\d{0,9}$/.test(trimmed)) return jsonErr(`Invalid ${name}`, 400);
  return trimmed;
}

export function sanitizePage(value: string | null): string {
  const page = Number(value ?? "1");
  if (!Number.isInteger(page) || page < 1) return "1";
  return String(Math.min(page, 500));
}

export function sanitizeYear(value: string | null): string | null {
  if (!value || !/^\d{4}$/.test(value)) return null;
  const year = Number(value);
  if (year < 1870 || year > new Date().getFullYear() + 5) return null;
  return value;
}

export function sanitizeNumber(value: string | null, min = 0, max = 100000): string | null {
  if (!value || !/^\d+(\.\d+)?$/.test(value)) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return value;
}

export function sanitizeCsvInts(value: string | null): string | null {
  if (!value) return null;
  const normalized = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!normalized.length || normalized.some((part) => !/^\d{1,10}$/.test(part))) return null;
  return normalized.join(",");
}

export function sanitizeLanguage(value: string | null): string | null {
  if (!value) return null;
  const lang = value.trim().toLowerCase();
  return /^[a-z]{2,3}$/.test(lang) ? lang : null;
}

const SORT_ALLOWLIST = new Set([
  "popularity.asc",
  "popularity.desc",
  "primary_release_date.asc",
  "primary_release_date.desc",
  "release_date.asc",
  "release_date.desc",
  "first_air_date.asc",
  "first_air_date.desc",
  "vote_average.asc",
  "vote_average.desc",
  "vote_count.asc",
  "vote_count.desc",
  "revenue.asc",
  "revenue.desc",
]);

export function sanitizeSort(value: string | null, fallback = "popularity.desc"): string {
  return value && SORT_ALLOWLIST.has(value) ? value : fallback;
}

/**
 * Parse a "movie:27205,tv:1396" batch reference list.
 *
 * The stats page hydrates a whole watch library at once, so it needs to ask
 * for many titles in one request. Capped hard: an uncapped batch is a way to
 * turn one inbound request into a thousand outbound ones.
 */
export function sanitizeMediaRefs(
  value: string | null,
  max = 40,
): { type: "movie" | "tv"; id: string }[] | null {
  if (!value) return null;

  const parts = value.split(",").map((part) => part.trim()).filter(Boolean);
  if (!parts.length || parts.length > max) return null;

  const refs: { type: "movie" | "tv"; id: string }[] = [];
  const seen = new Set<string>();

  for (const part of parts) {
    const match = /^(movie|tv):([1-9]\d{0,9})$/.exec(part);
    if (!match) return null;
    if (seen.has(part)) continue;
    seen.add(part);
    refs.push({ type: match[1] as "movie" | "tv", id: match[2] });
  }

  return refs.length ? refs : null;
}
