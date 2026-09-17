"use client";

import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BlurImage from "@/components/BlurImage";
import { fetchJson } from "@/lib/client-api";
import { useInView } from "@/lib/useInView";
import { episodeRating, episodeRatingBand } from "@/lib/episode-ratings";
import type { Season, Episode } from "./TvSeasonsBrowser";

type Props = { tvId: number; seasons: Season[]; onWatch?: (season: number, episode: number) => void };

export default function TvEpisodeCards({ tvId, seasons, onWatch }: Props) {
  const [selectedSeason, setSelectedSeason] = useState(seasons.find(season => season.season_number > 0)?.season_number ?? seasons[0]?.season_number ?? 1);
  const [result, setResult] = useState<{ key: string; episodes: Episode[]; error: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const { ref, inView } = useInView<HTMLDivElement>("400px 0px");
  const season = seasons.some(season => season.season_number === selectedSeason) ? selectedSeason : seasons[0]?.season_number ?? 1;
  const key = `/api/getTvSeasonDetails?id=${tvId}&season_number=${season}`;
  const current = result?.key === key ? result : null;
  useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    fetchJson<{ episodes?: Episode[] }>(key).then(data => { if (!cancelled) setResult({ key, episodes: data.episodes ?? [], error: false }); }).catch(() => { if (!cancelled) setResult({ key, episodes: [], error: true }); });
    return () => { cancelled = true; };
  }, [key, inView, attempt]);
  if (!seasons.length) return null;
  return <div ref={ref} className="episode-guide">
    <header className="detail-section-heading"><div><p className="eyebrow">Settle in</p><h2>Your next episode.</h2></div><Select value={String(season)} onValueChange={value => setSelectedSeason(Number(value))}><SelectTrigger aria-label="Episode guide season" className="min-h-11"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{seasons.map(season => <SelectItem key={season.id} value={String(season.season_number)}>{season.name}</SelectItem>)}</SelectGroup></SelectContent></Select></header>
    {current?.error ? <div className="episode-guide-empty" role="alert"><p>This season couldn’t load.</p><Button variant="outline" onClick={() => { setResult(null); setAttempt(value => value + 1); }}>Try again</Button></div> : current && !current.episodes.length ? <p className="episode-guide-empty">No episodes have been listed for this season yet.</p> : <div key={key} className="episode-guide-rail" tabIndex={0} role="region" aria-label={`Episodes in season ${season}`} aria-busy={!current}>{!current ? [0, 1, 2].map(i => <div className="episode-guide-placeholder" key={i} />) : current.episodes.map(episode => {
      const rating = episodeRating(episode);
      return <article key={episode.id} className="episode-guide-card"><button type="button" className="episode-guide-art" disabled={!onWatch} onClick={() => onWatch?.(season, episode.episode_number)} aria-label={`Watch season ${season}, episode ${episode.episode_number}: ${episode.name}`}>{episode.still_path ? <BlurImage src={`https://image.tmdb.org/t/p/w500${episode.still_path}`} alt="" width={500} height={281} /> : <span>Episode {episode.episode_number}</span>}</button><div className="episode-guide-meta"><span>E{String(episode.episode_number).padStart(2, "0")}{episode.runtime ? ` / ${episode.runtime} min` : ""}</span><span style={{ color: episodeRatingBand(rating)?.color }}>{rating?.toFixed(1) ?? "Unrated"}{rating !== null ? " / 10" : ""}</span></div><h3>{episode.name}</h3><p>{episode.overview || "No synopsis available."}</p>{onWatch && <Button variant="ghost" onClick={() => onWatch(season, episode.episode_number)} aria-label={`Play ${episode.name}`}><Play data-icon="inline-start" />Play episode</Button>}</article>;
    })}</div>}
  </div>;
}
