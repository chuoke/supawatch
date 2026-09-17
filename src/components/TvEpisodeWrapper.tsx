"use client";

import { useState } from "react";
import TvEpisodeCards from "./TvEpisodeCards";
import TvSeasonsBrowser, { type Season } from "./TvSeasonsBrowser";
import TvWatchModal from "./TvWatchModal";

interface Props {
  tvId: number;
  showId: number;
  showName: string;
  backdropPath: string | null;
  logo: string | null;
  seasons: Season[];
  rating: number;
  year: string | null;
}

export default function TvEpisodeWrapper({
  tvId,
  showId,
  showName,
  backdropPath,
  logo,
  seasons,
  rating,
  year,
}: Props) {
  const [watchTarget, setWatchTarget] = useState<{
    season: number;
    episode: number;
  } | null>(null);

  function openWatch(season: number, episode: number) {
    setWatchTarget({ season, episode });
  }

  return (
    <>
      <section id="episodes" className="detail-episodes"><TvEpisodeCards key={tvId} tvId={tvId} seasons={seasons} onWatch={openWatch} /></section>
      <section id="episode-ratings" className="detail-episode-ratings"><header className="detail-section-heading"><div><p className="eyebrow">The audience scorecard</p><h2>How the story holds up.</h2></div><span>Episode ratings / 10</span></header><TvSeasonsBrowser key={tvId} tvId={tvId} seasons={seasons} variant="page" onWatch={openWatch} /></section>

      {watchTarget && (
        <TvWatchModal
          showId={showId}
          showName={showName}
          backdropPath={backdropPath}
          logo={logo}
          seasons={seasons}
          rating={rating}
          year={year}
          initialSeason={watchTarget.season}
          initialEpisode={watchTarget.episode}
          onClose={() => setWatchTarget(null)}
        />
      )}
    </>
  );
}
