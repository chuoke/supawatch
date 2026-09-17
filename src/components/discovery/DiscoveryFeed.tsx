"use client";

import { Fragment, startTransition, useEffect, useState, ViewTransition, type ReactNode } from "react";
import { ArrowDown, RotateCw, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchJson } from "@/lib/client-api";
import { getTasteProfile } from "@/lib/taste";
import { MOODS, normalizeTitle, titleKey, matchesFeedFilters, fillLane, type DiscoveryTitle, type FeedResponse, type Mood } from "@/lib/discovery";
import TitleCard from "./TitleCard";
import { fallbackFeed } from "@/lib/discovery-fallback";
import { getSearchInterests } from "@/lib/search-interests";
import { useInView } from "@/lib/useInView";
import { useRegionPreference } from "@/lib/useRegionPreference";

export default function DiscoveryFeed({ countries, scenic }: { countries: { code: string; name: string }[]; scenic: ReactNode }) {
  const { region, changeRegion } = useRegionPreference();
  const [mood, setMood] = useState<Mood>("open");
  const [format, setFormat] = useState("all");
  const [period, setPeriod] = useState("any");
  const [rating, setRating] = useState("any");
  const [edition, setEdition] = useState(0);
  const [data, setData] = useState<FeedResponse | null>(null);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState(false);
  const [interestVersion, setInterestVersion] = useState(0);
  useEffect(() => { const update = () => setInterestVersion(v => v + 1); window.addEventListener("sw-taste-change", update); return () => window.removeEventListener("sw-taste-change", update); }, []);
  const { ref, inView } = useInView<HTMLElement>("400px 0px");

  useEffect(() => {
    if (!inView || region === undefined) return;
    let cancelled = false;
    const profile = getTasteProfile();
    queueMicrotask(() => { if (!cancelled) { setPending(true); setError(false); } });
    const filters = new URLSearchParams({ mood, edition: String(edition), format, period, rating: rating === "any" ? "0" : rating });
    if (region) filters.set("region", region);
    const anchors = (profile?.anchors ?? []).filter(item => format === "all" || item.media_type === format).slice(0, 2);
    const searches = getSearchInterests().filter(item => !anchors.some(anchor => titleKey(anchor) === titleKey(item))).slice(0, 1);
    const seeds = [...anchors, ...searches];
    const recommendations = Promise.allSettled(seeds.map(anchor => fetchJson<{ results?: Record<string, unknown>[] }>(
      `/api/${anchor.media_type === "tv" ? "getTvRecommendations" : "getMovieRecommendations"}?id=${anchor.id}`,
    )));
    Promise.all([
      fetchJson<FeedResponse>(`/api/feed?${filters}`).catch(() => fallbackFeed(filters)), recommendations,
    ]).then(([feed, recs]) => {
      if (cancelled) return;
      const seen = new Set((profile?.items ?? []).map(titleKey));
      const personalized = recs.flatMap((result, index) => result.status === "fulfilled"
        ? (result.value.results ?? []).map(raw => normalizeTitle(raw, seeds[index].media_type)).filter((item): item is DiscoveryTitle => !!item && matchesFeedFilters(item, filters))
        : []);
      const selected = fillLane(personalized, 6, edition + Math.floor(Date.now() / 86400000), seen, region);
      const used = new Set(selected.map(titleKey));
      const lanes = feed.lanes.map(lane => ({ ...lane, items: fillLane(lane.items, 6, edition, used, region) }));
      if (selected.length) lanes.splice(1, 0, {
        id: "for-you", title: "More along those lines.", kicker: "Because you explored",
        description: `More like ${seeds.map(anchor => anchor.title).join(" and ")}.`, items: selected,
      });
      startTransition(() => { setData({ ...feed, lanes }); setPending(false); });
    }).catch(() => { if (!cancelled) { setData(fallbackFeed(filters)); setError(true); setPending(false); } });
    return () => { cancelled = true; };
  }, [mood, edition, inView, region, format, period, rating, interestVersion]);

  return (
    <section ref={ref} id="discover" className="discovery-feed discovery-controls">
      <div className="discovery-heading">
        <div><p className="eyebrow">Find something to watch</p><h2>What are you<br /><span>in the mood for?</span></h2></div>
        <p className="discovery-intro">Pick a mood or narrow the selection.<br />Your searches and visits help shape your recommendations.</p>
      </div>
      <div className="feed-controls">
        <ToggleGroup type="single" value={mood} onValueChange={value => { if (value) setMood(value as Mood); }} aria-label="Choose a mood" className="flex-wrap">
          {MOODS.map(option => <ToggleGroupItem key={option.id} value={option.id}>{option.label}</ToggleGroupItem>)}
        </ToggleGroup>
        <Button variant="ghost" className="min-h-11" disabled={pending} onClick={() => setEdition(value => (value + 1) % 20)}><RotateCw data-icon="inline-start" />Fresh picks</Button>
      </div>
      <div className="discovery-toolbar">
        <div className="discovery-field"><label id="feed-region"><Globe2 size={13} aria-hidden="true" />Region</label><Select value={region || "global"} disabled={region === undefined} onValueChange={changeRegion}><SelectTrigger aria-labelledby="feed-region" className="min-h-11 w-full"><SelectValue>{region === undefined ? "Finding your region…" : region ? countries.find(country => country.code === region)?.name ?? region : "All regions"}</SelectValue></SelectTrigger><SelectContent position="popper" align="start" className="region-select-content"><SelectGroup><SelectItem value="global">All regions</SelectItem>{countries.map(country => <SelectItem value={country.code} key={country.code}>{country.name}</SelectItem>)}</SelectGroup></SelectContent></Select></div>
        {[
          { id: "format", label: "What to watch", value: format, change: setFormat, options: [["all", "Films & series"], ["movie", "Films"], ["tv", "Series"]] },
          { id: "period", label: "Release period", value: period, change: setPeriod, options: [["any", "Any era"], ["recent", "Last five years"], ["classics", "Before 2000"]] },
          { id: "rating", label: "Audience rating", value: rating, change: setRating, options: [["any", "Curated picks"], ["7", "7+ · Well loved"], ["8", "8+ · Acclaimed"]] },
        ].map(field => <div className="discovery-field" key={field.id}><label id={`feed-${field.id}`}>{field.label}</label><Select value={field.value} onValueChange={field.change}><SelectTrigger aria-labelledby={`feed-${field.id}`} className="min-h-11 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{field.options.map(([value, label]) => <SelectItem value={value} key={value}>{label}</SelectItem>)}</SelectGroup></SelectContent></Select></div>)}
      </div>
      <p className="feed-status" role="status" aria-live="polite">{pending ? "Updating your picks…" : error ? "Live picks couldn’t load. Here are some saved suggestions." : data?.notice ?? (region ? "Your region shapes the mix. You’ll also find picks from elsewhere." : "Save titles for later. Open a few to get more personal recommendations.")}</p>
      {!data && pending && <div className="discovery-skeleton" aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <div key={i} />)}</div>}
      <div aria-busy={pending} inert={pending && !!data} className="feed-lanes" data-pending={pending && !!data}>
        {data?.lanes.map((lane, index) => {
          const items = lane.items.slice(0, 6);
          if (!items.length) return index === 2 ? <Fragment key={lane.id}>{scenic}</Fragment> : null;
          return <Fragment key={lane.id}><section className="discovery-lane">
            <div className="lane-heading"><div>{lane.kicker && <p className="eyebrow">{lane.kicker}</p>}<h3>{lane.title}</h3></div><ArrowDown aria-hidden="true" size={18} /></div>
            <div className="discovery-grid">
              {items.map(item => <ViewTransition key={titleKey(item)} default="none" update="auto" enter="fade-in" exit="fade-out"><TitleCard item={item} /></ViewTransition>)}
            </div>
          </section>{index === 2 && scenic}</Fragment>;
        })}
      </div>

      {(!data || data.lanes.length < 3) && scenic}
    </section>
  );
}
