"use client";

import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import MovieDetailsModal from "@/components/MovieDetailsModal";
import TvDetailsModal from "@/components/TvDetailsModal";
import { fetchJson } from "@/lib/client-api";
import { useInView } from "@/lib/useInView";
import { GENRE_NAMES } from "@/lib/genres";

/* ── Panorama ──────────────────────────────────────────────────────────────
   Six titles standing shoulder to shoulder as vertical slats of film, one of
   them open. The cursor is the only control: whichever slat you touch swells
   into a wide frame while the rest narrow back into a strip, so the section
   is never a static list — it's one continuous image that rearranges itself
   under your hand.

   Closed slats carry their title set vertically up the panel, which turns
   the resting state into a run of type and colour rather than six anonymous
   crops. Nothing here costs a request beyond the list itself: the backdrops
   are already in the payload, and no per-title fan-out follows.

   Stacks into horizontal bars below md, where the same open/closed logic
   reads as an accordion and tap replaces hover. */

const PANELS = 6;

interface Panel {
  id: number;
  title: string;
  overview: string;
  backdrop_path: string;
  year: string;
  genres: string[];
  genre_ids: number[];
  vote_average: number;
  release_date: string;
  first_air_date: string;
  media_type: "movie" | "tv";
}

interface RawResult {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  vote_average?: number;
  media_type?: string;
}

interface Props {
  title: string;
  subtitle?: string;
  fetchUrl: string;
  limit?: number;
  mediaType?: "movie" | "tv";
  /* Hide these ids — used by personalized sections to skip titles the user
     has already interacted with. */
  excludeIds?: number[];
}

export default function Panorama({
  title,
  subtitle,
  fetchUrl,
  limit = PANELS,
  mediaType,
  excludeIds,
}: Props) {
  const [panels, setPanels] = useState<Panel[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(0);
  const [selected, setSelected] = useState<Panel | null>(null);
  /* Defer the fetch until the section approaches the viewport. */
  const { ref, inView } = useInView();
  const excludeKey = (excludeIds ?? []).join(",");

  useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    const exclude = new Set(
      excludeKey ? excludeKey.split(",").map(Number) : [],
    );

    fetchJson(fetchUrl)
      .then((d) => {
        const raw: RawResult[] = d.results ?? d.data?.results ?? [];
        const mapped = raw
          .filter((m) => m.backdrop_path && !exclude.has(m.id))
          .slice(0, Math.min(limit, PANELS))
          .map((m): Panel => {
            const date = m.release_date ?? m.first_air_date ?? "";
            return {
              id: m.id,
              title: m.title ?? m.name ?? "",
              overview: m.overview ?? "",
              backdrop_path: m.backdrop_path as string,
              year: date.slice(0, 4),
              genre_ids: m.genre_ids ?? [],
              genres: (m.genre_ids ?? [])
                .slice(0, 2)
                .map((id) => GENRE_NAMES[String(id)])
                .filter(Boolean),
              vote_average: m.vote_average ?? 0,
              release_date: m.release_date ?? "",
              first_air_date: m.first_air_date ?? "",
              media_type:
                (m.media_type as "movie" | "tv") ??
                mediaType ??
                (m.title ? "movie" : "tv"),
            };
          });
        if (!cancelled) setPanels(mapped);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchUrl, limit, mediaType, inView, excludeKey]);

  /* Nothing came back (thin catalog, failed fetch) — drop the whole section
     rather than strand an empty header. */
  if (!loading && panels.length === 0) return null;

  return (
    <>
      <div ref={ref} className="snap-section py-12 lg:py-16">
        {/* ── Header ── */}
        <div className="mb-6 px-(--gutter)">
          <div className="mx-auto flex w-full items-center gap-4">
            <div className="h-9 w-1 shrink-0 bg-[#e50914]" />
            <div className="flex flex-col justify-center gap-0.5">
              {subtitle && (
                <span className="font-space text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-400">
                  {subtitle}
                </span>
              )}
              <h2 className="font-manrope text-[20px] font-semibold leading-none tracking-tight text-white/95">
                {title}
              </h2>
            </div>
          </div>
        </div>

        {/* ── The strip ── */}
        <div className="px-(--gutter)">
          <div className="mx-auto w-full">
            <div className="flex h-[420px] flex-col gap-[3px] overflow-hidden border border-white/[0.06] bg-black sm:h-[460px] md:h-[420px] md:flex-row lg:h-[480px]">
              {loading
                ? Array.from({ length: PANELS }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "animate-pulse bg-white/[0.04]",
                        i === 0 ? "flex-[3] md:flex-[4]" : "flex-1",
                      )}
                    />
                  ))
                : panels.map((panel, i) => (
                    <PanoramaPanel
                      key={panel.id}
                      panel={panel}
                      rank={i + 1}
                      open={i === open}
                      onOpen={() => setOpen(i)}
                      onSelect={() => setSelected(panel)}
                    />
                  ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals — same destination as MediaGrid, so a title behaves the
             same wherever the page shows it ── */}
      {selected?.media_type === "movie" && (
        <MovieDetailsModal
          movie={{
            id: selected.id,
            title: selected.title,
            overview: selected.overview,
            backdrop_path: selected.backdrop_path,
            genre_ids: selected.genre_ids,
            vote_average: selected.vote_average,
            release_date: selected.release_date,
          }}
          onClose={() => setSelected(null)}
        />
      )}
      {selected?.media_type === "tv" && (
        <TvDetailsModal
          show={{
            id: selected.id,
            name: selected.title,
            overview: selected.overview,
            backdrop_path: selected.backdrop_path,
            genre_ids: selected.genre_ids,
            vote_average: selected.vote_average,
            first_air_date: selected.first_air_date,
          }}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

function PanoramaPanel({
  panel,
  rank,
  open,
  onOpen,
  onSelect,
}: {
  panel: Panel;
  rank: number;
  open: boolean;
  onOpen: () => void;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      onMouseEnter={onOpen}
      onFocus={onOpen}
      /* First touch opens the slat, second commits — so a tap-only device
         still gets to see the frame before the modal takes the screen. */
      onClick={() => (open ? onSelect() : onOpen())}
      className={cn(
        "group relative overflow-hidden bg-neutral-900 outline-none transition-[flex-grow] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
        open ? "flex-[3] cursor-pointer md:flex-[4]" : "flex-1",
      )}
    >
      {/* The frame — closed slats hold a narrow centre crop, so the strip
          reads as one continuous panorama rather than six thumbnails. */}
      <img
        src={`https://image.tmdb.org/t/p/w780${panel.backdrop_path}`}
        alt={panel.title}
        loading="lazy"
        decoding="async"
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
          open
            ? "scale-100 saturate-100 brightness-100"
            : "scale-[1.06] saturate-[0.4] brightness-[0.52] group-hover:brightness-[0.7]",
        )}
      />

      {/* Grade */}
      <span
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-t transition-opacity duration-700",
          open
            ? "from-black/90 via-black/25 to-transparent"
            : "from-black/80 via-black/40 to-black/25",
        )}
      />

      {/* Rank — the one mark every slat keeps, open or shut */}
      <span
        className={cn(
          "absolute left-3 top-3 z-10 font-space text-[10px] font-bold tabular-nums tracking-[0.14em] transition-colors duration-500 md:left-4 md:top-4",
          open ? "text-neutral-300" : "text-white/45",
        )}
      >
        {String(rank).padStart(2, "0")}
      </span>

      {/* ── Closed: the title runs up the slat ──
             Stacked bars keep it horizontal and centred, clear of the rank in
             the top-left corner; from md the slat is a column and the type
             turns to run bottom-to-top up it. */}
      <span
        className={cn(
          "pointer-events-none absolute inset-y-0 left-12 right-4 z-10 flex items-center text-left font-manrope text-[12px] font-bold uppercase leading-none tracking-[0.16em] text-white/70 transition-opacity duration-300 md:inset-x-auto md:inset-y-auto md:bottom-5 md:left-1/2 md:right-auto md:block md:max-h-[calc(100%-5rem)] md:-translate-x-1/2 md:overflow-hidden md:text-[13px] md:[writing-mode:vertical-rl] md:rotate-180",
          open ? "opacity-0" : "opacity-100 delay-200",
        )}
      >
        <span className="block truncate md:max-w-none">{panel.title}</span>
      </span>

      {/* ── Open: the full billing ── */}
      <span
        className={cn(
          "absolute inset-x-0 bottom-0 z-10 block p-5 text-left transition-opacity duration-500 md:p-7",
          open ? "opacity-100 delay-150" : "pointer-events-none opacity-0",
        )}
      >
        <span className="mb-2.5 block max-w-[18ch] text-balance font-manrope text-[24px] font-bold leading-[1.02] tracking-[-0.02em] text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.95)] md:text-[30px] lg:text-[36px]">
          {panel.title}
        </span>

        <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-manrope text-[12.5px] text-neutral-300/80 md:text-[13.5px]">
          {panel.vote_average > 0 && (
            <span className="flex items-center gap-1.5 font-space font-bold text-[#4ade80]">
              <Star className="h-3 w-3 fill-[#4ade80]" />
              {panel.vote_average.toFixed(1)}
            </span>
          )}
          {panel.year && (
            <>
              <span className="text-white/[0.22]">•</span>
              <span className="font-space">{panel.year}</span>
            </>
          )}
          {panel.genres.length > 0 && (
            <>
              <span className="text-white/[0.22]">•</span>
              <span className="truncate">{panel.genres.join(", ")}</span>
            </>
          )}
        </span>

        <span className="mt-4 hidden items-center gap-2 font-manrope text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45 transition-colors group-hover:text-white md:flex">
          <span className="h-px w-6 bg-white/30 transition-all duration-300 group-hover:w-10 group-hover:bg-white" />
          Details
        </span>
      </span>
    </button>
  );
}
