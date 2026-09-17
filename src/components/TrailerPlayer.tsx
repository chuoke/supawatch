"use client";

import { useEffect, useState } from "react";
import PlayerDialog from "@/components/PlayerDialog";
import { ArrowUpRight, ChevronRight, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadYouTubeApi, youtubeEmbedUrl } from "@/lib/youtube";

export default function TrailerPlayer({ title, videoKeys, onClose }: { title: string; videoKeys: string[]; onClose: () => void }) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);
  const [unavailable, setUnavailable] = useState(false);
  const key = videoKeys[index];

  useEffect(() => {
    const host = container;
    if (!host || !key) return;
    let disposed = false;
    let player: { destroy: () => void } | undefined;
    const iframe = document.createElement("iframe");
    iframe.title = `${title} trailer`;
    iframe.src = youtubeEmbedUrl(key);
    iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    host.appendChild(iframe);
    // The direct iframe remains usable if a blocker prevents the API script.
    loadYouTubeApi().then(api => {
      if (disposed) return;
      player = new api.Player(iframe, {
        events: {
          onError: ({ data }) => {
            if (disposed) return;
            // Configuration errors affect every candidate. Deleted/private or
            // embedding-disabled videos can be replaced with the next trailer.
            if ([2, 5, 100, 101, 150].includes(data) && index + 1 < videoKeys.length) setIndex(index + 1);
            else setUnavailable(true);
          },
        },
      });
    }).catch(() => { /* Direct player and external link still work. */ });
    return () => { disposed = true; player?.destroy(); host.replaceChildren(); };
  }, [container, key, index, title, videoKeys.length]);

  return <PlayerDialog title={title} eyebrow="The preview" description="Watch trailers and teasers. Playback is provided by YouTube." onClose={onClose}>
    <div className="screening-stage trailer-stage">
      {unavailable && <div className="screening-unavailable" role="status"><Film size={32} strokeWidth={1} /><h3>This trailer is off air.</h3><p>Try another trailer or open it on YouTube.</p></div>}
      <div className="trailer-host" ref={setContainer} hidden={unavailable} />
    </div>
    <footer className="screening-toolbar trailer-toolbar"><div><span className="eyebrow">Official previews</span><p>Trailer {String(index + 1).padStart(2, "0")} <span>/ {String(videoKeys.length).padStart(2, "0")}</span></p></div><div className="screening-footer-actions">
      {videoKeys.length > 1 && <Button variant="ghost" onClick={() => { setUnavailable(false); setIndex((index + 1) % videoKeys.length); }}>Next trailer<ChevronRight data-icon="inline-end" /></Button>}
      <Button variant="outline" asChild><a href={`https://www.youtube.com/watch?v=${key}`} target="_blank" rel="noopener noreferrer">YouTube<ArrowUpRight data-icon="inline-end" /></a></Button>
    </div></footer>
  </PlayerDialog>;
}
