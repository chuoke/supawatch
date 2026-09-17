"use client";

import { useEffect, useState } from "react";
import MediaGrid from "@/components/MediaGrid";
import Spotlight from "@/components/Spotlight";
import Panorama from "@/components/Panorama";
import TitleCard from "@/components/discovery/TitleCard";
import { getTasteProfile, type TasteProfile } from "@/lib/taste";
import { GENRE_NAMES } from "@/lib/genres";

/* ── For You ───────────────────────────────────────────────────────────────
   Personalized home rows driven by the on-device taste profile:

     · Jump Back In          — titles the user recently touched
     · More Like {anchor}    — TMDB recommendations seeded by their
                               strongest recent titles (rotates per visit)
     · Your Kind of {genre}  — discover query built from their top genre

   Everything reads localStorage after mount, so first-time visitors (and
   the server-rendered HTML) simply see nothing here — zero cost until
   there's a profile worth acting on. */

export default function ForYou() {
  const [profile, setProfile] = useState<TasteProfile | null>(null);

  useEffect(() => {
    queueMicrotask(() => setProfile(getTasteProfile()));
  }, []);

  if (!profile) return null;

  const { anchors, topGenres, leanType, recent, seenIds } = profile;
  const topGenre = topGenres[0];
  const topGenreName = topGenre ? GENRE_NAMES[String(topGenre)] : null;

  return (
    <>
      {recent.length >= 3 && <JumpBackIn items={recent} />}

      {/* The first recommendation set gets the full spotlight treatment;
          any further anchors open as a panorama, so two of these in a row
          don't turn into two competing hero panels. */}
      {anchors.map((anchor, i) => {
        const Section = i === 0 ? Spotlight : Panorama;
        return (
          <Section
            key={`anchor-${anchor.media_type}-${anchor.id}`}
            title={`More Like ${anchor.title}`}
            subtitle="Because You Watched"
            fetchUrl={
              anchor.media_type === "tv"
                ? `/api/getTvRecommendations?id=${anchor.id}`
                : `/api/getMovieRecommendations?id=${anchor.id}`
            }
            mediaType={anchor.media_type}
            excludeIds={seenIds}
          />
        );
      })}

      {topGenreName && (
        <MediaGrid
          title={`Your Kind of ${topGenreName}`}
          subtitle="Made For You"
          fetchUrl={`/api/getDiscover?type=${leanType}&with_genres=${topGenre}&sort_by=popularity.desc&vote_count_gte=200`}
          excludeIds={seenIds}
        />
      )}
    </>
  );
}

/* Recently-touched titles, straight from localStorage — no network. */
function JumpBackIn({ items }: { items: TasteProfile["recent"] }) {
  return (
    <div className="snap-section pt-16 pb-12 lg:pt-24 lg:pb-16">
      <div className="mb-6 px-(--gutter)">
        <div className="mx-auto flex w-full items-center gap-4">
          <div className="h-9 w-1 shrink-0 bg-[#e50914]" />
          <div className="flex flex-col justify-center gap-0.5">
            <span className="font-space text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-400">
              Your History
            </span>
            <h2 className="font-manrope text-[20px] font-semibold leading-none tracking-tight text-white/95">
              Jump Back In
            </h2>
          </div>
        </div>
      </div>

      <div className="px-(--gutter)">
        <div className="mx-auto w-full">
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4 scrollbar-hide md:gap-4">
            {items.map((item) => (
              <div key={`${item.media_type}-${item.id}`} className="w-[165px] shrink-0 snap-start md:w-[200px]">
                <TitleCard item={{ ...item, poster_path: item.poster_path ?? null }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
