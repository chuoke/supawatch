import "server-only";
import { cache } from "react";
import { COLLECTIONS, selectTitles, type DiscoveryTitle } from "@/lib/discovery";
import { discoverySource } from "@/lib/discovery-source";
import { savedCollection } from "@/lib/discovery-fallback";

export const getCollection = cache(async (slug: string): Promise<DiscoveryTitle[]> => {
  const collection = COLLECTIONS.find(item => item.slug === slug);
  if (!collection) return [];
  const today = new Date().toISOString().slice(0, 10);
  const result = await discoverySource(collection.type, {
    include_adult: false, "vote_count.gte": 150, sort_by: "vote_average.desc", page: 1,
    [collection.type === "movie" ? "primary_release_date.lte" : "first_air_date.lte"]: today,
    ...collection.params,
  });
  return selectTitles([...result.items, ...savedCollection(slug)], 12, Math.floor(Date.now() / 86400000));
});
