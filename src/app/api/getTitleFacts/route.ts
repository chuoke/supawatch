import { CACHE, jsonErr, jsonFromError, jsonOk, sanitizeMediaRefs, tmdbFetch } from "@/lib/tmdb";
import { mapLimit } from "@/lib/fanout";

/* ── Title facts ───────────────────────────────────────────────────────────
   The bridge between a watch history and a stats page.

   History is stored on-device as little more than ids and timestamps — that
   keeps it small and keeps it the user's own data. But "your top genres",
   "hours watched", "which decade you live in" all need facts about those
   titles, and asking the client to fetch 400 of them is 400 round trips
   every visit.

   So: batch them here, at most 40 at a time, and cache each for a day. A
   library of 400 titles costs ten server requests once, shared across every
   visitor who watched any of the same things.

   The shape is deliberately narrow — the stats page needs genre, runtime,
   year, country and language, not an entire TMDB payload sitting in
   localStorage. */

type Facts = {
  ref: string;
  title: string;
  year: number | null;
  genres: number[];
  runtime: number | null;
  countries: string[];
  language: string | null;
  poster: string | null;
  vote: number | null;
};

type MovieDetail = {
  title?: string;
  release_date?: string;
  genres?: { id: number }[];
  runtime?: number;
  origin_country?: string[];
  production_countries?: { iso_3166_1: string }[];
  original_language?: string;
  poster_path?: string | null;
  vote_average?: number;
};

type TvDetail = Omit<MovieDetail, "title" | "release_date" | "runtime"> & {
  name?: string;
  first_air_date?: string;
  episode_run_time?: number[];
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const refs = sanitizeMediaRefs(searchParams.get("ids"));
  if (!refs) return jsonErr("Invalid ids param — expected up to 40 of movie:123 or tv:456", 400);

  try {
    const results = await mapLimit(refs, async (ref) => {
      const data = await tmdbFetch<MovieDetail & TvDetail>(
        `/${ref.type}/${ref.id}`,
        {},
        { revalidate: CACHE.day },
      );

      const date = ref.type === "movie" ? data.release_date : data.first_air_date;
      /* TV has no single runtime; episode_run_time is the per-episode figure,
         which is the right unit because history counts episodes. */
      const runtime =
        ref.type === "movie" ? data.runtime ?? null : data.episode_run_time?.[0] ?? null;

      const facts: Facts = {
        ref: `${ref.type}:${ref.id}`,
        title: (ref.type === "movie" ? data.title : data.name) ?? "Untitled",
        year: date ? Number(date.slice(0, 4)) || null : null,
        genres: (data.genres ?? []).map((g) => g.id),
        runtime,
        countries:
          data.origin_country?.length
            ? data.origin_country
            : (data.production_countries ?? []).map((c) => c.iso_3166_1),
        language: data.original_language ?? null,
        poster: data.poster_path ?? null,
        vote: typeof data.vote_average === "number" ? data.vote_average : null,
      };
      return facts;
    });

    /* Nulls are titles TMDB couldn't serve — dropped rather than faked, so
       the caller can tell "no data" from "zero". */
    if (results.every(result => result === null)) return jsonErr("Title facts couldn’t load. Please try again.", 503);
    const partial = results.some(result => result === null);
    return jsonOk({ facts: results.filter((f): f is Facts => f !== null), partial }, 200, {
      sMaxAge: partial ? 0 : CACHE.day,
      staleWhileRevalidate: 7 * CACHE.day,
    });
  } catch (e) {
    return jsonFromError(e);
  }
}
