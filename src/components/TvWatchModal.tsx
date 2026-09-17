"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCw, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import PlayerDialog from "@/components/PlayerDialog";
import { PlaybackSelect, EmbeddedPlayer } from "@/components/PlaybackControls";
import { recordTaste, TASTE_WEIGHT } from "@/lib/taste";
import { recordWatch } from "@/lib/history";

interface Season {
  season_number: number;
  episode_count: number;
  name: string;
}

interface Props {
  showId: number;
  showName: string;
  backdropPath: string | null;
  logo: string | null;
  seasons: Season[];
  rating: number;
  year: string | null;
  initialSeason?: number;
  initialEpisode?: number;
  onClose: () => void;
}

const VF_PARAMS =
  "title=false&hideServer=true&autoPlay=true&nextButton=true&autoNext=true&chromecast=false&theme=e50914";
const VF_SUB_SERVERS = [
  "Mega",
  "vEdge",
  "vFast",
  "Beta",
  "Charlie",
  "Cobra",
  "Max",
] as const;
type VfSubServer = (typeof VF_SUB_SERVERS)[number];

const SERVERS = [
  {
    id: "vf",
    name: "Titan",
    domain: "vidfast.pro",
    path: "tv",
    params: VF_PARAMS,
  },
  {
    id: "s1",
    name: "Alpha",
    domain: "vidsrcme.su",
    path: "embed/tv",
    params: "",
  },
  {
    id: "s2",
    name: "Beta",
    domain: "vidsrc-me.ru",
    path: "embed/tv",
    params: "",
  },
  {
    id: "s3",
    name: "Gamma",
    domain: "vidsrc-me.su",
    path: "embed/tv",
    params: "",
  },
] as const;

type ServerId = (typeof SERVERS)[number]["id"];

function getServerSrc(
  server: ServerId,
  showId: number,
  season: number,
  episode: number,
  vfSub: VfSubServer,
): string {
  const s = SERVERS.find((x) => x.id === server);
  if (!s) return "";
  const extra = server === "vf" ? `&server=${vfSub}` : "";
  const query = s.params || extra ? `?${s.params}${extra}` : "";
  return `https://${s.domain}/${s.path}/${showId}/${season}/${episode}${query}`;
}

/* Titan (vidfast) streams live playback state to the parent window — we use it
   so the header reflects what's actually playing (e.g. after auto-next). */
const VIDFAST_ORIGINS = [
  "https://vidfast.pro",
  "https://vidfast.in",
  "https://vidfast.io",
  "https://vidfast.me",
  "https://vidfast.net",
  "https://vidfast.pm",
  "https://vidfast.xyz",
];

export default function TvWatchModal({
  showId,
  showName,
  backdropPath,
  seasons,
  initialSeason,
  initialEpisode,
  onClose,
}: Props) {
  /* Strongest taste signal — the user is pressing play. */
  useEffect(() => {
    recordTaste(
      {
        id: showId,
        media_type: "tv",
        title: showName,
        backdrop_path: backdropPath,
      },
      TASTE_WEIGHT.watch,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showId]);

  const defaultSeason = seasons.find((s) => s.season_number >= 1) ?? seasons[0];
  const [server, setServer] = useState<ServerId>(SERVERS[0].id);
  const [vfSubServer, setVfSubServer] = useState<VfSubServer>(
    VF_SUB_SERVERS[0],
  );
  const [season, setSeason] = useState(
    initialSeason ?? defaultSeason?.season_number ?? 1,
  );
  const [episode, setEpisode] = useState(initialEpisode ?? 1);
  const [reload, setReload] = useState(0);
  // Live season/episode reported by the Titan player (auto-next aware).
  const [vfSeason, setVfSeason] = useState<number | null>(null);
  const [vfEpisode, setVfEpisode] = useState<number | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Titan: trust the player's reported position; others: the app's selection.
  const displaySeason = server === "vf" ? (vfSeason ?? season) : season;
  const displayEpisode = server === "vf" ? (vfEpisode ?? episode) : episode;

  // Episode list reflects the season that's actually showing.
  const currentSeason = seasons.find((s) => s.season_number === displaySeason);
  const episodeCount = currentSeason?.episode_count ?? 1;

  /* Permanent history, one row per episode. This tracks the *displayed*
     position, so Titan's auto-next counts each episode it rolls into — a
     six-episode evening records six plays, not one. recordWatch de-dupes a
     repeat of the same episode within half an hour, which also absorbs
     StrictMode's double-fire and a mid-episode server switch. */
  useEffect(() => {
    recordWatch({
      id: showId,
      t: "tv",
      sn: displaySeason,
      ep: displayEpisode,
      n: showName,
      p: backdropPath,
    });
  }, [showId, showName, backdropPath, displaySeason, displayEpisode]);

  /* Titan streams playback events to the parent window — keep the live
     season/episode so the header tracks auto-next / in-player navigation. */
  useEffect(() => {
    const onMessage = ({ origin, source, data }: MessageEvent) => {
      if (server !== "vf" || !VIDFAST_ORIGINS.includes(origin) || source !== iframeRef.current?.contentWindow || !data) return;
      if (data.type !== "PLAYER_EVENT") return;
      const d = data.data;
      if (!Number.isInteger(d?.season) || !Number.isInteger(d?.episode)) return;
      const reportedSeason = seasons.find(item => item.season_number === d.season);
      if (!reportedSeason || d.episode < 1 || d.episode > reportedSeason.episode_count) return;
      setVfSeason(d.season);
      setVfEpisode(d.episode);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [server, seasons]);

  // Discard any Titan-reported position when the selection changes, so the
  // freshly chosen episode shows until the player reports its own state again.
  const resetVfPosition = () => {
    setVfSeason(null);
    setVfEpisode(null);
  };

  const src = getServerSrc(server, showId, season, episode, vfSubServer);
  function selectEpisode(nextSeason: number, nextEpisode: number) {
    setSeason(nextSeason); setEpisode(nextEpisode); resetVfPosition();
  }
  const nextSeason = seasons.filter(item => item.season_number > displaySeason && item.episode_count > 0).sort((a, b) => a.season_number - b.season_number)[0];
  const hasNext = displayEpisode < episodeCount || Boolean(nextSeason);
  return <PlayerDialog title={showName} eyebrow={`Now showing / Season ${displaySeason} / Episode ${displayEpisode}`} description="Series player with season, episode and playback source selection." onClose={onClose}>
    <EmbeddedPlayer key={`${src}-${reload}`} src={src} title={`Watch ${showName}, season ${season}, episode ${episode}`} backdrop={backdropPath} iframeRef={iframeRef} />
    <footer className="screening-toolbar screening-toolbar--series"><div className="playback-settings">
      <PlaybackSelect label="Season" value={String(displaySeason)} onValueChange={value => selectEpisode(Number(value), 1)} options={seasons.map(item => ({ value: String(item.season_number), label: item.season_number === 0 ? "Specials" : `Season ${item.season_number}` }))} />
      <PlaybackSelect label="Episode" value={String(displayEpisode)} onValueChange={value => selectEpisode(displaySeason, Number(value))} options={Array.from({ length: episodeCount }, (_, index) => ({ value: String(index + 1), label: `Episode ${index + 1}` }))} />
      <PlaybackSelect label="Source" value={server} onValueChange={value => { setSeason(displaySeason); setEpisode(displayEpisode); setServer(value as ServerId); resetVfPosition(); }} options={SERVERS.map(item => ({ value: item.id, label: item.name }))} />
      {server === "vf" && <PlaybackSelect label="Connection" value={vfSubServer} onValueChange={value => { setSeason(displaySeason); setEpisode(displayEpisode); setVfSubServer(value as VfSubServer); resetVfPosition(); }} options={VF_SUB_SERVERS.map(value => ({ value, label: value }))} />}
    </div><div className="screening-footer-actions"><Button variant="ghost" size="icon" aria-label="Reload player" onClick={() => setReload(value => value + 1)}><RotateCw /></Button><Button variant="outline" disabled={!hasNext} onClick={() => { if (displayEpisode < episodeCount) selectEpisode(displaySeason, displayEpisode + 1); else if (nextSeason) selectEpisode(nextSeason.season_number, 1); }}>Next episode<ArrowRight data-icon="inline-end" /></Button></div></footer>
  </PlayerDialog>;
}
