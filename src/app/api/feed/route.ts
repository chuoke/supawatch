import { jsonOk } from "@/lib/tmdb";
import { getMood, fillLane, matchesFeedFilters, titleKey, type FeedLane, type MediaKind } from "@/lib/discovery";
import { discoverySource } from "@/lib/discovery-source";
import { resolveRegionOrNull } from "@/lib/geo";
import { fallbackFeed, savedCollection } from "@/lib/discovery-fallback";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const mood = getMood(params.get("mood"));
  const region = resolveRegionOrNull(params.get("region"));
  const refresh = Math.min(19, Math.max(0, Math.trunc(Number(params.get("edition")) || 0)));
  const day = Math.floor(Date.now() / 86400000);
  const date = new Date().toISOString().slice(0, 10);
  const year = new Date().getUTCFullYear();
  const format = params.get("format");
  const period = params.get("period");
  const rating = ["7", "8"].includes(params.get("rating") ?? "") ? Number(params.get("rating")) : 6.5;
  const regionName = region ? new Intl.DisplayNames(["en"], { type: "region" }).of(region) ?? region : "";
  const kinds: MediaKind[] = format === "movie" || format === "tv" ? [format] : ["movie", "tv"];
  const definitions = [
    { id: "shortlist", title: "Start here.", kicker: "Where to begin", description: region ? `A mix of titles from ${regionName} and around the world.` : "Films and series to start with.", kinds, extra: {} },
    { id: "less-obvious", title: "Quietly brilliant.", kicker: "Under the radar", description: "Well-rated stories with a smaller audience.", kinds, extra: { "vote_count.lte": 2500, sort_by: "vote_average.desc" } },
    { id: "short-night", title: "Home before midnight.", kicker: "Under 105 minutes", description: "A film for when you have a little less time.", kinds: kinds.filter(k => k === "movie"), extra: { "with_runtime.gte": 60, "with_runtime.lte": 105 } },
    { id: "acclaimed-series", title: "Clear the weekend.", kicker: "Rated 8 and up", description: "Series with an audience rating of 8 or higher.", kinds: kinds.filter(k => k === "tv"), extra: { "vote_average.gte": 8, sort_by: "vote_average.desc" } },
    { id: "era", title: period === "classics" ? "Before the millennium." : "Hot off the reel.", kicker: period === "classics" ? "1970 – 1999" : "The last five years", description: period === "classics" ? "Older favourites and a few you may have missed." : "Stories first released in the last five years.", kinds, extra: {} },
    ...(region ? [{ id: "local", title: `Made in ${regionName}.`, kicker: "Close to home", description: "Films and series made in your chosen region.", kinds, extra: { with_origin_country: region } }] : []),
  ];
  const results = await Promise.all(definitions.map(async definition => {
    const sources = await Promise.all(definition.kinds.map(type => {
      const prefix = type === "movie" ? "primary_release_date" : "first_air_date";
      return discoverySource(type, {
        include_adult: false, page: 1 + (day + refresh) % 3,
        "vote_count.gte": 100, sort_by: "popularity.desc", with_genres: mood[type],
        ...(type === "tv" ? { without_genres: "10763,10764,10767" } : {}),
        ...definition.extra, "vote_average.gte": Math.max(rating, Number(definition.extra["vote_average.gte"]) || 0),
        [`${prefix}.lte`]: period === "classics" ? "1999-12-31" : date,
        ...((period === "recent" || (definition.id === "era" && period !== "classics")) ? { [`${prefix}.gte`]: `${year - 4}-01-01` } : {}),
      }, region);
    }));
    return { ...definition, items: sources.flatMap(source => source.items).filter(item => matchesFeedFilters(item, params)), partial: sources.some(source => source.partial) };
  }));
  const used = new Set<string>();
  const lanes: FeedLane[] = results.flatMap(result => {
    const items = fillLane(result.items, 6, day + refresh * 7919, used, region);
    return items.length ? [{ id: result.id, title: result.title, kicker: result.kicker, description: result.description, items }] : [];
  });
  let partial = results.some(result => result.partial);
  let notice: string | undefined;
  if (!lanes.length) {
    const fallback = fallbackFeed(params);
    lanes.push(...fallback.lanes);
    fallback.lanes.flatMap(lane => lane.items).forEach(item => used.add(titleKey(item)));
    partial = true;
    notice = fallback.notice;
  }
  // Build extra shelves from existing pools and verified saved collections.
  // No extra upstream requests, and every item still passes the active filters.
  const livePool = results.flatMap(result => result.items);
  const liveKeys = new Set(livePool.map(titleKey));
  const themes = [
    { id: "comedy", title: "Nothing too heavy.", kicker: "Comedy", description: "Comedies and familiar faces for an easy evening.", genre: 35, collections: ["sunday-kind-of-love", "comedy-series"] },
    { id: "mystery", title: "Follow the clues.", kicker: "Mystery", description: "Clues, suspects, and questions worth sticking with.", genre: 9648, collections: ["beautifully-strange", "mystery-series"] },
    { id: "animation", title: "Drawn from scratch.", kicker: "Animation", description: "Animated films and series in all kinds of styles.", genre: 16, collections: ["drawn-to-it"] },
    { id: "documentaries", title: "All of it true.", kicker: "Documentary", description: "Documentaries about people, places, and the world around us.", genre: 99, collections: ["documentary-nights"] },
  ];
  for (const theme of themes) {
    const pool = [...livePool, ...theme.collections.flatMap(savedCollection)].filter(item => item.genre_ids.includes(theme.genre) && matchesFeedFilters(item, params));
    const items = fillLane(pool, 6, day + refresh * 7919, used, region);
    if (!items.length) continue;
    const includesSaved = items.some(item => !liveKeys.has(titleKey(item)));
    lanes.push({ id: theme.id, title: theme.title, kicker: theme.kicker, description: theme.description + (includesSaved ? " Includes saved picks; ratings may have changed." : ""), items });
  }
  return jsonOk({ lanes, edition: date, partial, notice: notice ?? (partial ? "Some picks couldn’t refresh. Here’s what’s available." : undefined) }, 200, { sMaxAge: partial ? 0 : 3600 });
}
