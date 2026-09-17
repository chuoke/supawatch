export type MediaKind = "movie" | "tv";
export type DiscoveryTitle = {
  id: number;
  media_type: MediaKind;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  genre_ids: number[];
  vote_average: number;
  vote_count: number;
  original_language: string;
  origin_country?: string[];
  date: string;
};

export const titleKey = (item: Pick<DiscoveryTitle, "id" | "media_type">) => `${item.media_type}-${item.id}`;

export const MOODS = [
  { id: "open", label: "Open to anything", movie: "", tv: "" },
  { id: "escape", label: "Take me somewhere", movie: "12|14|878", tv: "10765|10759" },
  { id: "edge", label: "Keep me guessing", movie: "53|9648|80", tv: "9648|80" },
  { id: "comfort", label: "Something lighter", movie: "35|10749", tv: "35" },
  { id: "real", label: "Make it real", movie: "99", tv: "99" },
] as const;
export type Mood = typeof MOODS[number]["id"];
export function getMood(id: string | null) { return MOODS.find(m => m.id === id) ?? MOODS[0]; }

export type Collection = {
  slug: string;
  title: string;
  kicker: string;
  description: string;
  type: MediaKind;
  params: Record<string, string | number>;
};

export const COLLECTIONS: Collection[] = [
  { slug: "after-hours", title: "After hours.", kicker: "Crime / Suspense", description: "Crime thrillers about risky choices, investigations, and lives on the line.", type: "movie", params: { with_genres: "80,53", "vote_average.gte": 7 } },
  { slug: "beautifully-strange", title: "Beautifully strange.", kicker: "Science fiction / Mystery", description: "Science fiction and mystery films with unusual worlds and questions to unravel.", type: "movie", params: { with_genres: "878,9648", "vote_average.gte": 6.5 } },
  { slug: "short-and-sweet", title: "Small running time.\nBig impression.", kicker: "Under 105 minutes", description: "Feature films between 70 and 105 minutes, for an evening with less time to spare.", type: "movie", params: { "with_runtime.gte": 70, "with_runtime.lte": 105, "vote_average.gte": 7 } },
  { slug: "seoul", title: "Seoul searching.", kicker: "Korean cinema", description: "Korean-language films spanning drama, romance, and suspense.", type: "movie", params: { with_original_language: "ko", "vote_average.gte": 7 } },
  { slug: "sunday-kind-of-love", title: "A Sunday kind\nof love.", kicker: "Comedy / Romance", description: "Romantic comedies about falling in love and finding your way back to each other.", type: "movie", params: { with_genres: "35,10749", "vote_average.gte": 6.5 } },
  { slug: "one-more-episode", title: "Just one\nmore episode.", kicker: "Series worth staying in for", description: "Highly rated dramas, crime series, and mysteries to watch over a few evenings.", type: "tv", params: { with_genres: "18|80|9648", "vote_average.gte": 7.8, "vote_count.gte": 500 } },
  { slug: "rewind", title: "Be kind.\nRewind.", kicker: "1970–1999", description: "Films released between 1970 and 1999, from familiar favourites to older discoveries.", type: "movie", params: { "primary_release_date.gte": "1970-01-01", "primary_release_date.lte": "1999-12-31", "vote_average.gte": 7.2 } },
  { slug: "drawn-to-it", title: "Drawn to it.", kicker: "Animation without limits", description: "Animated films in a range of styles, for grown-ups and families alike.", type: "movie", params: { with_genres: "16", "vote_average.gte": 7.2 } },
  {"slug": "crime-and-consequences", "title": "Crime and consequences", "kicker": "Crime films", "description": "Criminal lives, investigations, and the people caught in between.", "type": "movie", "params": {"with_genres": "80", "vote_average.gte": 6.5}},
  {"slug": "under-pressure", "title": "Under pressure", "kicker": "Drama / Thriller", "description": "Ordinary lives take a turn in these tense dramas.", "type": "movie", "params": {"with_genres": "18,53", "vote_average.gte": 7}},
  {"slug": "japanese-cinema", "title": "A trip to Japan", "kicker": "Japanese cinema", "description": "Family dramas, quiet romances, and big adventures from Japan.", "type": "movie", "params": {"with_original_language": "ja", "vote_average.gte": 7}},
  {"slug": "indian-stories", "title": "Across India", "kicker": "Indian cinema", "description": "Films from across India, in Hindi, Tamil, Telugu, Malayalam, and more.", "type": "movie", "params": {"with_origin_country": "IN", "vote_average.gte": 7}},
  {"slug": "slow-sundays", "title": "An easy Sunday", "kicker": "Comedy / Family", "description": "Warm comedies and family stories for an afternoon at home.", "type": "movie", "params": {"with_genres": "35,10751", "vote_average.gte": 6.5}},
  {"slug": "out-there", "title": "Science fiction worlds", "kicker": "Science fiction", "description": "Possible futures, strange technology, and worlds unlike our own.", "type": "movie", "params": {"with_genres": "878", "vote_average.gte": 6.5}},
  {"slug": "documentary-nights", "title": "Real lives, up close", "kicker": "Documentaries", "description": "People, places, and events seen through a documentary lens.", "type": "movie", "params": {"with_genres": "99", "vote_average.gte": 7}},
  {"slug": "mystery-series", "title": "A case to solve", "kicker": "Crime / Mystery series", "description": "Detectives, missing people, and clues that take a season to piece together.", "type": "tv", "params": {"with_genres": "80,9648", "vote_average.gte": 7.5}},
  {"slug": "comedy-series", "title": "A few good laughs", "kicker": "Comedy series", "description": "A familiar cast and another episode when you need a break.", "type": "tv", "params": {"with_genres": "35", "vote_average.gte": 7.5}},
  {"slug": "korean-series", "title": "Series from Korea", "kicker": "Korean series", "description": "Romance, crime, and family stories from South Korea.", "type": "tv", "params": {"with_original_language": "ko", "vote_average.gte": 7.5}},
  {"slug": "history-on-screen", "title": "Another time", "kicker": "History / Drama", "description": "Historical dramas about the lives behind the dates.", "type": "movie", "params": {"with_genres": "36,18", "vote_average.gte": 7}},
  {"slug": "musical-evenings", "title": "Turn it up", "kicker": "Music on film", "description": "Performances, musicians, and stories where music takes the lead.", "type": "movie", "params": {"with_genres": "10402", "vote_average.gte": 7}},

];

/** Normalize upstream data at the boundary; reject people, adult titles and
 * incomplete records instead of leaking them into discovery surfaces. */
export function normalizeTitle(raw: Record<string, unknown>, fallback: MediaKind = "movie"): DiscoveryTitle | null {
  const media_type = raw.media_type ?? fallback;
  if ((media_type !== "movie" && media_type !== "tv") || raw.adult === true || !Number.isInteger(raw.id) || Number(raw.id) <= 0) return null;
  const title = typeof raw.title === "string" ? raw.title : typeof raw.name === "string" ? raw.name : "";
  const path = (v: unknown) => typeof v === "string" && v.startsWith("/") ? v : null;
  if (!title || !path(raw.poster_path)) return null;
  return {
    id: Number(raw.id), media_type, title,
    poster_path: path(raw.poster_path), backdrop_path: path(raw.backdrop_path),
    overview: typeof raw.overview === "string" ? raw.overview : "",
    genre_ids: Array.isArray(raw.genre_ids) ? raw.genre_ids.filter((n): n is number => Number.isInteger(n)) : [],
    vote_average: typeof raw.vote_average === "number" ? raw.vote_average : 0,
    vote_count: typeof raw.vote_count === "number" ? raw.vote_count : 0,
    origin_country: Array.isArray(raw.origin_country) ? raw.origin_country.filter((v): v is string => typeof v === "string") : [],
    original_language: typeof raw.original_language === "string" ? raw.original_language : "",
    date: typeof raw.date === "string" ? raw.date : String(raw.release_date ?? raw.first_air_date ?? ""),
  };
}

function noise(key: string, seed: number) {
  let hash = seed | 0;
  for (const character of key) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return (hash >>> 0) / 4294967296;
}

/** Confidence-adjusted ratings plus a small seeded rotation; greedy diversity
 * reduces repeated genres/languages without discarding the quality signal. */
export function selectTitles(items: DiscoveryTitle[], count: number, seed: number, exclude = new Set<string>()): DiscoveryTitle[] {
  const unique = new Map(items.map(item => [titleKey(item), item]));
  const pool = [...unique.values()].filter(item => !exclude.has(titleKey(item)) && item.overview && item.vote_count >= 25);
  const chosen: DiscoveryTitle[] = [];
  const genreCounts = new Map<number, number>();
  const languageCounts = new Map<string, number>();
  while (chosen.length < count && pool.length) {
    const score = (item: DiscoveryTitle) => {
      const confidence = item.vote_count / (item.vote_count + 250);
      const quality = confidence * item.vote_average + (1 - confidence) * 6.6;
      const repeatedGenre = Math.max(0, ...item.genre_ids.map(id => genreCounts.get(id) ?? 0));
      return quality + noise(titleKey(item), seed) * 1.3 - repeatedGenre * 0.2 - (languageCounts.get(item.original_language) ?? 0) * 0.12;
    };
    pool.sort((a, b) => score(b) - score(a));
    const next = pool.shift()!;
    chosen.push(next);
    for (const id of next.genre_ids) genreCounts.set(id, (genreCounts.get(id) ?? 0) + 1);
    languageCounts.set(next.original_language, (languageCounts.get(next.original_language) ?? 0) + 1);
  }
  return chosen;
}

export type FeedLane = { id: string; title: string; kicker?: string; description: string; items: DiscoveryTitle[] };
export type FeedResponse = { lanes: FeedLane[]; edition: string; partial: boolean; notice?: string };

/** Match explicit discovery choices before ranking or showing alternatives. */
export function matchesFeedFilters(item: DiscoveryTitle, params: URLSearchParams): boolean {
  const format = params.get("format");
  if ((format === "movie" || format === "tv") && item.media_type !== format) return false;
  const year = Number(item.date.slice(0, 4));
  if (params.get("period") === "classics" && (!year || year >= 2000)) return false;
  if (params.get("period") === "recent" && (!year || year < new Date().getUTCFullYear() - 4)) return false;
  if (item.vote_average < Number(params.get("rating") || 0)) return false;
  const mood = getMood(params.get("mood"));
  const genres = mood[item.media_type].split("|").filter(Boolean).map(Number);
  return !genres.length || genres.some(id => item.genre_ids.includes(id));
}

/** Deduplicate within shelves; reuse across shelves only when otherwise empty. */
export function fillLane(pool: DiscoveryTitle[], count: number, seed: number, used: Set<string>, region?: string | null) {
  const rank = (items: DiscoveryTitle[], exclude: Set<string>) => {
    const local = region ? selectTitles(items.filter(item => item.origin_country?.includes(region)), Math.ceil(count * .67), seed, exclude) : [];
    return [...local, ...selectTitles(items, count - local.length, seed, new Set([...exclude, ...local.map(titleKey)]))];
  };
  const fresh = rank(pool, used);
  const items = fresh.length ? fresh : rank(pool, new Set());
  items.forEach(item => used.add(titleKey(item)));
  return items;
}
