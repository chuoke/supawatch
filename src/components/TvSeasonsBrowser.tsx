"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchJson } from "@/lib/client-api";
import { useInView } from "@/lib/useInView";
import { mapLimit } from "@/lib/fanout";
import { EPISODE_RATING_BANDS, episodeRating, episodeRatingBand } from "@/lib/episode-ratings";

export interface Season { id: number; name: string; season_number: number; episode_count: number; poster_path: string | null; air_date: string | null }
export interface Episode { id: number; episode_number: number; name: string; overview: string; still_path: string | null; air_date: string | null; runtime: number | null; vote_average: number; vote_count?: number }
type Props = { tvId: number; seasons: Season[]; variant?: "modal" | "page"; onWatch?: (season: number, episode: number) => void };
type SeasonResult = { episodes: Episode[]; error: boolean };
const WINDOW_SIZE = 24;

export default function TvSeasonsBrowser({ tvId, seasons, variant = "modal", onWatch }: Props) {
  const { ref, inView } = useInView<HTMLDivElement>("400px 0px");
  const [state, setState] = useState<{ key: string; results: Record<number, SeasonResult> }>({ key: "", results: {} });
  const [visibleCount, setVisibleCount] = useState(12);
  const [windowStart, setWindowStart] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<{ key: string; season: number; episode: Episode } | null>(null);
  const seasonKey = seasons.filter(season => season.season_number > 0).map(season => season.season_number).sort((a, b) => a - b).join(",");
  const key = `${tvId}:${seasonKey}`;
  const filtered = seasons.filter(season => season.season_number > 0).sort((a, b) => a.season_number - b.season_number);
  const visible = filtered.slice(0, visibleCount);
  const numbers = useMemo(() => seasonKey.split(",").filter(Boolean).map(Number).slice(0, visibleCount), [seasonKey, visibleCount]);
  const results = state.key === key ? state.results : {};

  useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    void mapLimit(numbers, async number => {
      try {
        const data = await fetchJson<{ episodes?: Episode[] }>(`/api/getTvSeasonDetails?id=${tvId}&season_number=${number}`);
        if (!cancelled) setState(previous => ({ key, results: { ...(previous.key === key ? previous.results : {}), [number]: { episodes: data.episodes ?? [], error: false } } }));
      } catch {
        if (!cancelled) setState(previous => ({ key, results: { ...(previous.key === key ? previous.results : {}), [number]: { episodes: [], error: true } } }));
      }
    }, 4);
    return () => { cancelled = true; };
  }, [tvId, numbers, key, inView, attempt]);

  if (!filtered.length) return null;
  const maxEpisode = Math.max(1, ...visible.map(season => season.episode_count), ...Object.values(results).flatMap(result => result.episodes.map(ep => ep.episode_number)));
  const start = windowStart <= maxEpisode ? windowStart : 1;
  const end = Math.min(start + WINDOW_SIZE - 1, maxEpisode);
  const columns = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  const active = selected?.key === key ? selected : null;
  const activeRating = active ? episodeRating(active.episode) : null;
  const failed = visible.some(season => results[season.season_number]?.error);

  return <div ref={ref} className={`episode-heatmap episode-heatmap--${variant}`}>
    <div className="episode-heatmap-toolbar"><div><p className="eyebrow">Season by season</p><p>Every episode. The highs and the lows.</p></div>{maxEpisode > WINDOW_SIZE && <Select value={String(start)} onValueChange={value => setWindowStart(Number(value))}><SelectTrigger aria-label="Heatmap episode range" className="min-h-11"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{Array.from({ length: Math.ceil(maxEpisode / WINDOW_SIZE) }, (_, i) => <SelectItem key={i} value={String(i * WINDOW_SIZE + 1)}>Episodes {i * WINDOW_SIZE + 1}–{Math.min((i + 1) * WINDOW_SIZE, maxEpisode)}</SelectItem>)}</SelectGroup></SelectContent></Select>}</div>
    <div className="episode-rating-legend" aria-label="Episode rating color scale">{[...EPISODE_RATING_BANDS].reverse().map(band => <span key={band.min}><i style={{ background: band.color }} aria-hidden="true" />{band.label}</span>)}<span><i className="episode-unrated-key" aria-hidden="true" />Unrated</span></div>
    <div className="episode-matrix-scroll" role="region" tabIndex={0} aria-label="Episode ratings by season. Scroll horizontally for more episodes.">
      <table className="episode-matrix"><caption className="sr-only">Audience ratings out of ten. Rows are seasons, columns are episode numbers. Select a rating for episode details.</caption><thead><tr><th scope="col">Season</th>{columns.map(number => <th scope="col" key={number}>E{number}</th>)}<th scope="col">Avg.</th></tr></thead><tbody>{visible.map(season => {
        const result = results[season.season_number];
        const episodes = new Map(result?.episodes.map(episode => [episode.episode_number, episode]) ?? []);
        const ratings = (result?.episodes ?? []).map(episodeRating).filter((rating): rating is number => rating !== null);
        const average = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
        return <tr key={season.season_number}><th scope="row"><strong>S{String(season.season_number).padStart(2, "0")}</strong><span>{season.air_date?.slice(0, 4) || season.name}</span></th>{columns.map(number => {
          const episode = episodes.get(number);
          const rating = episode ? episodeRating(episode) : null;
          const band = episodeRatingBand(rating);
          return <td key={number}>{!result && number <= season.episode_count ? <span className="episode-cell-loading" aria-label="Loading" /> : episode ? <button type="button" className="episode-rating-cell" style={{ "--episode-color": band?.color ?? "#242424" } as CSSProperties} data-rated={rating !== null} aria-pressed={active?.season === season.season_number && active.episode.id === episode.id} aria-label={`Season ${season.season_number}, episode ${number}: ${episode.name}. ${rating === null ? "Unrated" : `${rating.toFixed(1)} out of 10`}`} title={`${episode.name} · ${rating?.toFixed(1) ?? "Unrated"}`} onClick={() => setSelected({ key, season: season.season_number, episode })}>{rating?.toFixed(1) ?? "—"}</button> : <span className="episode-cell-missing" aria-label={result?.error ? "Season unavailable" : "No episode"}>{result?.error ? "!" : "·"}</span>}</td>;
        })}<td className="episode-season-average" style={{ color: episodeRatingBand(average)?.color }}>{average?.toFixed(1) ?? "—"}</td></tr>;
      })}</tbody></table>
    </div>
    {failed && <div className="episode-heatmap-error" role="alert"><p>Some seasons couldn’t load.</p><Button variant="outline" size="sm" onClick={() => setAttempt(value => value + 1)}>Retry seasons</Button></div>}
    {active ? <div className="episode-inspector" aria-live="polite"><div><p className="eyebrow">Season {active.season} / Episode {active.episode.episode_number}{activeRating !== null ? ` / ${activeRating.toFixed(1)} out of 10` : " / Unrated"}</p><h3>{active.episode.name}</h3><p>{active.episode.overview || "No synopsis available for this episode."}</p></div>{onWatch && <Button variant="outline" onClick={() => onWatch(active.season, active.episode.episode_number)}><Play data-icon="inline-start" />Watch episode</Button>}</div> : <p className="episode-heatmap-hint">Select a score to see the episode. Color bands use the same scale across every season.</p>}
    {visibleCount < filtered.length && <Button variant="outline" onClick={() => setVisibleCount(value => value + 12)}>Show more seasons ({filtered.length - visibleCount} remaining)</Button>}
  </div>;
}
