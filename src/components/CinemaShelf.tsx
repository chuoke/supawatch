"use client";

import TitleCard from "@/components/discovery/TitleCard";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { normalizeTitle, titleKey, type DiscoveryTitle } from "@/lib/discovery";
import { matchesSearchFilters } from "@/lib/search-filters";
import { fetchJson } from "@/lib/client-api";
import { useInView } from "@/lib/useInView";
import { cn } from "@/lib/utils";
import { useRegionPreference } from "@/lib/useRegionPreference";
import { fallbackFeed, savedCollection } from "@/lib/discovery-fallback";

export type ShelfSelection = { label: string; url: string };
type Props = {
  id?: string;
  title: string;
  subtitle?: string;
  fetchUrl: string;
  mediaType: "movie" | "tv";
  variant?: "posters" | "stories" | "ranked";
  selections?: ShelfSelection[];
  selectionLabel?: string;
  limit?: number;
  fallbackCollection?: string;
};
type ShelfResult = { key: string; items: DiscoveryTitle[]; error: boolean; savedTheme?: boolean };

export default function CinemaShelf({ id, title, subtitle, fetchUrl, mediaType, variant = "posters", selections, selectionLabel = "Selection", limit = 12, fallbackCollection }: Props) {
  const { ref, inView } = useInView<HTMLElement>("450px 0px");
  const rail = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const railId = useId();
  const [selection, setSelection] = useState(fetchUrl);
  const { region } = useRegionPreference();
  const selectedUrl = selections?.some(option => option.url === selection) ? selection : fetchUrl;
  const scoped = new URL(selectedUrl, "https://supawatch.local");
  if (region && scoped.pathname === "/api/getDiscover" && !scoped.searchParams.has("language") && !scoped.searchParams.has("origin_country")) scoped.searchParams.set("origin_country", region);
  const url = scoped.pathname + scoped.search;
  const key = `${mediaType}:${url}:${limit}:${fallbackCollection ?? ""}`;
  const [result, setResult] = useState<ShelfResult | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [position, setPosition] = useState({ start: true, end: false });
  const ready = result?.key === key;
  const items = ready ? result.items : [];
  const error = ready && result.error;

  useEffect(() => {
    if (!inView || region === undefined) return;
    let cancelled = false;
    const alternatives = () => {
      const filters = new URL(url, "https://supawatch.local").searchParams;
      const themed = fallbackCollection ? savedCollection(fallbackCollection).filter(item => item.media_type === mediaType && matchesSearchFilters(item, filters)).slice(0, limit) : [];
      return { items: themed.length ? themed : fallbackFeed(new URLSearchParams({ format: mediaType, ...(region ? { region } : {}) })).lanes.flatMap(lane => lane.items).slice(0, limit), savedTheme: themed.length > 0 };
    };
    fetchJson<{ results?: Record<string, unknown>[]; data?: { results?: Record<string, unknown>[] } }>(url)
      .then(data => {
        if (cancelled) return;
        const seen = new Set<string>();
        const items = (data.results ?? data.data?.results ?? []).flatMap(raw => {
          const item = normalizeTitle(raw, mediaType);
          if (!item || !item.poster_path || seen.has(titleKey(item))) return [];
          seen.add(titleKey(item));
          return [item];
        }).slice(0, limit);
        setResult(items.length ? { key, items, error: false } : { key, ...alternatives(), error: true });
      }).catch(() => { if (!cancelled) setResult({ key, ...alternatives(), error: true }); });
    return () => { cancelled = true; };
  }, [url, mediaType, limit, key, inView, attempt, region, fallbackCollection]);

  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    element.scrollLeft = 0;
    const update = () => setPosition({ start: element.scrollLeft <= 2, end: element.scrollLeft + element.clientWidth >= element.scrollWidth - 2 });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    element.addEventListener("scroll", update, { passive: true });
    return () => { observer.disconnect(); element.removeEventListener("scroll", update); };
  }, [key, ready, items.length]);

  const move = (direction: number) => {
    const element = rail.current;
    if (!element) return;
    element.scrollBy({ left: direction * element.clientWidth * .9, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  };
  const activeLabel = selections?.find(option => option.url === selectedUrl)?.label;

  return <section id={id} ref={ref} className={cn("poster-shelf", `poster-shelf--${variant}`)} aria-labelledby={headingId}>
    <header className="poster-shelf-heading">
      <div className="poster-shelf-copy">{subtitle && <p className="eyebrow">{subtitle}</p>}<h2 id={headingId}>{error && !result?.savedTheme ? `More ${mediaType === "movie" ? "films" : "series"} to explore` : title}</h2></div>
      <div className="poster-shelf-tools">{selections && selections.length > 1 && <Select value={selectedUrl} onValueChange={setSelection}><SelectTrigger aria-label={selectionLabel} className="min-h-11"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{selections.map(option => <SelectItem value={option.url} key={option.url}>{option.label}</SelectItem>)}</SelectGroup></SelectContent></Select>}
        <div className="poster-navigation"><Button variant="outline" size="icon" aria-label={`Previous ${title} titles`} aria-controls={railId} disabled={!ready || !items.length || position.start} onClick={() => move(-1)}><ChevronLeft /></Button><Button variant="outline" size="icon" aria-label={`Next ${title} titles`} aria-controls={railId} disabled={!ready || !items.length || position.end} onClick={() => move(1)}><ChevronRight /></Button></div>
      </div>
    </header>
    {error && <div className="poster-shelf-message" role="status"><p>{result?.savedTheme ? "From our saved selection. Ratings may have changed, and picks from other regions may appear." : `No live picks for “${title}” right now. These saved suggestions broaden the selection.`}</p><Button variant="outline" onClick={() => { setResult(null); setAttempt(value => value + 1); }}>Try again</Button></div>}
    {<>
      <div ref={rail} id={railId} className="poster-rail" role="region" tabIndex={0} aria-label={`${title}${activeLabel ? ` · ${activeLabel}` : ""}`} aria-busy={!ready}>
        {!ready ? Array.from({ length: variant === "ranked" ? limit : 6 }, (_, index) => <div className="poster-placeholder" key={index} aria-hidden="true"><div /><span /><span /></div>) : items.map((item, index) => <PosterCard key={titleKey(item)} item={item} rank={variant === "ranked" ? index + 1 : undefined} story={variant === "stories"} />)}
      </div>
    </>}
  </section>;
}

export function PosterCard({ item, rank, story }: { item: DiscoveryTitle; rank?: number; story: boolean }) {
  return <TitleCard item={item} rank={rank} story={story} />;
}
