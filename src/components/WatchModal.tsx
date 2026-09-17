"use client";

import { useEffect, useState } from "react";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import PlayerDialog from "@/components/PlayerDialog";
import { PlaybackSelect, EmbeddedPlayer } from "@/components/PlaybackControls";
import { recordTaste, TASTE_WEIGHT } from "@/lib/taste";

export interface OriginRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface Movie {
  id: number;
  title: string;
  backdrop_path: string;
  vote_average: number;
  release_date: string;
}

interface Genre {
  id: number;
  name?: string;
}

interface Props {
  movie: Movie;
  logo?: string | null;
  runtimeLabel?: string | null;
  genres?: Genre[];
  /** Screen-space rect of the thumbnail that launched the modal — drives the
   *  cinematic expand-from-card open. */
  originRect?: OriginRect | null;
  /** Exact image URL the launching card already rendered (cached → instant). */
  posterSrc?: string | null;
  onClose: () => void;
}

const VF_PARAMS = "title=false&hideServer=true&autoPlay=true&chromecast=false&theme=e50914";
const VF_SUB_SERVERS = ["Mega", "vEdge", "vFast", "Beta", "Charlie", "Cobra", "Max"] as const;
type VfSubServer = (typeof VF_SUB_SERVERS)[number];

const SERVERS = [
  { id: "vf", name: "Titan", domain: "vidfast.pro",  path: "movie",       params: VF_PARAMS },
  { id: "s1", name: "Alpha",   domain: "vidsrcme.su",  path: "embed/movie", params: "" },
  { id: "s2", name: "Beta",    domain: "vidsrc-me.ru", path: "embed/movie", params: "" },
  { id: "s3", name: "Gamma",   domain: "vidsrc-me.su", path: "embed/movie", params: "" },
] as const;

type ServerId = (typeof SERVERS)[number]["id"];

function getServerSrc(server: ServerId, movieId: number, vfSub: VfSubServer): string {
  const s = SERVERS.find((x) => x.id === server);
  if (!s) return "";
  const extra = server === "vf" ? `&server=${vfSub}` : "";
  const query = s.params || extra ? `?${s.params}${extra}` : "";
  return `https://${s.domain}/${s.path}/${movieId}${query}`;
}

export default function WatchModal({ movie, runtimeLabel, onClose }: Props) {
  const [server, setServer] = useState<ServerId>(SERVERS[0].id);
  const [vfSubServer, setVfSubServer] = useState<VfSubServer>(VF_SUB_SERVERS[0]);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    recordTaste({ id: movie.id, media_type: "movie", title: movie.title, backdrop_path: movie.backdrop_path }, TASTE_WEIGHT.watch);
  }, [movie.id, movie.title, movie.backdrop_path]);
  const src = getServerSrc(server, movie.id, vfSubServer);
  return <PlayerDialog title={movie.title} eyebrow={["Now showing", movie.release_date?.slice(0, 4), runtimeLabel].filter(Boolean).join(" / ")} description="Film player with playback source selection." onClose={onClose}>
    <EmbeddedPlayer key={`${src}-${reload}`} src={src} title={`Watch ${movie.title}`} backdrop={movie.backdrop_path} />
    <footer className="screening-toolbar"><div className="playback-settings"><PlaybackSelect label="Source" value={server} onValueChange={value => setServer(value as ServerId)} options={SERVERS.map(item => ({ value: item.id, label: item.name }))} />{server === "vf" && <PlaybackSelect label="Connection" value={vfSubServer} onValueChange={value => setVfSubServer(value as VfSubServer)} options={VF_SUB_SERVERS.map(value => ({ value, label: value }))} />}</div><div className="playback-help"><p>Taking a while? Try another source.</p><Button variant="ghost" onClick={() => setReload(value => value + 1)}><RotateCw data-icon="inline-start" />Reload player</Button></div></footer>
  </PlayerDialog>;
}
