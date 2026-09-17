import { CACHE, jsonErr, jsonFromError, jsonOk, tmdbFetch } from "@/lib/tmdb";
import { buildParams } from "@/lib/discover-params";

/* ── Discover count ────────────────────────────────────────────────────────
   The cheapest chart in the API: run a /discover query and return only
   `total_results`, throwing the page of results away.

   TMDB has no aggregation endpoint, but a filtered count is exactly what a
   bar chart needs — "how many horror films did the 80s produce", "how much
   of Netflix US is drama". One request per bar, and it's the same request
   the browse pages already make, so the counts agree with what a reader
   finds if they click through.

   Enumeration caps at 500 pages / 10k items, but `total_results` reports the
   true count past that, so aggregates stay correct where listings can't go.

   Params are whatever /api/getDiscover accepts, built by the same shared
   builder so every bar in one chart is measured identically. */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "movie";
  if (type !== "movie" && type !== "tv") return jsonErr("Invalid type param", 400);

  const isMovie = type === "movie";
  const params = buildParams(searchParams, isMovie);
  /* Page 1 is all we ever need — the count is in the envelope. */
  params.page = "1";

  try {
    const data = await tmdbFetch<{ total_results?: number }>(
      isMovie ? "/discover/movie" : "/discover/tv",
      params,
      { revalidate: CACHE.day },
    );

    return jsonOk({ count: data.total_results ?? 0 }, 200, {
      sMaxAge: CACHE.day,
      staleWhileRevalidate: 7 * CACHE.day,
    });
  } catch (e) {
    return jsonFromError(e);
  }
}
