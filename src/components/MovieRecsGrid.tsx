"use client";

import { useState } from "react";
import MovieDetailsModal from "./MovieDetailsModal";
import TitleCard from "@/components/discovery/TitleCard";
import { fetchJson } from "@/lib/client-api";

interface Rec {
  id: number;
  title: string;
  poster_path: string | null;
}

interface Movie {
  id: number;
  title: string;
  overview: string;
  backdrop_path: string;
  genre_ids: number[];
  vote_average: number;
  release_date: string;
}

export default function MovieRecsGrid({ recs }: { recs: Rec[] }) {
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const handleClick = async (id: number) => {
    setLoadingId(id);
    try {
      const json = await fetchJson(`/api/getMovieDetailsEnhanced?id=${id}`);
      const d = json.data;
      setSelectedMovie({
        id: d.id,
        title: d.title,
        overview: d.overview ?? "",
        backdrop_path: d.backdrop_path ?? "",
        genre_ids: (d.genres ?? []).map((g: { id: number }) => g.id),
        vote_average: d.vote_average ?? 0,
        release_date: d.release_date ?? "",
      });
    } catch {
      /* silently ignore */
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <>
      <div className="discovery-grid">
        {recs.map((r) => (
          <div key={r.id} aria-busy={loadingId === r.id} className={loadingId === r.id ? "opacity-60" : undefined}>
            <TitleCard item={{ ...r, title: r.title, media_type: "movie" }} onOpen={() => { if (loadingId === null) void handleClick(r.id); }} />
          </div>
        ))}
      </div>

      {selectedMovie && (
        <MovieDetailsModal
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
        />
      )}
    </>
  );
}
