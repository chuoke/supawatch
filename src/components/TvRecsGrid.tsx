"use client";

import { useState } from "react";
import TvDetailsModal from "./TvDetailsModal";
import TitleCard from "@/components/discovery/TitleCard";
import { fetchJson } from "@/lib/client-api";

interface Rec {
  id: number;
  name: string;
  poster_path: string | null;
}

interface Show {
  id: number;
  name: string;
  overview: string;
  backdrop_path: string;
  genre_ids: number[];
  vote_average: number;
  first_air_date: string;
}

export default function TvRecsGrid({ recs }: { recs: Rec[] }) {
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const handleClick = async (id: number) => {
    setLoadingId(id);
    try {
      const json = await fetchJson(`/api/getTvDetailsEnhanced?id=${id}`);
      const d = json.data;
      setSelectedShow({
        id: d.id,
        name: d.name,
        overview: d.overview ?? "",
        backdrop_path: d.backdrop_path ?? "",
        genre_ids: (d.genres ?? []).map((g: { id: number }) => g.id),
        vote_average: d.vote_average ?? 0,
        first_air_date: d.first_air_date ?? "",
      });
    } catch {
      /* silently ignore — card stays as a link fallback */
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <>
      <div className="discovery-grid">
        {recs.map((r) => (
          <div key={r.id} aria-busy={loadingId === r.id} className={loadingId === r.id ? "opacity-60" : undefined}>
            <TitleCard item={{ ...r, title: r.name, media_type: "tv" }} onOpen={() => { if (loadingId === null) void handleClick(r.id); }} />
          </div>
        ))}
      </div>

      {selectedShow && (
        <TvDetailsModal
          show={selectedShow}
          onClose={() => setSelectedShow(null)}
        />
      )}
    </>
  );
}
