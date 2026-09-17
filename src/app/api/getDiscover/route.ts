import {
  CACHE,
  jsonErr,
  jsonFromError,
  jsonOk,
  tmdbFetch,
} from "@/lib/tmdb";
import { buildParams } from "@/lib/discover-params";

type DiscoverPage = { results?: AnyObj[]; page?: number; total_pages?: number; total_results?: number };

type AnyObj = { popularity?: number } & Record<string, unknown>;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "movie";
  if (!["movie", "tv", "mixed"].includes(type)) return jsonErr("Invalid type param", 400);

  try {
    if (type === "mixed") {
      const pages = await Promise.allSettled([
        tmdbFetch<DiscoverPage>("/discover/movie", buildParams(searchParams, true), { revalidate: CACHE.hour }),
        tmdbFetch<DiscoverPage>("/discover/tv", buildParams(searchParams, false), { revalidate: CACHE.hour }),
      ]);
      if (pages.every(page => page.status === "rejected")) return jsonErr("Discovery couldn’t load. Please try again.", 503);
      const partial = pages.some(page => page.status === "rejected");
      const [movieData, tvData] = pages.map(page => page.status === "fulfilled" ? page.value : {} as DiscoverPage);

      const movies = (movieData.results ?? []).map((m) => ({ ...m, media_type: "movie" }));
      const tv = (tvData.results ?? []).map((t) => ({ ...t, media_type: "tv" }));
      const sort = buildParams(searchParams, true).sort_by ?? "popularity.desc";
      const field = sort.split(".")[0];
      const direction = sort.endsWith(".asc") ? 1 : -1;
      const value = (item: AnyObj): number => field.includes("date")
        ? Date.parse(String(item.release_date || item.first_air_date || "1900-01-01")) || 0
        : Number(item[field]) || 0;
      const sorted = [...movies, ...tv].sort((a, b) => direction * (value(a) - value(b)));

      return jsonOk({ partial, results: sorted, page: movieData.page ?? tvData.page ?? 1, total_pages: Math.max(movieData.total_pages ?? 0, tvData.total_pages ?? 0), total_results: (movieData.total_results ?? 0) + (tvData.total_results ?? 0) }, 200, { sMaxAge: partial ? 0 : CACHE.hour, staleWhileRevalidate: CACHE.day });
    }

    const endpoint = type === "tv" ? "/discover/tv" : "/discover/movie";
    const data = await tmdbFetch<{ results?: AnyObj[]; page?: number; total_pages?: number; total_results?: number }>(endpoint, buildParams(searchParams, type === "movie"), { revalidate: CACHE.hour });
    return jsonOk({ results: (data.results ?? []).map(item => ({ ...item, media_type: type })), page: data.page, total_pages: data.total_pages, total_results: data.total_results }, 200, { sMaxAge: CACHE.hour, staleWhileRevalidate: CACHE.day });
  } catch (e) {
    return jsonFromError(e);
  }
}
