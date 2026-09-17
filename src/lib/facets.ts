/* ── Facet counts ──────────────────────────────────────────────────────────
   Chart data built from /discover's `total_results`. Each bar is one filtered
   count, so a chart of eight bars is eight cheap requests, cached for a day.

   Every facet in one chart varies exactly one dimension and shares the rest
   of its query, because counts from differently-shaped filters aren't
   comparable — see src/lib/discover-params.ts. */

import { CACHE, tmdbFetch, type ParamValue } from "@/lib/tmdb";
import { mapLimit } from "@/lib/fanout";

/* `count: null` means the lookup failed, which is deliberately not the same
   as zero. A failed bar rendered as 0 is an assertion that the catalogue
   holds nothing in that band — far worse than admitting we don't know. */
export type Facet = { key: string; label: string; count: number | null; href?: string };

/* A vote floor keeps these counts about films people have actually seen.
   Without it "the 1970s" is mostly uncatalogued shorts and the shape of the
   chart is noise. */
export const CHART_VOTE_FLOOR = 100;

export async function countDiscover(
  type: "movie" | "tv",
  params: Record<string, ParamValue>,
  attempts = 3,
): Promise<number> {
  let lastError: unknown;

  /* A chart is many small requests at once, which is exactly the shape that
     trips transient TLS and connection resets. One retry pass turns a
     scattering of holes in the chart into no holes at all. */
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const data = await tmdbFetch<{ total_results?: number }>(
        type === "movie" ? "/discover/movie" : "/discover/tv",
        { ...params, page: 1 },
        { revalidate: CACHE.day },
      );
      return data.total_results ?? 0;
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      }
    }
  }

  throw lastError;
}

/**
 * Run one count per variant. A variant that fails every retry comes back as
 * null and renders as "no data" — the chart survives with a gap, which is
 * honest, rather than with a zero, which isn't.
 */
export async function countFacets(
  type: "movie" | "tv",
  base: Record<string, ParamValue>,
  variants: { key: string; label: string; params: Record<string, ParamValue> }[],
): Promise<Facet[]> {
  const counts = await mapLimit(
    variants,
    async (variant) => countDiscover(type, { ...base, ...variant.params }),
    4,
  );
  return variants.map((variant, i) => ({
    key: variant.key,
    label: variant.label,
    count: counts[i],
  }));
}

export const DECADES = [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];

export function decadeVariants(type: "movie" | "tv") {
  const field = type === "movie" ? "primary_release_date" : "first_air_date";
  return DECADES.map((decade) => ({
    key: String(decade),
    label: `${decade}s`,
    params: {
      [`${field}.gte`]: `${decade}-01-01`,
      [`${field}.lte`]: `${decade + 9}-12-31`,
    },
  }));
}

/* Buckets chosen so each holds a recognisable kind of film rather than an
   even slice of the axis: the short one, the standard one, the long one. */
export const RUNTIME_BUCKETS = [
  { key: "0", label: "Under 90m", gte: 1, lte: 89 },
  { key: "90", label: "90–104m", gte: 90, lte: 104 },
  { key: "105", label: "105–119m", gte: 105, lte: 119 },
  { key: "120", label: "120–149m", gte: 120, lte: 149 },
  { key: "150", label: "150m +", gte: 150, lte: 400 },
];

export function runtimeVariants() {
  return RUNTIME_BUCKETS.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    params: { "with_runtime.gte": bucket.gte, "with_runtime.lte": bucket.lte },
  }));
}

/* The languages that actually produce volume. A sweep over all 180-odd
   returns a long tail of zeroes and costs 180 requests to say nothing. */
export const CHART_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ja", label: "Japanese" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
  { code: "ko", label: "Korean" },
  { code: "hi", label: "Hindi" },
  { code: "de", label: "German" },
  { code: "it", label: "Italian" },
  { code: "zh", label: "Chinese" },
  { code: "pt", label: "Portuguese" },
];

export function languageVariants() {
  return CHART_LANGUAGES.map((language) => ({
    key: language.code,
    label: language.label,
    params: { with_original_language: language.code },
  }));
}

/* Provider ids are allowlisted so nobody can turn this into an arbitrary
   fan-out by editing a query string. */
export const CHART_PROVIDERS = [
  { id: 8, label: "Netflix" },
  { id: 9, label: "Prime Video" },
  { id: 337, label: "Disney+" },
  { id: 1899, label: "HBO Max" },
  { id: 15, label: "Hulu" },
  { id: 350, label: "Apple TV+" },
];
