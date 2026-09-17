/* ── Stats derivation ──────────────────────────────────────────────────────
   Turns a raw watch log plus TMDB facts into the numbers the stats page
   shows. Pure functions over plain data — no storage, no fetching — so the
   figures can be checked against the same history from a script.

   One rule runs through all of it: never report a number the data doesn't
   support. Runtime is what the user *opened*, not what a player measured, so
   it's labelled as such. Titles seeded from the old taste store are marked
   and excluded from watch counts. Where a fact is missing it's dropped, not
   defaulted to zero — a missing runtime must not read as a zero-minute film. */

import type { WatchEvent } from "@/lib/history";
import { dayKey, daysBetween, localHour, localWeekday } from "@/lib/dates";

export type TitleFacts = {
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

export type FactsMap = Record<string, TitleFacts>;

export const factsKey = (event: WatchEvent) => `${event.t}:${event.id}`;

/** Real observed plays. Seeded rows are history's best guess, not a watch. */
export function realPlays(events: WatchEvent[]): WatchEvent[] {
  return events.filter((event) => event.s !== 1);
}

export type Totals = {
  plays: number;
  titles: number;
  movies: number;
  episodes: number;
  /* Minutes of runtime opened. Deliberately not called "watched" — see the
     note this feeds on the stats page. */
  minutes: number;
  /* How much of `minutes` we actually know: a library with no runtime facts
     yet would otherwise report a confident zero. */
  minutesKnownFor: number;
  firstAt: number | null;
  lastAt: number | null;
};

export function totals(events: WatchEvent[], facts: FactsMap): Totals {
  const plays = realPlays(events);
  const titles = new Set<string>();
  let movies = 0;
  let episodes = 0;
  let minutes = 0;
  let known = 0;

  for (const event of plays) {
    titles.add(factsKey(event));
    if (event.t === "movie") movies++;
    else episodes++;

    const runtime = event.r ?? facts[factsKey(event)]?.runtime ?? null;
    if (runtime && runtime > 0) {
      minutes += runtime;
      known++;
    }
  }

  return {
    plays: plays.length,
    titles: titles.size,
    movies,
    episodes,
    minutes,
    minutesKnownFor: known,
    firstAt: plays.length ? plays[0].ts : null,
    lastAt: plays.length ? plays[plays.length - 1].ts : null,
  };
}

/** Counts per local hour, 0–23. The viewing clock. */
export function byHour(events: WatchEvent[]): number[] {
  const out = new Array(24).fill(0);
  for (const event of realPlays(events)) out[localHour(event.ts)]++;
  return out;
}

/** Counts per local weekday, 0 = Sunday. */
export function byWeekday(events: WatchEvent[]): number[] {
  const out = new Array(7).fill(0);
  for (const event of realPlays(events)) out[localWeekday(event.ts)]++;
  return out;
}

/** Every year that has at least one play, newest first. */
export function activeYears(events: WatchEvent[]): number[] {
  const years = new Set<number>();
  for (const event of realPlays(events)) years.add(new Date(event.ts).getFullYear());
  return [...years].sort((a, b) => b - a);
}

type Tally = { key: string; count: number };

function tally(map: Map<string, number>): Tally[] {
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Genre counts. Seeded rows are included here on purpose: they came from
 * real browsing and their genres are honest even though the *play* isn't, and
 * a returning user's taste picture shouldn't be blank on day one.
 */
export function byGenre(events: WatchEvent[], facts: FactsMap): Tally[] {
  const counts = new Map<string, number>();
  for (const event of events) {
    const genres = facts[factsKey(event)]?.genres ?? event.g ?? [];
    for (const id of genres) counts.set(String(id), (counts.get(String(id)) ?? 0) + 1);
  }
  return tally(counts);
}

export function byDecade(events: WatchEvent[], facts: FactsMap): Tally[] {
  const counts = new Map<string, number>();
  for (const event of realPlays(events)) {
    const year = facts[factsKey(event)]?.year;
    if (!year) continue;
    const decade = Math.floor(year / 10) * 10;
    counts.set(String(decade), (counts.get(String(decade)) ?? 0) + 1);
  }
  return tally(counts).sort((a, b) => Number(a.key) - Number(b.key));
}

export function byCountry(events: WatchEvent[], facts: FactsMap): Tally[] {
  const counts = new Map<string, number>();
  for (const event of realPlays(events)) {
    for (const code of facts[factsKey(event)]?.countries ?? []) {
      counts.set(code, (counts.get(code) ?? 0) + 1);
    }
  }
  return tally(counts);
}

export function byLanguage(events: WatchEvent[], facts: FactsMap): Tally[] {
  const counts = new Map<string, number>();
  for (const event of realPlays(events)) {
    const language = facts[factsKey(event)]?.language;
    if (language) counts.set(language, (counts.get(language) ?? 0) + 1);
  }
  return tally(counts);
}

export type Rewatch = {
  ref: string;
  title: string;
  plays: number;
  poster: string | null;
  lastAt: number;
};

/**
 * Titles played more than once. For TV this counts *distinct episodes*
 * rewatched rather than episodes watched — otherwise every long-running show
 * would top the list simply for being long.
 */
export function rewatches(events: WatchEvent[], facts: FactsMap): Rewatch[] {
  const seen = new Map<string, Map<string, number>>();
  const meta = new Map<string, { title: string; poster: string | null; lastAt: number }>();

  for (const event of realPlays(events)) {
    const ref = factsKey(event);
    const slot = `${event.sn ?? ""}-${event.ep ?? ""}`;
    if (!seen.has(ref)) seen.set(ref, new Map());
    const inner = seen.get(ref)!;
    inner.set(slot, (inner.get(slot) ?? 0) + 1);

    meta.set(ref, {
      title: facts[ref]?.title ?? event.n ?? "Untitled",
      poster: facts[ref]?.poster ?? event.p ?? null,
      lastAt: event.ts,
    });
  }

  const out: Rewatch[] = [];
  for (const [ref, slots] of seen) {
    const repeats = [...slots.values()].reduce((sum, n) => sum + Math.max(0, n - 1), 0);
    if (repeats <= 0) continue;
    const info = meta.get(ref)!;
    out.push({ ref, title: info.title, plays: repeats + 1, poster: info.poster, lastAt: info.lastAt });
  }

  return out.sort((a, b) => b.plays - a.plays);
}

export type Streak = { length: number; from: number; to: number };

/** Longest run of consecutive local days with at least one play. */
export function longestStreak(events: WatchEvent[]): Streak | null {
  const days = [...new Set(realPlays(events).map((event) => dayKey(event.ts)))].sort();
  if (days.length === 0) return null;

  const asTime = (key: string) => {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d).getTime();
  };

  let best: Streak = { length: 1, from: asTime(days[0]), to: asTime(days[0]) };
  let runStart = asTime(days[0]);
  let runLength = 1;

  for (let i = 1; i < days.length; i++) {
    const prev = asTime(days[i - 1]);
    const cur = asTime(days[i]);
    if (daysBetween(prev, cur) === 1) {
      runLength++;
    } else {
      runStart = cur;
      runLength = 1;
    }
    if (runLength > best.length) best = { length: runLength, from: runStart, to: cur };
  }

  return best;
}
