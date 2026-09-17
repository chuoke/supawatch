export function youtubeEmbedUrl(key: string, background = false): string {
  const url = new URL(`https://www.youtube.com/embed/${encodeURIComponent(key)}`);
  url.searchParams.set("enablejsapi", "1");
  url.searchParams.set("playsinline", "1");
  url.searchParams.set("rel", "0");
  url.searchParams.set("autoplay", "1");
  if (typeof window !== "undefined") url.searchParams.set("origin", window.location.origin);
  if (background) {
    url.searchParams.set("mute", "1");
    url.searchParams.set("controls", "0");
    url.searchParams.set("loop", "1");
    url.searchParams.set("playlist", key);
    url.searchParams.set("disablekb", "1");
  }
  return url.toString();
}

type Player = { destroy: () => void };
type YouTubeApi = {
  Player: new (element: HTMLElement, options: {
    events: { onReady?: () => void; onError?: (event: { data: number }) => void };
  }) => Player;
};
type YouTubeWindow = Window & { YT?: YouTubeApi; onYouTubeIframeAPIReady?: () => void };
let apiPromise: Promise<YouTubeApi> | undefined;

// Download the official API once, only after the trailer dialog opens.
export function loadYouTubeApi(): Promise<YouTubeApi> {
  const target = window as YouTubeWindow;
  if (target.YT?.Player) return Promise.resolve(target.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const previous = target.onYouTubeIframeAPIReady;
    const script = document.createElement("script");
    const cleanup = () => {
      clearTimeout(timer);
      if (target.onYouTubeIframeAPIReady === ready) target.onYouTubeIframeAPIReady = previous;
    };
    const fail = () => { cleanup(); script.remove(); reject(new Error("YouTube could not load.")); };
    const ready = () => {
      cleanup();
      if (target.YT?.Player) resolve(target.YT);
      else reject(new Error("YouTube could not load."));
      previous?.();
    };
    const timer = setTimeout(fail, 15000);
    target.onYouTubeIframeAPIReady = ready;
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = fail;
    document.head.appendChild(script);
  });
  apiPromise.catch(() => { apiPromise = undefined; });
  return apiPromise;
}
