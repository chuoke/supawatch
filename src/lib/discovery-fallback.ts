import snapshot from "@/lib/discovery-snapshot.json";
import { fillLane, matchesFeedFilters, titleKey, type DiscoveryTitle, type FeedResponse } from "@/lib/discovery";

export function savedCollection(slug: string): DiscoveryTitle[] {
  return (snapshot.selections as Record<string, DiscoveryTitle[]>)[slug] ?? [];
}
export function fallbackFeed(params = new URLSearchParams()): FeedResponse {
  const pool = [...new Map(Object.values(snapshot.selections).flat().map(item => [titleKey(item as DiscoveryTitle), item as DiscoveryTitle])).values()];
  const matching = pool.filter(item => matchesFeedFilters(item, params));
  // Explicitly label wider suggestions; never pretend they matched a restrictive query.
  const format = params.get("format");
  const wider = pool.filter(item => !["movie", "tv"].includes(format ?? "") || item.media_type === format);
  const items = fillLane(matching.length ? matching : wider, 12, Math.floor(Date.now() / 86400000), new Set(), params.get("region"));
  return { lanes: [{ id: "saved-picks", title: matching.length ? "More to explore." : "Try one of these.", kicker: "Saved picks", description: matching.length ? "Picks from our saved selection. Ratings may have changed." : "No exact matches in this selection. These suggestions keep your chosen format and broaden the other filters.", items }], edition: snapshot.updated, partial: true, notice: "Showing saved picks while the live selection is unavailable or has no matches." };
}
