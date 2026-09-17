import { CACHE, jsonErr, jsonFromError, jsonOk, sanitizePage, tmdbFetch } from "@/lib/tmdb";
import { matchesSearchFilters } from "@/lib/search-filters";

type Page = { results?: Record<string, unknown>[]; total_pages?: number };
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim();
  if (!query) return jsonErr("Missing query param", 400);
  if (query.length > 100) return jsonErr("Query is too long", 400);
  const type = searchParams.get("type") ?? "all";
  if (!["all", "movie", "tv"].includes(type)) return jsonErr("Invalid type param", 400);
  const page = Number(sanitizePage(searchParams.get("page")));
  const filtered = ["with_genres", "year_from", "year_to", "vote_average_gte", "language"].some(key => searchParams.has(key));
  // A bounded batch searches beyond an empty first page without an unbounded fan-out.
  const batch = filtered ? 3 : 1;
  const first = (page - 1) * batch + 1;
  if (first > 500) return jsonOk({ data: { results: [], page, total_pages: page } });
  try {
    const read = (upstreamPage: number) => tmdbFetch<Page>(`/search/${type === "all" ? "multi" : type}`, { query, page: upstreamPage, include_adult: searchParams.get("include_adult") === "true" }, { revalidate: CACHE.fiveMinutes });
    const head = await read(first);
    const last = Math.min(500, head.total_pages ?? 1);
    const pages = await Promise.all(Array.from({ length: Math.max(0, Math.min(batch - 1, last - first)) }, (_, i) => read(first + i + 1)));
    const results = [head, ...pages].flatMap(data => (data.results ?? []).map(item => type === "all" ? item : { ...item, media_type: type })).filter(item => matchesSearchFilters(item, searchParams));
    return jsonOk({ data: { results, page, total_pages: Math.ceil(last / batch) } }, 200, { sMaxAge: CACHE.fiveMinutes });
  } catch (error) { return jsonFromError(error); }
}
