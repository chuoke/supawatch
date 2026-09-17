import type { MetadataRoute } from "next";
import { CACHE, tmdbFetch } from "@/lib/tmdb";
import { COLLECTIONS } from "@/lib/discovery";

export const revalidate = 86400;

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://supawatch.vercel.app";

type ListResult = { results?: { id: number }[] };

/* Collect ids from a set of TMDB lists, two pages each — enough to put the
   catalog's most-visited detail pages in front of crawlers without an
   unbounded sitemap. Failures fall back to whatever resolved. */
async function collectIds(endpoints: string[]): Promise<number[]> {
  const pages = endpoints.flatMap((endpoint) =>
    [1, 2].map((page) =>
      tmdbFetch<ListResult>(endpoint, { page }, { revalidate: CACHE.day }).catch(
        () => null,
      ),
    ),
  );
  const responses = await Promise.all(pages);
  const ids = new Set<number>();
  for (const res of responses) {
    for (const item of res?.results ?? []) {
      if (Number.isSafeInteger(item.id) && item.id > 0) ids.add(item.id);
    }
  }
  return [...ids];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {

  const staticEntries: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/films`, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/series`, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/charts`, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/live`, changeFrequency: "weekly", priority: 0.7 },
  ];

  const [movieIds, tvIds] = await Promise.all([
    collectIds(["/movie/popular", "/movie/top_rated", "/movie/now_playing"]),
    collectIds(["/tv/popular", "/tv/top_rated", "/tv/on_the_air"]),
  ]);

  const movieEntries: MetadataRoute.Sitemap = movieIds.map((id) => ({
    url: `${baseUrl}/films/${id}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const tvEntries: MetadataRoute.Sitemap = tvIds.map((id) => ({
    url: `${baseUrl}/series/${id}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const collections: MetadataRoute.Sitemap = ["", ...COLLECTIONS.map(collection => `/${collection.slug}`)].map(path => ({ url: `${baseUrl}/collections${path}`, changeFrequency: "weekly", priority: 0.8 }));
  return [...staticEntries, ...collections, ...movieEntries, ...tvEntries];
}
