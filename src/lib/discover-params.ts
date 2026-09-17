/* ── Discover query builder ────────────────────────────────────────────────
   The sanitizer chain behind every /discover call, extracted so the browse
   routes and the count routes build their queries from the same code.

   That shared-ness is not tidiness, it's correctness. A chart made of
   `total_results` counts is only honest if every bar was measured the same
   way — include_adult, region, and the vote floors all move the number, so a
   second copy of this logic that drifted by one default would silently
   produce a chart whose bars aren't comparable. One builder, one meaning. */

import {
  sanitizeCsvInts,
  sanitizeLanguage,
  sanitizeNumber,
  sanitizePage,
  sanitizeSort,
  sanitizeYear,
} from "@/lib/tmdb";
import { VALID_REGIONS } from "@/lib/geo";

/* Monetization types TMDB accepts. An allowlist rather than a passthrough,
   because an unrecognised value here doesn't error — TMDB ignores it, and
   the caller gets a plausible-looking count for the wrong question. */
const MONETIZATION = new Set(["flatrate", "free", "ads", "rent", "buy"]);

function sanitizeMonetization(value: string | null): string | null {
  if (!value) return null;
  const parts = value.split(",").map((part) => part.trim().toLowerCase()).filter(Boolean);
  if (!parts.length || parts.some((part) => !MONETIZATION.has(part))) return null;
  return parts.join(",");
}

function sanitizeOriginCountry(value: string | null): string | null {
  if (!value) return null;
  const upper = value.trim().toUpperCase();
  return VALID_REGIONS.has(upper) ? upper : null;
}

export function buildParams(searchParams: URLSearchParams, isMovie: boolean): Record<string, string> {
  const p: Record<string, string> = {
    sort_by: sanitizeSort(searchParams.get("sort_by")),
    page: sanitizePage(searchParams.get("page")),
  };

  if (!isMovie && p.sort_by.startsWith("primary_release_date.")) p.sort_by = p.sort_by.replace("primary_release_date.", "first_air_date.");

  const voteAvgGte = sanitizeNumber(searchParams.get("vote_average_gte"), 0, 10);
  const voteCountGte = sanitizeNumber(searchParams.get("vote_count_gte"), 0, 1000000);
  const language = sanitizeLanguage(searchParams.get("language"));
  const originCountry = sanitizeOriginCountry(searchParams.get("origin_country"));
  const withGenres = sanitizeCsvInts(searchParams.get("with_genres"));
  const withoutGenres = sanitizeCsvInts(searchParams.get("without_genres"));
  const withKeywords = sanitizeCsvInts(searchParams.get("with_keywords"));
  const withNetworks = sanitizeCsvInts(searchParams.get("with_networks"));
  const yearFrom = sanitizeYear(searchParams.get("year_from"));
  const yearTo = sanitizeYear(searchParams.get("year_to"));
  const includeAdult = searchParams.get("include_adult") === "true";
  /* Streaming availability and runtime. These matter most to the count
     routes — "how much of Netflix US is drama" is a filtered count, and
     dropping the provider silently turns it into "how much drama exists",
     which is off by two orders of magnitude and looks perfectly reasonable. */
  const watchProviders = sanitizeCsvInts(searchParams.get("with_watch_providers"));
  const watchRegion = sanitizeOriginCountry(searchParams.get("watch_region"));
  const monetization = sanitizeMonetization(searchParams.get("with_watch_monetization_types"));
  const runtimeGte = sanitizeNumber(searchParams.get("with_runtime_gte"), 0, 1000);
  const runtimeLte = sanitizeNumber(searchParams.get("with_runtime_lte"), 0, 1000);

  if (includeAdult) p.include_adult = "true";
  if (voteAvgGte) p["vote_average.gte"] = voteAvgGte;
  if (voteCountGte) p["vote_count.gte"] = voteCountGte;
  if (language) p.with_original_language = language;
  if (originCountry) p.with_origin_country = originCountry;
  if (withGenres) {
    // TMDB uses different IDs for the same broad genres in films and series.
    const equivalents: Record<string, string> = isMovie
      ? { "10759": "28|12", "10765": "878|14", "10768": "10752" }
      : { "28": "10759", "12": "10759", "878": "10765", "14": "10765", "10752": "10768" };
    p.with_genres = [...new Set(withGenres.split(",").map(id => equivalents[id] ?? id))].join(",");
  }
  if (withoutGenres) p.without_genres = withoutGenres;
  if (withKeywords) p.with_keywords = withKeywords;
  if (!isMovie && withNetworks) p.with_networks = withNetworks;
  if (watchProviders) p.with_watch_providers = watchProviders;
  /* TMDB ignores with_watch_providers unless a region scopes it, so the two
     travel together or not at all. */
  if (watchRegion && (watchProviders || monetization)) p.watch_region = watchRegion;
  if (monetization) p.with_watch_monetization_types = monetization;
  if (runtimeGte) p["with_runtime.gte"] = runtimeGte;
  if (runtimeLte) p["with_runtime.lte"] = runtimeLte;

  if (isMovie) {
    if (yearFrom) p["primary_release_date.gte"] = `${yearFrom}-01-01`;
    if (yearTo) p["primary_release_date.lte"] = `${yearTo}-12-31`;
  } else {
    if (yearFrom) p["first_air_date.gte"] = `${yearFrom}-01-01`;
    if (yearTo) p["first_air_date.lte"] = `${yearTo}-12-31`;
  }

  return p;
}

