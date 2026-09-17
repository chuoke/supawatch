/* ── TMDB image URLs ───────────────────────────────────────────────────────
   The CDN base and its size vocabulary, in one place. Before this the
   `https://image.tmdb.org/t/p/w342${path}` template was hand-written in
   ~40 spots, which meant a size choice was a search-and-replace and a typo
   was a broken image nobody noticed.

   Sizes are TMDB's, not arbitrary — the CDN only serves these exact widths
   and silently 404s on anything else, so they're typed rather than a
   free-form string. */

const BASE = "https://image.tmdb.org/t/p";

export const POSTER_SIZES = ["w92", "w154", "w185", "w342", "w500", "w780", "original"] as const;
export const BACKDROP_SIZES = ["w300", "w780", "w1280", "original"] as const;
export const PROFILE_SIZES = ["w45", "w185", "h632", "original"] as const;
export const STILL_SIZES = ["w92", "w185", "w300", "original"] as const;
export const LOGO_SIZES = ["w45", "w92", "w154", "w185", "w300", "w500", "original"] as const;

export type TmdbImageSize =
  | (typeof POSTER_SIZES)[number]
  | (typeof BACKDROP_SIZES)[number]
  | (typeof PROFILE_SIZES)[number]
  | (typeof LOGO_SIZES)[number];

/**
 * Absolute URL for a TMDB image path, or null when there's no artwork —
 * callers branch on null rather than rendering a broken `/t/p/w342null`.
 */
export function tmdbImage(
  path: string | null | undefined,
  size: TmdbImageSize = "w342",
): string | null {
  if (!path) return null;
  return `${BASE}/${size}${path.startsWith("/") ? path : `/${path}`}`;
}
