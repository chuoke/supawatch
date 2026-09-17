import "server-only";
import { CACHE, tmdbFetch, type ParamValue } from "@/lib/tmdb";
import { normalizeTitle, titleKey, type DiscoveryTitle, type MediaKind } from "@/lib/discovery";

type Params = Record<string, ParamValue>;
/** A region is a preference here. Hard country/language themes remain scoped. */
export async function discoverySource(type: MediaKind, params: Params, region?: string | null) {
  let partial = false;
  const read = async (query: Params): Promise<DiscoveryTitle[]> => {
    try {
      const data = await tmdbFetch<{ results?: Record<string, unknown>[] }>(`/discover/${type}`, query, { revalidate: CACHE.hour });
      return (data.results ?? []).flatMap(raw => {
        const item = normalizeTitle({ ...raw, ...(query.with_origin_country ? { origin_country: [query.with_origin_country] } : {}) }, type);
        return item && item.overview && item.vote_count >= 25 ? [item] : [];
      });
    } catch { partial = true; return []; }
  };
  const scoped = !!params.with_origin_country || !!params.with_original_language || !!params.watch_region;
  const regionalParams = { ...params, with_origin_country: region, "vote_count.gte": 25 };
  const [global, local] = await Promise.all([read(params), region && !scoped ? read(regionalParams) : Promise.resolve([])]);
  let items = [...local, ...global];
  // Start at the first page if a rotated page is sparse; reduce only the implicit vote floor.
  if (!partial && (items.length < 12 || (region && !scoped && local.length < 6))) {
    const [more, regional] = await Promise.all([
      items.length < 12 ? read({ ...params, page: 1, "vote_count.gte": 25 }) : Promise.resolve([]),
      region && !scoped && local.length < 6 ? read({ ...regionalParams, page: 1 }) : Promise.resolve([]),
    ]);
    items = [...local, ...regional, ...global, ...more];
  }
  const unique = new Map<string, DiscoveryTitle>();
  for (const item of items) {
    const previous = unique.get(titleKey(item));
    unique.set(titleKey(item), { ...item, origin_country: [...new Set([...(previous?.origin_country ?? []), ...(item.origin_country ?? [])])] });
  }
  return { items: [...unique.values()], partial };
}
